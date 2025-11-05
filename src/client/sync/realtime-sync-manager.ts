import { connectRealtime } from '@devvit/web/client';
import type { Player, Vector3, Rotation } from '../../shared/types/game.js';

/**
 * Player state update for realtime synchronization
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
  isCloaked?: boolean;
}

/**
 * Realtime message format
 */
export interface RealtimeMessage {
  type: 'player-update' | 'game-start' | 'timer-sync' | 'game-end';
  playerId: string;
  position?: Vector3;
  velocity?: Vector3;
  rotation?: Rotation;
  fuel?: number;
  isOni?: boolean;
  isDashing?: boolean;
  isJetpacking?: boolean;
  isOnSurface?: boolean;
  beaconCooldown?: number;
  survivedTime?: number;
  wasTagged?: boolean;
  isCloaked?: boolean;
  timestamp: number;
  // Game start specific fields
  startTimestamp?: number;
  config?: {
    totalPlayers: number;
    roundDuration: number;
    rounds: number;
  };
  // Timer sync specific fields
  gameStartTime?: number;
  serverTime?: number;
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
 * Configuration for RealtimeSyncManager
 */
export interface RealtimeSyncConfig {
  interpolationDuration?: number; // milliseconds
  predictionEnabled?: boolean;
  disconnectTimeout?: number; // milliseconds
  maxReconnectAttempts?: number;
  throttleInterval?: number; // milliseconds (max 60 messages/second = ~16ms)
}

/**
 * Connection object returned by connectRealtime
 */
interface RealtimeConnection {
  disconnect: () => Promise<void>;
}

/**
 * Manages real-time synchronization using Devvit Realtime
 * Handles sending local player state and receiving remote player states
 */
export class RealtimeSyncManager {
  private gameId: string | null = null;
  private playerId: string | null = null;
  private isRunning = false;
  private connection: RealtimeConnection | null = null;

  private interpolationDuration: number;
  private predictionEnabled: boolean;
  private disconnectTimeout: number;
  private maxReconnectAttempts: number;
  private throttleInterval: number;

  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private updateCallbacks: Array<(players: RemotePlayer[]) => void> = [];
  private disconnectCallbacks: Array<(playerId: string) => void> = [];
  private connectCallbacks: Array<() => void> = [];

  private lastSentState: PlayerStateUpdate | null = null;
  private lastSendTime: number = 0;
  private lastReceiveTime: number = Date.now();

  // Connection state tracking
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private reconnectAttempts: number = 0;
  private reconnectTimeout: number | null = null;
  
  // Error throttling
  private lastErrorLogTime: number = 0;
  private errorLogThrottle: number = 5000; // Log errors at most once per 5 seconds
  private disconnectedPlayers: Set<string> = new Set(); // Track already logged disconnections

  constructor(config: RealtimeSyncConfig = {}) {
    this.interpolationDuration = config.interpolationDuration ?? 500;
    this.predictionEnabled = config.predictionEnabled ?? true;
    this.disconnectTimeout = config.disconnectTimeout ?? 30000; // 30 seconds
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 3;
    this.throttleInterval = config.throttleInterval ?? 100; // 10 messages/second
  }

  /**
   * Connect to Realtime channel for a game session
   */
  async connect(gameId: string, playerId: string): Promise<void> {
    if (this.isRunning) {
      console.warn('RealtimeSyncManager is already running');
      return;
    }

    this.gameId = gameId;
    this.playerId = playerId;
    this.connectionState = 'connecting';
    // Don't clear remotePlayers here - they will be updated when messages arrive
    // this.remotePlayers.clear();

    try {
      // Connect to game-specific channel
      // Use simple channel name without colon to test
      const channelName = `game_${gameId}`;

      const onMessageHandler = (data: unknown) => {
        // Handle incoming messages
        // Type assertion is safe here as we control the message format
        this.handleMessage(data as unknown as RealtimeMessage);
      };

      this.connection = await connectRealtime({
        channel: channelName,
        onConnect: (channel) => {
          this.connectionState = 'connected';
          this.isRunning = true;
          this.reconnectAttempts = 0;
          this.lastReceiveTime = Date.now();

          // Notify connect callbacks
          for (const callback of this.connectCallbacks) {
            callback();
          }

          // Send initial state if available
          if (this.lastSentState) {
            this.sendPlayerState(this.lastSentState);
          }
        },
        onDisconnect: (channel) => {
          this.connectionState = 'disconnected';
          this.isRunning = false;

          // Attempt reconnection
          this.attemptReconnect();
        },
        onMessage: onMessageHandler,
      });


    } catch (error) {
      console.error('Failed to connect to Realtime:', error);
      this.connectionState = 'disconnected';
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from Realtime channel
   */
  async disconnect(): Promise<void> {
    if (!this.isRunning && !this.connection) {
      return;
    }

    // Clear reconnect timeout if any
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Disconnect from Realtime
    if (this.connection) {
      try {
        await this.connection.disconnect();
      } catch (error) {
        console.error('Error disconnecting from Realtime:', error);
      }
      this.connection = null;
    }

    this.isRunning = false;
    this.connectionState = 'disconnected';
    this.gameId = null;
    this.playerId = null;
    this.remotePlayers.clear();
    this.lastSentState = null;
    this.reconnectAttempts = 0;
    this.disconnectedPlayers.clear(); // Clear disconnection tracking

  }

  /**
   * Send game start message (host only)
   */
  sendGameStart(config: { totalPlayers: number; roundDuration: number; rounds: number }): void {
    if (!this.isRunning || this.connectionState !== 'connected') {
      console.warn('[Realtime] Cannot send game-start: not connected');
      return;
    }

    const message: RealtimeMessage = {
      type: 'game-start',
      playerId: this.playerId!,
      timestamp: Date.now(),
      startTimestamp: Date.now(),
      config,
    };

    // Send via server API with retry logic
    this.sendViaServer(message, 'game-start');
  }

  /**
   * Send game end message (host only)
   */
  sendGameEnd(): void {
    if (!this.isRunning || this.connectionState !== 'connected') {
      console.warn('[Realtime] Cannot send game-end: not connected');
      return;
    }

    const message: RealtimeMessage = {
      type: 'game-end',
      playerId: this.playerId!,
      timestamp: Date.now(),
    };

    // Send via server API with retry logic
    this.sendViaServer(message, 'game-end');
  }

  /**
   * Send local player state via Realtime (with throttling)
   */
  sendPlayerState(state: PlayerStateUpdate, playerId?: string): void {
    // Check connection state
    if (!this.isRunning) {
      this.lastSentState = state;
      return;
    }

    if (this.connectionState !== 'connected') {
      this.lastSentState = state;
      return;
    }

    // Throttle sending (only for local player, not AI)
    const now = Date.now();
    if (!playerId) {
      const timeSinceLastSend = now - this.lastSendTime;
      if (timeSinceLastSend < this.throttleInterval) {
        this.lastSentState = state;
        return;
      }
      this.lastSentState = state;
      this.lastSendTime = now;
    }

    // Use provided playerId or default to local player
    const targetPlayerId = playerId || this.playerId!;

    // Create Realtime message
    const message: RealtimeMessage = {
      type: 'player-update',
      playerId: targetPlayerId,
      position: state.position,
      velocity: state.velocity,
      rotation: state.rotation,
      fuel: state.fuel,
      isOni: state.isOni,
      isDashing: state.isDashing,
      isJetpacking: state.isJetpacking,
      isOnSurface: state.isOnSurface,
      timestamp: now,
    };

    // Add optional fields
    if (state.beaconCooldown !== undefined) {
      message.beaconCooldown = state.beaconCooldown;
    }
    if (state.survivedTime !== undefined) {
      message.survivedTime = state.survivedTime;
    }
    if (state.wasTagged !== undefined) {
      message.wasTagged = state.wasTagged;
    }
    if (state.isCloaked !== undefined) {
      message.isCloaked = state.isCloaked;
    }

    // Send via server API (silently fail if server is down)
    this.sendViaServer(message, 'player-update', true);
  }

  /**
   * Handle incoming Realtime message
   */
  private handleMessage(data: RealtimeMessage): void {

    // Handle game-start messages (from host)
    if (data.type === 'game-start') {
      // Dispatch gameStartCountdown event for non-host players
      if (data.playerId !== this.playerId) {
        window.dispatchEvent(
          new CustomEvent('gameStartCountdown', {
            detail: {
              config: data.config,
              gameId: this.gameId,
              startTimestamp: data.startTimestamp,
            },
          })
        );
      }
      return;
    }

    // Handle timer-sync messages (from host)
    if (data.type === 'timer-sync') {
      // Dispatch timerSync event for non-host players
      if (data.playerId !== this.playerId && data.gameStartTime) {
        window.dispatchEvent(
          new CustomEvent('timerSync', {
            detail: {
              gameStartTime: data.gameStartTime,
              serverTime: data.serverTime,
            },
          })
        );
      }
      return;
    }

    // Handle game-end messages (from host)
    if (data.type === 'game-end') {
      // Dispatch gameEnd event for non-host players
      if (data.playerId !== this.playerId) {
        window.dispatchEvent(new Event('gameEnd'));
      }
      return;
    }

    if (data.type !== 'player-update') {
      return;
    }

    // Skip messages from local player
    if (data.playerId === this.playerId) {
      return;
    }

    const now = Date.now();
    this.lastReceiveTime = now;

    const existing = this.remotePlayers.get(data.playerId);

    if (existing) {
      // Update existing player - check for required fields
      if (data.position && data.velocity && data.rotation && 
          data.fuel !== undefined && data.isOni !== undefined &&
          data.isDashing !== undefined && data.isJetpacking !== undefined &&
          data.isOnSurface !== undefined) {
        existing.targetPosition = { ...data.position };
        existing.targetVelocity = { ...data.velocity };
        existing.targetRotation = { ...data.rotation };
        existing.fuel = data.fuel;
        existing.isOni = data.isOni;
        existing.isDashing = data.isDashing;
        existing.isJetpacking = data.isJetpacking;
        existing.isOnSurface = data.isOnSurface;
        existing.lastUpdateTime = now;
        existing.interpolationProgress = 0;

        // Update optional fields
        if (data.beaconCooldown !== undefined) {
          existing.beaconCooldown = data.beaconCooldown;
        }
        if (data.survivedTime !== undefined) {
          existing.survivedTime = data.survivedTime;
        }
        if (data.wasTagged !== undefined) {
          existing.wasTagged = data.wasTagged;
        }
        if (data.isCloaked !== undefined) {
          existing.isCloaked = data.isCloaked;
        }
      }
    } else {
      // Add new remote player - check for required fields
      if (data.position && data.velocity && data.rotation && 
          data.fuel !== undefined && data.isOni !== undefined &&
          data.isDashing !== undefined && data.isJetpacking !== undefined &&
          data.isOnSurface !== undefined) {
        const remotePlayer: RemotePlayer = {
          id: data.playerId,
          username: `Player ${data.playerId.substring(0, 8)}`, // Placeholder username
          position: { ...data.position },
          velocity: { ...data.velocity },
          rotation: { ...data.rotation },
          fuel: data.fuel,
          isOni: data.isOni,
          isAI: false,
          isDashing: data.isDashing,
          isJetpacking: data.isJetpacking,
          isOnSurface: data.isOnSurface,
          beaconCooldown: data.beaconCooldown ?? 0,
          survivedTime: data.survivedTime ?? 0,
          wasTagged: data.wasTagged ?? false,
          isCloaked: data.isCloaked ?? false,
          tagCount: 0,
          targetPosition: { ...data.position },
          targetVelocity: { ...data.velocity },
          targetRotation: { ...data.rotation },
          lastUpdateTime: now,
          interpolationProgress: 0,
        };
        this.remotePlayers.set(data.playerId, remotePlayer);
      }
    }

    // Notify callbacks
    this.notifyCallbacks();
  }

  /**
   * Attempt to reconnect after disconnection
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    if (!this.gameId || !this.playerId) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000); // Exponential backoff, max 10s

    this.reconnectTimeout = window.setTimeout(() => {
      void this.connect(this.gameId!, this.playerId!);
    }, delay);
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
   * Register callback for connection established
   */
  onConnect(callback: () => void): void {
    this.connectCallbacks.push(callback);
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
      player.interpolationProgress = Math.min(timeSinceUpdate / this.interpolationDuration, 1.0);

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
   * Check if connected to Realtime
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.isRunning;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.connectionState;
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
        // Only log once per player to avoid spam
        if (!this.disconnectedPlayers.has(playerId)) {
          console.warn(
            `Player ${playerId} (${player.username}) disconnected (timeout: ${timeSinceUpdate}ms)`
          );
          this.disconnectedPlayers.add(playerId);
        }
        
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
   * Get network statistics
   */
  getNetworkStats(): {
    connectionState: string;
    reconnectAttempts: number;
    timeSinceLastReceive: number;
    remotePlayerCount: number;
  } {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      timeSinceLastReceive: Date.now() - this.lastReceiveTime,
      remotePlayerCount: this.remotePlayers.size,
    };
  }

  /**
   * Send timer sync message (host only)
   */
  sendTimerSync(gameStartTime: number): void {
    if (!this.isRunning || this.connectionState !== 'connected') {
      return;
    }

    const message: RealtimeMessage = {
      type: 'timer-sync',
      playerId: this.playerId!,
      timestamp: Date.now(),
      gameStartTime,
      serverTime: Date.now(),
    };

    // Send via server API (silently fail if server is down)
    this.sendViaServer(message, 'timer-sync', true);
  }

  /**
   * Send message via server API with error handling and optional retry
   */
  private sendViaServer(message: RealtimeMessage, messageType: string, silent: boolean = false): void {
    if (!this.gameId) {
      if (!silent) {
        console.warn(`[Realtime] Cannot send ${messageType}: gameId is not set`);
      }
      return;
    }

    fetch('/api/realtime/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameId: this.gameId,
        message,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          // Only log errors occasionally to avoid spam
          const now = Date.now();
          if (!silent && now - this.lastErrorLogTime > this.errorLogThrottle) {
            console.error(`[Realtime] ${messageType} broadcast failed with status ${response.status}`);
            this.lastErrorLogTime = now;
          }
        }
      })
      .catch((error) => {
        // Only log errors occasionally to avoid spam
        const now = Date.now();
        if (!silent && now - this.lastErrorLogTime > this.errorLogThrottle) {
          console.error(`[Realtime] Failed to broadcast ${messageType}:`, error);
          this.lastErrorLogTime = now;
        }
      });
  }
}
