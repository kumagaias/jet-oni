import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Create mock functions
const mockCreateGame = vi.fn();
const mockJoinGame = vi.fn();
const mockGetGameState = vi.fn();
const mockEndGame = vi.fn();
const mockListGames = vi.fn();

// Mock GameManager
vi.mock('../core/game-manager', () => {
  return {
    GameManager: vi.fn().mockImplementation(() => ({
      createGame: mockCreateGame,
      joinGame: mockJoinGame,
      getGameState: mockGetGameState,
      endGame: mockEndGame,
      listGames: mockListGames,
    })),
  };
});

describe('Game API Endpoints', () => {
  let request: any;
  let app: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Import after mocks are set up
    const express = await import('express');
    const gameApiRouter = await import('./game-api');

    app = express.default();
    app.use(express.default.json());
    app.use(gameApiRouter.default);

    // Import supertest
    const supertestModule = await import('supertest');
    request = supertestModule.default;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/game/create', () => {
    it('should create a new game with valid config', async () => {
      const config = {
        totalPlayers: 6,
        roundDuration: 180,
        rounds: 3,
      };

      mockCreateGame.mockResolvedValue('game_123');

      const response = await request(app).post('/api/game/create').send({ config });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.gameId).toBe('game_123');
    });

    it('should return error if config is missing', async () => {
      const response = await request(app).post('/api/game/create').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Game configuration is required');
    });

    it('should return error if totalPlayers is invalid', async () => {
      const config = {
        totalPlayers: 2, // Too few
        roundDuration: 180,
        rounds: 3,
      };

      const response = await request(app).post('/api/game/create').send({ config });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Total players must be between 4 and 20');
    });

    it('should return error if roundDuration is invalid', async () => {
      const config = {
        totalPlayers: 6,
        roundDuration: 120, // Invalid
        rounds: 3,
      };

      const response = await request(app).post('/api/game/create').send({ config });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Round duration must be 180 or 300 seconds');
    });

    it('should return error if rounds is invalid', async () => {
      const config = {
        totalPlayers: 6,
        roundDuration: 180,
        rounds: 2, // Invalid
      };

      const response = await request(app).post('/api/game/create').send({ config });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Rounds must be 1, 3, or 5');
    });
  });

  describe('POST /api/game/join', () => {
    it('should allow player to join game', async () => {
      const mockGameState = {
        gameId: 'game_123',
        hostId: 'host_123',
        status: 'lobby' as const,
        config: { totalPlayers: 6, roundDuration: 180, rounds: 3 },
        players: [],
        startTime: 0,
        endTime: 0,
        currentRound: 0,
        timeRemaining: 180,
      };

      mockJoinGame.mockResolvedValue({
        success: true,
        playerId: 'player_123',
        gameState: mockGameState,
      });

      const response = await request(app)
        .post('/api/game/join')
        .send({ gameId: 'game_123', username: 'TestPlayer' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.playerId).toBe('player_123');
      expect(response.body.gameState).toBeDefined();
    });

    it('should return error if gameId is missing', async () => {
      const response = await request(app).post('/api/game/join').send({ username: 'TestPlayer' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Game ID and username are required');
    });

    it('should return error if username is missing', async () => {
      const response = await request(app).post('/api/game/join').send({ gameId: 'game_123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Game ID and username are required');
    });

    it('should return error if game is full', async () => {
      mockJoinGame.mockResolvedValue({
        success: false,
        error: 'Game is full',
      });

      const response = await request(app)
        .post('/api/game/join')
        .send({ gameId: 'game_123', username: 'TestPlayer' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Game is full');
    });
  });

  describe('GET /api/game/:id', () => {
    it('should return game state', async () => {
      const mockGameState = {
        gameId: 'game_123',
        hostId: 'host_123',
        status: 'lobby' as const,
        config: { totalPlayers: 6, roundDuration: 180, rounds: 3 },
        players: [],
        startTime: 0,
        endTime: 0,
        currentRound: 0,
        timeRemaining: 180,
      };

      mockGetGameState.mockResolvedValue(mockGameState);

      const response = await request(app).get('/api/game/game_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.gameState).toEqual(mockGameState);
    });

    it('should return 404 if game not found', async () => {
      mockGetGameState.mockResolvedValue(null);

      const response = await request(app).get('/api/game/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Game not found');
    });
  });

  describe('POST /api/game/:id/end', () => {
    it('should end game and return results', async () => {
      const mockResults = {
        players: [
          {
            id: 'p1',
            username: 'Player1',
            survivedTime: 150,
            wasTagged: false,
            isAI: false,
          },
          {
            id: 'p2',
            username: 'Player2',
            survivedTime: 100,
            wasTagged: true,
            isAI: false,
          },
        ],
        winner: {
          id: 'p1',
          username: 'Player1',
          survivedTime: 150,
          wasTagged: false,
          isAI: false,
        },
      };

      mockEndGame.mockResolvedValue(mockResults);

      const response = await request(app).post('/api/game/game_123/end');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toEqual(mockResults);
    });

    it('should return 404 if game not found', async () => {
      mockEndGame.mockResolvedValue(null);

      const response = await request(app).post('/api/game/nonexistent/end');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Game not found');
    });
  });

  describe('GET /api/games', () => {
    it('should return list of active games', async () => {
      const mockGames = [
        {
          gameId: 'game1',
          hostUsername: 'Host1',
          currentPlayers: 2,
          totalPlayers: 6,
          roundDuration: 180,
          rounds: 3,
          status: 'lobby' as const,
        },
        {
          gameId: 'game2',
          hostUsername: 'Host2',
          currentPlayers: 4,
          totalPlayers: 4,
          roundDuration: 300,
          rounds: 1,
          status: 'playing' as const,
        },
      ];

      mockListGames.mockResolvedValue(mockGames);

      const response = await request(app).get('/api/games');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.games).toEqual(mockGames);
    });

    it('should return empty array if no games', async () => {
      mockListGames.mockResolvedValue([]);

      const response = await request(app).get('/api/games');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.games).toEqual([]);
    });
  });
});
