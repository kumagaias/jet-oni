import { GameState, GameConfig, Player } from '../../shared/types/game';
import { GameListItem, GameResults, PlayerResult } from '../../shared/types/api';
import { redis } from '@devvit/web/server';

/**
 * GameManager handles game session creation, player management, and game state
 */
export class GameManager {
  private readonly GAME_KEY_PREFIX = 'game:';
  private readonly GAMES_LIST_KEY = 'games:active';
  private readonly GAME_TTL = 3600; // 1 hour in seconds

  /**
   * Create a new game session
   */
  async createGame(config: GameConfig): Promise<string> {
    const gameId = this.generateGameId();
    const hostId = this.generatePlayerId();

    const gameState: GameState = {
      gameId,
      hostId,
      status: 'lobby',
      config,
      players: [],
      startTime: 0,
      endTime: 0,
      currentRound: 0,
      timeRemaining: config.roundDuration,
    };

    // Save game state to Redis
    await this.saveGameState(gameState);

    // Add to active games list
    await redis.sAdd(this.GAMES_LIST_KEY, gameId);

    return gameId;
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
      fuel: 100,
      survivedTime: 0,
      wasTagged: false,
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
    const key = this.getGameKey(gameId);
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as GameState;
    } catch (error) {
      console.error('Error parsing game state:', error);
      return null;
    }
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

    // Winner is the player with longest survival time who wasn't tagged
    const winner = playerResults.find((p) => !p.wasTagged) || playerResults[0];

    const results: GameResults = {
      players: playerResults,
      winner,
    };

    await this.saveGameState(gameState);

    // Remove from active games list
    await redis.sRem(this.GAMES_LIST_KEY, gameId);

    return results;
  }

  /**
   * List all active games
   */
  async listGames(): Promise<GameListItem[]> {
    const gameIds = await redis.sMembers(this.GAMES_LIST_KEY);

    if (!gameIds || gameIds.length === 0) {
      return [];
    }

    const games: GameListItem[] = [];

    for (const gameId of gameIds) {
      const gameState = await this.getGameState(gameId);

      if (gameState) {
        const hostPlayer = gameState.players.find((p) => p.id === gameState.hostId);

        games.push({
          gameId: gameState.gameId,
          hostUsername: hostPlayer?.username || 'Unknown',
          currentPlayers: gameState.players.length,
          totalPlayers: gameState.config.totalPlayers,
          roundDuration: gameState.config.roundDuration,
          rounds: gameState.config.rounds,
          status: gameState.status,
        });
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
      return;
    }

    const slotsToFill = gameState.config.totalPlayers - gameState.players.length;

    for (let i = 0; i < slotsToFill; i++) {
      const aiPlayer: Player = {
        id: this.generatePlayerId(),
        username: `AI_${i + 1}`,
        isOni: false,
        isAI: true,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      };

      gameState.players.push(aiPlayer);
    }

    // Assign random oni if not already assigned
    if (!gameState.players.some((p) => p.isOni)) {
      this.assignRandomOni(gameState);
    }

    await this.saveGameState(gameState);
  }

  /**
   * Randomly assign one player as oni
   */
  private assignRandomOni(gameState: GameState): void {
    if (gameState.players.length === 0) {
      return;
    }

    // Reset all players to runner
    gameState.players.forEach((player) => {
      player.isOni = false;
    });

    // Randomly select one player as oni
    const randomIndex = Math.floor(Math.random() * gameState.players.length);
    gameState.players[randomIndex].isOni = true;
  }

  /**
   * Save game state to Redis
   */
  private async saveGameState(gameState: GameState): Promise<void> {
    const key = this.getGameKey(gameState.gameId);
    const data = JSON.stringify(gameState);
    await redis.set(key, data, { expiration: new Date(Date.now() + this.GAME_TTL * 1000) });
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
   * Get Redis key for game
   */
  private getGameKey(gameId: string): string {
    return `${this.GAME_KEY_PREFIX}${gameId}`;
  }
}
