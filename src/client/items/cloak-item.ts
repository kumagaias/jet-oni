import * as THREE from 'three';
import { Vector3 } from '../../shared/types/game';
import { MAP_SIZE } from '../../shared/constants';

/**
 * Cloak item state
 */
export enum CloakItemState {
  PLACED = 'placed',
  COLLECTED = 'collected',
}

/**
 * Cloak item data
 */
export interface CloakItemData {
  id: string;
  position: Vector3;
  state: CloakItemState;
  mesh: THREE.Group;
}

/**
 * CloakItem manages invisibility cloak item placement and collection
 */
export class CloakItem {
  private items: CloakItemData[] = [];
  private scene: THREE.Scene;
  private itemCount = 2; // 2 cloaks per map
  private collectionRadius = 2; // units

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Place cloak items on the map
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
        const item = this.createCloakItem(position, i);
        this.items.push(item);
        placedPositions.push(position);
      }
    }
  }

  /**
   * Place cloak items at specific positions (for syncing from host)
   */
  public placeItemsAtPositions(itemsData: Array<{ id: string; position: Vector3; state: CloakItemState }>): void {
    this.clearItems();

    for (let i = 0; i < itemsData.length; i++) {
      const data = itemsData[i];
      const item = this.createCloakItemWithId(data.position, data.id);
      item.state = data.state;
      
      // If already collected, remove from scene
      if (data.state === CloakItemState.COLLECTED) {
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
   * Create a cloak item mesh with custom ID (for syncing)
   */
  private createCloakItemWithId(position: Vector3, id: string): CloakItemData {
    const group = new THREE.Group();

    // Create floating cloak shape (like a ghost)
    const cloakGeometry = new THREE.SphereGeometry(1, 16, 16);
    const cloakMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00, // Green (same as player)
      emissive: 0x00ff00,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.05, // Almost invisible - extremely faint
      metalness: 0.1,
      roughness: 0.8,
    });

    const cloak = new THREE.Mesh(cloakGeometry, cloakMaterial);
    group.add(cloak);

    // Add sparkle particles around it
    const particleCount = 20;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 1.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle * 2) * 0.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00ff00, // Green particles
      size: 0.1,
      transparent: true,
      opacity: 0.8,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    group.add(particles);

    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Green glow
      transparent: true,
      opacity: 0.15,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    group.position.set(position.x, position.y, position.z);
    this.scene.add(group);

    return {
      id,
      position: { ...position },
      state: CloakItemState.PLACED,
      mesh: group,
    };
  }

  /**
   * Create a cloak item mesh (ghostly appearance)
   */
  private createCloakItem(position: Vector3, index: number): CloakItemData {
    const id = `cloak-${Date.now()}-${index}`;
    return this.createCloakItemWithId(position, id);
  }



  /**
   * Check if player can collect cloak (runner only, within radius)
   */
  public checkCollection(
    playerPosition: Vector3,
    isOni: boolean
  ): CloakItemData | null {
    // Only runners can collect cloaks
    if (isOni) {
      return null;
    }

    for (const item of this.items) {
      if (item.state !== CloakItemState.PLACED) {
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
   * Collect a cloak item
   */
  public collectItem(itemId: string): boolean {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || item.state !== CloakItemState.PLACED) {
      return false;
    }

    item.state = CloakItemState.COLLECTED;
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
      if (child instanceof THREE.Points) {
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
   * Animate cloak items
   */
  public animate(deltaTime: number): void {
    const rotationSpeed = 1; // radians per second

    for (const item of this.items) {
      if (item.state !== CloakItemState.PLACED) {
        continue;
      }

      // Rotate cloak
      item.mesh.rotation.y += rotationSpeed * deltaTime;

      // Pulse glow (extremely subtle)
      const time = Date.now() * 0.001;
      const pulse = Math.sin(time * 3) * 0.02 + 0.05; // Range: 0.03 to 0.07
      
      // Update cloak opacity
      const cloak = item.mesh.children[0];
      if (cloak instanceof THREE.Mesh) {
        const material = cloak.material as THREE.MeshStandardMaterial;
        material.opacity = pulse;
      }

      // Update glow opacity (barely visible)
      const glow = item.mesh.children[2];
      if (glow instanceof THREE.Mesh) {
        const material = glow.material as THREE.MeshBasicMaterial;
        material.opacity = pulse * 0.2; // Range: 0.006 to 0.014
      }

      // Bob up and down
      const bobAmount = 0.3;
      const bobSpeed = 1.5;
      item.mesh.position.y = item.position.y + Math.sin(time * bobSpeed) * bobAmount;

      // Rotate particles
      const particles = item.mesh.children[1];
      if (particles instanceof THREE.Points) {
        particles.rotation.y += rotationSpeed * 0.5 * deltaTime;
      }
    }
  }

  /**
   * Get all cloak items
   */
  public getItems(): CloakItemData[] {
    return this.items;
  }

  /**
   * Get placed cloak items
   */
  public getPlacedItems(): CloakItemData[] {
    return this.items.filter((item) => item.state === CloakItemState.PLACED);
  }

  /**
   * Clear all cloak items
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
        if (child instanceof THREE.Points) {
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
