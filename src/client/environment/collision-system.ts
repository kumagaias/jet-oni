import { Vector3 } from '../../shared/types/game';
import * as THREE from 'three';

/**
 * Collision shape types
 */
export type CollisionShape = 'box' | 'cylinder' | 'sphere';

/**
 * Collision object definition
 */
export interface CollisionObject {
  shape: CollisionShape;
  position: Vector3;
  dimensions: {
    width?: number;
    height?: number;
    depth?: number;
    radius?: number;
  };
  type: 'building' | 'vehicle' | 'pedestrian' | 'obstacle';
}

/**
 * Collision result
 */
export interface CollisionResult {
  hasCollision: boolean;
  normal: Vector3;
  penetrationDepth: number;
  collisionPoint: Vector3;
}

/**
 * CollisionSystem handles collision detection between player and environment
 */
export class CollisionSystem {
  private collisionObjects: CollisionObject[] = [];
  private playerRadius = 0.5; // Player collision radius

  /**
   * Add a collision object to the system
   */
  public addCollisionObject(object: CollisionObject): void {
    this.collisionObjects.push(object);
  }

  /**
   * Remove all collision objects
   */
  public clearCollisionObjects(): void {
    this.collisionObjects = [];
  }

  /**
   * Build collision objects from Three.js scene
   */
  public buildFromScene(buildingsGroup: THREE.Group): void {
    this.clearCollisionObjects();

    buildingsGroup.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const geometry = object.geometry;
        const position = new THREE.Vector3();
        object.getWorldPosition(position);

        // Determine shape and dimensions based on geometry
        if (geometry instanceof THREE.BoxGeometry) {
          const params = geometry.parameters;
          this.addCollisionObject({
            shape: 'box',
            position: { x: position.x, y: position.y, z: position.z },
            dimensions: {
              width: params.width,
              height: params.height,
              depth: params.depth,
            },
            type: 'building',
          });
        } else if (geometry instanceof THREE.CylinderGeometry) {
          const params = geometry.parameters;
          this.addCollisionObject({
            shape: 'cylinder',
            position: { x: position.x, y: position.y, z: position.z },
            dimensions: {
              radius: params.radiusTop,
              height: params.height,
            },
            type: 'building',
          });
        }
      }
    });
  }

  /**
   * Check collision with all objects and resolve
   */
  public checkAndResolveCollision(
    playerPosition: Vector3,
    playerVelocity: Vector3
  ): { position: Vector3; velocity: Vector3 } {
    let resolvedPosition = { ...playerPosition };
    let resolvedVelocity = { ...playerVelocity };

    for (const object of this.collisionObjects) {
      const collision = this.checkCollision(resolvedPosition, object);

      if (collision.hasCollision) {
        // Resolve collision by sliding along the surface
        const resolved = this.resolveCollision(
          resolvedPosition,
          resolvedVelocity,
          collision
        );
        resolvedPosition = resolved.position;
        resolvedVelocity = resolved.velocity;
      }
    }

    return { position: resolvedPosition, velocity: resolvedVelocity };
  }

  /**
   * Check collision between player and a single object
   */
  private checkCollision(playerPosition: Vector3, object: CollisionObject): CollisionResult {
    switch (object.shape) {
      case 'box':
        return this.checkBoxCollision(playerPosition, object);
      case 'cylinder':
        return this.checkCylinderCollision(playerPosition, object);
      case 'sphere':
        return this.checkSphereCollision(playerPosition, object);
      default:
        return {
          hasCollision: false,
          normal: { x: 0, y: 0, z: 0 },
          penetrationDepth: 0,
          collisionPoint: { x: 0, y: 0, z: 0 },
        };
    }
  }

  /**
   * Check collision with box-shaped object
   */
  private checkBoxCollision(playerPosition: Vector3, object: CollisionObject): CollisionResult {
    const { width = 0, height = 0, depth = 0 } = object.dimensions;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const halfDepth = depth / 2;

    // Calculate closest point on box to player
    const closestX = Math.max(
      object.position.x - halfWidth,
      Math.min(playerPosition.x, object.position.x + halfWidth)
    );
    const closestY = Math.max(
      object.position.y - halfHeight,
      Math.min(playerPosition.y, object.position.y + halfHeight)
    );
    const closestZ = Math.max(
      object.position.z - halfDepth,
      Math.min(playerPosition.z, object.position.z + halfDepth)
    );

    // Calculate distance from player to closest point
    const dx = playerPosition.x - closestX;
    const dy = playerPosition.y - closestY;
    const dz = playerPosition.z - closestZ;
    const distanceSquared = dx * dx + dy * dy + dz * dz;

    // Check if collision occurs
    if (distanceSquared < this.playerRadius * this.playerRadius) {
      const distance = Math.sqrt(distanceSquared);
      const penetrationDepth = this.playerRadius - distance;

      // Calculate collision normal
      let normal = { x: dx, y: dy, z: dz };
      if (distance > 0) {
        normal = {
          x: dx / distance,
          y: dy / distance,
          z: dz / distance,
        };
      } else {
        // Player is inside the box, push out in closest direction
        const distToMinX = Math.abs(playerPosition.x - (object.position.x - halfWidth));
        const distToMaxX = Math.abs(playerPosition.x - (object.position.x + halfWidth));
        const distToMinZ = Math.abs(playerPosition.z - (object.position.z - halfDepth));
        const distToMaxZ = Math.abs(playerPosition.z - (object.position.z + halfDepth));

        const minDist = Math.min(distToMinX, distToMaxX, distToMinZ, distToMaxZ);

        if (minDist === distToMinX) normal = { x: -1, y: 0, z: 0 };
        else if (minDist === distToMaxX) normal = { x: 1, y: 0, z: 0 };
        else if (minDist === distToMinZ) normal = { x: 0, y: 0, z: -1 };
        else normal = { x: 0, y: 0, z: 1 };
      }

      return {
        hasCollision: true,
        normal,
        penetrationDepth,
        collisionPoint: { x: closestX, y: closestY, z: closestZ },
      };
    }

    return {
      hasCollision: false,
      normal: { x: 0, y: 0, z: 0 },
      penetrationDepth: 0,
      collisionPoint: { x: 0, y: 0, z: 0 },
    };
  }

  /**
   * Check collision with cylinder-shaped object
   */
  private checkCylinderCollision(playerPosition: Vector3, object: CollisionObject): CollisionResult {
    const { radius = 0, height = 0 } = object.dimensions;
    const halfHeight = height / 2;

    // Check if player is within cylinder height
    const minY = object.position.y - halfHeight;
    const maxY = object.position.y + halfHeight;

    if (playerPosition.y < minY || playerPosition.y > maxY) {
      return {
        hasCollision: false,
        normal: { x: 0, y: 0, z: 0 },
        penetrationDepth: 0,
        collisionPoint: { x: 0, y: 0, z: 0 },
      };
    }

    // Check horizontal distance from cylinder axis
    const dx = playerPosition.x - object.position.x;
    const dz = playerPosition.z - object.position.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);

    const totalRadius = radius + this.playerRadius;

    if (horizontalDistance < totalRadius) {
      const penetrationDepth = totalRadius - horizontalDistance;

      // Calculate collision normal (horizontal only)
      let normal = { x: 0, y: 0, z: 0 };
      if (horizontalDistance > 0) {
        normal = {
          x: dx / horizontalDistance,
          y: 0,
          z: dz / horizontalDistance,
        };
      } else {
        // Player is at cylinder center, push in arbitrary direction
        normal = { x: 1, y: 0, z: 0 };
      }

      return {
        hasCollision: true,
        normal,
        penetrationDepth,
        collisionPoint: {
          x: object.position.x + normal.x * radius,
          y: playerPosition.y,
          z: object.position.z + normal.z * radius,
        },
      };
    }

    return {
      hasCollision: false,
      normal: { x: 0, y: 0, z: 0 },
      penetrationDepth: 0,
      collisionPoint: { x: 0, y: 0, z: 0 },
    };
  }

  /**
   * Check collision with sphere-shaped object
   */
  private checkSphereCollision(playerPosition: Vector3, object: CollisionObject): CollisionResult {
    const { radius = 0 } = object.dimensions;

    const dx = playerPosition.x - object.position.x;
    const dy = playerPosition.y - object.position.y;
    const dz = playerPosition.z - object.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const totalRadius = radius + this.playerRadius;

    if (distance < totalRadius) {
      const penetrationDepth = totalRadius - distance;

      // Calculate collision normal
      let normal = { x: 0, y: 0, z: 0 };
      if (distance > 0) {
        normal = {
          x: dx / distance,
          y: dy / distance,
          z: dz / distance,
        };
      } else {
        // Player is at sphere center, push in arbitrary direction
        normal = { x: 0, y: 1, z: 0 };
      }

      return {
        hasCollision: true,
        normal,
        penetrationDepth,
        collisionPoint: {
          x: object.position.x + normal.x * radius,
          y: object.position.y + normal.y * radius,
          z: object.position.z + normal.z * radius,
        },
      };
    }

    return {
      hasCollision: false,
      normal: { x: 0, y: 0, z: 0 },
      penetrationDepth: 0,
      collisionPoint: { x: 0, y: 0, z: 0 },
    };
  }

  /**
   * Resolve collision by sliding along surface
   */
  private resolveCollision(
    position: Vector3,
    velocity: Vector3,
    collision: CollisionResult
  ): { position: Vector3; velocity: Vector3 } {
    // Push player out of collision
    const resolvedPosition = {
      x: position.x + collision.normal.x * collision.penetrationDepth,
      y: position.y + collision.normal.y * collision.penetrationDepth,
      z: position.z + collision.normal.z * collision.penetrationDepth,
    };

    // Project velocity onto surface (sliding)
    const dotProduct =
      velocity.x * collision.normal.x +
      velocity.y * collision.normal.y +
      velocity.z * collision.normal.z;

    const resolvedVelocity = {
      x: velocity.x - collision.normal.x * dotProduct,
      y: velocity.y - collision.normal.y * dotProduct,
      z: velocity.z - collision.normal.z * dotProduct,
    };

    return {
      position: resolvedPosition,
      velocity: resolvedVelocity,
    };
  }

  /**
   * Set player collision radius
   */
  public setPlayerRadius(radius: number): void {
    this.playerRadius = radius;
  }

  /**
   * Get player collision radius
   */
  public getPlayerRadius(): number {
    return this.playerRadius;
  }

  /**
   * Get all collision objects
   */
  public getCollisionObjects(): CollisionObject[] {
    return this.collisionObjects;
  }
}
