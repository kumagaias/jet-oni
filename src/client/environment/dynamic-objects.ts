import * as THREE from 'three';
import { MAP_SIZE } from '../../shared/constants';

/**
 * Car configuration
 */
interface CarConfig {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  color: number;
}

/**
 * Pedestrian configuration
 */
interface PedestrianConfig {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  animationPhase: number;
}



/**
 * DynamicObjects manages animated objects in the city (cars, pedestrians, ladders)
 */
export class DynamicObjects {
  private cars: THREE.Group;
  private pedestrians: THREE.Group;
  private ladders: THREE.Group;
  private carConfigs: CarConfig[] = [];
  private pedestrianConfigs: PedestrianConfig[] = [];
  private buildings: THREE.Group | null = null;

  constructor() {
    this.cars = new THREE.Group();
    this.pedestrians = new THREE.Group();
    this.ladders = new THREE.Group();
  }

  /**
   * Initialize all dynamic objects
   */
  public initialize(buildings?: THREE.Group): THREE.Group {
    const dynamicGroup = new THREE.Group();

    this.buildings = buildings || null;

    this.generateCars();
    dynamicGroup.add(this.cars);

    this.generatePedestrians();
    dynamicGroup.add(this.pedestrians);

    this.generateLadders();
    dynamicGroup.add(this.ladders);

    return dynamicGroup;
  }

  /**
   * Generate cars on roads
   */
  private generateCars(): void {
    const carCount = 20;
    const roadPositions = [-120, -60, 0, 60, 120]; // Road z positions

    for (let i = 0; i < carCount; i++) {
      const isHorizontal = Math.random() > 0.5;
      const roadIndex = Math.floor(Math.random() * roadPositions.length);
      const roadPos = roadPositions[roadIndex];

      let position: THREE.Vector3;
      let direction: THREE.Vector3;

      if (isHorizontal) {
        // Moving along x-axis
        position = new THREE.Vector3(
          (Math.random() - 0.5) * MAP_SIZE * 1.8,
          0.5,
          roadPos
        );
        direction = new THREE.Vector3(Math.random() > 0.5 ? 1 : -1, 0, 0);
      } else {
        // Moving along z-axis
        position = new THREE.Vector3(
          roadPos,
          0.5,
          (Math.random() - 0.5) * MAP_SIZE * 1.8
        );
        direction = new THREE.Vector3(0, 0, Math.random() > 0.5 ? 1 : -1);
      }

      const speed = 5 + Math.random() * 5; // 5-10 units per second
      const color = this.getRandomCarColor();

      const car = this.createCar(color);
      car.position.copy(position);

      // Rotate car to face direction
      // Car body is BoxGeometry(2, 1, 4) where X=width, Z=depth
      // Z-axis is forward (depth=4, the long side) - this matches our front light position
      // Front light is at position.z = 2.15 (positive Z)
      // So we align the car's +Z axis with the movement direction
      const angle = Math.atan2(direction.x, direction.z);
      car.rotation.y = angle;

      this.cars.add(car);
      this.carConfigs.push({ position, direction, speed, color });
    }
  }

  /**
   * Create a car mesh
   */
  private createCar(color: number): THREE.Group {
    const carGroup = new THREE.Group();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.7,
    });

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    carGroup.add(body);

    // Car roof
    const roofGeometry = new THREE.BoxGeometry(1.8, 0.6, 2);
    const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
    roof.position.y = 1.3;
    roof.castShadow = true;
    carGroup.add(roof);

    // Windows
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.9,
    });

    const windowGeometry = new THREE.BoxGeometry(1.7, 0.5, 1.9);
    const window = new THREE.Mesh(windowGeometry, windowMaterial);
    window.position.y = 1.3;
    carGroup.add(window);

    // Add front indicator (yellow at front)
    const frontIndicatorGeometry = new THREE.BoxGeometry(1.8, 0.6, 0.3);
    const frontIndicatorMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00 // Bright yellow
    });
    const frontIndicator = new THREE.Mesh(frontIndicatorGeometry, frontIndicatorMaterial);
    frontIndicator.position.set(0, 0.7, 2.15); // At front of car (positive Z in local space)
    carGroup.add(frontIndicator);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.1,
    });

    const wheelPositions = [
      { x: -0.8, z: 1.2 },
      { x: 0.8, z: 1.2 },
      { x: -0.8, z: -1.2 },
      { x: 0.8, z: -1.2 },
    ];

    for (const pos of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, 0.3, pos.z);
      wheel.castShadow = true;
      carGroup.add(wheel);
    }

    return carGroup;
  }

  /**
   * Generate pedestrians
   */
  private generatePedestrians(): void {
    const pedestrianCount = 30;

    for (let i = 0; i < pedestrianCount; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * MAP_SIZE * 1.8,
        0.9,
        (Math.random() - 0.5) * MAP_SIZE * 1.8
      );

      // Random walking direction
      const angle = Math.random() * Math.PI * 2;
      const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));

      const speed = 1 + Math.random() * 1; // 1-2 units per second
      const animationPhase = Math.random() * Math.PI * 2;

      const pedestrian = this.createPedestrian();
      pedestrian.position.copy(position);
      pedestrian.rotation.y = angle;

      this.pedestrians.add(pedestrian);
      this.pedestrianConfigs.push({ position, direction, speed, animationPhase });
    }
  }

  /**
   * Create a pedestrian mesh
   */
  private createPedestrian(): THREE.Group {
    const pedestrianGroup = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.getRandomPedestrianColor(),
      roughness: 0.8,
      metalness: 0.2,
    });

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    pedestrianGroup.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdbac, // Skin tone
      roughness: 0.7,
      metalness: 0.1,
    });

    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.15;
    head.castShadow = true;
    pedestrianGroup.add(head);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdbac,
      roughness: 0.7,
      metalness: 0.1,
    });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.25, 0.75, 0);
    leftArm.castShadow = true;
    pedestrianGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.25, 0.75, 0);
    rightArm.castShadow = true;
    pedestrianGroup.add(rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50, // Dark pants
      roughness: 0.8,
      metalness: 0.2,
    });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.1, 0.25, 0);
    leftLeg.castShadow = true;
    pedestrianGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.1, 0.25, 0);
    rightLeg.castShadow = true;
    pedestrianGroup.add(rightLeg);

    return pedestrianGroup;
  }

  /**
   * Generate ladders on buildings
   */
  private generateLadders(): void {
    if (!this.buildings) {
      console.warn('No buildings provided, skipping ladder generation');
      return;
    }

    interface BuildingInfo {
      mesh: THREE.Mesh;
      group: THREE.Group;
      params: { width: number; height: number; depth: number };
    }

    const buildingInfos: BuildingInfo[] = [];

    // Collect all building groups and their main mesh
    this.buildings.traverse((object) => {
      // Look for Groups that contain building meshes
      if (object instanceof THREE.Group && object.children.length > 0) {
        // Find the main building mesh (first BoxGeometry mesh)
        const mainMesh = object.children.find(
          (child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry
        ) as THREE.Mesh | undefined;

        if (mainMesh && mainMesh.geometry instanceof THREE.BoxGeometry) {
          const params = mainMesh.geometry.parameters;
          // Only attach ladders to tall buildings (height > 10)
          if (params.height > 10) {
            buildingInfos.push({
              mesh: mainMesh,
              group: object,
              params: params,
            });
          }
        }
      }
    });

    if (buildingInfos.length === 0) {
      console.warn('No suitable buildings found for ladders');
      return;
    }

    // Attach ladders to 20% of buildings (one ladder per building)
    for (const buildingInfo of buildingInfos) {
      // 20% chance to add a ladder to this building
      if (Math.random() > 0.2) {
        continue;
      }

      const params = buildingInfo.params;
      const group = buildingInfo.group;

      // Choose a random corner (0=front-left, 1=front-right, 2=back-left, 3=back-right)
      // Placing ladders at corners avoids overlap with windows
      const corner = Math.floor(Math.random() * 4);
      let offsetX = 0;
      let offsetZ = 0;
      let rotation = 0;

      switch (corner) {
        case 0: // Front-left corner (facing +Z, left side)
          offsetX = -params.width / 2 + 1; // Near left edge
          offsetZ = params.depth / 2 + 0.3; // Outside the front wall
          rotation = 0;
          break;
        case 1: // Front-right corner (facing +Z, right side)
          offsetX = params.width / 2 - 1; // Near right edge
          offsetZ = params.depth / 2 + 0.3; // Outside the front wall
          rotation = 0;
          break;
        case 2: // Back-left corner (facing -Z, left side)
          offsetX = -params.width / 2 + 1; // Near left edge
          offsetZ = -params.depth / 2 - 0.3; // Outside the back wall
          rotation = Math.PI;
          break;
        case 3: // Back-right corner (facing -Z, right side)
          offsetX = params.width / 2 - 1; // Near right edge
          offsetZ = -params.depth / 2 - 0.3; // Outside the back wall
          rotation = Math.PI;
          break;
      }

      const ladder = this.createLadder(params.height);
      ladder.position.set(
        group.position.x + offsetX,
        0,
        group.position.z + offsetZ
      );

      // Rotate ladder 90 degrees to face the wall
      ladder.rotation.y = rotation;

      this.ladders.add(ladder);
    }
  }

  /**
   * Create a ladder mesh
   */
  private createLadder(height: number): THREE.Group {
    const ladderGroup = new THREE.Group();

    const material = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      roughness: 0.9,
      metalness: 0.1,
    });

    // Side rails
    const railGeometry = new THREE.CylinderGeometry(0.05, 0.05, height, 8);

    const leftRail = new THREE.Mesh(railGeometry, material);
    leftRail.position.set(-0.2, height / 2, 0);
    leftRail.castShadow = true;
    ladderGroup.add(leftRail);

    const rightRail = new THREE.Mesh(railGeometry, material);
    rightRail.position.set(0.2, height / 2, 0);
    rightRail.castShadow = true;
    ladderGroup.add(rightRail);

    // Rungs
    const rungGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
    const rungCount = Math.floor(height / 0.5);

    for (let i = 0; i < rungCount; i++) {
      const rung = new THREE.Mesh(rungGeometry, material);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, i * 0.5 + 0.5, 0);
      rung.castShadow = true;
      ladderGroup.add(rung);
    }

    return ladderGroup;
  }

  /**
   * Update dynamic objects (called each frame)
   */
  public update(deltaTime: number): void {
    this.updateCars(deltaTime);
    this.updatePedestrians(deltaTime);
  }

  /**
   * Update car positions
   */
  private updateCars(deltaTime: number): void {
    this.cars.children.forEach((car, index) => {
      const config = this.carConfigs[index];
      if (!config) return;

      // Move car
      const movement = config.direction.clone().multiplyScalar(config.speed * deltaTime);
      config.position.add(movement);
      car.position.copy(config.position);

      // Wrap around map boundaries
      if (Math.abs(config.position.x) > MAP_SIZE) {
        config.position.x = -Math.sign(config.position.x) * MAP_SIZE;
      }
      if (Math.abs(config.position.z) > MAP_SIZE) {
        config.position.z = -Math.sign(config.position.z) * MAP_SIZE;
      }
    });
  }

  /**
   * Update pedestrian positions and animations
   */
  private updatePedestrians(deltaTime: number): void {
    this.pedestrians.children.forEach((pedestrian, index) => {
      const config = this.pedestrianConfigs[index];
      if (!config) return;

      // Move pedestrian
      const movement = config.direction.clone().multiplyScalar(config.speed * deltaTime);
      config.position.add(movement);
      pedestrian.position.copy(config.position);

      // Update animation phase
      config.animationPhase += deltaTime * 3;

      // Animate legs (simple walking animation)
      const leftLeg = pedestrian.children[4]; // Left leg
      const rightLeg = pedestrian.children[5]; // Right leg

      if (leftLeg && rightLeg) {
        leftLeg.rotation.x = Math.sin(config.animationPhase) * 0.3;
        rightLeg.rotation.x = Math.sin(config.animationPhase + Math.PI) * 0.3;
      }

      // Animate arms
      const leftArm = pedestrian.children[2]; // Left arm
      const rightArm = pedestrian.children[3]; // Right arm

      if (leftArm && rightArm) {
        leftArm.rotation.x = Math.sin(config.animationPhase + Math.PI) * 0.2;
        rightArm.rotation.x = Math.sin(config.animationPhase) * 0.2;
      }

      // Wrap around map boundaries
      if (Math.abs(config.position.x) > MAP_SIZE) {
        config.position.x = -Math.sign(config.position.x) * MAP_SIZE;
      }
      if (Math.abs(config.position.z) > MAP_SIZE) {
        config.position.z = -Math.sign(config.position.z) * MAP_SIZE;
      }

      // Occasionally change direction
      if (Math.random() < 0.01) {
        const angle = Math.random() * Math.PI * 2;
        config.direction.set(Math.cos(angle), 0, Math.sin(angle));
        pedestrian.rotation.y = angle;
      }
    });
  }

  /**
   * Get random car color
   */
  private getRandomCarColor(): number {
    const colors = [
      0xff0000, // Red
      0x0000ff, // Blue
      0x00ff00, // Green
      0xffff00, // Yellow
      0xff00ff, // Magenta
      0x00ffff, // Cyan
      0xffffff, // White
      0x000000, // Black
      0x808080, // Gray
    ];
    return colors[Math.floor(Math.random() * colors.length)] ?? 0xff0000;
  }

  /**
   * Get random pedestrian color (clothing)
   */
  private getRandomPedestrianColor(): number {
    const colors = [
      0xff6b6b, // Red
      0x4ecdc4, // Teal
      0x45b7d1, // Blue
      0xf7b731, // Yellow
      0x5f27cd, // Purple
      0x00d2d3, // Cyan
      0xff9ff3, // Pink
      0x54a0ff, // Light blue
    ];
    return colors[Math.floor(Math.random() * colors.length)] ?? 0xff6b6b;
  }

  /**
   * Get all cars (for collision detection)
   */
  public getCars(): THREE.Group {
    return this.cars;
  }

  /**
   * Get all pedestrians (for collision detection)
   */
  public getPedestrians(): THREE.Group {
    return this.pedestrians;
  }

  /**
   * Get all ladders
   */
  public getLadders(): THREE.Group {
    return this.ladders;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    [this.cars, this.pedestrians, this.ladders].forEach(group => {
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
    });
  }
}
