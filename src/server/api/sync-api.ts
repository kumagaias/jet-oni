import { Router, Request, Response } from 'express';
import { redis } from '@devvit/web/server';

const router = Router();

/**
 * POST /api/sync/update
 * Update player state in Redis
 */
router.post(
  '/api/sync/update',
  async (
    req: Request<unknown, { success: boolean; error?: string }>,
    res: Response<{ success: boolean; error?: string }>
  ): Promise<void> => {
    try {
      const { gameId, playerId, state } = req.body as {
        gameId: string;
        playerId: string;
        state: unknown;
      };

      if (!gameId || !playerId || !state) {
        res.status(400).json({
          success: false,
          error: 'gameId, playerId, and state are required',
        });
        return;
      }

      // Store player state in Redis with 10 second TTL
      const key = `game:${gameId}:player:${playerId}`;
      await redis.set(key, JSON.stringify(state), {
        expiration: new Date(Date.now() + 10000), // 10 seconds
      });

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
 * GET /api/sync/players/:gameId
 * Get all player states for a game
 */
router.get(
  '/api/sync/players/:gameId',
  async (
    req: Request<{ gameId: string }, { success: boolean; players?: unknown[]; error?: string }>,
    res: Response<{ success: boolean; players?: unknown[]; error?: string }>
  ): Promise<void> => {
    try {
      const { gameId } = req.params;

      if (!gameId) {
        res.status(400).json({
          success: false,
          error: 'gameId is required',
        });
        return;
      }

      // Get all player keys for this game
      // Note: Redis scan is not available in Devvit, so we'll use a different approach
      // Store player IDs in a set
      const playerSetKey = `game:${gameId}:players`;
      const playerIds = await redis.zRange(playerSetKey, 0, -1);

      const players: unknown[] = [];

      for (const item of playerIds) {
        const playerId = item.member;
        const key = `game:${gameId}:player:${playerId}`;
        const stateJson = await redis.get(key);

        if (stateJson) {
          try {
            const state = JSON.parse(stateJson);
            players.push({
              playerId,
              ...state,
            });
          } catch (parseError) {
            console.error(`Error parsing state for player ${playerId}:`, parseError);
          }
        }
      }

      res.json({
        success: true,
        players,
      });
    } catch (error) {
      console.error('Error getting player states:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get player states',
      });
    }
  }
);

/**
 * POST /api/sync/register
 * Register a player in the game
 */
router.post(
  '/api/sync/register',
  async (
    req: Request<unknown, { success: boolean; error?: string }>,
    res: Response<{ success: boolean; error?: string }>
  ): Promise<void> => {
    try {
      const { gameId, playerId } = req.body as {
        gameId: string;
        playerId: string;
      };

      if (!gameId || !playerId) {
        res.status(400).json({
          success: false,
          error: 'gameId and playerId are required',
        });
        return;
      }

      // Add player to the game's player set
      const playerSetKey = `game:${gameId}:players`;
      await redis.zAdd(playerSetKey, {
        member: playerId,
        score: Date.now(),
      });

      // Set TTL on the player set
      await redis.expire(playerSetKey, 3600); // 1 hour

      res.json({
        success: true,
      });
    } catch (error) {
      console.error('Error registering player:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register player',
      });
    }
  }
);

export default router;
