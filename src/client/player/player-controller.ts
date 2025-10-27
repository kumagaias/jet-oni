import { GameState } from '../game/game-state';
import { InputState } from '../../shared/types/game';
import {
  PLAYER_SPEED,
  DASH_SPEED,
  CAMERA_PITCH_LIMIT,
  MAP_SIZE,
} from '../../shared/constants';

/**
 * PlayerController handles player input and movement
 */
export class PlayerController {
  private gameState: GameState;
  private inputState: InputState;
  private isPointerLocked = false;
  private mouseSensitivity = 0.002;

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.inputState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      dash: false,
      jetpack: false,
      beacon: false,
      mouseX: 0,
      mouseY: 0,
    };
  }

  /**
   * Initialize input listeners
   */
  public init(): void {
    this.setupKeyboardListeners();
    this.setupMouseListeners();
    this.setupPointerLock();
  }

  /**
   * Setup keyboard event listeners
   */
  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  /**
   * Setup mouse event listeners
   */
  private setupMouseListeners(): void {
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
  }

  /**
   * Setup pointer lock functionality
   */
  private setupPointerLock(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    // Enable mouse look on canvas click (without pointer lock for Devvit compatibility)
    canvas.addEventListener('mousedown', () => {
      this.isPointerLocked = true;
    });

    // Disable mouse look on mouse up
    window.addEventListener('mouseup', () => {
      this.isPointerLocked = false;
    });

    // Try to request pointer lock (will fail in Devvit, but that's okay)
    canvas.addEventListener('click', () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock().catch(() => {
          // Pointer lock not available in Devvit sandbox, use fallback
          console.log('Pointer lock not available, using click-and-drag mode');
        });
      }
    });

    // Handle pointer lock change
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    // Handle pointer lock error (expected in Devvit)
    document.addEventListener('pointerlockerror', () => {
      console.log('Pointer lock not supported in this environment');
    });
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Ignore if not playing
    if (!this.gameState.isPlaying()) return;

    switch (event.code) {
      case 'KeyW':
        this.inputState.forward = true;
        break;
      case 'KeyS':
        this.inputState.backward = true;
        break;
      case 'KeyA':
        this.inputState.left = true;
        break;
      case 'KeyD':
        this.inputState.right = true;
        break;
      case 'Space':
        event.preventDefault();
        this.inputState.jump = true;
        this.inputState.jetpack = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.inputState.dash = true;
        break;
      case 'KeyB':
        this.inputState.beacon = true;
        break;
      case 'Escape':
        // Release pointer lock
        if (this.isPointerLocked) {
          document.exitPointerLock();
        }
        break;
    }
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
        this.inputState.forward = false;
        break;
      case 'KeyS':
        this.inputState.backward = false;
        break;
      case 'KeyA':
        this.inputState.left = false;
        break;
      case 'KeyD':
        this.inputState.right = false;
        break;
      case 'Space':
        this.inputState.jump = false;
        this.inputState.jetpack = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.inputState.dash = false;
        break;
      case 'KeyB':
        this.inputState.beacon = false;
        break;
    }
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isPointerLocked || !this.gameState.isPlaying()) return;

    // Use movementX/Y if available (pointer lock), otherwise use regular mouse position
    const deltaX = event.movementX || 0;
    const deltaY = event.movementY || 0;

    // Update mouse delta
    this.inputState.mouseX = deltaX;
    this.inputState.mouseY = deltaY;

    // Update player rotation
    const player = this.gameState.getLocalPlayer();
    const newYaw = player.rotation.yaw - deltaX * this.mouseSensitivity;
    const newPitch = Math.max(
      -CAMERA_PITCH_LIMIT,
      Math.min(CAMERA_PITCH_LIMIT, player.rotation.pitch - deltaY * this.mouseSensitivity)
    );

    this.gameState.setLocalPlayerRotation(newYaw, newPitch);
  }

  /**
   * Get current input state
   */
  public getInputState(): InputState {
    return { ...this.inputState };
  }

  /**
   * Check if pointer is locked
   */
  public isPointerLockedState(): boolean {
    return this.isPointerLocked;
  }

  /**
   * Set mouse sensitivity
   */
  public setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = sensitivity;
  }

  /**
   * Get mouse sensitivity
   */
  public getMouseSensitivity(): number {
    return this.mouseSensitivity;
  }

  /**
   * Update player movement based on input
   */
  public update(deltaTime: number): void {
    if (!this.gameState.isPlaying()) return;

    const player = this.gameState.getLocalPlayer();
    const speed = this.calculateSpeed();

    // Calculate movement direction based on input and rotation
    const moveDirection = this.calculateMoveDirection();

    // Apply movement with smoothing
    const targetVelocity = {
      x: moveDirection.x * speed,
      y: player.velocity.y, // Preserve vertical velocity
      z: moveDirection.z * speed,
    };

    // Smooth velocity transition (lerp)
    const smoothing = 0.2;
    const newVelocity = {
      x: this.lerp(player.velocity.x, targetVelocity.x, smoothing),
      y: targetVelocity.y,
      z: this.lerp(player.velocity.z, targetVelocity.z, smoothing),
    };

    this.gameState.setLocalPlayerVelocity(newVelocity);

    // Update position
    const newPosition = {
      x: player.position.x + newVelocity.x * deltaTime,
      y: player.position.y + newVelocity.y * deltaTime,
      z: player.position.z + newVelocity.z * deltaTime,
    };

    // Clamp to map boundaries
    const clampedPosition = this.gameState.clampPositionToBounds(newPosition);
    this.gameState.setLocalPlayerPosition(clampedPosition);

    // Reset mouse delta
    this.inputState.mouseX = 0;
    this.inputState.mouseY = 0;
  }

  /**
   * Calculate movement speed based on player state
   */
  private calculateSpeed(): number {
    const player = this.gameState.getLocalPlayer();
    let speed = this.gameState.getLocalPlayerSpeed();

    // Apply dash speed if dashing (runner only)
    if (this.inputState.dash && !player.isOni && player.fuel > 0) {
      speed = DASH_SPEED;
      this.gameState.setLocalPlayerDashing(true);
    } else {
      this.gameState.setLocalPlayerDashing(false);
    }

    return speed;
  }

  /**
   * Calculate movement direction based on input and rotation
   */
  private calculateMoveDirection(): { x: number; z: number } {
    const player = this.gameState.getLocalPlayer();
    let x = 0;
    let z = 0;

    // Calculate forward/backward movement
    if (this.inputState.forward) z -= 1;
    if (this.inputState.backward) z += 1;

    // Calculate left/right movement
    if (this.inputState.left) x -= 1;
    if (this.inputState.right) x += 1;

    // Normalize diagonal movement
    const length = Math.sqrt(x * x + z * z);
    if (length > 0) {
      x /= length;
      z /= length;
    }

    // Rotate movement direction based on player yaw
    const yaw = player.rotation.yaw;
    const rotatedX = x * Math.cos(yaw) - z * Math.sin(yaw);
    const rotatedZ = x * Math.sin(yaw) + z * Math.cos(yaw);

    return { x: rotatedX, z: rotatedZ };
  }

  /**
   * Linear interpolation helper
   */
  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * Cleanup event listeners
   */
  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    window.removeEventListener('mousemove', this.handleMouseMove.bind(this));

    // Exit pointer lock if active
    if (this.isPointerLocked) {
      document.exitPointerLock();
    }
  }
}
