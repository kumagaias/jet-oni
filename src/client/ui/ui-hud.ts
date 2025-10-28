import { GameState } from '../game/game-state';
import { I18n } from '../i18n/i18n';
import { MAX_FUEL } from '../../shared/constants';

/**
 * UIHud manages the in-game HUD display
 * Shows timer, player counts, fuel gauge, and status
 */
export class UIHud {
  private hudContainer: HTMLElement | null = null;
  private timerElement: HTMLElement | null = null;
  private statusElement: HTMLElement | null = null;
  private playerCountElement: HTMLElement | null = null;
  private fuelContainer: HTMLElement | null = null;
  private fuelLabel: HTMLElement | null = null;
  private fuelBar: HTMLElement | null = null;
  private fuelText: HTMLElement | null = null;
  private beaconElement: HTMLElement | null = null;
  private gameState: GameState;
  private i18n: I18n;
  private gameStartTime: number = 0;
  private gameDuration: number = 300; // 5 minutes default

  constructor(gameState: GameState, i18n: I18n) {
    this.gameState = gameState;
    this.i18n = i18n;
    this.createHudElements();
  }

  /**
   * Create all HUD elements
   */
  private createHudElements(): void {
    // Main HUD container
    this.hudContainer = document.createElement('div');
    this.hudContainer.id = 'hud-container';
    this.hudContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 50;
      font-family: 'Arial', sans-serif;
    `;

    // Status display (ONI/RUNNER)
    this.statusElement = document.createElement('div');
    this.statusElement.id = 'hud-status';
    this.statusElement.style.cssText = `
      position: absolute;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 24px;
      font-weight: bold;
      padding: 10px 20px;
      border-radius: 8px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      transition: background-color 0.3s ease, color 0.3s ease;
    `;

    // Timer display (top left)
    this.timerElement = document.createElement('div');
    this.timerElement.id = 'hud-timer';
    this.timerElement.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.8);
      background-color: rgba(0, 0, 0, 0.6);
      padding: 15px 30px;
      border-radius: 12px;
      min-width: 120px;
      text-align: center;
    `;
    this.timerElement.textContent = '5:00';

    // Player count display (top right)
    this.playerCountElement = document.createElement('div');
    this.playerCountElement.id = 'hud-player-count';
    this.playerCountElement.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      font-size: 18px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      background-color: rgba(0, 0, 0, 0.5);
      padding: 10px 15px;
      border-radius: 8px;
    `;

    // Fuel gauge container
    this.fuelContainer = document.createElement('div');
    this.fuelContainer.id = 'hud-fuel-container';
    this.fuelContainer.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      width: 300px;
    `;

    // Fuel label
    this.fuelLabel = document.createElement('div');
    this.fuelLabel.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      margin-bottom: 5px;
      text-align: center;
    `;
    this.fuelLabel.textContent = this.i18n.t('hud.fuel');

    // Fuel bar background
    const fuelBarBg = document.createElement('div');
    fuelBarBg.style.cssText = `
      width: 100%;
      height: 20px;
      background-color: rgba(0, 0, 0, 0.5);
      border: 2px solid #ffffff;
      border-radius: 10px;
      overflow: hidden;
      position: relative;
    `;

    // Fuel bar fill
    this.fuelBar = document.createElement('div');
    this.fuelBar.id = 'hud-fuel-bar';
    this.fuelBar.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #00ff00, #ffff00, #ff0000);
      transition: width 0.2s ease;
    `;

    // Fuel text
    this.fuelText = document.createElement('div');
    this.fuelText.id = 'hud-fuel-text';
    this.fuelText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 12px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    `;

    fuelBarBg.appendChild(this.fuelBar);
    fuelBarBg.appendChild(this.fuelText);
    this.fuelContainer.appendChild(this.fuelLabel);
    this.fuelContainer.appendChild(fuelBarBg);

    // Beacon status (for ONI only)
    this.beaconElement = document.createElement('div');
    this.beaconElement.id = 'hud-beacon';
    this.beaconElement.style.cssText = `
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 16px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      background-color: rgba(0, 0, 0, 0.5);
      padding: 8px 15px;
      border-radius: 8px;
      display: none;
    `;

    // Append all elements
    this.hudContainer.appendChild(this.timerElement);
    this.hudContainer.appendChild(this.statusElement);
    this.hudContainer.appendChild(this.playerCountElement);
    this.hudContainer.appendChild(this.fuelContainer);
    this.hudContainer.appendChild(this.beaconElement);
    document.body.appendChild(this.hudContainer);
  }

  /**
   * Start the game timer
   */
  public startTimer(durationSeconds: number = 300): void {
    this.gameStartTime = Date.now();
    this.gameDuration = durationSeconds;
  }

  /**
   * Update the HUD display
   * @param beaconCooldown - Remaining beacon cooldown in seconds (0 if ready)
   */
  public update(beaconCooldown: number = 0): void {
    if (!this.hudContainer) return;

    const localPlayer = this.gameState.getLocalPlayer();

    // Update timer
    this.updateTimer();

    // Update status display
    this.updateStatus(localPlayer.isOni);

    // Update player count
    this.updatePlayerCount();

    // Update fuel gauge
    this.updateFuel(localPlayer.fuel);

    // Update beacon status (only for ONI)
    this.updateBeacon(localPlayer.isOni, beaconCooldown);
  }

  /**
   * Update timer display
   */
  private updateTimer(): void {
    if (!this.timerElement) return;

    // If game hasn't started yet, show initial duration
    let remaining: number;
    if (this.gameStartTime === 0) {
      remaining = this.gameDuration;
    } else {
      const elapsed = (Date.now() - this.gameStartTime) / 1000;
      remaining = Math.max(0, this.gameDuration - elapsed);
    }
    
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    this.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Change color based on time remaining
    if (remaining < 30) {
      this.timerElement.style.color = '#ff0000'; // Red
      this.timerElement.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
    } else if (remaining < 60) {
      this.timerElement.style.color = '#ffaa00'; // Orange
      this.timerElement.style.backgroundColor = 'rgba(255, 170, 0, 0.3)';
    } else {
      this.timerElement.style.color = '#ffffff'; // White
      this.timerElement.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    }
  }

  /**
   * Update status display (ONI/RUNNER)
   */
  private updateStatus(isOni: boolean): void {
    if (!this.statusElement) return;

    // Hide status element (not needed)
    this.statusElement.style.display = 'none';
  }

  /**
   * Update player count display
   */
  private updatePlayerCount(): void {
    if (!this.playerCountElement) return;

    const oniCount = this.gameState.countOniPlayers();
    const runnerCount = this.gameState.countRunnerPlayers();

    this.playerCountElement.textContent = this.i18n.t('hud.playerCount', {
      oni: oniCount.toString(),
      runners: runnerCount.toString(),
    });
  }

  /**
   * Update fuel gauge
   */
  private updateFuel(fuel: number): void {
    if (!this.fuelBar || !this.fuelText || !this.fuelLabel) return;

    const localPlayer = this.gameState.getLocalPlayer();
    const fuelPercent = (fuel / MAX_FUEL) * 100;
    this.fuelBar.style.width = `${fuelPercent}%`;
    this.fuelText.textContent = `${Math.round(fuel)}`;

    // Update label based on role
    if (localPlayer.isOni) {
      this.fuelLabel.textContent = 'ONI';
      this.fuelLabel.style.color = '#ffa500';
      // ONI - Orange gradient
      if (fuel < 25) {
        this.fuelBar.style.background = '#ff4500';
      } else if (fuel < 50) {
        this.fuelBar.style.background = 'linear-gradient(90deg, #ff4500, #ffa500)';
      } else {
        this.fuelBar.style.background = 'linear-gradient(90deg, #ffa500, #ff8c00)';
      }
    } else {
      this.fuelLabel.textContent = 'RUNNER';
      this.fuelLabel.style.color = '#00ff00';
      // RUNNER - Green gradient
      if (fuel < 25) {
        this.fuelBar.style.background = '#00ff00';
      } else if (fuel < 50) {
        this.fuelBar.style.background = 'linear-gradient(90deg, #00ff00, #7fff00)';
      } else {
        this.fuelBar.style.background = 'linear-gradient(90deg, #00ff00, #32cd32)';
      }
    }
  }

  /**
   * Update beacon status display (now item-based, so hide this element)
   */
  private updateBeacon(isOni: boolean, cooldown: number): void {
    if (!this.beaconElement) return;
    
    // Beacon is now item-based, hide the status element
    this.beaconElement.style.display = 'none';
  }

  /**
   * Show the HUD
   */
  public show(): void {
    if (this.hudContainer) {
      this.hudContainer.style.display = 'block';
    }
  }

  /**
   * Hide the HUD
   */
  public hide(): void {
    if (this.hudContainer) {
      this.hudContainer.style.display = 'none';
    }
  }

  /**
   * Update language
   */
  public updateLanguage(): void {
    // Re-create elements with new translations
    if (this.hudContainer && this.hudContainer.parentNode) {
      this.hudContainer.parentNode.removeChild(this.hudContainer);
    }
    this.createHudElements();
  }

  /**
   * Remove the HUD from DOM
   */
  public dispose(): void {
    if (this.hudContainer && this.hudContainer.parentNode) {
      this.hudContainer.parentNode.removeChild(this.hudContainer);
      this.hudContainer = null;
      this.statusElement = null;
      this.playerCountElement = null;
      this.fuelContainer = null;
      this.fuelBar = null;
      this.fuelText = null;
      this.beaconElement = null;
    }
  }
}
