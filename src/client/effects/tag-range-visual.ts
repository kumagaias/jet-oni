import * as THREE from 'three';
import { TAG_DISTANCE } from '../../shared/constants';
import { Player } from '../../shared/types/game';

/**
 * TagRangeVisual displays the tagging range for ONI players
 */
export class TagRangeVisual {
  private scene: THREE.Scene;
  private rangeSpheres: Map<string, THREE.Mesh> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Update tag range visuals for all ONI players
   */
  public update(players: Player[]): void {
    // Remove old spheres
    for (const [playerId, sphere] of this.rangeSpheres) {
      const playerExists = players.some(p => p.id === playerId && p.isOni);
      if (!playerExists) {
        this.scene.remove(sphere);
        sphere.geometry.dispose();
        if (Array.isArray(sphere.material)) {
          sphere.material.forEach(m => m.dispose());
        } else {
          sphere.material.dispose();
        }
        this.rangeSpheres.delete(playerId);
      }
    }

    // Update or create spheres for ONI players
    for (const player of players) {
      if (!player.isOni) {
        // Remove sphere if player is no longer ONI
        const sphere = this.rangeSpheres.get(player.id);
        if (sphere) {
          this.scene.remove(sphere);
          sphere.geometry.dispose();
          if (Array.isArray(sphere.material)) {
            sphere.material.forEach(m => m.dispose());
          } else {
            sphere.material.dispose();
          }
          this.rangeSpheres.delete(player.id);
        }
        continue;
      }

      let sphere = this.rangeSpheres.get(player.id);
      
      if (!sphere) {
        // Create new sphere for this ONI
        sphere = this.createTagRangeSphere();
        this.scene.add(sphere);
        this.rangeSpheres.set(player.id, sphere);
      }

      // Update sphere position
      sphere.position.set(
        player.position.x,
        player.position.y + 1, // Center at player height
        player.position.z
      );
    }
  }

  /**
   * Create a semi-transparent red sphere for tag range
   */
  private createTagRangeSphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(TAG_DISTANCE, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000, // Red
      transparent: true,
      opacity: 0.15, // Very transparent
      side: THREE.DoubleSide,
      depthWrite: false, // Prevent z-fighting
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.renderOrder = 1; // Render after other objects
    
    return sphere;
  }

  /**
   * Clean up all visuals
   */
  public dispose(): void {
    for (const [, sphere] of this.rangeSpheres) {
      this.scene.remove(sphere);
      sphere.geometry.dispose();
      if (Array.isArray(sphere.material)) {
        sphere.material.forEach(m => m.dispose());
      } else {
        sphere.material.dispose();
      }
    }
    this.rangeSpheres.clear();
  }
}
