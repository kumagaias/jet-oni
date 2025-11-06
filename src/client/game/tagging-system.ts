import { GameState } from './game-state';
import { TAG_DISTANCE, BEACON_INITIAL_DELAY } from '../../shared/constants';
import { BeaconSystem } from '../abilities/beacon-system';

/**
 * TagEvent represents a tagging event
 */
export interface TagEvent {
  taggerId: string;
  taggedId: string;
  timestamp: number;
  position: { x: number; y: number; z: number };
}

/**
 * TaggingSystem handles tagging mechanics between players
 */
export class TaggingSystem {
  private gameState: GameState;
  private beaconSystem: BeaconSystem | null = null;
  private tagEvents: TagEvent[] = [];
  private lastTagTime = 0;
  private tagCooldown = 500; // milliseconds to prevent double-tagging

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /**
   * Set beacon system for managing beacon cooldown
   */
  public setBeaconSystem(beaconSystem: BeaconSystem): void {
    this.beaconSystem = beaconSystem;
  }

  /**
   * Update tagging system - check for tags between players
   */
  public update(deltaTime: number): TagEvent | null {
    if (!this.gameState.isPlaying()) return null;

    const now = Date.now();
    
    // Check if cooldown has passed
    if (now - this.lastTagTime < this.tagCooldown) {
      return null;
    }

    const localPlayer = this.gameState.getLocalPlayer();
    const allPlayers = this.gameState.getAllPlayers();

    // Case 1: Local player is ONI - check if they can tag runners
    if (localPlayer.isOni) {
      // Check distance to all runner players
      for (const player of allPlayers) {
        // Skip self and other oni
        if (player.id === localPlayer.id || player.isOni) continue;

        // Calculate distance
        const distance = this.calculateDistance(localPlayer.position, player.position);

        // Check if within tagging distance
        if (distance <= TAG_DISTANCE) {
          // Tag the player
          const tagEvent = this.tagPlayer(localPlayer.id, player.id);
          this.lastTagTime = now;
          return tagEvent;
        }
      }
    }
    
    // Case 2: Local player is Runner - check if any ONI can tag them
    if (!localPlayer.isOni) {
      // Check distance to all oni players
      for (const player of allPlayers) {
        // Skip self and non-oni
        if (player.id === localPlayer.id || !player.isOni) continue;

        // Calculate distance
        const distance = this.calculateDistance(localPlayer.position, player.position);

        // Debug: Log when ONI is close
        if (distance <= TAG_DISTANCE * 2) {
          console.log(`[Tag] ONI ${player.id} (AI: ${player.isAI}) is ${distance.toFixed(2)} units away (tag distance: ${TAG_DISTANCE})`);
        }

        // Check if within tagging distance
        if (distance <= TAG_DISTANCE) {
          console.log(`[Tag] Local runner tagged by ONI ${player.id} (AI: ${player.isAI})`);
          // Local player gets tagged by remote ONI
          const tagEvent = this.tagPlayer(player.id, localPlayer.id);
          this.lastTagTime = now;
          return tagEvent;
        }
      }
    }

    return null;
  }

  /**
   * Tag a player (convert runner to oni)
   */
  private tagPlayer(taggerId: string, taggedId: string): TagEvent {
    const taggedPlayer = this.gameState.getPlayer(taggedId);
    const taggerPlayer = this.gameState.getPlayer(taggerId);
    
    if (!taggedPlayer) {
      throw new Error(`Player ${taggedId} not found`);
    }
    
    if (!taggerPlayer) {
      throw new Error(`Player ${taggerId} not found`);
    }

    // Record survival time before converting
    const survivedTime = taggedPlayer.survivedTime;

    // Increment tagger's tag count
    this.incrementTagCount(taggerId);

    // Create tag event
    const tagEvent: TagEvent = {
      taggerId,
      taggedId,
      timestamp: Date.now(),
      position: { ...taggedPlayer.position },
    };

    // Convert player to oni
    this.convertToOni(taggedId, survivedTime);

    // Store event
    this.tagEvents.push(tagEvent);

    return tagEvent;
  }
  
  /**
   * Increment tag count for a player
   */
  private incrementTagCount(playerId: string): void {
    const localPlayer = this.gameState.getLocalPlayer();
    
    if (playerId === localPlayer.id) {
      // Increment local player tag count
      this.gameState.setLocalPlayerTagCount((localPlayer.tagCount || 0) + 1);
    } else {
      // Increment remote player tag count
      const player = this.gameState.getRemotePlayer(playerId);
      if (player) {
        player.tagCount = (player.tagCount || 0) + 1;
      }
    }
  }

  /**
   * Convert a player to oni
   */
  private convertToOni(playerId: string, survivedTime: number): void {
    const localPlayer = this.gameState.getLocalPlayer();

    if (playerId === localPlayer.id) {
      // Convert local player to oni
      this.gameState.setLocalPlayerIsOni(true);
      this.gameState.setLocalPlayerWasTagged(true);
      this.gameState.setLocalPlayerSurvivedTime(survivedTime);
      
      // Reset abilities for oni
      this.gameState.setLocalPlayerDashing(false);
      
      // Start beacon cooldown
      if (this.beaconSystem) {
        this.beaconSystem.onBecameOni();
      }
    } else {
      // Convert remote player to oni
      const player = this.gameState.getRemotePlayer(playerId);
      if (player) {
        player.isOni = true;
        player.wasTagged = true;
        player.survivedTime = survivedTime;
        player.isDashing = false;
        // Note: Remote player beacon cooldown is managed on their client
      }
    }
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(
    pos1: { x: number; y: number; z: number },
    pos2: { x: number; y: number; z: number }
  ): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get all tag events
   */
  public getTagEvents(): TagEvent[] {
    return [...this.tagEvents];
  }

  /**
   * Clear tag events
   */
  public clearTagEvents(): void {
    this.tagEvents = [];
  }

  /**
   * Reset tagging system for new round
   */
  public reset(): void {
    this.tagEvents = [];
    this.lastTagTime = 0;
  }
}
