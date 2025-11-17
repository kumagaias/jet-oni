import { GameState } from '../game/game-state';
import { Player, Vector3 } from '../../shared/types/game';
import {
  PLAYER_SPEED,
  ONI_SPEED_MULTIPLIER,
  DASH_SPEED,
  JETPACK_FORCE,
  JUMP_FORCE,
} from '../../shared/constants';
import { AIBehaviorSystem } from './ai-behavior';

/**
 * AI behavior types
 */
export enum AIBehavior {
  CHASE = 'chase',     // ONI chasing nearest runner
  FLEE = 'flee',       // Runner fleeing from nearest ONI
  WANDER = 'wander',   // Random movement when no targets nearby
}

/**
 * AI decision state
 */
export interface AIDecision {
  behavior: AIBehavior;
  targetPlayerId: string | null;
  moveDirection: Vector3;
  useAbility: boolean;
  abilityType: 'jetpack' | 'dash' | 'jump' | null;
}

/**
 * AI configuration
 */
export interface AIConfig {
  chaseDistance: number;      // Distance to start chasing (ONI)
  fleeDistance: number;        // Distance to start fleeing (Runner)
  wanderChangeInterval: number; // Time between wander direction changes (seconds)
  abilityUseChance: number;    // Chance to use ability (0-1)
  abilityUseCooldown: number;  // Cooldown between ability uses (seconds)
}

/**
 * Default AI configuration
 */
const DEFAULT_AI_CONFIG: AIConfig = {
  chaseDistance: 100,
  fleeDistance: 50,
  wanderChangeInterval: 3,
  abilityUseChance: 0.6, // Increased from 0.3 to 0.6 for more aggressive AI
  abilityUseCooldown: 1.5, // Reduced from 2 to 1.5 for faster ability usage
};

/**
 * AIController manages AI player decision-making
 */
export class AIController {
  private gameState: GameState;
  private config: AIConfig;
  private behaviorSystem: AIBehaviorSystem;
  private abilityTimers: Map<string, number> = new Map();
  private assignedTargets: Map<string, string> = new Map(); // Map of oniId -> runnerId
  private cloakedPlayerId: string | null = null; // Player who is currently cloaked
  
  // Stuck detection
  private lastPositions: Map<string, { x: number; y: number; z: number; time: number }> = new Map();
  private stuckThreshold: number = 2.0; // If moved less than 2 units in 2 seconds, consider stuck
  private stuckCheckInterval: number = 2000; // Check every 2 seconds
  private stuckLocations: Map<string, Array<{ x: number; z: number; time: number }>> = new Map(); // Track stuck locations
  private unstuckAttempts: Map<string, number> = new Map(); // Track unstuck attempts

  constructor(gameState: GameState, config: Partial<AIConfig> = {}) {
    this.gameState = gameState;
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    this.behaviorSystem = new AIBehaviorSystem({
      chaseDistance: this.config.chaseDistance,
      fleeDistance: this.config.fleeDistance,
      wanderChangeInterval: this.config.wanderChangeInterval,
    });
  }

  /**
   * Set the cloaked player ID (AI will ignore this player)
   */
  public setCloakedPlayer(playerId: string | null): void {
    this.cloakedPlayerId = playerId;
  }

  /**
   * Update AI decisions for all AI players
   */
  public update(deltaTime: number): void {
    const players = this.gameState.getAllPlayers();
    
    // Clean up assigned targets for ONIs that no longer exist or are no longer ONI
    const currentOniIds = new Set(players.filter(p => p.isAI && p.isOni).map(p => p.id));
    for (const oniId of Array.from(this.assignedTargets.keys())) {
      if (!currentOniIds.has(oniId)) {
        this.assignedTargets.delete(oniId);
      }
    }
    
    // Clean up targets that no longer exist or became ONI
    const currentRunnerIds = new Set(players.filter(p => !p.isOni).map(p => p.id));
    for (const [oniId, runnerId] of Array.from(this.assignedTargets.entries())) {
      if (!currentRunnerIds.has(runnerId)) {
        this.assignedTargets.delete(oniId);
      }
    }
    
    for (const player of players) {
      // Skip human players
      if (!player.isAI) continue;
      
      // Make decision for this AI player
      const decision = this.makeDecision(player, players, deltaTime);
      
      // Update assigned target if this is an ONI
      if (player.isOni && decision.targetPlayerId) {
        this.assignedTargets.set(player.id, decision.targetPlayerId);
      }
      
      // Apply decision to player state
      this.applyDecision(player, decision, deltaTime);
    }
  }

  /**
   * Make decision for an AI player
   */
  public makeDecision(
    aiPlayer: Player,
    allPlayers: Player[],
    deltaTime: number
  ): AIDecision {
    // Update ability timer
    const abilityTimer = this.abilityTimers.get(aiPlayer.id) || 0;
    this.abilityTimers.set(aiPlayer.id, abilityTimer + deltaTime);
    
    // Check if AI is stuck
    const isStuck = this.checkIfStuck(aiPlayer);
    
    if (isStuck) {
      // Get unstuck attempts for this player
      const attempts = this.unstuckAttempts.get(aiPlayer.id) || 0;
      this.unstuckAttempts.set(aiPlayer.id, attempts + 1);
      
      // Record stuck location to avoid returning to it
      this.recordStuckLocation(aiPlayer);
      
      // Generate escape direction away from stuck locations
      const escapeDirection = this.generateEscapeDirection(aiPlayer);
      
      // Choose unstuck strategy based on attempts
      let abilityType: 'jetpack' | 'dash' | 'jump' | null = null;
      
      if (attempts % 3 === 0) {
        // Every 3rd attempt: Use jetpack to fly over obstacle
        abilityType = 'jetpack';
      } else if (attempts % 3 === 1) {
        // Every other attempt: Use dash to burst through
        abilityType = 'dash';
      } else {
        // Default: Use jump to hop over
        abilityType = 'jump';
      }
      
      return {
        behavior: AIBehavior.WANDER,
        targetPlayerId: null,
        moveDirection: escapeDirection,
        useAbility: true,
        abilityType: abilityType,
      };
    } else {
      // Not stuck, reset unstuck attempts
      this.unstuckAttempts.set(aiPlayer.id, 0);
    }
    
    if (aiPlayer.isOni) {
      return this.makeOniDecision(aiPlayer, allPlayers, deltaTime);
    } else {
      return this.makeRunnerDecision(aiPlayer, allPlayers, deltaTime);
    }
  }
  
  /**
   * Record a stuck location to avoid returning to it
   */
  private recordStuckLocation(aiPlayer: Player): void {
    const now = Date.now();
    const locations = this.stuckLocations.get(aiPlayer.id) || [];
    
    // Add current location
    locations.push({
      x: aiPlayer.position.x,
      z: aiPlayer.position.z,
      time: now,
    });
    
    // Keep only recent stuck locations (last 10 seconds)
    const recentLocations = locations.filter(loc => now - loc.time < 10000);
    this.stuckLocations.set(aiPlayer.id, recentLocations);
  }
  
  /**
   * Generate escape direction away from stuck locations
   */
  private generateEscapeDirection(aiPlayer: Player): Vector3 {
    const stuckLocs = this.stuckLocations.get(aiPlayer.id) || [];
    
    if (stuckLocs.length === 0) {
      // No stuck history, use random direction
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.cos(angle),
        y: 0,
        z: Math.sin(angle),
      };
    }
    
    // Calculate average stuck location
    let avgX = 0;
    let avgZ = 0;
    for (const loc of stuckLocs) {
      avgX += loc.x;
      avgZ += loc.z;
    }
    avgX /= stuckLocs.length;
    avgZ /= stuckLocs.length;
    
    // Move away from average stuck location
    let escapeX = aiPlayer.position.x - avgX;
    let escapeZ = aiPlayer.position.z - avgZ;
    
    // If too close to stuck location, use perpendicular direction
    const distToStuck = Math.sqrt(escapeX * escapeX + escapeZ * escapeZ);
    if (distToStuck < 1.0) {
      // Use perpendicular direction
      const temp = escapeX;
      escapeX = -escapeZ;
      escapeZ = temp;
    }
    
    // Normalize
    const length = Math.sqrt(escapeX * escapeX + escapeZ * escapeZ);
    if (length > 0) {
      escapeX /= length;
      escapeZ /= length;
    }
    
    // Add some randomness to avoid predictable patterns
    const randomAngle = (Math.random() - 0.5) * Math.PI * 0.5; // ±45 degrees
    const cos = Math.cos(randomAngle);
    const sin = Math.sin(randomAngle);
    const rotatedX = escapeX * cos - escapeZ * sin;
    const rotatedZ = escapeX * sin + escapeZ * cos;
    
    return {
      x: rotatedX,
      y: 0,
      z: rotatedZ,
    };
  }
  
  /**
   * Check if AI player is stuck (not moving much)
   */
  private checkIfStuck(aiPlayer: Player): boolean {
    const now = Date.now();
    const lastPos = this.lastPositions.get(aiPlayer.id);
    
    if (!lastPos) {
      // First time checking, record position
      this.lastPositions.set(aiPlayer.id, {
        x: aiPlayer.position.x,
        y: aiPlayer.position.y,
        z: aiPlayer.position.z,
        time: now,
      });
      return false;
    }
    
    // Check if enough time has passed
    if (now - lastPos.time < this.stuckCheckInterval) {
      return false;
    }
    
    // Calculate distance moved
    const dx = aiPlayer.position.x - lastPos.x;
    const dy = aiPlayer.position.y - lastPos.y;
    const dz = aiPlayer.position.z - lastPos.z;
    const distanceMoved = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Update last position
    this.lastPositions.set(aiPlayer.id, {
      x: aiPlayer.position.x,
      y: aiPlayer.position.y,
      z: aiPlayer.position.z,
      time: now,
    });
    
    // If moved less than threshold, consider stuck
    return distanceMoved < this.stuckThreshold;
  }

  /**
   * Make decision for ONI AI (improved for smarter behavior)
   */
  private makeOniDecision(
    aiPlayer: Player,
    allPlayers: Player[],
    deltaTime: number
  ): AIDecision {
    // Find nearest runner (with target distribution to avoid clustering)
    const nearestRunner = this.behaviorSystem.findNearestRunner(
      aiPlayer, 
      allPlayers,
      this.assignedTargets
    );
    
    if (!nearestRunner) {
      // No runners found, wander
      const decision = this.behaviorSystem.wander(aiPlayer, deltaTime);
      return this.addAbilityDecision(aiPlayer, decision, 'jetpack');
    }
    
    // Calculate distance to target
    const distance = this.calculateDistance(aiPlayer.position, nearestRunner.position);
    
    // Always chase if runner is visible (increased from 100 to always chase)
    let decision = this.behaviorSystem.chase(aiPlayer, nearestRunner);
    
    // Adjust direction to avoid stuck locations
    decision = this.adjustDirectionToAvoidStuckLocations(aiPlayer, decision);
    
    // Use jetpack more aggressively when:
    // 1. Target is far (> 30 units)
    // 2. Target is above us (y difference > 2) - lowered threshold to chase airborne runners
    // 3. Target is jetpacking (actively flying)
    // 4. Random chance for unpredictability
    // 5. Near a stuck location
    const yDiff = nearestRunner.position.y - aiPlayer.position.y;
    const nearStuckLocation = this.isNearStuckLocation(aiPlayer);
    const targetIsAirborne = nearestRunner.isJetpacking || yDiff > 2;
    const shouldUseJetpack = distance > 30 || targetIsAirborne || Math.random() < 0.4 || nearStuckLocation;
    
    return {
      ...decision,
      useAbility: shouldUseJetpack && this.shouldUseAbility(aiPlayer, 'jetpack'),
      abilityType: shouldUseJetpack && this.shouldUseAbility(aiPlayer, 'jetpack') ? 'jetpack' : null,
    };
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * Check if AI is near a stuck location
   */
  private isNearStuckLocation(aiPlayer: Player): boolean {
    const stuckLocs = this.stuckLocations.get(aiPlayer.id) || [];
    const now = Date.now();
    
    for (const loc of stuckLocs) {
      // Only check recent stuck locations (last 5 seconds)
      if (now - loc.time > 5000) continue;
      
      const dx = aiPlayer.position.x - loc.x;
      const dz = aiPlayer.position.z - loc.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Consider "near" if within 5 units
      if (distance < 5) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Adjust movement direction to avoid stuck locations
   */
  private adjustDirectionToAvoidStuckLocations(aiPlayer: Player, decision: AIDecision): AIDecision {
    const stuckLocs = this.stuckLocations.get(aiPlayer.id) || [];
    if (stuckLocs.length === 0) {
      return decision; // No stuck locations to avoid
    }
    
    const now = Date.now();
    let avoidanceX = 0;
    let avoidanceZ = 0;
    let avoidanceCount = 0;
    
    // Calculate avoidance vector from recent stuck locations
    for (const loc of stuckLocs) {
      // Only avoid recent stuck locations (last 5 seconds)
      if (now - loc.time > 5000) continue;
      
      const dx = aiPlayer.position.x - loc.x;
      const dz = aiPlayer.position.z - loc.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // If close to stuck location, add avoidance force
      if (distance < 10) {
        // Stronger avoidance when closer
        const strength = 1.0 - (distance / 10);
        avoidanceX += (dx / distance) * strength;
        avoidanceZ += (dz / distance) * strength;
        avoidanceCount++;
      }
    }
    
    if (avoidanceCount === 0) {
      return decision; // Not near any stuck locations
    }
    
    // Average avoidance vector
    avoidanceX /= avoidanceCount;
    avoidanceZ /= avoidanceCount;
    
    // Blend original direction with avoidance (70% original, 30% avoidance)
    const blendedX = decision.moveDirection.x * 0.7 + avoidanceX * 0.3;
    const blendedZ = decision.moveDirection.z * 0.7 + avoidanceZ * 0.3;
    
    // Normalize
    const length = Math.sqrt(blendedX * blendedX + blendedZ * blendedZ);
    const normalizedX = length > 0 ? blendedX / length : decision.moveDirection.x;
    const normalizedZ = length > 0 ? blendedZ / length : decision.moveDirection.z;
    
    return {
      ...decision,
      moveDirection: {
        x: normalizedX,
        y: decision.moveDirection.y,
        z: normalizedZ,
      },
    };
  }

  /**
   * Make decision for Runner AI
   */
  private makeRunnerDecision(
    aiPlayer: Player,
    allPlayers: Player[],
    deltaTime: number
  ): AIDecision {
    // Find nearest ONI
    const nearestOni = this.behaviorSystem.findNearestOni(aiPlayer, allPlayers);
    
    if (!nearestOni) {
      // No ONI found, wander
      const decision = this.behaviorSystem.wander(aiPlayer, deltaTime);
      return this.addAbilityDecision(aiPlayer, decision, 'dash');
    }
    
    if (this.behaviorSystem.isWithinFleeDistance(aiPlayer, nearestOni)) {
      // Flee from nearest ONI
      let decision = this.behaviorSystem.flee(aiPlayer, nearestOni);
      
      // Adjust direction to avoid stuck locations
      decision = this.adjustDirectionToAvoidStuckLocations(aiPlayer, decision);
      
      // Use dash more aggressively when near stuck location
      const nearStuckLocation = this.isNearStuckLocation(aiPlayer);
      if (nearStuckLocation) {
        return {
          ...decision,
          useAbility: true,
          abilityType: 'dash',
        };
      }
      
      return this.addAbilityDecision(aiPlayer, decision, 'dash');
    } else {
      // Safe distance, wander
      const decision = this.behaviorSystem.wander(aiPlayer, deltaTime);
      return this.addAbilityDecision(aiPlayer, decision, 'dash');
    }
  }

  /**
   * Add ability decision to base decision
   */
  private addAbilityDecision(
    aiPlayer: Player,
    baseDecision: AIDecision,
    abilityType: 'jetpack' | 'dash'
  ): AIDecision {
    const useAbility = this.shouldUseAbility(aiPlayer, abilityType);
    
    return {
      ...baseDecision,
      useAbility,
      abilityType: useAbility ? abilityType : null,
    };
  }

  /**
   * Check if AI should use beacon ability
   */
  public shouldUseBeacon(aiPlayer: Player): boolean {
    // Only ONI can use beacon
    if (!aiPlayer.isOni) return false;
    
    // Check if beacon is on cooldown
    if (aiPlayer.beaconCooldown > 0) return false;
    
    // Random chance to use beacon when available
    return Math.random() < this.config.abilityUseChance;
  }

  /**
   * Apply decision to player state
   */
  private applyDecision(
    player: Player,
    decision: AIDecision,
    deltaTime: number
  ): void {
    // Calculate speed based on behavior and abilities
    let speed = PLAYER_SPEED;
    if (player.isOni) {
      speed *= ONI_SPEED_MULTIPLIER;
    }
    if (decision.useAbility && decision.abilityType === 'dash') {
      speed = DASH_SPEED;
    }
    
    // Apply movement
    const velocity = {
      x: decision.moveDirection.x * speed,
      y: player.velocity.y, // Preserve vertical velocity
      z: decision.moveDirection.z * speed,
    };
    
    this.gameState.setPlayerVelocity(player.id, velocity);
    
    // Apply ability
    if (decision.useAbility && decision.abilityType) {
      this.useAbility(player, decision.abilityType, deltaTime);
    }
  }

  /**
   * Use ability for AI player
   */
  private useAbility(
    player: Player,
    abilityType: 'jetpack' | 'dash' | 'jump',
    deltaTime: number
  ): void {
    if (abilityType === 'jetpack' && player.isOni && player.fuel > 0) {
      // Apply jetpack force
      const newVelocity = {
        ...player.velocity,
        y: player.velocity.y + JETPACK_FORCE * deltaTime,
      };
      this.gameState.setPlayerVelocity(player.id, newVelocity);
      this.gameState.setPlayerJetpacking(player.id, true);
    } else if (abilityType === 'dash' && !player.isOni && player.fuel > 0) {
      // Dash is handled by speed calculation in applyDecision
      this.gameState.setPlayerDashing(player.id, true);
    } else if (abilityType === 'jump' && !player.isOni && player.isOnSurface) {
      // Apply jump force
      const newVelocity = {
        ...player.velocity,
        y: JUMP_FORCE,
      };
      this.gameState.setPlayerVelocity(player.id, newVelocity);
    }
  }

  /**
   * Determine if AI should use ability
   */
  private shouldUseAbility(
    player: Player,
    abilityType: 'jetpack' | 'dash' | 'jump'
  ): boolean {
    // Check fuel
    if (player.fuel <= 0) return false;
    
    // Check cooldown
    const abilityTimer = this.abilityTimers.get(player.id) || 0;
    if (abilityTimer < this.config.abilityUseCooldown) return false;
    
    // Random chance
    if (Math.random() > this.config.abilityUseChance) return false;
    
    // Reset timer
    this.abilityTimers.set(player.id, 0);
    
    return true;
  }



  /**
   * Get AI configuration
   */
  public getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * Update AI configuration
   */
  public setConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update behavior system config
    this.behaviorSystem.setConfig({
      chaseDistance: this.config.chaseDistance,
      fleeDistance: this.config.fleeDistance,
      wanderChangeInterval: this.config.wanderChangeInterval,
    });
  }

  /**
   * Reset AI state for a player
   */
  public resetPlayer(playerId: string): void {
    this.behaviorSystem.resetPlayer(playerId);
    this.abilityTimers.delete(playerId);
    this.lastPositions.delete(playerId);
  }

  /**
   * Reset all AI state
   */
  public reset(): void {
    this.behaviorSystem.reset();
    this.abilityTimers.clear();
    this.lastPositions.clear();
  }
}
