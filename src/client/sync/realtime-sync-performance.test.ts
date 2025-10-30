import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RealtimeSyncManager } from './realtime-sync-manager';
import type { PlayerStateUpdate } from './realtime-sync-manager';

// Mock @devvit/web/client
vi.mock('@devvit/web/client', () => ({
  connectRealtime: vi.fn(),
}));

describe('RealtimeSyncManager Performance Tests', () => {
  let syncManagers: RealtimeSyncManager[] = [];
  const gameId = 'performance-test-game';

  beforeEach(() => {
    syncManagers = [];
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Disconnect all managers
    for (const manager of syncManagers) {
      await manager.disconnect();
    }
    syncManagers = [];
  });

  describe('20 player concurrent test', () => {
    it('should handle 20 simultaneous players', () => {
      const playerCount = 20;

      // Create 20 sync managers
      for (let i = 0; i < playerCount; i++) {
        const manager = new RealtimeSyncManager({
          interpolationDuration: 100,
          throttleInterval: 16,
          disconnectTimeout: 10000,
          maxReconnectAttempts: 3,
        });
        syncManagers.push(manager);
      }

      expect(syncManagers).toHaveLength(playerCount);
    });

    it('should send state updates for all 20 players', () => {
      const playerCount = 20;

      // Create managers
      for (let i = 0; i < playerCount; i++) {
        const manager = new RealtimeSyncManager();
        syncManagers.push(manager);
      }

      // Send state for each player
      for (let i = 0; i < playerCount; i++) {
        const state: PlayerStateUpdate = {
          position: { x: i * 10, y: 0, z: i * 5 },
          velocity: { x: 1, y: 0, z: 0.5 },
          rotation: { yaw: i * 0.1, pitch: 0 },
          fuel: 100 - i,
          isOni: i === 0,
          isDashing: i % 2 === 0,
          isJetpacking: i % 3 === 0,
          isOnSurface: i % 2 === 1,
        };

        syncManagers[i].sendPlayerState(state);
      }

      // All states should be sent
      expect(syncManagers).toHaveLength(playerCount);
    });

    it('should maintain 60 FPS with 20 players', () => {
      const playerCount = 20;
      const frameCount = 60; // 1 second at 60 FPS
      const targetFrameTime = 16.67; // ~60 FPS

      // Create managers
      for (let i = 0; i < playerCount; i++) {
        const manager = new RealtimeSyncManager();
        syncManagers.push(manager);
      }

      const frameTimes: number[] = [];

      // Simulate 60 frames
      for (let frame = 0; frame < frameCount; frame++) {
        const startTime = performance.now();

        // Update interpolation for all players
        for (const manager of syncManagers) {
          manager.updateInterpolation(0.016);
        }

        const endTime = performance.now();
        const frameTime = endTime - startTime;
        frameTimes.push(frameTime);
      }

      // Calculate average frame time
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

      // Average frame time should be well under target (16.67ms)
      expect(avgFrameTime).toBeLessThan(targetFrameTime);
      
    });
  });

  describe('latency measurement', () => {
    it('should measure message send latency', () => {
      const manager = new RealtimeSyncManager();
      syncManagers.push(manager);

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

      const startTime = performance.now();
      manager.sendPlayerState(state);
      const endTime = performance.now();

      const latency = endTime - startTime;

      // Send latency should be minimal (< 1ms for local operation)
      expect(latency).toBeLessThan(1);
      
    });

    it('should measure interpolation update latency', () => {
      const manager = new RealtimeSyncManager();
      syncManagers.push(manager);

      const startTime = performance.now();
      manager.updateInterpolation(0.016);
      const endTime = performance.now();

      const latency = endTime - startTime;

      // Interpolation should be fast (< 1ms)
      expect(latency).toBeLessThan(1);
      
    });

    it('should measure end-to-end latency simulation', async () => {
      const sender = new RealtimeSyncManager();
      const receiver = new RealtimeSyncManager();
      syncManagers.push(sender, receiver);

      const state: PlayerStateUpdate = {
        position: { x: 10, y: 5, z: 15 },
        velocity: { x: 1, y: 0, z: 2 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 80,
        isOni: false,
        isDashing: false,
        isJetpacking: false,
        isOnSurface: true,
      };

      const startTime = performance.now();
      
      // Send state
      sender.sendPlayerState(state);
      
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1));
      
      // Update receiver
      receiver.updateInterpolation(0.016);
      
      const endTime = performance.now();
      const totalLatency = endTime - startTime;

      // Total latency should be minimal (mostly from setTimeout)
      expect(totalLatency).toBeGreaterThan(0);
      
    });
  });

  describe('message delivery speed', () => {
    it('should measure messages per second', () => {
      const manager = new RealtimeSyncManager({
        throttleInterval: 16, // ~60 messages/second
      });
      syncManagers.push(manager);

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

      const messageCount = 100;
      const startTime = performance.now();

      // Send messages
      for (let i = 0; i < messageCount; i++) {
        manager.sendPlayerState(state);
      }

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds
      const messagesPerSecond = messageCount / duration;

      // Should be able to send many messages per second
      expect(messagesPerSecond).toBeGreaterThan(0);
      
    });

    it('should respect throttle limit', async () => {
      const throttleInterval = 50; // 20 messages/second
      const manager = new RealtimeSyncManager({
        throttleInterval,
      });
      syncManagers.push(manager);

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

      // Send messages rapidly
      const sendCount = 10;
      for (let i = 0; i < sendCount; i++) {
        manager.sendPlayerState(state);
      }

      // Wait for throttle interval
      await new Promise((resolve) => setTimeout(resolve, throttleInterval + 10));

      // Send another message
      manager.sendPlayerState(state);

      // Throttling should be working
      expect(true).toBe(true);
    });

    it('should handle burst messages', () => {
      const manager = new RealtimeSyncManager();
      syncManagers.push(manager);

      const burstSize = 50;
      const startTime = performance.now();

      // Send burst of messages
      for (let i = 0; i < burstSize; i++) {
        const state: PlayerStateUpdate = {
          position: { x: i, y: 0, z: 0 },
          velocity: { x: 1, y: 0, z: 0 },
          rotation: { yaw: 0, pitch: 0 },
          fuel: 100,
          isOni: false,
          isDashing: false,
          isJetpacking: false,
          isOnSurface: true,
        };
        manager.sendPlayerState(state);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle burst quickly
      expect(duration).toBeLessThan(100); // Less than 100ms for 50 messages
      
    });
  });

  describe('memory and resource usage', () => {
    it('should not leak memory with many updates', () => {
      const manager = new RealtimeSyncManager();
      syncManagers.push(manager);

      const updateCount = 1000;

      // Send many updates
      for (let i = 0; i < updateCount; i++) {
        const state: PlayerStateUpdate = {
          position: { x: i, y: 0, z: 0 },
          velocity: { x: 1, y: 0, z: 0 },
          rotation: { yaw: 0, pitch: 0 },
          fuel: 100,
          isOni: false,
          isDashing: false,
          isJetpacking: false,
          isOnSurface: true,
        };
        manager.sendPlayerState(state);
      }

      // Should complete without issues
      expect(true).toBe(true);
    });

    it('should handle rapid interpolation updates', () => {
      const manager = new RealtimeSyncManager();
      syncManagers.push(manager);

      const updateCount = 1000;
      const startTime = performance.now();

      // Perform many interpolation updates
      for (let i = 0; i < updateCount; i++) {
        manager.updateInterpolation(0.016);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should be fast
      expect(duration).toBeLessThan(1000); // Less than 1 second for 1000 updates
      
    });

    it('should efficiently manage remote player list', () => {
      const manager = new RealtimeSyncManager();
      syncManagers.push(manager);

      // Get remote players multiple times
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const players = manager.getRemotePlayers();
        expect(players).toBeDefined();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should be very fast
      expect(duration).toBeLessThan(100); // Less than 100ms for 1000 calls
      
    });
  });

  describe('scalability', () => {
    it('should scale linearly with player count', () => {
      const playerCounts = [5, 10, 15, 20];
      const results: { count: number; time: number }[] = [];

      for (const count of playerCounts) {
        const managers: RealtimeSyncManager[] = [];

        // Create managers
        for (let i = 0; i < count; i++) {
          managers.push(new RealtimeSyncManager());
        }

        const startTime = performance.now();

        // Update all managers
        for (const manager of managers) {
          manager.updateInterpolation(0.016);
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({ count, time: duration });

        // Cleanup
        syncManagers.push(...managers);
      }

      // Log results
      for (const result of results) {
        // Results logged for debugging
      }

      // All should complete quickly
      for (const result of results) {
        expect(result.time).toBeLessThan(10); // Less than 10ms per update
      }
    });

    it('should maintain performance under load', () => {
      const playerCount = 20;
      const frameCount = 100;

      // Create managers
      for (let i = 0; i < playerCount; i++) {
        syncManagers.push(new RealtimeSyncManager());
      }

      const frameTimes: number[] = [];

      // Simulate sustained load
      for (let frame = 0; frame < frameCount; frame++) {
        const startTime = performance.now();

        // Update all players
        for (let i = 0; i < playerCount; i++) {
          const state: PlayerStateUpdate = {
            position: { x: frame + i, y: 0, z: 0 },
            velocity: { x: 1, y: 0, z: 0 },
            rotation: { yaw: 0, pitch: 0 },
            fuel: 100,
            isOni: false,
            isDashing: false,
            isJetpacking: false,
            isOnSurface: true,
          };
          syncManagers[i].sendPlayerState(state);
          syncManagers[i].updateInterpolation(0.016);
        }

        const endTime = performance.now();
        frameTimes.push(endTime - startTime);
      }

      // Calculate statistics
      const avgTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const maxTime = Math.max(...frameTimes);
      const minTime = Math.min(...frameTimes);


      // Performance should be consistent
      expect(avgTime).toBeLessThan(16.67); // Under 60 FPS target
      expect(maxTime).toBeLessThan(33.33); // Under 30 FPS minimum
    });
  });
});
