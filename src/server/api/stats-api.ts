import express from 'express';
import { redis } from '@devvit/web/server';
import type {
  SaveStatsRequest,
  SaveStatsResponse,
  GetStatsResponse,
} from '../../shared/types/api.js';
import type { PlayerStats } from '../../shared/types/game.js';

const router = express.Router();

/**
 * Save player statistics
 * POST /api/stats
 */
router.post('/api/stats', async (req, res): Promise<void> => {
  try {
    const { userId, won, survivalTime } = req.body as SaveStatsRequest;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required',
      } as SaveStatsResponse);
      return;
    }

    // Get existing stats or create new ones
    const statsKey = `stats:${userId}`;
    const existingStatsJson = await redis.get(statsKey);
    
    let stats: PlayerStats;
    
    if (existingStatsJson) {
      stats = JSON.parse(existingStatsJson);
      
      // Update stats
      stats.gamesPlayed += 1;
      if (won) {
        stats.wins += 1;
      } else {
        stats.losses += 1;
      }
      stats.totalSurvivalTime += survivalTime;
      
      // Update longest survival if this is a new record
      if (survivalTime > stats.longestSurvival) {
        stats.longestSurvival = survivalTime;
      }
    } else {
      // Create new stats
      stats = {
        userId,
        gamesPlayed: 1,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        totalSurvivalTime: survivalTime,
        longestSurvival: survivalTime,
      };
    }

    // Save updated stats to Redis (no TTL - stats persist indefinitely)
    await redis.set(statsKey, JSON.stringify(stats));

    res.json({
      success: true,
      stats,
    } as SaveStatsResponse);
  } catch (error) {
    console.error('Error saving stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save stats',
    } as SaveStatsResponse);
  }
});

/**
 * Get player statistics
 * GET /api/stats/:userId
 */
router.get('/api/stats/:userId', async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required',
      } as GetStatsResponse);
      return;
    }

    const statsKey = `stats:${userId}`;
    const statsJson = await redis.get(statsKey);

    if (!statsJson) {
      // Return default stats if none exist
      const defaultStats: PlayerStats = {
        userId,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        totalSurvivalTime: 0,
        longestSurvival: 0,
      };

      res.json({
        success: true,
        stats: defaultStats,
      } as GetStatsResponse);
      return;
    }

    const stats: PlayerStats = JSON.parse(statsJson);

    res.json({
      success: true,
      stats,
    } as GetStatsResponse);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats',
    } as GetStatsResponse);
  }
});

export default router;
