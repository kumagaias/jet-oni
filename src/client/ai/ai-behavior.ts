import { Player, Vector3 } from '../../shared/types/game';
import { AIBehavior, AIDecision } from './ai-controller';

/**
 * AI behavior configuration
 */
export interface BehaviorConfig {
  chaseDistance: number;
  fleeDistance: number;
  wanderChangeInterval: number;
}

/**
 * AIBehaviorSystem handles AI movement behaviors
 */
export class AIBehaviorSystem {
  private config: BehaviorConfig;
  private wanderDirections: Map<string, Vector3> = new Map();
  private wanderTimers: Map<string, number> = new Map();

  constructor(config: BehaviorConfig) {
    this.config = config;
  }

  /**
   * Execute chase behavior (ONI chasing runner)
   */
  public chase(
    aiPlayer: Player,
    target: Player
  ): AIDecision {
    const direction = this.calculateDirection(aiPlayer.position, target.position);
    
    return {
      behavior: AIBehavior.CHASE,
      targetPlayerId: target.id,
      moveDirection: direction,
      useAbility: false,
      abilityType: null,
    };
  }

  /**
   * Execute flee behavior (Runner fleeing from ONI)
   */
  public flee(
    aiPlayer: Player,
    threat: Player
  ): AIDecision {
    // Calculate direction away from threat
    const direction = this.calculateDirection(threat.position, aiPlayer.position);
    
    return {
      behavior: AIBehavior.FLEE,
      targetPlayerId: threat.id,
      moveDirection: direction,
      useAbility: false,
      abilityType: null,
    };
  }

  /**
   * Execute wander behavior (random movement)
   */
  public wander(
    aiPlayer: Player,
    deltaTime: number
  ): AIDecision {
    const wanderTimer = this.wanderTimers.get(aiPlayer.id) || 0;
    const newTimer = wanderTimer + deltaTime;
    this.wanderTimers.set(aiPlayer.id, newTimer);
    
    // Change direction periodically
    if (newTimer >= this.config.wanderChangeInterval) {
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
   * Find nearest runner to ONI (with target distribution)
   */
  public findNearestRunner(
    aiPlayer: Player,
    allPlayers: Player[],
    assignedTargets?: Map<string, string> // Map of oniId -> runnerId
  ): Player | null {
    const runners = allPlayers.filter(p => !p.isOni && p.id !== aiPlayer.id);
    
    if (runners.length === 0) {
      return null;
    }
    
    // If target distribution is enabled, try to find an unassigned runner
    if (assignedTargets) {
      // Get runners that are not already being chased
      const assignedRunnerIds = new Set(Array.from(assignedTargets.values()));
      const unassignedRunners = runners.filter(r => !assignedRunnerIds.has(r.id));
      
      // If there are unassigned runners, pick the nearest one
      if (unassignedRunners.length > 0) {
        let nearestRunner: Player | null = null;
        let minDistance = Infinity;
        
        for (const runner of unassignedRunners) {
          const distance = this.calculateDistance(aiPlayer.position, runner.position);
          if (distance < minDistance) {
            minDistance = distance;
            nearestRunner = runner;
          }
        }
        
        return nearestRunner;
      }
    }
    
    // Fallback: find nearest runner (even if assigned to another ONI)
    let nearestRunner: Player | null = null;
    let minDistance = Infinity;
    
    for (const runner of runners) {
      const distance = this.calculateDistance(aiPlayer.position, runner.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestRunner = runner;
      }
    }
    
    return nearestRunner;
  }

  /**
   * Find nearest ONI to runner
   */
  public findNearestOni(
    aiPlayer: Player,
    allPlayers: Player[]
  ): Player | null {
    let nearestOni: Player | null = null;
    let minDistance = Infinity;
    
    for (const player of allPlayers) {
      // Skip self, runner players
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
   * Check if target is within chase distance
   */
  public isWithinChaseDistance(
    aiPlayer: Player,
    target: Player
  ): boolean {
    const distance = this.calculateDistance(aiPlayer.position, target.position);
    return distance <= this.config.chaseDistance;
  }

  /**
   * Check if threat is within flee distance
   */
  public isWithinFleeDistance(
    aiPlayer: Player,
    threat: Player
  ): boolean {
    const distance = this.calculateDistance(aiPlayer.position, threat.position);
    return distance <= this.config.fleeDistance;
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
   * Reset behavior state for a player
   */
  public resetPlayer(playerId: string): void {
    this.wanderDirections.delete(playerId);
    this.wanderTimers.delete(playerId);
  }

  /**
   * Reset all behavior state
   */
  public reset(): void {
    this.wanderDirections.clear();
    this.wanderTimers.clear();
  }

  /**
   * Get behavior configuration
   */
  public getConfig(): BehaviorConfig {
    return { ...this.config };
  }

  /**
   * Update behavior configuration
   */
  public setConfig(config: Partial<BehaviorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
