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
}

/**
 * Realtime message format
 */
export interface RealtimeMessage {
  type: 'player-update';
  playerId: string;
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
  timestamp: number;
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

  constructor(config: RealtimeSyncConfig = {}) {
    this.interpolationDuration = config.interpolationDuration ?? 500;
    this.predictionEnabled = config.predictionEnabled ?? true;
    this.disconnectTimeout = config.disconnectTimeout ?? 10000; // 10 seconds
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 3;
    this.throttleInterval = config.throttleInterval ?? 100; // 10 messages/second (reduced from 60)
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
    this.remotePlayers.clear();

    try {
      // Connect to game-specific channel
      const channelName = `game:${gameId}`;
      
      this.connection = await connectRealtime({
        channel: channelName,
        onConnect: (channel) => {
          console.log(`Connected to Realtime channel: ${channel}`);
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
          console.log(`Disconnected from Realtime channel: ${channel}`);
          this.connectionState = 'disconnected';
          this.isRunning = false;
          
          // Attempt reconnection
          this.attemptReconnect();
        },
        onMessage: (data) => {
          // Handle incoming messages
          // Type assertion is safe here as we control the message format
          this.handleMessage(data as unknown as RealtimeMessage);
        },
      });
      
      console.log(`RealtimeSyncManager connecting to ${channelName}`);
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

    console.log('RealtimeSyncManager disconnected');
  }

  /**
   * Send local player state via Realtime (with throttling)
   */
  sendPlayerState(state: PlayerStateUpdate): void {
    if (!this.isRunning || this.connectionState !== 'connected') {
      // Store state for when connection is established
      this.lastSentState = state;
      return;
    }

    // Throttle sending to max 60 messages/second
    const now = Date.now();
    if (now - this.lastSendTime < this.throttleInterval) {
      // Update stored state but don't send yet
      this.lastSentState = state;
      return;
    }

    this.lastSentState = state;
    this.lastSendTime = now;

    // Create Realtime message
    const message: RealtimeMessage = {
      type: 'player-update',
      playerId: this.playerId!,
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

    // Send via server API (Devvit Web requires server-side realtime.send)
    fetch('/api/realtime/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameId: this.gameId,
        message,
      }),
    }).catch((error) => {
      console.error('Failed to broadcast player state:', error);
    });
  }

  /**
   * Handle incoming Realtime message
   */
  private handleMessage(data: RealtimeMessage): void {
    console.log('[Realtime] Received message:', data.type, 'from', data.playerId);
    
    if (data.type !== 'player-update') {
      return;
    }

    // Skip messages from local player
    if (data.playerId === this.playerId) {
      console.log('[Realtime] Skipping own message');
      return;
    }

    const now = Date.now();
    this.lastReceiveTime = now;
    console.log('[Realtime] Processing remote player update:', data.playerId);

    const existing = this.remotePlayers.get(data.playerId);

    if (existing) {
      // Update existing player
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
    } else {
      // Add new remote player
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
        targetPosition: { ...data.position },
        targetVelocity: { ...data.velocity },
        targetRotation: { ...data.rotation },
        lastUpdateTime: now,
        interpolationProgress: 0,
      };
      this.remotePlayers.set(data.playerId, remotePlayer);
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

    console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

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
}
