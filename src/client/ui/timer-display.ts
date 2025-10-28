import { TIMER_WARNING_THRESHOLD, TIMER_DANGER_THRESHOLD } from '../../shared/constants';

/**
 * TimerDisplay manages the countdown timer UI
 */
export class TimerDisplay {
  private timerElement: HTMLElement | null = null;

  constructor() {
    this.createTimerElement();
  }

  /**
   * Create the timer display element
   */
  private createTimerElement(): void {
    this.timerElement = document.createElement('div');
    this.timerElement.id = 'timer-display';
    this.timerElement.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 48px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      z-index: 100;
      font-family: 'Arial', sans-serif;
      pointer-events: none;
      transition: color 0.3s ease;
    `;
    document.body.appendChild(this.timerElement);
  }

  /**
   * Update the timer display with remaining time
   * @param remainingSeconds - Remaining time in seconds
   */
  public update(remainingSeconds: number): void {
    if (!this.timerElement) return;

    // Format time as MM:SS
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    this.timerElement.textContent = timeString;

    // Update color based on remaining time
    if (remainingSeconds <= TIMER_DANGER_THRESHOLD) {
      this.timerElement.style.color = '#ff0000'; // Red for danger
    } else if (remainingSeconds <= TIMER_WARNING_THRESHOLD) {
      this.timerElement.style.color = '#ffaa00'; // Orange/yellow for warning
    } else {
      this.timerElement.style.color = '#ffffff'; // White for normal
    }
  }

  /**
   * Show the timer display
   */
  public show(): void {
    if (this.timerElement) {
      this.timerElement.style.display = 'block';
    }
  }

  /**
   * Hide the timer display
   */
  public hide(): void {
    if (this.timerElement) {
      this.timerElement.style.display = 'none';
    }
  }

  /**
   * Remove the timer display from DOM
   */
  public dispose(): void {
    if (this.timerElement && this.timerElement.parentNode) {
      this.timerElement.parentNode.removeChild(this.timerElement);
      this.timerElement = null;
    }
  }
}
