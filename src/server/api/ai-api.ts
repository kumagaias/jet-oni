import { Router, Request, Response } from 'express';
import { redis } from '@devvit/web/server';
import type { Player } from '../../shared/types/game';

const router = Router();

/**
 * GET /api/ai/players/:gameId
 * Get all AI players for a game
 */
router.get(
  '/api/ai/players/:gameId',
  async (
    req: Request<{ gameId: string }>,
    res: Response<{ players: Player[]; timestamp: number }>
  ): Promise<void> => {
    try {
      const { gameId } = req.params;

      if (!gameId) {
        res.status(400).json({ players: [], timestamp: Date.now() });
        return;
      }

      // Get AI players from Redis
      const aiPlayersKey = `game:${gameId}:ai_players`;
      const aiPlayersData = await redis.get(aiPlayersKey);

      if (!aiPlayersData) {
        res.json({ players: [], timestamp: Date.now() });
        return;
      }

      const data = JSON.parse(aiPlayersData) as { players: Player[]; timestamp: number };
      res.json(data);
    } catch (error) {
      console.error('Error getting AI players:', error);
      res.json({ players: [], timestamp: Date.now() });
    }
  }
);

/**
 * POST /api/ai/update/:gameId
 * Update AI player state (called by host client)
 */
router.post(
  '/api/ai/update/:gameId',
  async (
    req: Request<{ gameId: string }>,
    res: Response<{ success: boolean }>
  ): Promise<void> => {
    try {
      const { gameId } = req.params;
      const { players } = req.body as { players: Player[] };

      if (!gameId || !players) {
        res.status(400).json({ success: false });
        return;
      }

      // Store AI players in Redis with timestamp
      const aiPlayersKey = `game:${gameId}:ai_players`;
      const data = {
        players,
        timestamp: Date.now(),
      };
      
      await redis.set(aiPlayersKey, JSON.stringify(data), {
        expiration: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating AI players:', error);
      res.json({ success: false });
    }
  }
);

export default router;
