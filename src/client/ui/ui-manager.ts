/**
 * UIManager - Manages all UI screens and transitions
 */

export type UIScreen = 'title' | 'create-game' | 'join-game' | 'lobby' | 'playing' | 'results' | 'stats';

export class UIManager {
  private currentScreen: UIScreen = 'title';
  private overlay: HTMLElement;
  private onScreenChange?: (screen: UIScreen) => void;

  constructor() {
    const overlay = document.querySelector('.overlay') as HTMLElement;
    if (!overlay) {
      throw new Error('Overlay element not found');
    }
    this.overlay = overlay;
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
}
