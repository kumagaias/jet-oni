import * as THREE from 'three';
import { Vector3 } from '../../shared/types/game';
import { MAP_SIZE } from '../../shared/constants';

/**
 * Beacon item state
 */
export enum BeaconItemState {
  PLACED = 'placed',
  COLLECTED = 'collected',
}

/**
 * Beacon item data
 */
export interface BeaconItemData {
  id: string;
  position: Vector3;
  state: BeaconItemState;
  mesh: THREE.Group;
}

/**
 * BeaconItem manages beacon item placement and collection
 */
export class BeaconItem {
  private items: BeaconItemData[] = [];
  private scene: THREE.Scene;
  private itemCount = 2; // 2 beacons per map
  private collectionRadius = 2; // units

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Place beacon items on the map
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
        const item = this.createBeaconItem(position, i);
        this.items.push(item);
        placedPositions.push(position);
      }
    }
  }

  /**
   * Generate a random position on the map
   */
  private generateRandomPosition(): Vector3 {
    const x = (Math.random() - 0.5) * MAP_SIZE * 2;
    const z = (Math.random() - 0.5) * MAP_SIZE * 2;
    return { x, y: 1, z }; // 1 unit above ground
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
   * Create a beacon item mesh
   */
  private createBeaconItem(position: Vector3, index: number): BeaconItemData {
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
        color: 0x00ffff, // Cyan color
        emissive: 0x00ffff,
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
      color: 0x00ffff,
      transparent: true,
      opacity: 0.2,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    group.position.set(position.x, position.y, position.z);
    this.scene.add(group);

    return {
      id: `beacon-${Date.now()}-${index}`,
      position: { ...position },
      state: BeaconItemState.PLACED,
      mesh: group,
    };
  }

  /**
   * Check if player can collect beacon (oni only, within radius)
   */
  public checkCollection(
    playerPosition: Vector3,
    isOni: boolean
  ): BeaconItemData | null {
    // Only oni can collect beacons
    if (!isOni) {
      return null;
    }

    for (const item of this.items) {
      if (item.state !== BeaconItemState.PLACED) {
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
   * Collect a beacon item
   */
  public collectItem(itemId: string): boolean {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || item.state !== BeaconItemState.PLACED) {
      return false;
    }

    item.state = BeaconItemState.COLLECTED;
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
   * Animate beacon items
   */
  public animate(deltaTime: number): void {
    const rotationSpeed = 2; // radians per second

    for (const item of this.items) {
      if (item.state !== BeaconItemState.PLACED) {
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
   * Get all beacon items
   */
  public getItems(): BeaconItemData[] {
    return this.items;
  }

  /**
   * Get placed beacon items
   */
  public getPlacedItems(): BeaconItemData[] {
    return this.items.filter((item) => item.state === BeaconItemState.PLACED);
  }

  /**
   * Clear all beacon items
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
