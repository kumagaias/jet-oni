import { describe, it, expect, beforeEach } from 'vitest';
import { GameResults } from './game-results';
import { Player } from '../../shared/types/game';

describe('GameResults', () => {
  let gameResults: GameResults;
  let players: Player[];

  beforeEach(() => {
    gameResults = new GameResults();
    
    players = [
      {
        id: 'player1',
        username: 'Player 1',
        isOni: false,
        isAI: false,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        survivedTime: 120,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      },
      {
        id: 'player2',
        username: 'Player 2',
        isOni: true,
        isAI: false,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 60,
        wasTagged: true,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      },
      {
        id: 'player3',
        username: 'Player 3',
        isOni: true,
        isAI: true,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 90,
        wasTagged: true,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      },
    ];
  });

  describe('setResults', () => {
    it('should store game results', () => {
      gameResults.setResults(players, 'timeout');
      
      expect(gameResults.getEndReason()).toBe('timeout');
      expect(gameResults.getSortedPlayers()).toHaveLength(3);
    });
  });

  describe('getSortedPlayers', () => {
    it('should sort players by survival time (longest first)', () => {
      gameResults.setResults(players, 'timeout');
      
      const sorted = gameResults.getSortedPlayers();
      expect(sorted[0].id).toBe('player1');
      expect(sorted[1].id).toBe('player3');
      expect(sorted[2].id).toBe('player2');
    });
  });

  describe('getWinner', () => {
    it('should return player with longest survival time', () => {
      gameResults.setResults(players, 'timeout');
      
      const winner = gameResults.getWinner();
      expect(winner?.id).toBe('player1');
      expect(winner?.survivedTime).toBe(120);
    });

    it('should return null when no players', () => {
      gameResults.setResults([], 'timeout');
      
      expect(gameResults.getWinner()).toBeNull();
    });
  });

  describe('getEscapedPlayers', () => {
    it('should return players who never became oni', () => {
      gameResults.setResults(players, 'timeout');
      
      const escaped = gameResults.getEscapedPlayers();
      expect(escaped).toHaveLength(1);
      expect(escaped[0].id).toBe('player1');
    });
  });

  describe('didLocalPlayerWin', () => {
    it('should return true if local player is winner', () => {
      gameResults.setResults(players, 'timeout');
      
      expect(gameResults.didLocalPlayerWin('player1')).toBe(true);
      expect(gameResults.didLocalPlayerWin('player2')).toBe(false);
    });
  });

  describe('didLocalPlayerEscape', () => {
    it('should return true if local player escaped', () => {
      gameResults.setResults(players, 'timeout');
      
      expect(gameResults.didLocalPlayerEscape('player1')).toBe(true);
      expect(gameResults.didLocalPlayerEscape('player2')).toBe(false);
    });
  });

  describe('getLocalPlayerStats', () => {
    it('should return stats for local player', () => {
      gameResults.setResults(players, 'timeout');
      
      const stats = gameResults.getLocalPlayerStats('player1');
      expect(stats).toEqual({
        survived: true,
        survivedTime: 120,
        rank: 1,
      });
    });

    it('should return null for non-existent player', () => {
      gameResults.setResults(players, 'timeout');
      
      expect(gameResults.getLocalPlayerStats('nonexistent')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all results', () => {
      gameResults.setResults(players, 'timeout');
      gameResults.clear();
      
      expect(gameResults.getWinner()).toBeNull();
      expect(gameResults.getEndReason()).toBeNull();
    });
  });
});
