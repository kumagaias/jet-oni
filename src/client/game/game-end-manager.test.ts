import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEndManager } from './game-end-manager';
import { GameState } from './game-state';

describe('GameEndManager', () => {
  let gameState: GameState;
  let gameEndManager: GameEndManager;

  beforeEach(() => {
    gameState = new GameState('player1');
    gameEndManager = new GameEndManager(gameState);
  });

  describe('update', () => {
    it('should not end game when in lobby', () => {
      const callback = vi.fn();
      gameEndManager.setOnGameEnd(callback);

      gameState.setGamePhase('lobby');
      gameEndManager.update();

      expect(callback).not.toHaveBeenCalled();
      expect(gameState.hasEnded()).toBe(false);
    });

    it('should end game when time runs out', () => {
      const callback = vi.fn();
      gameEndManager.setOnGameEnd(callback);

      // Set up game with short duration
      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 0, // 0 seconds
        rounds: 1,
      });
      gameState.setGamePhase('playing');

      gameEndManager.update();

      expect(callback).toHaveBeenCalled();
      expect(gameState.hasEnded()).toBe(true);
    });

    it('should end game when all players are oni', () => {
      const callback = vi.fn();
      gameEndManager.setOnGameEnd(callback);

      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      });
      gameState.setGamePhase('playing');
      
      // Add a remote player and make both oni
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: true,
        isAI: false,
        position: { x: 10, y: 0, z: 10 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });
      
      gameState.setLocalPlayerIsOni(true);

      gameEndManager.update();

      expect(callback).toHaveBeenCalled();
      expect(gameState.hasEnded()).toBe(true);
    });

    it('should not end game multiple times', () => {
      const callback = vi.fn();
      gameEndManager.setOnGameEnd(callback);

      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 0,
        rounds: 1,
      });
      gameState.setGamePhase('playing');

      gameEndManager.update();
      gameEndManager.update();
      gameEndManager.update();

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('getEndReason', () => {
    it('should return null when game has not ended', () => {
      expect(gameEndManager.getEndReason()).toBeNull();
    });

    it('should return "timeout" when time runs out', () => {
      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 0,
        rounds: 1,
      });
      gameState.setGamePhase('playing');

      gameEndManager.update();

      expect(gameEndManager.getEndReason()).toBe('timeout');
    });

    it('should return "all-oni" when all players are oni', () => {
      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      });
      gameState.setGamePhase('playing');
      
      // Add a remote player and make both oni
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: true,
        isAI: false,
        position: { x: 10, y: 0, z: 10 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });
      
      gameState.setLocalPlayerIsOni(true);

      gameEndManager.update();

      expect(gameEndManager.getEndReason()).toBe('all-oni');
    });
  });

  describe('reset', () => {
    it('should allow game to end again after reset', () => {
      const callback = vi.fn();
      gameEndManager.setOnGameEnd(callback);

      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 0,
        rounds: 1,
      });
      gameState.setGamePhase('playing');

      gameEndManager.update();
      expect(callback).toHaveBeenCalledTimes(1);

      gameEndManager.reset();
      gameState.setGamePhase('playing');
      gameEndManager.update();

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});
