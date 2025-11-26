/**
 * UICountdown displays a countdown timer in the center of the screen
 */
export class UICountdown {
  private container: HTMLElement | null = null;
  private countdownValue: number = 3;
  private onComplete?: () => void;
  private onCountdownChange?: (value: number) => void;
  private intervalId: number | null = null;
  private completeTimerId: number | null = null;
  private hideTimerId: number | null = null;
  private isCompleted: boolean = false;
  private animationFrameId: number | null = null;

  constructor() {
    // No initialization needed
  }

  /**
   * Set callback for countdown value changes
   */
  public setOnCountdownChange(callback: (value: number) => void): void {
    this.onCountdownChange = callback;
  }

  /**
   * Start countdown with timestamp synchronization
   */
  public start(seconds: number, onComplete: () => void, startTimestamp?: number): void {
    // Prevent multiple starts
    if (this.intervalId !== null || this.completeTimerId !== null || this.hideTimerId !== null || this.isCompleted) {
      console.warn('[Countdown] Already running, ignoring start request');
      return;
    }

    this.countdownValue = seconds;
    this.onComplete = onComplete;
    this.isCompleted = false;

    // Create container
    this.create();

    // If startTimestamp provided, use it for synchronization
    if (startTimestamp) {
      const endTime = startTimestamp + seconds * 1000;
      
      // Update display immediately
      const remainingMs = endTime - Date.now();
      this.countdownValue = Math.max(0, Math.floor(remainingMs / 1000));
      this.updateDisplay();
      
      // Use requestAnimationFrame for smoother updates
      const updateCountdown = () => {
        if (this.isCompleted) {
          return; // Stop if already completed
        }

        const remainingMs = endTime - Date.now();
        const newValue = Math.max(0, Math.floor(remainingMs / 1000));
        
        if (newValue !== this.countdownValue) {
          this.countdownValue = newValue;
          this.updateDisplay();
        }
        
        if (remainingMs <= 0) {
          console.log('[Countdown] Time reached 0, calling complete()');
          this.complete();
        } else {
          this.animationFrameId = requestAnimationFrame(updateCountdown);
        }
      };
      
      this.animationFrameId = requestAnimationFrame(updateCountdown);
    } else {
      // Fallback to interval-based countdown
      this.updateDisplay();
      
      this.intervalId = window.setInterval(() => {
        this.countdownValue--;

        if (this.countdownValue <= 0) {
          console.log('[Countdown] Countdown reached 0, calling complete()');
          this.complete();
        } else {
          this.updateDisplay();
        }
      }, 1000);
    }
  }

  /**
   * Create countdown UI
   */
  private create(): void {
    this.container = document.createElement('div');
    this.container.id = 'countdown-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: rgba(0, 0, 0, 0);
      z-index: 99998;
      pointer-events: none;
      transition: background 0.5s ease-out;
    `;

    const countdownText = document.createElement('div');
    countdownText.id = 'countdown-text';
    countdownText.style.cssText = `
      font-size: 180px;
      font-weight: bold;
      color: #ff8800;
      text-align: center;
      width: 100%;
      position: relative;
      z-index: 10000;
      text-shadow: 0 0 30px rgba(255, 136, 0, 1),
                   0 0 60px rgba(255, 136, 0, 0.8),
                   0 0 90px rgba(255, 100, 0, 0.6);
      animation: zoomPulse 1s ease-out;
    `;

    this.container.appendChild(countdownText);

    // Add zoom pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes zoomPulse {
        0% { 
          transform: scale(0.3); 
          opacity: 0;
        }
        50% { 
          transform: scale(1.3); 
          opacity: 1;
        }
        100% { 
          transform: scale(1); 
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(this.container);
  }

  /**
   * Update countdown display
   */
  private updateDisplay(): void {
    const countdownText = document.getElementById('countdown-text');
    if (countdownText) {
      countdownText.textContent = this.countdownValue.toString();
      
      // Change color to orange for 3, 2, 1
      if (this.countdownValue <= 3) {
        countdownText.style.color = '#ff8800';
        countdownText.style.textShadow = `
          0 0 30px rgba(255, 136, 0, 1),
          0 0 60px rgba(255, 136, 0, 0.8),
          0 0 90px rgba(255, 100, 0, 0.6)
        `;
      } else {
        countdownText.style.color = '#ffffff';
        countdownText.style.textShadow = `
          0 0 20px rgba(255, 255, 255, 0.8),
          0 0 40px rgba(255, 136, 0, 0.6)
        `;
      }
      
      // Restart zoom animation
      countdownText.style.animation = 'none';
      setTimeout(() => {
        countdownText.style.animation = 'zoomPulse 1s ease-out';
      }, 10);
    }
    
    // Don't darken background during countdown
    // Background stays transparent until countdown reaches 0
    
    // Notify countdown change
    if (this.onCountdownChange) {
      this.onCountdownChange(this.countdownValue);
    }
  }

  /**
   * Complete countdown and show game start message
   */
  private complete(): void {
    if (this.isCompleted) {
      console.warn('[Countdown] Already completed, ignoring');
      return;
    }

    console.log('[Countdown] complete() called');
    this.isCompleted = true;
    
    // Stop interval
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Stop animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Fade to complete black
    if (this.container) {
      this.container.style.transition = 'background 0.3s ease-out';
      this.container.style.background = 'rgba(0, 0, 0, 1)';
      console.log('[Countdown] Background set to black');
    }

    // Create a separate overlay for "Game Start!!" text on top of everything
    const gameStartOverlay = document.createElement('div');
    gameStartOverlay.id = 'game-start-overlay';
    gameStartOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 100000;
      pointer-events: none;
    `;

    const gameStartText = document.createElement('div');
    gameStartText.textContent = 'Game Start!!';
    gameStartText.style.cssText = `
      color: #ff8800;
      font-size: min(100px, 15vw);
      font-weight: bold;
      text-align: center;
      width: 100%;
      padding: 0 20px;
      box-sizing: border-box;
      white-space: nowrap;
      text-shadow: 
        0 0 30px rgba(255, 136, 0, 1),
        0 0 60px rgba(255, 136, 0, 0.8),
        0 0 90px rgba(255, 100, 0, 0.6);
    `;

    gameStartOverlay.appendChild(gameStartText);
    document.body.appendChild(gameStartOverlay);
    console.log('[Countdown] Game Start overlay created');

    // Trigger game start after a short delay (let black screen appear first)
    this.completeTimerId = window.setTimeout(() => {
      console.log('[Countdown] Triggering onComplete callback');
      if (this.onComplete) {
        this.onComplete();
      } else {
        console.error('[Countdown] onComplete callback is not defined!');
      }
      this.completeTimerId = null;
    }, 100);

    // Keep black screen with "Game Start!!" message for 2 seconds, then hide
    this.hideTimerId = window.setTimeout(() => {
      // Remove game start overlay
      const overlay = document.getElementById('game-start-overlay');
      if (overlay) {
        overlay.remove();
      }
      this.hide();
      this.hideTimerId = null;
    }, 2000); // 2 seconds black screen with "Game Start!!" message
  }

  /**
   * Hide countdown
   */
  public hide(): void {
    // Clear all timers
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.completeTimerId !== null) {
      clearTimeout(this.completeTimerId);
      this.completeTimerId = null;
    }
    
    if (this.hideTimerId !== null) {
      clearTimeout(this.hideTimerId);
      this.hideTimerId = null;
    }

    this.isCompleted = false;

    // Remove container
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    // Also remove by ID as a fallback (in case container reference is lost)
    const overlay = document.getElementById('countdown-overlay');
    if (overlay) {
      overlay.remove();
    }

    const text = document.getElementById('countdown-text');
    if (text) {
      text.remove();
    }

    // Remove game start overlay if it exists
    const gameStartOverlay = document.getElementById('game-start-overlay');
    if (gameStartOverlay) {
      gameStartOverlay.remove();
    }
  }

  /**
   * Check if countdown is active
   */
  public isActive(): boolean {
    return this.container !== null;
  }
}
