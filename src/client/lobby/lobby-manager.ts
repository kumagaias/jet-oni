/**
 * LobbyManager - Manages the game lobby before game starts
 * Handles player list updates, countdown, and game start logic
 */

import type { GameAPIClient } from '../api/game-api-client.js';
import type { GameState, Player } from '../../shared/types/game.js';


export interface LobbyManagerConfig {
  gameApiClient: GameAPIClient;
  pollInterval?: number;
  countdownDuration?: number;
}

export type LobbyEventType = 'playerJoined' | 'playerLeft' | 'countdownStarted' | 'gameStarting';

export interface LobbyEvent {
  type: LobbyEventType;
  data?: unknown;
}

/**
 * Manages the lobby state and interactions
 */
export class LobbyManager {
  private gameApiClient: GameAPIClient;
  private pollInterval: number;
  private countdownDuration: number;
  
  private gameId: string | null = null;
  private isHost: boolean = false;
  private gameState: GameState | null = null;
  
  private pollTimer: number | null = null;
  private countdownTimer: number | null = null;
  private countdownRemaining: number = 0;
  
  private eventCallbacks: Map<LobbyEventType, Array<(data?: unknown) => void>> = new Map();
  private gameStartCallback: (() => void) | null = null;

  constructor(config: LobbyManagerConfig) {
    this.gameApiClient = config.gameApiClient;
    this.pollInterval = config.pollInterval ?? 1000; // 1 second
    this.countdownDuration = config.countdownDuration ?? 10; // 10 seconds
  }

  /**
   * Initialize lobby with game ID and player ID
   */
  async initialize(gameId: string, _playerId: string, isHost: boolean): Promise<void> {
    this.gameId = gameId;
    this.isHost = isHost;
    
    // Fetch initial game state
    await this.updateGameState();
    
    // Start polling for updates
    this.startPolling();
  }

  /**
   * Clean up and stop lobby manager
   */
  destroy(): void {
    this.stopPolling();
    this.stopCountdown();
    this.gameId = null;
    this.isHost = false;
    this.gameState = null;
    this.eventCallbacks.clear();
    this.gameStartCallback = null;
  }

  /**
   * Get current player list
   */
  getPlayers(): Player[] {
    return this.gameState?.players ?? [];
  }

  /**
   * Get current player count
   */
  getPlayerCount(): number {
    return this.gameState?.players.length ?? 0;
  }

  /**
   * Get maximum player count
   */
  getMaxPlayers(): number {
    return this.gameState?.config.totalPlayers ?? 0;
  }

  /**
   * Get current game state
   */
  getGameState(): GameState | null {
    return this.gameState;
  }

  /**
   * Check if lobby is full
   */
  isFull(): boolean {
    return this.getPlayerCount() >= this.getMaxPlayers();
  }

  /**
   * Check if countdown is active
   */
  isCountdownActive(): boolean {
    return this.countdownTimer !== null;
  }

  /**
   * Get countdown remaining time
   */
  getCountdownRemaining(): number {
    return this.countdownRemaining;
  }

  /**
   * Check if current player is host
   */
  isCurrentPlayerHost(): boolean {
    return this.isHost;
  }

  /**
   * Start game early (host only)
   */
  async startGameEarly(): Promise<void> {
    if (!this.isHost) {
      console.warn('Only host can start game early');
      return;
    }
    
    // Don't start if already counting down
    if (this.isCountdownActive()) {
      return;
    }
    
    // Add AI players to fill empty slots before starting
    if (this.gameId) {
      try {
        await this.gameApiClient.addAIPlayers(this.gameId);
        // Refresh game state after adding AI players
        await this.updateGameState();
      } catch (error) {
        console.error('Failed to add AI players:', error);
      }
    }
    
    // Start 5 second countdown
    this.countdownDuration = 5;
    this.startCountdown();
  }

  /**
   * Register callback for game start
   */
  onGameStart(callback: () => void): void {
    this.gameStartCallback = callback;
  }

  /**
   * Register callback for lobby events
   */
  on(eventType: LobbyEventType, callback: (data?: unknown) => void): void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType)!.push(callback);
  }

  /**
   * Unregister callback for lobby events
   */
  off(eventType: LobbyEventType, callback: (data?: unknown) => void): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Start polling for game state updates
   */
  private startPolling(): void {
    if (this.pollTimer !== null) {
      return;
    }
    
    this.pollTimer = window.setInterval(() => {
      void this.updateGameState();
    }, this.pollInterval);
  }

  /**
   * Stop polling for game state updates
   */
  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Update game state from server
   */
  private async updateGameState(): Promise<void> {
    if (!this.gameId) {
      return;
    }
    
    try {
      const newGameState = await this.gameApiClient.getGameState(this.gameId);
      
      // Check for player changes
      if (this.gameState) {
        this.detectPlayerChanges(this.gameState, newGameState);
      }
      
      this.gameState = newGameState;
      
      // Check if lobby is full and start countdown
      if (this.isFull() && !this.isCountdownActive() && this.gameState.status === 'lobby') {
        this.startCountdown();
      }
      
      // Check if game has started
      if (this.gameState.status === 'playing') {
        this.triggerGameStart();
      }
    } catch (error) {
      console.error('Failed to update game state:', error);
    }
  }

  /**
   * Detect player changes between game states
   */
  private detectPlayerChanges(oldState: GameState, newState: GameState): void {
    const oldPlayerIds = new Set(oldState.players.map(p => p.id));
    const newPlayerIds = new Set(newState.players.map(p => p.id));
    
    // Detect new players
    for (const player of newState.players) {
      if (!oldPlayerIds.has(player.id)) {
        this.emitEvent('playerJoined', { player });
      }
    }
    
    // Detect left players
    for (const player of oldState.players) {
      if (!newPlayerIds.has(player.id)) {
        this.emitEvent('playerLeft', { player });
      }
    }
  }

  /**
   * Start countdown timer
   */
  private startCountdown(): void {
    // Immediately trigger game start (no countdown in lobby)
    this.triggerGameStart();
  }

  /**
   * Stop countdown timer
   */
  private stopCountdown(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
      this.countdownRemaining = 0;
    }
  }

  /**
   * Trigger game start
   */
  private triggerGameStart(): void {
    this.stopPolling();
    this.stopCountdown();
    this.emitEvent('gameStarting');
    
    if (this.gameStartCallback) {
      this.gameStartCallback();
    }
  }

  /**
   * Emit event to registered callbacks
   */
  private emitEvent(eventType: LobbyEventType, data?: unknown): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}
