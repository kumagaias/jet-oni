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
import { PersonalityManager, OniPersonality } from './ai-personality';
import { StuckDetectionManager } from './ai-stuck-detection';

/**
 * AI behavior types
 */
export enum AIBehavior {
  CHASE = 'chase',
  FLEE = 'flee',
  WANDER = 'wander',
}

/**
 * Export OniPersonality for external use
 */
export { OniPersonality };

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
  chaseDistance: number;
  fleeDistance: number;
  wanderChangeInterval: number;
  abilityUseChance: number;
  abilityUseCooldown: number;
}

/**
 * Default AI configuration
 */
const DEFAULT_AI_CONFIG: AIConfig = {
  chaseDistance: 100,
  fleeDistance: 50,
  wanderChangeInterval: 3,
  abilityUseChance: 0.8,
  abilityUseCooldown: 1.5,
};

/**
 * AIController manages AI player decision-making
 */
export class AIController {
  private gameState: GameState;
  private config: AIConfig;
  private behaviorSystem: AIBehaviorSystem;
  private personalityManager: PersonalityManager;
  private stuckDetectionManager: StuckDetectionManager;
  private abilityTimers: Map<string, number> = new Map();
  private assignedTargets: Map<string, string> = new Map();
  private cloakedPlayerId: string | null = null;

  constructor(gameState: GameState, config: Partial<AIConfig> = {}) {
    this.gameState = gameState;
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    this.behaviorSystem = new AIBehaviorSystem({
      chaseDistance: this.config.chaseDistance,
      fleeDistance: this.config.fleeDistance,
      wanderChangeInterval: this.config.wanderChangeInterval,
    });
    this.personalityManager = new PersonalityManager();
    this.stuckDetectionManager = new StuckDetectionManager();
  }

  /**
   * Set cloaked player ID
   */
  public setCloakedPlayer(playerId: string | null): void {
    this.cloakedPlayerId = playerId;
  }

  /**
   * Update AI decisions for all AI players
   */
  public update(deltaTime: number): void {
    const players = this.gameState.getAllPlayers();
    
    // Clean up assigned targets
    const currentOniIds = new Set(players.filter(p => p.isAI && p.isOni).map(p => p.id));
    for (const oniId of Array.from(this.assignedTargets.keys())) {
      if (!currentOniIds.has(oniId)) {
        this.assignedTargets.delete(oniId);
      }
    }
    
    const currentRunnerIds = new Set(players.filter(p => !p.isOni).map(p => p.id));
    for (const [oniId, runnerId] of Array.from(this.assignedTargets.entries())) {
      if (!currentRunnerIds.has(runnerId)) {
        this.assignedTargets.delete(oniId);
      }
    }
    
    for (const player of players) {
      if (!player.isAI) continue;
      
      const decision = this.makeDecision(player, players, deltaTime);
      
      if (player.isOni && decision.targetPlayerId) {
        this.assignedTargets.set(player.id, decision.targetPlayerId);
      }
      
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
    this.abilityTimers.set(aiPlayer.id, (this.abilityTimers.get(aiPlayer.id) || 0) + deltaTime);
    
    // Check unstuck mode
    if (this.stuckDetectionManager.isInUnstuckMode(aiPlayer.id)) {
      const escapeDirection = this.stuckDetectionManager.generateEscapeDirection(aiPlayer);
      return {
        behavior: AIBehavior.WANDER,
        targetPlayerId: null,
        moveDirection: escapeDirection,
        useAbility: false,
        abilityType: null,
      };
    }
    
    // Check if stuck
    if (this.stuckDetectionManager.checkIfStuck(aiPlayer)) {
      this.stuckDetectionManager.startUnstuckPeriod(aiPlayer.id);
      this.stuckDetectionManager.recordStuckLocation(aiPlayer);
      const escapeDirection = this.stuckDetectionManager.generateEscapeDirection(aiPlayer);
      
      return {
        behavior: AIBehavior.WANDER,
        targetPlayerId: null,
        moveDirection: escapeDirection,
        useAbility: true,
        abilityType: 'jetpack',
      };
    }
    
    if (aiPlayer.isOni) {
      return this.makeOniDecision(aiPlayer, allPlayers, deltaTime);
    } else {
      return this.makeRunnerDecision(aiPlayer, allPlayers, deltaTime);
    }
  }

  /**
   * Make decision for ONI AI
   */
  private makeOniDecision(
    aiPlayer: Player,
    allPlayers: Player[],
    deltaTime: number
  ): AIDecision {
    const personality = this.personalityManager.getOniPersonality(aiPlayer.id);
    
    const visiblePlayers = this.cloakedPlayerId 
      ? allPlayers.filter(p => p.id !== this.cloakedPlayerId)
      : allPlayers;
    
    const nearestRunner = this.behaviorSystem.findNearestRunner(
      aiPlayer, 
      visiblePlayers,
      this.assignedTargets
    );
    
    if (!nearestRunner) {
      const decision = this.behaviorSystem.wander(aiPlayer, deltaTime);
      return this.addAbilityDecision(aiPlayer, decision, 'jetpack');
    }
    
    const distance = this.calculateDistance(aiPlayer.position, nearestRunner.position);
    const yDiff = nearestRunner.position.y - aiPlayer.position.y;
    const nearStuckLocation = this.stuckDetectionManager.isNearStuckLocation(aiPlayer);
    const targetIsAirborne = nearestRunner.isJetpacking || yDiff > 2;
    const isMoving = Math.abs(aiPlayer.velocity.x) > 0.1 || Math.abs(aiPlayer.velocity.z) > 0.1;
    
    const baseDecision = this.behaviorSystem.chase(aiPlayer, nearestRunner);
    
    return this.personalityManager.applyPersonalityBehavior(
      personality,
      aiPlayer,
      baseDecision,
      distance,
      yDiff,
      targetIsAirborne,
      nearStuckLocation,
      isMoving,
      (_playerId, abilityType) => this.shouldUseAbility(aiPlayer, abilityType),
      (player, decision) => this.adjustDirectionToAvoidStuckLocations(player, decision)
    );
  }

  /**
   * Make decision for Runner AI
   */
  private makeRunnerDecision(
    aiPlayer: Player,
    allPlayers: Player[],
    deltaTime: number
  ): AIDecision {
    const nearestOni = this.behaviorSystem.findNearestOni(aiPlayer, allPlayers);
    
    if (!nearestOni) {
      return this.behaviorSystem.wander(aiPlayer, deltaTime);
    }
    
    if (this.behaviorSystem.isWithinFleeDistance(aiPlayer, nearestOni)) {
      const decision = this.behaviorSystem.flee(aiPlayer, nearestOni);
      return this.addAbilityDecision(aiPlayer, decision, 'jetpack');
    }
    
    return this.behaviorSystem.wander(aiPlayer, deltaTime);
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
   * Adjust direction to avoid stuck locations
   */
  private adjustDirectionToAvoidStuckLocations(aiPlayer: Player, decision: AIDecision): AIDecision {
    if (this.stuckDetectionManager.isNearStuckLocation(aiPlayer)) {
      const escapeDirection = this.stuckDetectionManager.generateEscapeDirection(aiPlayer);
      return {
        ...decision,
        moveDirection: escapeDirection,
      };
    }
    return decision;
  }

  /**
   * Add ability decision
   */
  private addAbilityDecision(
    aiPlayer: Player,
    decision: AIDecision,
    _abilityType: 'jetpack' | 'dash' | 'jump'
  ): AIDecision {
    const canUseAbility = this.shouldUseAbility(aiPlayer, _abilityType);
    return {
      ...decision,
      useAbility: canUseAbility,
      abilityType: canUseAbility ? _abilityType : null,
    };
  }

  /**
   * Check if AI should use ability
   */
  private shouldUseAbility(aiPlayer: Player, _abilityType: string): boolean {
    const timer = this.abilityTimers.get(aiPlayer.id) || 0;
    if (timer < this.config.abilityUseCooldown) {
      return false;
    }
    
    if (Math.random() > this.config.abilityUseChance) {
      return false;
    }
    
    this.abilityTimers.set(aiPlayer.id, 0);
    return true;
  }

  /**
   * Apply decision to player state
   */
  private applyDecision(aiPlayer: Player, decision: AIDecision, _deltaTime: number): void {
    const speed = aiPlayer.isOni ? PLAYER_SPEED * ONI_SPEED_MULTIPLIER : PLAYER_SPEED;
    
    if (decision.useAbility && decision.abilityType === 'jetpack') {
      this.gameState.setPlayerVelocity(aiPlayer.id, {
        x: decision.moveDirection.x * speed,
        y: JETPACK_FORCE,
        z: decision.moveDirection.z * speed,
      });
      this.gameState.setPlayerJetpacking(aiPlayer.id, true);
    } else if (decision.useAbility && decision.abilityType === 'dash') {
      this.gameState.setPlayerVelocity(aiPlayer.id, {
        x: decision.moveDirection.x * DASH_SPEED,
        y: aiPlayer.velocity.y,
        z: decision.moveDirection.z * DASH_SPEED,
      });
      this.gameState.setPlayerDashing(aiPlayer.id, true);
    } else if (decision.useAbility && decision.abilityType === 'jump') {
      this.gameState.setPlayerVelocity(aiPlayer.id, {
        x: decision.moveDirection.x * speed,
        y: JUMP_FORCE,
        z: decision.moveDirection.z * speed,
      });
    } else {
      this.gameState.setPlayerVelocity(aiPlayer.id, {
        x: decision.moveDirection.x * speed,
        y: aiPlayer.velocity.y,
        z: decision.moveDirection.z * speed,
      });
      this.gameState.setPlayerJetpacking(aiPlayer.id, false);
      this.gameState.setPlayerDashing(aiPlayer.id, false);
    }
    
    if (decision.moveDirection.x !== 0 || decision.moveDirection.z !== 0) {
      const yaw = Math.atan2(decision.moveDirection.z, decision.moveDirection.x);
      this.gameState.setPlayerRotation(aiPlayer.id, { yaw, pitch: 0 });
    }
  }

  /**
   * Reset all AI state
   */
  public reset(): void {
    this.behaviorSystem.reset();
    this.abilityTimers.clear();
    this.assignedTargets.clear();
    this.personalityManager.clear();
    this.stuckDetectionManager.clear();
  }
}
