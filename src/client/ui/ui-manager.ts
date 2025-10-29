import { ConnectionIndicator } from './connection-indicator.js';
import type { ConnectionStatus } from './connection-indicator.js';

/**
 * UIManager - Manages all UI screens and transitions
 */

export type UIScreen = 'title' | 'create-game' | 'join-game' | 'lobby' | 'playing' | 'results' | 'stats';

export class UIManager {
  private currentScreen: UIScreen = 'title';
  private overlay: HTMLElement;
  private onScreenChange?: (screen: UIScreen) => void;
  private connectionIndicator: ConnectionIndicator;

  constructor() {
    const overlay = document.querySelector('.overlay') as HTMLElement;
    if (!overlay) {
      throw new Error('Overlay element not found');
    }
    this.overlay = overlay;
    
    // Initialize connection indicator
    this.connectionIndicator = new ConnectionIndicator();
    this.connectionIndicator.init();
    this.connectionIndicator.hide(); // Hidden by default
  }

  /**
   * Get current screen
   */
  public getCurrentScreen(): UIScreen {
    return this.currentScreen;
  }

  /**
   * Show a specific screen
   */
  public showScreen(screen: UIScreen, data?: unknown): void {
    this.currentScreen = screen;
    
    // Clear overlay
    this.overlay.innerHTML = '';
    
    // Notify listeners
    if (this.onScreenChange) {
      this.onScreenChange(screen);
    }
  }

  /**
   * Register screen change callback
   */
  public onScreenChangeCallback(callback: (screen: UIScreen) => void): void {
    this.onScreenChange = callback;
  }

  /**
   * Get overlay element
   */
  public getOverlay(): HTMLElement {
    return this.overlay;
  }

  /**
   * Hide overlay (for playing state)
   */
  public hideOverlay(): void {
    this.overlay.style.display = 'none';
  }

  /**
   * Show overlay
   */
  public showOverlay(): void {
    this.overlay.style.display = 'flex';
  }

  /**
   * Set connection status
   */
  public setConnectionStatus(status: ConnectionStatus): void {
    this.connectionIndicator.setStatus(status);
  }

  /**
   * Show connection indicator
   */
  public showConnectionIndicator(): void {
    this.connectionIndicator.show();
  }

  /**
   * Hide connection indicator
   */
  public hideConnectionIndicator(): void {
    this.connectionIndicator.hide();
  }

  /**
   * Get connection indicator
   */
  public getConnectionIndicator(): ConnectionIndicator {
    return this.connectionIndicator;
  }
}
