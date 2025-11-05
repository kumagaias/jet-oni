import * as THREE from 'three';
import { Vector3 } from '../../shared/types/game';
import { MAP_SIZE } from '../../shared/constants';

/**
 * ONI spawn item state
 */
export enum OniSpawnItemState {
  PLACED = 'placed',
  COLLECTED = 'collected',
}

/**
 * ONI spawn item data
 */
export interface OniSpawnItemData {
  id: string;
  position: Vector3;
  state: OniSpawnItemState;
  mesh: THREE.Group;
}

/**
 * OniSpawnItem manages ONI spawn item placement and collection
 * When collected by ONI, spawns 2 AI ONI from the sky
 */
export class OniSpawnItem {
  private items: OniSpawnItemData[] = [];
  private scene: THREE.Scene;
  private itemCount = 2; // 2 ONI spawn items per map
  private collectionRadius = 3; // units (increased for easier collection)

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Place ONI spawn items on the map
   */
  public placeItems(buildings: { position: Vector3; width: number; depth: number }[]): void {
    this.clearItems();

    const placedPositions: Vector3[] = [];

    for (let i = 0; i < this.itemCount; i++) {
      let position: Vector3 | null = null;
      let attempts = 0;
      const maxAttempts = 100;

      // Try to find a valid position
      while (!position && attempts < maxAttempts) {
        const candidate = this.generateRandomPosition();

        // Check if position is far enough from other items
        if (this.isPositionValid(candidate, placedPositions, buildings)) {
          position = candidate;
        }

        attempts++;
      }

      if (position) {
        const item = this.createOniSpawnItem(position, i);
        this.items.push(item);
        placedPositions.push(position);
      }
    }
  }

  /**
   * Place ONI spawn items at specific positions (for syncing from host)
   */
  public placeItemsAtPositions(itemsData: Array<{ id: string; position: Vector3; state: OniSpawnItemState }>): void {
    this.clearItems();

    for (let i = 0; i < itemsData.length; i++) {
      const data = itemsData[i];
      const item = this.createOniSpawnItemWithId(data.position, data.id);
      item.state = data.state;
      
      // If already collected, remove from scene
      if (data.state === OniSpawnItemState.COLLECTED) {
        this.scene.remove(item.mesh);
      }
      
      this.items.push(item);
    }
  }

  /**
   * Generate a random position on the map
   */
  private generateRandomPosition(): Vector3 {
    const x = (Math.random() - 0.5) * MAP_SIZE * 2;
    const z = (Math.random() - 0.5) * MAP_SIZE * 2;
    return { x, y: 2, z }; // 2 units above ground (more visible)
  }

  /**
   * Check if position is valid (not too close to buildings or other items)
   */
  private isPositionValid(
    position: Vector3,
    existingItems: Vector3[],
    buildings: { position: Vector3; width: number; depth: number }[]
  ): boolean {
    const minDistanceBetweenItems = 50; // units
    const minDistanceFromBuilding = 10; // units

    // Check distance from other items
    for (const item of existingItems) {
      const dx = position.x - item.x;
      const dz = position.z - item.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < minDistanceBetweenItems) {
        return false;
      }
    }

    // Check distance from buildings
    for (const building of buildings) {
      const dx = Math.abs(position.x - building.position.x);
      const dz = Math.abs(position.z - building.position.z);

      // Check if too close to building
      if (
        dx < building.width / 2 + minDistanceFromBuilding &&
        dz < building.depth / 2 + minDistanceFromBuilding
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create an ONI spawn item mesh with custom ID (for syncing)
   */
  private createOniSpawnItemWithId(position: Vector3, id: string): OniSpawnItemData {
    const group = new THREE.Group();

    // Create multiple rotating rings
    const ringCount = 3;
    const ringRadius = 1.5;

    for (let i = 0; i < ringCount; i++) {
      const geometry = new THREE.TorusGeometry(
        ringRadius - i * 0.3,
        0.1,
        16,
        32
      );

      const material = new THREE.MeshStandardMaterial({
        color: 0xff0000, // Red color (ONI color)
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
      });

      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = Math.PI / 2; // Lay flat
      ring.position.y = i * 0.2; // Stack rings
      group.add(ring);
    }

    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(ringRadius * 1.2, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000, // Red glow
      transparent: true,
      opacity: 0.2,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    group.position.set(position.x, position.y, position.z);
    this.scene.add(group);

    return {
      id,
      position: { ...position },
      state: OniSpawnItemState.PLACED,
      mesh: group,
    };
  }

  /**
   * Create an ONI spawn item mesh
   */
  private createOniSpawnItem(position: Vector3, index: number): OniSpawnItemData {
    const id = `oni-spawn-${Date.now()}-${index}`;
    return this.createOniSpawnItemWithId(position, id);
  }



  /**
   * Check if player can collect ONI spawn item (oni only, within radius)
   */
  public checkCollection(
    playerPosition: Vector3,
    isOni: boolean
  ): OniSpawnItemData | null {
    // Only oni can collect ONI spawn items
    if (!isOni) {
      return null;
    }

    for (const item of this.items) {
      if (item.state !== OniSpawnItemState.PLACED) {
        continue;
      }

      const dx = playerPosition.x - item.position.x;
      const dz = playerPosition.z - item.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance <= this.collectionRadius) {
        return item;
      }
    }

    return null;
  }

  /**
   * Collect an ONI spawn item
   */
  public collectItem(itemId: string): boolean {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || item.state !== OniSpawnItemState.PLACED) {
      return false;
    }

    item.state = OniSpawnItemState.COLLECTED;
    this.scene.remove(item.mesh);

    // Dispose geometry and materials
    item.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    return true;
  }

  /**
   * Animate ONI spawn items
   */
  public animate(deltaTime: number): void {
    const rotationSpeed = 2; // radians per second

    for (const item of this.items) {
      if (item.state !== OniSpawnItemState.PLACED) {
        continue;
      }

      // Rotate rings
      item.mesh.rotation.y += rotationSpeed * deltaTime;

      // Pulse glow
      const time = Date.now() * 0.001;
      const pulse = Math.sin(time * 2) * 0.1 + 0.2;
      const glow = item.mesh.children[item.mesh.children.length - 1];
      if (glow instanceof THREE.Mesh) {
        const material = glow.material as THREE.MeshBasicMaterial;
        material.opacity = pulse;
      }

      // Bob up and down
      const bobAmount = 0.2;
      const bobSpeed = 2;
      item.mesh.position.y = item.position.y + Math.sin(time * bobSpeed) * bobAmount;
    }
  }

  /**
   * Get all ONI spawn items
   */
  public getItems(): OniSpawnItemData[] {
    return this.items;
  }

  /**
   * Get placed ONI spawn items
   */
  public getPlacedItems(): OniSpawnItemData[] {
    return this.items.filter((item) => item.state === OniSpawnItemState.PLACED);
  }

  /**
   * Clear all ONI spawn items
   */
  public clearItems(): void {
    for (const item of this.items) {
      this.scene.remove(item.mesh);
      item.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    this.items = [];
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    this.clearItems();
  }
}
