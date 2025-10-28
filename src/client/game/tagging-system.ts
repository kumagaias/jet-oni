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

    // Only check if local player is oni
    if (!localPlayer.isOni) return null;

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

    return null;
  }

  /**
   * Tag a player (convert runner to oni)
   */
  private tagPlayer(taggerId: string, taggedId: string): TagEvent {
    const taggedPlayer = this.gameState.getPlayer(taggedId);
    
    if (!taggedPlayer) {
      throw new Error(`Player ${taggedId} not found`);
    }

    // Record survival time before converting
    const survivedTime = taggedPlayer.survivedTime;

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
   * Convert a player to oni
   */
  private convertToOni(playerId: string, survivedTime: number): void {
    const localPlayer = this.gameState.getLocalPlayer();

    if (playerId === localPlayer.id) {
      // Convert local player to oni
      this.gameState.setLocalPlayerIsOni(true);
      
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
