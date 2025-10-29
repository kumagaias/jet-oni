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
   * Start countdown
   */
  public start(seconds: number, onComplete: () => void): void {
    this.countdownValue = seconds;
    this.onComplete = onComplete;

    // Create container
    this.create();

    // Update display
    this.updateDisplay();

    // Start countdown
    this.intervalId = window.setInterval(() => {
      this.countdownValue--;

      if (this.countdownValue <= 0) {
        this.complete();
      } else {
        this.updateDisplay();
      }
    }, 1000);
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
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      pointer-events: none;
    `;

    const countdownText = document.createElement('div');
    countdownText.id = 'countdown-text';
    countdownText.style.cssText = `
      font-size: 120px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 0 0 20px rgba(255, 255, 255, 0.8),
                   0 0 40px rgba(255, 136, 0, 0.6);
      animation: pulse 1s ease-in-out;
    `;

    const messageText = document.createElement('div');
    messageText.id = 'countdown-message';
    messageText.textContent = this.i18n.t('countdown.getReady');
    messageText.style.cssText = `
      font-size: 32px;
      color: #ffffff;
      margin-top: 20px;
      text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
    `;

    this.container.appendChild(countdownText);
    this.container.appendChild(messageText);

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.8; }
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
      // Restart animation
      countdownText.style.animation = 'none';
      setTimeout(() => {
        countdownText.style.animation = 'pulse 1s ease-in-out';
      }, 10);
    }
  }

  /**
   * Complete countdown
   */
  private complete(): void {
    // Stop interval
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Show "GO!" message
    const countdownText = document.getElementById('countdown-text');
    if (countdownText) {
      countdownText.textContent = this.i18n.t('countdown.go');
      countdownText.style.color = '#00ff00';
    }

    // Hide after 1 second
    setTimeout(() => {
      this.hide();
      if (this.onComplete) {
        this.onComplete();
      }
    }, 1000);
  }

  /**
   * Hide countdown
   */
  public hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check if countdown is active
   */
  public isActive(): boolean {
    return this.container !== null;
  }
}
