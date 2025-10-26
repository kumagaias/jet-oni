import * as THREE from 'three';
import { Vector3 } from '../../shared/types/game';
import { GRAVITY, MAP_SIZE, WATER_SPEED_MULTIPLIER } from '../../shared/constants';

/**
 * Surface type for landing detection
 */
export type SurfaceType = 'ground' | 'rooftop' | 'bridge' | 'water' | 'none';

/**
 * Physics result containing updated position, velocity, and surface info
 */
export interface PhysicsResult {
  position: Vector3;
  velocity: Vector3;
  isOnSurface: boolean;
  surfaceType: SurfaceType;
  surfaceHeight: number;
}

/**
 * Building data for collision detection
 */
export interface BuildingData {
  position: Vector3;
  width: number;
  height: number;
  depth: number;
  shape: 'box' | 'cylinder';
}

/**
 * Bridge data for landing detection
 */
export interface BridgeData {
  position: Vector3;
  width: number;
  height: number;
  depth: number;
}

/**
 * Water area data for speed reduction
 */
export interface WaterArea {
  x: number;
  z: number;
  width: number;
  depth: number;
}

/**
 * PlayerPhysics handles gravity, velocity, acceleration, and surface detection
 */
export class PlayerPhysics {
  private buildings: BuildingData[] = [];
  private bridges: BridgeData[] = [];
  private waterAreas: WaterArea[] = [];

  /**
   * Register buildings for rooftop landing detection
   */
  public registerBuildings(buildings: BuildingData[]): void {
    this.buildings = buildings;
  }

  /**
   * Register bridges for landing detection
   */
  public registerBridges(bridges: BridgeData[]): void {
    this.bridges = bridges;
  }

  /**
   * Register water areas for speed reduction
   */
  public registerWaterAreas(waterAreas: WaterArea[]): void {
    this.waterAreas = waterAreas;
  }

  /**
   * Apply physics to player position and velocity
   */
  public applyPhysics(
    position: Vector3,
    velocity: Vector3,
    deltaTime: number,
    isJetpacking: boolean
  ): PhysicsResult {
    // Create mutable copies
    const newPosition = { ...position };
    const newVelocity = { ...velocity };

    // Apply gravity if not jetpacking
    if (!isJetpacking) {
      newVelocity.y -= GRAVITY * deltaTime;
    }

    // Apply velocity to position
    newPosition.x += newVelocity.x * deltaTime;
    newPosition.y += newVelocity.y * deltaTime;
    newPosition.z += newVelocity.z * deltaTime;

    // Check for surface landing
    const surfaceCheck = this.checkSurfaceLanding(newPosition, newVelocity);

    // If on surface, stop vertical movement
    if (surfaceCheck.isOnSurface) {
      newPosition.y = surfaceCheck.surfaceHeight;
      newVelocity.y = 0;
    }

    // Clamp to map bounds
    newPosition.x = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, newPosition.x));
    newPosition.z = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, newPosition.z));

    // Prevent falling below ground
    if (newPosition.y < 0) {
      newPosition.y = 0;
      newVelocity.y = 0;
    }

    return {
      position: newPosition,
      velocity: newVelocity,
      isOnSurface: surfaceCheck.isOnSurface,
      surfaceType: surfaceCheck.surfaceType,
      surfaceHeight: surfaceCheck.surfaceHeight,
    };
  }

  /**
   * Check if player is landing on any surface
   */
  private checkSurfaceLanding(position: Vector3, velocity: Vector3): {
    isOnSurface: boolean;
    surfaceType: SurfaceType;
    surfaceHeight: number;
  } {
    // Only check for landing if moving downward or already low
    if (velocity.y > 0.1) {
      return { isOnSurface: false, surfaceType: 'none', surfaceHeight: 0 };
    }

    const tolerance = 0.5; // Distance threshold for landing

    // Check ground
    if (position.y <= tolerance) {
      return { isOnSurface: true, surfaceType: 'ground', surfaceHeight: 0 };
    }

    // Check bridges
    for (const bridge of this.bridges) {
      const bridgeTop = bridge.position.y + bridge.height / 2;
      
      // Check if player is above bridge and within horizontal bounds
      if (
        Math.abs(position.y - bridgeTop) <= tolerance &&
        Math.abs(position.x - bridge.position.x) <= bridge.width / 2 &&
        Math.abs(position.z - bridge.position.z) <= bridge.depth / 2
      ) {
        return { isOnSurface: true, surfaceType: 'bridge', surfaceHeight: bridgeTop };
      }
    }

    // Check rooftops
    for (const building of this.buildings) {
      const rooftopHeight = building.position.y + building.height / 2;
      
      // Check if player is above rooftop and within horizontal bounds
      if (Math.abs(position.y - rooftopHeight) <= tolerance) {
        let isOnRooftop = false;

        if (building.shape === 'box') {
          isOnRooftop =
            Math.abs(position.x - building.position.x) <= building.width / 2 &&
            Math.abs(position.z - building.position.z) <= building.depth / 2;
        } else if (building.shape === 'cylinder') {
          const dx = position.x - building.position.x;
          const dz = position.z - building.position.z;
          const distanceSquared = dx * dx + dz * dz;
          const radius = building.width / 2;
          isOnRooftop = distanceSquared <= radius * radius;
        }

        if (isOnRooftop) {
          return { isOnSurface: true, surfaceType: 'rooftop', surfaceHeight: rooftopHeight };
        }
      }
    }

    return { isOnSurface: false, surfaceType: 'none', surfaceHeight: 0 };
  }

  /**
   * Check if player is in water
   */
  public isInWater(position: Vector3): boolean {
    // Only check if player is at or near ground level
    if (position.y > 2) {
      return false;
    }

    for (const water of this.waterAreas) {
      if (
        Math.abs(position.x - water.x) <= water.width / 2 &&
        Math.abs(position.z - water.z) <= water.depth / 2
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Apply water speed reduction to velocity
   */
  public applyWaterResistance(velocity: Vector3, isInWater: boolean): Vector3 {
    if (!isInWater) {
      return velocity;
    }

    return {
      x: velocity.x * WATER_SPEED_MULTIPLIER,
      y: velocity.y,
      z: velocity.z * WATER_SPEED_MULTIPLIER,
    };
  }

  /**
   * Calculate landing prediction (for AI)
   */
  public predictLandingPosition(
    position: Vector3,
    velocity: Vector3,
    maxTime = 5
  ): { position: Vector3; time: number } | null {
    const dt = 0.1; // Time step for simulation
    let simPosition = { ...position };
    let simVelocity = { ...velocity };
    let time = 0;

    while (time < maxTime) {
      // Apply gravity
      simVelocity.y -= GRAVITY * dt;

      // Update position
      simPosition.x += simVelocity.x * dt;
      simPosition.y += simVelocity.y * dt;
      simPosition.z += simVelocity.z * dt;

      time += dt;

      // Check if landed
      const surfaceCheck = this.checkSurfaceLanding(simPosition, simVelocity);
      if (surfaceCheck.isOnSurface) {
        return {
          position: { ...simPosition, y: surfaceCheck.surfaceHeight },
          time,
        };
      }

      // Stop if fell below ground
      if (simPosition.y < 0) {
        return {
          position: { ...simPosition, y: 0 },
          time,
        };
      }
    }

    return null;
  }

  /**
   * Get surface height at a specific horizontal position
   */
  public getSurfaceHeightAt(x: number, z: number): number {
    let maxHeight = 0;

    // Check bridges
    for (const bridge of this.bridges) {
      if (
        Math.abs(x - bridge.position.x) <= bridge.width / 2 &&
        Math.abs(z - bridge.position.z) <= bridge.depth / 2
      ) {
        const bridgeTop = bridge.position.y + bridge.height / 2;
        maxHeight = Math.max(maxHeight, bridgeTop);
      }
    }

    // Check rooftops
    for (const building of this.buildings) {
      let isOnBuilding = false;

      if (building.shape === 'box') {
        isOnBuilding =
          Math.abs(x - building.position.x) <= building.width / 2 &&
          Math.abs(z - building.position.z) <= building.depth / 2;
      } else if (building.shape === 'cylinder') {
        const dx = x - building.position.x;
        const dz = z - building.position.z;
        const distanceSquared = dx * dx + dz * dz;
        const radius = building.width / 2;
        isOnBuilding = distanceSquared <= radius * radius;
      }

      if (isOnBuilding) {
        const rooftopHeight = building.position.y + building.height / 2;
        maxHeight = Math.max(maxHeight, rooftopHeight);
      }
    }

    return maxHeight;
  }

  /**
   * Clear all registered data
   */
  public clear(): void {
    this.buildings = [];
    this.bridges = [];
    this.waterAreas = [];
  }
}
