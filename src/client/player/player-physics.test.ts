import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerPhysics, SurfaceInfo } from './player-physics';
import { Vector3 } from '../../shared/types/game';
import { GRAVITY, WATER_SPEED_MULTIPLIER } from '../../shared/constants';

describe('PlayerPhysics', () => {
  let physics: PlayerPhysics;

  beforeEach(() => {
    physics = new PlayerPhysics();
  });

  describe('applyPhysics', () => {
    it('should apply gravity to velocity when in air', () => {
      const position: Vector3 = { x: 0, y: 50, z: 0 };
      const velocity: Vector3 = { x: 0, y: 0, z: 0 };
      const deltaTime = 1;
      const surfaces: SurfaceInfo[] = [];

      const result = physics.applyPhysics(position, velocity, deltaTime, surfaces, false);

      // Player should fall due to gravity
      expect(result.velocity.y).toBe(-GRAVITY);
      expect(result.position.y).toBeLessThan(50);
      expect(result.isOnSurface).toBe(false);
    });

    it('should update position based on velocity', () => {
      const position: Vector3 = { x: 0, y: 10, z: 0 };
      const velocity: Vector3 = { x: 5, y: 0, z: 3 };
      const deltaTime = 1;
      const surfaces: SurfaceInfo[] = [];

      const result = physics.applyPhysics(position, velocity, deltaTime, surfaces, false);

      expect(result.position.x).toBe(5);
      expect(result.position.z).toBe(3);
    });

    it('should land on ground when y reaches 0', () => {
      const position: Vector3 = { x: 0, y: 0.5, z: 0 };
      const velocity: Vector3 = { x: 0, y: -10, z: 0 };
      const deltaTime = 1;
      const surfaces: SurfaceInfo[] = [];

      const result = physics.applyPhysics(position, velocity, deltaTime, surfaces, false);

      expect(result.position.y).toBe(0);
      expect(result.velocity.y).toBe(0);
      expect(result.isOnSurface).toBe(true);
      expect(result.surfaceType).toBe('ground');
    });

    it('should land on rooftop surface', () => {
      const position: Vector3 = { x: 0, y: 10.1, z: 0 };
      const velocity: Vector3 = { x: 0, y: -1, z: 0 };
      const deltaTime = 0.2;
      const surfaces: SurfaceInfo[] = [
        {
          type: 'rooftop',
          height: 10,
          x: 0,
          z: 0,
          width: 10,
          depth: 10,
        },
      ];

      const result = physics.applyPhysics(position, velocity, deltaTime, surfaces, false);

      expect(result.position.y).toBe(10);
      expect(result.velocity.y).toBe(0);
      expect(result.isOnSurface).toBe(true);
      expect(result.surfaceType).toBe('rooftop');
    });

    it('should apply water resistance when in water', () => {
      const position: Vector3 = { x: 0, y: 5, z: 0 };
      const velocity: Vector3 = { x: 10, y: -10, z: 10 };
      const deltaTime = 0.1;
      const surfaces: SurfaceInfo[] = [];

      const result = physics.applyPhysics(position, velocity, deltaTime, surfaces, true);

      // Horizontal velocity should be reduced by water
      expect(result.velocity.x).toBeCloseTo(10 * WATER_SPEED_MULTIPLIER, 5);
      expect(result.velocity.z).toBeCloseTo(10 * WATER_SPEED_MULTIPLIER, 5);
      // Vertical velocity should be affected by both water resistance and gravity
      // Initial: -10, after gravity: -10 - 20 * 0.1 = -12, after water: -12 * 0.5 = -6
      expect(result.velocity.y).toBeCloseTo(-6, 1);
    });
  });

  describe('applyJumpForce', () => {
    it('should set vertical velocity to jump force', () => {
      const velocity: Vector3 = { x: 5, y: 0, z: 3 };
      const jumpForce = 10;

      const result = physics.applyJumpForce(velocity, jumpForce);

      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
      expect(result.z).toBe(3);
    });
  });

  describe('applyJetpackForce', () => {
    it('should add jetpack force to vertical velocity', () => {
      const velocity: Vector3 = { x: 5, y: -5, z: 3 };
      const jetpackForce = 15;
      const deltaTime = 1;

      const result = physics.applyJetpackForce(velocity, jetpackForce, deltaTime);

      expect(result.x).toBe(5);
      expect(result.y).toBe(10); // -5 + 15
      expect(result.z).toBe(3);
    });
  });

  describe('isInWater', () => {
    it('should return true when player is below water surface', () => {
      const position: Vector3 = { x: 0, y: 0.3, z: 0 };
      const waterSurfaces: SurfaceInfo[] = [
        {
          type: 'water',
          height: 0.5,
          x: 0,
          z: 0,
          width: 10,
          depth: 10,
        },
      ];

      const result = physics.isInWater(position, waterSurfaces);

      expect(result).toBe(true);
    });

    it('should return false when player is above water surface', () => {
      const position: Vector3 = { x: 0, y: 1, z: 0 };
      const waterSurfaces: SurfaceInfo[] = [
        {
          type: 'water',
          height: 0.5,
          x: 0,
          z: 0,
          width: 10,
          depth: 10,
        },
      ];

      const result = physics.isInWater(position, waterSurfaces);

      expect(result).toBe(false);
    });

    it('should return false when player is outside water bounds', () => {
      const position: Vector3 = { x: 20, y: 0.3, z: 0 };
      const waterSurfaces: SurfaceInfo[] = [
        {
          type: 'water',
          height: 0.5,
          x: 0,
          z: 0,
          width: 10,
          depth: 10,
        },
      ];

      const result = physics.isInWater(position, waterSurfaces);

      expect(result).toBe(false);
    });
  });

  describe('getSurfaceAtPosition', () => {
    it('should return ground surface when at ground level', () => {
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      const surfaces: SurfaceInfo[] = [];

      const result = physics.getSurfaceAtPosition(position, surfaces);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('ground');
    });

    it('should return rooftop surface when on rooftop', () => {
      const position: Vector3 = { x: 0, y: 10, z: 0 };
      const surfaces: SurfaceInfo[] = [
        {
          type: 'rooftop',
          height: 10,
          x: 0,
          z: 0,
          width: 10,
          depth: 10,
        },
      ];

      const result = physics.getSurfaceAtPosition(position, surfaces);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('rooftop');
    });

    it('should return null when not on any surface', () => {
      const position: Vector3 = { x: 0, y: 5, z: 0 };
      const surfaces: SurfaceInfo[] = [];

      const result = physics.getSurfaceAtPosition(position, surfaces);

      expect(result).toBeNull();
    });
  });

  describe('clampVelocity', () => {
    it('should clamp horizontal velocity when exceeding max', () => {
      const velocity: Vector3 = { x: 20, y: 5, z: 20 };
      const maxHorizontal = 10;
      const maxVertical = 50;

      const result = physics.clampVelocity(velocity, maxHorizontal, maxVertical);

      const horizontalSpeed = Math.sqrt(result.x * result.x + result.z * result.z);
      expect(horizontalSpeed).toBeCloseTo(maxHorizontal, 5);
      expect(result.y).toBe(5);
    });

    it('should clamp vertical velocity when exceeding max', () => {
      const velocity: Vector3 = { x: 5, y: 100, z: 5 };
      const maxHorizontal = 50;
      const maxVertical = 50;

      const result = physics.clampVelocity(velocity, maxHorizontal, maxVertical);

      expect(result.x).toBe(5);
      expect(result.y).toBe(50);
      expect(result.z).toBe(5);
    });

    it('should not modify velocity when within limits', () => {
      const velocity: Vector3 = { x: 5, y: 5, z: 5 };
      const maxHorizontal = 50;
      const maxVertical = 50;

      const result = physics.clampVelocity(velocity, maxHorizontal, maxVertical);

      expect(result.x).toBe(5);
      expect(result.y).toBe(5);
      expect(result.z).toBe(5);
    });
  });

  describe('applyFriction', () => {
    it('should reduce horizontal velocity', () => {
      const velocity: Vector3 = { x: 10, y: 5, z: 10 };
      const friction = 2;
      const deltaTime = 1;

      const result = physics.applyFriction(velocity, friction, deltaTime);

      expect(result.x).toBeLessThan(10);
      expect(result.z).toBeLessThan(10);
      expect(result.y).toBe(5); // Vertical velocity unchanged
    });

    it('should not affect vertical velocity', () => {
      const velocity: Vector3 = { x: 10, y: 20, z: 10 };
      const friction = 5;
      const deltaTime = 1;

      const result = physics.applyFriction(velocity, friction, deltaTime);

      expect(result.y).toBe(20);
    });
  });

  describe('gravity', () => {
    it('should return default gravity value', () => {
      expect(physics.getGravity()).toBe(GRAVITY);
    });

    it('should allow setting custom gravity', () => {
      physics.setGravity(15);
      expect(physics.getGravity()).toBe(15);
    });
  });
});
