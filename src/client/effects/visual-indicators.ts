import * as THREE from 'three';
import { Player } from '../../shared/types/game';
import {
  MARKER_OPACITY_MOVING,
  MARKER_OPACITY_STATIONARY,
  MARKER_ROTATION_SPEED,
} from '../../shared/constants';

/**
 * VisualIndicators manages player markers and spot indicators
 */
export class VisualIndicators {
  private markers: Map<string, THREE.Group> = new Map();
  private spotIndicators: Map<string, THREE.Group> = new Map();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Update player markers for all players
   */
  public updateMarkers(players: Player[], localPlayerId: string): void {
    // Remove markers for players that no longer exist
    const playerIds = new Set(players.map((p) => p.id));
    for (const [id, marker] of this.markers.entries()) {
      if (!playerIds.has(id)) {
        this.removeMarker(id);
      }
    }

    // Update or create markers for each player
    for (const player of players) {
      // Skip local player (don't show marker on yourself)
      if (player.id === localPlayerId) continue;

      // Get or create marker
      let marker = this.markers.get(player.id);
      if (!marker) {
        marker = this.createMarker(player);
        this.markers.set(player.id, marker);
      }

      // Update marker position
      marker.position.set(
        player.position.x,
        player.position.y + 2.5, // Above player head
        player.position.z
      );

      // Update marker color based on role
      const color = player.isOni ? 0xff0000 : 0x00ff00; // Red for ONI, green for runner
      const cone = marker.children[0] as THREE.Mesh;
      const material = cone.material as THREE.MeshBasicMaterial;
      material.color.setHex(color);

      // Update opacity based on movement
      const isMoving =
        Math.abs(player.velocity.x) > 0.1 ||
        Math.abs(player.velocity.z) > 0.1;
      const targetOpacity = isMoving
        ? MARKER_OPACITY_MOVING
        : MARKER_OPACITY_STATIONARY;
      material.opacity = targetOpacity;
    }
  }

  /**
   * Create a cone marker for a player
   */
  private createMarker(player: Player): THREE.Group {
    const markerGroup = new THREE.Group();

    // Create cone geometry (pointing down)
    const coneHeight = 1.5;
    const coneRadius = 0.5;
    const coneGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, 16);

    // Material with transparency
    const color = player.isOni ? 0xff0000 : 0x00ff00;
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: MARKER_OPACITY_MOVING,
    });

    const cone = new THREE.Mesh(coneGeometry, material);
    cone.rotation.x = Math.PI; // Flip cone to point down
    cone.position.y = -coneHeight / 2; // Position cone tip at group origin
    markerGroup.add(cone);

    // Add to scene
    this.scene.add(markerGroup);

    return markerGroup;
  }

  /**
   * Remove a marker
   */
  private removeMarker(playerId: string): void {
    const marker = this.markers.get(playerId);
    if (!marker) return;

    // Remove from scene
    this.scene.remove(marker);

    // Dispose geometries and materials
    marker.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    this.markers.delete(playerId);
  }

  /**
   * Update spot indicators for runners near ONI
   */
  public updateSpotIndicators(
    players: Player[],
    localPlayerId: string,
    spotDistance: number = 50
  ): void {
    const localPlayer = players.find((p) => p.id === localPlayerId);
    if (!localPlayer || localPlayer.isOni) {
      // Clear all spot indicators if local player is ONI or not found
      this.clearSpotIndicators();
      return;
    }

    // Find nearest ONI player
    let nearestOni: Player | null = null;
    let nearestDistance = Infinity;

    for (const player of players) {
      if (!player.isOni) continue;

      const dx = player.position.x - localPlayer.position.x;
      const dy = player.position.y - localPlayer.position.y;
      const dz = player.position.z - localPlayer.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestOni = player;
      }
    }

    // Show spot indicator if ONI is within range
    if (nearestOni && nearestDistance <= spotDistance) {
      if (!this.spotIndicators.has(localPlayerId)) {
        const indicator = this.createSpotIndicator();
        this.spotIndicators.set(localPlayerId, indicator);
      }
    } else {
      // Remove spot indicator if no ONI nearby
      this.removeSpotIndicator(localPlayerId);
    }
  }

  /**
   * Create a spot indicator
   */
  private createSpotIndicator(): THREE.Group {
    const indicatorGroup = new THREE.Group();

    // Create text sprite (simplified - using a plane with text texture)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#ff0000';
      context.font = 'bold 48px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('SPOTTED!', 128, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 2, 1);
    sprite.position.y = 3; // Above player

    indicatorGroup.add(sprite);

    // Add to scene
    this.scene.add(indicatorGroup);

    return indicatorGroup;
  }

  /**
   * Remove a spot indicator
   */
  private removeSpotIndicator(playerId: string): void {
    const indicator = this.spotIndicators.get(playerId);
    if (!indicator) return;

    // Remove from scene
    this.scene.remove(indicator);

    // Dispose resources
    indicator.traverse((child) => {
      if (child instanceof THREE.Sprite) {
        const material = child.material as THREE.SpriteMaterial;
        if (material.map) {
          material.map.dispose();
        }
        material.dispose();
      }
    });

    this.spotIndicators.delete(playerId);
  }

  /**
   * Clear all spot indicators
   */
  private clearSpotIndicators(): void {
    for (const playerId of this.spotIndicators.keys()) {
      this.removeSpotIndicator(playerId);
    }
  }

  /**
   * Animate markers and indicators
   */
  public animate(deltaTime: number): void {
    // Rotate markers
    for (const marker of this.markers.values()) {
      marker.rotation.y += MARKER_ROTATION_SPEED * deltaTime;
    }

    // Pulse spot indicators
    const time = Date.now() * 0.001;
    const pulseSpeed = 3;
    const pulseAmount = 0.3;
    const pulse = Math.sin(time * pulseSpeed) * pulseAmount + 0.7;

    for (const indicator of this.spotIndicators.values()) {
      const sprite = indicator.children[0] as THREE.Sprite;
      const material = sprite.material as THREE.SpriteMaterial;
      material.opacity = pulse;
    }
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    // Remove all markers
    for (const playerId of this.markers.keys()) {
      this.removeMarker(playerId);
    }

    // Remove all spot indicators
    this.clearSpotIndicators();
  }
}
