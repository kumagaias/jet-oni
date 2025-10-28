import { Vector3, GameStatus, Player, GameConfig } from '../../shared/types/game';
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
  rotation: { yaw: number; pitch: number };
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
    
    if (phase === 'playing') {
      this.gameStartTime = Date.now();
    }
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
   * Set whether local player is oni
   */
  public setLocalPlayerIsOni(isOni: boolean): void {
    this.localPlayer.isOni = isOni;
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
        fuel: this.localPlayer.fuel,
        survivedTime: this.localPlayer.survivedTime,
        wasTagged: false,
        isOnSurface: this.localPlayer.isOnSurface,
        isDashing: this.localPlayer.isDashing,
        isJetpacking: this.localPlayer.isJetpacking,
        beaconCooldown: 0,
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
      fuel: this.localPlayer.fuel,
      survivedTime: this.localPlayer.survivedTime,
      wasTagged: false,
      isOnSurface: this.localPlayer.isOnSurface,
      isDashing: this.localPlayer.isDashing,
      isJetpacking: this.localPlayer.isJetpacking,
      beaconCooldown: 0,
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
    return this.getRemainingTime() <= 0;
  }

  /**
   * Check if all players are oni (game over condition)
   */
  public areAllPlayersOni(): boolean {
    if (!this.isPlaying()) {
      return false;
    }
    return this.countRunnerPlayers() === 0;
  }

  /**
   * Check if game should end
   */
  public shouldGameEnd(): boolean {
    if (!this.isPlaying()) {
      return false;
    }
    return this.hasTimeRunOut() || this.areAllPlayersOni();
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
