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
  private countdownElement: HTMLElement | null = null;
  private statusElement: HTMLElement | null = null;
  private playerCountElement: HTMLElement | null = null;
  private fuelContainer: HTMLElement | null = null;
  private fuelLabel: HTMLElement | null = null;
  private fuelBar: HTMLElement | null = null;
  private fuelText: HTMLElement | null = null;
  private beaconElement: HTMLElement | null = null;
  private cloakTimerElement: HTMLElement | null = null;
  private gameState: GameState;
  private i18n: I18n;
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
    // Check if HUD already exists
    const existingHud = document.getElementById('hud-container');
    if (existingHud) {
      this.hudContainer = existingHud;
      // Re-query all child elements
      this.timerElement = document.getElementById('hud-timer');
      this.statusElement = document.getElementById('hud-status');
      this.playerCountElement = document.getElementById('hud-player-count');
      this.fuelContainer = document.getElementById('hud-fuel-container');
      this.fuelBar = document.getElementById('hud-fuel-bar');
      this.beaconElement = document.getElementById('hud-beacon');
      this.cloakTimerElement = document.getElementById('hud-cloak-timer');
      this.fuelLabel = this.fuelContainer?.querySelector('div') as HTMLElement;
      this.fuelText = document.getElementById('hud-fuel-text');
      return;
    }
    
    // Add CSS animations for player cards
    const animationStyle = document.createElement('style');
    animationStyle.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(animationStyle);

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

    // Player cards container (top right) - shows runner cards
    this.playerCountElement = document.createElement('div');
    this.playerCountElement.id = 'hud-player-count';
    this.playerCountElement.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      padding: 5px;
    `;

    // Fuel gauge container - vertical on right side
    this.fuelContainer = document.createElement('div');
    this.fuelContainer.id = 'hud-fuel-container';
    this.fuelContainer.style.cssText = `
      position: absolute;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    `;

    // Fuel label
    this.fuelLabel = document.createElement('div');
    this.fuelLabel.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      text-align: center;
      writing-mode: vertical-rl;
      text-orientation: mixed;
    `;
    this.fuelLabel.textContent = this.i18n.t('hud.fuel');

    // Fuel bar background - vertical
    const fuelBarBg = document.createElement('div');
    fuelBarBg.style.cssText = `
      width: 30px;
      height: 200px;
      background-color: rgba(0, 0, 0, 0.5);
      border: 2px solid #ffffff;
      border-radius: 15px;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column-reverse;
    `;

    // Fuel bar fill - vertical (fills from bottom to top)
    this.fuelBar = document.createElement('div');
    this.fuelBar.id = 'hud-fuel-bar';
    this.fuelBar.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, #ff0000, #ffff00, #00ff00);
      transition: height 0.2s ease;
    `;

    // Fuel text (hidden)
    this.fuelText = document.createElement('div');
    this.fuelText.id = 'hud-fuel-text';
    this.fuelText.style.cssText = `
      display: none;
    `;

    fuelBarBg.appendChild(this.fuelBar);
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

    // Cloak timer (for cloaked runners only)
    this.cloakTimerElement = document.createElement('div');
    this.cloakTimerElement.id = 'hud-cloak-timer';
    this.cloakTimerElement.style.cssText = `
      position: absolute;
      top: 120px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 24px;
      font-weight: bold;
      color: #00ff00;
      text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.8);
      background-color: rgba(0, 255, 0, 0.2);
      padding: 12px 24px;
      border-radius: 12px;
      border: 2px solid #00ff00;
      display: none;
      animation: pulse-cloak 1s ease-in-out infinite;
    `;

    // Add pulse animation for cloak timer
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse-cloak {
        0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
        50% { opacity: 0.8; transform: translateX(-50%) scale(1.05); }
      }
    `;
    document.head.appendChild(style);

    // Append all elements
    this.hudContainer.appendChild(this.timerElement);
    this.hudContainer.appendChild(this.statusElement);
    this.hudContainer.appendChild(this.playerCountElement);
    this.hudContainer.appendChild(this.fuelContainer);
    this.hudContainer.appendChild(this.beaconElement);
    this.hudContainer.appendChild(this.cloakTimerElement);
    document.body.appendChild(this.hudContainer);
    
    // Hide HUD initially (will be shown when game starts)
    this.hudContainer.style.display = 'none';
  }

  /**
   * Start the game timer
   */
  public startTimer(durationSeconds: number = 300): void {
    this.gameDuration = durationSeconds;
  }

  /**
   * Update the HUD display
   * @param beaconCooldown - Remaining beacon cooldown in seconds (0 if ready)
   * @param cloakRemainingMs - Remaining cloak time in milliseconds (0 if not cloaked)
   */
  public update(beaconCooldown: number = 0, cloakRemainingMs: number = 0): void {
    if (!this.hudContainer || !this.hudContainer.parentNode) {
      // HUD was removed from DOM, recreate and show it
      this.createHudElements();
      this.hudContainer!.style.display = 'block';
    }

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

    // Update cloak timer (only for cloaked runners)
    this.updateCloakTimer(cloakRemainingMs);
  }

  /**
   * Update timer display
   */
  private updateTimer(): void {
    if (!this.timerElement) return;

    // Get remaining time from GameState (this respects debug timer changes)
    let remaining: number;
    if (this.gameState.isPlaying()) {
      remaining = this.gameState.getRemainingTime();
    } else {
      // If game hasn't started yet, show initial duration
      remaining = this.gameDuration;
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
    
    // Show countdown for last 10 seconds
    this.updateCountdown(remaining);
  }
  
  /**
   * Update countdown display for last 10 seconds
   */
  private updateCountdown(remaining: number): void {
    const seconds = Math.floor(remaining);
    
    // Show countdown only for last 10 seconds
    if (seconds > 0 && seconds <= 10) {
      // Create countdown element if it doesn't exist
      if (!this.countdownElement) {
        this.countdownElement = document.createElement('div');
        this.countdownElement.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 120px;
          font-weight: bold;
          color: #ff0000;
          text-shadow: 0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.6);
          z-index: 9998;
          pointer-events: none;
          animation: countdown-pulse 1s ease-in-out;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes countdown-pulse {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(this.countdownElement);
      }
      
      // Update countdown number
      this.countdownElement.textContent = seconds.toString();
      this.countdownElement.style.display = 'block';
      
      // Trigger animation by removing and re-adding animation
      this.countdownElement.style.animation = 'none';
      setTimeout(() => {
        if (this.countdownElement) {
          this.countdownElement.style.animation = 'countdown-pulse 1s ease-in-out';
        }
      }, 10);
    } else if (this.countdownElement) {
      // Hide countdown when not in last 10 seconds
      this.countdownElement.style.display = 'none';
    }
  }

  /**
   * Update status display (ONI/RUNNER)
   */
  private updateStatus(_isOni: boolean): void {
    if (!this.statusElement) return;

    // Hide status element (not needed)
    this.statusElement.style.display = 'none';
  }

  /**
   * Update player count display - shows runner cards
   */
  private updatePlayerCount(): void {
    if (!this.playerCountElement) return;

    // Get all players
    const allPlayers = this.gameState.getAllPlayers();
    const runners = allPlayers.filter(p => !p.isOni);

    // Update or create header showing runner count
    let header = this.playerCountElement.querySelector('[data-header="true"]') as HTMLElement;
    if (!header) {
      header = document.createElement('div');
      header.dataset.header = 'true';
      header.style.cssText = `
        background-color: rgba(0, 0, 0, 0.7);
        padding: 3px 8px;
        border-radius: 4px;
        color: white;
        font-size: 10px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 4px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      `;
      this.playerCountElement.insertBefore(header, this.playerCountElement.firstChild);
    }
    header.textContent = this.i18n.t('hud.runnersRemaining', { count: runners.length.toString() });

    // Get existing cards (excluding header)
    const existingCards = Array.from(this.playerCountElement.children).filter(
      child => !(child as HTMLElement).dataset.header
    ) as HTMLElement[];
    const existingPlayerIds = new Set(existingCards.map(card => card.dataset.playerId));

    // Remove cards for players who are ONI (with animation for newly tagged)
    existingCards.forEach(card => {
      const playerId = card.dataset.playerId;
      const player = allPlayers.find(p => p.id === playerId);
      
      // If player is ONI (either became ONI or was ONI from start), remove card
      if (player && player.isOni && !card.dataset.removing) {
        card.dataset.removing = 'true';
        
        // Check if player was just tagged (wasTagged flag)
        const wasJustTagged = player.wasTagged;
        
        if (wasJustTagged) {
          // Show X mark animation for newly tagged players
          const xMark = document.createElement('div');
          xMark.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            font-weight: bold;
            border-radius: 6px;
            animation: fadeIn 0.2s ease-out;
          `;
          xMark.textContent = '✕';
          card.style.position = 'relative';
          card.appendChild(xMark);
          
          // Fade out and remove after delay
          setTimeout(() => {
            card.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            setTimeout(() => {
              if (card.parentElement) {
                card.parentElement.removeChild(card);
              }
            }, 300);
          }, 500);
        } else {
          // Remove immediately for initial ONI (no animation)
          if (card.parentElement) {
            card.parentElement.removeChild(card);
          }
        }
      }
      
      // Also remove cards for players who no longer exist
      if (!player && !card.dataset.removing) {
        card.dataset.removing = 'true';
        if (card.parentElement) {
          card.parentElement.removeChild(card);
        }
      }
    });

    // Add cards for new runners (max 6 cards)
    const MAX_CARDS = 6;
    const runnersToShow = runners.slice(0, MAX_CARDS);
    const remainingCount = runners.length - MAX_CARDS;

    runnersToShow.forEach(runner => {
      if (!existingPlayerIds.has(runner.id)) {
        const card = document.createElement('div');
        card.dataset.playerId = runner.id;
        card.style.cssText = `
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: rgba(0, 150, 255, 0.9);
          padding: 4px 8px;
          border-radius: 6px;
          min-width: 100px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          transition: opacity 0.3s ease-out, transform 0.3s ease-out;
          animation: slideIn 0.3s ease-out;
        `;

        // Runner icon (smaller)
        const icon = document.createElement('div');
        icon.style.cssText = `
          width: 20px;
          height: 20px;
          background-color: #4CAF50;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          flex-shrink: 0;
        `;
        icon.textContent = '🏃';

        // Player name (smaller)
        const name = document.createElement('div');
        name.style.cssText = `
          color: white;
          font-size: 11px;
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        `;
        // Use username if available, otherwise use ID
        const displayName = runner.username || runner.id;
        // Shorten names more aggressively
        const shortName = displayName.startsWith('AI_') 
          ? displayName.replace('AI_', 'AI') 
          : displayName.length > 8 
            ? displayName.substring(0, 8) + '...' 
            : displayName;
        name.textContent = shortName;

        card.appendChild(icon);
        card.appendChild(name);
        this.playerCountElement.appendChild(card);
      }
    });

    // Show "and X others" message if there are more than MAX_CARDS runners
    let othersMessage = this.playerCountElement.querySelector('[data-others="true"]') as HTMLElement;
    if (remainingCount > 0) {
      if (!othersMessage) {
        othersMessage = document.createElement('div');
        othersMessage.dataset.others = 'true';
        othersMessage.style.cssText = `
          background-color: rgba(0, 0, 0, 0.6);
          padding: 3px 8px;
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 9px;
          text-align: center;
          margin-top: 2px;
          font-style: italic;
        `;
        this.playerCountElement.appendChild(othersMessage);
      }
      othersMessage.textContent = this.i18n.t('hud.andOthers', { count: remainingCount.toString() });
      othersMessage.style.display = 'block';
    } else if (othersMessage) {
      othersMessage.style.display = 'none';
    }

    // If no runners, show "All ONI" message
    if (runners.length === 0 && existingCards.filter(c => !c.dataset.removing).length === 0) {
      const message = document.createElement('div');
      message.style.cssText = `
        background-color: rgba(255, 0, 0, 0.9);
        padding: 6px 10px;
        border-radius: 6px;
        color: white;
        font-size: 12px;
        font-weight: bold;
        text-align: center;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      `;
      message.textContent = this.i18n.t('hud.allOni');
      this.playerCountElement.appendChild(message);
    }
  }

  /**
   * Update fuel gauge (vertical)
   */
  private updateFuel(fuel: number): void {
    if (!this.fuelBar || !this.fuelText || !this.fuelLabel) return;

    const localPlayer = this.gameState.getLocalPlayer();
    const fuelPercent = (fuel / MAX_FUEL) * 100;
    // For vertical gauge, use height instead of width
    this.fuelBar.style.height = `${fuelPercent}%`;

    // Update label based on role
    if (localPlayer.isOni) {
      this.fuelLabel.textContent = 'ONI';
      this.fuelLabel.style.color = '#ffa500';
      // ONI - Orange gradient (vertical: bottom to top)
      if (fuel < 25) {
        this.fuelBar.style.background = '#ff4500';
      } else if (fuel < 50) {
        this.fuelBar.style.background = 'linear-gradient(180deg, #ff4500, #ffa500)';
      } else {
        this.fuelBar.style.background = 'linear-gradient(180deg, #ffa500, #ff8c00)';
      }
    } else {
      this.fuelLabel.textContent = 'RUNNER';
      this.fuelLabel.style.color = '#00ff00';
      // RUNNER - Green gradient (vertical: bottom to top)
      if (fuel < 25) {
        this.fuelBar.style.background = '#00ff00';
      } else if (fuel < 50) {
        this.fuelBar.style.background = 'linear-gradient(180deg, #00ff00, #7fff00)';
      } else {
        this.fuelBar.style.background = 'linear-gradient(180deg, #00ff00, #32cd32)';
      }
    }
  }

  /**
   * Update beacon status display (now item-based, so hide this element)
   */
  private updateBeacon(_isOni: boolean, _cooldown: number): void {
    if (!this.beaconElement) return;
    
    // Beacon is now item-based, hide the status element
    this.beaconElement.style.display = 'none';
  }

  /**
   * Update cloak timer display (only for cloaked runners)
   */
  private updateCloakTimer(cloakRemainingMs: number): void {
    if (!this.cloakTimerElement) return;

    if (cloakRemainingMs > 0) {
      // Show cloak timer
      this.cloakTimerElement.style.display = 'block';
      
      // Calculate remaining seconds
      const remainingSeconds = Math.ceil(cloakRemainingMs / 1000);
      
      // Update text
      this.cloakTimerElement.textContent = `🛡️ CLOAKED: ${remainingSeconds}s`;
      
      // Change color based on remaining time
      if (remainingSeconds <= 10) {
        this.cloakTimerElement.style.color = '#ff0000';
        this.cloakTimerElement.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        this.cloakTimerElement.style.borderColor = '#ff0000';
      } else if (remainingSeconds <= 20) {
        this.cloakTimerElement.style.color = '#ffaa00';
        this.cloakTimerElement.style.backgroundColor = 'rgba(255, 170, 0, 0.2)';
        this.cloakTimerElement.style.borderColor = '#ffaa00';
      } else {
        this.cloakTimerElement.style.color = '#00ff00';
        this.cloakTimerElement.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
        this.cloakTimerElement.style.borderColor = '#00ff00';
      }
    } else {
      // Hide cloak timer
      this.cloakTimerElement.style.display = 'none';
    }
  }

  /**
   * Show the HUD
   */
  public show(): void {
    if (this.hudContainer) {
      this.hudContainer.style.display = 'block';
      
      // Ensure HUD is in DOM
      if (!this.hudContainer.parentNode) {
        document.body.appendChild(this.hudContainer);
      }
    } else {
      // HUD container was removed, recreate it
      this.createHudElements();
      this.hudContainer!.style.display = 'block';
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
   * Initialize the HUD (no-op, HUD is created in constructor)
   */
  public init(): void {
    // HUD elements are already created in constructor
    // This method exists for consistency with other UI components
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
