import { GameAPIClient } from '../api/game-api-client';

/**
 * HostMonitor monitors host connection and handles disconnection
 * Also sends participant heartbeats to maintain connection
 */
export class HostMonitor {
  private gameApiClient: GameAPIClient;
  private heartbeatInterval: number | null = null;
  private checkInterval: number | null = null;
  private currentGameId: string | null = null;
  private onHostDisconnectCallback?: () => void;
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private isHost = false;

  private readonly HEARTBEAT_INTERVAL = 5 * 1000; // Send heartbeat every 5 seconds
  private readonly CHECK_INTERVAL = 5 * 1000; // Check host status every 5 seconds
  private readonly HOST_TIMEOUT = 30 * 1000; // 30 seconds timeout

  constructor(gameApiClient: GameAPIClient) {
    this.gameApiClient = gameApiClient;
  }

  /**
   * Start monitoring as host
   */
  public startAsHost(gameId: string): void {
    this.currentGameId = gameId;
    this.consecutiveFailures = 0;
    this.isHost = true;

    // Send heartbeat every 5 seconds
    this.heartbeatInterval = window.setInterval(() => {
      if (this.currentGameId) {
        void this.gameApiClient.sendHeartbeat(this.currentGameId);
      }
    }, this.HEARTBEAT_INTERVAL);

  }

  /**
   * Start monitoring as participant
   */
  public startAsParticipant(gameId: string): void {
    this.currentGameId = gameId;
    this.consecutiveFailures = 0;
    this.isHost = false;

    // Send participant heartbeat every 5 seconds
    this.heartbeatInterval = window.setInterval(() => {
      if (this.currentGameId) {
        void this.gameApiClient.sendHeartbeat(this.currentGameId);
      }
    }, this.HEARTBEAT_INTERVAL);

    // Check host status every 5 seconds
    this.checkInterval = window.setInterval(() => {
      void this.checkHostStatus();
    }, this.CHECK_INTERVAL);

  }

  /**
   * Check if host is still active
   */
  private async checkHostStatus(): Promise<void> {
    if (!this.currentGameId) return;

    try {
      const gameState = await this.gameApiClient.getGameState(this.currentGameId);

      if (!gameState.lastHostHeartbeat) {
        console.warn('[HostMonitor] No heartbeat data available');
        this.consecutiveFailures++;
        
        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          console.error('[HostMonitor] Host disconnected! (No heartbeat data after 3 attempts)');
          this.handleHostDisconnect();
        }
        return;
      }

      const now = Date.now();
      const timeSinceHeartbeat = now - gameState.lastHostHeartbeat;

      if (timeSinceHeartbeat > this.HOST_TIMEOUT) {
        this.consecutiveFailures++;
        console.warn(`[HostMonitor] Host heartbeat timeout (${this.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES})`);
        
        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          console.error('[HostMonitor] Host disconnected! (3 consecutive failures)');
          this.handleHostDisconnect();
        }
      } else {
        // Reset failure count on successful check
        this.consecutiveFailures = 0;
      }
    } catch (error) {
      // Check if it's a 404 error (game deleted)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('404')) {
        console.error('[HostMonitor] Game not found (404) - Host has deleted the game');
        // Immediately disconnect on 404 (game deleted)
        this.handleHostDisconnect();
        return;
      }
      
      this.consecutiveFailures++;
      console.error(`[HostMonitor] Error checking host status (${this.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES}):`, error);
      
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        console.error('[HostMonitor] Host disconnected! (3 consecutive API failures)');
        this.handleHostDisconnect();
      }
    }
  }

  /**
   * Handle host disconnection
   */
  private handleHostDisconnect(): void {
    this.stop();

    if (this.onHostDisconnectCallback) {
      this.onHostDisconnectCallback();
    }
  }

  /**
   * Set callback for host disconnect event
   */
  public onHostDisconnect(callback: () => void): void {
    this.onHostDisconnectCallback = callback;
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.currentGameId = null;
    this.consecutiveFailures = 0;
    this.isHost = false;
  }

  /**
   * Delete game when host exits (lobby or game end)
   */
  public async deleteGameOnExit(): Promise<void> {
    if (!this.currentGameId) {
      console.warn('[HostMonitor] No game to delete');
      return;
    }

    const gameId = this.currentGameId;
    this.stop(); // Stop monitoring first

    try {
      await this.gameApiClient.deleteGame(gameId);
    } catch (error) {
      console.error('[HostMonitor] Failed to delete game:', error);
    }
  }

  /**
   * Check if currently monitoring
   */
  public isMonitoring(): boolean {
    return this.heartbeatInterval !== null || this.checkInterval !== null;
  }
}
