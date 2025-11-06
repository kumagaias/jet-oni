import type {
  CreateGameRequest,
  CreateGameResponse,
  JoinGameRequest,
  JoinGameResponse,
  GetGameStateResponse,
  UpdatePlayerStateRequest,
  UpdatePlayerStateResponse,
  EndGameRequest,
  EndGameResponse,
  GameListResponse,
} from '../../shared/types/api.js';
import type { GameConfig, GameState } from '../../shared/types/game.js';
import type { ToastNotification } from '../ui/toast-notification.js';
import type { I18n } from '../i18n/i18n.js';

/**
 * Configuration for GameAPIClient
 */
export interface GameAPIClientConfig {
  baseUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  toast?: ToastNotification;
  i18n?: I18n;
  showErrors?: boolean;
}

/**
 * Error thrown by GameAPIClient
 */
export class GameAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'GameAPIError';
  }
}

/**
 * Client for communicating with the game server API
 * Handles all HTTP requests with error handling and retry logic
 */
export class GameAPIClient {
  private baseUrl: string;
  private maxRetries: number;
  private retryDelay: number;
  private timeout: number;
  private toast?: ToastNotification;
  private i18n?: I18n;
  private showErrors: boolean;

  constructor(config: GameAPIClientConfig = {}) {
    this.baseUrl = config.baseUrl || '/api';
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.timeout = config.timeout ?? 5000;
    this.toast = config.toast;
    this.i18n = config.i18n;
    this.showErrors = config.showErrors ?? true;
  }

  /**
   * Create a new game session
   */
  async createGame(config: GameConfig): Promise<CreateGameResponse> {
    const request: CreateGameRequest = { config };
    return this.post<CreateGameResponse>('/game/create', request);
  }

  /**
   * Join an existing game session
   */
  async joinGame(gameId: string, username: string): Promise<JoinGameResponse> {
    const request: JoinGameRequest = { gameId, username };
    return this.post<JoinGameResponse>('/game/join', request);
  }

  /**
   * Get current game state
   */
  async getGameState(gameId: string): Promise<GameState> {
    const response = await this.get<GetGameStateResponse>(`/game/${gameId}`);
    
    if (!response.success || !response.gameState) {
      throw new GameAPIError(
        response.error || 'Failed to get game state',
        404
      );
    }
    
    return response.gameState;
  }

  /**
   * Update player state in the game
   */
  async updatePlayerState(
    gameId: string,
    playerId: string,
    state: Partial<UpdatePlayerStateRequest>
  ): Promise<void> {
    const request: UpdatePlayerStateRequest = {
      gameId,
      playerId,
      ...state,
    } as UpdatePlayerStateRequest;
    
    const response = await this.post<UpdatePlayerStateResponse>(
      `/game/${gameId}/update`,
      request
    );
    
    if (!response.success) {
      throw new GameAPIError(
        response.error || 'Failed to update player state',
        400
      );
    }
  }

  /**
   * End the game and get results
   */
  async endGame(gameId: string): Promise<EndGameResponse> {
    return this.post<EndGameResponse>(`/game/${gameId}/end`, {});
  }

  /**
   * List all available games
   */
  async listGames(): Promise<GameListResponse> {
    // Try /games first (plural), fallback to /game/list if needed
    try {
      return await this.get<GameListResponse>('/games');
    } catch (error) {
      // Fallback to /game/list
      return this.get<GameListResponse>('/game/list');
    }
  }

  /**
   * Replace a disconnected player with an AI player
   */
  async replacePlayerWithAI(gameId: string, playerId: string): Promise<void> {
    const response = await this.post<{ success: boolean; error?: string }>(
      `/game/${gameId}/replace-player`,
      { playerId }
    );

    if (!response.success) {
      throw new GameAPIError(
        response.error || 'Failed to replace player with AI',
        400
      );
    }
  }

  /**
   * Add AI players to fill empty slots in a game
   */
  async addAIPlayers(gameId: string): Promise<void> {
    const response = await this.post<{ success: boolean; error?: string }>(
      `/game/${gameId}/add-ai`,
      {}
    );

    if (!response.success) {
      throw new GameAPIError(
        response.error || 'Failed to add AI players',
        400
      );
    }
  }

  /**
   * Send heartbeat to update host activity timestamp
   */
  async sendHeartbeat(gameId: string): Promise<void> {
    try {
      const response = await this.post<{ success: boolean; error?: string }>(
        `/game/${gameId}/heartbeat`,
        {}
      );

      if (!response.success) {
        console.warn('Heartbeat failed:', response.error);
      }
    } catch (error) {
      // Don't throw on heartbeat errors, just log
      console.warn('Heartbeat error:', error);
    }
  }

  /**
   * Delete a game (host only)
   */
  async deleteGame(gameId: string): Promise<void> {
    const response = await this.delete<{ success: boolean; error?: string }>(
      `/game/${gameId}`
    );

    if (!response.success) {
      throw new GameAPIError(
        response.error || 'Failed to delete game',
        400
      );
    }
  }

  /**
   * Leave a game (participant only)
   */
  async leaveGame(gameId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.post<{ success: boolean; error?: string }>(
        `/game/${gameId}/leave`,
        { playerId }
      );

      return response;
    } catch (error) {
      console.error('Failed to leave game:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave game',
      };
    }
  }

  /**
   * Generic GET request with retry logic
   */
  private async get<T>(endpoint: string): Promise<T> {
    return this.fetchWithRetry<T>(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generic POST request with retry logic
   */
  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.fetchWithRetry<T>(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  /**
   * Generic DELETE request with retry logic
   */
  private async delete<T>(endpoint: string): Promise<T> {
    return this.fetchWithRetry<T>(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetch with retry logic and exponential backoff
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    attempt = 0
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new GameAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      // Handle abort errors (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        if (attempt < this.maxRetries) {
          this.showRetryMessage(attempt + 1);
          await this.delay(this.calculateBackoff(attempt));
          return this.fetchWithRetry<T>(url, options, attempt + 1);
        }
        this.showErrorMessage('timeout');
        throw new GameAPIError('Request timeout', 408, error);
      }

      // Handle network errors
      if (error instanceof TypeError) {
        if (attempt < this.maxRetries) {
          this.showRetryMessage(attempt + 1);
          await this.delay(this.calculateBackoff(attempt));
          return this.fetchWithRetry<T>(url, options, attempt + 1);
        }
        this.showErrorMessage('networkError');
        throw new GameAPIError('Network error', undefined, error);
      }

      // Handle API errors
      if (error instanceof GameAPIError) {
        // Retry on 5xx errors
        if (
          error.statusCode &&
          error.statusCode >= 500 &&
          attempt < this.maxRetries
        ) {
          this.showRetryMessage(attempt + 1);
          await this.delay(this.calculateBackoff(attempt));
          return this.fetchWithRetry<T>(url, options, attempt + 1);
        }
        this.showErrorMessageForStatus(error.statusCode);
        throw error;
      }

      // Unknown error
      this.showErrorMessage('unknown');
      throw new GameAPIError(
        'Unknown error occurred',
        undefined,
        error as Error
      );
    }
  }

  /**
   * Show error message based on status code
   */
  private showErrorMessageForStatus(statusCode?: number): void {
    if (!this.showErrors || !this.toast || !this.i18n) return;

    let messageKey = 'error.unknown';
    
    if (statusCode === 400) {
      messageKey = 'error.validationError';
    } else if (statusCode === 404) {
      messageKey = 'error.gameNotFound';
    } else if (statusCode && statusCode >= 500) {
      messageKey = 'error.serverError';
    }

    const message = this.i18n.t(messageKey);
    this.toast.error(message);
  }

  /**
   * Show error message
   */
  private showErrorMessage(errorType: string): void {
    if (!this.showErrors || !this.toast || !this.i18n) return;

    const messageKey = `error.${errorType}`;
    const message = this.i18n.t(messageKey);
    this.toast.error(message);
  }

  /**
   * Show retry message
   */
  private showRetryMessage(attempt: number): void {
    if (!this.showErrors || !this.toast || !this.i18n) return;

    const message = this.i18n.t('error.retrying', {
      attempt: attempt.toString(),
      max: this.maxRetries.toString(),
    });
    this.toast.warning(message, 2000);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    return this.retryDelay * Math.pow(2, attempt);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
