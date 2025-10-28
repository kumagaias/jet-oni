import * as THREE from 'three';
import { GameState } from '../game/game-state';
import { CAMERA_HEIGHT, CAMERA_DISTANCE_THIRD_PERSON } from '../../shared/constants';

/**
 * Camera mode enum
 */
export enum CameraMode {
  FIRST_PERSON = 'first_person',
  THIRD_PERSON = 'third_person',
}

/**
 * PlayerCamera manages the game camera
 */
export class PlayerCamera {
  private camera: THREE.PerspectiveCamera;
  private gameState: GameState;
  private mode: CameraMode = CameraMode.FIRST_PERSON;
  private smoothingFactor = 0.1;
  private autoSwitchEnabled = true;

  constructor(camera: THREE.PerspectiveCamera, gameState: GameState) {
    this.camera = camera;
    this.gameState = gameState;
  }

  /**
   * Update camera position and rotation based on player state
   */
  public update(_deltaTime: number): void {
    const player = this.gameState.getLocalPlayer();

    // Auto-switch to third-person when climbing (only if auto-switch is enabled)
    if (this.autoSwitchEnabled) {
      if (player.isClimbing && this.mode === CameraMode.FIRST_PERSON) {
        this.mode = CameraMode.THIRD_PERSON;
      } else if (!player.isClimbing && this.mode === CameraMode.THIRD_PERSON) {
        // Auto-switch back to first-person when not climbing
        this.mode = CameraMode.FIRST_PERSON;
      }
    }

    if (this.mode === CameraMode.FIRST_PERSON) {
      this.updateFirstPersonCamera();
    } else {
      this.updateThirdPersonCamera();
    }

    // Apply player rotation to camera (only in first-person)
    if (this.mode === CameraMode.FIRST_PERSON) {
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = player.rotation.yaw;
      this.camera.rotation.x = player.rotation.pitch;
    }
  }

  /**
   * Update first-person camera position
   */
  private updateFirstPersonCamera(): void {
    const player = this.gameState.getLocalPlayer();

    // Position camera at player's eye level
    const targetPosition = new THREE.Vector3(
      player.position.x,
      player.position.y + CAMERA_HEIGHT,
      player.position.z
    );

    // Smooth camera position transition
    this.camera.position.lerp(targetPosition, this.smoothingFactor);
  }

  /**
   * Update third-person camera position
   */
  private updateThirdPersonCamera(): void {
    const player = this.gameState.getLocalPlayer();

    // Calculate camera position behind player
    const yaw = player.rotation.yaw;
    const offsetX = Math.sin(yaw) * CAMERA_DISTANCE_THIRD_PERSON;
    const offsetZ = Math.cos(yaw) * CAMERA_DISTANCE_THIRD_PERSON;

    const targetPosition = new THREE.Vector3(
      player.position.x + offsetX,
      player.position.y + CAMERA_HEIGHT,
      player.position.z + offsetZ
    );

    // Smooth camera position transition
    this.camera.position.lerp(targetPosition, this.smoothingFactor);

    // Look at player
    const lookAtTarget = new THREE.Vector3(
      player.position.x,
      player.position.y + CAMERA_HEIGHT,
      player.position.z
    );
    this.camera.lookAt(lookAtTarget);
  }

  /**
   * Set camera mode
   */
  public setMode(mode: CameraMode): void {
    this.mode = mode;
    // Disable auto-switch when manually setting mode
    this.autoSwitchEnabled = false;
  }

  /**
   * Enable or disable auto-switching between camera modes
   */
  public setAutoSwitch(enabled: boolean): void {
    this.autoSwitchEnabled = enabled;
  }

  /**
   * Get current camera mode
   */
  public getMode(): CameraMode {
    return this.mode;
  }

  /**
   * Toggle between first-person and third-person
   */
  public toggleMode(): void {
    this.mode =
      this.mode === CameraMode.FIRST_PERSON
        ? CameraMode.THIRD_PERSON
        : CameraMode.FIRST_PERSON;
  }

  /**
   * Set smoothing factor for camera movement
   */
  public setSmoothingFactor(factor: number): void {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }

  /**
   * Get smoothing factor
   */
  public getSmoothingFactor(): number {
    return this.smoothingFactor;
  }

  /**
   * Get the camera instance
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
}
