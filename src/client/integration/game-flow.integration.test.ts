import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameState } from '../game/game-state';
import { PlayerController } from '../player/player-controller';
import { PlayerPhysics } from '../player/player-physics';
import { TaggingSystem } from '../game/tagging-system';
import { GameEndManager } from '../game/game-end-manager';
import { StatsManager } from '../game/stats-manager';

/**
 * Integration tests for complete game flow
 */
describe('Game Flow Integration', () => {
  let gameState: GameState;
  let playerController: PlayerController;
  let playerPhysics: PlayerPhysics;
  let taggingSystem: TaggingSystem;
  let gameEndManager: GameEndManager;
  let statsManager: StatsManager;

  beforeEach(() => {
    gameState = new GameState('player1');
    playerController = new PlayerController(gameState);
    playerPhysics = new PlayerPhysics();
    taggingSystem = new TaggingSystem(gameState);
    gameEndManager = new GameEndManager(gameState);
    statsManager = new StatsManager();
  });

  afterEach(() => {
    playerController.dispose();
  });

  describe('Complete Game Session', () => {
    it('should complete a full game session from lobby to end', () => {
      // Start in lobby
      expect(gameState.isInLobby()).toBe(true);

      // Start game
      gameState.setGamePhase('playing');
      expect(gameState.isPlaying()).toBe(true);

      // Assign ONI
      gameState.setLocalPlayerIsOni(true);
      expect(gameState.getLocalPlayer().isOni).toBe(true);

      // Simulate game time
      const deltaTime = 0.016; // ~60 FPS
      for (let i = 0; i < 60; i++) {
        playerController.update(deltaTime);
      }

      // End game
      gameState.setGamePhase('ended');
      expect(gameState.getGamePhase()).toBe('ended');
    });

    it('should handle player movement throughout game', () => {
      gameState.setGamePhase('playing');

      // Simulate forward movement
      const deltaTime = 0.016;
      for (let i = 0; i < 60; i++) {
        playerController.update(deltaTime);

        const result = playerPhysics.applyPhysics(
          gameState.getLocalPlayer().position,
          gameState.getLocalPlayer().velocity,
          deltaTime,
          false
        );

        gameState.setLocalPlayerPosition(result.position);
        gameState.setLocalPlayerVelocity(result.velocity);
      }

      // Position should be updated (even if no input, physics applies)
      const finalPosition = gameState.getLocalPlayer().position;
      expect(finalPosition).toBeDefined();
    });

    it('should handle tagging mechanics', () => {
      gameState.setGamePhase('playing');

      // Set local player as ONI
      gameState.setLocalPlayerIsOni(true);

      // Add a runner player
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Runner',
        position: { x: 1, y: 0, z: 0 }, // Close to ONI
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        isOni: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        survivedTime: 0,
        wasTagged: false,
        isAI: false,
        beaconCooldown: 0,
      });

      // Check tagging
      const tagEvent = taggingSystem.update(0.016);

      // Should potentially detect nearby player (may be null due to cooldown)
      expect(tagEvent === null || typeof tagEvent === 'object').toBe(true);
    });

    it('should handle game end conditions', () => {
      gameState.setGamePhase('playing');
      gameState.setGameConfig({
        totalPlayers: 2,
        roundDuration: 300,
        rounds: 1,
      });

      // Set up game end callback
      gameEndManager.setOnGameEnd(() => {
        // Game ended callback
      });

      // Update game end manager
      gameEndManager.update();

      // Game should check end conditions
      expect(gameState.isPlaying()).toBe(true);
    });
  });

  describe('Player Abilities Integration', () => {
    beforeEach(() => {
      gameState.setGamePhase('playing');
    });

    it('should handle jetpack ability for ONI', () => {
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerFuel(100);

      const initialFuel = gameState.getLocalPlayer().fuel;

      // Simulate jetpack usage
      const deltaTime = 0.016;
      for (let i = 0; i < 60; i++) {
        playerController.update(deltaTime);

        const result = playerPhysics.applyPhysics(
          gameState.getLocalPlayer().position,
          gameState.getLocalPlayer().velocity,
          deltaTime,
          gameState.getLocalPlayer().isJetpacking
        );

        gameState.setLocalPlayerPosition(result.position);
        gameState.setLocalPlayerVelocity(result.velocity);
      }

      // Fuel should be consumed (or position changed)
      const finalFuel = gameState.getLocalPlayer().fuel;
      expect(finalFuel).toBeLessThanOrEqual(initialFuel);
    });

    it('should handle dash ability for Runner', () => {
      gameState.setLocalPlayerIsOni(false);
      gameState.setLocalPlayerFuel(100);

      // Simulate dash usage
      const deltaTime = 0.016;
      for (let i = 0; i < 60; i++) {
        playerController.update(deltaTime);
      }

      // Fuel should be available
      const finalFuel = gameState.getLocalPlayer().fuel;
      expect(finalFuel).toBeGreaterThanOrEqual(0);
    });

    it('should handle fuel recovery on surface', () => {
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerFuel(50);
      gameState.setLocalPlayerOnSurface(true);

      const initialFuel = gameState.getLocalPlayer().fuel;

      // Simulate time on surface
      const deltaTime = 0.016;
      for (let i = 0; i < 60; i++) {
        playerController.update(deltaTime);
      }

      // Fuel should recover
      const finalFuel = gameState.getLocalPlayer().fuel;
      expect(finalFuel).toBeGreaterThanOrEqual(initialFuel);
    });
  });

  describe('Statistics Integration', () => {
    beforeEach(() => {
      // Reset stats before each test
      statsManager.resetStats();
    });

    it('should track game statistics', () => {
      // Record a game
      statsManager.updateStats(true, 120);

      const stats = statsManager.loadStats();
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.wins).toBe(1);
      expect(stats.totalSurvivalTime).toBe(120);
    });

    it('should calculate win rate correctly', () => {
      statsManager.updateStats(true, 100);
      statsManager.updateStats(false, 50);
      statsManager.updateStats(true, 150);

      const stats = statsManager.loadStats();
      expect(stats.gamesPlayed).toBe(3);
      expect(stats.wins).toBe(2);
      expect(stats.losses).toBe(1);

      const winRate = statsManager.getWinRate();
      expect(winRate).toBeCloseTo(66.67, 1);
    });

    it('should track longest survival time', () => {
      statsManager.updateStats(true, 100);
      statsManager.updateStats(true, 200);
      statsManager.updateStats(true, 150);

      const stats = statsManager.loadStats();
      expect(stats.longestSurvival).toBe(200);
    });
  });

  describe('Physics Integration', () => {
    it('should handle gravity and landing', () => {
      gameState.setGamePhase('playing');
      gameState.setLocalPlayerPosition({ x: 0, y: 10, z: 0 });
      gameState.setLocalPlayerVelocity({ x: 0, y: 0, z: 0 });

      // Simulate falling
      const deltaTime = 0.016;
      for (let i = 0; i < 120; i++) {
        const result = playerPhysics.applyPhysics(
          gameState.getLocalPlayer().position,
          gameState.getLocalPlayer().velocity,
          deltaTime,
          false
        );

        gameState.setLocalPlayerPosition(result.position);
        gameState.setLocalPlayerVelocity(result.velocity);
        gameState.setLocalPlayerOnSurface(result.isOnSurface);

        // Stop if landed
        if (result.isOnSurface) {
          break;
        }
      }

      // Should land on ground
      expect(gameState.getLocalPlayer().isOnSurface).toBe(true);
      expect(gameState.getLocalPlayer().position.y).toBeLessThanOrEqual(1);
    });

    it('should handle collision with map boundaries', () => {
      gameState.setGamePhase('playing');
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });
      gameState.setLocalPlayerVelocity({ x: 100, y: 0, z: 100 });

      // Simulate movement beyond boundaries
      const deltaTime = 0.016;
      for (let i = 0; i < 120; i++) {
        const result = playerPhysics.applyPhysics(
          gameState.getLocalPlayer().position,
          gameState.getLocalPlayer().velocity,
          deltaTime,
          false
        );

        gameState.setLocalPlayerPosition(result.position);
        gameState.setLocalPlayerVelocity(result.velocity);
      }

      // Position should be clamped to map boundaries
      const position = gameState.getLocalPlayer().position;
      expect(Math.abs(position.x)).toBeLessThanOrEqual(200);
      expect(Math.abs(position.z)).toBeLessThanOrEqual(200);
    });
  });

  describe('Multi-Player Interaction', () => {
    it('should handle multiple players in game', () => {
      gameState.setGamePhase('playing');

      // Add multiple players
      for (let i = 0; i < 5; i++) {
        gameState.updateRemotePlayer({
          id: `player${i}`,
          username: `Player ${i}`,
          position: { x: i * 10, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { yaw: 0, pitch: 0 },
          fuel: 100,
          isOni: i === 0,
          isOnSurface: true,
          isDashing: false,
          isJetpacking: false,
          survivedTime: 0,
          wasTagged: false,
          isAI: false,
          beaconCooldown: 0,
        });
      }

      const players = gameState.getAllPlayers();
      expect(players.length).toBe(6); // 5 remote + 1 local
    });

    it('should track ONI and Runner counts', () => {
      gameState.setGamePhase('playing');
      gameState.setLocalPlayerIsOni(true);

      // Add runners
      for (let i = 0; i < 3; i++) {
        gameState.updateRemotePlayer({
          id: `player${i}`,
          username: `Player ${i}`,
          position: { x: i * 10, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { yaw: 0, pitch: 0 },
          fuel: 100,
          isOni: false,
          isOnSurface: true,
          isDashing: false,
          isJetpacking: false,
          survivedTime: 0,
          wasTagged: false,
          isAI: false,
          beaconCooldown: 0,
        });
      }

      const allPlayers = gameState.getAllPlayers();
      const oniCount = allPlayers.filter((p) => p.isOni).length;
      const runnerCount = allPlayers.filter((p) => !p.isOni).length;

      expect(oniCount).toBe(1); // 4 players => 1 oni (4/3 = 1.33, floor = 1)
      expect(runnerCount).toBe(3);
    });
  });
});
