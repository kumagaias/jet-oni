import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TimerDisplay } from './timer-display';

describe('TimerDisplay', () => {
  let timerDisplay: TimerDisplay;

  beforeEach(() => {
    timerDisplay = new TimerDisplay();
  });

  afterEach(() => {
    timerDisplay.dispose();
  });

  describe('update', () => {
    it('should format time as MM:SS', () => {
      timerDisplay.update(125);
      const element = document.getElementById('timer-display');
      expect(element?.textContent).toBe('2:05');
    });

    it('should format single digit seconds with leading zero', () => {
      timerDisplay.update(65);
      const element = document.getElementById('timer-display');
      expect(element?.textContent).toBe('1:05');
    });

    it('should display white color for normal time', () => {
      timerDisplay.update(120);
      const element = document.getElementById('timer-display');
      expect(element?.style.color).toBe('#ffffff');
    });

    it('should display warning color when time is below 60 seconds', () => {
      timerDisplay.update(59);
      const element = document.getElementById('timer-display');
      expect(element?.style.color).toBe('#ffaa00');
    });

    it('should display danger color when time is below 30 seconds', () => {
      timerDisplay.update(29);
      const element = document.getElementById('timer-display');
      expect(element?.style.color).toBe('#ff0000');
    });

    it('should handle zero time', () => {
      timerDisplay.update(0);
      const element = document.getElementById('timer-display');
      expect(element?.textContent).toBe('0:00');
      expect(element?.style.color).toBe('#ff0000');
    });
  });

  describe('show and hide', () => {
    it('should show timer when show is called', () => {
      timerDisplay.show();
      const element = document.getElementById('timer-display');
      expect(element?.style.display).toBe('block');
    });

    it('should hide timer when hide is called', () => {
      timerDisplay.hide();
      const element = document.getElementById('timer-display');
      expect(element?.style.display).toBe('none');
    });
  });

  describe('dispose', () => {
    it('should remove timer element from DOM', () => {
      timerDisplay.dispose();
      const element = document.getElementById('timer-display');
      expect(element).toBeNull();
    });
  });
});
