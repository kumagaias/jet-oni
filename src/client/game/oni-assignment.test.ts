import { describe, it, expect } from 'vitest';
import { OniAssignment } from './oni-assignment';
import { Player } from '../../shared/types/game';
import { MIN_ONI_COUNT, MIN_TOTAL_PLAYERS } from '../../shared/constants';

describe('OniAssignment', () => {
  /**
   * Helper function to create test players
   */
  function createPlayers(count: number): Player[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `player${i + 1}`,
      username: `Player ${i + 1}`,
      isOni: false,
      isAI: false,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
      fuel: 100,
      survivedTime: 0,
      wasTagged: false,
      isOnSurface: true,
      isDashing: false,
      isJetpacking: false,
      beaconCooldown: 0,
    }));
  }

  describe('calculateOniCount', () => {
    it('should throw error for less than minimum players', () => {
      expect(() => OniAssignment.calculateOniCount(0)).toThrow();
      expect(() => OniAssignment.calculateOniCount(3)).toThrow();
    });

    it('should return 1 oni for 4-5 players', () => {
      expect(OniAssignment.calculateOniCount(4)).toBe(1);
      expect(OniAssignment.calculateOniCount(5)).toBe(1);
    });

    it('should return 2 oni for 6-8 players', () => {
      expect(OniAssignment.calculateOniCount(6)).toBe(2);
      expect(OniAssignment.calculateOniCount(7)).toBe(2);
      expect(OniAssignment.calculateOniCount(8)).toBe(2);
    });

    it('should return 3 oni for 9-11 players', () => {
      expect(OniAssignment.calculateOniCount(9)).toBe(3);
      expect(OniAssignment.calculateOniCount(10)).toBe(3);
      expect(OniAssignment.calculateOniCount(11)).toBe(3);
    });

    it('should return 4 oni for 12-14 players', () => {
      expect(OniAssignment.calculateOniCount(12)).toBe(4);
      expect(OniAssignment.calculateOniCount(13)).toBe(4);
      expect(OniAssignment.calculateOniCount(14)).toBe(4);
    });

    it('should return 6 oni for 18-20 players', () => {
      expect(OniAssignment.calculateOniCount(18)).toBe(6);
      expect(OniAssignment.calculateOniCount(19)).toBe(6);
      expect(OniAssignment.calculateOniCount(20)).toBe(6);
    });

    it('should ensure at least 1 runner remains', () => {
      // Even with many players, should leave at least 1 runner
      const totalPlayers = 100;
      const oniCount = OniAssignment.calculateOniCount(totalPlayers);
      expect(totalPlayers - oniCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('assignRandomOni', () => {
    it('should throw error for less than minimum players', () => {
      const players = createPlayers(0);
      expect(() => OniAssignment.assignRandomOni(players)).toThrow();
      
      const players3 = createPlayers(3);
      expect(() => OniAssignment.assignRandomOni(players3)).toThrow();
    });

    it('should assign correct number of oni for 4 players', () => {
      const players = createPlayers(4);
      OniAssignment.assignRandomOni(players);
      
      const oniCount = players.filter(p => p.isOni).length;
      expect(oniCount).toBe(1);
    });

    it('should assign correct number of oni for 6 players', () => {
      const players = createPlayers(6);
      OniAssignment.assignRandomOni(players);
      
      const oniCount = players.filter(p => p.isOni).length;
      expect(oniCount).toBe(2);
    });

    it('should assign correct number of oni for 10 players', () => {
      const players = createPlayers(10);
      OniAssignment.assignRandomOni(players);
      
      const oniCount = players.filter(p => p.isOni).length;
      expect(oniCount).toBe(3);
    });

    it('should assign correct number of oni for 15 players', () => {
      const players = createPlayers(15);
      OniAssignment.assignRandomOni(players);
      
      const oniCount = players.filter(p => p.isOni).length;
      expect(oniCount).toBe(5);
    });

    it('should mark remaining players as runners', () => {
      const players = createPlayers(9);
      OniAssignment.assignRandomOni(players);
      
      const runnerCount = players.filter(p => !p.isOni).length;
      expect(runnerCount).toBe(6);
    });

    it('should randomly select different players', () => {
      // Run assignment multiple times and check that different players are selected
      const results = new Set<string>();
      
      for (let i = 0; i < 10; i++) {
        const players = createPlayers(6);
        OniAssignment.assignRandomOni(players);
        
        const oniIds = players
          .filter(p => p.isOni)
          .map(p => p.id)
          .sort()
          .join(',');
        
        results.add(oniIds);
      }
      
      // Should have at least 2 different combinations (very unlikely to be same every time)
      expect(results.size).toBeGreaterThan(1);
    });

    it('should not modify player count', () => {
      const players = createPlayers(10);
      const originalCount = players.length;
      
      OniAssignment.assignRandomOni(players);
      
      expect(players.length).toBe(originalCount);
    });
  });

  describe('validateOniAssignment', () => {
    it('should return false for no oni', () => {
      const players = createPlayers(6);
      // No oni assigned
      
      expect(OniAssignment.validateOniAssignment(players)).toBe(false);
    });

    it('should return false for no runners', () => {
      const players = createPlayers(6);
      players[0]!.isOni = true;
      players[1]!.isOni = true;
      players[2]!.isOni = true;
      players[3]!.isOni = true;
      players[4]!.isOni = true;
      players[5]!.isOni = true; // All oni, no runners
      
      expect(OniAssignment.validateOniAssignment(players)).toBe(false);
    });

    it('should return false for less than minimum total players', () => {
      const players = createPlayers(3);
      players[0]!.isOni = true;
      players[1]!.isOni = false;
      players[2]!.isOni = false;
      
      expect(OniAssignment.validateOniAssignment(players)).toBe(false);
    });

    it('should return true for valid assignment with 4 players', () => {
      const players = createPlayers(4);
      players[0]!.isOni = true;
      players[1]!.isOni = false;
      players[2]!.isOni = false;
      players[3]!.isOni = false;
      
      expect(OniAssignment.validateOniAssignment(players)).toBe(true);
    });

    it('should return true for valid assignment', () => {
      const players = createPlayers(6);
      players[0]!.isOni = true;
      
      expect(OniAssignment.validateOniAssignment(players)).toBe(true);
    });

    it('should return true for valid assignment with more players', () => {
      const players = createPlayers(15);
      players[0]!.isOni = true;
      players[1]!.isOni = true;
      players[2]!.isOni = true;
      
      expect(OniAssignment.validateOniAssignment(players)).toBe(true);
    });
  });

  describe('getRecommendedOniCount', () => {
    it('should return minimum oni count for invalid player count', () => {
      expect(OniAssignment.getRecommendedOniCount(0)).toBe(MIN_ONI_COUNT);
    });

    it('should return correct count for valid player counts', () => {
      expect(OniAssignment.getRecommendedOniCount(4)).toBe(1);
      expect(OniAssignment.getRecommendedOniCount(6)).toBe(2);
      expect(OniAssignment.getRecommendedOniCount(8)).toBe(2);
      expect(OniAssignment.getRecommendedOniCount(10)).toBe(3);
      expect(OniAssignment.getRecommendedOniCount(12)).toBe(4);
      expect(OniAssignment.getRecommendedOniCount(20)).toBe(6);
    });
  });

  describe('Integration test', () => {
    it('should create valid oni assignment for various player counts', () => {
      const playerCounts = [4, 6, 8, 10, 15, 20];
      
      for (const count of playerCounts) {
        const players = createPlayers(count);
        OniAssignment.assignRandomOni(players);
        
        expect(OniAssignment.validateOniAssignment(players)).toBe(true);
        
        const oniCount = players.filter(p => p.isOni).length;
        const runnerCount = players.filter(p => !p.isOni).length;
        
        expect(oniCount).toBeGreaterThanOrEqual(MIN_ONI_COUNT);
        expect(runnerCount).toBeGreaterThanOrEqual(2);
        expect(oniCount + runnerCount).toBe(count);
      }
    });
  });
});
