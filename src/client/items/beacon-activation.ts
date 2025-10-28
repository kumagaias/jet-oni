import { BEACON_DURATION } from '../../shared/constants';

/**
 * BeaconActivation manages beacon activation state
 */
export class BeaconActivation {
  private isActive = false;
  private activatedAt = 0;
  private activatedBy: string | null = null;

  /**
   * Activate beacon
   */
  public activate(playerId: string): void {
    this.isActive = true;
    this.activatedAt = Date.now();
    this.activatedBy = playerId;
  }

  /**
   * Check if beacon is currently active
   */
  public isBeaconActive(): boolean {
    if (!this.isActive) {
      return false;
    }

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
    this.activatedBy = null;
  }

  /**
   * Get remaining active time in seconds
   */
  public getRemainingActiveTime(): number {
    if (!this.isActive) {
      return 0;
    }

    const elapsed = (Date.now() - this.activatedAt) / 1000;
    return Math.max(0, BEACON_DURATION - elapsed);
  }

  /**
   * Get player who activated the beacon
   */
  public getActivatedBy(): string | null {
    return this.activatedBy;
  }

  /**
   * Update beacon activation (check for expiration)
   */
  public update(): void {
    if (this.isActive) {
      const elapsed = (Date.now() - this.activatedAt) / 1000;
      if (elapsed >= BEACON_DURATION) {
        this.deactivate();
      }
    }
  }

  /**
   * Reset beacon activation
   */
  public reset(): void {
    this.isActive = false;
    this.activatedAt = 0;
    this.activatedBy = null;
  }
}
