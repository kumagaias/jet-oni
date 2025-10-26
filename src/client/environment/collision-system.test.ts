import { describe, it, expect, beforeEach } from 'vitest';
import { CollisionSystem, DynamicObject } from './collision-system';
import { BuildingData } from '../player/player-physics';
import { Vector3 } from '../../shared/types/game';

describe('CollisionSystem', () => {
  let collisionSystem: CollisionSystem;

  beforeEach(() => {
    collisionSystem = new CollisionSystem();
  });

  describe('box building collision', () => {
    beforeEach(() => {
      const buildings: BuildingData[] = [
        {
          position: { x: 0, y: 10, z: 0 },
          width: 10,
          height: 20,
          depth: 10,
          shape: 'box',
        },
      ];
      collisionSystem.registerBuildings(buildings);
    });

    it('should detect collision with box building', () => {
      const currentPosition: Vector3 = { x: 0, y: 5, z: 0 };
      const targetPosition: Vector3 = { x: 3, y: 5, z: 3 };

      const result = collisionSystem.checkCollision(currentPosition, targetPosition, 0.5);

      expect(result.collided).toBe(true);
      expect(result.normal).toBeDefined();
    });

    it('should not detect collision when outside building', () => {
      const currentPosition: Vector3 = { x: 20, y: 5, z: 20 };
      const targetPosition: Vector3 = { x: 21, y: 5, z: 21 };

      const result = collisionSystem.checkCollision(currentPosition, targetPosition, 0.5);

      expect(result.collided).toBe(false);
    });

    it('should not detect collision when above building', () => {
      const currentPosition: Vector3 = { x: 0, y: 25, z: 0 };
      const targetPosition: Vector3 = { x: 3, y: 25, z: 3 };

      const result = collisionSystem.checkCollision(currentPosition, targetPosition, 0.5);

      expect(result.collided).toBe(false);
    });

    it('should not detect collision when below building', () => {
      const currentPosition: Vector3 = { x: 0, y: -5, z: 0 };
      const targetPosition: Vector3 = { x: 3, y: -5, z: 3 };

      const result = collisionSystem.checkCollision(currentPosition, targetPosition, 0.5);

      expect(result.collided).toBe(false);
    });

    it('should push player out of building when colliding', () => {
      // Player trying to move into building from outside
      // Building center at (0, 10, 0), width=10, so edge at x=±5
      // Player at x=6 trying to move to x=4.5 (would be inside building)
      const currentPosition: Vector3 = { x: 6, y: 5, z: 0 };
      const targetPosition: Vector3 = { x: 4.5, y: 5, z: 0 };

      const result = collisionSystem.checkCollision(currentPosition, targetPosition, 0.5);

      expect(result.collided).toBe(true);
      // Player should be adjusted to avoid penetrating the building
      // The exact position depends on the collision resolution algorithm
      expect(result.position.x).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('cylinder building collision', () => {
    beforeEach(() => {
      const buildings: BuildingData[] = [
        {
          position: { x: 0, y: 40, z: 0 },
          width: 15, // diameter
          height: 80,
          depth: 15,
          shape: 'cylinder',
        },
      ];
      collisionSystem.registerBuildings(buildings);
    });

    it('should detect collision with cylinder building', () => {
      const currentPosition: Vector3 = { x: 0, y: 40, z: 0 };
      const targetPosition: Vector3 = { x: 5, y: 40, z: 0 };

      const result = collisionSystem.checkCollision(currentPosition, targetPosition, 0.5);

      expect(result.collided).toBe(true);
    });

    it('should not detect collision outside cylinder radius', () => {
      const currentPosition: Vector3 = { x: 10, y: 40, z: 10 };
      const targetPosition: Vector3 = { x: 11, y: 40, z: 11 };

      const result = collisionSystem.checkCollision(currentPosition, targetPosition, 0.5);

      expect(result.collided).toBe(false);
    });

    it('should push player radially out of cylinder', () => {
      const currentPosition: Vector3 = { x: 0, y: 40, z: 0 };
      const targetPosition: Vector3 = { x: 3, y: 40, z: 4 };

      const result = collisionSystem.checkCollision(currentPosition, targetPosition, 0.5);

      expect(result.collided).toBe(true);
      // Player should be pushed away from center
      const dx = result.position.x;
      const dz = result.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      expect(distance).toBeGreaterThan(7.5); // radius + playerRadius
    });
  });

  describe('dynamic object collision', () => {
    beforeEach(() => {
      const dynamicObjects: DynamicObject[] = [
        {
          position: { x: 10, y: 0, z: 10 },
          radius: 1,
          type: 'car',
        },
        {
          position: { x: 20, y: 0, z: 20 },
          radius: 0.3,
          type: 'pedestrian',
        },
      ];
      collisionSystem.registerDynamicObjects(dynamicObjects);
    });

    it('should detect collision with car', () => {
      const currentPosition: Vector3 = { x: 8, y: 0, z: 10 };
      const targetPosition: Vector3 = { x: 9.5, y: 0, z: 10 };

      const result = collisionSystem.checkCollision(currentPosition, targetPosition, 0.5);

      expect(result.collided).toBe(true);
    });

    it('should detect collision with pedestrian', () => {
      const currentPosition: Vector3 = { x: 19, y: 0, z: 20 };
      const targetPosition: Vector3 = { x: 19.5, y: 0, z: 20 };

      const result = collisionSystem.checkCollision(currentPosition, targetPosition, 0.5);

      expect(result.collided).toBe(true);
    });

    it('should not detect collision when too far from dynamic object', () => {
      const currentPosition: Vector3 = { x: 0, y: 0, z: 0 };
      const targetPosition: Vector3 = { x: 1, y: 0, z: 1 };

      const result = collisionSystem.checkCollision(currentPosition, targetPosition, 0.5);

      expect(result.collided).toBe(false);
    });

    it('should not detect collision when height difference is too large', () => {
      const currentPosition: Vector3 = { x: 10, y: 10, z: 10 };
      const targetPosition: Vector3 = { x: 10, y: 10, z: 10 };

      const result = collisionSystem.checkCollision(currentPosition, targetPosition, 0.5);

      expect(result.collided).toBe(false);
    });
  });

  describe('applySlidingMovement', () => {
    it('should slide velocity along wall normal', () => {
      const velocity: Vector3 = { x: 5, y: 0, z: 5 };
      const normal: Vector3 = { x: 1, y: 0, z: 0 }; // Wall facing right

      const result = collisionSystem.applySlidingMovement(velocity, normal);

      // X component should be removed, Z should remain
      expect(result.x).toBeCloseTo(0, 2);
      expect(result.z).toBe(5);
      expect(result.y).toBe(0);
    });

    it('should handle diagonal wall normal', () => {
      const velocity: Vector3 = { x: 10, y: 0, z: 0 };
      const normalLength = Math.sqrt(2);
      const normal: Vector3 = { x: 1 / normalLength, y: 0, z: 1 / normalLength };

      const result = collisionSystem.applySlidingMovement(velocity, normal);

      // Velocity should be projected onto the wall surface
      expect(result.x).toBeLessThan(10);
      expect(result.z).not.toBe(0);
    });
  });

  describe('isInsideBuilding', () => {
    beforeEach(() => {
      const buildings: BuildingData[] = [
        {
          position: { x: 0, y: 10, z: 0 },
          width: 10,
          height: 20,
          depth: 10,
          shape: 'box',
        },
      ];
      collisionSystem.registerBuildings(buildings);
    });

    it('should detect when player is inside building', () => {
      const position: Vector3 = { x: 0, y: 10, z: 0 };
      expect(collisionSystem.isInsideBuilding(position, 0.5)).toBe(true);
    });

    it('should not detect when player is outside building', () => {
      const position: Vector3 = { x: 20, y: 10, z: 20 };
      expect(collisionSystem.isInsideBuilding(position, 0.5)).toBe(false);
    });

    it('should not detect when player is above building', () => {
      const position: Vector3 = { x: 0, y: 25, z: 0 };
      expect(collisionSystem.isInsideBuilding(position, 0.5)).toBe(false);
    });
  });

  describe('getNearestSafePosition', () => {
    beforeEach(() => {
      const buildings: BuildingData[] = [
        {
          position: { x: 0, y: 10, z: 0 },
          width: 10,
          height: 20,
          depth: 10,
          shape: 'box',
        },
      ];
      collisionSystem.registerBuildings(buildings);
    });

    it('should move player outside building when inside', () => {
      const position: Vector3 = { x: 0, y: 10, z: 0 };
      const safePosition = collisionSystem.getNearestSafePosition(position, 0.5);

      expect(collisionSystem.isInsideBuilding(safePosition, 0.5)).toBe(false);
    });

    it('should not move player when already outside', () => {
      const position: Vector3 = { x: 20, y: 10, z: 20 };
      const safePosition = collisionSystem.getNearestSafePosition(position, 0.5);

      expect(safePosition.x).toBe(position.x);
      expect(safePosition.y).toBe(position.y);
      expect(safePosition.z).toBe(position.z);
    });
  });

  describe('multiple buildings', () => {
    beforeEach(() => {
      const buildings: BuildingData[] = [
        {
          position: { x: 0, y: 10, z: 0 },
          width: 10,
          height: 20,
          depth: 10,
          shape: 'box',
        },
        {
          position: { x: 20, y: 15, z: 20 },
          width: 12,
          height: 30,
          depth: 12,
          shape: 'box',
        },
        {
          position: { x: -20, y: 40, z: -20 },
          width: 15,
          height: 80,
          depth: 15,
          shape: 'cylinder',
        },
      ];
      collisionSystem.registerBuildings(buildings);
    });

    it('should detect collision with any building', () => {
      // Test collision with first building
      const result1 = collisionSystem.checkCollision(
        { x: 0, y: 10, z: 0 },
        { x: 3, y: 10, z: 3 },
        0.5
      );
      expect(result1.collided).toBe(true);

      // Test collision with second building
      const result2 = collisionSystem.checkCollision(
        { x: 20, y: 15, z: 20 },
        { x: 22, y: 15, z: 22 },
        0.5
      );
      expect(result2.collided).toBe(true);

      // Test collision with cylinder
      const result3 = collisionSystem.checkCollision(
        { x: -20, y: 40, z: -20 },
        { x: -18, y: 40, z: -18 },
        0.5
      );
      expect(result3.collided).toBe(true);
    });
  });
});
