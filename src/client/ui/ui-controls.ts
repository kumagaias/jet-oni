/**
 * UIControls - Mobile touch controls for abilities
 * Provides touch buttons for dash/jetpack and beacon abilities
 */

import type { GameState } from '../game/game-state';
import { I18n } from '../i18n/i18n';

export interface ControlButtonState {
  dash: boolean;
  jetpack: boolean;
  beacon: boolean;
}

export class UIControls {
  private container: HTMLElement | null = null;
  private dashButton: HTMLElement | null = null;
  private beaconButton: HTMLElement | null = null;
  private buttonState: ControlButtonState;
  private isMobile: boolean;
  private i18n: I18n;
  private gameState: GameState;

  constructor(gameState: GameState, i18n: I18n) {
    this.gameState = gameState;
    this.i18n = i18n;
    this.buttonState = {
      dash: false,
      jetpack: false,
      beacon: false,
    };
    
    // Detect if mobile device
    this.isMobile = this.detectMobile();
    
    // Initialize controls
    this.init();
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

    // Create control container
    this.container = document.createElement('div');
    this.container.id = 'ability-controls';
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
      pointer-events: none;
      z-index: 600;
    `;
    document.body.appendChild(this.container);

    // Create dash/jetpack button (bottom)
    this.dashButton = this.createAbilityButton(
      '🚀',
      'rgba(0, 150, 255, 0.5)',
      '#0096ff',
      () => {
        this.buttonState.dash = true;
        this.buttonState.jetpack = true;
      },
      () => {
        this.buttonState.dash = false;
        this.buttonState.jetpack = false;
      }
    );
    this.container.appendChild(this.dashButton);

    // Create beacon button (top)
    this.beaconButton = this.createAbilityButton(
      '📡',
      'rgba(255, 0, 0, 0.5)',
      '#ff0000',
      () => {
        this.buttonState.beacon = true;
      },
      () => {
        this.buttonState.beacon = false;
      }
    );
    this.container.appendChild(this.beaconButton);

    // Initially hide beacon button (only for oni)
    this.beaconButton.style.display = 'none';
  }

  /**
   * Create an ability button
   */
  private createAbilityButton(
    label: string,
    backgroundColor: string,
    borderColor: string,
    onPress: () => void,
    onRelease: () => void
  ): HTMLElement {
    const button = document.createElement('div');
    button.textContent = label;
    button.style.cssText = `
      width: 70px;
      height: 70px;
      background: ${backgroundColor};
      border: 3px solid ${borderColor};
      border-radius: 50%;
      display: flex;
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

    // Store original colors
    button.dataset.bgColor = backgroundColor;
    button.dataset.borderColor = borderColor;

    // Touch events
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (button.classList.contains('disabled')) return;
      
      // Scale animation
      button.style.transform = 'scale(0.9)';
      button.style.background = backgroundColor.replace('0.5', '0.8');
      onPress();
    });

    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (button.classList.contains('disabled')) return;
      
      // Reset scale
      button.style.transform = 'scale(1)';
      button.style.background = backgroundColor;
      onRelease();
    });

    button.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      button.style.transform = 'scale(1)';
      button.style.background = backgroundColor;
      onRelease();
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
      if (localPlayer.isOni) {
        // Oni mode - show as jetpack
        this.dashButton.textContent = '🔥';
        this.updateButtonColor(this.dashButton, 'rgba(255, 100, 0, 0.5)', '#ff6400');
      } else {
        // Runner mode - show as dash
        this.dashButton.textContent = '⚡️';
        this.updateButtonColor(this.dashButton, 'rgba(0, 150, 255, 0.5)', '#0096ff');
      }

      // Disable if no fuel
      if (localPlayer.fuel <= 0) {
        this.setButtonDisabled(this.dashButton, true);
      } else {
        this.setButtonDisabled(this.dashButton, false);
      }
    }

    // Hide beacon button (beacon is now item-based, auto-collected)
    if (this.beaconButton) {
      this.beaconButton.style.display = 'none';
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
    
    // Reset beacon after reading (it's a one-time press)
    this.buttonState.beacon = false;
    
    return state;
  }

  /**
   * Show controls
   */
  public show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  /**
   * Hide controls
   */
  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
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
    this.beaconButton = null;
  }
}
