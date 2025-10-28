import * as THREE from 'three';
import { Player } from '../../shared/types/game';

/**
 * BeaconVisual creates visual indicators for beacon ability
 */
export class BeaconVisual {
  private beams: Map<string, THREE.Group> = new Map();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Update beacon visuals for all players
   */
  public update(players: Player[], isBeaconActive: boolean, localPlayerId: string): void {
    // Remove all existing beams
    this.clearBeams();

    // If beacon is not active, don't show anything
    if (!isBeaconActive) return;

    // Show beams for all runners (not ONI)
    for (const player of players) {
      // Skip ONI players
      if (player.isOni) continue;
      
      // Skip local player (don't show beam on yourself)
      if (player.id === localPlayerId) continue;

      // Create beam for this player
      this.createBeam(player);
    }
  }

  /**
   * Create a beacon beam for a player
   */
  private createBeam(player: Player): void {
    const beamGroup = new THREE.Group();

    // Create vertical beam (cylinder)
    const beamHeight = 50;
    const beamRadius = 0.3;
    const beamGeometry = new THREE.CylinderGeometry(
      beamRadius,
      beamRadius,
      beamHeight,
      16
    );

    // Green glowing material
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6,
    });

    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.y = beamHeight / 2; // Position beam above player
    beamGroup.add(beam);

    // Add glow effect (larger, more transparent cylinder)
    const glowGeometry = new THREE.CylinderGeometry(
      beamRadius * 2,
      beamRadius * 2,
      beamHeight,
      16
    );
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = beamHeight / 2;
    beamGroup.add(glow);

    // Add pulsing light at player position
    const light = new THREE.PointLight(0x00ff00, 2, 20);
    light.position.y = 2;
    beamGroup.add(light);

    // Position beam group at player position
    beamGroup.position.set(
      player.position.x,
      player.position.y,
      player.position.z
    );

    // Add to scene
    this.scene.add(beamGroup);
    this.beams.set(player.id, beamGroup);
  }

  /**
   * Animate beams (pulse effect)
   */
  public animate(deltaTime: number): void {
    const time = Date.now() * 0.001; // Convert to seconds

    for (const beamGroup of this.beams.values()) {
      // Pulse opacity
      const pulseSpeed = 2;
      const pulseAmount = 0.3;
      const pulse = Math.sin(time * pulseSpeed) * pulseAmount + 0.7;

      // Update beam opacity
      const beam = beamGroup.children[0] as THREE.Mesh;
      const beamMaterial = beam.material as THREE.MeshBasicMaterial;
      beamMaterial.opacity = pulse * 0.6;

      // Update glow opacity
      const glow = beamGroup.children[1] as THREE.Mesh;
      const glowMaterial = glow.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = pulse * 0.2;

      // Update light intensity
      const light = beamGroup.children[2] as THREE.PointLight;
      light.intensity = pulse * 2;

      // Rotate beam slightly
      beamGroup.rotation.y += deltaTime * 0.5;
    }
  }

  /**
   * Clear all beams
   */
  private clearBeams(): void {
    for (const beamGroup of this.beams.values()) {
      // Remove from scene
      this.scene.remove(beamGroup);

      // Dispose geometries and materials
      beamGroup.traverse((child) => {
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

    this.beams.clear();
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    this.clearBeams();
  }
}
