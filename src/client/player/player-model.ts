import * as THREE from 'three';

/**
 * PlayerModel creates a 3D model for players
 */
export class PlayerModel {
  private model: THREE.Group;
  private isOni: boolean;
  private nameTag: THREE.Sprite | null = null;
  private nameTagCanvas: HTMLCanvasElement | null = null;

  constructor(isOni: boolean = false) {
    this.isOni = isOni;
    this.model = this.createPlayerModel();
  }

  /**
   * Create a simple player model
   */
  private createPlayerModel(): THREE.Group {
    const playerGroup = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.isOni ? 0xff0000 : 0x00ff00,
      roughness: 0.7,
      metalness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75;
    body.castShadow = true;
    playerGroup.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdbac,
      roughness: 0.8,
      metalness: 0.2,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.75;
    head.castShadow = true;
    playerGroup.add(head);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: this.isOni ? 0xcc0000 : 0x00cc00,
      roughness: 0.7,
      metalness: 0.3,
    });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4, 1, 0);
    leftArm.castShadow = true;
    playerGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4, 1, 0);
    rightArm.castShadow = true;
    playerGroup.add(rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.8,
      metalness: 0.2,
    });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.4, 0);
    leftLeg.castShadow = true;
    playerGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.4, 0);
    rightLeg.castShadow = true;
    playerGroup.add(rightLeg);

    // Marker above head
    const markerGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: this.isOni ? 0xff0000 : 0x00ff00,
      transparent: true,
      opacity: 0.8,
      emissive: this.isOni ? 0xff0000 : 0x00ff00,
      emissiveIntensity: 0.5,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.y = 2.5;
    marker.rotation.x = Math.PI; // Point downward
    playerGroup.add(marker);

    return playerGroup;
  }

  /**
   * Create name tag sprite
   */
  private createNameTag(name: string): THREE.Sprite {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    // Set canvas size
    canvas.width = 512;
    canvas.height = 128;

    // Configure text style
    context.font = 'Bold 48px Arial';
    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Draw background
    const textWidth = context.measureText(name).width;
    const padding = 20;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = 60;
    const bgX = (canvas.width - bgWidth) / 2;
    const bgY = (canvas.height - bgHeight) / 2;

    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.fillRect(bgX, bgY, bgWidth, bgHeight);

    // Draw text
    context.fillStyle = 'white';
    context.fillText(name, canvas.width / 2, canvas.height / 2);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create sprite material
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    // Create sprite
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 0.5, 1); // Width, Height, Depth
    sprite.position.y = 3.2; // Above the marker

    // Store canvas reference for cleanup
    this.nameTagCanvas = canvas;

    return sprite;
  }

  /**
   * Set player name (creates name tag above head)
   */
  public setName(name: string): void {
    // Remove existing name tag if any
    if (this.nameTag) {
      this.model.remove(this.nameTag);
      if (this.nameTag.material.map) {
        this.nameTag.material.map.dispose();
      }
      this.nameTag.material.dispose();
      this.nameTag = null;
    }

    // Create new name tag
    this.nameTag = this.createNameTag(name);
    this.model.add(this.nameTag);
  }

  /**
   * Get the 3D model
   */
  public getModel(): THREE.Group {
    return this.model;
  }

  /**
   * Update player color based on ONI status
   */
  public setIsOni(isOni: boolean): void {
    if (this.isOni === isOni) return;
    
    this.isOni = isOni;
    const color = isOni ? 0xff0000 : 0x00ff00;
    const darkColor = isOni ? 0xcc0000 : 0x00cc00;

    // Update body color
    const body = this.model.children[0] as THREE.Mesh;
    (body.material as THREE.MeshStandardMaterial).color.setHex(color);

    // Update arm colors
    const leftArm = this.model.children[2] as THREE.Mesh;
    const rightArm = this.model.children[3] as THREE.Mesh;
    (leftArm.material as THREE.MeshStandardMaterial).color.setHex(darkColor);
    (rightArm.material as THREE.MeshStandardMaterial).color.setHex(darkColor);

    // Update marker
    const marker = this.model.children[6] as THREE.Mesh;
    const markerMat = marker.material as THREE.MeshStandardMaterial;
    markerMat.color.setHex(color);
    markerMat.emissive.setHex(color);
  }

  /**
   * Update position
   */
  public setPosition(x: number, y: number, z: number): void {
    this.model.position.set(x, y, z);
  }

  /**
   * Update rotation
   */
  public setRotation(yaw: number): void {
    this.model.rotation.y = yaw;
  }

  /**
   * Set player opacity (for cloak effect)
   */
  public setOpacity(opacity: number): void {
    this.model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material as THREE.MeshStandardMaterial;
        material.transparent = true;
        material.opacity = opacity;
      }
    });
    
    // Also update name tag opacity
    if (this.nameTag) {
      this.nameTag.material.opacity = opacity;
    }
  }

  /**
   * Dispose of the model
   */
  public dispose(): void {
    // Dispose name tag
    if (this.nameTag) {
      if (this.nameTag.material.map) {
        this.nameTag.material.map.dispose();
      }
      this.nameTag.material.dispose();
    }

    // Dispose model
    this.model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
  }
}
