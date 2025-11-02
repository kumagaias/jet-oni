import { Router, Request, Response } from 'express';
import { reddit } from '@devvit/web/server';
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
      if (!config.totalPlayers || config.totalPlayers < 6 || config.totalPlayers > 20 || config.totalPlayers % 2 !== 0) {
        res.status(400).json({
          success: false,
          error: 'Total players must be between 6 and 20 (even numbers only)',
        });
        return;
      }

      if (!config.roundDuration || config.roundDuration < 180 || config.roundDuration > 420 || (config.roundDuration / 60) % 2 !== 1) {
        res.status(400).json({
          success: false,
          error: 'Round duration must be 3, 5, or 7 minutes (180, 300, or 420 seconds)',
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

      // Try multiple methods to get username
      let username: string | null = null;
      
      // Method 1: Get from HTTP headers (most reliable for Devvit Web apps)
      username = req.headers['devvit-user-name'] as string | undefined ?? null;
      console.log('[Create Game] devvit-user-name header:', username);
      
      // Method 2: getCurrentUsername()
      if (!username) {
        username = await reddit.getCurrentUsername();
        console.log('[Create Game] getCurrentUsername() returned:', username);
      }
      
      // Method 3: If that fails, try getCurrentUser()
      if (!username) {
        try {
          const user = await reddit.getCurrentUser();
          username = user?.username ?? null;
          console.log('[Create Game] getCurrentUser().username returned:', username);
        } catch (userError) {
          console.error('[Create Game] getCurrentUser() failed:', userError);
        }
      }
      
      // If username is null or empty, use temporary username
      // Note: Games with temporary usernames won't appear in game list (filtered by listGames)
      if (!username || username.trim() === '') {
        username = `TempUser${Date.now()}`;
        console.warn('[Create Game] All methods failed, using temporary:', username);
        console.warn('[Create Game] This game will not appear in the public game list');
      } else {
        console.log('[Create Game] Creating game for user:', username);
      }
      
      const result = await gameManager.createGame(config, username);

      res.json({
        success: true,
        gameId: result.gameId,
        playerId: result.hostPlayerId,
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

      if (!result.success || !result.gameState) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to join game',
        });
        return;
      }

      res.json({
        success: true,
        playerId: result.playerId || '',
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
          error: result.error || 'Failed to update player state',
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
          error: result.error || 'Failed to replace player',
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

/**
 * POST /api/game/:id/add-ai
 * Add AI players to fill empty slots in a game
 */
router.post(
  '/api/game/:id/add-ai',
  async (
    req: Request<{ id: string }, { success: boolean; error?: string }>,
    res: Response<{ success: boolean; error?: string }>
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

      await gameManager.addAIPlayers(id);

      res.json({
        success: true,
      });
    } catch (error) {
      console.error('Error adding AI players:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add AI players',
      });
    }
  }
);

/**
 * POST /api/game/:id/heartbeat
 * Update host heartbeat timestamp
 */
router.post(
  '/api/game/:id/heartbeat',
  async (
    req: Request<{ id: string }, { success: boolean; error?: string }>,
    res: Response<{ success: boolean; error?: string }>
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

      const result = await gameManager.updateHostHeartbeat(id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to update heartbeat',
        });
        return;
      }

      res.json({
        success: true,
      });
    } catch (error) {
      console.error('Error updating heartbeat:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update heartbeat',
      });
    }
  }
);

/**
 * DELETE /api/game/:id
 * Delete a game (host only)
 */
router.delete(
  '/api/game/:id',
  async (
    req: Request<{ id: string }, { success: boolean; error?: string }>,
    res: Response<{ success: boolean; error?: string }>
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

      const result = await gameManager.closeGameHostDisconnect(id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to delete game',
        });
        return;
      }

      res.json({
        success: true,
      });
    } catch (error) {
      console.error('Error deleting game:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete game',
      });
    }
  }
);

/**
 * POST /api/game/:gameId/heartbeat
 * Send heartbeat to update host/participant activity timestamp
 */
router.post(
  '/api/game/:gameId/heartbeat',
  async (
    req: Request<{ gameId: string }>,
    res: Response<{ success: boolean; error?: string }>
  ): Promise<void> => {
    try {
      const { gameId } = req.params;

      if (!gameId) {
        res.status(400).json({
          success: false,
          error: 'Game ID is required',
        });
        return;
      }

      // Update heartbeat timestamp
      const result = await gameManager.updateHeartbeat(gameId);

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error || 'Game not found',
        });
        return;
      }

      res.json({
        success: true,
      });
    } catch (error) {
      console.error('Error updating heartbeat:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update heartbeat',
      });
    }
  }
);

/**
 * POST /api/game/:gameId/leave
 * Leave a game (participant only)
 */
router.post(
  '/api/game/:gameId/leave',
  async (
    req: Request<{ gameId: string }, unknown, { playerId: string }>,
    res: Response<{ success: boolean; error?: string }>
  ): Promise<void> => {
    try {
      const { gameId } = req.params;
      const { playerId } = req.body;

      if (!gameId || !playerId) {
        res.status(400).json({
          success: false,
          error: 'Game ID and Player ID are required',
        });
        return;
      }

      // Remove player from game
      const result = await gameManager.removePlayer(gameId, playerId);

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error || 'Failed to leave game',
        });
        return;
      }

      res.json({
        success: true,
      });
    } catch (error) {
      console.error('Error leaving game:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave game',
      });
    }
  }
);

export default router;
