import { GameState } from '../game/game-state';
import { InputState } from '../../shared/types/game';
import { MobileControls, MobileInputState } from '../ui/mobile-controls';
import { LadderSystem, LadderClimbState } from '../environment/ladder-system';
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
  private mouseSensitivity = 0.004; // Increased from 0.002
  private keyboardRotationSpeed = 0.05; // Rotation speed for A/D keys
  private wasJumping = false;
  private mobileControls: MobileControls | null = null;
  private ladderSystem: LadderSystem | null = null;
  private ladderClimbState: LadderClimbState = {
    isClimbing: false,
    currentLadder: null,
    climbProgress: 0,
  };
  private lastMouseX = 0;
  private lastMouseY = 0;
  private usePointerLockFallback = false;

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

    // Check if we're in a sandboxed environment (like Devvit)
    const isSandboxed = window.self !== window.top;

    // Enable mouse look on canvas click
    canvas.addEventListener('click', () => {
      if (isSandboxed || !document.pointerLockElement) {
        // In sandboxed environment, skip pointer lock and use fallback
        this.isPointerLocked = true;
        this.usePointerLockFallback = true;
        console.log('Using fallback mouse control (sandboxed environment)');
      } else if (document.pointerLockElement !== canvas) {
        // Try to request pointer lock in non-sandboxed environment
        canvas.requestPointerLock().catch(() => {
          // Pointer lock not available, use fallback
          this.isPointerLocked = true;
          this.usePointerLockFallback = true;
        });
      } else {
        this.isPointerLocked = true;
      }
    });

    // Handle pointer lock change
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
      if (this.isPointerLocked && !isSandboxed) {
        console.log('Pointer lock enabled');
      }
    });

    // Handle pointer lock error (expected in Devvit)
    document.addEventListener('pointerlockerror', () => {
      // Silently enable fallback mode
      this.isPointerLocked = true;
      this.usePointerLockFallback = true;
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
        // A key now rotates view left (handled in update)
        this.inputState.left = true;
        break;
      case 'KeyD':
        // D key now rotates view right (handled in update)
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

    let deltaX = 0;
    let deltaY = 0;

    // Use movementX/Y if available (pointer lock)
    if (event.movementX !== undefined && event.movementX !== 0) {
      deltaX = event.movementX;
      deltaY = event.movementY;
      this.usePointerLockFallback = false;
    } else {
      // Fallback: calculate delta from mouse position
      if (this.usePointerLockFallback) {
        deltaX = event.clientX - this.lastMouseX;
        deltaY = event.clientY - this.lastMouseY;
      } else {
        // First time in fallback mode, just record position
        this.usePointerLockFallback = true;
      }
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }

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
   * Set ladder system for climbing
   */
  public setLadderSystem(ladderSystem: LadderSystem): void {
    this.ladderSystem = ladderSystem;
  }

  /**
   * Update player movement based on input
   */
  public update(deltaTime: number): void {
    if (!this.gameState.isPlaying()) return;

    const player = this.gameState.getLocalPlayer();
    
    // Handle keyboard rotation (A/D keys)
    if (this.inputState.left) {
      // Rotate left
      const newYaw = player.rotation.yaw - this.keyboardRotationSpeed;
      this.gameState.setLocalPlayerRotation({ yaw: newYaw, pitch: player.rotation.pitch });
    }
    if (this.inputState.right) {
      // Rotate right
      const newYaw = player.rotation.yaw + this.keyboardRotationSpeed;
      this.gameState.setLocalPlayerRotation({ yaw: newYaw, pitch: player.rotation.pitch });
    }
    
    // Update mobile controls
    if (this.mobileControls?.shouldShowMobileControls()) {
      this.mobileControls.update();
      this.applyMobileInput();
    }
    
    // Handle ladder climbing
    if (this.handleLadderClimbing(deltaTime)) {
      // If climbing, skip normal movement
      this.inputState.mouseX = 0;
      this.inputState.mouseY = 0;
      return;
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

    // Reduce horizontal speed when jetpacking
    if (player.isJetpacking) {
      speed *= 0.5; // 50% speed when jetpacking
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
    
    // Get camera forward direction from yaw
    const yaw = player.rotation.yaw;
    
    // Calculate forward/backward direction (camera's forward is -Z in local space)
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    
    // Calculate right direction (perpendicular to forward)
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    
    // Combine input directions
    // Note: A/D keys now only rotate view, not move left/right
    let x = 0;
    let z = 0;
    
    if (this.inputState.forward) {
      x += forwardX;
      z += forwardZ;
    }
    if (this.inputState.backward) {
      x -= forwardX;
      z -= forwardZ;
    }
    // A/D keys removed from movement - they only rotate view now

    // Normalize diagonal movement
    const length = Math.sqrt(x * x + z * z);
    if (length > 0) {
      x /= length;
      z /= length;
    }

    return { x, z };
  }

  /**
   * Handle ladder climbing
   */
  private handleLadderClimbing(deltaTime: number): boolean {
    if (!this.ladderSystem) return false;

    const player = this.gameState.getLocalPlayer();

    // Check if trying to start climbing
    if (!this.ladderClimbState.isClimbing) {
      // Try to start climbing if pressing forward near a ladder
      if (this.inputState.forward && player.isOnSurface) {
        const nearbyLadder = this.ladderSystem.canStartClimbing(
          player.position,
          player.isOnSurface
        );

        if (nearbyLadder) {
          // Start climbing
          const { position, progress } = this.ladderSystem.startClimbing(
            player.position,
            nearbyLadder
          );

          this.ladderClimbState.isClimbing = true;
          this.ladderClimbState.currentLadder = nearbyLadder;
          this.ladderClimbState.climbProgress = progress;

          this.gameState.setLocalPlayerPosition(position);
          this.gameState.setLocalPlayerVelocity({ x: 0, y: 0, z: 0 });
          this.gameState.setLocalPlayerClimbing(true);

          return true;
        }
      }
      return false;
    }

    // Currently climbing
    let climbInput = 0;
    if (this.inputState.forward) climbInput = 1; // Climb up
    if (this.inputState.backward) climbInput = -1; // Climb down

    // Update climbing
    const { position, progress, shouldExit } = this.ladderSystem.updateClimbing(
      this.ladderClimbState,
      climbInput,
      deltaTime
    );

    this.ladderClimbState.climbProgress = progress;
    this.gameState.setLocalPlayerPosition(position);

    // Check for exit conditions
    if (shouldExit || this.inputState.jump || this.inputState.left || this.inputState.right) {
      // Exit climbing
      let exitPosition = this.ladderSystem.exitClimbing(
        this.ladderClimbState.currentLadder!,
        this.ladderClimbState.climbProgress,
        player.rotation.yaw
      );

      // If at the top (progress >= 0.95), automatically place player on rooftop
      if (this.ladderClimbState.climbProgress >= 0.95 && shouldExit) {
        // Place player on top of the building with a small offset forward
        const ladder = this.ladderClimbState.currentLadder!;
        exitPosition = {
          x: ladder.position.x + Math.sin(player.rotation.yaw) * 1.5,
          y: ladder.topPosition.y + 0.5, // Slightly above rooftop to ensure landing
          z: ladder.position.z + Math.cos(player.rotation.yaw) * 1.5,
        };
      }

      this.gameState.setLocalPlayerPosition(exitPosition);
      this.gameState.setLocalPlayerVelocity({ x: 0, y: -0.1, z: 0 }); // Small downward velocity to land
      this.gameState.setLocalPlayerClimbing(false);
      this.gameState.setLocalPlayerOnSurface(this.ladderClimbState.climbProgress < 0.1); // Only on surface if exiting at bottom

      this.ladderClimbState.isClimbing = false;
      this.ladderClimbState.currentLadder = null;
      this.ladderClimbState.climbProgress = 0;

      return false;
    }

    return true;
  }

  /**
   * Get ladder climb state
   */
  public getLadderClimbState(): LadderClimbState {
    return this.ladderClimbState;
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
