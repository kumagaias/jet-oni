import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BeaconSystem } from './beacon-system';
import { GameState } from '../game/game-state';
import { BEACON_INITIAL_DELAY, BEACON_DURATION, BEACON_COOLDOWN } from '../../shared/constants';

describe('BeaconSystem', () => {
  let gameState: GameState;
  let beaconSystem: BeaconSystem;

  beforeEach(() => {
    gameState = new GameState('test-player');
    beaconSystem = new BeaconSystem(gameState);
    
    // Mock Date.now for consistent testing
    vi.useFakeTimers();
  });

  describe('isAvailable', () => {
    it('should return false when player is not ONI', () => {
      gameState.setLocalPlayerIsOni(false);
      beaconSystem.onBecameOni();
      
      expect(beaconSystem.isAvailable()).toBe(false);
    });

    it('should return false immediately after becoming ONI', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      expect(beaconSystem.isAvailable()).toBe(false);
    });

    it('should return true after BEACON_INITIAL_DELAY seconds', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      // Advance time by BEACON_INITIAL_DELAY
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      
      expect(beaconSystem.isAvailable()).toBe(true);
    });

    it('should return false during cooldown after use', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      // Wait for initial delay
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      
      // Activate beacon
      beaconSystem.activate();
      
      // Wait for beacon to end
      vi.advanceTimersByTime(BEACON_DURATION * 1000);
      beaconSystem.update();
      
      // Should be in cooldown
      expect(beaconSystem.isAvailable()).toBe(false);
    });

    it('should return true after cooldown completes', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      // Wait for initial delay
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      
      // Activate beacon
      beaconSystem.activate();
      
      // Wait for beacon to end
      vi.advanceTimersByTime(BEACON_DURATION * 1000);
      beaconSystem.update();
      
      // Wait for cooldown
      vi.advanceTimersByTime(BEACON_COOLDOWN * 1000);
      
      expect(beaconSystem.isAvailable()).toBe(true);
    });
  });

  describe('activate', () => {
    it('should return false if not available', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      // Try to activate immediately (before initial delay)
      const result = beaconSystem.activate();
      
      expect(result).toBe(false);
      expect(beaconSystem.isBeaconActive()).toBe(false);
    });

    it('should return true and activate if available', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      // Wait for initial delay
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      
      const result = beaconSystem.activate();
      
      expect(result).toBe(true);
      expect(beaconSystem.isBeaconActive()).toBe(true);
    });
  });

  describe('isBeaconActive', () => {
    it('should return false when not activated', () => {
      expect(beaconSystem.isBeaconActive()).toBe(false);
    });

    it('should return true during BEACON_DURATION', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      // Wait for initial delay and activate
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      beaconSystem.activate();
      
      // Check at various points during duration
      expect(beaconSystem.isBeaconActive()).toBe(true);
      
      vi.advanceTimersByTime(5000); // 5 seconds
      expect(beaconSystem.isBeaconActive()).toBe(true);
      
      vi.advanceTimersByTime(4000); // 9 seconds total
      expect(beaconSystem.isBeaconActive()).toBe(true);
    });

    it('should return false after BEACON_DURATION', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      // Wait for initial delay and activate
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      beaconSystem.activate();
      
      // Wait for full duration
      vi.advanceTimersByTime(BEACON_DURATION * 1000);
      
      expect(beaconSystem.isBeaconActive()).toBe(false);
    });
  });

  describe('getCooldownProgress', () => {
    it('should return 0 when not ONI', () => {
      gameState.setLocalPlayerIsOni(false);
      
      expect(beaconSystem.getCooldownProgress()).toBe(0);
    });

    it('should progress from 0 to 1 during initial delay', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      expect(beaconSystem.getCooldownProgress()).toBe(0);
      
      // Halfway through initial delay
      vi.advanceTimersByTime((BEACON_INITIAL_DELAY / 2) * 1000);
      expect(beaconSystem.getCooldownProgress()).toBeCloseTo(0.5, 1);
      
      // Full initial delay
      vi.advanceTimersByTime((BEACON_INITIAL_DELAY / 2) * 1000);
      expect(beaconSystem.getCooldownProgress()).toBe(1);
    });

    it('should progress from 0 to 1 during cooldown after use', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      // Wait for initial delay and activate
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      beaconSystem.activate();
      
      // Wait for beacon to end
      vi.advanceTimersByTime(BEACON_DURATION * 1000);
      beaconSystem.update();
      
      expect(beaconSystem.getCooldownProgress()).toBe(0);
      
      // Halfway through cooldown
      vi.advanceTimersByTime((BEACON_COOLDOWN / 2) * 1000);
      expect(beaconSystem.getCooldownProgress()).toBeCloseTo(0.5, 1);
      
      // Full cooldown
      vi.advanceTimersByTime((BEACON_COOLDOWN / 2) * 1000);
      expect(beaconSystem.getCooldownProgress()).toBe(1);
    });
  });

  describe('getRemainingCooldown', () => {
    it('should return 0 when not ONI', () => {
      gameState.setLocalPlayerIsOni(false);
      
      expect(beaconSystem.getRemainingCooldown()).toBe(0);
    });

    it('should return BEACON_INITIAL_DELAY initially', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      expect(beaconSystem.getRemainingCooldown()).toBeCloseTo(BEACON_INITIAL_DELAY, 0);
    });

    it('should decrease during initial delay', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      vi.advanceTimersByTime(10000); // 10 seconds
      
      expect(beaconSystem.getRemainingCooldown()).toBeCloseTo(BEACON_INITIAL_DELAY - 10, 0);
    });

    it('should return 0 when ready', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      
      expect(beaconSystem.getRemainingCooldown()).toBe(0);
    });

    it('should return BEACON_COOLDOWN after use', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      // Wait for initial delay and activate
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      beaconSystem.activate();
      
      // Wait for beacon to end
      vi.advanceTimersByTime(BEACON_DURATION * 1000);
      beaconSystem.update();
      
      expect(beaconSystem.getRemainingCooldown()).toBeCloseTo(BEACON_COOLDOWN, 0);
    });
  });

  describe('getRemainingActiveTime', () => {
    it('should return 0 when not active', () => {
      expect(beaconSystem.getRemainingActiveTime()).toBe(0);
    });

    it('should return BEACON_DURATION when just activated', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      beaconSystem.activate();
      
      expect(beaconSystem.getRemainingActiveTime()).toBeCloseTo(BEACON_DURATION, 0);
    });

    it('should decrease during activation', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      beaconSystem.activate();
      
      vi.advanceTimersByTime(5000); // 5 seconds
      
      expect(beaconSystem.getRemainingActiveTime()).toBeCloseTo(BEACON_DURATION - 5, 0);
    });

    it('should return 0 after duration ends', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      beaconSystem.activate();
      
      vi.advanceTimersByTime(BEACON_DURATION * 1000);
      
      expect(beaconSystem.getRemainingActiveTime()).toBe(0);
    });
  });

  describe('update', () => {
    it('should deactivate beacon after BEACON_DURATION', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      beaconSystem.activate();
      
      expect(beaconSystem.isBeaconActive()).toBe(true);
      
      // Advance time past duration
      vi.advanceTimersByTime(BEACON_DURATION * 1000);
      beaconSystem.update();
      
      expect(beaconSystem.isBeaconActive()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all beacon state', () => {
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();
      
      vi.advanceTimersByTime(BEACON_INITIAL_DELAY * 1000);
      beaconSystem.activate();
      
      beaconSystem.reset();
      
      expect(beaconSystem.isBeaconActive()).toBe(false);
      expect(beaconSystem.getRemainingCooldown()).toBe(0);
      expect(beaconSystem.getRemainingActiveTime()).toBe(0);
    });
  });
});
