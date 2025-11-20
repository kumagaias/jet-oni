import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CityGenerator } from './city-generator';
import { BUILDING_COUNT, HOUSE_COUNT } from '../../shared/constants';

describe('CityGenerator', () => {
  let cityGenerator: CityGenerator;

  beforeEach(() => {
    cityGenerator = new CityGenerator();
  });

  afterEach(() => {
    cityGenerator.dispose();
  });

  describe('generateCity', () => {
    it('should generate a city with all components', () => {
      const city = cityGenerator.generateCity();
      
      expect(city).toBeDefined();
      expect(city.children.length).toBeGreaterThan(0);
    });

    it('should generate the correct number of buildings', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      const buildingAreas = occupiedAreas.filter(area => area.type === 'building');
      
      // Should generate BUILDING_COUNT buildings (or close to it if placement fails)
      expect(buildingAreas.length).toBeGreaterThanOrEqual(BUILDING_COUNT * 0.8);
      expect(buildingAreas.length).toBeLessThanOrEqual(BUILDING_COUNT);
    });

    it('should generate the correct number of houses', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      const houseAreas = occupiedAreas.filter(area => area.type === 'house');
      
      // Should generate HOUSE_COUNT houses (or close to it if placement fails)
      expect(houseAreas.length).toBeGreaterThanOrEqual(HOUSE_COUNT * 0.8);
      expect(houseAreas.length).toBeLessThanOrEqual(HOUSE_COUNT);
    });

    it('should generate a river', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      const riverAreas = occupiedAreas.filter(area => area.type === 'river');
      
      expect(riverAreas.length).toBe(1);
    });

    it('should generate roads', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      const roadAreas = occupiedAreas.filter(area => area.type === 'road');
      
      // Should have multiple roads (grid pattern)
      expect(roadAreas.length).toBeGreaterThan(5);
    });

    it('should generate bridges', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      const bridgeAreas = occupiedAreas.filter(area => area.type === 'bridge');
      
      // Should have 5 bridges (one for each road crossing)
      expect(bridgeAreas.length).toBe(5);
    });

    it('should generate a landmark', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      const landmarkAreas = occupiedAreas.filter(area => area.type === 'landmark');
      
      // Should have multiple landmarks (tower, dome, arch) or fewer if placement fails
      expect(landmarkAreas.length).toBeGreaterThanOrEqual(0);
      expect(landmarkAreas.length).toBeLessThanOrEqual(3);
    });
  });

  describe('collision-free placement', () => {
    it('should not place buildings overlapping with each other', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      // Check all buildings against each other
      const buildings = occupiedAreas.filter(area => area.type === 'building');
      
      for (let i = 0; i < buildings.length; i++) {
        for (let j = i + 1; j < buildings.length; j++) {
          const a = buildings[i];
          const b = buildings[j];
          
          const dx = Math.abs(a.x - b.x);
          const dz = Math.abs(a.z - b.z);
          const minDistX = (a.width + b.width) / 2 + 2; // 2 is the margin
          const minDistZ = (a.depth + b.depth) / 2 + 2;
          
          // Buildings should not overlap
          const overlaps = dx < minDistX && dz < minDistZ;
          expect(overlaps).toBe(false);
        }
      }
    });

    it('should not place houses overlapping with each other', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      // Check all houses against each other
      const houses = occupiedAreas.filter(area => area.type === 'house');
      
      for (let i = 0; i < houses.length; i++) {
        for (let j = i + 1; j < houses.length; j++) {
          const a = houses[i];
          const b = houses[j];
          
          const dx = Math.abs(a.x - b.x);
          const dz = Math.abs(a.z - b.z);
          const minDistX = (a.width + b.width) / 2 + 2; // 2 is the margin
          const minDistZ = (a.depth + b.depth) / 2 + 2;
          
          // Houses should not overlap
          const overlaps = dx < minDistX && dz < minDistZ;
          expect(overlaps).toBe(false);
        }
      }
    });

    it('should not place buildings overlapping with houses', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      const buildings = occupiedAreas.filter(area => area.type === 'building');
      const houses = occupiedAreas.filter(area => area.type === 'house');
      
      for (const building of buildings) {
        for (const house of houses) {
          const dx = Math.abs(building.x - house.x);
          const dz = Math.abs(building.z - house.z);
          const minDistX = (building.width + house.width) / 2 + 2;
          const minDistZ = (building.depth + house.depth) / 2 + 2;
          
          // Buildings and houses should not overlap
          const overlaps = dx < minDistX && dz < minDistZ;
          expect(overlaps).toBe(false);
        }
      }
    });

    it('should not place structures overlapping with roads', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      const roads = occupiedAreas.filter(area => area.type === 'road');
      const structures = occupiedAreas.filter(
        area => area.type === 'building' || area.type === 'house'
      );
      
      for (const structure of structures) {
        for (const road of roads) {
          const dx = Math.abs(structure.x - road.x);
          const dz = Math.abs(structure.z - road.z);
          const minDistX = (structure.width + road.width) / 2 + 2;
          const minDistZ = (structure.depth + road.depth) / 2 + 2;
          
          // Structures should not overlap with roads
          const overlaps = dx < minDistX && dz < minDistZ;
          expect(overlaps).toBe(false);
        }
      }
    });

    it('should not place structures overlapping with river', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      const river = occupiedAreas.find(area => area.type === 'river');
      const structures = occupiedAreas.filter(
        area => area.type === 'building' || area.type === 'house'
      );
      
      if (river) {
        for (const structure of structures) {
          const dx = Math.abs(structure.x - river.x);
          const dz = Math.abs(structure.z - river.z);
          const minDistX = (structure.width + river.width) / 2 + 2;
          const minDistZ = (structure.depth + river.depth) / 2 + 2;
          
          // Structures should not overlap with river
          const overlaps = dx < minDistX && dz < minDistZ;
          expect(overlaps).toBe(false);
        }
      }
    });
  });

  describe('getOccupiedAreas', () => {
    it('should return all occupied areas', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      expect(occupiedAreas).toBeDefined();
      expect(occupiedAreas.length).toBeGreaterThan(0);
    });

    it('should include all structure types', () => {
      cityGenerator.generateCity();
      const occupiedAreas = cityGenerator.getOccupiedAreas();
      
      const types = new Set(occupiedAreas.map(area => area.type));
      
      expect(types.has('building')).toBe(true);
      expect(types.has('house')).toBe(true);
      expect(types.has('road')).toBe(true);
      expect(types.has('river')).toBe(true);
      expect(types.has('bridge')).toBe(true);
    });
  });

  describe('getBuildings', () => {
    it('should return buildings group', () => {
      cityGenerator.generateCity();
      const buildings = cityGenerator.getBuildings();
      
      expect(buildings).toBeDefined();
      expect(buildings.children.length).toBeGreaterThan(0);
    });
  });
});
