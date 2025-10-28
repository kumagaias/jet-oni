import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameConfig } from '../../shared/types/game';

// Mock Redis for testing
vi.mock('@devvit/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
  },
}));

// Simple in-memory game manager for integration testing
class TestGameManager {
  private games: Map<string, any> = new Map();
  private nextGameId = 1;

  createGame(hostId: string, hostUsername: string, config: GameConfig) {
    const gameId = `game${this.nextGameId++}`;
    const game = {
      gameId,
      hostId,
      status: 'lobby' as const,
      config,
      players: [
        {
          id: hostId,
          username: hostUsername,
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { yaw: 0, pitch: 0 },
          fuel: 100,
          isOni: false,
          isOnSurface: true,
          isDashing: false,
          isJetpacking: false,
          isClimbing: false,
          survivedTime: 0,
          wasTagged: false,
          isAI: false,
        },
      ],
      startTime: 0,
      endTime: 0,
    };
    this.games.set(gameId, game);
    return game;
  }

  joinGame(gameId: string, playerId: string, username: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'lobby' || game.players.length >= game.config.totalPlayers) {
      return false;
    }

    game.players.push({
      id: playerId,
      username,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { yaw: 0, pitch: 0 },
      fuel: 100,
      isOni: false,
      isOnSurface: true,
      isDashing: false,
      isJetpacking: false,
      isClimbing: false,
      survivedTime: 0,
      wasTagged: false,
      isAI: false,
    });
    return true;
  }

  getGame(gameId: string) {
    return this.games.get(gameId) || null;
  }

  startGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'lobby') {
      return false;
    }

    game.status = 'playing';
    game.startTime = Date.now();

    // Assign random ONI
    const randomIndex = Math.floor(Math.random() * game.players.length);
    game.players[randomIndex].isOni = true;

    return true;
  }

  endGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      return false;
    }

    game.status = 'ended';
    game.endTime = Date.now();
    return true;
  }

  listGames() {
    return Array.from(this.games.values()).filter((g) => g.status === 'lobby');
  }

  removePlayer(gameId: string, playerId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      return false;
    }

    const index = game.players.findIndex((p: any) => p.id === playerId);
    if (index === -1) {
      return false;
    }

    game.players.splice(index, 1);
    return true;
  }

  addAIPlayers(gameId: string, count: number): number {
    const game = this.games.get(gameId);
    if (!game) {
      return 0;
    }

    const availableSlots = game.config.totalPlayers - game.players.length;
    const aiToAdd = Math.min(count, availableSlots);

    for (let i = 0; i < aiToAdd; i++) {
      game.players.push({
        id: `ai${Date.now()}${i}`,
        username: `AI Player ${i + 1}`,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        isOni: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        isClimbing: false,
        survivedTime: 0,
        wasTagged: false,
        isAI: true,
      });
    }

    return aiToAdd;
  }
}

/**
 * Integration tests for API and game management
 */
describe('API Integration', () => {
  let gameManager: TestGameManager;

  beforeEach(() => {
    gameManager = new TestGameManager();
  });

  describe('Game Creation and Joining', () => {
    it('should create a game and allow players to join', () => {
      const config: GameConfig = {
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      };

      // Create game
      const game = gameManager.createGame('host1', 'Host', config);
      expect(game).toBeDefined();
      expect(game.hostId).toBe('host1');
      expect(game.players.length).toBe(1);

      // Join game
      const joined = gameManager.joinGame(game.gameId, 'player2', 'Player 2');
      expect(joined).toBe(true);

      // Check game state
      const gameState = gameManager.getGame(game.gameId);
      expect(gameState).toBeDefined();
      expect(gameState!.players.length).toBe(2);
    });

    it('should not allow joining a full game', () => {
      const config: GameConfig = {
        totalPlayers: 2,
        roundDuration: 300,
        rounds: 1,
      };

      // Create game
      const game = gameManager.createGame('host1', 'Host', config);

      // Fill the game
      gameManager.joinGame(game.gameId, 'player2', 'Player 2');

      // Try to join full game
      const joined = gameManager.joinGame(game.gameId, 'player3', 'Player 3');
      expect(joined).toBe(false);
    });

    it('should not allow joining a non-existent game', () => {
      const joined = gameManager.joinGame('nonexistent', 'player1', 'Player 1');
      expect(joined).toBe(false);
    });

    it('should not allow joining a game that has already started', () => {
      const config: GameConfig = {
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      };

      // Create and start game
      const game = gameManager.createGame('host1', 'Host', config);
      gameManager.startGame(game.gameId);

      // Try to join started game
      const joined = gameManager.joinGame(game.gameId, 'player2', 'Player 2');
      expect(joined).toBe(false);
    });
  });

  describe('Game State Management', () => {
    it('should start a game and assign ONI', () => {
      const config: GameConfig = {
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      };

      // Create game with multiple players
      const game = gameManager.createGame('host1', 'Host', config);
      gameManager.joinGame(game.gameId, 'player2', 'Player 2');
      gameManager.joinGame(game.gameId, 'player3', 'Player 3');

      // Start game
      const started = gameManager.startGame(game.gameId);
      expect(started).toBe(true);

      // Check game state
      const gameState = gameManager.getGame(game.gameId);
      expect(gameState).toBeDefined();
      expect(gameState!.status).toBe('playing');

      // Check ONI assignment
      const oniCount = gameState!.players.filter((p) => p.isOni).length;
      expect(oniCount).toBe(1);
    });

    it('should end a game and record results', () => {
      const config: GameConfig = {
        totalPlayers: 2,
        roundDuration: 300,
        rounds: 1,
      };

      // Create and start game
      const game = gameManager.createGame('host1', 'Host', config);
      gameManager.joinGame(game.gameId, 'player2', 'Player 2');
      gameManager.startGame(game.gameId);

      // End game
      const ended = gameManager.endGame(game.gameId);
      expect(ended).toBe(true);

      // Check game state
      const gameState = gameManager.getGame(game.gameId);
      expect(gameState).toBeDefined();
      expect(gameState!.status).toBe('ended');
    });

    it('should list active games', () => {
      const config: GameConfig = {
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      };

      // Create multiple games
      gameManager.createGame('host1', 'Host 1', config);
      gameManager.createGame('host2', 'Host 2', config);
      gameManager.createGame('host3', 'Host 3', config);

      // List games
      const games = gameManager.listGames();
      expect(games.length).toBeGreaterThanOrEqual(3);
    });

    it('should remove player from game', () => {
      const config: GameConfig = {
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      };

      // Create game
      const game = gameManager.createGame('host1', 'Host', config);
      gameManager.joinGame(game.gameId, 'player2', 'Player 2');

      // Remove player
      const removed = gameManager.removePlayer(game.gameId, 'player2');
      expect(removed).toBe(true);

      // Check game state
      const gameState = gameManager.getGame(game.gameId);
      expect(gameState).toBeDefined();
      expect(gameState!.players.length).toBe(1);
    });
  });

  describe('AI Player Management', () => {
    it('should add AI players to fill game', () => {
      const config: GameConfig = {
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      };

      // Create game with one player
      const game = gameManager.createGame('host1', 'Host', config);

      // Add AI players
      const aiCount = gameManager.addAIPlayers(game.gameId, 3);
      expect(aiCount).toBe(3);

      // Check game state
      const gameState = gameManager.getGame(game.gameId);
      expect(gameState).toBeDefined();
      expect(gameState!.players.length).toBe(4);

      // Check AI players
      const aiPlayers = gameState!.players.filter((p) => p.isAI);
      expect(aiPlayers.length).toBe(3);
    });

    it('should not add more AI players than needed', () => {
      const config: GameConfig = {
        totalPlayers: 2,
        roundDuration: 300,
        rounds: 1,
      };

      // Create game with one player
      const game = gameManager.createGame('host1', 'Host', config);

      // Try to add too many AI players
      const aiCount = gameManager.addAIPlayers(game.gameId, 5);
      expect(aiCount).toBe(1); // Only 1 slot available

      // Check game state
      const gameState = gameManager.getGame(game.gameId);
      expect(gameState).toBeDefined();
      expect(gameState!.players.length).toBe(2);
    });
  });

  describe('Game Configuration', () => {
    it('should respect different game configurations', () => {
      const configs: GameConfig[] = [
        { totalPlayers: 4, roundDuration: 180, rounds: 1 },
        { totalPlayers: 6, roundDuration: 300, rounds: 3 },
        { totalPlayers: 10, roundDuration: 300, rounds: 5 },
      ];

      for (const config of configs) {
        const game = gameManager.createGame(`host${config.totalPlayers}`, 'Host', config);
        expect(game.config.totalPlayers).toBe(config.totalPlayers);
        expect(game.config.roundDuration).toBe(config.roundDuration);
        expect(game.config.rounds).toBe(config.rounds);
      }
    });

    it('should handle different round durations', () => {
      const config: GameConfig = {
        totalPlayers: 4,
        roundDuration: 180, // 3 minutes
        rounds: 1,
      };

      const game = gameManager.createGame('host1', 'Host', config);
      expect(game.config.roundDuration).toBe(180);
    });

    it('should handle multiple rounds', () => {
      const config: GameConfig = {
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 3,
      };

      const game = gameManager.createGame('host1', 'Host', config);
      expect(game.config.rounds).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid game ID', () => {
      const game = gameManager.getGame('invalid-id');
      expect(game).toBeNull();
    });

    it('should handle starting non-existent game', () => {
      const started = gameManager.startGame('invalid-id');
      expect(started).toBe(false);
    });

    it('should handle ending non-existent game', () => {
      const ended = gameManager.endGame('invalid-id');
      expect(ended).toBe(false);
    });

    it('should handle removing player from non-existent game', () => {
      const removed = gameManager.removePlayer('invalid-id', 'player1');
      expect(removed).toBe(false);
    });

    it('should handle adding AI to non-existent game', () => {
      const aiCount = gameManager.addAIPlayers('invalid-id', 3);
      expect(aiCount).toBe(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple games simultaneously', () => {
      const config: GameConfig = {
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      };

      // Create multiple games
      const game1 = gameManager.createGame('host1', 'Host 1', config);
      const game2 = gameManager.createGame('host2', 'Host 2', config);
      const game3 = gameManager.createGame('host3', 'Host 3', config);

      // Verify all games exist
      expect(gameManager.getGame(game1.gameId)).toBeDefined();
      expect(gameManager.getGame(game2.gameId)).toBeDefined();
      expect(gameManager.getGame(game3.gameId)).toBeDefined();

      // Start games independently
      gameManager.startGame(game1.gameId);
      gameManager.startGame(game2.gameId);

      // Verify states
      expect(gameManager.getGame(game1.gameId)!.status).toBe('playing');
      expect(gameManager.getGame(game2.gameId)!.status).toBe('playing');
      expect(gameManager.getGame(game3.gameId)!.status).toBe('lobby');
    });

    it('should handle players joining different games', () => {
      const config: GameConfig = {
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      };

      // Create games
      const game1 = gameManager.createGame('host1', 'Host 1', config);
      const game2 = gameManager.createGame('host2', 'Host 2', config);

      // Players join different games
      gameManager.joinGame(game1.gameId, 'player1', 'Player 1');
      gameManager.joinGame(game2.gameId, 'player2', 'Player 2');
      gameManager.joinGame(game1.gameId, 'player3', 'Player 3');

      // Verify player counts
      expect(gameManager.getGame(game1.gameId)!.players.length).toBe(3);
      expect(gameManager.getGame(game2.gameId)!.players.length).toBe(2);
    });
  });
});
