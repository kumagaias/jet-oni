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
    i18n = new I18n('en');
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
      
      expect(buttons?.length).toBeGreaterThan(0);
    });

    it('should create beacon button', () => {
      const container = document.getElementById('ability-controls');
      const buttons = container?.querySelectorAll('div');
      
      // Should have 2 buttons (dash and beacon)
      expect(buttons?.length).toBe(2);
    });

    it('should hide beacon button initially', () => {
      const container = document.getElementById('ability-controls');
      const buttons = container?.querySelectorAll('div');
      const beaconButton = buttons?.[1] as HTMLElement;
      
      expect(beaconButton?.style.display).toBe('none');
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
      const container = document.getElementById('ability-controls');
      const dashButton = container?.querySelector('div') as HTMLElement;
      
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
      const container = document.getElementById('ability-controls');
      const dashButton = container?.querySelector('div') as HTMLElement;
      
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
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.isOni = false;
      localPlayer.fuel = 100;
      
      controls.update(gameState);
      
      const container = document.getElementById('ability-controls');
      const dashButton = container?.querySelector('div') as HTMLElement;
      
      expect(dashButton?.textContent).toBe('⚡️');
    });

    it('should show jetpack button for oni', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.isOni = true;
      localPlayer.fuel = 100;
      
      controls.update(gameState);
      
      const container = document.getElementById('ability-controls');
      const dashButton = container?.querySelector('div') as HTMLElement;
      
      expect(dashButton?.textContent).toBe('🔥');
    });

    it('should show beacon button for oni', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.isOni = true;
      localPlayer.fuel = 100;
      
      controls.update(gameState);
      
      const container = document.getElementById('ability-controls');
      const buttons = container?.querySelectorAll('div');
      const beaconButton = buttons?.[1] as HTMLElement;
      
      expect(beaconButton?.style.display).toBe('flex');
    });

    it('should hide beacon button for runner', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.isOni = false;
      localPlayer.fuel = 100;
      
      controls.update(gameState);
      
      const container = document.getElementById('ability-controls');
      const buttons = container?.querySelectorAll('div');
      const beaconButton = buttons?.[1] as HTMLElement;
      
      expect(beaconButton?.style.display).toBe('none');
    });

    it('should disable button when fuel is zero', () => {
      // Set game state to playing so update works
      gameState.setGamePhase('playing');
      
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.isOni = false;
      localPlayer.fuel = 0;
      
      controls.update(gameState);
      
      const container = document.getElementById('ability-controls');
      const dashButton = container?.querySelector('div') as HTMLElement;
      
      expect(dashButton?.classList.contains('disabled')).toBe(true);
      expect(dashButton?.style.opacity).toBe('0.5');
    });
  });

  describe('Visibility', () => {
    it('should show controls', () => {
      controls.hide();
      controls.show();
      
      const container = document.getElementById('ability-controls');
      expect(container?.style.display).toBe('flex');
    });

    it('should hide controls', () => {
      const container = document.getElementById('ability-controls');
      expect(container?.style.display).toBe('flex'); // Initially visible
      
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
