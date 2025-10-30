import { Router, Request, Response } from 'express';
import { realtime } from '@devvit/web/server';

const router = Router();

/**
 * POST /api/realtime/broadcast
 * Broadcast player state to all clients in a game
 */
router.post(
  '/api/realtime/broadcast',
  async (
    req: Request<unknown, { success: boolean; error?: string }>,
    res: Response<{ success: boolean; error?: string }>
  ): Promise<void> => {
    try {
      const { gameId, message } = req.body as { gameId: string; message: unknown };

      if (!gameId) {
        res.status(400).json({
          success: false,
          error: 'Game ID is required',
        });
        return;
      }

      if (!message) {
        res.status(400).json({
          success: false,
          error: 'Message is required',
        });
        return;
      }

      // Send message to game-specific channel
      // Use simple channel name without colon to match client
      const channelName = `game_${gameId}`;
      await realtime.send(channelName, message);

      res.json({
        success: true,
      });
    } catch (error) {
      console.error('Error broadcasting message:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to broadcast message',
      });
    }
  }
);

export default router;
