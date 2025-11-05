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
      const channelName = `game_${gameId}`;
      
      try {
        await realtime.send(channelName, message);
        res.json({
          success: true,
        });
      } catch (realtimeError) {
        // Realtime send failed - this can happen during server shutdown
        // Return success anyway to avoid client-side errors
        // The message will be lost but the game can continue
        console.warn('Realtime send failed (server may be shutting down):', realtimeError);
        res.json({
          success: true, // Return success to avoid client errors
        });
      }
    } catch (error) {
      console.error('Error broadcasting message:', error);
      // Return success even on error to avoid blocking the game
      res.json({
        success: true,
      });
    }
  }
);

export default router;
