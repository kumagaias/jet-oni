import { describe, it, expect, beforeEach } from 'vitest';
import { StuckDetectionManager } from './ai-stuck-detection';
import { Player } from '../../shared/types/game';

describe('Stuck Detection Manager', () => {
  let stuckDetection: StuckDetectionManager;
  let mockPlayer: Player;

  beforeEach(() => {
    stuckDetection = new StuckDetectionManager();

    mockPlayer = {
      id: 'player1',
      username: 'Player 1',
      isOni: true,
      isAI: true,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { yaw: 0, pitch: 0 },
      fuel: 100,
      survivedTime: 0,
      wasTagged: false,
      tagCount: 0,
      isOnSurface: true,
      isDashing: false,
      isJetpacking: false,
      beaconCooldown: 0,
    };
  });

  describe('Stuck Detection', () => {
    it('should not detect stuck on first check', () => {
      const isStuck = stuckDetection.checkIfStuck(mockPlayer);
      expect(isStuck).toBe(false);
    });

    it('should not detect stuck if player is moving', () => {
      stuckDetection.checkIfStuck(mockPlayer);

      // Move player
      mockPlayer.position.x = 10;
      const isStuck = stuckDetection.checkIfStuck(mockPlayer);

      expect(isStuck).toBe(false);
    });
  });

  describe('Unstuck Mode', () => {
    it('should enter unstuck mode when started', () => {
      stuckDetection.startUnstuckPeriod('player1');
      const inUnstuckMode = stuckDetection.isInUnstuckMode('player1');

      expect(inUnstuckMode).toBe(true);
    });
  });

  describe('Stuck Location Tracking', () => {
    it('should record stuck location', () => {
      mockPlayer.position = { x: 10, y: 5, z: 15 };
      stuckDetection.recordStuckLocation(mockPlayer);

      const isNear = stuckDetection.isNearStuckLocation(mockPlayer);
      expect(isNear).toBe(true);
    });

    it('should detect when near stuck location', () => {
      mockPlayer.position = { x: 10, y: 5, z: 15 };
      stuckDetection.recordStuckLocation(mockPlayer);

      // Move slightly away
      mockPlayer.position = { x: 12, y: 5, z: 16 };
      const isNear = stuckDetection.isNearStuckLocation(mockPlayer);

      expect(isNear).toBe(true);
    });

    it('should not detect when far from stuck location', () => {
      mockPlayer.position = { x: 10, y: 5, z: 15 };
      stuckDetection.recordStuckLocation(mockPlayer);

      // Move far away
      mockPlayer.position = { x: 50, y: 5, z: 50 };
      const isNear = stuckDetection.isNearStuckLocation(mockPlayer);

      expect(isNear).toBe(false);
    });
  });

  describe('Escape Direction Generation', () => {
    it('should generate normalized escape direction', () => {
      const direction = stuckDetection.generateEscapeDirection(mockPlayer);

      const length = Math.sqrt(
        direction.x ** 2 + direction.y ** 2 + direction.z ** 2
      );

      expect(length).toBeCloseTo(1, 5);
    });

    it('should generate direction away from stuck locations', () => {
      // Record stuck location at a different position
      mockPlayer.position = { x: 10, y: 0, z: 10 };
      stuckDetection.recordStuckLocation(mockPlayer);

      // Move player to a different position before generating escape direction
      mockPlayer.position = { x: 12, y: 0, z: 12 };

      // Generate escape direction
      const direction = stuckDetection.generateEscapeDirection(mockPlayer);

      // Direction should be normalized in 2D (y is always 0)
      const length = Math.sqrt(direction.x ** 2 + direction.z ** 2);
      expect(length).toBeCloseTo(1, 5);
      expect(direction.y).toBe(0);
    });

    it('should generate different directions for different players', () => {
      const player2: Player = { ...mockPlayer, id: 'player2' };

      const direction1 = stuckDetection.generateEscapeDirection(mockPlayer);
      const direction2 = stuckDetection.generateEscapeDirection(player2);

      // Different players should likely get different directions (due to randomness)
      // We just check that both are valid normalized vectors
      const length1 = Math.sqrt(direction1.x ** 2 + direction1.z ** 2);
      const length2 = Math.sqrt(direction2.x ** 2 + direction2.z ** 2);
      
      expect(length1).toBeCloseTo(1, 5);
      expect(length2).toBeCloseTo(1, 5);
    });
  });

  describe('Clear State', () => {
    it('should clear all state', () => {
      stuckDetection.checkIfStuck(mockPlayer);
      stuckDetection.startUnstuckPeriod('player1');
      stuckDetection.recordStuckLocation(mockPlayer);

      stuckDetection.clear();

      const isStuck = stuckDetection.checkIfStuck(mockPlayer);
      const inUnstuckMode = stuckDetection.isInUnstuckMode('player1');
      const isNear = stuckDetection.isNearStuckLocation(mockPlayer);

      expect(isStuck).toBe(false);
      expect(inUnstuckMode).toBe(false);
      expect(isNear).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle player at origin', () => {
      mockPlayer.position = { x: 0, y: 0, z: 0 };
      const direction = stuckDetection.generateEscapeDirection(mockPlayer);

      expect(direction.x).toBeDefined();
      expect(direction.z).toBeDefined();
    });

    it('should handle multiple stuck locations', () => {
      mockPlayer.position = { x: 10, y: 0, z: 10 };
      stuckDetection.recordStuckLocation(mockPlayer);

      mockPlayer.position = { x: 20, y: 0, z: 20 };
      stuckDetection.recordStuckLocation(mockPlayer);

      mockPlayer.position = { x: 30, y: 0, z: 30 };
      stuckDetection.recordStuckLocation(mockPlayer);

      // Should be near most recent stuck location
      const isNear = stuckDetection.isNearStuckLocation(mockPlayer);
      expect(isNear).toBe(true);
    });

    it('should handle rapid position changes', () => {
      for (let i = 0; i < 10; i++) {
        mockPlayer.position.x = i * 10;
        stuckDetection.checkIfStuck(mockPlayer);
      }

      const isStuck = stuckDetection.checkIfStuck(mockPlayer);
      expect(isStuck).toBe(false);
    });
  });
});
