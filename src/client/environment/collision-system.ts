import { Vector3 } from '../../shared/types/game';
import { BuildingData } from '../player/player-physics';

/**
 * Dynamic object data for collision detection
 */
export interface DynamicObject {
  position: Vector3;
  radius: number;
  type: 'car' | 'pedestrian';
}

/**
 * Collision result containing adjusted position and whether collision occurred
 */
export interface CollisionResult {
  position: Vector3;
  collided: boolean;
  normal?: Vector3 | undefined; // Surface normal at collision point
}

/**
 * CollisionSystem handles collision detection with buildings, cars, and pedestrians
 */
export class CollisionSystem {
  private buildings: BuildingData[] = [];
  private dynamicObjects: DynamicObject[] = [];

  /**
   * Register buildings for collision detection
   */
  public registerBuildings(buildings: BuildingData[]): void {
    this.buildings = buildings;
  }

  /**
   * Register dynamic objects (cars, pedestrians) for collision detection
   */
  public registerDynamicObjects(objects: DynamicObject[]): void {
    this.dynamicObjects = objects;
  }

  /**
   * Update dynamic objects list
   */
  public updateDynamicObjects(objects: DynamicObject[]): void {
    this.dynamicObjects = objects;
  }

  /**
   * Check collision and resolve position
   */
  public checkCollision(
    currentPosition: Vector3,
    targetPosition: Vector3,
    playerRadius = 0.5
  ): CollisionResult {
    let finalPosition = { ...targetPosition };
    let collided = false;
    let collisionNormal: Vector3 | undefined;

    // Check if player is currently inside a building
    const isCurrentlyInside = this.isInsideBuilding(currentPosition, playerRadius);
    
    // Check if movement is large (potential tunneling)
    const dx = targetPosition.x - currentPosition.x;
    const dy = targetPosition.y - currentPosition.y;
    const dz = targetPosition.z - currentPosition.z;
    const movementDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Only use swept collision for very fast movement (e.g., jetpacking)
    // Threshold: 2.0 units per frame (much larger than normal movement)
    const SWEPT_COLLISION_THRESHOLD = 2.0;
    
    // Only use swept collision if player is not inside a building
    // (if inside, we want to push them out, not block movement)
    if (!isCurrentlyInside && movementDistance > SWEPT_COLLISION_THRESHOLD) {
      const sweptResult = this.checkSweptCollision(
        currentPosition,
        targetPosition,
        playerRadius
      );
      
      if (sweptResult.collided) {
        return sweptResult;
      }
    }

    // Check building collisions at target position
    for (const building of this.buildings) {
      const buildingCollision = this.checkBuildingCollision(
        finalPosition,
        playerRadius,
        building
      );

      if (buildingCollision.collided) {
        finalPosition = buildingCollision.position;
        collided = true;
        collisionNormal = buildingCollision.normal;
      }
    }

    // Check dynamic object collisions
    for (const obj of this.dynamicObjects) {
      const objCollision = this.checkDynamicObjectCollision(
        finalPosition,
        playerRadius,
        obj
      );

      if (objCollision.collided) {
        finalPosition = objCollision.position;
        collided = true;
        collisionNormal = objCollision.normal;
      }
    }

    return {
      position: finalPosition,
      collided,
      normal: collisionNormal,
    };
  }

  /**
   * Check collision along movement path (swept collision)
   */
  private checkSweptCollision(
    startPosition: Vector3,
    endPosition: Vector3,
    playerRadius: number
  ): CollisionResult {
    // Calculate movement distance
    const dx = endPosition.x - startPosition.x;
    const dy = endPosition.y - startPosition.y;
    const dz = endPosition.z - startPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Limit sample steps to reasonable number for performance
    // Use larger step size (1.0 unit) instead of playerRadius (0.5)
    const steps = Math.min(Math.ceil(distance / 1.0), 10); // Max 10 samples
    
    // Pre-filter buildings that are potentially in the path
    const midX = (startPosition.x + endPosition.x) / 2;
    const midZ = (startPosition.z + endPosition.z) / 2;
    const searchRadius = distance / 2 + 20; // Add buffer
    
    const nearbyBuildings = this.buildings.filter(building => {
      const distX = Math.abs(building.position.x - midX);
      const distZ = Math.abs(building.position.z - midZ);
      return distX < searchRadius && distZ < searchRadius;
    });
    
    // If no nearby buildings, skip swept collision
    if (nearbyBuildings.length === 0) {
      return {
        position: endPosition,
        collided: false,
      };
    }
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const samplePosition: Vector3 = {
        x: startPosition.x + dx * t,
        y: startPosition.y + dy * t,
        z: startPosition.z + dz * t,
      };
      
      // Check collision at this sample point (only nearby buildings)
      for (const building of nearbyBuildings) {
        const collision = this.checkBuildingCollision(
          samplePosition,
          playerRadius,
          building
        );
        
        if (collision.collided) {
          // Return the adjusted position from collision detection
          return collision;
        }
      }
    }
    
    return {
      position: endPosition,
      collided: false,
    };
  }

  /**
   * Check collision with a building
   */
  private checkBuildingCollision(
    position: Vector3,
    playerRadius: number,
    building: BuildingData
  ): CollisionResult {
    if (building.shape === 'box') {
      return this.checkBoxCollision(position, playerRadius, building);
    } else if (building.shape === 'cylinder') {
      return this.checkCylinderCollision(position, playerRadius, building);
    }

    return { position, collided: false };
  }

  /**
   * Check collision with a box-shaped building
   */
  private checkBoxCollision(
    position: Vector3,
    playerRadius: number,
    building: BuildingData
  ): CollisionResult {
    // Calculate building bounds
    const minX = building.position.x - building.width / 2;
    const maxX = building.position.x + building.width / 2;
    const minZ = building.position.z - building.depth / 2;
    const maxZ = building.position.z + building.depth / 2;
    const minY = building.position.y - building.height / 2;
    const maxY = building.position.y + building.height / 2;

    // Check if player is within building height range
    if (position.y < minY || position.y > maxY) {
      return { position, collided: false };
    }

    // Find closest point on box to player
    const closestX = Math.max(minX, Math.min(maxX, position.x));
    const closestZ = Math.max(minZ, Math.min(maxZ, position.z));

    // Calculate distance from player to closest point
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    const distanceSquared = dx * dx + dz * dz;

    // Check if collision occurred
    if (distanceSquared < playerRadius * playerRadius) {
      // Calculate collision normal
      const distance = Math.sqrt(distanceSquared);
      const normal: Vector3 = {
        x: distance > 0 ? dx / distance : 0,
        y: 0,
        z: distance > 0 ? dz / distance : 0,
      };

      // Push player out of building
      const penetrationDepth = playerRadius - distance;
      const adjustedPosition: Vector3 = {
        x: position.x + normal.x * penetrationDepth,
        y: position.y,
        z: position.z + normal.z * penetrationDepth,
      };

      return {
        position: adjustedPosition,
        collided: true,
        normal,
      };
    }

    return { position, collided: false };
  }

  /**
   * Check collision with a cylinder-shaped building
   */
  private checkCylinderCollision(
    position: Vector3,
    playerRadius: number,
    building: BuildingData
  ): CollisionResult {
    const minY = building.position.y - building.height / 2;
    const maxY = building.position.y + building.height / 2;

    // Check if player is within building height range
    if (position.y < minY || position.y > maxY) {
      return { position, collided: false };
    }

    // Calculate distance from player to cylinder center (2D)
    const dx = position.x - building.position.x;
    const dz = position.z - building.position.z;
    const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);

    const cylinderRadius = building.width / 2;
    const totalRadius = cylinderRadius + playerRadius;

    // Check if collision occurred
    if (distanceFromCenter < totalRadius) {
      // Calculate collision normal
      const normal: Vector3 = {
        x: distanceFromCenter > 0 ? dx / distanceFromCenter : 1,
        y: 0,
        z: distanceFromCenter > 0 ? dz / distanceFromCenter : 0,
      };

      // Push player out of cylinder
      const penetrationDepth = totalRadius - distanceFromCenter;
      const adjustedPosition: Vector3 = {
        x: position.x + normal.x * penetrationDepth,
        y: position.y,
        z: position.z + normal.z * penetrationDepth,
      };

      return {
        position: adjustedPosition,
        collided: true,
        normal,
      };
    }

    return { position, collided: false };
  }

  /**
   * Check collision with a dynamic object (car or pedestrian)
   */
  private checkDynamicObjectCollision(
    position: Vector3,
    playerRadius: number,
    obj: DynamicObject
  ): CollisionResult {
    // Only check collision if player is at similar height
    const heightDiff = Math.abs(position.y - obj.position.y);
    if (heightDiff > 2) {
      return { position, collided: false };
    }

    // Calculate distance between player and object (2D)
    const dx = position.x - obj.position.x;
    const dz = position.z - obj.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const totalRadius = playerRadius + obj.radius;

    // Check if collision occurred
    if (distance < totalRadius) {
      // Calculate collision normal
      const normal: Vector3 = {
        x: distance > 0 ? dx / distance : 1,
        y: 0,
        z: distance > 0 ? dz / distance : 0,
      };

      // Push player away from object
      const penetrationDepth = totalRadius - distance;
      const adjustedPosition: Vector3 = {
        x: position.x + normal.x * penetrationDepth,
        y: position.y,
        z: position.z + normal.z * penetrationDepth,
      };

      return {
        position: adjustedPosition,
        collided: true,
        normal,
      };
    }

    return { position, collided: false };
  }

  /**
   * Apply sliding along collision surface
   */
  public applySlidingMovement(
    velocity: Vector3,
    collisionNormal: Vector3
  ): Vector3 {
    // Project velocity onto collision surface (remove component along normal)
    const dotProduct = velocity.x * collisionNormal.x + velocity.z * collisionNormal.z;

    return {
      x: velocity.x - collisionNormal.x * dotProduct,
      y: velocity.y,
      z: velocity.z - collisionNormal.z * dotProduct,
    };
  }

  /**
   * Check if a position is inside any building
   */
  public isInsideBuilding(position: Vector3, playerRadius = 0.5): boolean {
    // Quick spatial filter: only check buildings within reasonable distance
    const searchRadius = 50; // Only check buildings within 50 units
    
    for (const building of this.buildings) {
      // Quick distance check before detailed collision
      const dx = Math.abs(position.x - building.position.x);
      const dz = Math.abs(position.z - building.position.z);
      
      if (dx > searchRadius || dz > searchRadius) {
        continue;
      }
      
      const minY = building.position.y - building.height / 2;
      const maxY = building.position.y + building.height / 2;

      // Check height range
      if (position.y < minY || position.y > maxY) {
        continue;
      }

      if (building.shape === 'box') {
        const minX = building.position.x - building.width / 2 + playerRadius;
        const maxX = building.position.x + building.width / 2 - playerRadius;
        const minZ = building.position.z - building.depth / 2 + playerRadius;
        const maxZ = building.position.z + building.depth / 2 - playerRadius;

        if (
          position.x >= minX &&
          position.x <= maxX &&
          position.z >= minZ &&
          position.z <= maxZ
        ) {
          return true;
        }
      } else if (building.shape === 'cylinder') {
        const dx = position.x - building.position.x;
        const dz = position.z - building.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const cylinderRadius = building.width / 2 - playerRadius;

        if (distance <= cylinderRadius) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get nearest safe position outside buildings
   */
  public getNearestSafePosition(position: Vector3, playerRadius = 0.5): Vector3 {
    const safePosition = { ...position };
    const maxIterations = 10;
    let iteration = 0;

    while (this.isInsideBuilding(safePosition, playerRadius) && iteration < maxIterations) {
      // Find nearest building
      let nearestBuilding: BuildingData | null = null;
      let minDistance = Infinity;

      for (const building of this.buildings) {
        const dx = safePosition.x - building.position.x;
        const dz = safePosition.z - building.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < minDistance) {
          minDistance = distance;
          nearestBuilding = building;
        }
      }

      if (nearestBuilding) {
        // Move away from nearest building
        const dx = safePosition.x - nearestBuilding.position.x;
        const dz = safePosition.z - nearestBuilding.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance > 0) {
          const moveDistance = nearestBuilding.width / 2 + playerRadius + 1;
          safePosition.x = nearestBuilding.position.x + (dx / distance) * moveDistance;
          safePosition.z = nearestBuilding.position.z + (dz / distance) * moveDistance;
        } else {
          // If exactly at center, move in arbitrary direction
          safePosition.x += nearestBuilding.width / 2 + playerRadius + 1;
        }
      }

      iteration++;
    }

    return safePosition;
  }

  /**
   * Clear all registered data
   */
  public clear(): void {
    this.buildings = [];
    this.dynamicObjects = [];
  }
}
