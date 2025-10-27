import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayerController } from './player-controller';
import { GameState } from '../game/game-state';
import { PLAYER_SPEED, DASH_SPEED, ONI_SPEED_MULTIPLIER } from '../../shared/constants';

describe('PlayerController', () => {
  let gameState: GameState;
  let controller: PlayerController;

  beforeEach(() => {
    gameState = new GameState('test-player');
    gameState.setGamePhase('playing');
    controller = new PlayerController(gameState);
    controller.init(); // Initialize event listeners
  });

  describe('Input State', () => {
    it('should initialize with all inputs false', () => {
      const inputState = controller.getInputState();
      expect(inputState.forward).toBe(false);
      expect(inputState.backward).toBe(false);
      expect(inputState.left).toBe(false);
      expect(inputState.right).toBe(false);
      expect(inputState.jump).toBe(false);
      expect(inputState.dash).toBe(false);
      expect(inputState.jetpack).toBe(false);
      expect(inputState.beacon).toBe(false);
    });

    it('should update forward input on W key press', () => {
      const event = new KeyboardEvent('keydown', { code: 'KeyW' });
      window.dispatchEvent(event);
      
      const inputState = controller.getInputState();
      expect(inputState.forward).toBe(true);
    });

    it('should update backward input on S key press', () => {
      const event = new KeyboardEvent('keydown', { code: 'KeyS' });
      window.dispatchEvent(event);
      
      const inputState = controller.getInputState();
      expect(inputState.backward).toBe(true);
    });

    it('should update left input on A key press', () => {
      const event = new KeyboardEvent('keydown', { code: 'KeyA' });
      window.dispatchEvent(event);
      
      const inputState = controller.getInputState();
      expect(inputState.left).toBe(true);
    });

    it('should update right input on D key press', () => {
      const event = new KeyboardEvent('keydown', { code: 'KeyD' });
      window.dispatchEvent(event);
      
      const inputState = controller.getInputState();
      expect(inputState.right).toBe(true);
    });

    it('should update jump and jetpack input on Space key press', () => {
      const event = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(event);
      
      const inputState = controller.getInputState();
      expect(inputState.jump).toBe(true);
      expect(inputState.jetpack).toBe(true);
    });

    it('should update dash input on Shift key press', () => {
      const event = new KeyboardEvent('keydown', { code: 'ShiftLeft' });
      window.dispatchEvent(event);
      
      const inputState = controller.getInputState();
      expect(inputState.dash).toBe(true);
    });

    it('should reset forward input on W key release', () => {
      const keydown = new KeyboardEvent('keydown', { code: 'KeyW' });
      window.dispatchEvent(keydown);
      
      const keyup = new KeyboardEvent('keyup', { code: 'KeyW' });
      window.dispatchEvent(keyup);
      
      const inputState = controller.getInputState();
      expect(inputState.forward).toBe(false);
    });
  });

  describe('Movement Calculation', () => {
    it('should move forward when W is pressed', () => {
      const keydown = new KeyboardEvent('keydown', { code: 'KeyW' });
      window.dispatchEvent(keydown);
      
      const initialPosition = gameState.getLocalPlayer().position;
      controller.update(1.0); // 1 second
      
      const newPosition = gameState.getLocalPlayer().position;
      expect(newPosition.z).toBeLessThan(initialPosition.z);
    });

    it('should move backward when S is pressed', () => {
      const keydown = new KeyboardEvent('keydown', { code: 'KeyS' });
      window.dispatchEvent(keydown);
      
      const initialPosition = gameState.getLocalPlayer().position;
      controller.update(1.0); // 1 second
      
      const newPosition = gameState.getLocalPlayer().position;
      expect(newPosition.z).toBeGreaterThan(initialPosition.z);
    });

    it('should move left when A is pressed', () => {
      const keydown = new KeyboardEvent('keydown', { code: 'KeyA' });
      window.dispatchEvent(keydown);
      
      const initialPosition = gameState.getLocalPlayer().position;
      controller.update(1.0); // 1 second
      
      const newPosition = gameState.getLocalPlayer().position;
      expect(newPosition.x).toBeLessThan(initialPosition.x);
    });

    it('should move right when D is pressed', () => {
      const keydown = new KeyboardEvent('keydown', { code: 'KeyD' });
      window.dispatchEvent(keydown);
      
      const initialPosition = gameState.getLocalPlayer().position;
      controller.update(1.0); // 1 second
      
      const newPosition = gameState.getLocalPlayer().position;
      expect(newPosition.x).toBeGreaterThan(initialPosition.x);
    });

    it('should normalize diagonal movement', () => {
      // Press W and D for diagonal movement
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
      
      // Run multiple updates to reach full speed due to smoothing
      for (let i = 0; i < 30; i++) {
        controller.update(0.016); // ~60fps
      }
      
      const initialPosition = gameState.getLocalPlayer().position;
      controller.update(1.0); // 1 second at full speed
      
      const newPosition = gameState.getLocalPlayer().position;
      const distance = Math.sqrt(
        Math.pow(newPosition.x - initialPosition.x, 2) +
        Math.pow(newPosition.z - initialPosition.z, 2)
      );
      
      // Diagonal movement should be approximately equal to normal speed
      expect(distance).toBeCloseTo(PLAYER_SPEED, 1);
    });

    it('should apply oni speed multiplier when player is oni', () => {
      gameState.setLocalPlayerIsOni(true);
      
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      
      // Run multiple updates to reach full speed due to smoothing
      for (let i = 0; i < 30; i++) {
        controller.update(0.016); // ~60fps
      }
      
      const initialPosition = gameState.getLocalPlayer().position;
      controller.update(1.0); // 1 second at full speed
      
      const newPosition = gameState.getLocalPlayer().position;
      const distance = Math.sqrt(
        Math.pow(newPosition.x - initialPosition.x, 2) +
        Math.pow(newPosition.z - initialPosition.z, 2)
      );
      
      // Oni should move faster
      expect(distance).toBeGreaterThan(PLAYER_SPEED);
      expect(distance).toBeCloseTo(PLAYER_SPEED * ONI_SPEED_MULTIPLIER, 1);
    });

    it('should apply dash speed when shift is pressed and player is runner', () => {
      gameState.setLocalPlayerIsOni(false);
      gameState.setLocalPlayerFuel(100);
      
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
      
      // Run multiple updates to reach full speed due to smoothing
      for (let i = 0; i < 30; i++) {
        controller.update(0.016); // ~60fps
      }
      
      const initialPosition = gameState.getLocalPlayer().position;
      controller.update(1.0); // 1 second at full speed
      
      const newPosition = gameState.getLocalPlayer().position;
      const distance = Math.sqrt(
        Math.pow(newPosition.x - initialPosition.x, 2) +
        Math.pow(newPosition.z - initialPosition.z, 2)
      );
      
      // Runner with dash should move at dash speed
      expect(distance).toBeCloseTo(DASH_SPEED, 1);
    });

    it('should not dash when player is oni', () => {
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerFuel(100);
      
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
      
      // Run multiple updates to reach full speed due to smoothing
      for (let i = 0; i < 30; i++) {
        controller.update(0.016); // ~60fps
      }
      
      const initialPosition = gameState.getLocalPlayer().position;
      controller.update(1.0); // 1 second at full speed
      
      const newPosition = gameState.getLocalPlayer().position;
      const distance = Math.sqrt(
        Math.pow(newPosition.x - initialPosition.x, 2) +
        Math.pow(newPosition.z - initialPosition.z, 2)
      );
      
      // Oni should not dash, only use oni speed
      expect(distance).toBeCloseTo(PLAYER_SPEED * ONI_SPEED_MULTIPLIER, 1);
    });

    it('should not dash when fuel is zero', () => {
      gameState.setLocalPlayerIsOni(false);
      gameState.setLocalPlayerFuel(0);
      
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
      
      // Run multiple updates to reach full speed due to smoothing
      for (let i = 0; i < 30; i++) {
        controller.update(0.016); // ~60fps
      }
      
      const initialPosition = gameState.getLocalPlayer().position;
      controller.update(1.0); // 1 second at full speed
      
      const newPosition = gameState.getLocalPlayer().position;
      const distance = Math.sqrt(
        Math.pow(newPosition.x - initialPosition.x, 2) +
        Math.pow(newPosition.z - initialPosition.z, 2)
      );
      
      // Should move at normal speed without dash
      expect(distance).toBeCloseTo(PLAYER_SPEED, 1);
    });
  });

  describe('Map Boundaries', () => {
    it('should clamp position to map boundaries', () => {
      // Set position near boundary
      gameState.setLocalPlayerPosition({ x: 195, y: 0, z: 0 });
      
      // Move towards boundary
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
      controller.update(1.0); // 1 second
      
      const newPosition = gameState.getLocalPlayer().position;
      expect(newPosition.x).toBeLessThanOrEqual(200); // MAP_SIZE
    });

    it('should not allow negative y position', () => {
      gameState.setLocalPlayerPosition({ x: 0, y: -5, z: 0 });
      controller.update(0.1);
      
      const newPosition = gameState.getLocalPlayer().position;
      expect(newPosition.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Mouse Sensitivity', () => {
    it('should have default mouse sensitivity', () => {
      expect(controller.getMouseSensitivity()).toBe(0.002);
    });

    it('should allow setting mouse sensitivity', () => {
      controller.setMouseSensitivity(0.005);
      expect(controller.getMouseSensitivity()).toBe(0.005);
    });
  });

  describe('Pointer Lock', () => {
    it('should initialize with pointer lock disabled', () => {
      expect(controller.isPointerLockedState()).toBe(false);
    });
  });

  describe('Velocity Smoothing', () => {
    it('should smooth velocity changes', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      
      // First update - velocity should not immediately reach target
      controller.update(0.016); // ~60fps
      const velocity1 = gameState.getLocalPlayer().velocity;
      
      // Velocity should be less than full speed initially
      const speed1 = Math.sqrt(velocity1.x * velocity1.x + velocity1.z * velocity1.z);
      expect(speed1).toBeLessThan(PLAYER_SPEED);
      expect(speed1).toBeGreaterThan(0);
      
      // Multiple updates should approach target speed
      for (let i = 0; i < 10; i++) {
        controller.update(0.016);
      }
      
      const velocity2 = gameState.getLocalPlayer().velocity;
      const speed2 = Math.sqrt(velocity2.x * velocity2.x + velocity2.z * velocity2.z);
      
      // Should be closer to target speed
      expect(speed2).toBeGreaterThan(speed1);
    });

    it('should decelerate smoothly when input is released', () => {
      // Accelerate first
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      for (let i = 0; i < 20; i++) {
        controller.update(0.016);
      }
      
      const velocityAtSpeed = gameState.getLocalPlayer().velocity;
      const speedAtFull = Math.sqrt(
        velocityAtSpeed.x * velocityAtSpeed.x + velocityAtSpeed.z * velocityAtSpeed.z
      );
      
      // Release key
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
      
      // Update once
      controller.update(0.016);
      
      const velocityAfterRelease = gameState.getLocalPlayer().velocity;
      const speedAfterRelease = Math.sqrt(
        velocityAfterRelease.x * velocityAfterRelease.x +
        velocityAfterRelease.z * velocityAfterRelease.z
      );
      
      // Speed should decrease but not immediately to zero
      expect(speedAfterRelease).toBeLessThan(speedAtFull);
      expect(speedAfterRelease).toBeGreaterThan(0);
    });
  });
});
