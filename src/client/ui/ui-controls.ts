/**
 * UIControls - Mobile touch controls for abilities
 * Provides touch buttons for dash/jetpack and beacon abilities
 */

import type { GameState } from '../game/game-state';
import type { I18n } from '../i18n/i18n';

export interface ControlButtonState {
  dash: boolean;
  jetpack: boolean;
  beacon: boolean;
  // Movement controls
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
}

export class UIControls {
  private container: HTMLElement | null = null;
  private dashButton: HTMLElement | null = null;
  private buttonState: ControlButtonState;
  private isMobile: boolean;

  constructor(_gameState: GameState, _i18n: I18n) {
    console.log('[UIControls] Constructor called');
    this.buttonState = {
      dash: false,
      jetpack: false,
      beacon: false,
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
    };
    
    // Detect if mobile device
    this.isMobile = this.detectMobile();
    console.log('[UIControls] Mobile detected:', this.isMobile);
    console.log('[UIControls] User agent:', navigator.userAgent);
    console.log('[UIControls] Window width:', window.innerWidth);
    
    // Initialize controls
    this.init();
  }

  /**
   * Detect if device is mobile or should show controls
   */
  private detectMobile(): boolean {
    // Always show controls for easier gameplay on all devices
    // Players can use keyboard (WASD/Space) or click/touch the on-screen controls
    return true;
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
    console.log('[UIControls] init() called, isMobile:', this.isMobile);
    if (!this.isMobile) {
      console.log('[UIControls] Not mobile, skipping init');
      return;
    }

    console.log('[UIControls] Creating mobile controls...');
    
    // Create control container
    this.container = document.createElement('div');
    this.container.id = 'ability-controls';
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: none;
      flex-direction: column;
      gap: 15px;
      pointer-events: none;
      z-index: 600;
    `;
    document.body.appendChild(this.container);
    console.log('[UIControls] Container created and added to body');

    // Create dash/jetpack button (bottom)
    this.dashButton = this.createAbilityButton(
      '🚀',
      'SPACE',
      'rgba(0, 150, 255, 0.5)',
      '#0096ff',
      () => {
        console.log('[UIControls] Dash/Jetpack button pressed');
        this.buttonState.dash = true;
        this.buttonState.jetpack = true;
        console.log('[UIControls] Button state:', this.buttonState);
      },
      () => {
        console.log('[UIControls] Dash/Jetpack button released');
        this.buttonState.dash = false;
        this.buttonState.jetpack = false;
      }
    );
    this.container.appendChild(this.dashButton);
    console.log('[UIControls] Dash button created and added');
    
    // Create D-pad for movement
    this.createDPad();
    console.log('[UIControls] D-pad created');
    console.log('[UIControls] Init complete');
  }
  
  /**
   * Create D-pad for movement controls
   */
  private createDPad(): void {
    const dpadContainer = document.createElement('div');
    dpadContainer.id = 'dpad-controls';
    dpadContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 150px;
      height: 150px;
      display: none;
      pointer-events: none;
      z-index: 600;
    `;
    
    // Create center circle (visual only)
    const center = document.createElement('div');
    center.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      background: rgba(100, 100, 100, 0.3);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
    `;
    dpadContainer.appendChild(center);
    
    // Create directional buttons
    const directions = [
      { key: 'up', label: '▲', keyLabel: 'W', top: '0', left: '50%', transform: 'translateX(-50%)', action: 'moveForward' },
      { key: 'down', label: '▼', keyLabel: 'S', bottom: '0', left: '50%', transform: 'translateX(-50%)', action: 'moveBackward' },
      { key: 'left', label: '◀', keyLabel: 'A', top: '50%', left: '0', transform: 'translateY(-50%)', action: 'moveLeft' },
      { key: 'right', label: '▶', keyLabel: 'D', top: '50%', right: '0', transform: 'translateY(-50%)', action: 'moveRight' },
    ];
    
    directions.forEach(dir => {
      const button = document.createElement('div');
      button.style.cssText = `
        position: absolute;
        ${dir.top ? `top: ${dir.top};` : ''}
        ${dir.bottom ? `bottom: ${dir.bottom};` : ''}
        ${dir.left ? `left: ${dir.left};` : ''}
        ${dir.right ? `right: ${dir.right};` : ''}
        transform: ${dir.transform};
        width: 50px;
        height: 50px;
        background: rgba(255, 136, 0, 0.5);
        border: 2px solid #ff8800;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 24px;
        pointer-events: auto;
        user-select: none;
        touch-action: none;
        cursor: pointer;
        transition: all 0.1s ease;
      `;
      
      // Arrow symbol
      const arrow = document.createElement('div');
      arrow.textContent = dir.label;
      arrow.style.cssText = `
        font-size: 24px;
        line-height: 1;
      `;
      button.appendChild(arrow);
      
      // WASD key label
      const keyLabel = document.createElement('div');
      keyLabel.textContent = dir.keyLabel;
      keyLabel.style.cssText = `
        font-size: 10px;
        opacity: 0.6;
        margin-top: 2px;
        font-family: monospace;
      `;
      button.appendChild(keyLabel);
      
      // Touch and mouse events for continuous movement
      const handleStart = () => {
        button.style.background = 'rgba(255, 136, 0, 0.8)';
        button.style.transform = `${dir.transform} scale(0.9)`;
        this.buttonState[dir.action as keyof ControlButtonState] = true;
      };
      
      const handleEnd = () => {
        button.style.background = 'rgba(255, 136, 0, 0.5)';
        button.style.transform = dir.transform;
        this.buttonState[dir.action as keyof ControlButtonState] = false;
      };
      
      button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleStart();
      });
      
      button.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleEnd();
      });
      
      button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        handleStart();
      });
      
      button.addEventListener('mouseup', (e) => {
        e.preventDefault();
        handleEnd();
      });
      
      button.addEventListener('mouseleave', () => {
        // Release button if mouse leaves while pressed
        handleEnd();
      });
      
      button.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        button.style.background = 'rgba(255, 136, 0, 0.5)';
        button.style.transform = dir.transform;
        this.buttonState[dir.action as keyof ControlButtonState] = false;
      });
      
      dpadContainer.appendChild(button);
    });
    
    document.body.appendChild(dpadContainer);
  }

  /**
   * Create an ability button
   */
  private createAbilityButton(
    label: string,
    keyLabel: string,
    backgroundColor: string,
    borderColor: string,
    onPress: () => void,
    onRelease: () => void
  ): HTMLElement {
    const button = document.createElement('div');
    button.style.cssText = `
      width: 70px;
      height: 70px;
      background: ${backgroundColor};
      border: 3px solid ${borderColor};
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: monospace;
      font-size: 32px;
      font-weight: bold;
      pointer-events: auto;
      user-select: none;
      touch-action: none;
      transition: transform 0.1s ease, opacity 0.2s ease;
      cursor: pointer;
    `;
    
    // Icon
    const icon = document.createElement('div');
    icon.textContent = label;
    icon.style.cssText = `
      font-size: 32px;
      line-height: 1;
    `;
    button.appendChild(icon);
    
    // Key label
    const key = document.createElement('div');
    key.textContent = keyLabel;
    key.style.cssText = `
      font-size: 9px;
      opacity: 0.6;
      margin-top: 2px;
      font-family: monospace;
    `;
    button.appendChild(key);

    // Store original colors
    button.dataset.bgColor = backgroundColor;
    button.dataset.borderColor = borderColor;

    // Touch and mouse events
    const handlePress = () => {
      if (button.classList.contains('disabled')) return;
      button.style.transform = 'scale(0.9)';
      button.style.background = backgroundColor.replace('0.5', '0.8');
      onPress();
    };
    
    const handleRelease = () => {
      if (button.classList.contains('disabled')) return;
      button.style.transform = 'scale(1)';
      button.style.background = backgroundColor;
      onRelease();
    };
    
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handlePress();
    });

    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleRelease();
    });

    button.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      handleRelease();
    });
    
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handlePress();
    });
    
    button.addEventListener('mouseup', (e) => {
      e.preventDefault();
      handleRelease();
    });
    
    button.addEventListener('mouseleave', () => {
      handleRelease();
    });

    return button;
  }

  /**
   * Update controls based on game state
   */
  public update(gameState: GameState): void {
    if (!this.isMobile || !this.container) return;

    const localPlayer = gameState.getLocalPlayer();
    if (!localPlayer) return;

    // Update dash/jetpack button
    if (this.dashButton) {
      // Update icon (first child)
      const icon = this.dashButton.children[0] as HTMLElement;
      if (icon) {
        if (localPlayer.isOni) {
          // Oni mode - rocket for jetpack
          icon.textContent = '🚀';
          this.updateButtonColor(this.dashButton, 'rgba(255, 100, 0, 0.5)', '#ff6400');
        } else {
          // Runner mode - running person for dash
          icon.textContent = '🏃‍➡️';
          this.updateButtonColor(this.dashButton, 'rgba(0, 150, 255, 0.5)', '#0096ff');
        }
      }

      // Disable if no fuel
      if (localPlayer.fuel <= 0) {
        this.setButtonDisabled(this.dashButton, true);
      } else {
        this.setButtonDisabled(this.dashButton, false);
      }
    }

  }

  /**
   * Update button color
   */
  private updateButtonColor(button: HTMLElement, bgColor: string, borderColor: string): void {
    button.dataset.bgColor = bgColor;
    button.dataset.borderColor = borderColor;
    
    if (!button.classList.contains('disabled')) {
      button.style.background = bgColor;
      button.style.borderColor = borderColor;
    }
  }

  /**
   * Set button disabled state
   */
  private setButtonDisabled(button: HTMLElement, disabled: boolean): void {
    if (disabled) {
      button.classList.add('disabled');
      button.style.background = 'rgba(128, 128, 128, 0.3)';
      button.style.borderColor = '#808080';
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    } else {
      button.classList.remove('disabled');
      const bgColor = button.dataset.bgColor || 'rgba(0, 150, 255, 0.5)';
      const borderColor = button.dataset.borderColor || '#0096ff';
      button.style.background = bgColor;
      button.style.borderColor = borderColor;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }
  }

  /**
   * Get current button state
   */
  public getButtonState(): ControlButtonState {
    const state = { ...this.buttonState };
    
    // Log if any button is pressed
    const anyPressed = Object.values(state).some(v => v === true);
    if (anyPressed) {
      console.log('[UIControls] getButtonState() - Active buttons:', state);
    }
    
    // Reset beacon after reading (it's a one-time press)
    this.buttonState.beacon = false;
    
    return state;
  }

  /**
   * Show controls
   */
  public show(): void {
    console.log('[UIControls] show() called');
    console.log('[UIControls] Container exists:', !!this.container);
    console.log('[UIControls] isMobile:', this.isMobile);
    
    if (this.container) {
      this.container.style.display = 'flex';
      console.log('[UIControls] Container display set to flex');
    }
    
    // Show D-pad
    const dpad = document.getElementById('dpad-controls');
    console.log('[UIControls] D-pad element exists:', !!dpad);
    if (dpad) {
      dpad.style.display = 'block';
      console.log('[UIControls] D-pad display set to block');
    }
    
    console.log('[UIControls] Show complete');
  }

  /**
   * Hide controls
   */
  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
    
    // Hide D-pad
    const dpad = document.getElementById('dpad-controls');
    if (dpad) {
      dpad.style.display = 'none';
    }
  }

  /**
   * Dispose controls
   */
  public dispose(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.dashButton = null;
  }
}
