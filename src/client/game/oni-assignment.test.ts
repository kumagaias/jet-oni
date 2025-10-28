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
      expect(() => OniAssignment.calculateOniCount(4)).toThrow();
      expect(() => OniAssignment.calculateOniCount(5)).toThrow();
    });

    it('should return minimum 2 oni for 6 players', () => {
      expect(OniAssignment.calculateOniCount(6)).toBe(2);
    });

    it('should return 2 oni for 8 players', () => {
      expect(OniAssignment.calculateOniCount(8)).toBe(2);
    });

    it('should return 3 oni for 12 players', () => {
      expect(OniAssignment.calculateOniCount(12)).toBe(3);
    });

    it('should return 4 oni for 16 players', () => {
      expect(OniAssignment.calculateOniCount(16)).toBe(4);
    });

    it('should return 5 oni for 20 players', () => {
      expect(OniAssignment.calculateOniCount(20)).toBe(5);
    });

    it('should ensure at least 2 runners remain', () => {
      // Even with many players, should leave at least 2 runners
      const totalPlayers = 100;
      const oniCount = OniAssignment.calculateOniCount(totalPlayers);
      expect(totalPlayers - oniCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('assignRandomOni', () => {
    it('should throw error for less than minimum players', () => {
      const players = createPlayers(4);
      expect(() => OniAssignment.assignRandomOni(players)).toThrow();
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
      expect(oniCount).toBe(2);
    });

    it('should assign correct number of oni for 15 players', () => {
      const players = createPlayers(15);
      OniAssignment.assignRandomOni(players);
      
      const oniCount = players.filter(p => p.isOni).length;
      expect(oniCount).toBe(3);
    });

    it('should mark remaining players as runners', () => {
      const players = createPlayers(8);
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
    it('should return false for less than minimum oni', () => {
      const players = createPlayers(6);
      players[0]!.isOni = true; // Only 1 oni
      
      expect(OniAssignment.validateOniAssignment(players)).toBe(false);
    });

    it('should return false for less than 2 runners', () => {
      const players = createPlayers(6);
      players[0]!.isOni = true;
      players[1]!.isOni = true;
      players[2]!.isOni = true;
      players[3]!.isOni = true;
      players[4]!.isOni = true; // Only 1 runner
      
      expect(OniAssignment.validateOniAssignment(players)).toBe(false);
    });

    it('should return false for less than minimum total players', () => {
      const players = createPlayers(4);
      players[0]!.isOni = true;
      players[1]!.isOni = true;
      
      expect(OniAssignment.validateOniAssignment(players)).toBe(false);
    });

    it('should return true for valid assignment', () => {
      const players = createPlayers(6);
      players[0]!.isOni = true;
      players[1]!.isOni = true;
      
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
      expect(OniAssignment.getRecommendedOniCount(4)).toBe(MIN_ONI_COUNT);
    });

    it('should return correct count for valid player counts', () => {
      expect(OniAssignment.getRecommendedOniCount(6)).toBe(2);
      expect(OniAssignment.getRecommendedOniCount(10)).toBe(2);
      expect(OniAssignment.getRecommendedOniCount(15)).toBe(3);
      expect(OniAssignment.getRecommendedOniCount(20)).toBe(5);
    });
  });

  describe('Integration test', () => {
    it('should create valid oni assignment for various player counts', () => {
      const playerCounts = [6, 8, 10, 15, 20];
      
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
