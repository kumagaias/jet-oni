import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatsManager } from './stats-manager';

describe('StatsManager', () => {
  let statsManager: StatsManager;

  beforeEach(() => {
    statsManager = new StatsManager();
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('loadStats', () => {
    it('should return default stats when no data exists', () => {
      const stats = statsManager.loadStats();
      
      expect(stats).toEqual({
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        totalSurvivalTime: 0,
        longestSurvival: 0,
      });
    });

    it('should load existing stats from localStorage', () => {
      const existingStats = {
        gamesPlayed: 5,
        wins: 3,
        losses: 2,
        totalSurvivalTime: 600,
        longestSurvival: 150,
      };
      
      localStorage.setItem('jetoni_player_stats', JSON.stringify(existingStats));
      
      const stats = statsManager.loadStats();
      expect(stats).toEqual(existingStats);
    });
  });

  describe('saveStats', () => {
    it('should save stats to localStorage', () => {
      const stats = {
        gamesPlayed: 10,
        wins: 6,
        losses: 4,
        totalSurvivalTime: 1200,
        longestSurvival: 200,
      };
      
      statsManager.saveStats(stats);
      
      const stored = localStorage.getItem('jetoni_player_stats');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(stats);
    });
  });

  describe('updateStats', () => {
    it('should increment games played', () => {
      statsManager.updateStats(true, 100);
      
      const stats = statsManager.loadStats();
      expect(stats.gamesPlayed).toBe(1);
    });

    it('should increment wins when won is true', () => {
      statsManager.updateStats(true, 100);
      
      const stats = statsManager.loadStats();
      expect(stats.wins).toBe(1);
      expect(stats.losses).toBe(0);
    });

    it('should increment losses when won is false', () => {
      statsManager.updateStats(false, 100);
      
      const stats = statsManager.loadStats();
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(1);
    });

    it('should update total survival time', () => {
      statsManager.updateStats(true, 100);
      statsManager.updateStats(false, 150);
      
      const stats = statsManager.loadStats();
      expect(stats.totalSurvivalTime).toBe(250);
    });

    it('should update longest survival', () => {
      statsManager.updateStats(true, 100);
      statsManager.updateStats(false, 150);
      statsManager.updateStats(true, 120);
      
      const stats = statsManager.loadStats();
      expect(stats.longestSurvival).toBe(150);
    });
  });

  describe('getWinRate', () => {
    it('should return 0 when no games played', () => {
      expect(statsManager.getWinRate()).toBe(0);
    });

    it('should calculate win rate correctly', () => {
      statsManager.updateStats(true, 100);
      statsManager.updateStats(true, 100);
      statsManager.updateStats(false, 100);
      statsManager.updateStats(false, 100);
      
      expect(statsManager.getWinRate()).toBe(50);
    });

    it('should calculate 100% win rate', () => {
      statsManager.updateStats(true, 100);
      statsManager.updateStats(true, 100);
      
      expect(statsManager.getWinRate()).toBe(100);
    });
  });

  describe('resetStats', () => {
    it('should reset all stats to default', () => {
      statsManager.updateStats(true, 100);
      statsManager.updateStats(false, 150);
      
      statsManager.resetStats();
      
      const stats = statsManager.loadStats();
      expect(stats).toEqual({
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        totalSurvivalTime: 0,
        longestSurvival: 0,
      });
    });
  });
});
