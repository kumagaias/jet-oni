/**
 * Building Generator
 * Handles generation of buildings, houses, and traffic lights
 */

import * as THREE from 'three';
import { SeededRandom } from '../utils/seeded-random';

export interface BuildingConfig {
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: number;
  hasRooftop: boolean;
}

/**
 * Create a building with windows and optional rooftop
 */
export function createBuilding(config: BuildingConfig, rng: SeededRandom): THREE.Group {
  const buildingGroup = new THREE.Group();
  buildingGroup.position.set(config.x, 0, config.z);

  // Main building body
  const geometry = new THREE.BoxGeometry(config.width, config.height, config.depth);
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.7,
    metalness: 0.3,
  });
  const building = new THREE.Mesh(geometry, material);
  building.position.y = config.height / 2;
  building.castShadow = true;
  building.receiveShadow = true;
  buildingGroup.add(building);

  // Add windows
  addWindows(buildingGroup, config, rng);

  // Add rooftop if specified
  if (config.hasRooftop) {
    addRooftop(buildingGroup, config);
  }

  return buildingGroup;
}

/**
 * Add windows to building
 */
function addWindows(
  buildingGroup: THREE.Group,
  config: BuildingConfig,
  rng: SeededRandom
): void {
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff99,
    emissive: 0xffff66,
    emissiveIntensity: 0.5,
    roughness: 0.1,
    metalness: 0.9,
  });

  const windowWidth = 1.5;
  const windowHeight = 2;
  const windowDepth = 0.1;
  const windowSpacingX = 3;
  const windowSpacingY = 4;

  // Front face windows
  const numWindowsX = Math.floor(config.width / windowSpacingX);
  const numWindowsY = Math.floor(config.height / windowSpacingY);

  for (let i = 0; i < numWindowsX; i++) {
    for (let j = 0; j < numWindowsY; j++) {
      // Randomly skip some windows
      if (rng.next() > 0.7) continue;

      const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
      const window = new THREE.Mesh(windowGeometry, windowMaterial);

      const x = (i - numWindowsX / 2) * windowSpacingX + windowSpacingX / 2;
      const y = (j - numWindowsY / 2) * windowSpacingY + windowSpacingY / 2 + config.height / 2;
      const z = config.depth / 2 + windowDepth;

      window.position.set(x, y, z);
      buildingGroup.add(window);
    }
  }

  // Back face windows
  for (let i = 0; i < numWindowsX; i++) {
    for (let j = 0; j < numWindowsY; j++) {
      if (rng.next() > 0.7) continue;

      const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
      const window = new THREE.Mesh(windowGeometry, windowMaterial);

      const x = (i - numWindowsX / 2) * windowSpacingX + windowSpacingX / 2;
      const y = (j - numWindowsY / 2) * windowSpacingY + windowSpacingY / 2 + config.height / 2;
      const z = -config.depth / 2 - windowDepth;

      window.position.set(x, y, z);
      window.rotation.y = Math.PI;
      buildingGroup.add(window);
    }
  }

  // Left face windows
  const numWindowsZ = Math.floor(config.depth / windowSpacingX);
  for (let i = 0; i < numWindowsZ; i++) {
    for (let j = 0; j < numWindowsY; j++) {
      if (rng.next() > 0.7) continue;

      const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
      const window = new THREE.Mesh(windowGeometry, windowMaterial);

      const x = -config.width / 2 - windowDepth;
      const y = (j - numWindowsY / 2) * windowSpacingY + windowSpacingY / 2 + config.height / 2;
      const z = (i - numWindowsZ / 2) * windowSpacingX + windowSpacingX / 2;

      window.position.set(x, y, z);
      window.rotation.y = Math.PI / 2;
      buildingGroup.add(window);
    }
  }

  // Right face windows
  for (let i = 0; i < numWindowsZ; i++) {
    for (let j = 0; j < numWindowsY; j++) {
      if (rng.next() > 0.7) continue;

      const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
      const window = new THREE.Mesh(windowGeometry, windowMaterial);

      const x = config.width / 2 + windowDepth;
      const y = (j - numWindowsY / 2) * windowSpacingY + windowSpacingY / 2 + config.height / 2;
      const z = (i - numWindowsZ / 2) * windowSpacingX + windowSpacingX / 2;

      window.position.set(x, y, z);
      window.rotation.y = -Math.PI / 2;
      buildingGroup.add(window);
    }
  }
}

/**
 * Add rooftop to building
 */
function addRooftop(buildingGroup: THREE.Group, config: BuildingConfig): void {
  const rooftopHeight = 0.5;
  const rooftopGeometry = new THREE.BoxGeometry(
    config.width + 1,
    rooftopHeight,
    config.depth + 1
  );
  const rooftopMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.9,
    metalness: 0.1,
  });
  const rooftop = new THREE.Mesh(rooftopGeometry, rooftopMaterial);
  rooftop.position.y = config.height + rooftopHeight / 2;
  rooftop.castShadow = true;
  rooftop.receiveShadow = true;
  buildingGroup.add(rooftop);
}

/**
 * Create a house (smaller residential building)
 */
export function createHouse(
  width: number,
  height: number,
  depth: number,
  isEnterable: boolean,
  rng: SeededRandom
): THREE.Group {
  const houseGroup = new THREE.Group();

  // Main house body
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const houseColor = isEnterable ? 0x8b4513 : 0xa0522d;
  const material = new THREE.MeshStandardMaterial({
    color: houseColor,
    roughness: 0.8,
    metalness: 0.2,
  });
  const house = new THREE.Mesh(geometry, material);
  house.position.y = height / 2;
  house.castShadow = true;
  house.receiveShadow = true;
  houseGroup.add(house);

  // Add roof
  addRoof(houseGroup, width, height, depth);

  // Add door
  addDoor(houseGroup, width, height, depth);

  // Add windows
  addHouseWindows(houseGroup, width, height, depth, rng);

  return houseGroup;
}

/**
 * Add roof to house
 */
function addRoof(
  houseGroup: THREE.Group,
  width: number,
  height: number,
  depth: number
): void {
  const roofHeight = 3;
  const roofGeometry = new THREE.ConeGeometry(
    Math.max(width, depth) * 0.7,
    roofHeight,
    4
  );
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b0000,
    roughness: 0.9,
    metalness: 0.1,
  });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = height + roofHeight / 2;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  houseGroup.add(roof);
}

/**
 * Add door to house
 */
function addDoor(
  houseGroup: THREE.Group,
  width: number,
  height: number,
  depth: number
): void {
  const doorWidth = 1.5;
  const doorHeight = 2.5;
  const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x654321,
    roughness: 0.8,
  });
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(0, doorHeight / 2, depth / 2 + 0.01);
  houseGroup.add(door);
}

/**
 * Add windows to house
 */
function addHouseWindows(
  houseGroup: THREE.Group,
  width: number,
  height: number,
  depth: number,
  rng: SeededRandom
): void {
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xadd8e6,
    roughness: 0.1,
    metalness: 0.9,
  });

  const windowWidth = 1;
  const windowHeight = 1;

  // Front windows (2 windows)
  for (let i = 0; i < 2; i++) {
    if (rng.next() > 0.3) {
      const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      const x = (i - 0.5) * (width * 0.4);
      window.position.set(x, height * 0.6, depth / 2 + 0.02);
      houseGroup.add(window);
    }
  }
}

/**
 * Create a traffic light
 */
export function createTrafficLight(poleHeight: number, lightSize: number): THREE.Group {
  const trafficLightGroup = new THREE.Group();

  // Pole
  const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, poleHeight);
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.7,
    metalness: 0.5,
  });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.y = poleHeight / 2;
  pole.castShadow = true;
  trafficLightGroup.add(pole);

  // Light box
  const boxGeometry = new THREE.BoxGeometry(lightSize, lightSize * 3, lightSize);
  const boxMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.5,
    metalness: 0.7,
  });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.y = poleHeight + lightSize * 1.5;
  box.castShadow = true;
  trafficLightGroup.add(box);

  // Red light
  const redLightGeometry = new THREE.CircleGeometry(lightSize * 0.3, 16);
  const redLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.5,
  });
  const redLight = new THREE.Mesh(redLightGeometry, redLightMaterial);
  redLight.position.set(0, poleHeight + lightSize * 2.3, lightSize / 2 + 0.01);
  trafficLightGroup.add(redLight);

  // Yellow light
  const yellowLightGeometry = new THREE.CircleGeometry(lightSize * 0.3, 16);
  const yellowLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 0.2,
  });
  const yellowLight = new THREE.Mesh(yellowLightGeometry, yellowLightMaterial);
  yellowLight.position.set(0, poleHeight + lightSize * 1.5, lightSize / 2 + 0.01);
  trafficLightGroup.add(yellowLight);

  // Green light
  const greenLightGeometry = new THREE.CircleGeometry(lightSize * 0.3, 16);
  const greenLightMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    emissive: 0x00ff00,
    emissiveIntensity: 0.2,
  });
  const greenLight = new THREE.Mesh(greenLightGeometry, greenLightMaterial);
  greenLight.position.set(0, poleHeight + lightSize * 0.7, lightSize / 2 + 0.01);
  trafficLightGroup.add(greenLight);

  return trafficLightGroup;
}
