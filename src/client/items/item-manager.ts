import * as THREE from 'three';
import { CloakItem, CloakItemData } from './cloak-item';
import { OniSpawnItem, OniSpawnItemData } from './oni-spawn-item';
import { Vector3, Player } from '../../shared/types/game';

/**
 * ItemManager manages all items in the game
 */
export class ItemManager {
  private cloakItem: CloakItem;
  private oniSpawnItem: OniSpawnItem;
  private onCloakCollectedCallback?: (playerId: string, itemId: string) => void;
  private onOniSpawnCollectedCallback?: (playerId: string, itemId: string) => void;

  constructor(scene: THREE.Scene) {
    this.cloakItem = new CloakItem(scene);
    this.oniSpawnItem = new OniSpawnItem(scene);
  }

  /**
   * Initialize items for a new round
   */
  public initializeRound(buildings: { position: Vector3; width: number; depth: number }[]): void {
    this.cloakItem.placeItems(buildings);
    this.oniSpawnItem.placeItems(buildings);
  }

  /**
   * Update items (animations, etc.)
   */
  public update(deltaTime: number, players: Player[]): void {
    // Animate items
    this.cloakItem.animate(deltaTime);
    this.oniSpawnItem.animate(deltaTime);

    // Check for item collection (local player only)
    const localPlayer = players.find(p => !p.isAI);
    if (localPlayer) {
      // Check cloak collection (runners only)
      const collectedCloak = this.cloakItem.checkCollection(
        localPlayer.position,
        localPlayer.isOni
      );

      if (collectedCloak) {
        this.collectCloak(collectedCloak, localPlayer.id);
      }

      // Check oni spawn collection (oni only)
      const collectedOniSpawn = this.oniSpawnItem.checkCollection(
        localPlayer.position,
        localPlayer.isOni
      );

      if (collectedOniSpawn) {
        this.collectOniSpawn(collectedOniSpawn, localPlayer.id);
      }
    }
  }

  /**
   * Collect a cloak item
   */
  private collectCloak(cloak: CloakItemData, playerId: string): void {
    const success = this.cloakItem.collectItem(cloak.id);

    if (success && this.onCloakCollectedCallback) {
      this.onCloakCollectedCallback(playerId, cloak.id);
    }
  }

  /**
   * Collect an oni spawn item
   */
  private collectOniSpawn(oniSpawn: OniSpawnItemData, playerId: string): void {
    const success = this.oniSpawnItem.collectItem(oniSpawn.id);

    if (success && this.onOniSpawnCollectedCallback) {
      this.onOniSpawnCollectedCallback(playerId, oniSpawn.id);
    }
  }

  /**
   * Set callback for when cloak is collected
   */
  public onCloakCollected(callback: (playerId: string, itemId: string) => void): void {
    this.onCloakCollectedCallback = callback;
  }

  /**
   * Set callback for when oni spawn is collected
   */
  public onOniSpawnCollected(callback: (playerId: string, itemId: string) => void): void {
    this.onOniSpawnCollectedCallback = callback;
  }

  /**
   * Get all cloak items
   */
  public getCloakItems(): CloakItemData[] {
    return this.cloakItem.getItems();
  }

  /**
   * Get placed cloak items
   */
  public getPlacedCloakItems(): CloakItemData[] {
    return this.cloakItem.getPlacedItems();
  }

  /**
   * Get all oni spawn items
   */
  public getOniSpawnItems(): OniSpawnItemData[] {
    return this.oniSpawnItem.getItems();
  }

  /**
   * Get placed oni spawn items
   */
  public getPlacedOniSpawnItems(): OniSpawnItemData[] {
    return this.oniSpawnItem.getPlacedItems();
  }

  /**
   * Sync item state from remote (for non-host players)
   */
  public syncItemState(itemId: string, itemType: 'cloak' | 'oni-spawn'): void {
    if (itemType === 'cloak') {
      this.cloakItem.collectItem(itemId);
    } else if (itemType === 'oni-spawn') {
      this.oniSpawnItem.collectItem(itemId);
    }
  }

  /**
   * Get all items state for synchronization
   */
  public getItemsState(): {
    cloaks: Array<{ id: string; position: Vector3; state: 'placed' | 'collected' }>;
    oniSpawns: Array<{ id: string; position: Vector3; state: 'placed' | 'collected' }>;
  } {
    return {
      cloaks: this.cloakItem.getItems().map(item => ({
        id: item.id,
        position: item.position,
        state: item.state,
      })),
      oniSpawns: this.oniSpawnItem.getItems().map(item => ({
        id: item.id,
        position: item.position,
        state: item.state,
      })),
    };
  }

  /**
   * Clear all items
   */
  public clear(): void {
    this.cloakItem.clearItems();
    this.oniSpawnItem.clearItems();
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    this.cloakItem.dispose();
    this.oniSpawnItem.dispose();
  }
}
