import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UICountdown } from './ui-countdown';
import { I18n } from '../i18n/i18n';

describe('UICountdown', () => {
  let countdown: UICountdown;
  let i18n: I18n;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    // Create i18n instance
    i18n = new I18n({
      en: { countdown: { ready: 'Ready', go: 'GO!' } },
      jp: { countdown: { ready: '準備', go: 'スタート！' } },
    });
    
    countdown = new UICountdown();
  });

  afterEach(() => {
    countdown.hide();
    document.body.innerHTML = '';
  });

  describe('start', () => {
    it('should prevent multiple starts', () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();
      
      // Start countdown
      countdown.start(3, onComplete1);
      
      // Try to start again (should be ignored)
      countdown.start(3, onComplete2);
      
      // Only first callback should be registered
      expect(document.querySelectorAll('#countdown-overlay').length).toBe(1);
    });

    it('should create countdown container', () => {
      const onComplete = vi.fn();
      
      countdown.start(3, onComplete);
      
      const container = document.getElementById('countdown-overlay');
      expect(container).toBeTruthy();
    });

    it('should call onComplete when countdown reaches 0', async () => {
      const onComplete = vi.fn();
      
      countdown.start(1, onComplete); // Start with 1 second
      
      // Wait for countdown to complete (1s interval + 100ms delay + 2s hide delay)
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('hide', () => {
    it('should remove countdown container', () => {
      const onComplete = vi.fn();
      
      countdown.start(3, onComplete);
      expect(document.getElementById('countdown-overlay')).toBeTruthy();
      
      countdown.hide();
      expect(document.getElementById('countdown-overlay')).toBeFalsy();
    });

    it('should reset completion state', () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();
      
      countdown.start(3, onComplete1);
      countdown.hide();
      
      // Should be able to start again after hide
      countdown.start(3, onComplete2);
      expect(document.getElementById('countdown-overlay')).toBeTruthy();
    });
  });
});
