import { Vector3 } from '../../shared/types/game';
import { GRAVITY, WATER_SPEED_MULTIPLIER } from '../../shared/constants';

/**
 * Surface type for landing detection
 */
export type SurfaceType = 'ground' | 'rooftop' | 'bridge' | 'water' | 'none';

/**
 * Physics result containing updated position and velocity
 */
export interface PhysicsResult {
  position: Vector3;
  velocity: Vector3;
  isOnSurface: boolean;
  surfaceType: SurfaceType;
  surfaceHeight: number;
}

/**
 * Surface information for collision detection
 */
export interface SurfaceInfo {
  type: SurfaceType;
  height: number;
  x: number;
  z: number;
  width?: number;
  depth?: number;
}

/**
 * PlayerPhysics handles gravity, velocity, acceleration, and surface detection
 */
export class PlayerPhysics {
  private gravity: number;

  constructor() {
    this.gravity = GRAVITY;
  }

  /**
   * Apply physics to player position and velocity
   */
  public applyPhysics(
    position: Vector3,
    velocity: Vector3,
    deltaTime: number,
    surfaces: SurfaceInfo[],
    isInWater: boolean
  ): PhysicsResult {
    // Create copies to avoid mutating input
    let newVelocity = { ...velocity };

    // Apply gravity
    newVelocity.y -= this.gravity * deltaTime;

    // Apply water resistance
    if (isInWater) {
      newVelocity.x *= WATER_SPEED_MULTIPLIER;
      newVelocity.z *= WATER_SPEED_MULTIPLIER;
      // Reduce falling speed in water
      if (newVelocity.y < 0) {
        newVelocity.y *= WATER_SPEED_MULTIPLIER;
      }
    }

    // Update position based on velocity
    const newPosition = {
      x: position.x + newVelocity.x * deltaTime,
      y: position.y + newVelocity.y * deltaTime,
      z: position.z + newVelocity.z * deltaTime,
    };

    // Check for surface landing
    const surfaceResult = this.checkSurfaceLanding(newPosition, newVelocity, surfaces);

    return {
      position: surfaceResult.position,
      velocity: surfaceResult.velocity,
      isOnSurface: surfaceResult.isOnSurface,
      surfaceType: surfaceResult.surfaceType,
      surfaceHeight: surfaceResult.surfaceHeight,
    };
  }

  /**
   * Check if player is landing on any surface
   */
  private checkSurfaceLanding(
    position: Vector3,
    velocity: Vector3,
    surfaces: SurfaceInfo[]
  ): PhysicsResult {
    let isOnSurface = false;
    let surfaceType: SurfaceType = 'none';
    let surfaceHeight = 0;
    const newPosition = { ...position };
    const newVelocity = { ...velocity };

    // Check ground (y = 0)
    if (newPosition.y <= 0) {
      newPosition.y = 0;
      newVelocity.y = 0;
      isOnSurface = true;
      surfaceType = 'ground';
      surfaceHeight = 0;
      return { position: newPosition, velocity: newVelocity, isOnSurface, surfaceType, surfaceHeight };
    }

    // Check other surfaces (rooftops, bridges)
    for (const surface of surfaces) {
      if (this.isPlayerOnSurface(position, surface)) {
        // Player is above or at surface level and moving downward
        if (newPosition.y <= surface.height && velocity.y <= 0) {
          newPosition.y = surface.height;
          newVelocity.y = 0;
          isOnSurface = true;
          surfaceType = surface.type;
          surfaceHeight = surface.height;
          break;
        }
      }
    }

    return { position: newPosition, velocity: newVelocity, isOnSurface, surfaceType, surfaceHeight };
  }

  /**
   * Check if player position is on a surface (horizontally)
   */
  private isPlayerOnSurface(position: Vector3, surface: SurfaceInfo): boolean {
    // For surfaces with defined bounds
    if (surface.width !== undefined && surface.depth !== undefined) {
      const halfWidth = surface.width / 2;
      const halfDepth = surface.depth / 2;

      return (
        position.x >= surface.x - halfWidth &&
        position.x <= surface.x + halfWidth &&
        position.z >= surface.z - halfDepth &&
        position.z <= surface.z + halfDepth
      );
    }

    // For infinite surfaces (like ground)
    return true;
  }

  /**
   * Apply jump force to velocity
   */
  public applyJumpForce(velocity: Vector3, jumpForce: number): Vector3 {
    return {
      ...velocity,
      y: jumpForce,
    };
  }

  /**
   * Apply jetpack force to velocity
   */
  public applyJetpackForce(velocity: Vector3, jetpackForce: number, deltaTime: number): Vector3 {
    return {
      ...velocity,
      y: velocity.y + jetpackForce * deltaTime,
    };
  }

  /**
   * Check if position is in water
   */
  public isInWater(position: Vector3, waterSurfaces: SurfaceInfo[]): boolean {
    for (const water of waterSurfaces) {
      if (water.type === 'water') {
        if (this.isPlayerOnSurface(position, water)) {
          // Check if player is below water surface level
          if (position.y < water.height + 0.5) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Get surface at position (for fuel recovery checks)
   */
  public getSurfaceAtPosition(position: Vector3, surfaces: SurfaceInfo[]): SurfaceInfo | null {
    // Check ground first
    if (position.y <= 0.1) {
      return {
        type: 'ground',
        height: 0,
        x: position.x,
        z: position.z,
      };
    }

    // Check other surfaces
    for (const surface of surfaces) {
      if (this.isPlayerOnSurface(position, surface)) {
        if (Math.abs(position.y - surface.height) < 0.1) {
          return surface;
        }
      }
    }

    return null;
  }

  /**
   * Clamp velocity to maximum values
   */
  public clampVelocity(velocity: Vector3, maxHorizontal: number, maxVertical: number): Vector3 {
    const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    
    let newVelocity = { ...velocity };

    // Clamp horizontal velocity
    if (horizontalSpeed > maxHorizontal) {
      const scale = maxHorizontal / horizontalSpeed;
      newVelocity.x *= scale;
      newVelocity.z *= scale;
    }

    // Clamp vertical velocity
    newVelocity.y = Math.max(-maxVertical, Math.min(maxVertical, newVelocity.y));

    return newVelocity;
  }

  /**
   * Apply friction to horizontal velocity
   */
  public applyFriction(velocity: Vector3, friction: number, deltaTime: number): Vector3 {
    const frictionFactor = Math.max(0, 1 - friction * deltaTime);
    
    return {
      x: velocity.x * frictionFactor,
      y: velocity.y,
      z: velocity.z * frictionFactor,
    };
  }

  /**
   * Set gravity value
   */
  public setGravity(gravity: number): void {
    this.gravity = gravity;
  }

  /**
   * Get current gravity value
   */
  public getGravity(): number {
    return this.gravity;
  }
}
