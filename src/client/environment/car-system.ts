import * as THREE from 'three';
import { Vector3 } from '../../shared/types/game';
import { DynamicObject } from './collision-system';

/**
 * Car data for rendering and collision
 */
export interface CarData {
  id: string;
  position: Vector3;
  velocity: Vector3;
  rotation: number;
  mesh: THREE.Group;
  path: 'horizontal' | 'vertical';
  pathPosition: number; // Position along the path
  speed: number;
}

/**
 * CarSystem manages moving cars in the city
 */
export class CarSystem {
  private cars: CarData[] = [];
  private scene: THREE.Scene;
  private carCount = 20;
  private roadPositions = [-120, -60, 0, 60, 120]; // Match road grid

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Initialize cars on roads
   */
  public init(): void {
    this.cars = [];

    // Create cars on horizontal roads
    for (let i = 0; i < this.carCount / 2; i++) {
      const roadIndex = Math.floor(Math.random() * this.roadPositions.length);
      const z = this.roadPositions[roadIndex] ?? 0;
      const x = (Math.random() - 0.5) * 300; // Random position along road
      const direction = Math.random() > 0.5 ? 1 : -1;

      const car = this.createCar(
        { x, y: 0.5, z },
        'horizontal',
        direction
      );
      this.cars.push(car);
    }

    // Create cars on vertical roads
    for (let i = 0; i < this.carCount / 2; i++) {
      const roadIndex = Math.floor(Math.random() * this.roadPositions.length);
      const x = this.roadPositions[roadIndex] ?? 0;
      const z = (Math.random() - 0.5) * 300; // Random position along road
      const direction = Math.random() > 0.5 ? 1 : -1;

      const car = this.createCar(
        { x, y: 0.5, z },
        'vertical',
        direction
      );
      this.cars.push(car);
    }
  }

  /**
   * Create a single car
   */
  private createCar(
    position: Vector3,
    path: 'horizontal' | 'vertical',
    direction: number
  ): CarData {
    const carGroup = new THREE.Group();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.getRandomCarColor(),
      roughness: 0.5,
      metalness: 0.7,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    carGroup.add(body);

    // Car roof
    const roofGeometry = new THREE.BoxGeometry(1.8, 0.8, 2);
    const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
    roof.position.y = 1.4;
    roof.castShadow = true;
    carGroup.add(roof);

    // Windows (darker)
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.6,
    });

    const windowGeometry = new THREE.BoxGeometry(1.7, 0.7, 1.9);
    const window = new THREE.Mesh(windowGeometry, windowMaterial);
    window.position.y = 1.4;
    carGroup.add(window);

    // Set initial rotation based on path
    // Car model is long in Z-axis (front-back)
    // For horizontal roads (moving in X direction), rotate 90 degrees
    // For vertical roads (moving in Z direction), no rotation needed
    if (path === 'horizontal') {
      carGroup.rotation.y = Math.PI / 2;
    }

    carGroup.position.set(position.x, position.y, position.z);
    this.scene.add(carGroup);

    const speed = 8 + Math.random() * 4; // 8-12 units per second

    return {
      id: `car-${Date.now()}-${Math.random()}`,
      position: { ...position },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: path === 'horizontal' ? Math.PI / 2 : 0,
      mesh: carGroup,
      path,
      pathPosition: path === 'horizontal' ? position.x : position.z,
      speed: speed * direction,
    };
  }

  /**
   * Update all cars
   */
  public update(deltaTime: number): void {
    for (const car of this.cars) {
      // Update position along path
      car.pathPosition += car.speed * deltaTime;

      // Wrap around when reaching map bounds
      if (Math.abs(car.pathPosition) > 200) {
        car.pathPosition = -car.pathPosition / Math.abs(car.pathPosition) * 200;
      }

      // Update actual position
      if (car.path === 'horizontal') {
        car.position.x = car.pathPosition;
        car.velocity.x = car.speed;
        car.velocity.z = 0;
      } else {
        car.position.z = car.pathPosition;
        car.velocity.x = 0;
        car.velocity.z = car.speed;
      }

      // Update mesh position
      car.mesh.position.set(car.position.x, car.position.y, car.position.z);
    }
  }

  /**
   * Get cars as dynamic objects for collision detection
   */
  public getDynamicObjects(): DynamicObject[] {
    return this.cars.map((car) => ({
      position: car.position,
      radius: 2.5, // Approximate car radius
      type: 'car' as const,
    }));
  }

  /**
   * Get all cars data
   */
  public getCars(): CarData[] {
    return this.cars;
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
      0xffa500, // Orange
    ];
    return colors[Math.floor(Math.random() * colors.length)] ?? 0xff0000;
  }

  /**
   * Check if player collided with any car and apply bounce
   */
  public checkCarCollision(
    playerPosition: Vector3,
    playerVelocity: Vector3,
    playerRadius = 0.5
  ): { collided: boolean; newVelocity: Vector3 } {
    for (const car of this.cars) {
      // Check 2D distance
      const dx = playerPosition.x - car.position.x;
      const dz = playerPosition.z - car.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      const carRadius = 2.5;
      const totalRadius = playerRadius + carRadius;

      // Check if collision occurred
      if (distance < totalRadius) {
        // Calculate bounce direction (away from car)
        const bounceDirection = {
          x: distance > 0 ? dx / distance : 1,
          y: 0,
          z: distance > 0 ? dz / distance : 0,
        };

        // Apply bounce force
        const bounceForce = 15; // Strong bounce
        const newVelocity = {
          x: bounceDirection.x * bounceForce,
          y: 8, // Upward bounce
          z: bounceDirection.z * bounceForce,
        };

        return { collided: true, newVelocity };
      }
    }

    return { collided: false, newVelocity: playerVelocity };
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    for (const car of this.cars) {
      this.scene.remove(car.mesh);
      car.mesh.traverse((child) => {
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
    this.cars = [];
  }
}
