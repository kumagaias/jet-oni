/**
 * MobileControls - Touch-based controls for mobile devices
 */

export interface MobileInputState {
  moveX: number; // -1 to 1
  moveY: number; // -1 to 1
  lookX: number; // delta
  lookY: number; // delta
  jump: boolean;
  dash: boolean;
}

export class MobileControls {
  private moveJoystick: VirtualJoystick | null = null;
  private lookJoystick: VirtualJoystick | null = null;
  private jumpButton: HTMLElement | null = null;
  private dashButton: HTMLElement | null = null;
  private inputState: MobileInputState;
  private isMobile: boolean;

  constructor() {
    this.inputState = {
      moveX: 0,
      moveY: 0,
      lookX: 0,
      lookY: 0,
      jump: false,
      dash: false,
    };
    
    // Detect if mobile device
    this.isMobile = this.detectMobile();
  }

  /**
   * Detect if device is mobile
   */
  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
  }

  /**
   * Check if mobile controls should be shown
   */
  public shouldShowMobileControls(): boolean {
    return this.isMobile;
  }

  /**
   * Initialize mobile controls
   */
  public init(): void {
    if (!this.isMobile) return;

    // Create control container (initially hidden)
    const container = document.createElement('div');
    container.id = 'mobile-controls';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 500;
      display: none;
    `;
    document.body.appendChild(container);

    // Create move joystick (left side)
    this.moveJoystick = new VirtualJoystick(container, 'left', (x, y) => {
      this.inputState.moveX = x;
      this.inputState.moveY = y;
    });

    // Create look joystick (right side)
    this.lookJoystick = new VirtualJoystick(container, 'right', (x, y) => {
      this.inputState.lookX = x * 5; // Sensitivity multiplier
      this.inputState.lookY = y * 5;
    });

    // Create jump button (bottom right, left of dash)
    this.jumpButton = this.createButton('SPACE', 'bottom: 80px; right: 100px;', () => {
      this.inputState.jump = true;
    }, () => {
      this.inputState.jump = false;
    }, 'SPACE');
    container.appendChild(this.jumpButton);

    // Create dash/jetpack button (bottom right)
    // Note: This button is used for both dash (Runner) and jetpack (ONI)
    // The label shows "SPACE" because jetpack is the primary use case
    this.dashButton = this.createButton('SPACE', 'bottom: 80px; right: 20px;', () => {
      this.inputState.dash = true;
    }, () => {
      this.inputState.dash = false;
    }, 'SPACE');
    container.appendChild(this.dashButton);
  }

  /**
   * Create a button
   */
  private createButton(
    label: string,
    position: string,
    onPress: () => void,
    onRelease: () => void,
    tooltip?: string
  ): HTMLElement {
    const button = document.createElement('div');
    button.textContent = label;
    button.title = tooltip || label;
    button.style.cssText = `
      position: absolute;
      ${position}
      width: 60px;
      height: 60px;
      background: rgba(255, 136, 0, 0.5);
      border: 2px solid #ff8800;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: monospace;
      font-size: 10px;
      font-weight: bold;
      pointer-events: auto;
      user-select: none;
      touch-action: none;
    `;

    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      button.style.background = 'rgba(255, 136, 0, 0.8)';
      onPress();
    });

    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      button.style.background = 'rgba(255, 136, 0, 0.5)';
      onRelease();
    });

    return button;
  }

  /**
   * Get current input state
   */
  public getInputState(): MobileInputState {
    const state = { ...this.inputState };
    
    // Reset look deltas after reading
    this.inputState.lookX = 0;
    this.inputState.lookY = 0;
    
    return state;
  }

  /**
   * Update controls (called each frame)
   */
  public update(): void {
    if (!this.isMobile) return;
    
    this.moveJoystick?.update();
    this.lookJoystick?.update();
  }

  /**
   * Dispose controls
   */
  public dispose(): void {
    const container = document.getElementById('mobile-controls');
    if (container) {
      container.remove();
    }
  }
}

/**
 * VirtualJoystick - Touch-based joystick
 */
class VirtualJoystick {
  private base: HTMLElement;
  private stick: HTMLElement;
  private callback: (x: number, y: number) => void;
  private touchId: number | null = null;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  private maxDistance = 50;

  constructor(
    parent: HTMLElement,
    side: 'left' | 'right',
    callback: (x: number, y: number) => void
  ) {
    this.callback = callback;

    // Create base
    this.base = document.createElement('div');
    this.base.style.cssText = `
      position: absolute;
      ${side === 'left' ? 'left: 50px;' : 'right: 50px;'}
      bottom: 50px;
      width: 100px;
      height: 100px;
      background: rgba(255, 136, 0, 0.2);
      border: 2px solid rgba(255, 136, 0, 0.5);
      border-radius: 50%;
      pointer-events: auto;
      touch-action: none;
    `;
    parent.appendChild(this.base);

    // Create stick
    this.stick = document.createElement('div');
    this.stick.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      background: rgba(255, 136, 0, 0.7);
      border: 2px solid #ff8800;
      border-radius: 50%;
      pointer-events: none;
    `;
    this.base.appendChild(this.stick);

    // Setup touch events
    this.base.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.base.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.base.addEventListener('touchend', this.onTouchEnd.bind(this));
    this.base.addEventListener('touchcancel', this.onTouchEnd.bind(this));
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.touchId !== null) return;

    const touch = e.changedTouches[0];
    if (!touch) return;
    
    this.touchId = touch.identifier;

    const rect = this.base.getBoundingClientRect();
    this.startX = rect.left + rect.width / 2;
    this.startY = rect.top + rect.height / 2;
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;

    this.updateStickPosition();
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (this.touchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (!touch) continue;
      
      if (touch.identifier === this.touchId) {
        this.currentX = touch.clientX;
        this.currentY = touch.clientY;
        this.updateStickPosition();
        break;
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (this.touchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (!touch) continue;
      
      if (touch.identifier === this.touchId) {
        this.touchId = null;
        this.currentX = this.startX;
        this.currentY = this.startY;
        this.updateStickPosition();
        this.callback(0, 0);
        break;
      }
    }
  }

  private updateStickPosition(): void {
    const deltaX = this.currentX - this.startX;
    const deltaY = this.currentY - this.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    let x = deltaX;
    let y = deltaY;

    if (distance > this.maxDistance) {
      x = (deltaX / distance) * this.maxDistance;
      y = (deltaY / distance) * this.maxDistance;
    }

    this.stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

    // Normalize to -1 to 1
    const normalizedX = x / this.maxDistance;
    const normalizedY = y / this.maxDistance;

    this.callback(normalizedX, normalizedY);
  }

  public update(): void {
    // Called each frame if needed
  }
}
