import { I18n } from '../i18n/i18n';

/**
 * ToastType defines the type of toast notification
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * Toast represents a single toast notification
 */
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  createdAt: number;
}

/**
 * ToastNotification manages toast notifications
 */
export class ToastNotification {
  private container: HTMLElement | null = null;
  private toasts: Map<string, Toast> = new Map();
  private i18n: I18n;
  private nextId = 0;

  constructor(i18n: I18n) {
    this.i18n = i18n;
  }

  /**
   * Initialize toast notification system
   */
  public init(): void {
    // Create toast container
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: 120px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      align-items: center;
    `;
    document.body.appendChild(this.container);
  }

  /**
   * Show a toast notification
   */
  public show(message: string, type: ToastType = 'info', duration = 3000): string {
    if (!this.container) {
      console.warn('Toast container not initialized');
      return '';
    }

    const id = `toast-${this.nextId++}`;
    const toast: Toast = {
      id,
      message,
      type,
      duration,
      createdAt: Date.now(),
    };

    this.toasts.set(id, toast);
    this.renderToast(toast);

    // Auto-remove after duration
    setTimeout(() => {
      this.remove(id);
    }, duration);

    return id;
  }

  /**
   * Show info toast
   */
  public info(message: string, duration?: number): string {
    return this.show(message, 'info', duration);
  }

  /**
   * Show success toast
   */
  public success(message: string, duration?: number): string {
    return this.show(message, 'success', duration);
  }

  /**
   * Show warning toast
   */
  public warning(message: string, duration?: number): string {
    return this.show(message, 'warning', duration);
  }

  /**
   * Show error toast
   */
  public error(message: string, duration?: number): string {
    return this.show(message, 'error', duration);
  }

  /**
   * Show "became oni" notification
   */
  public showBecameOni(): string {
    const message = this.i18n.t('game.becameOni');
    return this.show(message, 'warning', 4000);
  }

  /**
   * Show "tagged player" notification (you tagged someone)
   */
  public showTagged(taggedPlayerName: string, taggerName: string = 'You'): string {
    const message = `${taggedPlayerName} tagged by ${taggerName}!`;
    return this.show(message, 'success', 3000);
  }

  /**
   * Show "got tagged" notification (you were tagged)
   */
  public showGotTagged(taggerName: string, taggedPlayerName: string = 'You'): string {
    const message = `${taggedPlayerName} tagged by ${taggerName}!`;
    return this.show(message, 'error', 4000);
  }

  /**
   * Render a toast element
   */
  private renderToast(toast: Toast): void {
    if (!this.container) return;

    const element = document.createElement('div');
    element.id = toast.id;
    element.className = `toast toast-${toast.type}`;
    element.textContent = toast.message;

    // Base styles
    element.style.cssText = `
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      color: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      animation: slideIn 0.3s ease-out, fadeOut 0.3s ease-in ${toast.duration - 300}ms;
      pointer-events: auto;
      min-width: 150px;
      max-width: 300px;
      text-align: center;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    `;

    // Type-specific colors (more transparent)
    switch (toast.type) {
      case 'info':
        element.style.backgroundColor = 'rgba(59, 130, 246, 0.7)'; // Blue
        break;
      case 'success':
        element.style.backgroundColor = 'rgba(34, 197, 94, 0.7)'; // Green
        break;
      case 'warning':
        element.style.backgroundColor = 'rgba(251, 146, 60, 0.7)'; // Orange
        break;
      case 'error':
        element.style.backgroundColor = 'rgba(239, 68, 68, 0.7)'; // Red
        break;
    }

    this.container.appendChild(element);

    // Add animations if not already added
    this.ensureAnimations();
  }

  /**
   * Ensure CSS animations are added to the document
   */
  private ensureAnimations(): void {
    if (document.getElementById('toast-animations')) return;

    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateY(-20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes fadeOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }

      .toast {
        transition: transform 0.3s ease-out;
      }

      .toast:hover {
        transform: scale(1.05);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Remove a toast notification
   */
  public remove(id: string): void {
    const toast = this.toasts.get(id);
    if (!toast) return;

    const element = document.getElementById(id);
    if (element) {
      element.remove();
    }

    this.toasts.delete(id);
  }

  /**
   * Clear all toasts
   */
  public clear(): void {
    for (const id of this.toasts.keys()) {
      this.remove(id);
    }
  }

  /**
   * Dispose toast notification system
   */
  public dispose(): void {
    this.clear();
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    const animations = document.getElementById('toast-animations');
    if (animations) {
      animations.remove();
    }
  }
}
