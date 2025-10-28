import { redis } from '@devvit/web/server';
import type { GameState, PlayerStats } from '../../shared/types/game.js';

/**
 * Redis storage utility for game state and statistics
 */
export class RedisStorage {
  // TTL constants (in seconds)
  private static readonly GAME_STATE_TTL = 3600; // 1 hour
  private static readonly ACTIVE_GAMES_TTL = 3600; // 1 hour
  // Stats have no TTL - they persist indefinitely

  /**
   * Save game state to Redis
   * @param gameId - Game ID
   * @param gameState - Game state to save
   */
  static async saveGameState(gameId: string, gameState: GameState): Promise<void> {
    const key = `game:${gameId}`;
    await redis.set(key, JSON.stringify(gameState), {
      expiration: new Date(Date.now() + this.GAME_STATE_TTL * 1000),
    });
  }

  /**
   * Get game state from Redis
   * @param gameId - Game ID
   * @returns Game state or null if not found
   */
  static async getGameState(gameId: string): Promise<GameState | null> {
    const key = `game:${gameId}`;
    const data = await redis.get(key);
    
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as GameState;
    } catch (error) {
      console.error(`Error parsing game state for ${gameId}:`, error);
      return null;
    }
  }

  /**
   * Delete game state from Redis
   * @param gameId - Game ID
   */
  static async deleteGameState(gameId: string): Promise<void> {
    const key = `game:${gameId}`;
    await redis.del(key);
  }

  /**
   * Add game to active games list
   * @param gameId - Game ID
   */
  static async addActiveGame(gameId: string): Promise<void> {
    const key = 'games:active';
    await redis.zAdd(key, { member: gameId, score: Date.now() });
    
    // Set TTL on the sorted set
    await redis.expire(key, this.ACTIVE_GAMES_TTL);
  }

  /**
   * Remove game from active games list
   * @param gameId - Game ID
   */
  static async removeActiveGame(gameId: string): Promise<void> {
    const key = 'games:active';
    await redis.zRem(key, [gameId]);
  }

  /**
   * Get all active game IDs
   * @returns Array of active game IDs
   */
  static async getActiveGames(): Promise<string[]> {
    const key = 'games:active';
    const games = await redis.zRange(key, 0, -1);
    return games.map((game) => game.member);
  }

  /**
   * Save player statistics
   * @param userId - User ID
   * @param stats - Player statistics
   */
  static async saveStats(userId: string, stats: PlayerStats): Promise<void> {
    const key = `stats:${userId}`;
    // No TTL - stats persist indefinitely
    await redis.set(key, JSON.stringify(stats));
  }

  /**
   * Get player statistics
   * @param userId - User ID
   * @returns Player statistics or null if not found
   */
  static async getStats(userId: string): Promise<PlayerStats | null> {
    const key = `stats:${userId}`;
    const data = await redis.get(key);
    
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as PlayerStats;
    } catch (error) {
      console.error(`Error parsing stats for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update player statistics incrementally
   * @param userId - User ID
   * @param won - Whether the player won
   * @param survivalTime - Survival time in seconds
   * @returns Updated player statistics
   */
  static async updateStats(
    userId: string,
    won: boolean,
    survivalTime: number
  ): Promise<PlayerStats> {
    const existingStats = await this.getStats(userId);

    let stats: PlayerStats;

    if (existingStats) {
      stats = {
        ...existingStats,
        gamesPlayed: existingStats.gamesPlayed + 1,
        wins: existingStats.wins + (won ? 1 : 0),
        losses: existingStats.losses + (won ? 0 : 1),
        totalSurvivalTime: existingStats.totalSurvivalTime + survivalTime,
        longestSurvival: Math.max(existingStats.longestSurvival, survivalTime),
      };
    } else {
      stats = {
        userId,
        gamesPlayed: 1,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        totalSurvivalTime: survivalTime,
        longestSurvival: survivalTime,
      };
    }

    await this.saveStats(userId, stats);
    return stats;
  }

  /**
   * Reset player statistics
   * @param userId - User ID
   */
  static async resetStats(userId: string): Promise<void> {
    const key = `stats:${userId}`;
    await redis.del(key);
  }

  /**
   * Check if a game exists
   * @param gameId - Game ID
   * @returns True if game exists, false otherwise
   */
  static async gameExists(gameId: string): Promise<boolean> {
    const key = `game:${gameId}`;
    const data = await redis.get(key);
    return data !== null;
  }

  /**
   * Get TTL for a game state
   * @param gameId - Game ID
   * @returns TTL in seconds, or -1 if key doesn't exist, -2 if no TTL
   */
  static async getGameTTL(gameId: string): Promise<number> {
    const key = `game:${gameId}`;
    return await redis.ttl(key);
  }

  /**
   * Extend game state TTL
   * @param gameId - Game ID
   * @param additionalSeconds - Additional seconds to add to TTL
   */
  static async extendGameTTL(gameId: string, additionalSeconds: number): Promise<void> {
    const key = `game:${gameId}`;
    const currentTTL = await redis.ttl(key);
    
    if (currentTTL > 0) {
      await redis.expire(key, currentTTL + additionalSeconds);
    }
  }
}
