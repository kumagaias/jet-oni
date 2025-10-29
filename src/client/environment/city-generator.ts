import * as THREE from 'three';
import { MAP_SIZE, BUILDING_COUNT, HOUSE_COUNT } from '../../shared/constants';
import { SeededRandom } from '../utils/seeded-random';

/**
 * Represents an occupied area in the city to prevent overlapping structures
 */
interface OccupiedArea {
  x: number;
  z: number;
  width: number;
  depth: number;
  type: 'building' | 'house' | 'road' | 'river' | 'bridge' | 'landmark';
}

/**
 * Building configuration
 */
interface BuildingConfig {
  width: number;
  height: number;
  depth: number;
  color: number;
}

/**
 * CityGenerator creates a procedural city environment with buildings, houses, roads, rivers, and bridges
 */
export class CityGenerator {
  private occupiedAreas: OccupiedArea[] = [];
  private buildingData: Array<{ position: { x: number; y: number; z: number }; width: number; height: number; depth: number; shape: 'box' | 'cylinder' }> = [];
  private buildings: THREE.Group;
  private roads: THREE.Group;
  private rivers: THREE.Group;
  private bridges: THREE.Group;
  private landmark: THREE.Group | null = null;
  private rng: SeededRandom;

  constructor(seed?: string | number) {
    this.buildings = new THREE.Group();
    this.roads = new THREE.Group();
    this.rivers = new THREE.Group();
    this.bridges = new THREE.Group();
    
    // Use provided seed or default seed for consistent map generation
    this.rng = new SeededRandom(seed || 'default-city-seed');
  }

  /**
   * Generate the entire city
   */
  public generateCity(): THREE.Group {
    const cityGroup = new THREE.Group();

    // Generate ground plane
    const ground = this.createGround();
    cityGroup.add(ground);

    // Generate river first (it affects other placements)
    this.generateRiver();
    cityGroup.add(this.rivers);

    // Generate roads
    this.generateRoads();
    cityGroup.add(this.roads);

    // Generate bridges over river
    this.generateBridges();
    cityGroup.add(this.bridges);

    // Generate buildings
    this.generateBuildings();
    cityGroup.add(this.buildings);

    // Generate houses
    this.generateHouses();
    cityGroup.add(this.buildings); // Houses are part of buildings group

    // Generate landmark tower
    this.generateLandmark();
    if (this.landmark) {
      cityGroup.add(this.landmark);
    }

    return cityGroup;
  }

  /**
   * Create ground plane
   */
  private createGround(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3a5f3a, // Dark green grass
      roughness: 0.8,
      metalness: 0.2,
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;

    return ground;
  }

  /**
   * Check if an area overlaps with any occupied areas
   */
  private isAreaOccupied(x: number, z: number, width: number, depth: number, margin = 2): boolean {
    for (const area of this.occupiedAreas) {
      const dx = Math.abs(x - area.x);
      const dz = Math.abs(z - area.z);
      const minDistX = (width + area.width) / 2 + margin;
      const minDistZ = (depth + area.depth) / 2 + margin;

      if (dx < minDistX && dz < minDistZ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Mark an area as occupied
   */
  private markAreaOccupied(
    x: number,
    z: number,
    width: number,
    depth: number,
    type: OccupiedArea['type']
  ): void {
    this.occupiedAreas.push({ x, z, width, depth, type });
  }

  /**
   * Find a random unoccupied position
   */
  private findUnoccupiedPosition(width: number, depth: number, maxAttempts = 50): { x: number; z: number } | null {
    for (let i = 0; i < maxAttempts; i++) {
      const x = (this.rng.next() - 0.5) * MAP_SIZE * 1.8;
      const z = (this.rng.next() - 0.5) * MAP_SIZE * 1.8;

      if (!this.isAreaOccupied(x, z, width, depth)) {
        return { x, z };
      }
    }
    return null;
  }

  /**
   * Generate river running through the city
   */
  private generateRiver(): void {
    const riverWidth = 15;
    const riverDepth = MAP_SIZE * 2;
    const riverX = (this.rng.next() - 0.5) * MAP_SIZE * 0.5; // Random position, not too far from center

    // Create river geometry
    const geometry = new THREE.PlaneGeometry(riverWidth, riverDepth);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a90e2, // Blue water
      roughness: 0.3,
      metalness: 0.6,
      transparent: true,
      opacity: 0.8,
    });

    const river = new THREE.Mesh(geometry, material);
    river.rotation.x = -Math.PI / 2;
    river.position.set(riverX, 0.05, 0); // Slightly above ground
    river.receiveShadow = true;

    this.rivers.add(river);

    // Mark river area as occupied
    this.markAreaOccupied(riverX, 0, riverWidth, riverDepth, 'river');
  }

  /**
   * Generate roads in a grid pattern
   */
  private generateRoads(): void {
    const roadWidth = 8;
    const roadColor = 0x404040; // Dark gray

    // Horizontal roads
    for (let i = -2; i <= 2; i++) {
      const z = i * 60;
      const geometry = new THREE.PlaneGeometry(MAP_SIZE * 2, roadWidth);
      const material = new THREE.MeshStandardMaterial({
        color: roadColor,
        roughness: 0.9,
        metalness: 0.1,
      });

      const road = new THREE.Mesh(geometry, material);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.02, z);
      road.receiveShadow = true;

      this.roads.add(road);
      this.markAreaOccupied(0, z, MAP_SIZE * 2, roadWidth, 'road');
    }

    // Vertical roads
    for (let i = -2; i <= 2; i++) {
      const x = i * 60;
      const geometry = new THREE.PlaneGeometry(roadWidth, MAP_SIZE * 2);
      const material = new THREE.MeshStandardMaterial({
        color: roadColor,
        roughness: 0.9,
        metalness: 0.1,
      });

      const road = new THREE.Mesh(geometry, material);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.02, 0);
      road.receiveShadow = true;

      this.roads.add(road);
      this.markAreaOccupied(x, 0, roadWidth, MAP_SIZE * 2, 'road');
    }
  }

  /**
   * Generate bridges over the river
   */
  private generateBridges(): void {
    // Find river position
    const riverArea = this.occupiedAreas.find(area => area.type === 'river');
    if (!riverArea) return;

    const bridgeWidth = 10;
    const bridgeThickness = 0.5;
    const bridgeColor = 0x8b7355; // Brown wood

    // Create bridges at road intersections (every 60 units)
    for (let i = -2; i <= 2; i++) {
      const z = i * 60; // Match road positions
      
      const geometry = new THREE.BoxGeometry(bridgeWidth, bridgeThickness, riverArea.width + 2);
      const material = new THREE.MeshStandardMaterial({
        color: bridgeColor,
        roughness: 0.8,
        metalness: 0.2,
      });

      const bridge = new THREE.Mesh(geometry, material);
      bridge.position.set(riverArea.x, 1, z);
      bridge.castShadow = true;
      bridge.receiveShadow = true;

      this.bridges.add(bridge);
      this.markAreaOccupied(riverArea.x, z, bridgeWidth, riverArea.width + 2, 'bridge');
    }
  }

  /**
   * Generate buildings (tall structures)
   */
  private generateBuildings(): void {
    let buildingsCreated = 0;
    const maxAttempts = BUILDING_COUNT * 3;
    let attempts = 0;

    while (buildingsCreated < BUILDING_COUNT && attempts < maxAttempts) {
      attempts++;

      const config: BuildingConfig = {
        width: 10 + this.rng.next() * 15,
        height: 15 + this.rng.next() * 35,
        depth: 10 + this.rng.next() * 15,
        color: this.getRandomBuildingColor(),
      };

      const position = this.findUnoccupiedPosition(config.width, config.depth);
      if (!position) continue;

      const building = this.createBuilding(config);
      building.position.set(position.x, config.height / 2, position.z);
      this.buildings.add(building);

      // Store building data for collision detection
      this.buildingData.push({
        position: { x: position.x, y: config.height / 2, z: position.z },
        width: config.width,
        height: config.height,
        depth: config.depth,
        shape: 'box'
      });

      this.markAreaOccupied(position.x, position.z, config.width, config.depth, 'building');
      buildingsCreated++;
    }
  }

  /**
   * Create a single building
   */
  private createBuilding(config: BuildingConfig): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(config.width, config.height, config.depth);
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.7,
      metalness: 0.3,
    });

    const building = new THREE.Mesh(geometry, material);
    building.castShadow = true;
    building.receiveShadow = true;

    return building;
  }

  /**
   * Generate houses (shorter residential structures)
   */
  private generateHouses(): void {
    let housesCreated = 0;
    const maxAttempts = HOUSE_COUNT * 3;
    let attempts = 0;

    while (housesCreated < HOUSE_COUNT && attempts < maxAttempts) {
      attempts++;

      const width = 6 + this.rng.next() * 6;
      const height = 4 + this.rng.next() * 4;
      const depth = 6 + this.rng.next() * 6;

      const position = this.findUnoccupiedPosition(width, depth);
      if (!position) continue;

      const house = this.createHouse(width, height, depth);
      house.position.set(position.x, height / 2, position.z);
      this.buildings.add(house);

      // Store house data for collision detection
      this.buildingData.push({
        position: { x: position.x, y: height / 2, z: position.z },
        width: width,
        height: height,
        depth: depth,
        shape: 'box'
      });

      this.markAreaOccupied(position.x, position.z, width, depth, 'house');
      housesCreated++;
    }
  }

  /**
   * Create a single house with roof
   */
  private createHouse(width: number, height: number, depth: number): THREE.Group {
    const houseGroup = new THREE.Group();

    // House body
    const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.getRandomHouseColor(),
      roughness: 0.8,
      metalness: 0.2,
    });

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    houseGroup.add(body);

    // Roof
    const roofGeometry = new THREE.ConeGeometry(Math.max(width, depth) * 0.7, height * 0.4, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      roughness: 0.9,
      metalness: 0.1,
    });

    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = height * 0.7;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    houseGroup.add(roof);

    return houseGroup;
  }

  /**
   * Generate a landmark tower
   */
  private generateLandmark(): void {
    const landmarkWidth = 15;
    const landmarkHeight = 80;
    const landmarkDepth = 15;

    // Try to place near center
    const position = this.findUnoccupiedPosition(landmarkWidth, landmarkDepth, 100);
    if (!position) return;

    this.landmark = new THREE.Group();

    // Main tower
    const towerGeometry = new THREE.CylinderGeometry(
      landmarkWidth / 2,
      landmarkWidth / 2,
      landmarkHeight,
      8
    );
    const towerMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0, // Silver
      roughness: 0.4,
      metalness: 0.8,
    });

    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.y = landmarkHeight / 2;
    tower.castShadow = true;
    tower.receiveShadow = true;
    this.landmark.add(tower);

    // Spire on top
    const spireGeometry = new THREE.ConeGeometry(landmarkWidth / 3, landmarkHeight * 0.2, 8);
    const spire = new THREE.Mesh(spireGeometry, towerMaterial);
    spire.position.y = landmarkHeight + landmarkHeight * 0.1;
    spire.castShadow = true;
    this.landmark.add(spire);

    this.landmark.position.set(position.x, 0, position.z);
    this.markAreaOccupied(position.x, position.z, landmarkWidth, landmarkDepth, 'landmark');
  }

  /**
   * Get random building color
   */
  private getRandomBuildingColor(): number {
    const colors = [
      0x808080, // Gray
      0xa0a0a0, // Light gray
      0x606060, // Dark gray
      0x8b7355, // Brown
      0x4a5f6a, // Blue-gray
    ];
    return colors[Math.floor(this.rng.next() * colors.length)];
  }

  /**
   * Get random house color
   */
  private getRandomHouseColor(): number {
    const colors = [
      0xf5deb3, // Wheat
      0xfaebd7, // Antique white
      0xffe4b5, // Moccasin
      0xffdab9, // Peach
      0xd2b48c, // Tan
    ];
    return colors[Math.floor(this.rng.next() * colors.length)];
  }

  /**
   * Get all occupied areas (for collision detection)
   */
  public getOccupiedAreas(): OccupiedArea[] {
    return this.occupiedAreas;
  }

  /**
   * Get all buildings (for collision detection)
   */
  public getBuildings(): THREE.Group {
    return this.buildings;
  }

  /**
   * Get building data array (for collision detection and beacon placement)
   */
  public getBuildingData(): Array<{ position: { x: number; y: number; z: number }; width: number; height: number; depth: number; shape: 'box' | 'cylinder' }> {
    return this.buildingData;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    const disposeGroup = (group: THREE.Group) => {
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((m) => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
      group.clear();
    };

    disposeGroup(this.buildings);
    disposeGroup(this.roads);
    disposeGroup(this.rivers);
    disposeGroup(this.bridges);

    if (this.landmark) {
      disposeGroup(this.landmark);
      this.landmark = null;
    }

    this.occupiedAreas = [];
  }
}
