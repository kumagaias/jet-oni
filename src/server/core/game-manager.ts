import { GameState, GameConfig, Player, Vector3, Rotation } from '../../shared/types/game';
import { GameListItem, GameResults, PlayerResult } from '../../shared/types/api';
import { StateValidator } from './state-validator';
import { RedisStorage } from './redis-storage';

/**
 * GameManager handles game session creation, player management, and game state
 */
export class GameManager {

  /**
   * Create a new game session
   * Returns object with gameId and hostPlayerId
   */
  async createGame(config: GameConfig, hostUsername?: string): Promise<{ gameId: string; hostPlayerId: string }> {
    // Delete any existing games by the same host
    if (hostUsername) {
      await this.deleteExistingGamesByHost(hostUsername);
    }
    
    const gameId = this.generateGameId();
    const hostId = this.generatePlayerId();

    // Create host player
    const hostPlayer: Player = {
      id: hostId,
      username: hostUsername || 'Host',
      isOni: false,
      isAI: false,
      position: { x: 0, y: 2, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { yaw: 0, pitch: 0 },
      fuel: 100,
      survivedTime: 0,
      wasTagged: false,
      tagCount: 0,
      isOnSurface: true,
      isDashing: false,
      isJetpacking: false,
      beaconCooldown: 0,
    };

    const gameState: GameState = {
      gameId,
      hostId,
      status: 'lobby',
      config,
      players: [hostPlayer], // Add host player to the game
      startTime: 0,
      endTime: 0,
      currentRound: 0,
      timeRemaining: config.roundDuration,
      lastHostHeartbeat: Date.now(), // Initialize heartbeat
    };

    // Save game state to Redis
    await this.saveGameState(gameState);

    // Add to active games list
    await RedisStorage.addActiveGame(gameId);

    return { gameId, hostPlayerId: hostId };
  }

  /**
   * Join an existing game
   */
  async joinGame(
    gameId: string,
    username: string
  ): Promise<{ success: boolean; playerId?: string; gameState?: GameState; error?: string }> {
    const gameState = await this.getGameState(gameId);

    if (!gameState) {
      return { success: false, error: 'Game not found' };
    }

    if (gameState.status !== 'lobby') {
      return { success: false, error: 'Game has already started' };
    }

    // Check if game has been running for more than 20 minutes
    if (gameState.startTime > 0) {
      const now = Date.now();
      const gameAge = now - gameState.startTime;
      const MAX_GAME_AGE = 20 * 60 * 1000; // 20 minutes in milliseconds

      if (gameAge > MAX_GAME_AGE) {
        return { success: false, error: 'Game has been running for too long (20+ minutes)' };
      }
    }

    if (gameState.players.length >= gameState.config.totalPlayers) {
      return { success: false, error: 'Game is full' };
    }

    // Check if player already joined
    const existingPlayer = gameState.players.find((p) => p.username === username);
    if (existingPlayer) {
      return {
        success: true,
        playerId: existingPlayer.id,
        gameState,
      };
    }

    // Create new player
    const playerId = this.generatePlayerId();
    const newPlayer: Player = {
      id: playerId,
      username,
      isOni: false,
      isAI: false,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { yaw: 0, pitch: 0 },
      fuel: 100,
      survivedTime: 0,
      wasTagged: false,
      tagCount: 0,
      isOnSurface: true,
      isDashing: false,
      isJetpacking: false,
      beaconCooldown: 0,
    };

    gameState.players.push(newPlayer);

    // If game is full, assign random oni
    if (gameState.players.length === gameState.config.totalPlayers) {
      this.assignRandomOni(gameState);
    }

    await this.saveGameState(gameState);

    return {
      success: true,
      playerId,
      gameState,
    };
  }

  /**
   * Get current game state
   */
  async getGameState(gameId: string): Promise<GameState | null> {
    return await RedisStorage.getGameState(gameId);
  }

  /**
   * End a game and calculate results
   */
  async endGame(gameId: string): Promise<GameResults | null> {
    const gameState = await this.getGameState(gameId);

    if (!gameState) {
      return null;
    }

    gameState.status = 'ended';
    gameState.endTime = Date.now();

    // Calculate results
    const playerResults: PlayerResult[] = gameState.players.map((player) => ({
      id: player.id,
      username: player.username,
      survivedTime: player.survivedTime,
      wasTagged: player.wasTagged,
      isAI: player.isAI,
    }));

    // Sort by survival time (descending)
    playerResults.sort((a, b) => b.survivedTime - a.survivedTime);

    // Determine winner:
    // - If there are survivors (runners who weren't tagged): longest survivor wins
    // - If all players became oni: the one who was oni longest (tagged first) wins
    let winnerCandidate: PlayerResult | undefined;
    
    const survivors = playerResults.filter((p) => !p.wasTagged);
    if (survivors.length > 0) {
      // Longest survivor wins
      winnerCandidate = survivors[0];
    } else {
      // All players became oni, the one who was oni longest (tagged first = highest survivedTime) wins
      const taggedPlayers = playerResults.filter((p) => p.wasTagged);
      if (taggedPlayers.length > 0) {
        winnerCandidate = taggedPlayers[0]; // Already sorted by survivedTime descending
      } else {
        // Fallback
        winnerCandidate = playerResults[0];
      }
    }

    const results: GameResults = {
      players: playerResults,
      ...(winnerCandidate && { winner: winnerCandidate }),
    };

    await this.saveGameState(gameState);

    // Remove from active games list
    await RedisStorage.removeActiveGame(gameId);

    return results;
  }

  /**
   * Update player state in a game
   */
  async updatePlayerState(
    gameId: string,
    playerId: string,
    state: {
      position: Vector3;
      velocity: Vector3;
      rotation: Rotation;
      fuel: number;
      isOni: boolean;
      isDashing: boolean;
      isJetpacking: boolean;
      isOnSurface: boolean;
      beaconCooldown: number;
      survivedTime: number;
      wasTagged: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const gameState = await this.getGameState(gameId);

    if (!gameState) {
      return { success: false, error: 'Game not found' };
    }

    // Auto-start game if in lobby and receiving player updates
    if (gameState.status === 'lobby') {
      gameState.status = 'playing';
      gameState.startTime = Date.now();
    }
    
    if (gameState.status !== 'playing') {
      return { success: false, error: 'Game is not in playing state' };
    }

    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

    if (playerIndex === -1) {
      return { success: false, error: 'Player not found in game' };
    }

    // Validate and sanitize state
    if (!StateValidator.isValidVector(state.position)) {
      return { success: false, error: 'Invalid position values' };
    }

    if (!StateValidator.isValidVector(state.velocity)) {
      return { success: false, error: 'Invalid velocity values' };
    }

    if (!StateValidator.isValidRotation(state.rotation)) {
      return { success: false, error: 'Invalid rotation values' };
    }

    if (!StateValidator.isValidNumber(state.fuel)) {
      return { success: false, error: 'Invalid fuel value' };
    }

    // Apply validation and clamping
    const validatedPosition = StateValidator.validatePosition(state.position);
    const validatedVelocity = StateValidator.validateVelocity(state.velocity);
    const validatedRotation = StateValidator.validateRotation(state.rotation);
    const validatedFuel = StateValidator.validateFuel(state.fuel);
    const validatedBeaconCooldown = StateValidator.validateBeaconCooldown(state.beaconCooldown);

    // Update player state
    const existingPlayer = gameState.players[playerIndex];
    if (!existingPlayer) {
      return { success: false, error: 'Player not found at index' };
    }

    gameState.players[playerIndex] = {
      ...existingPlayer,
      position: validatedPosition,
      velocity: validatedVelocity,
      rotation: validatedRotation,
      fuel: validatedFuel,
      isOni: state.isOni ?? existingPlayer.isOni,
      isDashing: state.isDashing ?? existingPlayer.isDashing,
      isJetpacking: state.isJetpacking ?? existingPlayer.isJetpacking,
      isOnSurface: state.isOnSurface ?? existingPlayer.isOnSurface,
      beaconCooldown: validatedBeaconCooldown,
      survivedTime: state.survivedTime ?? existingPlayer.survivedTime,
      wasTagged: state.wasTagged ?? existingPlayer.wasTagged,
    };

    await this.saveGameState(gameState);

    return { success: true };
  }

  /**
   * List all active games
   * Only returns games in 'lobby' status that are joinable
   */
  async listGames(): Promise<GameListItem[]> {
    const gameIds = await RedisStorage.getActiveGames();

    if (!gameIds || gameIds.length === 0) {
      return [];
    }

    const games: GameListItem[] = [];

    for (const gameId of gameIds) {
      const gameState = await this.getGameState(gameId);

      if (gameState) {
        // Only include games in lobby status that are not full
        if (gameState.status === 'lobby' && gameState.players.length < gameState.config.totalPlayers) {
          const hostPlayer = gameState.players.find((p) => p.id === gameState.hostId);
          
          // Skip games where host username is invalid (Guest####, Host, Unknown, TempUser####, etc.)
          const hostUsername = hostPlayer?.username || '';
          if (!hostUsername || 
              hostUsername === 'Host' || 
              hostUsername === 'Unknown' || 
              hostUsername.startsWith('Guest') ||
              hostUsername.startsWith('TempUser')) {
            console.log(`Skipping game ${gameState.gameId} with invalid host: ${hostUsername}`);
            continue;
          }

          // Skip games that have been running for more than 20 minutes
          if (gameState.startTime > 0) {
            const now = Date.now();
            const gameAge = now - gameState.startTime;
            const MAX_GAME_AGE = 20 * 60 * 1000; // 20 minutes in milliseconds

            if (gameAge > MAX_GAME_AGE) {
              console.log(`Skipping game ${gameState.gameId} - too old (${Math.floor(gameAge / 60000)} minutes)`);
              continue;
            }
          }

          games.push({
            gameId: gameState.gameId,
            hostUsername: hostUsername,
            currentPlayers: gameState.players.length,
            totalPlayers: gameState.config.totalPlayers,
            roundDuration: gameState.config.roundDuration,
            rounds: gameState.config.rounds,
            status: gameState.status,
          });
        }
      }
    }

    return games;
  }

  /**
   * Add AI players to fill empty slots
   */
  async addAIPlayers(gameId: string): Promise<void> {
    const gameState = await this.getGameState(gameId);

    if (!gameState) {
      console.error('[GameManager] addAIPlayers: Game not found:', gameId);
      return;
    }

    const slotsToFill = gameState.config.totalPlayers - gameState.players.length;
    console.log(`[GameManager] addAIPlayers: Total players: ${gameState.config.totalPlayers}, Current: ${gameState.players.length}, Slots to fill: ${slotsToFill}`);

    // Count existing human players and their roles
    const humanPlayers = gameState.players.filter(p => !p.isAI);
    const humanOniCount = humanPlayers.filter(p => p.isOni).length;
    const humanRunnerCount = humanPlayers.filter(p => !p.isOni).length;
    console.log(`[GameManager] addAIPlayers: Human players - ONI: ${humanOniCount}, Runner: ${humanRunnerCount}`);

    // Add AI players
    for (let i = 0; i < slotsToFill; i++) {
      const aiPlayer: Player = {
        id: this.generatePlayerId(),
        username: `AI_${i + 1}`,
        isOni: false,
        isAI: true,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        tagCount: 0,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      };

      gameState.players.push(aiPlayer);
    }

    console.log(`[GameManager] addAIPlayers: After adding AI, total players: ${gameState.players.length}`);

    // Calculate required ONI count based on total players
    const requiredOniCount = Math.max(1, Math.floor(gameState.players.length / 3));
    console.log(`[GameManager] addAIPlayers: Required ONI count: ${requiredOniCount}, Current human ONI: ${humanOniCount}`);

    // Assign ONI roles to AI players to reach the required count
    if (humanOniCount < requiredOniCount) {
      const oniNeeded = requiredOniCount - humanOniCount;
      console.log(`[GameManager] addAIPlayers: Need to assign ${oniNeeded} more ONI from AI players`);

      // Get all AI players
      const aiPlayers = gameState.players.filter(p => p.isAI);
      
      // Shuffle AI players
      const shuffledAI = [...aiPlayers].sort(() => Math.random() - 0.5);

      // Assign ONI to first N AI players
      for (let i = 0; i < oniNeeded && i < shuffledAI.length; i++) {
        const aiPlayer = shuffledAI[i];
        if (aiPlayer) {
          aiPlayer.isOni = true;
          console.log(`[GameManager] addAIPlayers: Assigned ${aiPlayer.username} (${aiPlayer.id}) as ONI`);
        }
      }
    } else if (humanOniCount > requiredOniCount) {
      // Too many human ONI - this shouldn't happen, but log it
      console.warn(`[GameManager] addAIPlayers: Warning - More human ONI (${humanOniCount}) than required (${requiredOniCount})`);
    }

    // Log final counts
    const finalOniCount = gameState.players.filter(p => p.isOni).length;
    const finalRunnerCount = gameState.players.filter(p => !p.isOni).length;
    console.log(`[GameManager] addAIPlayers: Final counts - ONI: ${finalOniCount}, Runner: ${finalRunnerCount}`);

    try {
      await this.saveGameState(gameState);
      console.log(`[GameManager] addAIPlayers: Game state saved successfully`);
    } catch (error) {
      console.error('[GameManager] addAIPlayers: Error saving game state:', error);
      throw error;
    }
  }

  /**
   * Replace a disconnected player with an AI player
   */
  async replacePlayerWithAI(gameId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
    const gameState = await this.getGameState(gameId);

    if (!gameState) {
      return { success: false, error: 'Game not found' };
    }

    // If the disconnected player is the host and game is in lobby, close the game
    if (playerId === gameState.hostId && gameState.status === 'lobby') {
      await RedisStorage.deleteGameState(gameId);
      await RedisStorage.removeActiveGame(gameId);
      return { success: true, error: 'Game closed - host disconnected' };
    }

    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

    if (playerIndex === -1) {
      return { success: false, error: 'Player not found in game' };
    }

    const player = gameState.players[playerIndex];
    if (!player) {
      return { success: false, error: 'Player not found at index' };
    }

    // Replace with AI player, keeping the same state
    const aiPlayer: Player = {
      ...player,
      username: `AI_${player.username}`,
      isAI: true,
    };

    gameState.players[playerIndex] = aiPlayer;

    await this.saveGameState(gameState);

    return { success: true };
  }

  /**
   * Check for inactive players and replace them with AI
   * Players are considered inactive if they haven't updated in the last 10 seconds
   */
  async checkAndReplaceInactivePlayers(gameId: string): Promise<string[]> {
    const gameState = await this.getGameState(gameId);

    if (!gameState || gameState.status !== 'playing') {
      return [];
    }

    const replacedPlayerIds: string[] = [];

    for (let i = 0; i < gameState.players.length; i++) {
      const player = gameState.players[i];
      if (!player) continue;

      // Skip AI players
      if (player.isAI) {
        continue;
      }

      // Check if player has a lastUpdate timestamp (we'll need to add this)
      // For now, we'll skip this check and rely on manual replacement
    }

    if (replacedPlayerIds.length > 0) {
      await this.saveGameState(gameState);
    }

    return replacedPlayerIds;
  }

  /**
   * Randomly assign oni players based on total player count
   * Formula: 1 oni for every 3 players (rounded down), minimum 1 oni
   */
  private assignRandomOni(gameState: GameState): void {
    try {
      if (!gameState || !gameState.players) {
        console.error('[GameManager] assignRandomOni: Invalid game state');
        return;
      }

      if (gameState.players.length === 0) {
        console.warn('[GameManager] assignRandomOni: No players to assign ONI');
        return;
      }

      // Calculate number of oni: 1 oni for every 3 players (rounded down)
      const oniCount = Math.max(1, Math.floor(gameState.players.length / 3));
      console.log(`[GameManager] assignRandomOni: Total players: ${gameState.players.length}, ONI count: ${oniCount}`);

      // Reset all players to runner
      gameState.players.forEach((player) => {
        if (player) {
          player.isOni = false;
        }
      });

      // Shuffle players array
      const shuffled = [...gameState.players].sort(() => Math.random() - 0.5);

      // Select first N players as oni
      for (let i = 0; i < oniCount && i < shuffled.length; i++) {
        const selectedPlayer = shuffled[i];
        if (selectedPlayer) {
          selectedPlayer.isOni = true;
          console.log(`[GameManager] assignRandomOni: Assigned ${selectedPlayer.username} (${selectedPlayer.id}) as ONI`);
        }
      }

      console.log(`[GameManager] assignRandomOni: Completed. ONI players: ${gameState.players.filter(p => p.isOni).length}`);
    } catch (error) {
      console.error('[GameManager] assignRandomOni: Unexpected error:', error);
      throw error;
    }
  }

  /**
   * Save game state to Redis
   */
  private async saveGameState(gameState: GameState): Promise<void> {
    await RedisStorage.saveGameState(gameState.gameId, gameState);
  }

  /**
   * Generate unique game ID
   */
  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique player ID
   */
  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Update host heartbeat timestamp
   */
  async updateHostHeartbeat(gameId: string): Promise<{ success: boolean; error?: string }> {
    const gameState = await this.getGameState(gameId);

    if (!gameState) {
      return { success: false, error: 'Game not found' };
    }

    // Update heartbeat timestamp
    gameState.lastHostHeartbeat = Date.now();
    await this.saveGameState(gameState);

    return { success: true };
  }

  /**
   * Check if host is still active (heartbeat within 30 seconds)
   */
  async checkHostActive(gameId: string): Promise<boolean> {
    const gameState = await this.getGameState(gameId);

    if (!gameState || !gameState.lastHostHeartbeat) {
      return false;
    }

    const now = Date.now();
    const timeSinceHeartbeat = now - gameState.lastHostHeartbeat;
    const HOST_TIMEOUT = 30 * 1000; // 30 seconds

    return timeSinceHeartbeat < HOST_TIMEOUT;
  }

  /**
   * Close game due to host disconnect
   */
  async closeGameHostDisconnect(gameId: string): Promise<{ success: boolean; error?: string }> {
    const gameState = await this.getGameState(gameId);

    if (!gameState) {
      return { success: false, error: 'Game not found' };
    }

    console.log(`Closing game ${gameId} due to host disconnect`);

    // Delete game state and remove from active games
    await RedisStorage.deleteGameState(gameId);
    await RedisStorage.removeActiveGame(gameId);

    return { success: true };
  }

  /**
   * Delete existing games by the same host
   * Called when a host creates a new game to clean up any abandoned games
   */
  private async deleteExistingGamesByHost(hostUsername: string): Promise<number> {
    const gameIds = await RedisStorage.getActiveGames();
    let deletedCount = 0;

    for (const gameId of gameIds) {
      const gameState = await this.getGameState(gameId);

      if (!gameState) {
        continue;
      }

      // Find the host player
      const hostPlayer = gameState.players.find((p) => p.id === gameState.hostId);
      
      // If this game is hosted by the same user, delete it
      if (hostPlayer && hostPlayer.username === hostUsername) {
        console.log(`Deleting existing game ${gameId} by host ${hostUsername}`);
        await RedisStorage.deleteGameState(gameId);
        await RedisStorage.removeActiveGame(gameId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`Deleted ${deletedCount} existing game(s) by host ${hostUsername}`);
    }

    return deletedCount;
  }

  /**
   * Clean up stale games (games in lobby with no recent heartbeat)
   * Should be called periodically
   */
  async cleanupStaleGames(): Promise<number> {
    const gameIds = await RedisStorage.getActiveGames();
    let cleanedCount = 0;

    const now = Date.now();
    const STALE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

    for (const gameId of gameIds) {
      const gameState = await this.getGameState(gameId);

      if (!gameState) {
        // Game state doesn't exist, remove from active games
        await RedisStorage.removeActiveGame(gameId);
        cleanedCount++;
        continue;
      }

      // Only clean up games in lobby status
      if (gameState.status !== 'lobby') {
        continue;
      }

      // Check if host heartbeat is stale
      if (gameState.lastHostHeartbeat) {
        const timeSinceHeartbeat = now - gameState.lastHostHeartbeat;
        
        if (timeSinceHeartbeat > STALE_TIMEOUT) {
          console.log(`Cleaning up stale game ${gameId} (${Math.floor(timeSinceHeartbeat / 1000)}s since last heartbeat)`);
          await RedisStorage.deleteGameState(gameId);
          await RedisStorage.removeActiveGame(gameId);
          cleanedCount++;
        }
      } else {
        // No heartbeat data, check game creation time
        // If game is older than 5 minutes and has no heartbeat, clean it up
        const gameIdTimestamp = parseInt(gameId.split('_')[1] || '0');
        if (gameIdTimestamp > 0) {
          const gameAge = now - gameIdTimestamp;
          if (gameAge > STALE_TIMEOUT) {
            console.log(`Cleaning up old game ${gameId} (${Math.floor(gameAge / 1000)}s old, no heartbeat)`);
            await RedisStorage.deleteGameState(gameId);
            await RedisStorage.removeActiveGame(gameId);
            cleanedCount++;
          }
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} stale games`);
    }

    return cleanedCount;
  }

  /**
   * Update heartbeat timestamp for a game
   */
  async updateHeartbeat(gameId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const gameState = await RedisStorage.getGameState(gameId);

      if (!gameState) {
        return {
          success: false,
          error: 'Game not found',
        };
      }

      // Update last host heartbeat timestamp
      gameState.lastHostHeartbeat = Date.now();

      // Save updated game state
      await RedisStorage.saveGameState(gameId, gameState);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating heartbeat:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update heartbeat',
      };
    }
  }

  /**
   * Remove a player from a game (participant leaves lobby)
   */
  async removePlayer(gameId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const gameState = await RedisStorage.getGameState(gameId);

      if (!gameState) {
        return {
          success: false,
          error: 'Game not found',
        };
      }

      // Check if game is in lobby (can only leave during lobby)
      if (gameState.status !== 'lobby') {
        return {
          success: false,
          error: 'Can only leave game during lobby phase',
        };
      }

      // Check if player is the host
      if (playerId === gameState.hostId) {
        return {
          success: false,
          error: 'Host cannot leave game, must delete game instead',
        };
      }

      // Remove player from players array
      const playerIndex = gameState.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) {
        return {
          success: false,
          error: 'Player not found in game',
        };
      }

      gameState.players.splice(playerIndex, 1);

      // Save updated game state
      await RedisStorage.saveGameState(gameId, gameState);

      console.log(`Player ${playerId} left game ${gameId}`);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error removing player:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove player',
      };
    }
  }


}
