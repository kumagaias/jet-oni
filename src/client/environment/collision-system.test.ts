import { describe, it, expect, beforeEach } from 'vitest';
import { CollisionSystem, CollisionObject } from './collision-system';
import { Vector3 } from '../../shared/types/game';

describe('CollisionSystem', () => {
  let collisionSystem: CollisionSystem;

  beforeEach(() => {
    collisionSystem = new CollisionSystem();
  });

  describe('addCollisionObject', () => {
    it('should add collision object to the system', () => {
      const object: CollisionObject = {
        shape: 'box',
        position: { x: 0, y: 0, z: 0 },
        dimensions: { width: 10, height: 10, depth: 10 },
        type: 'building',
      };

      collisionSystem.addCollisionObject(object);

      expect(collisionSystem.getCollisionObjects()).toHaveLength(1);
      expect(collisionSystem.getCollisionObjects()[0]).toEqual(object);
    });
  });

  describe('clearCollisionObjects', () => {
    it('should remove all collision objects', () => {
      const object: CollisionObject = {
        shape: 'box',
        position: { x: 0, y: 0, z: 0 },
        dimensions: { width: 10, height: 10, depth: 10 },
        type: 'building',
      };

      collisionSystem.addCollisionObject(object);
      expect(collisionSystem.getCollisionObjects()).toHaveLength(1);

      collisionSystem.clearCollisionObjects();
      expect(collisionSystem.getCollisionObjects()).toHaveLength(0);
    });
  });

  describe('checkAndResolveCollision - Box', () => {
    beforeEach(() => {
      const box: CollisionObject = {
        shape: 'box',
        position: { x: 0, y: 5, z: 0 },
        dimensions: { width: 10, height: 10, depth: 10 },
        type: 'building',
      };
      collisionSystem.addCollisionObject(box);
    });

    it('should detect collision when player is inside box', () => {
      const playerPosition: Vector3 = { x: 0, y: 5, z: 0 };
      const playerVelocity: Vector3 = { x: 1, y: 0, z: 0 };

      const result = collisionSystem.checkAndResolveCollision(playerPosition, playerVelocity);

      // Player should be pushed out
      expect(result.position.x).not.toBe(playerPosition.x);
    });

    it('should not detect collision when player is far from box', () => {
      const playerPosition: Vector3 = { x: 20, y: 5, z: 20 };
      const playerVelocity: Vector3 = { x: 1, y: 0, z: 0 };

      const result = collisionSystem.checkAndResolveCollision(playerPosition, playerVelocity);

      // Position should remain unchanged
      expect(result.position).toEqual(playerPosition);
      expect(result.velocity).toEqual(playerVelocity);
    });

    it('should slide along box surface when colliding', () => {
      const playerPosition: Vector3 = { x: 5.3, y: 5, z: 0 };
      const playerVelocity: Vector3 = { x: -1, y: 0, z: 1 };

      const result = collisionSystem.checkAndResolveCollision(playerPosition, playerVelocity);

      // Player should be pushed out and velocity should be modified
      expect(result.position.x).toBeGreaterThan(playerPosition.x);
      // Velocity component perpendicular to surface should be removed
      expect(Math.abs(result.velocity.x)).toBeLessThan(Math.abs(playerVelocity.x));
    });
  });

  describe('checkAndResolveCollision - Cylinder', () => {
    beforeEach(() => {
      const cylinder: CollisionObject = {
        shape: 'cylinder',
        position: { x: 0, y: 10, z: 0 },
        dimensions: { radius: 5, height: 20 },
        type: 'building',
      };
      collisionSystem.addCollisionObject(cylinder);
    });

    it('should detect collision when player is inside cylinder horizontally', () => {
      const playerPosition: Vector3 = { x: 2, y: 10, z: 0 };
      const playerVelocity: Vector3 = { x: -1, y: 0, z: 0 };

      const result = collisionSystem.checkAndResolveCollision(playerPosition, playerVelocity);

      // Player should be pushed out horizontally
      const distance = Math.sqrt(result.position.x * result.position.x + result.position.z * result.position.z);
      expect(distance).toBeGreaterThan(Math.sqrt(playerPosition.x * playerPosition.x + playerPosition.z * playerPosition.z));
    });

    it('should not detect collision when player is outside cylinder height', () => {
      const playerPosition: Vector3 = { x: 2, y: 25, z: 0 };
      const playerVelocity: Vector3 = { x: -1, y: 0, z: 0 };

      const result = collisionSystem.checkAndResolveCollision(playerPosition, playerVelocity);

      // Position should remain unchanged
      expect(result.position).toEqual(playerPosition);
      expect(result.velocity).toEqual(playerVelocity);
    });

    it('should not detect collision when player is far from cylinder', () => {
      const playerPosition: Vector3 = { x: 20, y: 10, z: 0 };
      const playerVelocity: Vector3 = { x: -1, y: 0, z: 0 };

      const result = collisionSystem.checkAndResolveCollision(playerPosition, playerVelocity);

      // Position should remain unchanged
      expect(result.position).toEqual(playerPosition);
      expect(result.velocity).toEqual(playerVelocity);
    });
  });

  describe('checkAndResolveCollision - Sphere', () => {
    beforeEach(() => {
      const sphere: CollisionObject = {
        shape: 'sphere',
        position: { x: 0, y: 5, z: 0 },
        dimensions: { radius: 3 },
        type: 'obstacle',
      };
      collisionSystem.addCollisionObject(sphere);
    });

    it('should detect collision when player is inside sphere', () => {
      const playerPosition: Vector3 = { x: 1, y: 5, z: 0 };
      const playerVelocity: Vector3 = { x: -1, y: 0, z: 0 };

      const result = collisionSystem.checkAndResolveCollision(playerPosition, playerVelocity);

      // Player should be pushed out
      const distance = Math.sqrt(
        result.position.x * result.position.x +
        (result.position.y - 5) * (result.position.y - 5) +
        result.position.z * result.position.z
      );
      expect(distance).toBeGreaterThan(Math.sqrt(
        playerPosition.x * playerPosition.x +
        (playerPosition.y - 5) * (playerPosition.y - 5) +
        playerPosition.z * playerPosition.z
      ));
    });

    it('should not detect collision when player is far from sphere', () => {
      const playerPosition: Vector3 = { x: 10, y: 5, z: 0 };
      const playerVelocity: Vector3 = { x: -1, y: 0, z: 0 };

      const result = collisionSystem.checkAndResolveCollision(playerPosition, playerVelocity);

      // Position should remain unchanged
      expect(result.position).toEqual(playerPosition);
      expect(result.velocity).toEqual(playerVelocity);
    });
  });

  describe('multiple collisions', () => {
    it('should resolve collision when player is inside a box', () => {
      const box: CollisionObject = {
        shape: 'box',
        position: { x: 0, y: 5, z: 0 },
        dimensions: { width: 10, height: 10, depth: 10 },
        type: 'building',
      };

      collisionSystem.addCollisionObject(box);

      // Place player inside the box
      const playerPosition: Vector3 = { x: 0, y: 5, z: 0 };
      const playerVelocity: Vector3 = { x: 1, y: 0, z: 0 };

      const result = collisionSystem.checkAndResolveCollision(playerPosition, playerVelocity);

      // Player should be pushed out
      const distanceFromCenter = Math.sqrt(
        result.position.x * result.position.x +
        result.position.z * result.position.z
      );
      expect(distanceFromCenter).toBeGreaterThan(0);
    });
  });

  describe('playerRadius', () => {
    it('should return default player radius', () => {
      expect(collisionSystem.getPlayerRadius()).toBe(0.5);
    });

    it('should allow setting custom player radius', () => {
      collisionSystem.setPlayerRadius(1.0);
      expect(collisionSystem.getPlayerRadius()).toBe(1.0);
    });

    it('should affect collision detection with custom radius', () => {
      collisionSystem.setPlayerRadius(2.0);

      const box: CollisionObject = {
        shape: 'box',
        position: { x: 0, y: 5, z: 0 },
        dimensions: { width: 10, height: 10, depth: 10 },
        type: 'building',
      };
      collisionSystem.addCollisionObject(box);

      // With larger radius, collision should be detected from further away
      const playerPosition: Vector3 = { x: 6.5, y: 5, z: 0 };
      const playerVelocity: Vector3 = { x: -1, y: 0, z: 0 };

      const result = collisionSystem.checkAndResolveCollision(playerPosition, playerVelocity);

      // Should detect collision and push player out
      expect(result.position.x).toBeGreaterThan(playerPosition.x);
    });
  });
});
