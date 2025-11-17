/**
 * Tests for UIControls
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UIControls } from './ui-controls';
import { GameState } from '../game/game-state';
import { I18n } from '../i18n/i18n';

describe('UIControls', () => {
  let controls: UIControls;
  let i18n: I18n;
  let gameState: GameState;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    // Mock mobile detection
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true,
    });
    
    Object.defineProperty(window, 'innerWidth', {
      value: 375,
      configurable: true,
    });

    gameState = new GameState('player1');
    
    // Create i18n with proper translation set
    const translations = {
      en: {
        test: 'Test'
      },
      jp: {
        test: 'テスト'
      }
    };
    i18n = new I18n(translations, 'en');
    controls = new UIControls(gameState, i18n);
  });

  afterEach(() => {
    controls.dispose();
  });

  describe('Mobile Detection', () => {
    it('should detect mobile device', () => {
      expect(controls.shouldShowMobileControls()).toBe(true);
    });
  });

  describe('Initialization', () => {
    it('should create control container on init', () => {
      const container = document.getElementById('ability-controls');
      expect(container).not.toBeNull();
    });

    it('should create dash button', () => {
      const container = document.getElementById('ability-controls');
      const buttons = container?.querySelectorAll('div');
      
      // Should have at least 1 button (dash/jetpack)
      expect(buttons?.length).toBeGreaterThan(0);
    });
  });

  describe('Button State', () => {
    it('should return initial button state', () => {
      const state = controls.getButtonState();
      
      expect(state.dash).toBe(false);
      expect(state.jetpack).toBe(false);
      expect(state.beacon).toBe(false);
    });

    it('should reset beacon state after reading', () => {
      controls.init();
      
      // Manually set beacon state
      const state1 = controls.getButtonState();
      state1.beacon = true;
      
      // Read state again
      const state2 = controls.getButtonState();
      
      expect(state2.beacon).toBe(false);
    });
  });

  describe('Touch Events', () => {
    it('should handle touch start on dash button', () => {
      // Show controls first
      controls.show();
      
      const container = document.getElementById('ability-controls');
      const dashButton = container?.children[0] as HTMLElement; // First button is dash/jetpack
      
      // Simulate touch start
      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [],
      });
      
      dashButton?.dispatchEvent(touchEvent);
      
      const state = controls.getButtonState();
      expect(state.dash).toBe(true);
      expect(state.jetpack).toBe(true);
    });

    it('should handle touch end on dash button', () => {
      // Show controls first
      controls.show();
      
      const container = document.getElementById('ability-controls');
      const dashButton = container?.children[0] as HTMLElement; // First button is dash/jetpack
      
      // Simulate touch start then end
      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
      });
      dashButton?.dispatchEvent(touchStart);
      
      const touchEnd = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
      });
      dashButton?.dispatchEvent(touchEnd);
      
      const state = controls.getButtonState();
      expect(state.dash).toBe(false);
      expect(state.jetpack).toBe(false);
    });
  });

  describe('Update with Game State', () => {
    it('should show dash button for runner', () => {
      // Show controls first so update() can modify them
      controls.show();
      
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.isOni = false;
      localPlayer.fuel = 100;
      
      controls.update(gameState);
      
      const container = document.getElementById('ability-controls');
      // For runner: jetpack button (0) is hidden, jump button (1) is shown, runner dash button (2) is shown
      const runnerDashButton = container?.children[2] as HTMLElement;
      const icon = runnerDashButton?.children[0] as HTMLElement;
      
      expect(icon?.textContent).toBe('🏃‍➡️');
    });

    it('should show jetpack button for oni', () => {
      // Show controls first so update() can modify them
      controls.show();
      
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.isOni = true;
      localPlayer.fuel = 100;
      
      controls.update(gameState);
      
      const container = document.getElementById('ability-controls');
      // For oni: jetpack button (0) is shown, jump button (1) is hidden, runner dash button (2) is hidden
      const jetpackButton = container?.children[0] as HTMLElement;
      const icon = jetpackButton?.children[0] as HTMLElement;
      
      expect(icon?.textContent).toBe('🚀');
    });



    it('should disable button when fuel is zero', () => {
      // Show controls first so update() can modify them
      controls.show();
      
      // Set game state to playing so update works
      gameState.setGamePhase('playing');
      
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.isOni = false;
      localPlayer.fuel = 0;
      
      controls.update(gameState);
      
      const container = document.getElementById('ability-controls');
      // For runner with no fuel: runner dash button (2) should be disabled
      const runnerDashButton = container?.children[2] as HTMLElement;
      
      expect(runnerDashButton?.classList.contains('disabled')).toBe(true);
      expect(runnerDashButton?.style.opacity).toBe('0.5');
    });
  });

  describe('Visibility', () => {
    it('should show controls', () => {
      controls.show();
      
      const container = document.getElementById('ability-controls');
      expect(container?.style.display).toBe('flex');
    });

    it('should hide controls', () => {
      // Show first, then hide
      controls.show();
      const container = document.getElementById('ability-controls');
      expect(container?.style.display).toBe('flex');
      
      controls.hide();
      expect(container?.style.display).toBe('none');
    });
  });

  describe('Disposal', () => {
    it('should remove controls from DOM', () => {
      const container = document.getElementById('ability-controls');
      expect(container).not.toBeNull(); // Verify it exists first
      
      controls.dispose();
      
      const containerAfter = document.getElementById('ability-controls');
      expect(containerAfter).toBeNull();
    });
  });
});
