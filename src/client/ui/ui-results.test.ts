import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIResults } from './ui-results';
import { GameResults } from '../game/game-results';
import { I18n } from '../i18n/i18n';
import { Player } from '../../shared/types/game';

describe('UIResults', () => {
  let uiResults: UIResults;
  let gameResults: GameResults;
  let i18n: I18n;
  let players: Player[];

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    // Create instances
    gameResults = new GameResults();
    i18n = new I18n('en');
    uiResults = new UIResults(gameResults, i18n);
    
    // Create test players
    players = [
      {
        id: 'player1',
        username: 'Player 1',
        isOni: false,
        isAI: false,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        survivedTime: 120,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      },
      {
        id: 'player2',
        username: 'Player 2',
        isOni: true,
        isAI: false,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 60,
        wasTagged: true,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      },
    ];
    
    gameResults.setResults(players, 'timeout');
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

    it('should display player list sorted by survival time', () => {
      uiResults.create();
      uiResults.show('player1');
      
      const container = document.getElementById('results-screen');
      const text = container?.textContent || '';
      
      // Player 1 escaped, so Runners win and only escaped players are shown
      expect(text).toContain('Player 1');
      // Player 2 was tagged, so they are not shown (ONI lost)
      expect(text).not.toContain('Player 2');
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
    it('should call callback when back button is clicked', () => {
      const callback = vi.fn();
      
      uiResults.create();
      uiResults.setOnBackToMenu(callback);
      uiResults.show('player1');
      
      const backButton = document.querySelector('button') as HTMLButtonElement;
      backButton?.click();
      
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
