import { Vector3, GameStatus, Player, GameConfig, Rotation } from '../../shared/types/game';
import {
  MAX_FUEL,
  PLAYER_SPEED,
  ONI_SPEED_MULTIPLIER,
  MAP_SIZE,
} from '../../shared/constants';
import { EdgeCaseHandler } from '../utils/edge-case-handler';

/**
 * LocalPlayerState represents the local player's state
 */
export interface LocalPlayerState {
  id: string;
  position: Vector3;
  velocity: Vector3;
  rotation: Rotation;
  fuel: number;
  isOni: boolean;
  isOnSurface: boolean;
  isDashing: boolean;
  isJetpacking: boolean;
  isClimbing: boolean;
  survivedTime: number;
}

/**
 * GameState manages the local game state
 */
export class GameState {
  private gamePhase: GameStatus = 'lobby';
  private localPlayer: LocalPlayerState;
  private remotePlayers: Map<string, Player> = new Map();
  private gameConfig: GameConfig | null = null;
  private gameStartTime = 0;
  private currentRound = 1;

  constructor(playerId: string) {
    // Initialize local player with default values
    this.localPlayer = {
      id: playerId,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { yaw: 0, pitch: 0 },
      fuel: MAX_FUEL,
      isOni: false,
      isOnSurface: true,
      isDashing: false,
      isJetpacking: false,
      isClimbing: false,
      survivedTime: 0,
    };
  }

  /**
   * Get the current game phase
   */
  public getGamePhase(): GameStatus {
    return this.gamePhase;
  }

  /**
   * Set the game phase
   */
  public setGamePhase(phase: GameStatus): void {
    this.gamePhase = phase;
  }

  /**
   * Check if the game is in lobby
   */
  public isInLobby(): boolean {
    return this.gamePhase === 'lobby';
  }

  /**
   * Check if the game is playing
   */
  public isPlaying(): boolean {
    return this.gamePhase === 'playing';
  }

  /**
   * Check if the game has ended
   */
  public hasEnded(): boolean {
    return this.gamePhase === 'ended';
  }

  /**
   * Get the local player state
   */
  public getLocalPlayer(): LocalPlayerState {
    return this.localPlayer;
  }

  /**
   * Update local player ID (used when syncing with server)
   */
  public setLocalPlayerId(newId: string): void {
    this.localPlayer.id = newId;
  }

  /**
   * Update local player position
   */
  public setLocalPlayerPosition(position: Vector3): void {
    // Sanitize position to ensure all components are finite
    this.localPlayer.position = EdgeCaseHandler.sanitizeVector(position);
  }

  /**
   * Update local player velocity
   */
  public setLocalPlayerVelocity(velocity: Vector3): void {
    // Sanitize velocity to ensure all components are finite
    this.localPlayer.velocity = EdgeCaseHandler.sanitizeVector(velocity);
  }

  /**
   * Update local player rotation
   */
  public setLocalPlayerRotation(yaw: number, pitch: number): void {
    this.localPlayer.rotation = { yaw, pitch };
  }

  /**
   * Update local player fuel
   */
  public setLocalPlayerFuel(fuel: number): void {
    this.localPlayer.fuel = Math.max(0, Math.min(MAX_FUEL, fuel));
  }

  /**
   * Set local player username
   */
  public setLocalPlayerUsername(username: string): void {
    this.localPlayer.username = username;
  }

  /**
   * Set whether local player is oni
   */
  public setLocalPlayerIsOni(isOni: boolean): void {
    this.localPlayer.isOni = isOni;
  }

  /**
   * Set whether local player was tagged
   */
  public setLocalPlayerWasTagged(wasTagged: boolean): void {
    this.localPlayer.wasTagged = wasTagged;
  }

  /**
   * Set whether local player is on surface
   */
  public setLocalPlayerOnSurface(isOnSurface: boolean): void {
    this.localPlayer.isOnSurface = isOnSurface;
  }

  /**
   * Set whether local player is dashing
   */
  public setLocalPlayerDashing(isDashing: boolean): void {
    this.localPlayer.isDashing = isDashing;
  }

  /**
   * Set whether local player is jetpacking
   */
  public setLocalPlayerJetpacking(isJetpacking: boolean): void {
    this.localPlayer.isJetpacking = isJetpacking;
  }

  /**
   * Set whether local player is climbing
   */
  public setLocalPlayerClimbing(isClimbing: boolean): void {
    this.localPlayer.isClimbing = isClimbing;
  }

  /**
   * Update local player survived time
   */
  public updateLocalPlayerSurvivedTime(deltaTime: number): void {
    if (this.isPlaying() && !this.localPlayer.isOni) {
      this.localPlayer.survivedTime += deltaTime;
    }
  }

  /**
   * Set local player survived time
   */
  public setLocalPlayerSurvivedTime(survivedTime: number): void {
    this.localPlayer.survivedTime = survivedTime;
  }

  /**
   * Set local player tag count
   */
  public setLocalPlayerTagCount(tagCount: number): void {
    this.localPlayer.tagCount = tagCount;
  }

  /**
   * Get local player speed based on state
   */
  public getLocalPlayerSpeed(): number {
    let speed = PLAYER_SPEED;
    
    if (this.localPlayer.isOni) {
      speed *= ONI_SPEED_MULTIPLIER;
    }
    
    return speed;
  }

  /**
   * Check if local player position is within map bounds
   */
  public isPositionInBounds(position: Vector3): boolean {
    return (
      Math.abs(position.x) <= MAP_SIZE &&
      Math.abs(position.z) <= MAP_SIZE &&
      position.y >= 0
    );
  }

  /**
   * Clamp position to map bounds
   */
  public clampPositionToBounds(position: Vector3): Vector3 {
    return {
      x: Math.max(-MAP_SIZE, Math.min(MAP_SIZE, position.x)),
      y: Math.max(0, position.y),
      z: Math.max(-MAP_SIZE, Math.min(MAP_SIZE, position.z)),
    };
  }

  /**
   * Add or update a remote player
   */
  public updateRemotePlayer(player: Player): void {
    this.remotePlayers.set(player.id, player);
  }

  /**
   * Remove a remote player
   */
  public removeRemotePlayer(playerId: string): void {
    this.remotePlayers.delete(playerId);
  }

  /**
   * Remove a player (alias for removeRemotePlayer)
   */
  public removePlayer(playerId: string): void {
    this.removeRemotePlayer(playerId);
  }

  /**
   * Get all remote players
   */
  public getRemotePlayers(): Player[] {
    return Array.from(this.remotePlayers.values());
  }

  /**
   * Get a specific remote player
   */
  public getRemotePlayer(playerId: string): Player | undefined {
    return this.remotePlayers.get(playerId);
  }

  /**
   * Get a specific player (local or remote)
   */
  public getPlayer(playerId: string): Player | undefined {
    if (playerId === this.localPlayer.id) {
      return {
        id: this.localPlayer.id,
        username: 'You',
        isOni: this.localPlayer.isOni,
        isAI: false,
        position: this.localPlayer.position,
        velocity: this.localPlayer.velocity,
        rotation: this.localPlayer.rotation,
        fuel: this.localPlayer.fuel,
        survivedTime: this.localPlayer.survivedTime,
        wasTagged: this.localPlayer.wasTagged,
        tagCount: this.localPlayer.tagCount || 0,
        isOnSurface: this.localPlayer.isOnSurface,
        isDashing: this.localPlayer.isDashing,
        isJetpacking: this.localPlayer.isJetpacking,
        beaconCooldown: this.localPlayer.beaconCooldown,
      };
    }
    return this.remotePlayers.get(playerId);
  }

  /**
   * Set player velocity (for AI players)
   */
  public setPlayerVelocity(playerId: string, velocity: Vector3): void {
    if (playerId === this.localPlayer.id) {
      this.setLocalPlayerVelocity(velocity);
    } else {
      const player = this.remotePlayers.get(playerId);
      if (player) {
        player.velocity = { ...velocity };
      }
    }
  }

  /**
   * Set player jetpacking state (for AI players)
   */
  public setPlayerJetpacking(playerId: string, isJetpacking: boolean): void {
    if (playerId === this.localPlayer.id) {
      this.setLocalPlayerJetpacking(isJetpacking);
    } else {
      const player = this.remotePlayers.get(playerId);
      if (player) {
        player.isJetpacking = isJetpacking;
      }
    }
  }

  /**
   * Set player dashing state (for AI players)
   */
  public setPlayerDashing(playerId: string, isDashing: boolean): void {
    if (playerId === this.localPlayer.id) {
      this.setLocalPlayerDashing(isDashing);
    } else {
      const player = this.remotePlayers.get(playerId);
      if (player) {
        player.isDashing = isDashing;
      }
    }
  }

  /**
   * Set player position (for AI players)
   */
  public setPlayerPosition(playerId: string, position: Vector3): void {
    if (playerId === this.localPlayer.id) {
      this.setLocalPlayerPosition(position);
    } else {
      const player = this.remotePlayers.get(playerId);
      if (player) {
        player.position = { ...position };
      }
    }
  }

  /**
   * Set player on surface state (for AI players)
   */
  public setPlayerOnSurface(playerId: string, isOnSurface: boolean): void {
    if (playerId === this.localPlayer.id) {
      this.setLocalPlayerOnSurface(isOnSurface);
    } else {
      const player = this.remotePlayers.get(playerId);
      if (player) {
        player.isOnSurface = isOnSurface;
      }
    }
  }

  /**
   * Get all players (local + remote)
   */
  public getAllPlayers(): Player[] {
    const localAsPlayer: Player = {
      id: this.localPlayer.id,
      username: 'You',
      isOni: this.localPlayer.isOni,
      isAI: false,
      position: this.localPlayer.position,
      velocity: this.localPlayer.velocity,
      rotation: this.localPlayer.rotation,
      fuel: this.localPlayer.fuel,
      survivedTime: this.localPlayer.survivedTime,
      wasTagged: this.localPlayer.wasTagged,
      tagCount: this.localPlayer.tagCount || 0,
      isOnSurface: this.localPlayer.isOnSurface,
      isDashing: this.localPlayer.isDashing,
      isJetpacking: this.localPlayer.isJetpacking,
      beaconCooldown: this.localPlayer.beaconCooldown,
    };

    return [localAsPlayer, ...this.getRemotePlayers()];
  }

  /**
   * Count oni players
   */
  public countOniPlayers(): number {
    let count = this.localPlayer.isOni ? 1 : 0;
    for (const player of this.remotePlayers.values()) {
      if (player.isOni) count++;
    }
    return count;
  }

  /**
   * Count runner players
   */
  public countRunnerPlayers(): number {
    let count = this.localPlayer.isOni ? 0 : 1;
    for (const player of this.remotePlayers.values()) {
      if (!player.isOni) count++;
    }
    return count;
  }

  /**
   * Set game configuration
   */
  public setGameConfig(config: GameConfig): void {
    this.gameConfig = config;
  }

  /**
   * Get game configuration
   */
  public getGameConfig(): GameConfig | null {
    return this.gameConfig;
  }

  /**
   * Get current round
   */
  public getCurrentRound(): number {
    return this.currentRound;
  }

  /**
   * Set current round
   */
  public setCurrentRound(round: number): void {
    this.currentRound = round;
  }

  /**
   * Set game start time (for timer synchronization)
   */
  public setGameStartTime(timestamp: number): void {
    this.gameStartTime = timestamp;
  }

  /**
   * Get elapsed time since game start (in seconds)
   */
  public getElapsedTime(): number {
    if (!this.isPlaying() || this.gameStartTime === 0) {
      return 0;
    }
    return (Date.now() - this.gameStartTime) / 1000;
  }

  /**
   * Get remaining time in current round (in seconds)
   */
  public getRemainingTime(): number {
    if (!this.gameConfig || !this.isPlaying()) {
      return 0;
    }
    const elapsed = this.getElapsedTime();
    return Math.max(0, this.gameConfig.roundDuration - elapsed);
  }

  /**
   * Check if time has run out
   */
  public hasTimeRunOut(): boolean {
    const remaining = this.getRemainingTime();
    if (remaining <= 0 && this.isPlaying()) {
      console.log(`[GameState] Time run out: remaining=${remaining}, elapsed=${this.getElapsedTime()}, startTime=${this.gameStartTime}, config=${JSON.stringify(this.gameConfig)}`);
    }
    return remaining <= 0;
  }

  /**
   * Check if all players are oni (game over condition)
   * Checks ALL players including local, remote, and AI players
   */
  public areAllPlayersOni(): boolean {
    if (!this.isPlaying()) {
      return false;
    }
    
    // Don't check for game end in the first 10 seconds (allow time for sync)
    const elapsed = this.getElapsedTime();
    if (elapsed < 10) {
      console.log(`[GameState] areAllPlayersOni: Too early (${elapsed}s < 10s)`);
      return false;
    }
    
    // Get all players (local + remote, including AI)
    const allPlayers = this.getAllPlayers();
    
    // Don't end game if there are less than 2 total players
    if (allPlayers.length < 2) {
      console.log(`[GameState] areAllPlayersOni: Not enough players (${allPlayers.length} < 2)`);
      return false; // Wait for players to join
    }
    
    // Check if all players are oni
    const runnerCount = allPlayers.filter(p => !p.isOni).length;
    console.log(`[GameState] areAllPlayersOni: elapsed=${elapsed}s, totalPlayers=${allPlayers.length}, runnerCount=${runnerCount}`);
    return runnerCount === 0;
  }

  /**
   * Check if game should end
   */
  public shouldGameEnd(): boolean {
    if (!this.isPlaying()) {
      return false;
    }
    
    const timeRunOut = this.hasTimeRunOut();
    const allOni = this.areAllPlayersOni();
    
    if (timeRunOut || allOni) {
      // Game should end
    }
    
    return timeRunOut || allOni;
  }

  /**
   * Reset game state for new round
   */
  public resetForNewRound(): void {
    this.localPlayer.position = { x: 0, y: 0, z: 0 };
    this.localPlayer.velocity = { x: 0, y: 0, z: 0 };
    this.localPlayer.fuel = MAX_FUEL;
    this.localPlayer.isOnSurface = true;
    this.localPlayer.isDashing = false;
    this.localPlayer.isJetpacking = false;
    this.localPlayer.isClimbing = false;
    this.localPlayer.survivedTime = 0;
    this.gameStartTime = Date.now();
  }

  /**
   * Clear all remote players (keep local player)
   */
  public clearRemotePlayers(): void {
    this.remotePlayers.clear();
  }

  /**
   * Clear all state
   */
  public clear(): void {
    this.gamePhase = 'lobby';
    this.remotePlayers.clear();
    this.gameConfig = null;
    this.gameStartTime = 0;
    this.currentRound = 1;
    this.resetForNewRound();
  }
}
