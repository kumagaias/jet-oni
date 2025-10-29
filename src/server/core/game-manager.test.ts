import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameManager } from './game-manager';
import { GameConfig, GameState } from '../../shared/types/game';

// Mock Redis
vi.mock('@devvit/web/server', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    zAdd: vi.fn(),
    zRem: vi.fn(),
    zRange: vi.fn().mockResolvedValue([]),
    sAdd: vi.fn(),
    sRem: vi.fn(),
    sMembers: vi.fn(),
  },
}));

describe('GameManager', () => {
  let gameManager: GameManager;
  let mockRedis: typeof import('@devvit/web/server').redis;

  beforeEach(async () => {
    gameManager = new GameManager();
    const { redis } = await import('@devvit/web/server');
    mockRedis = redis;
    vi.clearAllMocks();
  });

  describe('createGame', () => {
    it('should create a new game with valid config', async () => {
      const config: GameConfig = {
        totalPlayers: 6,
        roundDuration: 180,
        rounds: 3,
      };

      mockRedis.set.mockResolvedValue(undefined);
      mockRedis.zAdd.mockResolvedValue(1);

      const gameId = await gameManager.createGame(config);

      expect(gameId).toBeDefined();
      expect(gameId).toMatch(/^game_/);
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockRedis.zAdd).toHaveBeenCalled();
    });

    it('should create game with correct initial state', async () => {
      const config: GameConfig = {
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      };

      let savedGameState: { players: Array<{ isOni: boolean; isAI?: boolean }> };
      mockRedis.set.mockImplementation((key: string, data: string) => {
        savedGameState = JSON.parse(data) as { players: Array<{ isOni: boolean; isAI?: boolean }> };
        return Promise.resolve(undefined);
      });
      mockRedis.zAdd.mockResolvedValue(1);

      await gameManager.createGame(config);

      expect(savedGameState).toBeDefined();
      expect(savedGameState.status).toBe('lobby');
      expect(savedGameState.config).toEqual(config);
      expect(savedGameState.players).toHaveLength(1); // Host player is automatically added
      expect(savedGameState.players[0]?.username).toBe('Host');
      expect(savedGameState.players[0]?.isAI).toBe(false);
      expect(savedGameState.currentRound).toBe(0);
      expect(savedGameState.timeRemaining).toBe(300);
    });
  });

  describe('joinGame', () => {
    it('should allow player to join existing game', async () => {
      const gameId = 'test_game_123';
      const username = 'TestPlayer';

      const mockGameState = {
        gameId,
        hostId: 'host_123',
        status: 'lobby' as const,
        config: { totalPlayers: 6, roundDuration: 180, rounds: 3 },
        players: [],
        startTime: 0,
        endTime: 0,
        currentRound: 0,
        timeRemaining: 180,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedis.set.mockResolvedValue(undefined);

      const result = await gameManager.joinGame(gameId, username);

      expect(result.success).toBe(true);
      expect(result.playerId).toBeDefined();
      expect(result.gameState).toBeDefined();
      expect(result.gameState?.players).toHaveLength(1);
      expect(result.gameState?.players[0].username).toBe(username);
    });

    it('should return error if game not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await gameManager.joinGame('nonexistent', 'Player');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game not found');
    });

    it('should return error if game is full', async () => {
      const mockGameState = {
        gameId: 'test_game',
        hostId: 'host_123',
        status: 'lobby' as const,
        config: { totalPlayers: 2, roundDuration: 180, rounds: 1 },
        players: [
          { id: 'p1', username: 'Player1', isOni: false, isAI: false },
          { id: 'p2', username: 'Player2', isOni: false, isAI: false },
        ],
        startTime: 0,
        endTime: 0,
        currentRound: 0,
        timeRemaining: 180,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockGameState));

      const result = await gameManager.joinGame('test_game', 'Player3');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game is full');
    });

    it('should return error if game already started', async () => {
      const mockGameState = {
        gameId: 'test_game',
        hostId: 'host_123',
        status: 'playing' as const,
        config: { totalPlayers: 6, roundDuration: 180, rounds: 1 },
        players: [],
        startTime: Date.now(),
        endTime: 0,
        currentRound: 1,
        timeRemaining: 180,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockGameState));

      const result = await gameManager.joinGame('test_game', 'Player');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game has already started');
    });

    it('should assign oni when game becomes full', async () => {
      const mockGameState = {
        gameId: 'test_game',
        hostId: 'host_123',
        status: 'lobby' as const,
        config: { totalPlayers: 2, roundDuration: 180, rounds: 1 },
        players: [
          {
            id: 'p1',
            username: 'Player1',
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
          },
        ],
        startTime: 0,
        endTime: 0,
        currentRound: 0,
        timeRemaining: 180,
      };

      let savedGameState: GameState | null = null;
      mockRedis.get.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedis.set.mockImplementation((key: string, data: string) => {
        savedGameState = JSON.parse(data) as GameState;
        return Promise.resolve(undefined);
      });

      const result = await gameManager.joinGame('test_game', 'Player2');

      expect(result.success).toBe(true);
      expect(savedGameState?.players).toHaveLength(2);

      // One player should be oni
      const oniCount = savedGameState?.players.filter((p) => p.isOni).length;
      expect(oniCount).toBe(1);
    });
  });

  describe('getGameState', () => {
    it('should return game state if exists', async () => {
      const mockGameState = {
        gameId: 'test_game',
        hostId: 'host_123',
        status: 'lobby' as const,
        config: { totalPlayers: 6, roundDuration: 180, rounds: 3 },
        players: [],
        startTime: 0,
        endTime: 0,
        currentRound: 0,
        timeRemaining: 180,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockGameState));

      const gameState = await gameManager.getGameState('test_game');

      expect(gameState).toEqual(mockGameState);
    });

    it('should return null if game not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const gameState = await gameManager.getGameState('nonexistent');

      expect(gameState).toBeNull();
    });
  });

  describe('endGame', () => {
    it('should end game and calculate results', async () => {
      const mockGameState = {
        gameId: 'test_game',
        hostId: 'host_123',
        status: 'playing' as const,
        config: { totalPlayers: 3, roundDuration: 180, rounds: 1 },
        players: [
          {
            id: 'p1',
            username: 'Player1',
            isOni: true,
            isAI: false,
            survivedTime: 50,
            wasTagged: true,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            fuel: 100,
            isOnSurface: true,
            isDashing: false,
            isJetpacking: false,
            beaconCooldown: 0,
          },
          {
            id: 'p2',
            username: 'Player2',
            isOni: false,
            isAI: false,
            survivedTime: 150,
            wasTagged: false,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            fuel: 100,
            isOnSurface: true,
            isDashing: false,
            isJetpacking: false,
            beaconCooldown: 0,
          },
          {
            id: 'p3',
            username: 'Player3',
            isOni: false,
            isAI: true,
            survivedTime: 100,
            wasTagged: true,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            fuel: 100,
            isOnSurface: true,
            isDashing: false,
            isJetpacking: false,
            beaconCooldown: 0,
          },
        ],
        startTime: Date.now() - 180000,
        endTime: 0,
        currentRound: 1,
        timeRemaining: 0,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedis.set.mockResolvedValue(undefined);
      mockRedis.zRem.mockResolvedValue(1);

      const results = await gameManager.endGame('test_game');

      expect(results).toBeDefined();
      expect(results?.players).toHaveLength(3);
      expect(results?.winner).toBeDefined();
      expect(results?.winner?.username).toBe('Player2');
      expect(mockRedis.zRem).toHaveBeenCalled();
    });

    it('should return null if game not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const results = await gameManager.endGame('nonexistent');

      expect(results).toBeNull();
    });
  });

  describe('listGames', () => {
    it('should return list of active games', async () => {
      const gameIds = ['game1', 'game2'];
      const mockGame1 = {
        gameId: 'game1',
        hostId: 'host1',
        status: 'lobby' as const,
        config: { totalPlayers: 6, roundDuration: 180, rounds: 3 },
        players: [{ id: 'host1', username: 'Host1', isOni: false, isAI: false }],
        startTime: 0,
        endTime: 0,
        currentRound: 0,
        timeRemaining: 180,
      };
      const mockGame2 = {
        gameId: 'game2',
        hostId: 'host2',
        status: 'playing' as const,
        config: { totalPlayers: 4, roundDuration: 300, rounds: 1 },
        players: [
          { id: 'host2', username: 'Host2', isOni: true, isAI: false },
          { id: 'p2', username: 'Player2', isOni: false, isAI: false },
        ],
        startTime: Date.now(),
        endTime: 0,
        currentRound: 1,
        timeRemaining: 300,
      };

      mockRedis.zRange.mockResolvedValue(gameIds.map(id => ({ member: id, score: Date.now() })));
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(mockGame1))
        .mockResolvedValueOnce(JSON.stringify(mockGame2));

      const games = await gameManager.listGames();

      // Only lobby games that are not full should be returned
      expect(games).toHaveLength(1);
      expect(games[0].gameId).toBe('game1');
      expect(games[0].hostUsername).toBe('Host1');
      expect(games[0].currentPlayers).toBe(1);
      expect(games[0].totalPlayers).toBe(6);
      expect(games[0].status).toBe('lobby');
    });

    it('should return empty array if no active games', async () => {
      mockRedis.zRange.mockResolvedValue([]);

      const games = await gameManager.listGames();

      expect(games).toEqual([]);
    });
  });

  describe('addAIPlayers', () => {
    it('should add AI players to fill empty slots', async () => {
      const mockGameState = {
        gameId: 'test_game',
        hostId: 'host_123',
        status: 'lobby' as const,
        config: { totalPlayers: 4, roundDuration: 180, rounds: 1 },
        players: [
          {
            id: 'p1',
            username: 'Player1',
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
          },
        ],
        startTime: 0,
        endTime: 0,
        currentRound: 0,
        timeRemaining: 180,
      };

      let savedGameState: GameState | null = null;
      mockRedis.get.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedis.set.mockImplementation((key: string, data: string) => {
        savedGameState = JSON.parse(data) as GameState;
        return Promise.resolve(undefined);
      });

      await gameManager.addAIPlayers('test_game');

      expect(savedGameState?.players).toHaveLength(4);
      const aiPlayers = savedGameState?.players.filter((p) => p.isAI);
      expect(aiPlayers).toHaveLength(3);

      // Should have assigned oni
      const oniCount = savedGameState?.players.filter((p) => p.isOni).length;
      expect(oniCount).toBe(1);
    });
  });
});
