import { Player } from '../../shared/types/game';
import { AIDecision } from './ai-controller';

/**
 * AI ONI personality types
 */
export enum OniPersonality {
  AGGRESSIVE = 'aggressive',   // Direct chase, uses jetpack frequently while moving
  TACTICAL = 'tactical',       // Takes detours to flank, moderate jetpack use
  CONSERVATIVE = 'conservative', // Rarely uses jetpack, ground-based pursuit
}

/**
 * Personality manager for AI ONI
 */
export class PersonalityManager {
  private oniPersonalities: Map<string, OniPersonality> = new Map();

  /**
   * Get or assign personality for ONI
   */
  public getOniPersonality(oniId: string): OniPersonality {
    if (!this.oniPersonalities.has(oniId)) {
      // Randomly assign personality
      const personalities = [OniPersonality.AGGRESSIVE, OniPersonality.TACTICAL, OniPersonality.CONSERVATIVE];
      const randomPersonality = personalities[Math.floor(Math.random() * personalities.length)]!;
      this.oniPersonalities.set(oniId, randomPersonality);
      console.log(`[AI] Assigned personality ${randomPersonality} to ONI ${oniId}`);
    }
    return this.oniPersonalities.get(oniId)!;
  }

  /**
   * Clear all personalities
   */
  public clear(): void {
    this.oniPersonalities.clear();
  }

  /**
   * Apply personality-specific behavior to chase decision
   */
  public applyPersonalityBehavior(
    personality: OniPersonality,
    aiPlayer: Player,
    baseDecision: AIDecision,
    distance: number,
    yDiff: number,
    targetIsAirborne: boolean,
    nearStuckLocation: boolean,
    isMoving: boolean,
    shouldUseAbility: (playerId: string, abilityType: string) => boolean,
    adjustDirectionToAvoidStuckLocations: (player: Player, decision: AIDecision) => AIDecision
  ): AIDecision {
    switch (personality) {
      case OniPersonality.AGGRESSIVE:
        return this.applyAggressiveBehavior(
          aiPlayer,
          baseDecision,
          distance,
          targetIsAirborne,
          nearStuckLocation,
          isMoving,
          shouldUseAbility,
          adjustDirectionToAvoidStuckLocations
        );
        
      case OniPersonality.TACTICAL:
        return this.applyTacticalBehavior(
          aiPlayer,
          baseDecision,
          distance,
          targetIsAirborne,
          nearStuckLocation,
          isMoving,
          shouldUseAbility,
          adjustDirectionToAvoidStuckLocations
        );
        
      case OniPersonality.CONSERVATIVE:
        return this.applyConservativeBehavior(
          aiPlayer,
          baseDecision,
          yDiff,
          targetIsAirborne,
          nearStuckLocation,
          isMoving,
          shouldUseAbility,
          adjustDirectionToAvoidStuckLocations
        );
        
      default:
        return adjustDirectionToAvoidStuckLocations(aiPlayer, baseDecision);
    }
  }

  /**
   * Apply aggressive behavior: Direct chase, uses jetpack frequently while moving
   */
  private applyAggressiveBehavior(
    aiPlayer: Player,
    decision: AIDecision,
    distance: number,
    targetIsAirborne: boolean,
    nearStuckLocation: boolean,
    isMoving: boolean,
    shouldUseAbility: (playerId: string, abilityType: string) => boolean,
    adjustDirectionToAvoidStuckLocations: (player: Player, decision: AIDecision) => AIDecision
  ): AIDecision {
    // Adjust direction to avoid stuck locations
    const adjustedDecision = adjustDirectionToAvoidStuckLocations(aiPlayer, decision);
    
    // Aggressive: Use jetpack often (60% chance) when moving
    const shouldUseJetpack = distance > 20 || targetIsAirborne || Math.random() < 0.6 || nearStuckLocation;
    const canUseAbility = shouldUseJetpack && shouldUseAbility(aiPlayer.id, 'jetpack') && isMoving;
    
    return {
      ...adjustedDecision,
      useAbility: canUseAbility,
      abilityType: canUseAbility ? 'jetpack' : null,
    };
  }

  /**
   * Apply tactical behavior: Takes detours to flank, moderate jetpack use
   */
  private applyTacticalBehavior(
    aiPlayer: Player,
    decision: AIDecision,
    distance: number,
    targetIsAirborne: boolean,
    nearStuckLocation: boolean,
    isMoving: boolean,
    shouldUseAbility: (playerId: string, abilityType: string) => boolean,
    adjustDirectionToAvoidStuckLocations: (player: Player, decision: AIDecision) => AIDecision
  ): AIDecision {
    let adjustedDecision = decision;
    
    // Add flanking behavior: occasionally move perpendicular to target
    if (Math.random() < 0.3 && distance > 15) {
      // Flank: move perpendicular to direct path
      const perpX = -decision.moveDirection.z;
      const perpZ = decision.moveDirection.x;
      adjustedDecision = {
        ...decision,
        moveDirection: {
          x: perpX,
          y: 0,
          z: perpZ,
        },
      };
    } else {
      // Normal chase with stuck avoidance
      adjustedDecision = adjustDirectionToAvoidStuckLocations(aiPlayer, decision);
    }
    
    // Tactical: Moderate jetpack use (30% chance)
    const shouldUseJetpack = distance > 30 || targetIsAirborne || Math.random() < 0.3 || nearStuckLocation;
    const canUseAbility = shouldUseJetpack && shouldUseAbility(aiPlayer.id, 'jetpack') && isMoving;
    
    return {
      ...adjustedDecision,
      useAbility: canUseAbility,
      abilityType: canUseAbility ? 'jetpack' : null,
    };
  }

  /**
   * Apply conservative behavior: Rarely uses jetpack, ground-based pursuit
   */
  private applyConservativeBehavior(
    aiPlayer: Player,
    decision: AIDecision,
    yDiff: number,
    targetIsAirborne: boolean,
    nearStuckLocation: boolean,
    isMoving: boolean,
    shouldUseAbility: (playerId: string, abilityType: string) => boolean,
    adjustDirectionToAvoidStuckLocations: (player: Player, decision: AIDecision) => AIDecision
  ): AIDecision {
    // Adjust direction to avoid stuck locations
    const adjustedDecision = adjustDirectionToAvoidStuckLocations(aiPlayer, decision);
    
    // Conservative: Rarely use jetpack (10% chance), only when necessary
    const shouldUseJetpack = (targetIsAirborne && yDiff > 5) || nearStuckLocation || Math.random() < 0.1;
    const canUseAbility = shouldUseJetpack && shouldUseAbility(aiPlayer.id, 'jetpack') && isMoving;
    
    return {
      ...adjustedDecision,
      useAbility: canUseAbility,
      abilityType: canUseAbility ? 'jetpack' : null,
    };
  }
}
