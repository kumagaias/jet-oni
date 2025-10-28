import * as THREE from 'three';

/**
 * Visual indicators for players in the game
 * Shows cone markers above players with different colors for oni and runners
 */
export class VisualIndicators {
  private markers: Map<string, THREE.Mesh> = new Map();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Create or update a player marker
   * @param playerId - Unique player identifier
   * @param position - Player position
   * @param isOni - Whether player is oni (red) or runner (green)
   * @param isMoving - Whether player is moving (affects opacity)
   */
  public updateMarker(
    playerId: string,
    position: THREE.Vector3,
    isOni: boolean,
    isMoving: boolean
  ): void {
    let marker = this.markers.get(playerId);

    if (!marker) {
      marker = this.createMarker(isOni);
      this.markers.set(playerId, marker);
      this.scene.add(marker);
    }

    // Update marker position (above player)
    marker.position.copy(position);
    marker.position.y += 3; // 3 units above player

    // Update marker color based on oni status
    const material = marker.material as THREE.MeshBasicMaterial;
    material.color.setHex(isOni ? 0xff0000 : 0x00ff00);

    // Update opacity based on movement
    material.opacity = isMoving ? 0.9 : 0.5;

    // Rotate marker for visual effect
    marker.rotation.y += 0.02;
  }

  /**
   * Create a cone-shaped marker
   */
  private createMarker(isOni: boolean): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
    const material = new THREE.MeshBasicMaterial({
      color: isOni ? 0xff0000 : 0x00ff00,
      transparent: true,
      opacity: 0.9,
    });

    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = Math.PI; // Point cone downward
    return marker;
  }

  /**
   * Remove a player marker
   */
  public removeMarker(playerId: string): void {
    const marker = this.markers.get(playerId);
    if (marker) {
      this.scene.remove(marker);
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
      this.markers.delete(playerId);
    }
  }

  /**
   * Remove all markers
   */
  public clear(): void {
    this.markers.forEach((marker) => {
      this.scene.remove(marker);
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
    });
    this.markers.clear();
  }

  /**
   * Update all markers (called each frame)
   */
  public update(): void {
    // Markers are updated individually via updateMarker
    // This method can be used for global marker updates if needed
  }

  /**
   * Show "spotted" indicator above a player
   * @param playerId - Player who was spotted
   * @param position - Player position
   * @param duration - How long to show the indicator (in seconds)
   */
  public showSpottedIndicator(
    playerId: string,
    position: THREE.Vector3,
    duration: number = 2
  ): void {
    // Create spotted text sprite
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = 256;
    canvas.height = 128;

    // Draw text
    context.fillStyle = '#ff0000';
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('SPOTTED!', 128, 64);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.position.y += 4; // Above player marker
    sprite.scale.set(2, 1, 1);

    this.scene.add(sprite);

    // Animate and remove after duration
    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = elapsed / duration;

      if (progress >= 1) {
        this.scene.remove(sprite);
        material.dispose();
        texture.dispose();
        return;
      }

      // Pulse animation
      const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.2;
      sprite.scale.set(2 * scale, 1 * scale, 1);

      // Fade out
      material.opacity = 1 - progress;

      requestAnimationFrame(animate);
    };

    animate();
  }
}
