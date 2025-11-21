import { GameState } from '../game/game-state';
import { InputState } from '../../shared/types/game';
import { MobileControls } from '../ui/mobile-controls';
import { LadderSystem, LadderClimbState } from '../environment/ladder-system';
import { PlayerPhysics } from './player-physics';
import {
  DASH_SPEED,
  CAMERA_PITCH_LIMIT,
  JETPACK_FUEL_CONSUMPTION,
  JETPACK_FORCE,
  JUMP_FORCE,
  RUNNER_JUMP_MULTIPLIER,
  DASH_FUEL_CONSUMPTION,
  ONI_FUEL_RECOVERY,
  RUNNER_FUEL_RECOVERY,
} from '../../shared/constants';

/**
 * PlayerController handles player input and movement
 */
export class PlayerController {
  private gameState: GameState;
  private inputState: InputState; // Keyboard input
  private mobileInputState: InputState; // Mobile input (separate)
  private isPointerLocked = false;
  private mouseSensitivity = 0.004; // Increased from 0.002
  private keyboardRotationSpeed = 0.05; // Rotation speed for A/D keys
  private wasJumping = false;
  private mobileControls: MobileControls | null = null;
  private ladderSystem: LadderSystem | null = null;
  private playerPhysics: PlayerPhysics | null = null;
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
    this.mobileInputState = {
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
    // Mouse look disabled - using keyboard/mobile controls only
    // window.addEventListener('mousemove', this.handleMouseMove.bind(this));
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
        // Pointer locked successfully
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
    // Debug mode: F3 to toggle ONI/Runner (only in dev subreddit)
    if (event.code === 'F3') {
      event.preventDefault();
      
      // Only allow in dev subreddit
      const url = window.location.href.toLowerCase();
      const isDevSubreddit = url.includes('jet_oni_dev') || 
                             url.includes('localhost') ||
                             url.includes('playtest');
      
      if (!isDevSubreddit) {
        return;
      }
      
      const player = this.gameState.getLocalPlayer();
      this.gameState.setLocalPlayerIsOni(!player.isOni);
      return;
    }

    // Allow input during countdown and playing phases
    const phase = this.gameState.getGamePhase();
    if (phase !== 'countdown' && phase !== 'playing') return;

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
   * Get current input state (merged keyboard + mobile)
   */
  public getInputState(): InputState {
    // Merge keyboard and mobile input with OR operation
    return {
      forward: this.inputState.forward || this.mobileInputState.forward,
      backward: this.inputState.backward || this.mobileInputState.backward,
      left: this.inputState.left || this.mobileInputState.left,
      right: this.inputState.right || this.mobileInputState.right,
      jump: this.inputState.jump || this.mobileInputState.jump,
      dash: this.inputState.dash || this.mobileInputState.dash,
      jetpack: this.inputState.jetpack || this.mobileInputState.jetpack,
      beacon: this.inputState.beacon || this.mobileInputState.beacon,
      mouseX: this.inputState.mouseX || this.mobileInputState.mouseX || 0,
      mouseY: this.inputState.mouseY || this.mobileInputState.mouseY || 0,
    };
  }

  /**
   * Set mobile input state (for external control like mobile UI)
   * This does NOT override keyboard input
   */
  public setMobileInputState(state: Partial<InputState>): void {
    Object.assign(this.mobileInputState, state);
  }

  /**
   * Set input state (for external control like mobile UI)
   * @deprecated Use setMobileInputState instead
   */
  public setInputState(state: Partial<InputState>): void {
    this.setMobileInputState(state);
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
   * Set player physics reference
   */
  public setPlayerPhysics(playerPhysics: PlayerPhysics): void {
    this.playerPhysics = playerPhysics;
  }

  /**
   * Update player movement based on input
   */
  public update(deltaTime: number): void {
    // Allow movement during countdown and playing phases
    const phase = this.gameState.getGamePhase();
    if (phase !== 'countdown' && phase !== 'playing') return;

    const player = this.gameState.getLocalPlayer();
    
    // Save original keyboard input
    const originalKeyboardInput = { ...this.inputState };
    
    // Merge keyboard and mobile input for this frame
    const mergedInput = this.getInputState();
    
    // Temporarily replace inputState with merged input
    this.inputState = mergedInput;
    
    // Handle keyboard rotation (A/D keys)
    if (this.inputState.left) {
      // Rotate left
      const newYaw = player.rotation.yaw + this.keyboardRotationSpeed;
      this.gameState.setLocalPlayerRotation(newYaw, player.rotation.pitch);
    }
    if (this.inputState.right) {
      // Rotate right
      const newYaw = player.rotation.yaw - this.keyboardRotationSpeed;
      this.gameState.setLocalPlayerRotation(newYaw, player.rotation.pitch);
    }
    
    // Update mobile controls
    if (this.mobileControls?.shouldShowMobileControls()) {
      this.mobileControls.update();
      this.applyMobileInput();
    }
    
    // Handle ladder climbing
    if (this.handleLadderClimbing(deltaTime)) {
      // If climbing, skip normal movement
      // Restore keyboard input before returning
      this.inputState = originalKeyboardInput;
      this.inputState.mouseX = 0;
      this.inputState.mouseY = 0;
      return;
    }
    
    // Handle jetpack and jump abilities
    this.handleAbilities(deltaTime);
    
    // Handle dash fuel consumption BEFORE calculating speed
    // This ensures isDashActive is set before calculateSpeed checks it
    this.handleDashFuelConsumption(deltaTime);
    
    // Calculate speed (this also sets dashing state based on isDashActive)
    const speed = this.calculateSpeed();
    
    // Handle fuel recovery (after dash state is set)
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
    let newVelocity = {
      x: this.lerp(player.velocity.x, targetVelocity.x, smoothing),
      y: targetVelocity.y,
      z: this.lerp(player.velocity.z, targetVelocity.z, smoothing),
    };

    // Apply water resistance if in water
    if (this.playerPhysics) {
      const isInWater = this.playerPhysics.isInWater(player.position);
      newVelocity = this.playerPhysics.applyWaterResistance(newVelocity, isInWater);
    }

    this.gameState.setLocalPlayerVelocity(newVelocity);

    // Note: Position update is now handled by PlayerPhysics in main.ts

    // Restore original keyboard input state
    this.inputState = originalKeyboardInput;
    
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
        y: JUMP_FORCE * RUNNER_JUMP_MULTIPLIER, // Runners jump 1.5x higher
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
      // Runner recovers fuel while walking (not dashing, not stationary)
      // Recover at 20 per second = 100 fuel in 5 seconds
      const fuelRecovered = RUNNER_FUEL_RECOVERY * deltaTime;
      this.gameState.setLocalPlayerFuel(player.fuel + fuelRecovered);
    }
  }

  /**
   * Calculate movement speed based on player state
   */
  private calculateSpeed(): number {
    const player = this.gameState.getLocalPlayer();
    let speed = this.gameState.getLocalPlayerSpeed();

    // Check if dash button is pressed and player has fuel (runner only)
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
    
    // Consume fuel while dashing (runner only, button pressed, has fuel)
    if (this.inputState.dash && !player.isOni && player.fuel > 0) {
      // Consume fuel continuously while dashing
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
      // Try to start climbing if pressing forward OR backward near a ladder
      // Allow starting from rooftop by pressing backward (S key)
      const tryingToClimb = (this.inputState.forward || this.inputState.backward) && player.isOnSurface;
      
      if (tryingToClimb) {
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

    // Apply speed boost when shift is pressed
    const speedMultiplier = this.inputState.sprint ? 2.0 : 1.0;

    // Update climbing
    const { position, progress, shouldExit } = this.ladderSystem.updateClimbing(
      this.ladderClimbState,
      climbInput,
      deltaTime,
      speedMultiplier
    );

    this.ladderClimbState.climbProgress = progress;
    this.gameState.setLocalPlayerPosition(position);

    // Check for exit conditions
    // Auto-exit when reaching top (progress >= 1.0) or bottom (progress <= 0)
    // Also allow manual exit with jump or side movement
    if (shouldExit || this.inputState.jump || this.inputState.left || this.inputState.right) {
      // Exit climbing
      const exitPosition = this.ladderSystem.exitClimbing(
        this.ladderClimbState.currentLadder!,
        this.ladderClimbState.climbProgress,
        player.rotation.yaw
      );

      this.gameState.setLocalPlayerPosition(exitPosition);
      
      // Set on surface based on exit position
      const isAtTop = this.ladderClimbState.climbProgress >= 0.95;
      
      // If at top, place on rooftop surface with no downward velocity
      if (isAtTop) {
        this.gameState.setLocalPlayerVelocity({ x: 0, y: 0, z: 0 });
        this.gameState.setLocalPlayerOnSurface(true);
      } else {
        // Otherwise, small downward velocity to land
        this.gameState.setLocalPlayerVelocity({ x: 0, y: -0.1, z: 0 });
        this.gameState.setLocalPlayerOnSurface(this.ladderClimbState.climbProgress < 0.1);
      }
      
      this.gameState.setLocalPlayerClimbing(false);

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
