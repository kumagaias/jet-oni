import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToastNotification } from './toast-notification';
import { I18n } from '../i18n/i18n';
import { en } from '../i18n/translations/en';
import { jp } from '../i18n/translations/jp';

describe('ToastNotification', () => {
  let toastNotification: ToastNotification;
  let i18n: I18n;

  beforeEach(() => {
    // Create i18n instance with translations
    i18n = new I18n({ en, jp }, 'en');

    // Create toast notification instance
    toastNotification = new ToastNotification(i18n);
    toastNotification.init();
  });

  afterEach(() => {
    // Clean up
    toastNotification.dispose();
  });

  describe('Initialization', () => {
    it('should create toast container on init', () => {
      const container = document.getElementById('toast-container');
      expect(container).not.toBeNull();
    });

    it('should position container correctly', () => {
      const container = document.getElementById('toast-container');
      expect(container?.style.position).toBe('fixed');
      expect(container?.style.top).toBe('120px');
      expect(container?.style.left).toBe('50%');
    });
  });

  describe('Show toast', () => {
    it('should show info toast', () => {
      const id = toastNotification.info('Test message');
      expect(id).toBeTruthy();

      const toast = document.getElementById(id);
      expect(toast).not.toBeNull();
      expect(toast?.textContent).toBe('Test message');
    });

    it('should show success toast', () => {
      const id = toastNotification.success('Success message');
      expect(id).toBeTruthy();

      const toast = document.getElementById(id);
      expect(toast).not.toBeNull();
      expect(toast?.className).toContain('toast-success');
    });

    it('should show warning toast', () => {
      const id = toastNotification.warning('Warning message');
      expect(id).toBeTruthy();

      const toast = document.getElementById(id);
      expect(toast).not.toBeNull();
      expect(toast?.className).toContain('toast-warning');
    });

    it('should show error toast', () => {
      const id = toastNotification.error('Error message');
      expect(id).toBeTruthy();

      const toast = document.getElementById(id);
      expect(toast).not.toBeNull();
      expect(toast?.className).toContain('toast-error');
    });
  });

  describe('Game-specific toasts', () => {
    it('should show "became oni" toast', () => {
      const id = toastNotification.showBecameOni();
      expect(id).toBeTruthy();

      const toast = document.getElementById(id);
      expect(toast).not.toBeNull();
      expect(toast?.textContent).toBe('You became ONI!');
    });

    it('should show "tagged player" toast', () => {
      const id = toastNotification.showTagged('Player2');
      expect(id).toBeTruthy();

      const toast = document.getElementById(id);
      expect(toast).not.toBeNull();
      expect(toast?.textContent).toContain('Player2');
    });

    it('should show "got tagged" toast', () => {
      const id = toastNotification.showGotTagged('Player1');
      expect(id).toBeTruthy();

      const toast = document.getElementById(id);
      expect(toast).not.toBeNull();
      expect(toast?.textContent).toContain('Player1');
    });
  });

  describe('Toast removal', () => {
    it('should remove toast by id', () => {
      const id = toastNotification.info('Test message');
      expect(document.getElementById(id)).not.toBeNull();

      toastNotification.remove(id);
      expect(document.getElementById(id)).toBeNull();
    });

    it('should clear all toasts', () => {
      const id1 = toastNotification.info('Message 1');
      const id2 = toastNotification.info('Message 2');

      expect(document.getElementById(id1)).not.toBeNull();
      expect(document.getElementById(id2)).not.toBeNull();

      toastNotification.clear();

      expect(document.getElementById(id1)).toBeNull();
      expect(document.getElementById(id2)).toBeNull();
    });
  });

  describe('Auto-removal', () => {
    it('should auto-remove toast after duration', async () => {
      vi.useFakeTimers();

      const id = toastNotification.info('Test message', 1000);
      expect(document.getElementById(id)).not.toBeNull();

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      // Wait for removal
      await vi.runAllTimersAsync();

      expect(document.getElementById(id)).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('Dispose', () => {
    it('should remove container on dispose', () => {
      expect(document.getElementById('toast-container')).not.toBeNull();

      toastNotification.dispose();

      expect(document.getElementById('toast-container')).toBeNull();
    });

    it('should remove all toasts on dispose', () => {
      const id1 = toastNotification.info('Message 1');
      const id2 = toastNotification.info('Message 2');

      toastNotification.dispose();

      expect(document.getElementById(id1)).toBeNull();
      expect(document.getElementById(id2)).toBeNull();
    });
  });

  describe('Multiple toasts', () => {
    it('should show multiple toasts simultaneously', () => {
      const id1 = toastNotification.info('Message 1');
      const id2 = toastNotification.success('Message 2');
      const id3 = toastNotification.warning('Message 3');

      expect(document.getElementById(id1)).not.toBeNull();
      expect(document.getElementById(id2)).not.toBeNull();
      expect(document.getElementById(id3)).not.toBeNull();
    });

    it('should generate unique ids for each toast', () => {
      const id1 = toastNotification.info('Message 1');
      const id2 = toastNotification.info('Message 2');

      expect(id1).not.toBe(id2);
    });
  });
});
