/**
 * Screen Fade Effect - Fades screen to black and back
 * Used for game start transitions to hide player spawn positions
 */
export class ScreenFade {
  private overlay: HTMLDivElement;
  private isActive: boolean = false;

  constructor() {
    // Create fade overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'screen-fade-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: black;
      opacity: 0;
      pointer-events: none;
      z-index: 9999;
      transition: opacity 0.5s ease-in-out;
    `;
    document.body.appendChild(this.overlay);
  }

  /**
   * Fade to black, wait, then fade back
   * @param fadeOutDuration Duration of fade out in ms (default: 500ms)
   * @param holdDuration Duration to hold black screen in ms (default: 1000ms)
   * @param fadeInDuration Duration of fade in in ms (default: 500ms)
   * @returns Promise that resolves when fade sequence is complete
   */
  public async fadeSequence(
    fadeOutDuration: number = 500,
    holdDuration: number = 1000,
    fadeInDuration: number = 500
  ): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;

    // Fade out to black
    await this.fadeOut(fadeOutDuration);

    // Hold black screen
    await this.wait(holdDuration);

    // Fade in from black
    await this.fadeIn(fadeInDuration);

    this.isActive = false;
  }

  /**
   * Fade to black
   */
  private async fadeOut(duration: number): Promise<void> {
    this.overlay.style.transition = `opacity ${duration}ms ease-in-out`;
    this.overlay.style.opacity = '1';
    await this.wait(duration);
  }

  /**
   * Fade from black
   */
  private async fadeIn(duration: number): Promise<void> {
    this.overlay.style.transition = `opacity ${duration}ms ease-in-out`;
    this.overlay.style.opacity = '0';
    await this.wait(duration);
  }

  /**
   * Wait for specified duration
   */
  private wait(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Immediately set screen to black (no animation)
   */
  public setBlack(): void {
    this.overlay.style.transition = 'none';
    this.overlay.style.opacity = '1';
  }

  /**
   * Immediately clear screen (no animation)
   */
  public clear(): void {
    this.overlay.style.transition = 'none';
    this.overlay.style.opacity = '0';
  }

  /**
   * Check if fade is currently active
   */
  public isAnimating(): boolean {
    return this.isActive;
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    if (this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
  }
}
