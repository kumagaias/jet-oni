import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayerController } from './player-controller';
import { GameState } from '../game/game-state';
import {
  JETPACK_FUEL_CONSUMPTION,
  DASH_FUEL_COST,
  DASH_DURATION,
  ONI_FUEL_RECOVERY,
  RUNNER_FUEL_RECOVERY,
  MAX_FUEL,
  JETPACK_FORCE,
  JUMP_FORCE,
  DASH_SPEED,
  PLAYER_SPEED,
  ONI_SPEED_MULTIPLIER,
} from '../../shared/constants';

describe('PlayerController', () => {
  let gameState: GameState;
  let controller: PlayerController;

  beforeEach(() => {
    gameState = new GameState('test-player');
    gameState.setGamePhase('playing');
    controller = new PlayerController(gameState);
    controller.init();
  });

  describe('Jetpack (ONI)', () => {
    beforeEach(() => {
      // Set player as ONI
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerFuel(100);
    });

    it('should consume fuel when jetpacking', () => {
      const player = gameState.getLocalPlayer();
      const initialFuel = player.fuel;

      // Simulate jetpack input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(keydownEvent);

      // Update controller
      const deltaTime = 1; // 1 second
      controller.update(deltaTime);

      const newFuel = gameState.getLocalPlayer().fuel;
      const expectedFuel = initialFuel - JETPACK_FUEL_CONSUMPTION * deltaTime;

      expect(newFuel).toBeCloseTo(expectedFuel, 1);
    });

    it('should apply upward force when jetpacking', () => {
      // Simulate jetpack input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(keydownEvent);

      // Update controller
      const deltaTime = 0.1;
      controller.update(deltaTime);

      const velocity = gameState.getLocalPlayer().velocity;
      // Jetpack now applies acceleration, not instant velocity
      expect(velocity.y).toBe(JETPACK_FORCE * deltaTime);
    });

    it('should not jetpack when fuel is zero', () => {
      gameState.setLocalPlayerFuel(0);

      // Simulate jetpack input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(keydownEvent);

      // Update controller
      controller.update(0.1);

      const player = gameState.getLocalPlayer();
      expect(player.isJetpacking).toBe(false);
    });

    it('should set jetpacking state to true when active', () => {
      // Simulate jetpack input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(keydownEvent);

      // Update controller
      controller.update(0.1);

      const player = gameState.getLocalPlayer();
      expect(player.isJetpacking).toBe(true);
    });

    it('should set jetpacking state to false when not active', () => {
      // Update controller without input
      controller.update(0.1);

      const player = gameState.getLocalPlayer();
      expect(player.isJetpacking).toBe(false);
    });
  });

  describe('Jump (Runner)', () => {
    beforeEach(() => {
      // Set player as Runner
      gameState.setLocalPlayerIsOni(false);
      gameState.setLocalPlayerOnSurface(true);
    });

    it('should jump when on surface', () => {
      // Simulate jump input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(keydownEvent);

      // Update controller
      controller.update(0.1);

      const velocity = gameState.getLocalPlayer().velocity;
      expect(velocity.y).toBe(JUMP_FORCE * 1.5); // Runners jump 1.5x higher
    });

    it('should not jump when not on surface', () => {
      gameState.setLocalPlayerOnSurface(false);

      // Simulate jump input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(keydownEvent);

      // Update controller
      controller.update(0.1);

      const velocity = gameState.getLocalPlayer().velocity;
      expect(velocity.y).toBe(0);
    });

    it('should not consume fuel when jumping', () => {
      const initialFuel = gameState.getLocalPlayer().fuel;

      // Simulate jump input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(keydownEvent);

      // Update controller
      controller.update(0.1);

      const newFuel = gameState.getLocalPlayer().fuel;
      expect(newFuel).toBe(initialFuel);
    });
  });

  describe('Dash Ability (Runner)', () => {
    beforeEach(() => {
      // Set player as Runner
      gameState.setLocalPlayerIsOni(false);
      gameState.setLocalPlayerFuel(100);
    });

    it('should consume fuel when dashing', () => {
      const initialFuel = gameState.getLocalPlayer().fuel;

      // Simulate dash input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'ShiftLeft' });
      window.dispatchEvent(keydownEvent);

      // Update controller with small delta to trigger dash
      const deltaTime = 0.016; // ~60fps frame
      controller.update(deltaTime);

      const newFuel = gameState.getLocalPlayer().fuel;
      const expectedFuel = initialFuel - DASH_FUEL_COST; // Fixed cost per activation

      expect(newFuel).toBeCloseTo(expectedFuel, 1);
    });

    it('should not dash when fuel is zero', () => {
      gameState.setLocalPlayerFuel(0);

      // Simulate dash input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'ShiftLeft' });
      window.dispatchEvent(keydownEvent);

      // Update controller
      controller.update(0.1);

      const player = gameState.getLocalPlayer();
      expect(player.isDashing).toBe(false);
    });

    it('should set dashing state to true when active', () => {
      // Simulate dash input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'ShiftLeft' });
      window.dispatchEvent(keydownEvent);

      // Update controller with small delta
      controller.update(0.016);

      const player = gameState.getLocalPlayer();
      expect(player.isDashing).toBe(true);
    });

    it('should set dashing state to false when not active', () => {
      // Update controller without dash input
      controller.update(0.1);

      const player = gameState.getLocalPlayer();
      expect(player.isDashing).toBe(false);
    });

    it('should maintain dash for DASH_DURATION seconds', () => {
      // Use fake timers to control time
      vi.useFakeTimers();
      
      // Activate dash
      const keydownEvent = new KeyboardEvent('keydown', { code: 'ShiftLeft' });
      window.dispatchEvent(keydownEvent);
      controller.update(0.016);

      // Verify dash is active
      expect(gameState.getLocalPlayer().isDashing).toBe(true);

      // Release key
      const keyupEvent = new KeyboardEvent('keyup', { code: 'ShiftLeft' });
      window.dispatchEvent(keyupEvent);

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);
      controller.update(1.0);
      expect(gameState.getLocalPlayer().isDashing).toBe(true);

      // Advance time by DASH_DURATION seconds (total: 3 seconds > 2 seconds)
      vi.advanceTimersByTime(DASH_DURATION * 1000);
      controller.update(DASH_DURATION);
      expect(gameState.getLocalPlayer().isDashing).toBe(false);
      
      // Restore real timers
      vi.useRealTimers();
    });

    it('should not consume additional fuel when pressing dash during active dash', () => {
      // Set fuel to exact amount to avoid recovery issues
      gameState.setLocalPlayerFuel(100);
      const initialFuel = 100;

      // Activate dash
      const keydownEvent1 = new KeyboardEvent('keydown', { code: 'ShiftLeft' });
      window.dispatchEvent(keydownEvent1);
      controller.update(0.016);

      const fuelAfterFirstDash = gameState.getLocalPlayer().fuel;
      expect(fuelAfterFirstDash).toBe(initialFuel - DASH_FUEL_COST);

      // Release and press again while still active
      const keyupEvent = new KeyboardEvent('keyup', { code: 'ShiftLeft' });
      window.dispatchEvent(keyupEvent);
      
      const keydownEvent2 = new KeyboardEvent('keydown', { code: 'ShiftLeft' });
      window.dispatchEvent(keydownEvent2);
      controller.update(0.016);

      // Fuel should not decrease further (dash is still active)
      expect(gameState.getLocalPlayer().fuel).toBe(fuelAfterFirstDash);
    });
  });

  describe('Dash Restriction (ONI)', () => {
    beforeEach(() => {
      // Set player as ONI
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerFuel(100);
    });

    it('should not dash when player is ONI', () => {
      // Simulate dash input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'ShiftLeft' });
      window.dispatchEvent(keydownEvent);

      // Update controller
      controller.update(0.1);

      const player = gameState.getLocalPlayer();
      expect(player.isDashing).toBe(false);
    });

    it('should not consume fuel when ONI tries to dash', () => {
      const initialFuel = gameState.getLocalPlayer().fuel;

      // Simulate dash input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'ShiftLeft' });
      window.dispatchEvent(keydownEvent);

      // Update controller
      const deltaTime = 1; // 1 second
      controller.update(deltaTime);

      const newFuel = gameState.getLocalPlayer().fuel;
      expect(newFuel).toBe(initialFuel);
    });
  });

  describe('Fuel Recovery', () => {
    describe('ONI Fuel Recovery', () => {
      beforeEach(() => {
        gameState.setLocalPlayerIsOni(true);
        gameState.setLocalPlayerFuel(50);
        gameState.setLocalPlayerOnSurface(true);
      });

      it('should recover fuel on surface', () => {
        const initialFuel = gameState.getLocalPlayer().fuel;

        // Update controller
        const deltaTime = 1; // 1 second
        controller.update(deltaTime);

        const newFuel = gameState.getLocalPlayer().fuel;
        const expectedFuel = initialFuel + ONI_FUEL_RECOVERY * deltaTime;

        expect(newFuel).toBeCloseTo(expectedFuel, 1);
      });

      it('should not recover fuel when not on surface', () => {
        gameState.setLocalPlayerOnSurface(false);
        const initialFuel = gameState.getLocalPlayer().fuel;

        // Update controller
        controller.update(1);

        const newFuel = gameState.getLocalPlayer().fuel;
        expect(newFuel).toBe(initialFuel);
      });

      it('should not exceed max fuel', () => {
        gameState.setLocalPlayerFuel(MAX_FUEL - 5);

        // Update controller with large delta time
        controller.update(10);

        const newFuel = gameState.getLocalPlayer().fuel;
        expect(newFuel).toBe(MAX_FUEL);
      });
    });

    describe('Runner Fuel Recovery', () => {
      beforeEach(() => {
        gameState.setLocalPlayerIsOni(false);
        gameState.setLocalPlayerFuel(50);
        gameState.setLocalPlayerOnSurface(true);
      });

      it('should recover fuel on surface while stationary', () => {
        // Set velocity to zero (stationary)
        gameState.setLocalPlayerVelocity({ x: 0, y: 0, z: 0 });

        const initialFuel = gameState.getLocalPlayer().fuel;

        // Update controller
        const deltaTime = 1; // 1 second
        controller.update(deltaTime);

        const newFuel = gameState.getLocalPlayer().fuel;
        const expectedFuel = initialFuel + RUNNER_FUEL_RECOVERY * deltaTime;

        expect(newFuel).toBeCloseTo(expectedFuel, 1);
      });

      it('should not recover fuel while moving', () => {
        // Set velocity to non-zero (moving)
        gameState.setLocalPlayerVelocity({ x: 5, y: 0, z: 5 });

        const initialFuel = gameState.getLocalPlayer().fuel;

        // Update controller
        controller.update(1);

        const newFuel = gameState.getLocalPlayer().fuel;
        expect(newFuel).toBe(initialFuel);
      });

      it('should not recover fuel when not on surface', () => {
        gameState.setLocalPlayerOnSurface(false);
        gameState.setLocalPlayerVelocity({ x: 0, y: 0, z: 0 });

        const initialFuel = gameState.getLocalPlayer().fuel;

        // Update controller
        controller.update(1);

        const newFuel = gameState.getLocalPlayer().fuel;
        expect(newFuel).toBe(initialFuel);
      });
    });
  });
});
