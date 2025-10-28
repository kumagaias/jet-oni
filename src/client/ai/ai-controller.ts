import { GameState } from '../game/game-state';
import { Player, Vector3 } from '../../shared/types/game';
import {
  PLAYER_SPEED,
  ONI_SPEED_MULTIPLIER,
  DASH_SPEED,
  JETPACK_FORCE,
  JUMP_FORCE,
} from '../../shared/constants';

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
  abilityUseChance: 0.3,
  abilityUseCooldown: 2,
};

/**
 * AIController manages AI player decision-making
 */
export class AIController {
  private gameState: GameState;
  private config: AIConfig;
  private wanderDirections: Map<string, Vector3> = new Map();
  private wanderTimers: Map<string, number> = new Map();
  private abilityTimers: Map<string, number> = new Map();

  constructor(gameState: GameState, config: Partial<AIConfig> = {}) {
    this.gameState = gameState;
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
  }

  /**
   * Update AI decisions for all AI players
   */
  public update(deltaTime: number): void {
    const players = this.gameState.getAllPlayers();
    
    for (const player of players) {
      // Skip human players
      if (!player.isAI) continue;
      
      // Make decision for this AI player
      const decision = this.makeDecision(player, players, deltaTime);
      
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
    // Update wander timer
    const wanderTimer = this.wanderTimers.get(aiPlayer.id) || 0;
    this.wanderTimers.set(aiPlayer.id, wanderTimer + deltaTime);
    
    // Update ability timer
    const abilityTimer = this.abilityTimers.get(aiPlayer.id) || 0;
    this.abilityTimers.set(aiPlayer.id, abilityTimer + deltaTime);
    
    if (aiPlayer.isOni) {
      return this.makeOniDecision(aiPlayer, allPlayers);
    } else {
      return this.makeRunnerDecision(aiPlayer, allPlayers);
    }
  }

  /**
   * Make decision for ONI AI
   */
  private makeOniDecision(
    aiPlayer: Player,
    allPlayers: Player[]
  ): AIDecision {
    // Find nearest runner
    const nearestRunner = this.findNearestRunner(aiPlayer, allPlayers);
    
    if (!nearestRunner) {
      // No runners found, wander
      return this.makeWanderDecision(aiPlayer);
    }
    
    const distance = this.calculateDistance(aiPlayer.position, nearestRunner.position);
    
    if (distance <= this.config.chaseDistance) {
      // Chase nearest runner
      return this.makeChaseDecision(aiPlayer, nearestRunner);
    } else {
      // Too far, wander
      return this.makeWanderDecision(aiPlayer);
    }
  }

  /**
   * Make decision for Runner AI
   */
  private makeRunnerDecision(
    aiPlayer: Player,
    allPlayers: Player[]
  ): AIDecision {
    // Find nearest ONI
    const nearestOni = this.findNearestOni(aiPlayer, allPlayers);
    
    if (!nearestOni) {
      // No ONI found, wander
      return this.makeWanderDecision(aiPlayer);
    }
    
    const distance = this.calculateDistance(aiPlayer.position, nearestOni.position);
    
    if (distance <= this.config.fleeDistance) {
      // Flee from nearest ONI
      return this.makeFleeDecision(aiPlayer, nearestOni);
    } else {
      // Safe distance, wander
      return this.makeWanderDecision(aiPlayer);
    }
  }

  /**
   * Make chase decision (ONI chasing runner)
   */
  private makeChaseDecision(
    aiPlayer: Player,
    target: Player
  ): AIDecision {
    const direction = this.calculateDirection(aiPlayer.position, target.position);
    
    // Decide whether to use jetpack
    const useAbility = this.shouldUseAbility(aiPlayer, 'jetpack');
    
    return {
      behavior: AIBehavior.CHASE,
      targetPlayerId: target.id,
      moveDirection: direction,
      useAbility,
      abilityType: useAbility ? 'jetpack' : null,
    };
  }

  /**
   * Make flee decision (Runner fleeing from ONI)
   */
  private makeFleeDecision(
    aiPlayer: Player,
    threat: Player
  ): AIDecision {
    // Calculate direction away from threat
    const direction = this.calculateDirection(threat.position, aiPlayer.position);
    
    // Decide whether to use dash
    const useAbility = this.shouldUseAbility(aiPlayer, 'dash');
    
    return {
      behavior: AIBehavior.FLEE,
      targetPlayerId: threat.id,
      moveDirection: direction,
      useAbility,
      abilityType: useAbility ? 'dash' : null,
    };
  }

  /**
   * Make wander decision (random movement)
   */
  private makeWanderDecision(aiPlayer: Player): AIDecision {
    const wanderTimer = this.wanderTimers.get(aiPlayer.id) || 0;
    
    // Change direction periodically
    if (wanderTimer >= this.config.wanderChangeInterval) {
      const newDirection = this.generateRandomDirection();
      this.wanderDirections.set(aiPlayer.id, newDirection);
      this.wanderTimers.set(aiPlayer.id, 0);
    }
    
    const direction = this.wanderDirections.get(aiPlayer.id) || { x: 0, y: 0, z: 0 };
    
    return {
      behavior: AIBehavior.WANDER,
      targetPlayerId: null,
      moveDirection: direction,
      useAbility: false,
      abilityType: null,
    };
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
   * Find nearest runner to ONI
   */
  private findNearestRunner(
    aiPlayer: Player,
    allPlayers: Player[]
  ): Player | null {
    let nearestRunner: Player | null = null;
    let minDistance = Infinity;
    
    for (const player of allPlayers) {
      // Skip self, ONI players, and non-existent players
      if (player.id === aiPlayer.id || player.isOni) continue;
      
      const distance = this.calculateDistance(aiPlayer.position, player.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestRunner = player;
      }
    }
    
    return nearestRunner;
  }

  /**
   * Find nearest ONI to runner
   */
  private findNearestOni(
    aiPlayer: Player,
    allPlayers: Player[]
  ): Player | null {
    let nearestOni: Player | null = null;
    let minDistance = Infinity;
    
    for (const player of allPlayers) {
      // Skip self, runner players, and non-existent players
      if (player.id === aiPlayer.id || !player.isOni) continue;
      
      const distance = this.calculateDistance(aiPlayer.position, player.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestOni = player;
      }
    }
    
    return nearestOni;
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate normalized direction from pos1 to pos2
   */
  private calculateDirection(from: Vector3, to: Vector3): Vector3 {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    if (length === 0) {
      return { x: 0, y: 0, z: 0 };
    }
    
    return {
      x: dx / length,
      y: 0,
      z: dz / length,
    };
  }

  /**
   * Generate random direction for wandering
   */
  private generateRandomDirection(): Vector3 {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.cos(angle),
      y: 0,
      z: Math.sin(angle),
    };
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
  }

  /**
   * Reset AI state for a player
   */
  public resetPlayer(playerId: string): void {
    this.wanderDirections.delete(playerId);
    this.wanderTimers.delete(playerId);
    this.abilityTimers.delete(playerId);
  }

  /**
   * Reset all AI state
   */
  public reset(): void {
    this.wanderDirections.clear();
    this.wanderTimers.clear();
    this.abilityTimers.clear();
  }
}
