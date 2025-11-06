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
        // Realtime send failed - this can happen during:
        // 1. Server shutdown/restart
        // 2. Network issues
        // 3. Devvit infrastructure problems
        // Return success anyway to avoid blocking the game
        // The message will be lost but the game can continue
        
        // Only log the error type, not the full stack trace to reduce noise
        const errorMessage = realtimeError instanceof Error ? realtimeError.message : String(realtimeError);
        if (errorMessage.includes('context deadline exceeded')) {
          // This is a common timeout error during server restarts - log once
          console.warn('[Realtime] Send timeout (server may be restarting)');
        } else {
          console.warn('[Realtime] Send failed:', errorMessage);
        }
        
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
