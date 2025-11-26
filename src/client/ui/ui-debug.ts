import { GameState } from '../game/game-state';
import { I18n } from '../i18n/i18n';

/**
 * UIDebug manages the debug information overlay
 * Toggled with F3 key
 */
export class UIDebug {
  private debugContainer: HTMLElement | null = null;
  private isVisible = false;
  private gameState: GameState;
  private i18n: I18n;
  private fps = 0;
  private frameCount = 0;
  private lastFpsUpdate = 0;

  constructor(gameState: GameState, i18n: I18n) {
    this.gameState = gameState;
    this.i18n = i18n;
    this.createDebugElements();
    this.setupKeyListener();
  }

  /**
   * Create debug overlay elements
   */
  private createDebugElements(): void {
    this.debugContainer = document.createElement('div');
    this.debugContainer.id = 'debug-container';
    this.debugContainer.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background-color: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 20px;
      line-height: 1.6;
      padding: 15px;
      border-radius: 8px;
      min-width: 300px;
      z-index: 1000;
      pointer-events: none;
      display: none;
      min-width: 250px;
      line-height: 1.5;
    `;
    document.body.appendChild(this.debugContainer);
  }

  /**
   * Setup F3 key listener to toggle debug display (dev environment only)
   */
  private setupKeyListener(): void {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      // Check if in dev environment
      const url = window.location.href.toLowerCase();
      const isDevEnvironment = url.includes('jet_oni_dev') || 
                               url.includes('localhost') ||
                               url.includes('playtest');
      
      if (event.key === 'F3' && isDevEnvironment) {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Toggle debug display visibility
   */
  public toggle(): void {
    this.isVisible = !this.isVisible;
    if (this.debugContainer) {
      this.debugContainer.style.display = this.isVisible ? 'block' : 'none';
    }
  }

  /**
   * Show debug display
   */
  public show(): void {
    this.isVisible = true;
    if (this.debugContainer) {
      this.debugContainer.style.display = 'block';
    }
  }

  /**
   * Hide debug display
   */
  public hide(): void {
    this.isVisible = false;
    if (this.debugContainer) {
      this.debugContainer.style.display = 'none';
    }
  }

  /**
   * Update FPS counter
   */
  public updateFps(): void {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  /**
   * Update debug information display
   */
  public update(): void {
    if (!this.isVisible || !this.debugContainer) return;

    const localPlayer = this.gameState.getLocalPlayer();
    const allPlayers = this.gameState.getAllPlayers();
    const aiPlayers = allPlayers.filter(p => p.isAI);
    const oniPlayers = allPlayers.filter(p => p.isOni);

    // Format position
    const posX = localPlayer.position.x.toFixed(2);
    const posY = localPlayer.position.y.toFixed(2);
    const posZ = localPlayer.position.z.toFixed(2);

    // Format velocity
    const velX = localPlayer.velocity.x.toFixed(2);
    const velY = localPlayer.velocity.y.toFixed(2);
    const velZ = localPlayer.velocity.z.toFixed(2);
    const speed = Math.sqrt(
      localPlayer.velocity.x ** 2 +
      localPlayer.velocity.y ** 2 +
      localPlayer.velocity.z ** 2
    ).toFixed(2);

    // Build debug info text
    const debugInfo = [
      `=== ${this.i18n.t('debug.title')} ===`,
      '',
      `${this.i18n.t('debug.fps')}: ${this.fps}`,
      '',
      `${this.i18n.t('debug.position')}: (${posX}, ${posY}, ${posZ})`,
      `${this.i18n.t('debug.velocity')}: (${velX}, ${velY}, ${velZ})`,
      `Speed: ${speed} u/s`,
      '',
      `${this.i18n.t('debug.fuel')}: ${Math.round(localPlayer.fuel)}`,
      `${this.i18n.t('debug.isOni')}: ${localPlayer.isOni}`,
      `${this.i18n.t('debug.onGround')}: ${localPlayer.isOnSurface}`,
      `Dashing: ${localPlayer.isDashing}`,
      `Jetpacking: ${localPlayer.isJetpacking}`,
      `Climbing: ${localPlayer.isClimbing}`,
      '',
      `${this.i18n.t('debug.players')}: ${allPlayers.length}`,
      `ONI: ${oniPlayers.length}`,
      `Runners: ${allPlayers.length - oniPlayers.length}`,
      `${this.i18n.t('debug.aiPlayers')}: ${aiPlayers.length}`,
      '',
      `Game Phase: ${this.gameState.getGamePhase()}`,
      `Round: ${this.gameState.getCurrentRound()}`,
    ];

    // Add remaining time if playing
    if (this.gameState.isPlaying()) {
      const remainingTime = this.gameState.getRemainingTime();
      const minutes = Math.floor(remainingTime / 60);
      const seconds = Math.floor(remainingTime % 60);
      debugInfo.push(`Time Left: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }

    this.debugContainer.innerHTML = debugInfo.join('<br>');
  }

  /**
   * Update language
   */
  public updateLanguage(): void {
    // Debug info will be updated on next update() call
  }

  /**
   * Remove debug overlay from DOM
   */
  public dispose(): void {
    if (this.debugContainer && this.debugContainer.parentNode) {
      this.debugContainer.parentNode.removeChild(this.debugContainer);
      this.debugContainer = null;
    }
  }
}
