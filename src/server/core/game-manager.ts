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

    // Calculate game duration
    const gameEndTime = Date.now();
    const gameStartTime = gameState.startTime || gameEndTime; // Fallback to endTime if startTime not set
    const gameDuration = gameState.startTime > 0 
      ? (gameEndTime - gameState.startTime) / 1000 
      : 0; // Convert to seconds
    
    console.log(`[Game End] Time calculation: startTime=${gameStartTime}, endTime=${gameEndTime}, duration=${gameDuration}s`);
    console.log(`[Game End] gameState.startTime was ${gameState.startTime ? 'set' : 'NOT SET'}`);

    // Get initial ONI IDs (players who were ONI at game start)
    const initialOniIds = gameState.initialOniIds || [];
    console.log(`[Game End] Initial ONI IDs: ${JSON.stringify(initialOniIds)}`);
    
    // Calculate results
    const allPlayerResults: PlayerResult[] = gameState.players.map((player) => {
      // Check if player was initial ONI
      const wasInitialOni = initialOniIds.includes(player.id);
      console.log(`[Game End] Player ${player.username} (${player.id}): wasInitialOni=${wasInitialOni}, isOni=${player.isOni}, wasTagged=${player.wasTagged}`);
      
      // Use survival time from player state (sent by client)
      // Client calculates the correct survivedTime based on game elapsed time
      // Only fall back to gameDuration if player.survivedTime is not set
      let survivedTime = 0;
      
      if (player.survivedTime !== undefined && player.survivedTime > 0) {
        // Use client-provided survivedTime (most accurate)
        survivedTime = player.survivedTime;
      } else if (!player.wasTagged) {
        // Fallback: Player who survived - use game duration
        survivedTime = gameDuration;
      } else {
        // Tagged player with no recorded time
        survivedTime = 0;
      }
      
      return {
        id: player.id,
        username: player.username,
        survivedTime,
        wasTagged: player.wasTagged,
        isAI: player.isAI,
        tagCount: player.tagCount || 0,
        wasInitialOni, // Add flag to identify initial ONI
      };
    });

    // Determine team winner:
    // - If any runners survived (never tagged AND not initial ONI): Runners Win
    // - If all players became ONI (all tagged OR initial ONI): ONI Wins
    // Check original game state for isOni status
    
    // Debug: Log player states
    console.log('[Game End] Player states:');
    gameState.players.forEach((p) => {
      const wasInitialOni = initialOniIds.includes(p.id);
      console.log(`  ${p.username}: isOni=${p.isOni}, wasTagged=${p.wasTagged}, survivedTime=${p.survivedTime}, wasInitialOni=${wasInitialOni}`);
    });
    
    // Debug: Log calculated results
    console.log('[Game End] Calculated results (before filtering):');
    allPlayerResults.forEach((p) => {
      console.log(`  ${p.username}: survivedTime=${p.survivedTime}, wasTagged=${p.wasTagged}, wasInitialOni=${p.wasInitialOni}`);
    });
    
    // Determine team winner based on initial ONI status
    const survivors = allPlayerResults.filter((p) => !p.wasTagged && !p.wasInitialOni);
    console.log(`[Game End] Survivors: ${survivors.length}`);
    const teamWinner = survivors.length > 0 ? 'runners' : 'oni';
    console.log(`[Game End] Team winner: ${teamWinner}`);
    
    // Filter players to show based on team winner:
    // - Runners Win: Show only runners who survived (NOT initial ONI and NOT tagged)
    // - ONI Win: Show only initial ONI (players who were ONI at game start)
    let playerResults: PlayerResult[];
    if (teamWinner === 'runners') {
      // Show only runners who survived (exclude initial ONI and tagged players)
      playerResults = allPlayerResults.filter(p => !p.wasInitialOni && !p.wasTagged);
      // Sort by survival time (descending)
      playerResults.sort((a, b) => b.survivedTime - a.survivedTime);
      
      // Debug: Log filtered results
      console.log('[Game End] Filtered results (runners only):');
      playerResults.forEach((p) => {
        console.log(`  ${p.username}: survivedTime=${p.survivedTime}`);
      });
    } else {
      // Show only initial ONI
      playerResults = allPlayerResults.filter(p => p.wasInitialOni);
      // Sort by tag count (descending)
      playerResults.sort((a, b) => {
        const tagDiff = (b.tagCount || 0) - (a.tagCount || 0);
        if (tagDiff !== 0) return tagDiff;
        // Then by survival time (ascending - who was ONI longest)
        return a.survivedTime - b.survivedTime;
      });
    }

    const results: GameResults = {
      players: playerResults,
      teamWinner,
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
      position?: Vector3;
      velocity?: Vector3;
      rotation?: Rotation;
      fuel?: number;
      isOni?: boolean;
      isDashing?: boolean;
      isJetpacking?: boolean;
      isOnSurface?: boolean;
      beaconCooldown?: number;
      survivedTime?: number;
      wasTagged?: boolean;
      tagCount?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const gameState = await this.getGameState(gameId);

    if (!gameState) {
      return { success: false, error: 'Game not found' };
    }

    // Auto-start game if in lobby and receiving player updates
    if (gameState.status === 'lobby') {
      gameState.status = 'playing';
      // Only set startTime if not already set (prevent overwriting during game)
      if (!gameState.startTime || gameState.startTime === 0) {
        gameState.startTime = Date.now();
        console.log(`[GameManager] updatePlayerState: Game started at ${gameState.startTime}`);
      }
      
      // Save initial ONI player IDs only if not already set
      // (they should have been set by addAIPlayers)
      if (!gameState.initialOniIds || gameState.initialOniIds.length === 0) {
        gameState.initialOniIds = gameState.players
          .filter(p => p.isOni)
          .map(p => p.id);
        console.log(`[GameManager] updatePlayerState: Initial ONI IDs saved: ${gameState.initialOniIds.join(', ')}`);
      } else {
        console.log(`[GameManager] updatePlayerState: Initial ONI IDs already set: ${gameState.initialOniIds.join(', ')}`);
      }
    }
    
    // Allow updates during playing and ended states (for final state updates before endGame)
    if (gameState.status !== 'playing' && gameState.status !== 'ended') {
      return { success: false, error: `Game is not in playing state (current: ${gameState.status})` };
    }

    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

    if (playerIndex === -1) {
      return { success: false, error: 'Player not found in game' };
    }

    // Validate and sanitize state (only if provided)
    if (state.position && !StateValidator.isValidVector(state.position)) {
      console.error(`[updatePlayerState] Invalid position for ${playerId}:`, state.position);
      return { success: false, error: `Invalid position values: ${JSON.stringify(state.position)}` };
    }

    if (state.velocity && !StateValidator.isValidVector(state.velocity)) {
      console.error(`[updatePlayerState] Invalid velocity for ${playerId}:`, state.velocity);
      return { success: false, error: `Invalid velocity values: ${JSON.stringify(state.velocity)}` };
    }

    if (state.rotation && !StateValidator.isValidRotation(state.rotation)) {
      console.error(`[updatePlayerState] Invalid rotation for ${playerId}:`, state.rotation);
      return { success: false, error: `Invalid rotation values: ${JSON.stringify(state.rotation)}` };
    }

    if (state.fuel !== undefined && !StateValidator.isValidNumber(state.fuel)) {
      console.error(`[updatePlayerState] Invalid fuel for ${playerId}:`, state.fuel);
      return { success: false, error: `Invalid fuel value: ${state.fuel}` };
    }

    // Apply validation and clamping (only if provided)
    const validatedPosition = state.position ? StateValidator.validatePosition(state.position) : undefined;
    const validatedVelocity = state.velocity ? StateValidator.validateVelocity(state.velocity) : undefined;
    const validatedRotation = state.rotation ? StateValidator.validateRotation(state.rotation) : undefined;
    const validatedFuel = state.fuel !== undefined ? StateValidator.validateFuel(state.fuel) : undefined;
    const validatedBeaconCooldown = state.beaconCooldown !== undefined ? StateValidator.validateBeaconCooldown(state.beaconCooldown) : undefined;

    // Update player state
    const existingPlayer = gameState.players[playerIndex];
    if (!existingPlayer) {
      return { success: false, error: 'Player not found at index' };
    }

    gameState.players[playerIndex] = {
      ...existingPlayer,
      position: validatedPosition ?? existingPlayer.position,
      velocity: validatedVelocity ?? existingPlayer.velocity,
      rotation: validatedRotation ?? existingPlayer.rotation,
      fuel: validatedFuel ?? existingPlayer.fuel,
      isOni: state.isOni ?? existingPlayer.isOni,
      isDashing: state.isDashing ?? existingPlayer.isDashing,
      isJetpacking: state.isJetpacking ?? existingPlayer.isJetpacking,
      isOnSurface: state.isOnSurface ?? existingPlayer.isOnSurface,
      beaconCooldown: validatedBeaconCooldown ?? existingPlayer.beaconCooldown,
      survivedTime: state.survivedTime !== undefined ? state.survivedTime : existingPlayer.survivedTime,
      wasTagged: state.wasTagged !== undefined ? state.wasTagged : existingPlayer.wasTagged,
      tagCount: state.tagCount !== undefined ? state.tagCount : (existingPlayer.tagCount ?? 0),
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

    // Use assignRandomOni to properly assign roles based on player count
    // This will handle the rules:
    // - 1 human: random assignment
    // - 2+ humans: at least 1 human must be oni
    this.assignRandomOni(gameState);

    // Save initial ONI IDs after assignment (for game results calculation)
    gameState.initialOniIds = gameState.players
      .filter(p => p.isOni)
      .map(p => p.id);
    console.log(`[GameManager] addAIPlayers: Initial ONI IDs saved: ${gameState.initialOniIds.join(', ')}`);

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
   * Rules:
   * - 1 human player: Random assignment (50% oni, 50% runner)
   * - 2+ human players: At least 1 human must be oni
   * - Formula: 1 oni for every 3 players (rounded down), minimum 1 oni
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

      // Count human players
      const humanPlayers = gameState.players.filter(p => !p.isAI);
      const humanCount = humanPlayers.length;
      
      console.log(`[GameManager] assignRandomOni: Total players: ${gameState.players.length}, Human players: ${humanCount}`);

      // Calculate number of oni: 1 oni for every 3 players (rounded down)
      const oniCount = Math.max(1, Math.floor(gameState.players.length / 3));
      console.log(`[GameManager] assignRandomOni: Required ONI count: ${oniCount}`);

      // Reset all players to runner
      gameState.players.forEach((player) => {
        if (player) {
          player.isOni = false;
        }
      });

      // Special case: Only 1 human player - random assignment
      if (humanCount === 1) {
        console.log(`[GameManager] assignRandomOni: Single human player - random assignment`);
        
        // Shuffle all players
        const shuffled = [...gameState.players].sort(() => Math.random() - 0.5);
        
        // Select first N players as oni
        for (let i = 0; i < oniCount && i < shuffled.length; i++) {
          const selectedPlayer = shuffled[i];
          if (selectedPlayer) {
            selectedPlayer.isOni = true;
            console.log(`[GameManager] assignRandomOni: Assigned ${selectedPlayer.username} (${selectedPlayer.id}) as ONI`);
          }
        }
      } 
      // 2+ human players: Ensure at least 1 human is oni AND at least 1 human is runner
      else if (humanCount >= 2) {
        console.log(`[GameManager] assignRandomOni: Multiple human players - ensuring at least 1 human ONI and 1 human Runner`);
        
        // Shuffle human players
        const shuffledHumans = [...humanPlayers].sort(() => Math.random() - 0.5);
        
        // Calculate how many humans should be oni
        // Must be: at least 1, at most (humanCount - 1) to ensure at least 1 runner
        const maxHumanOni = Math.min(oniCount, humanCount - 1);
        const humanOniCount = Math.max(1, maxHumanOni);
        
        console.log(`[GameManager] assignRandomOni: Assigning ${humanOniCount} human ONI (max: ${maxHumanOni})`);
        
        // Assign humans as oni
        let assignedOniCount = 0;
        for (let i = 0; i < humanOniCount && i < shuffledHumans.length; i++) {
          const selectedPlayer = shuffledHumans[i];
          if (selectedPlayer) {
            selectedPlayer.isOni = true;
            assignedOniCount++;
            console.log(`[GameManager] assignRandomOni: Assigned human ${selectedPlayer.username} (${selectedPlayer.id}) as ONI`);
          }
        }
        
        // If we need more oni, assign from AI players only (to preserve human runners)
        if (assignedOniCount < oniCount) {
          const aiPlayers = gameState.players.filter(p => p.isAI && !p.isOni);
          const shuffledAI = [...aiPlayers].sort(() => Math.random() - 0.5);
          
          for (let i = 0; i < shuffledAI.length && assignedOniCount < oniCount; i++) {
            const selectedPlayer = shuffledAI[i];
            if (selectedPlayer) {
              selectedPlayer.isOni = true;
              assignedOniCount++;
              console.log(`[GameManager] assignRandomOni: Assigned AI ${selectedPlayer.username} (${selectedPlayer.id}) as ONI`);
            }
          }
        }
        
        // Log human distribution
        const humanOni = gameState.players.filter(p => !p.isAI && p.isOni).length;
        const humanRunner = gameState.players.filter(p => !p.isAI && !p.isOni).length;
        console.log(`[GameManager] assignRandomOni: Human distribution - ONI: ${humanOni}, Runner: ${humanRunner}`);
      }
      // No human players (all AI) - random assignment
      else {
        console.log(`[GameManager] assignRandomOni: No human players - random assignment`);
        
        // Shuffle all players
        const shuffled = [...gameState.players].sort(() => Math.random() - 0.5);
        
        // Select first N players as oni
        for (let i = 0; i < oniCount && i < shuffled.length; i++) {
          const selectedPlayer = shuffled[i];
          if (selectedPlayer) {
            selectedPlayer.isOni = true;
            console.log(`[GameManager] assignRandomOni: Assigned ${selectedPlayer.username} (${selectedPlayer.id}) as ONI`);
          }
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
