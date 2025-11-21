/**
 * Environment Generator
 * Handles generation of ground, roads, rivers, and bridges
 */

import * as THREE from 'three';
import { MAP_SIZE } from '../../shared/constants';

export interface RiverData {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface BridgeData {
  x: number;
  z: number;
  width: number;
  length: number;
  rotation: number;
}

export interface RoadSegment {
  start: { x: number; z: number };
  end: { x: number; z: number };
}

/**
 * Create ground plane
 */
export function createGround(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x3a5f3a, // Dark green grass
    roughness: 0.8,
    metalness: 0.2,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  return ground;
}

/**
 * Create river
 */
export function createRiver(riverWidth: number, riverDepth: number): {
  mesh: THREE.Mesh;
  data: RiverData;
} {
  const geometry = new THREE.PlaneGeometry(riverWidth, riverDepth);
  const material = new THREE.MeshStandardMaterial({
    color: 0x4a90e2, // Blue water
    roughness: 0.3,
    metalness: 0.7,
    transparent: true,
    opacity: 0.8,
  });
  const river = new THREE.Mesh(geometry, material);
  river.rotation.x = -Math.PI / 2;
  river.position.y = 0.1;
  river.receiveShadow = true;

  return {
    mesh: river,
    data: {
      x: 0,
      z: 0,
      width: riverWidth,
      depth: riverDepth,
    },
  };
}

/**
 * Create roads (grid pattern)
 */
export function createRoads(roadWidth: number, roadColor: number): {
  meshes: THREE.Mesh[];
  segments: RoadSegment[];
} {
  const roads: THREE.Mesh[] = [];
  const segments: RoadSegment[] = [];

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
    road.position.set(0, 0.05, z);
    road.receiveShadow = true;
    roads.push(road);

    // Add road segment
    segments.push({
      start: { x: -MAP_SIZE, z },
      end: { x: MAP_SIZE, z },
    });
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
    road.position.set(x, 0.05, 0);
    road.receiveShadow = true;
    roads.push(road);

    // Add road segment
    segments.push({
      start: { x, z: -MAP_SIZE },
      end: { x, z: MAP_SIZE },
    });
  }

  return { meshes: roads, segments };
}

/**
 * Create bridge over river
 */
export function createBridge(
  x: number,
  z: number,
  width: number,
  length: number,
  rotation: number
): { mesh: THREE.Mesh; data: BridgeData } {
  const geometry = new THREE.BoxGeometry(width, 0.5, length);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.8,
    metalness: 0.2,
  });
  const bridge = new THREE.Mesh(geometry, material);
  bridge.position.set(x, 0.3, z);
  bridge.rotation.y = rotation;
  bridge.castShadow = true;
  bridge.receiveShadow = true;

  return {
    mesh: bridge,
    data: {
      x,
      z,
      width,
      length,
      rotation,
    },
  };
}

/**
 * Create road markings (white lines)
 */
export function createRoadMarkings(roadWidth: number): THREE.Group {
  const markingsGroup = new THREE.Group();
  const lineWidth = 0.2;
  const lineLength = 3;
  const lineSpacing = 6;
  const lineMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.1,
  });

  // Horizontal road markings
  for (let i = -2; i <= 2; i++) {
    const z = i * 60;
    for (let x = -MAP_SIZE; x < MAP_SIZE; x += lineSpacing) {
      const lineGeometry = new THREE.PlaneGeometry(lineLength, lineWidth);
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.06, z);
      markingsGroup.add(line);
    }
  }

  // Vertical road markings
  for (let i = -2; i <= 2; i++) {
    const x = i * 60;
    for (let z = -MAP_SIZE; z < MAP_SIZE; z += lineSpacing) {
      const lineGeometry = new THREE.PlaneGeometry(lineWidth, lineLength);
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.06, z);
      markingsGroup.add(line);
    }
  }

  return markingsGroup;
}

/**
 * Create sidewalks along roads
 */
export function createSidewalks(roadWidth: number, sidewalkWidth: number): THREE.Mesh[] {
  const sidewalks: THREE.Mesh[] = [];
  const sidewalkColor = 0x999999;
  const sidewalkMaterial = new THREE.MeshStandardMaterial({
    color: sidewalkColor,
    roughness: 0.9,
    metalness: 0.1,
  });

  // Horizontal sidewalks
  for (let i = -2; i <= 2; i++) {
    const z = i * 60;
    
    // Left sidewalk
    const leftGeometry = new THREE.PlaneGeometry(MAP_SIZE * 2, sidewalkWidth);
    const leftSidewalk = new THREE.Mesh(leftGeometry, sidewalkMaterial);
    leftSidewalk.rotation.x = -Math.PI / 2;
    leftSidewalk.position.set(0, 0.04, z - roadWidth / 2 - sidewalkWidth / 2);
    leftSidewalk.receiveShadow = true;
    sidewalks.push(leftSidewalk);
    
    // Right sidewalk
    const rightGeometry = new THREE.PlaneGeometry(MAP_SIZE * 2, sidewalkWidth);
    const rightSidewalk = new THREE.Mesh(rightGeometry, sidewalkMaterial);
    rightSidewalk.rotation.x = -Math.PI / 2;
    rightSidewalk.position.set(0, 0.04, z + roadWidth / 2 + sidewalkWidth / 2);
    rightSidewalk.receiveShadow = true;
    sidewalks.push(rightSidewalk);
  }

  // Vertical sidewalks
  for (let i = -2; i <= 2; i++) {
    const x = i * 60;
    
    // Left sidewalk
    const leftGeometry = new THREE.PlaneGeometry(sidewalkWidth, MAP_SIZE * 2);
    const leftSidewalk = new THREE.Mesh(leftGeometry, sidewalkMaterial);
    leftSidewalk.rotation.x = -Math.PI / 2;
    leftSidewalk.position.set(x - roadWidth / 2 - sidewalkWidth / 2, 0.04, 0);
    leftSidewalk.receiveShadow = true;
    sidewalks.push(leftSidewalk);
    
    // Right sidewalk
    const rightGeometry = new THREE.PlaneGeometry(sidewalkWidth, MAP_SIZE * 2);
    const rightSidewalk = new THREE.Mesh(rightGeometry, sidewalkMaterial);
    rightSidewalk.rotation.x = -Math.PI / 2;
    rightSidewalk.position.set(x + roadWidth / 2 + sidewalkWidth / 2, 0.04, 0);
    rightSidewalk.receiveShadow = true;
    sidewalks.push(rightSidewalk);
  }

  return sidewalks;
}
