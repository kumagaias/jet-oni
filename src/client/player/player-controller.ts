import { GameState } from '../game/game-state';
import { InputState } from '../../shared/types/game';
import { MobileControls, MobileInputState } from '../ui/mobile-controls';
import {
  PLAYER_SPEED,
  DASH_SPEED,
  CAMERA_PITCH_LIMIT,
  MAP_SIZE,
  JETPACK_FUEL_CONSUMPTION,
  JETPACK_FORCE,
  JUMP_FORCE,
  DASH_FUEL_CONSUMPTION,
  ONI_FUEL_RECOVERY,
  RUNNER_FUEL_RECOVERY,
} from '../../shared/constants';

/**
 * PlayerController handles player input and movement
 */
export class PlayerController {
  private gameState: GameState;
  private inputState: InputState;
  private isPointerLocked = false;
  private mouseSensitivity = 0.002;
  private wasJumping = false;
  private mobileControls: MobileControls | null = null;

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
    
    // Initialize mobile controls if on mobile device
    this.mobileControls = new MobileControls();
  }

  /**
   * Initialize input listeners
   */
  public init(): void {
    this.setupKeyboardListeners();
    this.setupMouseListeners();
    this.setupPointerLock();
    
    // Initialize mobile controls if needed
    if (this.mobileControls?.shouldShowMobileControls()) {
      this.mobileControls.init();
    }
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
    // Debug mode: F3 to toggle ONI/Runner
    if (event.code === 'F3') {
      event.preventDefault();
      const player = this.gameState.getLocalPlayer();
      this.gameState.setLocalPlayerIsOni(!player.isOni);
      console.log(`[DEBUG] Switched to ${player.isOni ? 'Runner' : 'ONI'}`);
      return;
    }

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
    
    // Update mobile controls
    if (this.mobileControls?.shouldShowMobileControls()) {
      this.mobileControls.update();
      this.applyMobileInput();
    }
    
    // Handle jetpack and jump abilities
    this.handleAbilities(deltaTime);
    
    // Calculate speed (this also sets dashing state)
    const speed = this.calculateSpeed();
    
    // Handle dash fuel consumption
    this.handleDashFuelConsumption(deltaTime);
    
    // Handle fuel recovery
    this.handleFuelRecovery(deltaTime);

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

    // Note: Position update is now handled by PlayerPhysics in main.ts

    // Reset mouse delta
    this.inputState.mouseX = 0;
    this.inputState.mouseY = 0;
  }

  /**
   * Apply mobile input to input state
   */
  private applyMobileInput(): void {
    if (!this.mobileControls) return;

    const mobileInput = this.mobileControls.getInputState();
    
    // Convert joystick to WASD (OR with keyboard input, don't override)
    this.inputState.forward = this.inputState.forward || mobileInput.moveY < -0.3;
    this.inputState.backward = this.inputState.backward || mobileInput.moveY > 0.3;
    this.inputState.left = this.inputState.left || mobileInput.moveX < -0.3;
    this.inputState.right = this.inputState.right || mobileInput.moveX > 0.3;
    
    // Apply look input (add to existing mouse input)
    this.inputState.mouseX += mobileInput.lookX;
    this.inputState.mouseY += mobileInput.lookY;
    
    // Update player rotation from mobile look input
    if (mobileInput.lookX !== 0 || mobileInput.lookY !== 0) {
      const player = this.gameState.getLocalPlayer();
      const newYaw = player.rotation.yaw - mobileInput.lookX * this.mouseSensitivity;
      const newPitch = Math.max(
        -CAMERA_PITCH_LIMIT,
        Math.min(CAMERA_PITCH_LIMIT, player.rotation.pitch - mobileInput.lookY * this.mouseSensitivity)
      );
      this.gameState.setLocalPlayerRotation(newYaw, newPitch);
    }
    
    // Apply button inputs (OR with keyboard input)
    this.inputState.jump = this.inputState.jump || mobileInput.jump;
    this.inputState.jetpack = this.inputState.jetpack || mobileInput.jump;
    this.inputState.dash = this.inputState.dash || mobileInput.dash;
  }

  /**
   * Handle jetpack and jump abilities
   */
  private handleAbilities(deltaTime: number): void {
    const player = this.gameState.getLocalPlayer();
    
    // Jetpack (ONI only, requires fuel)
    if (player.isOni && this.inputState.jetpack && player.fuel > 0) {
      // Consume fuel
      const fuelConsumed = JETPACK_FUEL_CONSUMPTION * deltaTime;
      this.gameState.setLocalPlayerFuel(player.fuel - fuelConsumed);
      
      // Apply upward acceleration (not instant velocity)
      const newVelocity = {
        ...player.velocity,
        y: player.velocity.y + JETPACK_FORCE * deltaTime,
      };
      this.gameState.setLocalPlayerVelocity(newVelocity);
      this.gameState.setLocalPlayerJetpacking(true);
    } else {
      this.gameState.setLocalPlayerJetpacking(false);
    }
    
    // Jump (Runner only, on surface only, no fuel cost)
    if (!player.isOni && this.inputState.jump && player.isOnSurface && !this.wasJumping) {
      const newVelocity = {
        ...player.velocity,
        y: JUMP_FORCE,
      };
      this.gameState.setLocalPlayerVelocity(newVelocity);
    }
    
    // Track jump state to prevent continuous jumping
    this.wasJumping = this.inputState.jump;
  }

  /**
   * Handle fuel recovery
   */
  private handleFuelRecovery(deltaTime: number): void {
    const player = this.gameState.getLocalPlayer();
    
    // Only recover fuel on surface
    if (!player.isOnSurface) return;
    
    // Don't recover fuel while using abilities
    if (player.isJetpacking || player.isDashing) return;
    
    if (player.isOni) {
      // ONI recovers fuel on surface
      const fuelRecovered = ONI_FUEL_RECOVERY * deltaTime;
      this.gameState.setLocalPlayerFuel(player.fuel + fuelRecovered);
    } else {
      // Runner recovers fuel on surface while stationary
      const isStationary = Math.abs(player.velocity.x) < 0.1 && Math.abs(player.velocity.z) < 0.1;
      if (isStationary) {
        const fuelRecovered = RUNNER_FUEL_RECOVERY * deltaTime;
        this.gameState.setLocalPlayerFuel(player.fuel + fuelRecovered);
      }
    }
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
   * Handle dash fuel consumption
   */
  private handleDashFuelConsumption(deltaTime: number): void {
    const player = this.gameState.getLocalPlayer();
    
    // Consume fuel when dashing (runner only)
    if (this.inputState.dash && !player.isOni && player.fuel > 0) {
      const fuelConsumed = DASH_FUEL_CONSUMPTION * deltaTime;
      this.gameState.setLocalPlayerFuel(player.fuel - fuelConsumed);
    }
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
    
    // Dispose mobile controls
    this.mobileControls?.dispose();
  }
}
