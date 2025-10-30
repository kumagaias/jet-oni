import { GameAPIClient } from '../api/game-api-client';

/**
 * HostMonitor monitors host connection and handles disconnection
 */
export class HostMonitor {
  private gameApiClient: GameAPIClient;
  private heartbeatInterval: number | null = null;
  private checkInterval: number | null = null;
  private currentGameId: string | null = null;
  private onHostDisconnectCallback?: () => void;

  private readonly HEARTBEAT_INTERVAL = 10 * 1000; // Send heartbeat every 10 seconds
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

    // Send heartbeat every 10 seconds
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
        return;
      }

      const now = Date.now();
      const timeSinceHeartbeat = now - gameState.lastHostHeartbeat;

      if (timeSinceHeartbeat > this.HOST_TIMEOUT) {
        console.error('[HostMonitor] Host disconnected!');
        this.handleHostDisconnect();
      }
    } catch (error) {
      console.error('[HostMonitor] Error checking host status:', error);
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
