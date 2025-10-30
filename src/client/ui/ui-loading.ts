/**
 * UILoading - Simple loading screen component
 * Shows "Loading..." with animation
 */

export class UILoading {
  private container: HTMLElement | null = null;
  private dotsElement: HTMLElement | null = null;
  private animationInterval: number | null = null;

  /**
   * Show loading screen
   */
  public show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
      this.startAnimation();
      return;
    }

    // Create loading container
    this.container = document.createElement('div');
    this.container.id = 'loading-screen';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: monospace;
    `;

    // Loading text
    const loadingText = document.createElement('div');
    loadingText.style.cssText = `
      font-size: 24px;
      color: #ff8800;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 5px;
    `;

    const textSpan = document.createElement('span');
    textSpan.textContent = 'Loading';
    loadingText.appendChild(textSpan);

    // Animated dots
    this.dotsElement = document.createElement('span');
    this.dotsElement.textContent = '';
    this.dotsElement.style.cssText = `
      display: inline-block;
      width: 30px;
      text-align: left;
    `;
    loadingText.appendChild(this.dotsElement);

    this.container.appendChild(loadingText);
    document.body.appendChild(this.container);

    // Start animation
    this.startAnimation();
  }

  /**
   * Hide loading screen
   */
  public hide(): void {
    this.stopAnimation();
    
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Remove loading screen from DOM
   */
  public dispose(): void {
    this.stopAnimation();
    
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.dotsElement = null;
    }
  }

  /**
   * Start dots animation
   */
  private startAnimation(): void {
    if (this.animationInterval !== null) return;

    let dotCount = 0;
    this.animationInterval = window.setInterval(() => {
      if (this.dotsElement) {
        dotCount = (dotCount + 1) % 4;
        this.dotsElement.textContent = '.'.repeat(dotCount);
      }
    }, 500); // Update every 500ms
  }

  /**
   * Stop dots animation
   */
  private stopAnimation(): void {
    if (this.animationInterval !== null) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }
}
