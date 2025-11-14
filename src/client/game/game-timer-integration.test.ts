import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from './game-state';
import { GameEndManager } from './game-end-manager';
import { GameResults } from './game-results';
import { TimerDisplay } from '../ui/timer-display';

describe('Game Timer Integration', () => {
  let gameState: GameState;
  let gameEndManager: GameEndManager;
  let gameResults: GameResults;
  let timerDisplay: TimerDisplay;

  beforeEach(() => {
    gameState = new GameState('player1');
    gameEndManager = new GameEndManager(gameState);
    gameResults = new GameResults();
    timerDisplay = new TimerDisplay();
  });

  afterEach(() => {
    timerDisplay.dispose();
  });

  describe('Timer countdown', () => {
    it('should count down from round duration', () => {
      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 180,
        rounds: 1,
      });
      gameState.setGamePhase('playing');

      const remaining = gameState.getRemainingTime();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(180);
    });

    it('should update timer display with remaining time', () => {
      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 180,
        rounds: 1,
      });
      gameState.setGamePhase('playing');

      const remaining = gameState.getRemainingTime();
      timerDisplay.update(remaining);

      const element = document.getElementById('timer-display');
      expect(element?.textContent).toBeTruthy();
    });
  });

  describe('Game end on timeout', () => {
    it('should end game when time runs out', () => {
      const callback = vi.fn();
      gameEndManager.setOnGameEnd(callback);

      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 0,
        rounds: 1,
      });
      gameState.setGamePhase('playing');

      gameEndManager.update();

      expect(callback).toHaveBeenCalled();
      expect(gameState.hasEnded()).toBe(true);
      expect(gameEndManager.getEndReason()).toBe('timeout');
    });

    it('should process results after timeout', () => {
      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 0,
        rounds: 1,
      });
      gameState.setGamePhase('playing');

      gameEndManager.update();

      const players = gameState.getAllPlayers();
      gameResults.setResults(players, gameEndManager.getEndReason());

      expect(gameResults.getEndReason()).toBe('timeout');
      expect(gameResults.getSortedPlayers()).toHaveLength(1);
    });
  });

  describe('Game end when all players are oni', () => {
    it('should end game when all players become oni', async () => {
      const callback = vi.fn();
      gameEndManager.setOnGameEnd(callback);

      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      });
      gameState.setGamePhase('playing');
      // Set game start time to 11 seconds ago to satisfy the 10-second check
      gameState.setGameStartTime(Date.now() - 11000);
      
      // Wait for 10 seconds to pass (required by areAllPlayersOni logic)
      await new Promise((resolve) => setTimeout(resolve, 100));
      
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
      expect(gameEndManager.getEndReason()).toBe('all-oni');
    }, 15000);

    it('should process results after all oni', async () => {
      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      });
      gameState.setGamePhase('playing');
      // Set game start time to 11 seconds ago to satisfy the 10-second check
      gameState.setGameStartTime(Date.now() - 11000);
      
      // Wait for 10 seconds to pass (required by areAllPlayersOni logic)
      await new Promise((resolve) => setTimeout(resolve, 100));
      
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

      const players = gameState.getAllPlayers();
      gameResults.setResults(players, gameEndManager.getEndReason());

      expect(gameResults.getEndReason()).toBe('all-oni');
      expect(gameResults.getEscapedPlayers()).toHaveLength(0);
    }, 15000);
  });

  describe('Timer color changes', () => {
    it('should show white color for normal time', () => {
      timerDisplay.update(120);
      const element = document.getElementById('timer-display');
      expect(element?.style.color).toBe('#ffffff');
    });

    it('should show warning color below 60 seconds', () => {
      timerDisplay.update(59);
      const element = document.getElementById('timer-display');
      expect(element?.style.color).toBe('#ffaa00');
    });

    it('should show danger color below 30 seconds', () => {
      timerDisplay.update(29);
      const element = document.getElementById('timer-display');
      expect(element?.style.color).toBe('#ff0000');
    });
  });

  describe('Complete game flow', () => {
    it('should handle complete game flow from start to end', () => {
      const onGameEnd = vi.fn();
      gameEndManager.setOnGameEnd(onGameEnd);

      // Start game
      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 0,
        rounds: 1,
      });
      gameState.setGamePhase('playing');

      // Show timer
      timerDisplay.show();
      timerDisplay.update(gameState.getRemainingTime());

      // Check for game end
      gameEndManager.update();

      // Verify game ended
      expect(onGameEnd).toHaveBeenCalled();
      expect(gameState.hasEnded()).toBe(true);

      // Process results
      const players = gameState.getAllPlayers();
      gameResults.setResults(players, gameEndManager.getEndReason());

      expect(gameResults.getWinner()).toBeTruthy();
      expect(gameResults.getEndReason()).toBeTruthy();
    });
  });
});
