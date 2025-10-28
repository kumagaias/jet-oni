import { Vector3, Player } from '../../shared/types/game';
import { TAG_DISTANCE, BEACON_INITIAL_DELAY } from '../../shared/constants';
import { GameState } from './game-state';

/**
 * TagEvent represents a tagging event
 */
export interface TagEvent {
  taggerId: string;
  taggedId: string;
  timestamp: number;
  survivedTime: number;
}

/**
 * TagSystem handles tagging mechanics between oni and runners
 */
export class TagSystem {
  private gameState: GameState;
  private onTagCallback?: (event: TagEvent) => void;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /**
   * Set callback for when a tag occurs
   */
  public onTag(callback: (event: TagEvent) => void): void {
    this.onTagCallback = callback;
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Check if a player can tag another player
   */
  private canTag(tagger: Player, target: Player): boolean {
    // Tagger must be oni
    if (!tagger.isOni) {
      return false;
    }

    // Target must be runner
    if (target.isOni) {
      return false;
    }

    // Check distance
    const distance = this.calculateDistance(tagger.position, target.position);
    return distance <= TAG_DISTANCE;
  }

  /**
   * Convert a runner to oni
   */
  private convertToOni(playerId: string): void {
    const localPlayer = this.gameState.getLocalPlayer();
    
    if (playerId === localPlayer.id) {
      // Convert local player to oni
      this.gameState.setLocalPlayerIsOni(true);
      
      // Disable dash ability (oni cannot dash)
      this.gameState.setLocalPlayerDashing(false);
    } else {
      // Convert remote player to oni
      const player = this.gameState.getRemotePlayer(playerId);
      if (player) {
        player.isOni = true;
        player.beaconCooldown = BEACON_INITIAL_DELAY;
        player.isDashing = false; // Oni cannot dash
      }
    }
  }

  /**
   * Record survived time for a player who was tagged
   */
  private recordSurvivedTime(playerId: string): number {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return 0;
    }
    return player.survivedTime;
  }

  /**
   * Update tagging system - check for tags
   */
  public update(): void {
    // Only check for tags during gameplay
    if (!this.gameState.isPlaying()) {
      return;
    }

    const allPlayers = this.gameState.getAllPlayers();
    const localPlayer = this.gameState.getLocalPlayer();

    // Check if local player (as oni) can tag any runners
    if (localPlayer.isOni) {
      for (const player of allPlayers) {
        if (player.id === localPlayer.id) continue;
        if (player.isOni) continue;

        const localAsPlayer: Player = {
          id: localPlayer.id,
          username: 'You',
          isOni: localPlayer.isOni,
          isAI: false,
          position: localPlayer.position,
          velocity: localPlayer.velocity,
          fuel: localPlayer.fuel,
          survivedTime: localPlayer.survivedTime,
          wasTagged: false,
          isOnSurface: localPlayer.isOnSurface,
          isDashing: localPlayer.isDashing,
          isJetpacking: localPlayer.isJetpacking,
          beaconCooldown: 0,
        };

        if (this.canTag(localAsPlayer, player)) {
          this.performTag(localPlayer.id, player.id);
        }
      }
    }

    // Check if any oni can tag local player (as runner)
    if (!localPlayer.isOni) {
      for (const player of allPlayers) {
        if (player.id === localPlayer.id) continue;
        if (!player.isOni) continue;

        const localAsPlayer: Player = {
          id: localPlayer.id,
          username: 'You',
          isOni: localPlayer.isOni,
          isAI: false,
          position: localPlayer.position,
          velocity: localPlayer.velocity,
          fuel: localPlayer.fuel,
          survivedTime: localPlayer.survivedTime,
          wasTagged: false,
          isOnSurface: localPlayer.isOnSurface,
          isDashing: localPlayer.isDashing,
          isJetpacking: localPlayer.isJetpacking,
          beaconCooldown: 0,
        };

        if (this.canTag(player, localAsPlayer)) {
          this.performTag(player.id, localPlayer.id);
        }
      }
    }

    // Check AI oni tagging AI runners
    const oniPlayers = allPlayers.filter(p => p.isOni && p.isAI);
    const runnerPlayers = allPlayers.filter(p => !p.isOni && p.isAI);

    for (const oni of oniPlayers) {
      for (const runner of runnerPlayers) {
        if (this.canTag(oni, runner)) {
          this.performTag(oni.id, runner.id);
        }
      }
    }
  }

  /**
   * Perform a tag
   */
  private performTag(taggerId: string, taggedId: string): void {
    const survivedTime = this.recordSurvivedTime(taggedId);
    
    // Convert tagged player to oni
    this.convertToOni(taggedId);

    // Mark player as tagged
    const taggedPlayer = this.gameState.getPlayer(taggedId);
    if (taggedPlayer) {
      taggedPlayer.wasTagged = true;
    }

    // Create tag event
    const event: TagEvent = {
      taggerId,
      taggedId,
      timestamp: Date.now(),
      survivedTime,
    };

    // Trigger callback
    if (this.onTagCallback) {
      this.onTagCallback(event);
    }
  }

  /**
   * Check if all players are oni (game end condition)
   */
  public areAllPlayersOni(): boolean {
    return this.gameState.countRunnerPlayers() === 0;
  }

  /**
   * Get distance between local player and another player
   */
  public getDistanceToPlayer(playerId: string): number {
    const localPlayer = this.gameState.getLocalPlayer();
    const player = this.gameState.getPlayer(playerId);
    
    if (!player) {
      return Infinity;
    }

    return this.calculateDistance(localPlayer.position, player.position);
  }

  /**
   * Check if local player is close to being tagged
   */
  public isCloseToBeingTagged(): boolean {
    const localPlayer = this.gameState.getLocalPlayer();
    
    // Only relevant if local player is runner
    if (localPlayer.isOni) {
      return false;
    }

    const allPlayers = this.gameState.getAllPlayers();
    const oniPlayers = allPlayers.filter(p => p.isOni);

    for (const oni of oniPlayers) {
      const distance = this.calculateDistance(localPlayer.position, oni.position);
      if (distance <= TAG_DISTANCE * 2) {
        return true;
      }
    }

    return false;
  }
}
