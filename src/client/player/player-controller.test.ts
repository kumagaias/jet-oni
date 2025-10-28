import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerController } from './player-controller';
import { GameState } from '../game/game-state';
import {
  JETPACK_FUEL_CONSUMPTION,
  DASH_FUEL_CONSUMPTION,
  ONI_FUEL_RECOVERY,
  RUNNER_FUEL_RECOVERY,
  MAX_FUEL,
  JETPACK_FORCE,
  JUMP_FORCE,
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
      expect(velocity.y).toBe(JUMP_FORCE);
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

  describe('Dash Fuel Consumption', () => {
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

      // Update controller
      const deltaTime = 1; // 1 second
      controller.update(deltaTime);

      const newFuel = gameState.getLocalPlayer().fuel;
      const expectedFuel = initialFuel - DASH_FUEL_CONSUMPTION * deltaTime;

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
