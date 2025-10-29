import type { Player, Vector3, Rotation } from '../../shared/types/game.js';
import { GameAPIClient } from '../api/game-api-client.js';
import { StateCompressor, type FullPlayerState } from '../../shared/utils/compression.js';

/**
 * Player state update for synchronization
 */
export interface PlayerStateUpdate {
  position: Vector3;
  velocity: Vector3;
  rotation: Rotation;
  fuel: number;
  isOni: boolean;
  isDashing: boolean;
  isJetpacking: boolean;
  isOnSurface: boolean;
  beaconCooldown?: number;
  survivedTime?: number;
  wasTagged?: boolean;
}

/**
 * Remote player with interpolation data
 */
export interface RemotePlayer extends Player {
  targetPosition: Vector3;
  targetVelocity: Vector3;
  targetRotation: Rotation;
  lastUpdateTime: number;
  interpolationProgress: number;
}

/**
 * Configuration for GameSyncManager
 */
export interface GameSyncConfig {
  syncInterval?: number; // milliseconds
  interpolationDuration?: number; // milliseconds
  predictionEnabled?: boolean;
  disconnectTimeout?: number; // milliseconds
}

/**
 * Manages real-time synchronization of game state between clients
 * Handles sending local player state and receiving remote player states
 */
export class GameSyncManager {
  private apiClient: GameAPIClient;
  private gameId: string | null = null;
  private playerId: string | null = null;
  private isRunning = false;
  
  private sendInterval: number | null = null;
  private receiveInterval: number | null = null;
  
  private syncInterval: number;
  private interpolationDuration: number;
  private predictionEnabled: boolean;
  private disconnectTimeout: number;
  
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private updateCallbacks: Array<(players: RemotePlayer[]) => void> = [];
  private disconnectCallbacks: Array<(playerId: string) => void> = [];
  
  private lastSentState: PlayerStateUpdate | null = null;
  private lastReceiveTime: number = Date.now();
  private consecutiveFailures: number = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  
  // Compression support
  private compressor: StateCompressor;
  private compressionEnabled: boolean;
  
  // Batch processing
  private pendingUpdates: PlayerStateUpdate[] = [];
  private batchEnabled: boolean;
  private readonly MAX_BATCH_SIZE = 5;
  private lastBatchSendTime: number = Date.now();

  constructor(apiClient: GameAPIClient, config: GameSyncConfig = {}) {
    this.apiClient = apiClient;
    this.syncInterval = config.syncInterval ?? 500; // 2Hz (reduced from 10Hz to prevent rate limiting)
    this.interpolationDuration = config.interpolationDuration ?? 500;
    this.predictionEnabled = config.predictionEnabled ?? true;
    this.disconnectTimeout = config.disconnectTimeout ?? 10000; // 10 seconds
    this.compressor = new StateCompressor();
    this.compressionEnabled = true; // Enable compression by default
    this.batchEnabled = true; // Enable batch processing by default
  }

  /**
   * Start synchronization for a game session
   */
  startSync(gameId: string, playerId: string): void {
    if (this.isRunning) {
      console.warn('GameSyncManager is already running');
      return;
    }

    this.gameId = gameId;
    this.playerId = playerId;
    this.isRunning = true;
    this.remotePlayers.clear();

    // Start send loop (500ms interval = 2Hz)
    this.sendInterval = window.setInterval(() => {
      void this.sendLoop();
    }, this.syncInterval);

    // Start receive loop (500ms interval = 2Hz)
    this.receiveInterval = window.setInterval(() => {
      void this.receiveLoop();
    }, this.syncInterval);

    console.log(`GameSyncManager started for game ${gameId}, player ${playerId}`);
  }

  /**
   * Stop synchronization
   */
  stopSync(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.sendInterval !== null) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }

    if (this.receiveInterval !== null) {
      clearInterval(this.receiveInterval);
      this.receiveInterval = null;
    }

    this.isRunning = false;
    this.gameId = null;
    this.playerId = null;
    this.remotePlayers.clear();
    this.lastSentState = null;

    console.log('GameSyncManager stopped');
  }

  /**
   * Send local player state to server
   */
  sendPlayerState(state: PlayerStateUpdate): void {
    if (!this.isRunning) {
      return;
    }

    this.lastSentState = state;
    
    // Add to batch if batch processing is enabled
    if (this.batchEnabled) {
      this.pendingUpdates.push(state);
      
      // Limit batch size to prevent memory issues
      if (this.pendingUpdates.length > this.MAX_BATCH_SIZE) {
        this.pendingUpdates.shift(); // Remove oldest update
      }
    }
  }

  /**
   * Register callback for remote player updates
   */
  onRemotePlayerUpdate(callback: (players: RemotePlayer[]) => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Register callback for player disconnection
   */
  onPlayerDisconnect(callback: (playerId: string) => void): void {
    this.disconnectCallbacks.push(callback);
  }

  /**
   * Update interpolation for smooth rendering
   * Should be called every frame
   */
  updateInterpolation(deltaTime: number): void {
    const now = Date.now();
    
    // Check for disconnected players
    this.checkForDisconnectedPlayers(now);
    
    for (const player of this.remotePlayers.values()) {
      // Update interpolation progress
      const timeSinceUpdate = now - player.lastUpdateTime;
      player.interpolationProgress = Math.min(
        timeSinceUpdate / this.interpolationDuration,
        1.0
      );

      // Linear interpolation
      player.position = this.lerp(
        player.position,
        player.targetPosition,
        player.interpolationProgress
      );

      player.velocity = this.lerp(
        player.velocity,
        player.targetVelocity,
        player.interpolationProgress
      );

      player.rotation = this.lerpRotation(
        player.rotation,
        player.targetRotation,
        player.interpolationProgress
      );

      // Apply prediction if enabled
      if (this.predictionEnabled && player.interpolationProgress >= 1.0) {
        this.applyPrediction(player, deltaTime);
      }
    }

    // Notify callbacks
    this.notifyCallbacks();
  }

  /**
   * Get all remote players
   */
  getRemotePlayers(): RemotePlayer[] {
    return Array.from(this.remotePlayers.values());
  }

  /**
   * Send loop - sends local player state to server
   */
  private async sendLoop(): Promise<void> {
    if (!this.gameId || !this.playerId || !this.lastSentState) {
      return;
    }

    try {
      // Determine which state to send
      let stateToSend = this.lastSentState;
      
      // Use batch processing if enabled and we have pending updates
      if (this.batchEnabled && this.pendingUpdates.length > 0) {
        // Use the most recent state from the batch
        const batchedState = this.pendingUpdates[this.pendingUpdates.length - 1];
        if (batchedState) {
          stateToSend = batchedState;
        }
        
        // Clear the batch after sending
        this.pendingUpdates = [];
        this.lastBatchSendTime = Date.now();
      }
      
      // Check if state has changed significantly (skip if no changes)
      if (this.compressionEnabled) {
        const fullState: FullPlayerState = {
          position: stateToSend.position,
          velocity: stateToSend.velocity,
          rotation: stateToSend.rotation,
          fuel: stateToSend.fuel,
          isOni: stateToSend.isOni,
          isDashing: stateToSend.isDashing,
          isJetpacking: stateToSend.isJetpacking,
          isOnSurface: stateToSend.isOnSurface,
          wasTagged: stateToSend.wasTagged ?? false,
        };
        
        // Add optional fields only if they exist
        if (stateToSend.beaconCooldown !== undefined) {
          fullState.beaconCooldown = stateToSend.beaconCooldown;
        }
        if (stateToSend.survivedTime !== undefined) {
          fullState.survivedTime = stateToSend.survivedTime;
        }

        const compressed = this.compressor.compress(this.playerId, fullState);
        
        // Skip sending if no significant changes
        if (!compressed) {
          return;
        }
      }

      await this.apiClient.updatePlayerState(
        this.gameId,
        this.playerId,
        stateToSend
      );
      this.consecutiveFailures = 0;
    } catch (error) {
      console.error('Failed to send player state:', error);
      this.consecutiveFailures++;
      
      // If too many consecutive failures, consider disconnected
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        console.warn('Too many consecutive failures, may be disconnected');
      }
    }
  }

  /**
   * Receive loop - fetches game state from server
   */
  private async receiveLoop(): Promise<void> {
    if (!this.gameId || !this.playerId) {
      return;
    }

    try {
      const gameState = await this.apiClient.getGameState(this.gameId);
      this.processGameState(gameState.players);
      this.lastReceiveTime = Date.now();
      this.consecutiveFailures = 0;
    } catch (error) {
      console.error('Failed to receive game state:', error);
      this.consecutiveFailures++;
      
      // If too many consecutive failures, consider disconnected
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        console.warn('Too many consecutive failures, may be disconnected');
      }
    }
  }

  /**
   * Process received game state and update remote players
   */
  private processGameState(players: Player[]): void {
    const now = Date.now();

    for (const player of players) {
      // Skip local player
      if (player.id === this.playerId) {
        continue;
      }

      const existing = this.remotePlayers.get(player.id);

      if (existing) {
        // Update existing player
        existing.targetPosition = { ...player.position };
        existing.targetVelocity = { ...player.velocity };
        existing.targetRotation = { ...player.rotation };
        existing.fuel = player.fuel;
        existing.isOni = player.isOni;
        existing.isDashing = player.isDashing;
        existing.isJetpacking = player.isJetpacking;
        existing.isOnSurface = player.isOnSurface;
        existing.lastUpdateTime = now;
        existing.interpolationProgress = 0;
      } else {
        // Add new remote player
        const remotePlayer: RemotePlayer = {
          ...player,
          targetPosition: { ...player.position },
          targetVelocity: { ...player.velocity },
          targetRotation: { ...player.rotation },
          lastUpdateTime: now,
          interpolationProgress: 0,
        };
        this.remotePlayers.set(player.id, remotePlayer);
      }
    }

    // Remove players that are no longer in the game
    const currentPlayerIds = new Set(players.map((p) => p.id));
    for (const playerId of this.remotePlayers.keys()) {
      if (!currentPlayerIds.has(playerId)) {
        this.remotePlayers.delete(playerId);
      }
    }
  }

  /**
   * Linear interpolation for Vector3
   */
  private lerp(start: Vector3, end: Vector3, t: number): Vector3 {
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      z: start.z + (end.z - start.z) * t,
    };
  }

  /**
   * Linear interpolation for Rotation
   */
  private lerpRotation(start: Rotation, end: Rotation, t: number): Rotation {
    return {
      yaw: start.yaw + (end.yaw - start.yaw) * t,
      pitch: start.pitch + (end.pitch - start.pitch) * t,
    };
  }

  /**
   * Apply velocity-based position prediction
   */
  private applyPrediction(player: RemotePlayer, deltaTime: number): void {
    // Predict position based on velocity
    player.position.x += player.velocity.x * deltaTime;
    player.position.y += player.velocity.y * deltaTime;
    player.position.z += player.velocity.z * deltaTime;
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(): void {
    const players = this.getRemotePlayers();
    for (const callback of this.updateCallbacks) {
      callback(players);
    }
  }

  /**
   * Check for disconnected players based on timeout
   */
  private checkForDisconnectedPlayers(now: number): void {
    const playersToRemove: string[] = [];

    for (const [playerId, player] of this.remotePlayers.entries()) {
      const timeSinceUpdate = now - player.lastUpdateTime;
      
      // If player hasn't updated in disconnectTimeout, consider disconnected
      if (timeSinceUpdate > this.disconnectTimeout) {
        console.warn(`Player ${playerId} (${player.username}) disconnected (timeout: ${timeSinceUpdate}ms)`);
        playersToRemove.push(playerId);
        
        // Notify disconnect callbacks
        for (const callback of this.disconnectCallbacks) {
          callback(playerId);
        }
      }
    }

    // Remove disconnected players
    for (const playerId of playersToRemove) {
      this.remotePlayers.delete(playerId);
    }
  }

  /**
   * Check if local client is connected
   */
  isConnected(): boolean {
    const now = Date.now();
    const timeSinceReceive = now - this.lastReceiveTime;
    return timeSinceReceive < this.disconnectTimeout && this.consecutiveFailures < this.MAX_CONSECUTIVE_FAILURES;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'unstable' | 'disconnected' {
    if (!this.isRunning) {
      return 'disconnected';
    }

    const now = Date.now();
    const timeSinceReceive = now - this.lastReceiveTime;

    if (timeSinceReceive > this.disconnectTimeout || this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      return 'disconnected';
    }

    if (this.consecutiveFailures > 0 || timeSinceReceive > this.disconnectTimeout / 2) {
      return 'unstable';
    }

    return 'connected';
  }

  /**
   * Enable or disable batch processing
   */
  setBatchEnabled(enabled: boolean): void {
    this.batchEnabled = enabled;
    if (!enabled) {
      this.pendingUpdates = [];
    }
  }

  /**
   * Enable or disable compression
   */
  setCompressionEnabled(enabled: boolean): void {
    this.compressionEnabled = enabled;
    if (!enabled) {
      this.compressor.clear();
    }
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): {
    pendingUpdates: number;
    consecutiveFailures: number;
    timeSinceLastReceive: number;
    compressionEnabled: boolean;
    batchEnabled: boolean;
  } {
    return {
      pendingUpdates: this.pendingUpdates.length,
      consecutiveFailures: this.consecutiveFailures,
      timeSinceLastReceive: Date.now() - this.lastReceiveTime,
      compressionEnabled: this.compressionEnabled,
      batchEnabled: this.batchEnabled,
    };
  }
}
