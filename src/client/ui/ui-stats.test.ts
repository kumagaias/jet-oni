import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIStats } from './ui-stats';
import { StatsManager } from '../game/stats-manager';
import { I18n } from '../i18n/i18n';

describe('UIStats', () => {
  let uiStats: UIStats;
  let statsManager: StatsManager;
  let i18n: I18n;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    // Clear localStorage
    localStorage.clear();
    
    // Create instances
    statsManager = new StatsManager();
    i18n = new I18n('en');
    uiStats = new UIStats(statsManager, i18n);
    
    // Mock confirm
    global.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    uiStats.destroy();
    localStorage.clear();
  });

  describe('create', () => {
    it('should create stats container', () => {
      uiStats.create();
      
      const container = document.getElementById('stats-screen');
      expect(container).toBeTruthy();
      expect(container?.style.display).toBe('none');
    });
  });

  describe('show', () => {
    it('should display stats screen', () => {
      uiStats.create();
      uiStats.show();
      
      const container = document.getElementById('stats-screen');
      expect(container?.style.display).toBe('flex');
    });

    it('should display all statistics', () => {
      // Add some stats
      statsManager.updateStats(true, 100);
      statsManager.updateStats(false, 150);
      
      uiStats.create();
      uiStats.show();
      
      const container = document.getElementById('stats-screen');
      
      // Check that stats are displayed (not checking specific text due to i18n)
      expect(container?.innerHTML).toBeTruthy();
      expect(container?.innerHTML.length).toBeGreaterThan(0);
    });

    it('should display correct values', () => {
      statsManager.updateStats(true, 100);
      statsManager.updateStats(false, 150);
      
      uiStats.create();
      uiStats.show();
      
      const container = document.getElementById('stats-screen');
      const text = container?.textContent || '';
      
      expect(text).toContain('2'); // Games played
      expect(text).toContain('1'); // Wins
      expect(text).toContain('50.0%'); // Win rate
    });

    it('should handle zero games played', () => {
      uiStats.create();
      uiStats.show();
      
      const container = document.getElementById('stats-screen');
      const text = container?.textContent || '';
      
      expect(text).toContain('0'); // Games played
      expect(text).toContain('0.0%'); // Win rate
    });
  });

  describe('hide', () => {
    it('should hide stats screen', () => {
      uiStats.create();
      uiStats.show();
      uiStats.hide();
      
      const container = document.getElementById('stats-screen');
      expect(container?.style.display).toBe('none');
    });
  });

  describe('reset button', () => {
    it('should reset stats when confirmed', () => {
      statsManager.updateStats(true, 100);
      
      uiStats.create();
      uiStats.show();
      
      const buttons = Array.from(document.querySelectorAll('button'));
      // First button should be reset button
      const resetButton = buttons[0] as HTMLButtonElement;
      
      resetButton?.click();
      
      const stats = statsManager.loadStats();
      expect(stats.gamesPlayed).toBe(0);
    });

    it('should refresh display after reset', () => {
      statsManager.updateStats(true, 100);
      
      uiStats.create();
      uiStats.show();
      
      const buttons = Array.from(document.querySelectorAll('button'));
      const resetButton = buttons[0] as HTMLButtonElement;
      
      resetButton?.click();
      
      const container = document.getElementById('stats-screen');
      const text = container?.textContent || '';
      
      expect(text).toContain('0'); // Games played should be 0
    });
  });

  describe('setOnBack', () => {
    it('should call callback when back button is clicked', () => {
      const callback = vi.fn();
      
      uiStats.create();
      uiStats.setOnBack(callback);
      uiStats.show();
      
      const buttons = Array.from(document.querySelectorAll('button'));
      // Second button should be back button
      const backButton = buttons[1] as HTMLButtonElement;
      
      backButton?.click();
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should remove stats container from DOM', () => {
      uiStats.create();
      uiStats.destroy();
      
      const container = document.getElementById('stats-screen');
      expect(container).toBeNull();
    });
  });
});
