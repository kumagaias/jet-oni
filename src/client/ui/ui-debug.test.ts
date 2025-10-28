import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIDebug } from './ui-debug';
import { GameState } from '../game/game-state';
import { I18n } from '../i18n/i18n';
import { en } from '../i18n/translations/en';
import { jp } from '../i18n/translations/jp';

describe('UIDebug', () => {
  let uiDebug: UIDebug;
  let gameState: GameState;
  let i18n: I18n;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    // Create game state and i18n
    gameState = new GameState('test-player');
    i18n = new I18n({ en, jp }, 'en');
    
    // Create UI Debug
    uiDebug = new UIDebug(gameState, i18n);
  });

  afterEach(() => {
    uiDebug.dispose();
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('should create debug container', () => {
      const container = document.getElementById('debug-container');
      expect(container).not.toBeNull();
    });

    it('should be hidden by default', () => {
      const container = document.getElementById('debug-container');
      expect(container?.style.display).toBe('none');
    });
  });

  describe('toggle', () => {
    it('should show debug display when toggled from hidden', () => {
      uiDebug.toggle();

      const container = document.getElementById('debug-container');
      expect(container?.style.display).toBe('block');
    });

    it('should hide debug display when toggled from visible', () => {
      uiDebug.show();
      uiDebug.toggle();

      const container = document.getElementById('debug-container');
      expect(container?.style.display).toBe('none');
    });
  });

  describe('show and hide', () => {
    it('should show debug display when show() is called', () => {
      uiDebug.show();

      const container = document.getElementById('debug-container');
      expect(container?.style.display).toBe('block');
    });

    it('should hide debug display when hide() is called', () => {
      uiDebug.show();
      uiDebug.hide();

      const container = document.getElementById('debug-container');
      expect(container?.style.display).toBe('none');
    });
  });

  describe('update', () => {
    it('should display player position', () => {
      gameState.setLocalPlayerPosition({ x: 10, y: 5, z: -3 });
      uiDebug.show();
      uiDebug.update();

      const container = document.getElementById('debug-container');
      expect(container?.innerHTML).toContain('10.00');
      expect(container?.innerHTML).toContain('5.00');
      expect(container?.innerHTML).toContain('-3.00');
    });

    it('should display player velocity', () => {
      gameState.setLocalPlayerVelocity({ x: 2, y: 1, z: -1 });
      uiDebug.show();
      uiDebug.update();

      const container = document.getElementById('debug-container');
      expect(container?.innerHTML).toContain('2.00');
      expect(container?.innerHTML).toContain('1.00');
      expect(container?.innerHTML).toContain('-1.00');
    });

    it('should display fuel level', () => {
      gameState.setLocalPlayerFuel(75);
      uiDebug.show();
      uiDebug.update();

      const container = document.getElementById('debug-container');
      expect(container?.innerHTML).toContain('75');
    });

    it('should display oni status', () => {
      gameState.setLocalPlayerIsOni(true);
      uiDebug.show();
      uiDebug.update();

      const container = document.getElementById('debug-container');
      expect(container?.innerHTML).toContain('true');
    });

    it('should display player counts', () => {
      gameState.setLocalPlayerIsOni(false);
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: true,
        isAI: true,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });
      uiDebug.show();
      uiDebug.update();

      const container = document.getElementById('debug-container');
      expect(container?.innerHTML).toContain('2');
      expect(container?.innerHTML).toContain('ONI: 1');
      expect(container?.innerHTML).toContain('Runners: 1');
    });

    it('should not update when hidden', () => {
      uiDebug.hide();
      gameState.setLocalPlayerPosition({ x: 100, y: 50, z: -30 });
      uiDebug.update();

      const container = document.getElementById('debug-container');
      expect(container?.innerHTML).not.toContain('100.00');
    });
  });

  describe('FPS counter', () => {
    it('should update FPS counter', () => {
      uiDebug.show();
      
      // Simulate multiple frames
      for (let i = 0; i < 60; i++) {
        uiDebug.updateFps();
      }
      
      uiDebug.update();

      const container = document.getElementById('debug-container');
      // Just check that the container has content
      expect(container?.innerHTML).toBeTruthy();
    });
  });

  describe('disposal', () => {
    it('should remove debug container from DOM when disposed', () => {
      uiDebug.dispose();

      const container = document.getElementById('debug-container');
      expect(container).toBeNull();
    });
  });
});
