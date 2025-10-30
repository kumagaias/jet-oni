import { redis } from '@devvit/web/server';
import type { GameState, Player, PlayerStats } from '../../shared/types/game.js';

/**
 * Redis storage utility for game state and statistics
 */
export class RedisStorage {
  // TTL constants (in seconds)
  private static readonly GAME_STATE_TTL = 3600; // 1 hour
  private static readonly PLAYER_STATE_TTL = 3600; // 1 hour
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
   * Note: Devvit Redis client doesn't expose TTL directly
   * This is a placeholder for future implementation
   * @param gameId - Game ID
   * @returns Estimated TTL based on GAME_STATE_TTL constant
   */
  static async getGameTTL(gameId: string): Promise<number> {
    const exists = await this.gameExists(gameId);
    return exists ? this.GAME_STATE_TTL : -1;
  }

  /**
   * Extend game state TTL
   * @param gameId - Game ID
   * @param additionalSeconds - Additional seconds to add to TTL (not used in current implementation)
   */
  static async extendGameTTL(gameId: string, additionalSeconds: number): Promise<void> {
    // Simply refresh the TTL to the default value
    const key = `game:${gameId}`;
    await redis.expire(key, this.GAME_STATE_TTL + additionalSeconds);
  }

  /**
   * Update player state in Redis
   * @param gameId - Game ID
   * @param playerId - Player ID
   * @param playerState - Player state to save
   */
  static async updatePlayer(
    gameId: string,
    playerId: string,
    playerState: Partial<Player>
  ): Promise<void> {
    // Get current game state
    const gameState = await this.getGameState(gameId);
    
    if (!gameState) {
      throw new Error(`Game ${gameId} not found`);
    }

    // Find and update player
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
    
    if (playerIndex === -1) {
      throw new Error(`Player ${playerId} not found in game ${gameId}`);
    }

    // Update player state (merge with existing player data)
    const existingPlayer = gameState.players[playerIndex];
    if (!existingPlayer) {
      throw new Error(`Player at index ${playerIndex} not found`);
    }
    
    gameState.players[playerIndex] = {
      ...existingPlayer,
      ...playerState,
      // Ensure required fields are present
      id: existingPlayer.id,
      username: existingPlayer.username,
      isOni: playerState.isOni ?? existingPlayer.isOni,
      isAI: existingPlayer.isAI,
      position: playerState.position ?? existingPlayer.position,
      velocity: playerState.velocity ?? existingPlayer.velocity,
      rotation: playerState.rotation ?? existingPlayer.rotation,
      fuel: playerState.fuel ?? existingPlayer.fuel,
      survivedTime: playerState.survivedTime ?? existingPlayer.survivedTime,
      wasTagged: playerState.wasTagged ?? existingPlayer.wasTagged,
      isOnSurface: playerState.isOnSurface ?? existingPlayer.isOnSurface,
      isDashing: playerState.isDashing ?? existingPlayer.isDashing,
      isJetpacking: playerState.isJetpacking ?? existingPlayer.isJetpacking,
      beaconCooldown: playerState.beaconCooldown ?? existingPlayer.beaconCooldown,
    };

    // Save updated game state with TTL
    await this.saveGameState(gameId, gameState);
  }

  /**
   * List all active games with their states
   * Uses pipeline for efficient batch retrieval
   * @returns Array of game states for active games
   */
  static async listGames(): Promise<GameState[]> {
    // Get all active game IDs
    const gameIds = await this.getActiveGames();
    
    console.log('[Redis] listGames - Active game IDs:', gameIds);
    
    // Check for duplicates in gameIds
    const uniqueGameIds = new Set(gameIds);
    if (gameIds.length !== uniqueGameIds.size) {
      console.warn('[Redis] Duplicate game IDs detected in active games!');
      console.warn('[Redis] Total:', gameIds.length, 'Unique:', uniqueGameIds.size);
    }
    
    if (gameIds.length === 0) {
      return [];
    }
    
    // Use pipeline to fetch all game states in parallel
    const gameStates: GameState[] = [];
    const expiredGameIds: string[] = [];
    
    // Fetch all game states using Promise.all for parallel execution
    const results = await Promise.all(
      gameIds.map(async (gameId) => {
        try {
          const gameState = await this.getGameState(gameId);
          return { gameId, gameState };
        } catch (error) {
          console.error(`Error fetching game state for ${gameId}:`, error);
          return { gameId, gameState: null };
        }
      })
    );
    
    // Process results
    for (const { gameId, gameState } of results) {
      // Only include games that exist and are in lobby status (joinable)
      if (gameState && gameState.status === 'lobby') {
        gameStates.push(gameState);
      } else if (!gameState) {
        // Mark for cleanup
        expiredGameIds.push(gameId);
      }
    }
    
    // Clean up expired games in batch
    if (expiredGameIds.length > 0) {
      await this.batchRemoveActiveGames(expiredGameIds);
    }
    
    console.log('[Redis] listGames - Returning', gameStates.length, 'lobby games');
    
    return gameStates;
  }

  /**
   * Clean up expired games from active games list
   * Removes game IDs that no longer have corresponding game state
   */
  static async cleanupExpiredGames(): Promise<void> {
    const gameIds = await this.getActiveGames();
    
    for (const gameId of gameIds) {
      const exists = await this.gameExists(gameId);
      
      if (!exists) {
        await this.removeActiveGame(gameId);
      }
    }
  }

  /**
   * Refresh TTL for active game
   * Extends TTL for both game state and active games list
   * @param gameId - Game ID
   */
  static async refreshGameTTL(gameId: string): Promise<void> {
    const key = `game:${gameId}`;
    await redis.expire(key, this.GAME_STATE_TTL);
    
    // Update score in active games sorted set to current timestamp
    const activeKey = 'games:active';
    await redis.zAdd(activeKey, { member: gameId, score: Date.now() });
  }

  /**
   * Batch remove multiple games from active games list
   * More efficient than removing one at a time
   * @param gameIds - Array of game IDs to remove
   */
  static async batchRemoveActiveGames(gameIds: string[]): Promise<void> {
    if (gameIds.length === 0) {
      return;
    }
    
    const key = 'games:active';
    await redis.zRem(key, gameIds);
  }

  /**
   * Batch save multiple game states
   * Uses parallel execution for efficiency
   * @param games - Array of game ID and state pairs
   */
  static async batchSaveGameStates(
    games: Array<{ gameId: string; gameState: GameState }>
  ): Promise<void> {
    if (games.length === 0) {
      return;
    }
    
    // Execute all saves in parallel
    await Promise.all(
      games.map(({ gameId, gameState }) => this.saveGameState(gameId, gameState))
    );
  }

  /**
   * Batch get multiple game states
   * Uses parallel execution for efficiency
   * @param gameIds - Array of game IDs
   * @returns Map of game ID to game state (null if not found)
   */
  static async batchGetGameStates(
    gameIds: string[]
  ): Promise<Map<string, GameState | null>> {
    if (gameIds.length === 0) {
      return new Map();
    }
    
    // Fetch all game states in parallel
    const results = await Promise.all(
      gameIds.map(async (gameId) => {
        const gameState = await this.getGameState(gameId);
        return { gameId, gameState };
      })
    );
    
    // Convert to map
    const map = new Map<string, GameState | null>();
    for (const { gameId, gameState } of results) {
      map.set(gameId, gameState);
    }
    
    return map;
  }

  /**
   * Batch update multiple players across different games
   * More efficient than updating one at a time
   * @param updates - Array of game ID, player ID, and state updates
   */
  static async batchUpdatePlayers(
    updates: Array<{
      gameId: string;
      playerId: string;
      playerState: Partial<Player>;
    }>
  ): Promise<void> {
    if (updates.length === 0) {
      return;
    }
    
    // Group updates by game ID for efficiency
    const updatesByGame = new Map<string, Array<{ playerId: string; playerState: Partial<Player> }>>();
    
    for (const update of updates) {
      const existing = updatesByGame.get(update.gameId) || [];
      existing.push({ playerId: update.playerId, playerState: update.playerState });
      updatesByGame.set(update.gameId, existing);
    }
    
    // Fetch all game states in parallel
    const gameIds = Array.from(updatesByGame.keys());
    const gameStates = await this.batchGetGameStates(gameIds);
    
    // Apply updates to each game state
    const gamesToSave: Array<{ gameId: string; gameState: GameState }> = [];
    
    for (const [gameId, playerUpdates] of updatesByGame.entries()) {
      const gameState = gameStates.get(gameId);
      
      if (!gameState) {
        console.warn(`Game ${gameId} not found, skipping updates`);
        continue;
      }
      
      // Apply all player updates for this game
      for (const { playerId, playerState } of playerUpdates) {
        const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
        
        if (playerIndex !== -1) {
          const existingPlayer = gameState.players[playerIndex];
          if (!existingPlayer) {
            console.warn(`Player at index ${playerIndex} not found, skipping update`);
            continue;
          }
          
          gameState.players[playerIndex] = {
            ...existingPlayer,
            ...playerState,
            // Ensure required fields are present
            id: existingPlayer.id,
            username: existingPlayer.username,
            isOni: playerState.isOni ?? existingPlayer.isOni,
            isAI: existingPlayer.isAI,
            position: playerState.position ?? existingPlayer.position,
            velocity: playerState.velocity ?? existingPlayer.velocity,
            rotation: playerState.rotation ?? existingPlayer.rotation,
            fuel: playerState.fuel ?? existingPlayer.fuel,
            survivedTime: playerState.survivedTime ?? existingPlayer.survivedTime,
            wasTagged: playerState.wasTagged ?? existingPlayer.wasTagged,
            isOnSurface: playerState.isOnSurface ?? existingPlayer.isOnSurface,
            isDashing: playerState.isDashing ?? existingPlayer.isDashing,
            isJetpacking: playerState.isJetpacking ?? existingPlayer.isJetpacking,
            beaconCooldown: playerState.beaconCooldown ?? existingPlayer.beaconCooldown,
          };
        }
      }
      
      gamesToSave.push({ gameId, gameState });
    }
    
    // Save all updated game states in parallel
    await this.batchSaveGameStates(gamesToSave);
  }

  /**
   * Get performance statistics for Redis operations
   * Useful for monitoring and optimization
   * @returns Object with performance metrics
   */
  static async getPerformanceStats(): Promise<{
    activeGamesCount: number;
    totalKeys: number;
  }> {
    const activeGames = await this.getActiveGames();
    
    return {
      activeGamesCount: activeGames.length,
      totalKeys: activeGames.length, // Simplified - in production would scan all keys
    };
  }
}


