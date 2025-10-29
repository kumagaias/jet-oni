import { Router, Request, Response } from 'express';
import { GameManager } from '../core/game-manager';
import {
  CreateGameRequest,
  CreateGameResponse,
  JoinGameRequest,
  JoinGameResponse,
  GetGameStateResponse,
  UpdatePlayerStateRequest,
  UpdatePlayerStateResponse,
  EndGameResponse,
  GameListResponse,
} from '../../shared/types/api';

const router = Router();
const gameManager = new GameManager();

/**
 * POST /api/game/create
 * Create a new game session
 */
router.post(
  '/api/game/create',
  async (
    req: Request<unknown, CreateGameResponse, CreateGameRequest>,
    res: Response<CreateGameResponse>
  ): Promise<void> => {
    try {
      const { config } = req.body;

      if (!config) {
        res.status(400).json({
          success: false,
          error: 'Game configuration is required',
        });
        return;
      }

      // Validate config
      if (!config.totalPlayers || config.totalPlayers < 4 || config.totalPlayers > 20) {
        res.status(400).json({
          success: false,
          error: 'Total players must be between 4 and 20',
        });
        return;
      }

      if (!config.roundDuration || (config.roundDuration !== 180 && config.roundDuration !== 300)) {
        res.status(400).json({
          success: false,
          error: 'Round duration must be 180 or 300 seconds',
        });
        return;
      }

      if (!config.rounds || ![1, 3, 5].includes(config.rounds)) {
        res.status(400).json({
          success: false,
          error: 'Rounds must be 1, 3, or 5',
        });
        return;
      }

      const gameId = await gameManager.createGame(config);

      res.json({
        success: true,
        gameId,
      });
    } catch (error) {
      console.error('Error creating game:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create game',
      });
    }
  }
);

/**
 * POST /api/game/join
 * Join an existing game session
 */
router.post(
  '/api/game/join',
  async (
    req: Request<unknown, JoinGameResponse, JoinGameRequest>,
    res: Response<JoinGameResponse>
  ): Promise<void> => {
    try {
      const { gameId, username } = req.body;

      if (!gameId || !username) {
        res.status(400).json({
          success: false,
          error: 'Game ID and username are required',
        });
        return;
      }

      const result = await gameManager.joinGame(gameId, username);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        playerId: result.playerId,
        gameState: result.gameState,
      });
    } catch (error) {
      console.error('Error joining game:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join game',
      });
    }
  }
);

/**
 * GET /api/game/:id
 * Get current game state
 */
router.get(
  '/api/game/:id',
  async (
    req: Request<{ id: string }, GetGameStateResponse>,
    res: Response<GetGameStateResponse>
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Game ID is required',
        });
        return;
      }

      const gameState = await gameManager.getGameState(id);

      if (!gameState) {
        res.status(404).json({
          success: false,
          error: 'Game not found',
        });
        return;
      }

      res.json({
        success: true,
        gameState,
      });
    } catch (error) {
      console.error('Error getting game state:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get game state',
      });
    }
  }
);

/**
 * POST /api/game/:id/update
 * Update player state in a game
 */
router.post(
  '/api/game/:id/update',
  async (
    req: Request<{ id: string }, UpdatePlayerStateResponse, UpdatePlayerStateRequest>,
    res: Response<UpdatePlayerStateResponse>
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        playerId,
        position,
        velocity,
        rotation,
        fuel,
        isOni,
        isDashing,
        isJetpacking,
        isOnSurface,
        beaconCooldown,
        survivedTime,
        wasTagged,
      } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Game ID is required',
        });
        return;
      }

      if (!playerId) {
        res.status(400).json({
          success: false,
          error: 'Player ID is required',
        });
        return;
      }

      if (!position || !velocity || !rotation) {
        res.status(400).json({
          success: false,
          error: 'Position, velocity, and rotation are required',
        });
        return;
      }

      const result = await gameManager.updatePlayerState(id, playerId, {
        position,
        velocity,
        rotation,
        fuel,
        isOni,
        isDashing,
        isJetpacking,
        isOnSurface,
        beaconCooldown,
        survivedTime,
        wasTagged,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
      });
    } catch (error) {
      console.error('Error updating player state:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update player state',
      });
    }
  }
);

/**
 * POST /api/game/:id/end
 * End a game session
 */
router.post(
  '/api/game/:id/end',
  async (
    req: Request<{ id: string }, EndGameResponse>,
    res: Response<EndGameResponse>
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Game ID is required',
        });
        return;
      }

      const results = await gameManager.endGame(id);

      if (!results) {
        res.status(404).json({
          success: false,
          error: 'Game not found',
        });
        return;
      }

      res.json({
        success: true,
        results,
      });
    } catch (error) {
      console.error('Error ending game:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end game',
      });
    }
  }
);

/**
 * GET /api/games
 * Get list of available games
 */
router.get(
  '/api/games',
  async (
    _req: Request<unknown, GameListResponse>,
    res: Response<GameListResponse>
  ): Promise<void> => {
    try {
      const games = await gameManager.listGames();

      res.json({
        success: true,
        games,
      });
    } catch (error) {
      console.error('Error listing games:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list games',
      });
    }
  }
);

/**
 * GET /api/game/list
 * Get list of available games (alternative endpoint)
 */
router.get(
  '/api/game/list',
  async (
    _req: Request<unknown, GameListResponse>,
    res: Response<GameListResponse>
  ): Promise<void> => {
    try {
      const games = await gameManager.listGames();

      res.json({
        success: true,
        games,
      });
    } catch (error) {
      console.error('Error listing games:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list games',
      });
    }
  }
);

/**
 * POST /api/game/:id/replace-player
 * Replace a disconnected player with an AI player
 */
router.post(
  '/api/game/:id/replace-player',
  async (
    req: Request<{ id: string }, { success: boolean; error?: string }, { playerId: string }>,
    res: Response<{ success: boolean; error?: string }>
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { playerId } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Game ID is required',
        });
        return;
      }

      if (!playerId) {
        res.status(400).json({
          success: false,
          error: 'Player ID is required',
        });
        return;
      }

      const result = await gameManager.replacePlayerWithAI(id, playerId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
      });
    } catch (error) {
      console.error('Error replacing player with AI:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to replace player',
      });
    }
  }
);

export default router;
