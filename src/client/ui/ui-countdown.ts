import { I18n } from '../i18n/i18n';

/**
 * UICountdown displays a countdown timer in the center of the screen
 */
export class UICountdown {
  private container: HTMLElement | null = null;
  private countdownValue: number = 3;
  private onComplete?: () => void;
  private intervalId: number | null = null;
  private i18n: I18n;

  constructor(i18n: I18n) {
    this.i18n = i18n;
  }

  /**
   * Start countdown with timestamp synchronization
   */
  public start(seconds: number, onComplete: () => void, startTimestamp?: number): void {
    this.countdownValue = seconds;
    this.onComplete = onComplete;

    // Create container
    this.create();

    // If startTimestamp provided, use it for synchronization
    if (startTimestamp) {
      const endTime = startTimestamp + seconds * 1000;
      
      // Update display immediately
      const remaining = Math.ceil((endTime - Date.now()) / 1000);
      this.countdownValue = Math.max(0, remaining);
      this.updateDisplay();
      
      // Use requestAnimationFrame for smoother updates
      const updateCountdown = () => {
        const remaining = Math.ceil((endTime - Date.now()) / 1000);
        const newValue = Math.max(0, remaining);
        
        if (newValue !== this.countdownValue) {
          this.countdownValue = newValue;
          this.updateDisplay();
        }
        
        if (this.countdownValue <= 0) {
          this.complete();
        } else {
          requestAnimationFrame(updateCountdown);
        }
      };
      
      requestAnimationFrame(updateCountdown);
    } else {
      // Fallback to interval-based countdown
      this.updateDisplay();
      
      this.intervalId = window.setInterval(() => {
        this.countdownValue--;

        if (this.countdownValue <= 0) {
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
      background: transparent;
      z-index: 9999;
      pointer-events: none;
    `;

    const countdownText = document.createElement('div');
    countdownText.id = 'countdown-text';
    countdownText.style.cssText = `
      font-size: 180px;
      font-weight: bold;
      color: #ff8800;
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
  }

  /**
   * Complete countdown and show game start message
   */
  private complete(): void {
    // Stop interval
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Show "Game Start!!" message
    const countdownText = document.getElementById('countdown-text');
    if (countdownText) {
      countdownText.textContent = 'Game Start!!';
      countdownText.style.color = '#ff8800';
      countdownText.style.fontSize = '100px';
      countdownText.style.textShadow = `
        0 0 30px rgba(255, 136, 0, 1),
        0 0 60px rgba(255, 136, 0, 0.8),
        0 0 90px rgba(255, 100, 0, 0.6)
      `;
    }

    // Hide after 300ms and call onComplete
    setTimeout(() => {
      this.hide();
      if (this.onComplete) {
        this.onComplete();
      }
    }, 300); // Reduced to 300ms for faster transition
  }

  /**
   * Hide countdown
   */
  public hide(): void {
    // Clear interval first
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

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
  }

  /**
   * Check if countdown is active
   */
  public isActive(): boolean {
    return this.container !== null;
  }
}
