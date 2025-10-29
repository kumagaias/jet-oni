/**
 * Script to cleanup invalid games from Redis
 * Removes games with invalid hostnames (Host, Unknown, Guest####)
 */

import { RedisStorage } from '../core/redis-storage';

export async function cleanupInvalidGames(): Promise<void> {
  console.log('Starting cleanup of invalid games...');
  
  try {
    const gameIds = await RedisStorage.getActiveGames();
    console.log(`Found ${gameIds.length} active games`);
    
    let removedCount = 0;
    
    for (const gameId of gameIds) {
      const gameState = await RedisStorage.getGameState(gameId);
      
      if (!gameState) {
        console.log(`Game ${gameId} not found, removing from active list`);
        await RedisStorage.removeActiveGame(gameId);
        removedCount++;
        continue;
      }
      
      // Find host player
      const hostPlayer = gameState.players.find((p) => p.id === gameState.hostId);
      const hostUsername = hostPlayer?.username || '';
      
      // Check if host username is invalid
      if (!hostUsername || 
          hostUsername === 'Host' || 
          hostUsername === 'Unknown' || 
          hostUsername.startsWith('Guest') ||
          hostUsername.startsWith('TempUser')) {
        console.log(`Removing game ${gameId} with invalid host: ${hostUsername}`);
        await RedisStorage.deleteGameState(gameId);
        await RedisStorage.removeActiveGame(gameId);
        removedCount++;
      }
    }
    
    console.log(`Cleanup complete. Removed ${removedCount} invalid games.`);
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}
