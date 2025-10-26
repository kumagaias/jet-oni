import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerPhysics, BuildingData, BridgeData, WaterArea } from './player-physics';
import { Vector3 } from '../../shared/types/game';
import { GRAVITY, WATER_SPEED_MULTIPLIER } from '../../shared/constants';

describe('PlayerPhysics', () => {
  let physics: PlayerPhysics;

  beforeEach(() => {
    physics = new PlayerPhysics();
  });

  describe('applyPhysics', () => {
    it('should apply gravity when not jetpacking', () => {
      const position: Vector3 = { x: 0, y: 10, z: 0 };
      const velocity: Vector3 = { x: 0, y: 0, z: 0 };
      const deltaTime = 0.1;

      const result = physics.applyPhysics(position, velocity, deltaTime, false);

      // Velocity should decrease due to gravity
      expect(result.velocity.y).toBeLessThan(0);
      expect(result.velocity.y).toBeCloseTo(-GRAVITY * deltaTime, 2);
    });

    it('should not apply gravity when jetpacking', () => {
      const position: Vector3 = { x: 0, y: 10, z: 0 };
      const velocity: Vector3 = { x: 0, y: 0, z: 0 };
      const deltaTime = 0.1;

      const result = physics.applyPhysics(position, velocity, deltaTime, true);

      // Velocity should remain zero when jetpacking
      expect(result.velocity.y).toBe(0);
    });

    it('should update position based on velocity', () => {
      const position: Vector3 = { x: 0, y: 10, z: 0 };
      const velocity: Vector3 = { x: 5, y: 0, z: 3 };
      const deltaTime = 0.1;

      const result = physics.applyPhysics(position, velocity, deltaTime, true);

      expect(result.position.x).toBeCloseTo(0.5, 2);
      expect(result.position.z).toBeCloseTo(0.3, 2);
    });

    it('should detect ground landing', () => {
      const position: Vector3 = { x: 0, y: 0.2, z: 0 };
      const velocity: Vector3 = { x: 0, y: -1, z: 0 };
      const deltaTime = 0.1;

      const result = physics.applyPhysics(position, velocity, deltaTime, false);

      expect(result.isOnSurface).toBe(true);
      expect(result.surfaceType).toBe('ground');
      expect(result.position.y).toBe(0);
      expect(result.velocity.y).toBe(0);
    });

    it('should clamp position to map bounds', () => {
      const position: Vector3 = { x: 250, y: 10, z: -250 };
      const velocity: Vector3 = { x: 0, y: 0, z: 0 };
      const deltaTime = 0.1;

      const result = physics.applyPhysics(position, velocity, deltaTime, false);

      expect(Math.abs(result.position.x)).toBeLessThanOrEqual(200);
      expect(Math.abs(result.position.z)).toBeLessThanOrEqual(200);
    });

    it('should prevent falling below ground', () => {
      const position: Vector3 = { x: 0, y: -5, z: 0 };
      const velocity: Vector3 = { x: 0, y: -10, z: 0 };
      const deltaTime = 0.1;

      const result = physics.applyPhysics(position, velocity, deltaTime, false);

      expect(result.position.y).toBe(0);
      expect(result.velocity.y).toBe(0);
    });
  });

  describe('rooftop landing', () => {
    beforeEach(() => {
      const buildings: BuildingData[] = [
        {
          position: { x: 10, y: 10, z: 10 },
          width: 10,
          height: 20,
          depth: 10,
          shape: 'box',
        },
      ];
      physics.registerBuildings(buildings);
    });

    it('should detect rooftop landing on box building', () => {
      const rooftopHeight = 20; // position.y + height/2
      const position: Vector3 = { x: 10, y: rooftopHeight + 0.3, z: 10 };
      const velocity: Vector3 = { x: 0, y: -1, z: 0 };
      const deltaTime = 0.1;

      const result = physics.applyPhysics(position, velocity, deltaTime, false);

      expect(result.isOnSurface).toBe(true);
      expect(result.surfaceType).toBe('rooftop');
      expect(result.position.y).toBe(rooftopHeight);
    });

    it('should not detect rooftop landing when outside building bounds', () => {
      const rooftopHeight = 20;
      const position: Vector3 = { x: 20, y: rooftopHeight + 0.3, z: 10 };
      const velocity: Vector3 = { x: 0, y: -1, z: 0 };
      const deltaTime = 0.1;

      const result = physics.applyPhysics(position, velocity, deltaTime, false);

      expect(result.isOnSurface).toBe(false);
    });
  });

  describe('bridge landing', () => {
    beforeEach(() => {
      const bridges: BridgeData[] = [
        {
          position: { x: 0, y: 1, z: 0 },
          width: 10,
          height: 0.5,
          depth: 15,
        },
      ];
      physics.registerBridges(bridges);
    });

    it('should detect bridge landing', () => {
      const bridgeTop = 1.25; // position.y + height/2
      const position: Vector3 = { x: 0, y: bridgeTop + 0.3, z: 0 };
      const velocity: Vector3 = { x: 0, y: -1, z: 0 };
      const deltaTime = 0.1;

      const result = physics.applyPhysics(position, velocity, deltaTime, false);

      expect(result.isOnSurface).toBe(true);
      expect(result.surfaceType).toBe('bridge');
      expect(result.position.y).toBe(bridgeTop);
    });
  });

  describe('cylinder building landing', () => {
    beforeEach(() => {
      const buildings: BuildingData[] = [
        {
          position: { x: 0, y: 40, z: 0 },
          width: 15, // diameter
          height: 80,
          depth: 15,
          shape: 'cylinder',
        },
      ];
      physics.registerBuildings(buildings);
    });

    it('should detect rooftop landing on cylinder building', () => {
      const rooftopHeight = 80; // position.y + height/2
      const position: Vector3 = { x: 3, y: rooftopHeight + 0.3, z: 4 };
      const velocity: Vector3 = { x: 0, y: -1, z: 0 };
      const deltaTime = 0.1;

      const result = physics.applyPhysics(position, velocity, deltaTime, false);

      // Distance from center: sqrt(3^2 + 4^2) = 5, radius = 7.5
      expect(result.isOnSurface).toBe(true);
      expect(result.surfaceType).toBe('rooftop');
    });

    it('should not detect landing outside cylinder radius', () => {
      const rooftopHeight = 80;
      const position: Vector3 = { x: 10, y: rooftopHeight + 0.3, z: 0 };
      const velocity: Vector3 = { x: 0, y: -1, z: 0 };
      const deltaTime = 0.1;

      const result = physics.applyPhysics(position, velocity, deltaTime, false);

      // Distance from center: 10, radius = 7.5
      expect(result.isOnSurface).toBe(false);
    });
  });

  describe('water detection', () => {
    beforeEach(() => {
      const waterAreas: WaterArea[] = [
        { x: 50, z: 0, width: 15, depth: 400 },
      ];
      physics.registerWaterAreas(waterAreas);
    });

    it('should detect when player is in water', () => {
      const position: Vector3 = { x: 50, y: 0.5, z: 0 };
      expect(physics.isInWater(position)).toBe(true);
    });

    it('should not detect water when player is too high', () => {
      const position: Vector3 = { x: 50, y: 5, z: 0 };
      expect(physics.isInWater(position)).toBe(false);
    });

    it('should not detect water when player is outside water area', () => {
      const position: Vector3 = { x: 100, y: 0.5, z: 0 };
      expect(physics.isInWater(position)).toBe(false);
    });

    it('should apply water resistance to velocity', () => {
      const velocity: Vector3 = { x: 10, y: 0, z: 5 };
      const result = physics.applyWaterResistance(velocity, true);

      expect(result.x).toBe(10 * WATER_SPEED_MULTIPLIER);
      expect(result.z).toBe(5 * WATER_SPEED_MULTIPLIER);
      expect(result.y).toBe(0);
    });

    it('should not apply water resistance when not in water', () => {
      const velocity: Vector3 = { x: 10, y: 0, z: 5 };
      const result = physics.applyWaterResistance(velocity, false);

      expect(result.x).toBe(10);
      expect(result.z).toBe(5);
    });
  });

  describe('getSurfaceHeightAt', () => {
    beforeEach(() => {
      const buildings: BuildingData[] = [
        {
          position: { x: 0, y: 10, z: 0 },
          width: 10,
          height: 20,
          depth: 10,
          shape: 'box',
        },
      ];
      const bridges: BridgeData[] = [
        {
          position: { x: 20, y: 1, z: 0 },
          width: 10,
          height: 0.5,
          depth: 15,
        },
      ];
      physics.registerBuildings(buildings);
      physics.registerBridges(bridges);
    });

    it('should return rooftop height when on building', () => {
      const height = physics.getSurfaceHeightAt(0, 0);
      expect(height).toBe(20); // position.y + height/2
    });

    it('should return bridge height when on bridge', () => {
      const height = physics.getSurfaceHeightAt(20, 0);
      expect(height).toBe(1.25); // position.y + height/2
    });

    it('should return 0 when on ground', () => {
      const height = physics.getSurfaceHeightAt(100, 100);
      expect(height).toBe(0);
    });

    it('should return highest surface when multiple surfaces overlap', () => {
      // Add a taller building at same location
      const buildings: BuildingData[] = [
        {
          position: { x: 0, y: 10, z: 0 },
          width: 10,
          height: 20,
          depth: 10,
          shape: 'box',
        },
        {
          position: { x: 0, y: 20, z: 0 },
          width: 8,
          height: 40,
          depth: 8,
          shape: 'box',
        },
      ];
      physics.registerBuildings(buildings);

      const height = physics.getSurfaceHeightAt(0, 0);
      expect(height).toBe(40); // Taller building
    });
  });
});
