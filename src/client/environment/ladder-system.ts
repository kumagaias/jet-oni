import * as THREE from 'three';
import { Vector3 } from '../../shared/types/game';

/**
 * Ladder data structure
 */
export interface Ladder {
  position: Vector3;
  height: number;
  mesh: THREE.Group;
  topPosition: Vector3;
  bottomPosition: Vector3;
}

/**
 * Ladder climbing state
 */
export interface LadderClimbState {
  isClimbing: boolean;
  currentLadder: Ladder | null;
  climbProgress: number; // 0 to 1, where 0 is bottom and 1 is top
}

/**
 * LadderSystem manages ladder detection and climbing mechanics
 */
export class LadderSystem {
  private ladders: Ladder[] = [];
  private climbSpeed = 3; // units per second
  private detectionRadius = 1.5; // distance to detect ladder

  /**
   * Register ladders from the dynamic objects
   */
  public registerLadders(ladderGroup: THREE.Group): void {
    this.ladders = [];

    ladderGroup.children.forEach((mesh) => {
      if (mesh instanceof THREE.Group) {
        const position = {
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z,
        };

        // Calculate height from the ladder mesh
        let height = 10; // default
        mesh.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry) {
            const params = child.geometry.parameters;
            if (params.height > height) {
              height = params.height;
            }
          }
        });

        const ladder: Ladder = {
          position,
          height,
          mesh,
          bottomPosition: { x: position.x, y: 0, z: position.z },
          topPosition: { x: position.x, y: height, z: position.z },
        };

        this.ladders.push(ladder);
      }
    });
  }

  /**
   * Find nearest ladder to player position
   */
  public findNearestLadder(playerPosition: Vector3): Ladder | null {
    let nearestLadder: Ladder | null = null;
    let minDistance = this.detectionRadius;

    for (const ladder of this.ladders) {
      const dx = playerPosition.x - ladder.position.x;
      const dz = playerPosition.z - ladder.position.z;
      const horizontalDistance = Math.sqrt(dx * dx + dz * dz);

      // Check if player is within detection radius horizontally
      if (horizontalDistance < minDistance) {
        // Check if player is within ladder height range
        if (
          playerPosition.y >= ladder.bottomPosition.y - 1 &&
          playerPosition.y <= ladder.topPosition.y + 1
        ) {
          minDistance = horizontalDistance;
          nearestLadder = ladder;
        }
      }
    }

    return nearestLadder;
  }

  /**
   * Start climbing a ladder
   */
  public startClimbing(
    playerPosition: Vector3,
    ladder: Ladder
  ): { position: Vector3; progress: number } {
    // Calculate initial climb progress based on player height
    const progress = Math.max(
      0,
      Math.min(1, (playerPosition.y - ladder.bottomPosition.y) / ladder.height)
    );

    // Snap player to ladder position
    const position = {
      x: ladder.position.x,
      y: ladder.bottomPosition.y + progress * ladder.height,
      z: ladder.position.z,
    };

    return { position, progress };
  }

  /**
   * Update climbing state
   */
  public updateClimbing(
    climbState: LadderClimbState,
    climbInput: number, // -1 for down, 0 for stationary, 1 for up
    deltaTime: number
  ): { position: Vector3; progress: number; shouldExit: boolean } {
    if (!climbState.currentLadder) {
      return {
        position: { x: 0, y: 0, z: 0 },
        progress: 0,
        shouldExit: true,
      };
    }

    const ladder = climbState.currentLadder;

    // Update climb progress
    const progressDelta = (climbInput * this.climbSpeed * deltaTime) / ladder.height;
    let newProgress = climbState.climbProgress + progressDelta;

    // Check if reached top or bottom
    let shouldExit = false;
    if (newProgress >= 1) {
      newProgress = 1;
      shouldExit = true; // Exit at top
    } else if (newProgress <= 0) {
      newProgress = 0;
      shouldExit = true; // Exit at bottom
    }

    // Calculate new position
    const newY = ladder.bottomPosition.y + newProgress * ladder.height;
    const position = {
      x: ladder.position.x,
      y: newY,
      z: ladder.position.z,
    };

    return { position, progress: newProgress, shouldExit };
  }

  /**
   * Exit climbing and return position slightly away from ladder
   */
  public exitClimbing(
    ladder: Ladder,
    progress: number,
    facingDirection: number // yaw angle
  ): Vector3 {
    // Calculate exit position slightly away from ladder
    const exitDistance = 1.0;
    const exitX = ladder.position.x + Math.sin(facingDirection) * exitDistance;
    const exitZ = ladder.position.z + Math.cos(facingDirection) * exitDistance;
    const exitY = ladder.bottomPosition.y + progress * ladder.height;

    return {
      x: exitX,
      y: exitY,
      z: exitZ,
    };
  }

  /**
   * Check if player can start climbing (near ladder and pressing forward)
   */
  public canStartClimbing(playerPosition: Vector3, isOnSurface: boolean): Ladder | null {
    // Can only start climbing from ground or when already on a surface
    if (!isOnSurface) {
      return null;
    }

    return this.findNearestLadder(playerPosition);
  }

  /**
   * Get all ladders
   */
  public getLadders(): Ladder[] {
    return this.ladders;
  }

  /**
   * Set climb speed
   */
  public setClimbSpeed(speed: number): void {
    this.climbSpeed = speed;
  }

  /**
   * Get climb speed
   */
  public getClimbSpeed(): number {
    return this.climbSpeed;
  }

  /**
   * Set detection radius
   */
  public setDetectionRadius(radius: number): void {
    this.detectionRadius = radius;
  }

  /**
   * Get detection radius
   */
  public getDetectionRadius(): number {
    return this.detectionRadius;
  }

  /**
   * Clear all ladders
   */
  public clear(): void {
    this.ladders = [];
  }
}
