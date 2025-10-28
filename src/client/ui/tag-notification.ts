import { I18n } from '../i18n/i18n';

/**
 * TagNotification displays toast messages when players are tagged
 */
export class TagNotification {
  private container: HTMLDivElement;
  private i18n: I18n;
  private currentNotification: HTMLDivElement | null = null;
  private animationTimeout: number | null = null;

  constructor(i18n: I18n) {
    this.i18n = i18n;
    this.container = this.createContainer();
    document.body.appendChild(this.container);
  }

  /**
   * Create the notification container
   */
  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'tag-notification-container';
    container.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      pointer-events: none;
    `;
    return container;
  }

  /**
   * Show notification when local player becomes oni
   */
  public showBecameOni(): void {
    this.showNotification(
      this.i18n.t('game.notifications.becameOni'),
      '#ff4444'
    );
  }

  /**
   * Show notification when local player tags someone
   */
  public showTaggedPlayer(playerName: string): void {
    this.showNotification(
      this.i18n.t('game.notifications.taggedPlayer', { player: playerName }),
      '#44ff44'
    );
  }

  /**
   * Show a notification with custom message and color
   */
  private showNotification(message: string, color: string): void {
    // Clear any existing notification
    this.clearNotification();

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'tag-notification';
    notification.textContent = message;
    notification.style.cssText = `
      background: ${color};
      color: white;
      padding: 20px 40px;
      border-radius: 10px;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      animation: tagNotificationSlide 0.5s ease-out;
      opacity: 0;
      transform: translateY(-20px);
    `;

    // Add animation styles if not already present
    this.addAnimationStyles();

    // Add to container
    this.container.appendChild(notification);
    this.currentNotification = notification;

    // Trigger animation
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
      notification.style.transition = 'all 0.5s ease-out';
    });

    // Auto-hide after 3 seconds
    this.animationTimeout = window.setTimeout(() => {
      this.hideNotification();
    }, 3000);
  }

  /**
   * Hide the current notification
   */
  private hideNotification(): void {
    if (!this.currentNotification) return;

    this.currentNotification.style.opacity = '0';
    this.currentNotification.style.transform = 'translateY(-20px)';

    setTimeout(() => {
      this.clearNotification();
    }, 500);
  }

  /**
   * Clear the current notification
   */
  private clearNotification(): void {
    if (this.animationTimeout !== null) {
      clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }

    if (this.currentNotification) {
      this.currentNotification.remove();
      this.currentNotification = null;
    }
  }

  /**
   * Add animation styles to document
   */
  private addAnimationStyles(): void {
    // Check if styles already exist
    if (document.getElementById('tag-notification-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'tag-notification-styles';
    style.textContent = `
      @keyframes tagNotificationSlide {
        0% {
          opacity: 0;
          transform: translateY(-20px) scale(0.9);
        }
        50% {
          transform: translateY(5px) scale(1.05);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes tagNotificationPulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }

      .tag-notification {
        animation: tagNotificationSlide 0.5s ease-out, 
                   tagNotificationPulse 1s ease-in-out 0.5s infinite;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Dispose of the notification system
   */
  public dispose(): void {
    this.clearNotification();
    this.container.remove();
  }
}
