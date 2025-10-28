import * as THREE from 'three';
import { BeaconItem, BeaconItemData } from './beacon-item';
import { BeaconActivation } from './beacon-activation';
import { Vector3, Player } from '../../shared/types/game';

/**
 * ItemManager manages all items in the game
 */
export class ItemManager {
  private beaconItem: BeaconItem;
  private beaconActivation: BeaconActivation;
  private onBeaconCollectedCallback?: (playerId: string) => void;

  constructor(scene: THREE.Scene) {
    this.beaconItem = new BeaconItem(scene);
    this.beaconActivation = new BeaconActivation();
  }

  /**
   * Initialize items for a new round
   */
  public initializeRound(buildings: { position: Vector3; width: number; depth: number }[]): void {
    this.beaconItem.placeItems(buildings);
  }

  /**
   * Update items (animations, etc.)
   */
  public update(deltaTime: number, players: Player[]): void {
    // Animate beacon items
    this.beaconItem.animate(deltaTime);

    // Update beacon activation
    this.beaconActivation.update();

    // Check for beacon collection
    for (const player of players) {
      const collectedBeacon = this.beaconItem.checkCollection(
        player.position,
        player.isOni
      );

      if (collectedBeacon) {
        this.collectBeacon(collectedBeacon, player.id);
      }
    }
  }

  /**
   * Collect a beacon item
   */
  private collectBeacon(beacon: BeaconItemData, playerId: string): void {
    const success = this.beaconItem.collectItem(beacon.id);

    if (success) {
      // Activate beacon immediately
      this.beaconActivation.activate(playerId);

      // Trigger callback
      if (this.onBeaconCollectedCallback) {
        this.onBeaconCollectedCallback(playerId);
      }
    }
  }

  /**
   * Set callback for when beacon is collected
   */
  public onBeaconCollected(callback: (playerId: string) => void): void {
    this.onBeaconCollectedCallback = callback;
  }

  /**
   * Get all beacon items
   */
  public getBeaconItems(): BeaconItemData[] {
    return this.beaconItem.getItems();
  }

  /**
   * Get placed beacon items
   */
  public getPlacedBeaconItems(): BeaconItemData[] {
    return this.beaconItem.getPlacedItems();
  }

  /**
   * Check if beacon is currently active
   */
  public isBeaconActive(): boolean {
    return this.beaconActivation.isBeaconActive();
  }

  /**
   * Get remaining beacon active time
   */
  public getBeaconRemainingTime(): number {
    return this.beaconActivation.getRemainingActiveTime();
  }

  /**
   * Get player who activated the beacon
   */
  public getBeaconActivatedBy(): string | null {
    return this.beaconActivation.getActivatedBy();
  }

  /**
   * Clear all items
   */
  public clear(): void {
    this.beaconItem.clearItems();
    this.beaconActivation.reset();
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    this.beaconItem.dispose();
    this.beaconActivation.reset();
  }
}
