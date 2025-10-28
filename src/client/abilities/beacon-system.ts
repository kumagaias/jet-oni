import { GameState } from '../game/game-state';
import { BEACON_INITIAL_DELAY, BEACON_DURATION, BEACON_COOLDOWN } from '../../shared/constants';

/**
 * BeaconSystem manages the beacon ability for ONI players
 */
export class BeaconSystem {
  private gameState: GameState;
  private isActive = false;
  private activatedAt = 0;
  private lastUsed = 0;
  private becameOniAt = 0;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /**
   * Called when player becomes ONI
   */
  public onBecameOni(): void {
    this.becameOniAt = Date.now();
    this.lastUsed = 0;
    this.isActive = false;
    this.activatedAt = 0;
  }

  /**
   * Check if beacon ability is available
   */
  public isAvailable(): boolean {
    const player = this.gameState.getLocalPlayer();
    
    // Only ONI can use beacon
    if (!player.isOni) return false;
    
    // Must wait BEACON_INITIAL_DELAY after becoming ONI
    const timeSinceBecameOni = (Date.now() - this.becameOniAt) / 1000;
    if (timeSinceBecameOni < BEACON_INITIAL_DELAY) return false;
    
    // Must wait for cooldown after last use
    if (this.lastUsed > 0) {
      const timeSinceLastUse = (Date.now() - this.lastUsed) / 1000;
      if (timeSinceLastUse < BEACON_COOLDOWN) return false;
    }
    
    return true;
  }

  /**
   * Activate beacon ability
   */
  public activate(): boolean {
    if (!this.isAvailable()) return false;
    
    this.isActive = true;
    this.activatedAt = Date.now();
    
    return true;
  }

  /**
   * Check if beacon is currently active
   */
  public isBeaconActive(): boolean {
    if (!this.isActive) return false;
    
    const elapsed = (Date.now() - this.activatedAt) / 1000;
    if (elapsed >= BEACON_DURATION) {
      this.deactivate();
      return false;
    }
    
    return true;
  }

  /**
   * Deactivate beacon
   */
  private deactivate(): void {
    this.isActive = false;
    this.lastUsed = Date.now();
  }

  /**
   * Get cooldown progress (0-1, where 1 is ready)
   */
  public getCooldownProgress(): number {
    const player = this.gameState.getLocalPlayer();
    
    // Not ONI
    if (!player.isOni) return 0;
    
    // Initial delay after becoming ONI
    const timeSinceBecameOni = (Date.now() - this.becameOniAt) / 1000;
    if (timeSinceBecameOni < BEACON_INITIAL_DELAY) {
      return timeSinceBecameOni / BEACON_INITIAL_DELAY;
    }
    
    // Cooldown after use
    if (this.lastUsed > 0) {
      const timeSinceLastUse = (Date.now() - this.lastUsed) / 1000;
      if (timeSinceLastUse < BEACON_COOLDOWN) {
        return timeSinceLastUse / BEACON_COOLDOWN;
      }
    }
    
    return 1; // Ready
  }

  /**
   * Get remaining cooldown time in seconds
   */
  public getRemainingCooldown(): number {
    const player = this.gameState.getLocalPlayer();
    
    // Not ONI
    if (!player.isOni) return 0;
    
    // Initial delay after becoming ONI
    const timeSinceBecameOni = (Date.now() - this.becameOniAt) / 1000;
    if (timeSinceBecameOni < BEACON_INITIAL_DELAY) {
      return BEACON_INITIAL_DELAY - timeSinceBecameOni;
    }
    
    // Cooldown after use
    if (this.lastUsed > 0) {
      const timeSinceLastUse = (Date.now() - this.lastUsed) / 1000;
      if (timeSinceLastUse < BEACON_COOLDOWN) {
        return BEACON_COOLDOWN - timeSinceLastUse;
      }
    }
    
    return 0; // Ready
  }

  /**
   * Get remaining active time in seconds
   */
  public getRemainingActiveTime(): number {
    if (!this.isActive) return 0;
    
    const elapsed = (Date.now() - this.activatedAt) / 1000;
    return Math.max(0, BEACON_DURATION - elapsed);
  }

  /**
   * Update beacon system
   */
  public update(): void {
    // Check if beacon should deactivate
    if (this.isActive) {
      const elapsed = (Date.now() - this.activatedAt) / 1000;
      if (elapsed >= BEACON_DURATION) {
        this.deactivate();
      }
    }
  }

  /**
   * Reset beacon system
   */
  public reset(): void {
    this.isActive = false;
    this.activatedAt = 0;
    this.lastUsed = 0;
    this.becameOniAt = 0;
  }
}
