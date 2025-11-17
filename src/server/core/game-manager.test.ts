import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameManager } from './game-manager';
import { GameConfig, GameState, Player } from '../../shared/types/game';

// Mock Redis
vi.mock('@devvit/web/server', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    zAdd: vi.fn(),
    zRem: vi.fn(),
    zRange: vi.fn(),
    sAdd: vi.fn(),
    sRem: vi.fn(),
    sMembers: vi.fn(),
  },
}));

// Get reference to mocked redis after module is mocked
const mockRedis = vi.mocked((await import('@devvit/web/server')).redis);

describe('GameManager', () => {
  let gameManager: GameManager;

  beforeEach(() => {
    gameManager = new GameManager();
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

      const result = await gameManager.createGame(config);

      expect(result).toBeDefined();
      expect(result.gameId).toBeDefined();
      expect(result.gameId).toMatch(/^game_/);
      expect(result.hostPlayerId).toBeDefined();
      expect(result.hostPlayerId).toMatch(/^player_/);
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockRedis.zAdd).toHaveBeenCalled();
    });

    it('should create game with correct initial state', async () => {
      const config: GameConfig = {
        totalPlayers: 4,
        roundDuration: 300,
        rounds: 1,
      };

      let savedGameState: GameState | undefined;
      mockRedis.set.mockImplementation((_key: string, data: string) => {
        savedGameState = JSON.parse(data) as GameState;
        return Promise.resolve('OK');
      });
      mockRedis.zAdd.mockResolvedValue(1);

      await gameManager.createGame(config);

      expect(savedGameState).toBeDefined();
      if (!savedGameState) throw new Error('savedGameState is undefined');
      
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
      if (!result.gameState) throw new Error('gameState is undefined');
      expect(result.gameState.players).toHaveLength(1);
      expect(result.gameState.players[0]?.username).toBe(username);
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
            tagCount: 0,
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

      let savedGameState: GameState | undefined;
      mockRedis.get.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedis.set.mockImplementation((_key: string, data: string) => {
        savedGameState = JSON.parse(data) as GameState;
        return Promise.resolve('OK');
      });

      const result = await gameManager.joinGame('test_game', 'Player2');

      expect(result.success).toBe(true);
      if (!savedGameState) throw new Error('savedGameState is undefined');
      
      expect(savedGameState.players).toHaveLength(2);

      // One player should be oni
      const oniCount = savedGameState.players.filter((p: Player) => p.isOni).length;
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
            tagCount: 2,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            rotation: { yaw: 0, pitch: 0 },
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
            tagCount: 0,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            rotation: { yaw: 0, pitch: 0 },
            fuel: 100,
            isOnSurface: true,
            isDashing: false,
            isJetpacking: false,
            beaconCooldown: 0,
          },
          {
            id: 'p3',
            username: 'Player3',
            isOni: true,
            isAI: true,
            survivedTime: 100,
            wasTagged: true,
            tagCount: 1,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            rotation: { yaw: 0, pitch: 0 },
            fuel: 100,
            isOnSurface: true,
            isDashing: false,
            isJetpacking: false,
            beaconCooldown: 0,
          },
        ],
        initialOniIds: [], // No initial ONI - all were tagged during game
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
      if (!results) throw new Error('results is undefined');
      expect(results.players).toHaveLength(1); // Only Player2 survived (not tagged)
      expect(results.teamWinner).toBe('runners'); // Player2 survived
      expect(results.players[0]?.username).toBe('Player2'); // Top player
      expect(mockRedis.zRem).toHaveBeenCalled();
    });

    it('should return null if game not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const results = await gameManager.endGame('nonexistent');

      expect(results).toBeNull();
    });

    it('should calculate survivedTime based on game duration for runners', async () => {
      const gameStartTime = Date.now() - 120000; // 120 seconds ago
      const mockGameState = {
        gameId: 'test_game',
        hostId: 'host_123',
        status: 'playing' as const,
        config: { totalPlayers: 2, roundDuration: 180, rounds: 1 },
        players: [
          {
            id: 'p1',
            username: 'Runner1',
            isOni: false,
            isAI: false,
            survivedTime: 0, // Should be ignored and calculated from game duration
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
            id: 'p2',
            username: 'Oni1',
            isOni: true,
            isAI: false,
            survivedTime: 0,
            wasTagged: false,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            fuel: 100,
            isOnSurface: true,
            isDashing: false,
            isJetpacking: false,
            beaconCooldown: 0,
          },
        ],
        startTime: gameStartTime,
        endTime: 0,
        currentRound: 1,
        timeRemaining: 0,
        initialOniIds: ['p2'], // Oni1 was initial ONI
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedis.set.mockResolvedValue(undefined);
      mockRedis.zRem.mockResolvedValue(1);

      const results = await gameManager.endGame('test_game');

      expect(results).toBeDefined();
      // Runners Win: Only runners are shown (ONI excluded)
      expect(results?.players).toHaveLength(1);
      
      // Runner should have survivedTime equal to game duration (around 120 seconds)
      const runner = results?.players.find(p => p.username === 'Runner1');
      expect(runner).toBeDefined();
      expect(runner?.survivedTime).toBeGreaterThan(119);
      expect(runner?.survivedTime).toBeLessThan(121);
      
      // ONI should not be in results (filtered out for Runners Win)
      const oni = results?.players.find(p => p.username === 'Oni1');
      expect(oni).toBeUndefined();
    });

    it('should use recorded survivedTime for tagged players', async () => {
      const gameStartTime = Date.now() - 180000; // 180 seconds ago
      const mockGameState = {
        gameId: 'test_game',
        hostId: 'host_123',
        status: 'playing' as const,
        config: { totalPlayers: 3, roundDuration: 180, rounds: 1 },
        players: [
          {
            id: 'p1',
            username: 'TaggedRunner',
            isOni: true,
            isAI: false,
            survivedTime: 60, // Was tagged after 60 seconds
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
            username: 'Survivor',
            isOni: false,
            isAI: false,
            survivedTime: 0, // Should be calculated from game duration
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
            username: 'OriginalOni',
            isOni: true,
            isAI: false,
            survivedTime: 0, // ONI from start
            wasTagged: false,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            fuel: 100,
            isOnSurface: true,
            isDashing: false,
            isJetpacking: false,
            beaconCooldown: 0,
          },
        ],
        startTime: gameStartTime,
        endTime: 0,
        currentRound: 1,
        timeRemaining: 0,
        initialOniIds: ['p3'], // OriginalOni was initial ONI
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedis.set.mockResolvedValue(undefined);
      mockRedis.zRem.mockResolvedValue(1);

      const results = await gameManager.endGame('test_game');

      expect(results).toBeDefined();
      if (!results) throw new Error('results is undefined');
      
      // Runners Win: Only survivors are shown (exclude initial ONI and tagged players)
      expect(results.players).toHaveLength(1);
      
      // Tagged runner should NOT be in results (they became ONI)
      const taggedRunner = results.players.find(p => p.username === 'TaggedRunner');
      expect(taggedRunner).toBeUndefined();
      
      // Survivor should have full game duration and be the only one shown
      const survivor = results.players.find(p => p.username === 'Survivor');
      expect(survivor).toBeDefined();
      expect(survivor?.survivedTime).toBeGreaterThan(179);
      expect(survivor?.survivedTime).toBeLessThan(181);
      
      // Original ONI should not be in results (filtered out for Runners Win)
      const oni = results.players.find(p => p.username === 'OriginalOni');
      expect(oni).toBeUndefined();
      
      // Team winner should be runners (survivor exists)
      expect(results.teamWinner).toBe('runners');
      // Top player should be the survivor (longest survival time)
      expect(results.players[0]?.username).toBe('Survivor');
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
      const game = games[0];
      if (!game) throw new Error('game is undefined');
      expect(game.gameId).toBe('game1');
      expect(game.hostUsername).toBe('Host1');
      expect(game.currentPlayers).toBe(1);
      expect(game.totalPlayers).toBe(6);
      expect(game.status).toBe('lobby');
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
            rotation: { yaw: 0, pitch: 0 },
            fuel: 100,
            survivedTime: 0,
            wasTagged: false,
            tagCount: 0,
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

      let savedGameState: GameState | undefined;
      mockRedis.get.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedis.set.mockImplementation((_key: string, data: string) => {
        savedGameState = JSON.parse(data) as GameState;
        return Promise.resolve('OK');
      });

      await gameManager.addAIPlayers('test_game');

      if (!savedGameState) throw new Error('savedGameState is undefined');
      
      expect(savedGameState.players).toHaveLength(4);
      const aiPlayers = savedGameState.players.filter((p: Player) => p.isAI);
      expect(aiPlayers).toHaveLength(3);

      // Should have assigned oni
      const oniCount = savedGameState.players.filter((p: Player) => p.isOni).length;
      expect(oniCount).toBe(1);

      // Single human player can be either ONI or runner (random assignment)
      const humanPlayer = savedGameState.players.find((p: Player) => !p.isAI);
      expect(humanPlayer).toBeDefined();
      // Human can be either ONI or runner
      expect(typeof humanPlayer?.isOni).toBe('boolean');
    });

    it('should ensure at least 1 human is ONI when 2+ humans (2 humans, 4 AI for 6 total)', async () => {
      const mockGameState = {
        gameId: 'test_game',
        hostId: 'host_123',
        status: 'lobby' as const,
        config: { totalPlayers: 6, roundDuration: 180, rounds: 1 },
        players: [
          {
            id: 'p1',
            username: 'Player1',
            isOni: false, // Human Runner (will be reassigned)
            isAI: false,
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
          },
          {
            id: 'p2',
            username: 'Player2',
            isOni: false, // Human Runner (will be reassigned)
            isAI: false,
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
          },
        ],
        startTime: 0,
        endTime: 0,
        currentRound: 0,
        timeRemaining: 180,
      };

      let savedGameState: GameState | undefined;
      mockRedis.get.mockResolvedValue(JSON.stringify(mockGameState));
      mockRedis.set.mockImplementation((_key: string, data: string) => {
        savedGameState = JSON.parse(data) as GameState;
        return Promise.resolve('OK');
      });

      await gameManager.addAIPlayers('test_game');

      if (!savedGameState) throw new Error('savedGameState is undefined');

      // Should have 6 total players (2 human + 4 AI)
      expect(savedGameState.players).toHaveLength(6);
      
      // Should have 4 AI players
      const aiPlayers = savedGameState.players.filter((p: Player) => p.isAI);
      expect(aiPlayers).toHaveLength(4);

      // Should have 2 human players
      const humanPlayers = savedGameState.players.filter((p: Player) => !p.isAI);
      expect(humanPlayers).toHaveLength(2);

      // Total ONI count should be 2 (6 players / 3 = 2)
      const oniCount = savedGameState.players.filter((p: Player) => p.isOni).length;
      expect(oniCount).toBe(2);

      // At least 1 human should be ONI
      const humanOniCount = savedGameState.players.filter((p: Player) => !p.isAI && p.isOni).length;
      expect(humanOniCount).toBeGreaterThanOrEqual(1);

      // At least 1 human should be Runner
      const humanRunnerCount = savedGameState.players.filter((p: Player) => !p.isAI && !p.isOni).length;
      expect(humanRunnerCount).toBeGreaterThanOrEqual(1);

      // Should have 4 runners total
      const runnerCount = savedGameState.players.filter((p: Player) => !p.isOni).length;
      expect(runnerCount).toBe(4);
    });


  });
});
