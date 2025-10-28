import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CarSystem } from './car-system';

// Mock THREE.js scene
class MockScene {
  public objects: THREE.Object3D[] = [];

  add(object: THREE.Object3D): void {
    this.objects.push(object);
  }

  remove(object: THREE.Object3D): void {
    const index = this.objects.indexOf(object);
    if (index > -1) {
      this.objects.splice(index, 1);
    }
  }
}

describe('CarSystem', () => {
  let scene: MockScene;
  let carSystem: CarSystem;

  beforeEach(() => {
    scene = new MockScene();
    carSystem = new CarSystem(scene as unknown as THREE.Scene);
  });

  describe('init', () => {
    it('should create 20 cars', () => {
      carSystem.init();
      
      const cars = carSystem.getCars();
      expect(cars.length).toBe(20);
    });

    it('should add cars to scene', () => {
      carSystem.init();
      
      // 20 cars should be added to scene
      expect(scene.objects.length).toBe(20);
    });

    it('should create cars on horizontal and vertical roads', () => {
      carSystem.init();
      
      const cars = carSystem.getCars();
      const horizontalCars = cars.filter(car => car.path === 'horizontal');
      const verticalCars = cars.filter(car => car.path === 'vertical');
      
      expect(horizontalCars.length).toBe(10);
      expect(verticalCars.length).toBe(10);
    });

    it('should assign unique IDs to cars', () => {
      carSystem.init();
      
      const cars = carSystem.getCars();
      const ids = cars.map(car => car.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(cars.length);
    });

    it('should set car speeds between 8 and 12 units per second', () => {
      carSystem.init();
      
      const cars = carSystem.getCars();
      
      for (const car of cars) {
        const absSpeed = Math.abs(car.speed);
        expect(absSpeed).toBeGreaterThanOrEqual(8);
        expect(absSpeed).toBeLessThanOrEqual(12);
      }
    });
  });

  describe('update', () => {
    beforeEach(() => {
      carSystem.init();
    });

    it('should update car positions', () => {
      const cars = carSystem.getCars();
      const initialPosition = { ...cars[0].position };
      
      carSystem.update(1); // 1 second
      
      const newPosition = cars[0].position;
      
      // Position should have changed
      expect(
        newPosition.x !== initialPosition.x || newPosition.z !== initialPosition.z
      ).toBe(true);
    });

    it('should update horizontal car x position', () => {
      const cars = carSystem.getCars();
      const horizontalCar = cars.find(car => car.path === 'horizontal')!;
      const initialX = horizontalCar.position.x;
      
      carSystem.update(1); // 1 second
      
      // X position should have changed
      expect(horizontalCar.position.x).not.toBe(initialX);
    });

    it('should update vertical car z position', () => {
      const cars = carSystem.getCars();
      const verticalCar = cars.find(car => car.path === 'vertical')!;
      const initialZ = verticalCar.position.z;
      
      carSystem.update(1); // 1 second
      
      // Z position should have changed
      expect(verticalCar.position.z).not.toBe(initialZ);
    });

    it('should wrap cars around when reaching map bounds', () => {
      const cars = carSystem.getCars();
      const car = cars[0];
      
      // Move car far beyond bounds
      car.pathPosition = 250;
      
      carSystem.update(0.1);
      
      // Car should wrap around
      expect(Math.abs(car.pathPosition)).toBeLessThanOrEqual(200);
    });

    it('should update mesh positions', () => {
      const cars = carSystem.getCars();
      const car = cars[0];
      
      carSystem.update(1);
      
      // Mesh position should match car position
      expect(car.mesh.position.x).toBe(car.position.x);
      expect(car.mesh.position.y).toBe(car.position.y);
      expect(car.mesh.position.z).toBe(car.position.z);
    });
  });

  describe('getDynamicObjects', () => {
    beforeEach(() => {
      carSystem.init();
    });

    it('should return dynamic objects for all cars', () => {
      const dynamicObjects = carSystem.getDynamicObjects();
      
      expect(dynamicObjects.length).toBe(20);
    });

    it('should set correct type for dynamic objects', () => {
      const dynamicObjects = carSystem.getDynamicObjects();
      
      for (const obj of dynamicObjects) {
        expect(obj.type).toBe('car');
      }
    });

    it('should set car radius to 2.5', () => {
      const dynamicObjects = carSystem.getDynamicObjects();
      
      for (const obj of dynamicObjects) {
        expect(obj.radius).toBe(2.5);
      }
    });

    it('should include car positions', () => {
      const dynamicObjects = carSystem.getDynamicObjects();
      const cars = carSystem.getCars();
      
      for (let i = 0; i < dynamicObjects.length; i++) {
        expect(dynamicObjects[i].position).toEqual(cars[i].position);
      }
    });
  });

  describe('checkCarCollision', () => {
    beforeEach(() => {
      carSystem.init();
    });

    it('should detect collision when player is close to car', () => {
      const cars = carSystem.getCars();
      const car = cars[0];
      
      // Player position very close to car
      const playerPosition = {
        x: car.position.x + 1,
        y: car.position.y,
        z: car.position.z,
      };
      
      const playerVelocity = { x: 5, y: 0, z: 0 };
      
      const result = carSystem.checkCarCollision(
        playerPosition,
        playerVelocity
      );
      
      expect(result.collided).toBe(true);
    });

    it('should not detect collision when player is far from cars', () => {
      const playerPosition = { x: 1000, y: 0, z: 1000 };
      const playerVelocity = { x: 5, y: 0, z: 0 };
      
      const result = carSystem.checkCarCollision(
        playerPosition,
        playerVelocity
      );
      
      expect(result.collided).toBe(false);
    });

    it('should apply bounce velocity on collision', () => {
      const cars = carSystem.getCars();
      const car = cars[0];
      
      // Player position very close to car
      const playerPosition = {
        x: car.position.x + 1,
        y: car.position.y,
        z: car.position.z,
      };
      
      const playerVelocity = { x: 5, y: 0, z: 0 };
      
      const result = carSystem.checkCarCollision(
        playerPosition,
        playerVelocity
      );
      
      if (result.collided) {
        // Should have upward bounce
        expect(result.newVelocity.y).toBe(8);
        
        // Should have horizontal bounce force
        const horizontalForce = Math.sqrt(
          result.newVelocity.x ** 2 + result.newVelocity.z ** 2
        );
        expect(horizontalForce).toBeCloseTo(15, 0);
      }
    });

    it('should return original velocity when no collision', () => {
      const playerPosition = { x: 1000, y: 0, z: 1000 };
      const playerVelocity = { x: 5, y: 0, z: 3 };
      
      const result = carSystem.checkCarCollision(
        playerPosition,
        playerVelocity
      );
      
      expect(result.newVelocity).toEqual(playerVelocity);
    });
  });

  describe('dispose', () => {
    beforeEach(() => {
      carSystem.init();
    });

    it('should remove all cars from scene', () => {
      expect(scene.objects.length).toBe(20);
      
      carSystem.dispose();
      
      expect(scene.objects.length).toBe(0);
    });

    it('should clear cars array', () => {
      expect(carSystem.getCars().length).toBe(20);
      
      carSystem.dispose();
      
      expect(carSystem.getCars().length).toBe(0);
    });

    it('should not throw when called multiple times', () => {
      carSystem.dispose();
      
      expect(() => carSystem.dispose()).not.toThrow();
    });
  });
});
