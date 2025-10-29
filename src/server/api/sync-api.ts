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

      // Store player state in Redis with TTL
      const key = `sync:${gameId}:${playerId}`;
      await redis.set(key, JSON.stringify(state), {
        expiration: new Date(Date.now() + 60 * 1000), // 60 seconds TTL
      });

      res.json({
        success: true,
      });
    } catch (error) {
      console.error('Error updating player state:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update state',
      });
    }
  }
);

/**
 * GET /api/sync/states/:gameId
 * Get all player states for a game
 */
router.get(
  '/api/sync/states/:gameId',
  async (
    req: Request<{ gameId: string }, { success: boolean; states?: Record<string, unknown>; error?: string }>,
    res: Response<{ success: boolean; states?: Record<string, unknown>; error?: string }>
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

      // Get all player states for this game
      // Note: Redis doesn't have a direct way to scan keys with pattern in Devvit
      // We'll need to maintain a list of active players per game
      
      // For now, return empty states
      // TODO: Implement proper player list tracking
      res.json({
        success: true,
        states: {},
      });
    } catch (error) {
      console.error('Error getting player states:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get states',
      });
    }
  }
);

export default router;
