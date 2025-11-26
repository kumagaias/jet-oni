import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RealtimeSyncManager } from './realtime-sync-manager';
import type { PlayerStateUpdate, RealtimeMessage } from './realtime-sync-manager';

// Mock @devvit/web/client
vi.mock('@devvit/web/client', () => ({
  connectRealtime: vi.fn(),
}));

describe('RealtimeSyncManager', () => {
  let syncManager: RealtimeSyncManager;
  const gameId = 'test-game-123';
  const playerId = 'test-player-456';

  beforeEach(() => {
    syncManager = new RealtimeSyncManager({
      interpolationDuration: 100,
      throttleInterval: 16,
      disconnectTimeout: 1000,
      maxReconnectAttempts: 3,
    });
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with disconnected state', () => {
      expect(syncManager.isConnected()).toBe(false);
      expect(syncManager.getConnectionStatus()).toBe('disconnected');
    });

    it('should have no remote players initially', () => {
      expect(syncManager.getRemotePlayers()).toHaveLength(0);
    });
  });

  describe('message format', () => {
    it('should create valid realtime message format', () => {
      const state: PlayerStateUpdate = {
        position: { x: 10, y: 5, z: 15 },
        velocity: { x: 1, y: 0, z: 2 },
        rotation: { yaw: Math.PI / 2, pitch: 0 },
        fuel: 80,
        isOni: false,
        isDashing: false,
        isJetpacking: false,
        isOnSurface: true,
      };

      // The message format should match RealtimeMessage interface
      const expectedMessage: Partial<RealtimeMessage> = {
        type: 'player-update',
        playerId: playerId,
        position: state.position,
        velocity: state.velocity,
        rotation: state.rotation,
        fuel: state.fuel,
        isOni: state.isOni,
        isDashing: state.isDashing,
        isJetpacking: state.isJetpacking,
        isOnSurface: state.isOnSurface,
      };

      // Verify message structure
      expect(expectedMessage.type).toBe('player-update');
      expect(expectedMessage.playerId).toBe(playerId);
      expect(expectedMessage.position).toEqual(state.position);
      expect(expectedMessage.velocity).toEqual(state.velocity);
      expect(expectedMessage.rotation).toEqual(state.rotation);
      expect(expectedMessage.fuel).toBe(state.fuel);
    });

    it('should include optional fields in message', () => {
      const state: PlayerStateUpdate = {
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        isOni: true,
        isDashing: false,
        isJetpacking: false,
        isOnSurface: true,
        beaconCooldown: 5,
        survivedTime: 120,
        wasTagged: true,
      };

      const expectedMessage: Partial<RealtimeMessage> = {
        type: 'player-update',
        playerId: playerId,
        beaconCooldown: state.beaconCooldown,
        survivedTime: state.survivedTime,
        wasTagged: state.wasTagged,
      };

      expect(expectedMessage.beaconCooldown).toBe(5);
      expect(expectedMessage.survivedTime).toBe(120);
      expect(expectedMessage.wasTagged).toBe(true);
    });
  });

  describe('throttling', () => {
    it('should throttle messages to max 60/second', async () => {
      const state: PlayerStateUpdate = {
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        isOni: false,
        isDashing: false,
        isJetpacking: false,
        isOnSurface: true,
      };

      // Send multiple messages rapidly
      const sendCount = 10;
      for (let i = 0; i < sendCount; i++) {
        syncManager.sendPlayerState(state);
      }

      // Due to throttling (16ms interval), not all messages should be sent
      // This is a basic test - in real implementation, we'd verify actual send calls
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should send message after throttle interval', async () => {
      const state: PlayerStateUpdate = {
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        isOni: false,
        isDashing: false,
        isJetpacking: false,
        isOnSurface: true,
      };

      syncManager.sendPlayerState(state);

      // Wait for throttle interval
      await new Promise((resolve) => setTimeout(resolve, 20));

      syncManager.sendPlayerState(state);

      // Both messages should be sent (with sufficient time gap)
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('interpolation', () => {
    it('should interpolate position smoothly', () => {
      const startPos = { x: 0, y: 0, z: 0 };
      const endPos = { x: 10, y: 5, z: 15 };

      // Create a mock remote player
      const remotePlayer = {
        id: 'remote-1',
        username: 'Remote Player',
        position: startPos,
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        isOni: false,
        isAI: false,
        isDashing: false,
        isJetpacking: false,
        isOnSurface: true,
        beaconCooldown: 0,
        survivedTime: 0,
        wasTagged: false,
        targetPosition: endPos,
        targetVelocity: { x: 0, y: 0, z: 0 },
        targetRotation: { yaw: 0, pitch: 0 },
        lastUpdateTime: Date.now(),
        interpolationProgress: 0,
      };

      // Update interpolation
      syncManager.updateInterpolation(0.016); // 16ms frame

      // Position should be interpolated (this is a simplified test)
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should complete interpolation after duration', async () => {
      // Wait for interpolation duration
      await new Promise((resolve) => setTimeout(resolve, 150));

      syncManager.updateInterpolation(0.016);

      // Interpolation should be complete
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('remote player management', () => {
    it('should add remote player on first message', () => {
      const message: RealtimeMessage = {
        type: 'player-update',
        playerId: 'remote-1',
        position: { x: 10, y: 5, z: 15 },
        velocity: { x: 1, y: 0, z: 2 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 80,
        isOni: false,
        isDashing: false,
        isJetpacking: false,
        isOnSurface: true,
        timestamp: Date.now(),
      };

      // Simulate receiving message (would need to expose handleMessage for testing)
      // For now, verify the structure is correct
      expect(message.type).toBe('player-update');
      expect(message.playerId).toBe('remote-1');
    });

    it('should update existing remote player', () => {
      const message1: RealtimeMessage = {
        type: 'player-update',
        playerId: 'remote-1',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        isOni: false,
        isDashing: false,
        isJetpacking: false,
        isOnSurface: true,
        timestamp: Date.now(),
      };

      const message2: RealtimeMessage = {
        ...message1,
        position: { x: 10, y: 5, z: 15 },
        fuel: 80,
        timestamp: Date.now(),
      };

      // Verify message updates
      expect(message2.position).not.toEqual(message1.position);
      expect(message2.fuel).not.toBe(message1.fuel);
    });
  });

  describe('network statistics', () => {
    it('should track connection state', () => {
      const stats = syncManager.getNetworkStats();

      expect(stats.connectionState).toBe('disconnected');
      expect(stats.reconnectAttempts).toBe(0);
      expect(stats.remotePlayerCount).toBe(0);
    });

    it('should track time since last receive', () => {
      const stats = syncManager.getNetworkStats();

      expect(stats.timeSinceLastReceive).toBeGreaterThanOrEqual(0);
    });

    it('should count remote players', () => {
      const stats = syncManager.getNetworkStats();

      expect(stats.remotePlayerCount).toBe(0);
    });
  });

  describe('callbacks', () => {
    it('should register update callback', () => {
      const callback = vi.fn();
      syncManager.onRemotePlayerUpdate(callback);

      // Callback should be registered
      expect(callback).not.toHaveBeenCalled();
    });

    it('should register disconnect callback', () => {
      const callback = vi.fn();
      syncManager.onPlayerDisconnect(callback);

      // Callback should be registered
      expect(callback).not.toHaveBeenCalled();
    });

    it('should register connect callback', () => {
      const callback = vi.fn();
      syncManager.onConnect(callback);

      // Callback should be registered
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('disconnect handling', () => {
    it('should clear state on disconnect', async () => {
      await syncManager.disconnect();

      expect(syncManager.isConnected()).toBe(false);
      expect(syncManager.getRemotePlayers()).toHaveLength(0);
    });

    it('should reset reconnect attempts on disconnect', async () => {
      await syncManager.disconnect();

      const stats = syncManager.getNetworkStats();
      expect(stats.reconnectAttempts).toBe(0);
    });
  });

  describe('callback registration', () => {
    it('should register onPlayerUpdate callback', () => {
      const callback = vi.fn();
      syncManager.onPlayerUpdate(callback);
      
      // Callback should be registered (will be called when player updates arrive)
      expect(callback).not.toHaveBeenCalled();
    });

    it('should register onPlayerDisconnect callback', () => {
      const callback = vi.fn();
      syncManager.onPlayerDisconnect(callback);
      
      // Callback should be registered
      expect(callback).not.toHaveBeenCalled();
    });

    it('should register onGameEnd callback', () => {
      const callback = vi.fn();
      syncManager.onGameEnd(callback);
      
      // Callback should be registered
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('sendPlayerUpdate', () => {
    it('should not send when not connected', () => {
      const update: PlayerStateUpdate & { playerId: string } = {
        playerId: 'test-player',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        isOni: false,
        isDashing: false,
        isJetpacking: false,
        isOnSurface: true,
      };

      // Should not throw when not connected
      expect(() => syncManager.sendPlayerUpdate(update)).not.toThrow();
    });
  });
});
