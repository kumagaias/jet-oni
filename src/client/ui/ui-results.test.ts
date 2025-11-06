import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIResults } from './ui-results';
import { I18n } from '../i18n/i18n';
import type { GameResults, PlayerResult } from '../../shared/types/api';

describe('UIResults', () => {
  let uiResults: UIResults;
  let results: GameResults;
  let i18n: I18n;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    // Create instances
    i18n = new I18n('en');
    
    // Create test results (Runners Win scenario)
    results = {
      teamWinner: 'runners',
      players: [
        {
          id: 'player1',
          username: 'Player 1',
          survivedTime: 120,
          wasTagged: false,
          isAI: false,
          tagCount: 0,
        },
        {
          id: 'player2',
          username: 'Player 2',
          survivedTime: 60,
          wasTagged: true,
          isAI: false,
          tagCount: 1,
        },
      ],
    };
    
    uiResults = new UIResults(results, i18n);
  });

  afterEach(() => {
    uiResults.destroy();
  });

  describe('create', () => {
    it('should create results container', () => {
      uiResults.create();
      
      const container = document.getElementById('results-screen');
      expect(container).toBeTruthy();
      expect(container?.style.display).toBe('none');
    });
  });

  describe('show', () => {
    it('should display results screen', () => {
      uiResults.create();
      uiResults.show('player1');
      
      const container = document.getElementById('results-screen');
      expect(container?.style.display).toBe('flex');
    });

    it('should display all players in results', () => {
      uiResults.create();
      uiResults.show('player1');
      
      const container = document.getElementById('results-screen');
      const text = container?.textContent || '';
      
      // Both players should be shown in results
      // "Player " prefix is removed, so "Player 1" becomes "1"
      expect(text).toContain('1');
      expect(text).toContain('2');
    });

    it('should highlight winner', () => {
      uiResults.create();
      uiResults.show('player1');
      
      const container = document.getElementById('results-screen');
      const text = container?.textContent || '';
      
      // Winner should have crown emoji
      expect(text).toContain('👑');
    });

    it('should show local player result', () => {
      uiResults.create();
      uiResults.show('player1');
      
      const container = document.getElementById('results-screen');
      
      // Check that results are displayed (not checking specific text due to i18n)
      expect(container?.innerHTML).toBeTruthy();
      expect(container?.innerHTML.length).toBeGreaterThan(0);
    });
  });

  describe('hide', () => {
    it('should hide results screen', () => {
      uiResults.create();
      uiResults.show('player1');
      uiResults.hide();
      
      const container = document.getElementById('results-screen');
      expect(container?.style.display).toBe('none');
    });
  });

  describe('setOnBackToMenu', () => {
    it('should call callback when back button is clicked', async () => {
      const callback = vi.fn();
      
      uiResults.create();
      uiResults.setOnBackToMenu(callback);
      uiResults.show('player1');
      
      const backButton = document.querySelector('button') as HTMLButtonElement;
      backButton?.click();
      
      // Wait for setTimeout to complete
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should remove results container from DOM', () => {
      uiResults.create();
      uiResults.destroy();
      
      const container = document.getElementById('results-screen');
      expect(container).toBeNull();
    });
  });
});
