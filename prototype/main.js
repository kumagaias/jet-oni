import * as THREE from 'three';
import { i18n } from './i18n.js';

// Game state
const gameState = {
  isOni: false,
  jetpackFuel: 100,
  position: new THREE.Vector3(0, 2, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  rotation: 0,
  isClimbing: false,
  currentLadder: null,
  isDashing: false,
  survivedTime: 0, // Time survived as runner
  wasTagged: false, // Whether player was tagged this game
};

// Game statistics
const gameStats = {
  gameStartTime: 0,
  gameEnded: false,
  roundDuration: 180, // Default 3 minutes in seconds
  beaconActivated: false, // Track if beacon has been activated
  beaconEndTime: 0, // When beacon should disappear
  beaconChargeTime: 0, // Time when oni became oni (for charging)
  beaconReady: false, // Whether beacon ability is ready to use
  inLobby: false, // Whether in lobby waiting for game start
  isHost: false, // Whether player is the host
};

// AI Players
const aiPlayers = [];
let NUM_AI_PLAYERS = 3; // Default: 4 total players (1 human + 3 AI)

// Dev mode
let devMode = false;

// Input state
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false,
  shift: false,
};

// Constants
const MOVE_SPEED = 10;
const ONI_SPEED_MULTIPLIER = 1.5; // Oni moves 1.5x faster
const DASH_SPEED = 20; // 2x normal speed
const DASH_DRAIN_RATE = 25; // fuel drain per second while dashing
const JETPACK_POWER = 15;
const JETPACK_DRAIN_RATE = 30;
const JETPACK_RECHARGE_RATE = 20;
const GRAVITY = -20;
const GROUND_LEVEL = 1; // Lower to ground level
const WATER_LEVEL = 0.3; // River water level (lower than ground)
const MAP_SIZE = 200;
const CLIMB_SPEED = 5;

// Oni constants (for AI)
const ONI_MOVE_SPEED = MOVE_SPEED * ONI_SPEED_MULTIPLIER; // 15
const ONI_SEARCH_SPEED = 1; // Rotation speed when searching
const ONI_VISION_DISTANCE = 50; // How far oni can see
const ONI_VISION_ANGLE = Math.PI / 4; // 45 degree cone
const ONI_CHASE_SPEED = MOVE_SPEED * ONI_SPEED_MULTIPLIER; // 15

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

// Camera setup
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 10);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Increased from 0.6
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased from 0.8
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2);
const groundMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x4a4a4a,
  roughness: 0.8,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Player (simple capsule)
const playerGroup = new THREE.Group();

const playerGeometry = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.castShadow = true;
playerGroup.add(player);

// Player marker (always visible)
const playerMarkerGeometry = new THREE.ConeGeometry(0.4, 1.5, 8);
const playerMarkerMaterial = new THREE.MeshBasicMaterial({ 
  color: 0x00ff00,
  transparent: true,
  opacity: 0.9
});
const playerMarker = new THREE.Mesh(playerMarkerGeometry, playerMarkerMaterial);
playerMarker.position.y = 4;
playerMarker.visible = true; // Always visible
playerGroup.add(playerMarker);

// Player beacon (visible during last minute)
const beaconGeometry = new THREE.CylinderGeometry(0.1, 0.1, 50, 8);
const beaconMaterial = new THREE.MeshBasicMaterial({
  color: 0xffff00,
  transparent: true,
  opacity: 0.6,
  side: THREE.DoubleSide
});
const playerBeacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
playerBeacon.position.y = 25; // Center of the beam
playerBeacon.visible = false;
playerGroup.add(playerBeacon);

// Beacon glow effect
const beaconGlowGeometry = new THREE.SphereGeometry(1.5, 16, 16);
const beaconGlowMaterial = new THREE.MeshBasicMaterial({
  color: 0xffff00,
  transparent: true,
  opacity: 0.4
});
const playerBeaconGlow = new THREE.Mesh(beaconGlowGeometry, beaconGlowMaterial);
playerBeaconGlow.position.y = 3;
playerBeaconGlow.visible = false;
playerGroup.add(playerBeaconGlow);

playerGroup.position.copy(gameState.position);
scene.add(playerGroup);

// Function to create AI players
function createAIPlayers(count) {
  // Remove existing AI players
  for (const ai of aiPlayers) {
    scene.remove(ai.mesh);
  }
  aiPlayers.length = 0;
  
  // Create new AI players
  for (let i = 0; i < count; i++) {
  // Create AI group with body and head
  const aiGroup = new THREE.Group();
  
  // Body (capsule)
  const aiGeometry = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8);
  const aiMaterial = new THREE.MeshStandardMaterial({ color: 0x4488ff }); // Blue color for AI
  const aiBody = new THREE.Mesh(aiGeometry, aiMaterial);
  aiBody.castShadow = true;
  aiGroup.add(aiBody);
  
  // Head (sphere) to distinguish from pedestrians
  const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc00 }); // Yellow head
  const aiHead = new THREE.Mesh(headGeometry, headMaterial);
  aiHead.position.y = 1.5;
  aiHead.castShadow = true;
  aiGroup.add(aiHead);
  
  // AI marker (always visible)
  const markerGeometry = new THREE.ConeGeometry(0.4, 1.5, 8);
  const markerMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00,
    transparent: true,
    opacity: 0.9
  });
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.position.y = 4;
  marker.visible = true; // Always visible
  aiGroup.add(marker);
  
  // AI beacon (visible during last minute)
  const aiBeaconGeometry = new THREE.CylinderGeometry(0.1, 0.1, 50, 8);
  const aiBeaconMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  const aiBeacon = new THREE.Mesh(aiBeaconGeometry, aiBeaconMaterial);
  aiBeacon.position.y = 25;
  aiBeacon.visible = false;
  aiGroup.add(aiBeacon);
  
  // AI beacon glow
  const aiBeaconGlowGeometry = new THREE.SphereGeometry(1.5, 16, 16);
  const aiBeaconGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.4
  });
  const aiBeaconGlow = new THREE.Mesh(aiBeaconGlowGeometry, aiBeaconGlowMaterial);
  aiBeaconGlow.position.y = 3;
  aiBeaconGlow.visible = false;
  aiGroup.add(aiBeaconGlow);
  
  // Random spawn position
  const spawnX = (Math.random() - 0.5) * 100;
  const spawnZ = (Math.random() - 0.5) * 100;
  
  const aiState = {
    id: `ai_${i}`,
    mesh: aiGroup,
    body: aiBody,
    head: aiHead,
    marker: marker,
    beacon: aiBeacon,
    beaconGlow: aiBeaconGlow,
    position: new THREE.Vector3(spawnX, 2, spawnZ),
    velocity: new THREE.Vector3(0, 0, 0),
    rotation: Math.random() * Math.PI * 2,
    isOni: false,
    jetpackFuel: 100,
    isDashing: false,
    dashEndTime: 0,
    // AI specific
    target: null,
    searchRotation: 0,
    isChasing: false,
    nextActionTime: 0,
    nextJetpackTime: 0,
    nextDashTime: 0,
    // Stats
    survivedTime: 0,
    wasTagged: false,
  };
  
  aiGroup.position.copy(aiState.position);
  scene.add(aiGroup);
  
  aiPlayers.push(aiState);
  }
}

// Create initial AI players
createAIPlayers(NUM_AI_PLAYERS);

// Jetpack flame effect
const flameParticles = [];
const flameGroup = new THREE.Group();
scene.add(flameGroup);

function createFlameParticle() {
  const geometry = new THREE.SphereGeometry(0.15, 8, 8);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.8,
  });
  const particle = new THREE.Mesh(geometry, material);
  return particle;
}

// Pre-create flame particles
for (let i = 0; i < 20; i++) {
  const particle = createFlameParticle();
  particle.visible = false;
  particle.userData.velocity = new THREE.Vector3();
  particle.userData.life = 0;
  particle.userData.maxLife = 0.3;
  flameGroup.add(particle);
  flameParticles.push(particle);
}

// Dash effect particles
const dashParticles = [];
const dashGroup = new THREE.Group();
scene.add(dashGroup);

function createDashParticle() {
  const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.8);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ccff,
    transparent: true,
    opacity: 0.6,
  });
  const particle = new THREE.Mesh(geometry, material);
  return particle;
}

// Pre-create dash particles
for (let i = 0; i < 15; i++) {
  const particle = createDashParticle();
  particle.visible = false;
  particle.userData.velocity = new THREE.Vector3();
  particle.userData.life = 0;
  particle.userData.maxLife = 0.2;
  dashGroup.add(particle);
  dashParticles.push(particle);
}

// Generate city map
function generateCityMap() {
  const buildings = [];
  const occupiedAreas = []; // Track occupied spaces
  let towerData = null; // Initialize tower data
  
  // Helper function to check if area is occupied
  function isAreaOccupied(x, z, width, depth, margin = 2) {
    for (const area of occupiedAreas) {
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
  
  // First, create roads (random paths)
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.9,
  });
  
  const roadsData = [];
  const numRoads = 6;
  
  for (let i = 0; i < numRoads; i++) {
    const roadWidth = 12;
    const isVertical = Math.random() > 0.5;
    
    if (isVertical) {
      // Vertical road
      const roadX = (Math.random() - 0.5) * MAP_SIZE * 1.5;
      const roadGeometry = new THREE.PlaneGeometry(roadWidth, MAP_SIZE * 2);
      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(roadX, 0.05, 0);
      scene.add(road);
      
      // Mark as occupied
      occupiedAreas.push({
        x: roadX,
        z: 0,
        width: roadWidth,
        depth: MAP_SIZE * 2,
      });
      
      roadsData.push({
        x: roadX,
        width: roadWidth,
        direction: i % 2 === 0 ? 1 : -1,
        isVertical: true,
      });
    } else {
      // Horizontal road
      const roadZ = (Math.random() - 0.5) * MAP_SIZE * 1.5;
      const roadGeometry = new THREE.PlaneGeometry(MAP_SIZE * 2, roadWidth);
      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.05, roadZ);
      scene.add(road);
      
      // Mark as occupied
      occupiedAreas.push({
        x: 0,
        z: roadZ,
        width: MAP_SIZE * 2,
        depth: roadWidth,
      });
      
      roadsData.push({
        z: roadZ,
        width: roadWidth,
        direction: i % 2 === 0 ? 1 : -1,
        isVertical: false,
      });
    }
  }
  
  // Add river
  const riverWidth = 15;
  const riverX = (Math.random() - 0.5) * MAP_SIZE;
  const riverGeometry = new THREE.PlaneGeometry(riverWidth, MAP_SIZE * 2);
  const riverMaterial = new THREE.MeshStandardMaterial({
    color: 0x87ceeb, // Light sky blue
    roughness: 0.2,
    metalness: 0.3,
    transparent: true,
    opacity: 0.8,
  });
  const river = new THREE.Mesh(riverGeometry, riverMaterial);
  river.rotation.x = -Math.PI / 2;
  river.position.set(riverX, 0.2, 0); // Slightly above ground to be visible
  river.receiveShadow = true;
  scene.add(river);
  
  // Mark river as occupied (but not blocking)
  const riverData = {
    x: riverX,
    z: 0,
    width: riverWidth,
    depth: MAP_SIZE * 2,
  };
  
  // Add bridges where roads cross the river
  const bridgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.8,
  });
  
  const bridgesData = [];
  
  // River is vertical (along Z axis, at position riverX on X axis, width riverWidth)
  // Vertical roads run along Z axis at position road.x
  // Horizontal roads run along X axis at position road.z
  
  for (const road of roadsData) {
    // Only horizontal roads can cross the vertical river
    if (!road.isVertical) {
      // Horizontal road runs along X axis at Z position road.z
      // River is at X position riverX
      // Road spans from -MAP_SIZE to +MAP_SIZE on X axis
      // So it will always cross the river if the river is within that range
      
      // Add bridge where horizontal road crosses vertical river
      const bridgeWidth = riverWidth + 4; // X direction (across river)
      const bridgeDepth = road.width + 2;  // Z direction (along road)
      const bridgeHeight = 0.5;
      const bridgeGeometry = new THREE.BoxGeometry(bridgeWidth, bridgeHeight, bridgeDepth);
      const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
      bridge.position.set(riverX, 0.3, road.z);
      bridge.castShadow = true;
      bridge.receiveShadow = true;
      scene.add(bridge);
      
      // Store bridge data for roof landing
      bridgesData.push({
        userData: {
          collidable: false, // Don't block horizontal movement
          width: bridgeWidth,
          height: bridgeHeight + 0.3, // Top surface at 0.8
          depth: bridgeDepth,
        },
        position: { x: riverX, y: 0.3, z: road.z },
      });
      
      // Add bridge railings
      const railingGeometry = new THREE.BoxGeometry(riverWidth + 4, 1, 0.2);
      const railingMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
      
      const railing1 = new THREE.Mesh(railingGeometry, railingMaterial);
      railing1.position.set(riverX, 0.8, road.z - road.width / 2 - 1);
      scene.add(railing1);
      
      const railing2 = new THREE.Mesh(railingGeometry, railingMaterial);
      railing2.position.set(riverX, 0.8, road.z + road.width / 2 + 1);
      scene.add(railing2);
    }
  }
  
  // Don't add river to occupied areas so buildings can be near it
  occupiedAreas.push(riverData);
  
  // Now add buildings avoiding roads and river
  const numBuildings = 60; // Increased from 30
  let attempts = 0;
  const maxAttempts = 200; // Increased attempts
  
  for (let i = 0; i < numBuildings && attempts < maxAttempts; attempts++) {
    const width = 5 + Math.random() * 10;
    const height = 10 + Math.random() * 30;
    const depth = 5 + Math.random() * 10;
    
    const x = (Math.random() - 0.5) * MAP_SIZE * 1.8;
    const z = (Math.random() - 0.5) * MAP_SIZE * 1.8;
    
    // Check if position is clear
    if (!isAreaOccupied(x, z, width, depth, 3)) {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0, 0, 0.3 + Math.random() * 0.3),
        roughness: 0.7,
      });
      const building = new THREE.Mesh(geometry, material);
      
      building.position.set(x, height / 2, z);
      building.castShadow = true;
      building.receiveShadow = true;
      
      building.userData.collidable = true;
      building.userData.width = width;
      building.userData.height = height;
      building.userData.depth = depth;
      
      scene.add(building);
      buildings.push(building);
      
      // Mark as occupied
      occupiedAreas.push({ x, z, width, depth });
      i++;
    }
  }
  
  // Add landmark tower (Eiffel Tower-like structure)
  const towerX = (Math.random() - 0.5) * MAP_SIZE * 0.8;
  const towerZ = (Math.random() - 0.5) * MAP_SIZE * 0.8;
  const towerHeight = 80;
  
  // Check if tower position is clear
  if (!isAreaOccupied(towerX, towerZ, 15, 15, 5)) {
    const towerGroup = new THREE.Group();
    const towerMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      metalness: 0.3,
      roughness: 0.7,
    });
    
    // Base platform
    const baseGeometry = new THREE.CylinderGeometry(8, 10, 2, 8);
    const base = new THREE.Mesh(baseGeometry, towerMaterial);
    base.position.y = 1;
    base.castShadow = true;
    towerGroup.add(base);
    
    // Tower structure (tapered)
    const numSegments = 8;
    for (let i = 0; i < numSegments; i++) {
      const segmentHeight = towerHeight / numSegments;
      const bottomRadius = 7 - (i * 0.8);
      const topRadius = 7 - ((i + 1) * 0.8);
      
      const segmentGeometry = new THREE.CylinderGeometry(
        topRadius,
        bottomRadius,
        segmentHeight,
        8
      );
      const segment = new THREE.Mesh(segmentGeometry, towerMaterial);
      segment.position.y = 2 + (i * segmentHeight) + (segmentHeight / 2);
      segment.castShadow = true;
      towerGroup.add(segment);
      
      // Add horizontal rings
      if (i % 2 === 0) {
        const ringGeometry = new THREE.TorusGeometry(bottomRadius + 0.3, 0.2, 8, 16);
        const ring = new THREE.Mesh(ringGeometry, towerMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 2 + (i * segmentHeight);
        ring.castShadow = true;
        towerGroup.add(ring);
      }
    }
    
    // Spire at top
    const spireGeometry = new THREE.ConeGeometry(1.5, 8, 8);
    const spire = new THREE.Mesh(spireGeometry, towerMaterial);
    spire.position.y = towerHeight + 6;
    spire.castShadow = true;
    towerGroup.add(spire);
    
    // Observation deck
    const deckGeometry = new THREE.CylinderGeometry(4, 4, 3, 8);
    const deckMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.7,
    });
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.y = towerHeight * 0.7;
    deck.castShadow = true;
    towerGroup.add(deck);
    
    // Add platforms at different heights for players to land on
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.5,
      roughness: 0.5,
    });
    
    const platformHeights = [20, 40, 56]; // Heights for platforms
    for (const height of platformHeights) {
      const platformRadius = 7 - (height / towerHeight) * 6;
      const platformGeometry = new THREE.CylinderGeometry(platformRadius + 1, platformRadius + 1, 0.5, 8);
      const platform = new THREE.Mesh(platformGeometry, platformMaterial);
      platform.position.y = height;
      platform.castShadow = true;
      platform.receiveShadow = true;
      towerGroup.add(platform);
    }
    
    towerGroup.position.set(towerX, 0, towerZ);
    scene.add(towerGroup);
    
    // Add collision for tower base
    buildings.push({
      userData: {
        collidable: true,
        radius: 10,
        height: towerHeight,
        isCylinder: true,
      },
      position: { x: towerX, y: towerHeight / 2, z: towerZ },
    });
    
    // Store tower data for platform landing
    const towerData = {
      x: towerX,
      z: towerZ,
      platforms: platformHeights.map((h, i) => ({
        height: h,
        radius: 7 - (h / towerHeight) * 6 + 1,
      })),
    };
    
    // Mark tower area as occupied
    occupiedAreas.push({ x: towerX, z: towerZ, width: 20, depth: 20 });
  }
  
  // Add houses avoiding occupied areas
  const numHouses = 40; // Increased from 20
  attempts = 0;
  
  for (let i = 0; i < numHouses && attempts < maxAttempts; attempts++) {
    const width = 4 + Math.random() * 3;
    const height = 4 + Math.random() * 2;
    const depth = 4 + Math.random() * 3;
    
    const x = (Math.random() - 0.5) * MAP_SIZE * 1.8;
    const z = (Math.random() - 0.5) * MAP_SIZE * 1.8;
    
    if (!isAreaOccupied(x, z, width, depth, 2)) {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random() * 0.1, 0.5, 0.6),
        roughness: 0.8,
      });
      const house = new THREE.Mesh(geometry, material);
      
      house.position.set(x, height / 2, z);
      house.castShadow = true;
      house.receiveShadow = true;
      
      house.userData.collidable = true;
      house.userData.width = width;
      house.userData.height = height;
      house.userData.depth = depth;
      
      scene.add(house);
      buildings.push(house);
      occupiedAreas.push({ x, z, width, depth });
      i++;
    }
  }
  
  // Add utility poles avoiding occupied areas
  const numPoles = 15;
  attempts = 0;
  
  for (let i = 0; i < numPoles && attempts < maxAttempts; attempts++) {
    const x = (Math.random() - 0.5) * MAP_SIZE * 1.8;
    const z = (Math.random() - 0.5) * MAP_SIZE * 1.8;
    
    if (!isAreaOccupied(x, z, 0.5, 0.5, 1)) {
      const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
      const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      
      pole.position.set(x, 4, z);
      pole.castShadow = true;
      
      pole.userData.collidable = true;
      pole.userData.radius = 0.2;
      pole.userData.height = 8;
      pole.userData.isCylinder = true;
      
      scene.add(pole);
      buildings.push(pole);
      occupiedAreas.push({ x, z, width: 0.5, depth: 0.5 });
      i++;
    }
  }
  
  // Add trees avoiding occupied areas
  const numTrees = 30;
  attempts = 0;
  
  for (let i = 0; i < numTrees && attempts < maxAttempts; attempts++) {
    const x = (Math.random() - 0.5) * MAP_SIZE * 1.8;
    const z = (Math.random() - 0.5) * MAP_SIZE * 1.8;
    
    if (!isAreaOccupied(x, z, 1, 1, 1)) {
      const treeGroup = new THREE.Group();
      
      const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 2;
      trunk.castShadow = true;
      treeGroup.add(trunk);
      
      const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
      
      for (let j = 0; j < 3; j++) {
        const foliageGeometry = new THREE.SphereGeometry(1.5 + Math.random() * 0.5, 8, 8);
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.set(
          (Math.random() - 0.5) * 0.8,
          4 + j * 1.2,
          (Math.random() - 0.5) * 0.8
        );
        foliage.castShadow = true;
        treeGroup.add(foliage);
      }
      
      treeGroup.position.set(x, 0, z);
      scene.add(treeGroup);
      
      const treeCollision = {
        userData: {
          collidable: true,
          radius: 0.35, // Slightly smaller than trunk for easier navigation
          height: 4,
          isCylinder: true,
        },
        position: { x, y: 2, z },
      };
      buildings.push(treeCollision);
      occupiedAreas.push({ x, z, width: 0.7, depth: 0.7 }); // Smaller occupied area
      i++;
    }
  }
  
  // Add ladders to some buildings
  const laddersData = [];
  const numLadders = 15;
  for (let i = 0; i < numLadders; i++) {
    // Pick a random building (not a pole)
    const buildingIndex = Math.floor(Math.random() * (numBuildings + numHouses));
    const targetBuilding = buildings[buildingIndex];
    
    if (targetBuilding && !targetBuilding.userData.isCylinder) {
      const buildingWidth = targetBuilding.userData.width;
      const buildingDepth = targetBuilding.userData.depth;
      const buildingHeight = targetBuilding.userData.height;
      
      // Create ladder on one side of the building
      const side = Math.floor(Math.random() * 4); // 0=front, 1=back, 2=left, 3=right
      let ladderX = targetBuilding.position.x;
      let ladderZ = targetBuilding.position.z;
      
      if (side === 0) ladderZ += buildingDepth / 2;
      else if (side === 1) ladderZ -= buildingDepth / 2;
      else if (side === 2) ladderX -= buildingWidth / 2;
      else ladderX += buildingWidth / 2;
      
      // Create ladder visual
      const ladderGroup = new THREE.Group();
      
      // Vertical rails
      const railGeometry = new THREE.BoxGeometry(0.1, buildingHeight, 0.1);
      const railMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      
      const rail1 = new THREE.Mesh(railGeometry, railMaterial);
      rail1.position.set(-0.2, buildingHeight / 2, 0);
      ladderGroup.add(rail1);
      
      const rail2 = new THREE.Mesh(railGeometry, railMaterial);
      rail2.position.set(0.2, buildingHeight / 2, 0);
      ladderGroup.add(rail2);
      
      // Rungs
      const numRungs = Math.floor(buildingHeight / 1.5);
      const rungGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.1);
      for (let r = 0; r < numRungs; r++) {
        const rung = new THREE.Mesh(rungGeometry, railMaterial);
        rung.position.set(0, (r + 0.5) * (buildingHeight / numRungs), 0);
        ladderGroup.add(rung);
      }
      
      ladderGroup.position.set(ladderX, 0, ladderZ);
      
      // Rotate ladder to face outward
      if (side === 0 || side === 1) {
        ladderGroup.rotation.y = 0;
      } else {
        ladderGroup.rotation.y = Math.PI / 2;
      }
      
      scene.add(ladderGroup);
      
      // Store ladder data for climbing detection
      laddersData.push({
        x: ladderX,
        z: ladderZ,
        height: buildingHeight,
        radius: 0.8, // Detection radius
      });
    }
  }

  // Create cars
  const carsData = [];
  const numCars = 20;
  
  // Filter roads to avoid cars in river
  // Only use vertical roads that are far from river, or horizontal roads
  const safeRoads = roadsData.filter(road => {
    if (road.isVertical) {
      // Vertical road must be far from river
      const distFromRiver = Math.abs(road.x - riverX);
      return distFromRiver > riverWidth / 2 + road.width / 2 + 5;
    }
    return true; // All horizontal roads are safe (they cross river on bridges)
  });
  
  for (let i = 0; i < numCars; i++) {
    const road = safeRoads.length > 0 
      ? safeRoads[Math.floor(Math.random() * safeRoads.length)]
      : roadsData[Math.floor(Math.random() * roadsData.length)];
    
    // Car body
    const carGroup = new THREE.Group();
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    carGroup.add(body);
    
    // Car roof
    const roofGeometry = new THREE.BoxGeometry(1.6, 0.8, 2);
    const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
    roof.position.set(0, 1.4, -0.3);
    roof.castShadow = true;
    carGroup.add(roof);
    
    // Position car on road based on road type
    let carY = 0.5; // Default height on road
    
    if (road.isVertical) {
      const startZ = (Math.random() - 0.5) * MAP_SIZE * 2;
      
      // Vertical roads run parallel to river
      carGroup.position.set(road.x, carY, startZ);
      if (road.direction === -1) {
        carGroup.rotation.y = Math.PI;
      }
    } else {
      const startX = (Math.random() - 0.5) * MAP_SIZE * 2;
      
      // Check if car is on bridge (crossing river)
      const dx = Math.abs(startX - riverX);
      if (dx < riverWidth / 2 + 5) {
        carY = 0.8; // Higher on bridge
      }
      
      carGroup.position.set(startX, carY, road.z);
      if (road.direction === 1) {
        carGroup.rotation.y = Math.PI / 2;
      } else {
        carGroup.rotation.y = -Math.PI / 2;
      }
    }
    
    scene.add(carGroup);
    
    carsData.push({
      mesh: carGroup,
      road: road,
      speed: 15 + Math.random() * 10,
      riverX: riverX,
      riverWidth: riverWidth,
    });
  }
  
  // Create pedestrians
  const pedestriansData = [];
  const numPedestrians = 30;
  
  let createdPedestrians = 0;
  let totalAttempts = 0;
  const maxTotalAttempts = 100;
  
  while (createdPedestrians < numPedestrians && totalAttempts < maxTotalAttempts) {
    totalAttempts++;
    
    // Random position on sidewalk (near roads but not on them)
    let pedX, pedZ, rotation;
    const nearRoad = roadsData[Math.floor(Math.random() * roadsData.length)];
    
    if (nearRoad.isVertical) {
      // Walk parallel to vertical road
      pedX = nearRoad.x + (Math.random() > 0.5 ? 1 : -1) * (nearRoad.width / 2 + 2 + Math.random() * 3);
      pedZ = (Math.random() - 0.5) * MAP_SIZE * 2;
      rotation = Math.random() > 0.5 ? 0 : Math.PI;
    } else {
      // Walk parallel to horizontal road
      pedX = (Math.random() - 0.5) * MAP_SIZE * 2;
      pedZ = nearRoad.z + (Math.random() > 0.5 ? 1 : -1) * (nearRoad.width / 2 + 2 + Math.random() * 3);
      rotation = Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
    }
    
    // Check if position is in river
    const testPos = new THREE.Vector3(pedX, 0, pedZ);
    if (isInWater(testPos, riverData)) {
      continue; // Try another position
    }
    
    // Good position found, create pedestrian
    const pedGroup = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.6, 0.4),
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.9;
    body.castShadow = true;
    pedGroup.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdbac, // Skin tone
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.7;
    head.castShadow = true;
    pedGroup.add(head);
    
    pedGroup.position.set(pedX, 0, pedZ);
    pedGroup.rotation.y = rotation;
    scene.add(pedGroup);
    
    pedestriansData.push({
      mesh: pedGroup,
      road: nearRoad,
      speed: 2 + Math.random() * 2,
      walkTime: Math.random() * Math.PI * 2, // For walking animation
    });
    
    createdPedestrians++;
  }
  
  return { buildings, ladders: laddersData, cars: carsData, river: riverData, pedestrians: pedestriansData, tower: towerData, bridges: bridgesData };
}

// Collision detection
function checkCollision(position, buildings) {
  const playerRadius = 0.5;
  const playerHeight = 2.0; // Player capsule height
  
  for (const building of buildings) {
    if (!building.userData.collidable) continue;
    
    if (building.userData.isCylinder) {
      // Cylinder collision (utility poles)
      const dx = position.x - building.position.x;
      const dz = position.z - building.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      const minDistance = playerRadius + building.userData.radius;
      
      if (distance < minDistance && position.y < building.userData.height) {
        return {
          collided: true,
          normal: new THREE.Vector3(dx, 0, dz).normalize(),
        };
      }
    } else {
      // Box collision (buildings and houses)
      const halfWidth = building.userData.width / 2;
      const halfDepth = building.userData.depth / 2;
      const buildingTop = building.userData.height;
      
      const dx = Math.abs(position.x - building.position.x);
      const dz = Math.abs(position.z - building.position.z);
      
      // Check if player is within building's XZ bounds
      if (dx < halfWidth + playerRadius && dz < halfDepth + playerRadius) {
        // Player is within building footprint
        const playerBottom = position.y - playerHeight / 2;
        const playerTop = position.y + playerHeight / 2;
        const roofThreshold = 1.5; // Increased margin to prevent falling through
        
        // If player is on or above the roof, no horizontal collision
        if (playerBottom >= buildingTop - roofThreshold) {
          // Player is on the roof, no collision
          continue;
        }
        
        // If player is below the roof, check for collision
        if (playerTop > 0) {
          // Calculate collision normal
          const overlapX = (halfWidth + playerRadius) - dx;
          const overlapZ = (halfDepth + playerRadius) - dz;
          
          let normal;
          if (overlapX < overlapZ) {
            normal = new THREE.Vector3(
              position.x > building.position.x ? 1 : -1,
              0,
              0
            );
          } else {
            normal = new THREE.Vector3(
              0,
              0,
              position.z > building.position.z ? 1 : -1
            );
          }
          
          return { collided: true, normal, buildingTop };
        }
      }
    }
  }
  
  return { collided: false };
}

// Check if player should land on building roof
function checkRoofLanding(position, velocity, buildings) {
  const playerRadius = 0.5;
  const playerHalfHeight = 1.0; // Half of player capsule height
  const landingThreshold = 1.5; // Distance above roof to trigger landing
  let highestRoof = null;
  
  for (const building of buildings) {
    if (!building.userData.collidable || building.userData.isCylinder) continue;
    
    const halfWidth = building.userData.width / 2;
    const halfDepth = building.userData.depth / 2;
    const buildingTop = building.userData.height;
    const roofSurface = buildingTop + playerHalfHeight; // Player center should be above roof
    
    const dx = Math.abs(position.x - building.position.x);
    const dz = Math.abs(position.z - building.position.z);
    
    // Check if player is within building footprint
    if (dx < halfWidth + playerRadius && dz < halfDepth + playerRadius) {
      // Player is above building and close to roof
      if (position.y >= roofSurface - 0.2 && position.y < roofSurface + landingThreshold) {
        // Keep track of highest roof
        if (highestRoof === null || roofSurface > highestRoof) {
          highestRoof = roofSurface;
        }
      }
    }
  }
  
  return highestRoof;
}

// Check if player is near a ladder
function checkNearLadder(position, ladders) {
  for (const ladder of ladders) {
    const dx = position.x - ladder.x;
    const dz = position.z - ladder.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Check if player is within horizontal range and vertical range of ladder
    if (distance < ladder.radius && position.y >= GROUND_LEVEL - 0.5 && position.y < ladder.height + 3) {
      return ladder;
    }
  }
  return null;
}

// Check if player is in water
function isInWater(position, river) {
  if (!river) return false;
  
  const dx = Math.abs(position.x - river.x);
  const dz = Math.abs(position.z - river.z);
  
  return dx < river.width / 2 && dz < river.depth / 2;
}

// Check if player is spotted by any oni
function isSpottedByOni(playerPos, aiPlayers) {
  // Check if any AI oni can see the player
  for (const ai of aiPlayers) {
    if (!ai.isOni) continue;
    
    const distToPlayer = ai.position.distanceTo(playerPos);
    
    // Check distance
    if (distToPlayer > ONI_VISION_DISTANCE) continue;
    
    // Calculate direction from oni to player
    const directionToPlayer = new THREE.Vector3();
    directionToPlayer.subVectors(playerPos, ai.position);
    directionToPlayer.y = 0; // Ignore vertical component
    directionToPlayer.normalize();
    
    // Calculate oni's facing direction
    const oniFacing = new THREE.Vector3(
      Math.sin(ai.rotation),
      0,
      Math.cos(ai.rotation)
    );
    
    // Calculate angle between oni's facing direction and direction to player
    const dotProduct = oniFacing.dot(directionToPlayer);
    const angle = Math.acos(dotProduct);
    
    // Check if player is within vision cone
    if (angle < ONI_VISION_ANGLE) {
      return true;
    }
  }
  
  return false;
}

// Check if player should land on tower platform
function checkTowerPlatformLanding(position, velocity, tower) {
  if (!tower) return null;
  
  const dx = position.x - tower.x;
  const dz = position.z - tower.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  
  for (const platform of tower.platforms) {
    if (distance < platform.radius && 
        position.y > platform.height - 0.5 && 
        position.y < platform.height + 1.5 &&
        velocity.y <= 0) {
      return platform.height;
    }
  }
  
  return null;
}

// Check collision with cars
function checkCarCollision(position, cars) {
  const playerRadius = 0.5;
  const carWidth = 2;
  const carLength = 4;
  
  for (const car of cars) {
    const carPos = car.mesh.position;
    
    // Simple box collision
    const dx = Math.abs(position.x - carPos.x);
    const dz = Math.abs(position.z - carPos.z);
    
    // Check if player is at ground level (not flying over car)
    if (position.y < 4 && dx < (carWidth / 2 + playerRadius) && dz < (carLength / 2 + playerRadius)) {
      return car;
    }
  }
  
  return null;
}

// Check collision with pedestrians
function checkPedestrianCollision(position, pedestrians) {
  const playerRadius = 0.5;
  const pedRadius = 0.4;
  const collisionRadius = playerRadius + pedRadius;
  
  for (const ped of pedestrians) {
    const pedPos = ped.mesh.position;
    
    // Check if player is at ground level
    if (position.y > 3) continue;
    
    // Circle collision
    const dx = position.x - pedPos.x;
    const dz = position.z - pedPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < collisionRadius) {
      return ped;
    }
  }
  
  return null;
}

const { buildings, ladders, cars, river, pedestrians, tower, bridges } = generateCityMap();

// Find safe spawn position for player
function findSafeSpawnPosition(buildings) {
  const playerRadius = 0.5;
  const maxAttempts = 50;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = (Math.random() - 0.5) * 40; // Spawn in center area
    const z = (Math.random() - 0.5) * 40;
    const testPos = new THREE.Vector3(x, GROUND_LEVEL, z);
    
    let isSafe = true;
    for (const building of buildings) {
      if (!building.userData.collidable) continue;
      
      if (building.userData.isCylinder) {
        const dx = testPos.x - building.position.x;
        const dz = testPos.z - building.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < playerRadius + building.userData.radius + 2) {
          isSafe = false;
          break;
        }
      } else {
        const halfWidth = building.userData.width / 2;
        const halfDepth = building.userData.depth / 2;
        const dx = Math.abs(testPos.x - building.position.x);
        const dz = Math.abs(testPos.z - building.position.z);
        
        if (dx < halfWidth + playerRadius + 2 && dz < halfDepth + playerRadius + 2) {
          isSafe = false;
          break;
        }
      }
    }
    
    if (isSafe) {
      return testPos;
    }
  }
  
  // Fallback to high position if no safe ground found
  return new THREE.Vector3(0, 20, 0);
}

// Set player to safe spawn position
const safeSpawn = findSafeSpawnPosition(buildings);
gameState.position.copy(safeSpawn);
player.position.copy(safeSpawn);

// Statistics system
const stats = {
  gamesPlayed: parseInt(localStorage.getItem('jetoni_games_played') || '0'),
  wins: parseInt(localStorage.getItem('jetoni_wins') || '0'),
  losses: parseInt(localStorage.getItem('jetoni_losses') || '0'),
};

function saveStats() {
  localStorage.setItem('jetoni_games_played', stats.gamesPlayed.toString());
  localStorage.setItem('jetoni_wins', stats.wins.toString());
  localStorage.setItem('jetoni_losses', stats.losses.toString());
}

function updateStatsDisplay() {
  document.getElementById('stat-games-played').textContent = stats.gamesPlayed;
  document.getElementById('stat-wins').textContent = stats.wins;
  document.getElementById('stat-losses').textContent = stats.losses;
  
  const winRate = stats.gamesPlayed > 0 
    ? Math.round((stats.wins / stats.gamesPlayed) * 100) 
    : 0;
  document.getElementById('stat-win-rate').textContent = `${winRate}%`;
}

function recordGameResult(escaped) {
  stats.gamesPlayed++;
  if (escaped) {
    stats.wins++;
  } else {
    stats.losses++;
  }
  saveStats();
}

function resetStats() {
  if (confirm('Are you sure you want to reset all statistics?')) {
    stats.gamesPlayed = 0;
    stats.wins = 0;
    stats.losses = 0;
    saveStats();
    updateStatsDisplay();
  }
}

// Title screen handling
const titleScreen = document.getElementById('title-screen');
const startGameBtn = document.getElementById('start-game');
const createGameBtn = document.getElementById('create-game');
const viewStatsBtn = document.getElementById('view-stats');
const statsScreen = document.getElementById('stats-screen');
const backFromStatsBtn = document.getElementById('back-from-stats');
const resetStatsBtn = document.getElementById('reset-stats');
const gameSettings = document.getElementById('game-settings');
const gameList = document.getElementById('game-list');
const gamesContainer = document.getElementById('games-container');
const backFromListBtn = document.getElementById('back-from-list');
const startWithSettingsBtn = document.getElementById('start-with-settings');
const backToMenuBtn = document.getElementById('back-to-menu');
let gameStarted = false;

// Game settings
const gameConfig = {
  players: 4, // Total players (1 human + AI)
  time: 3, // Default 3 minutes
  rounds: 1,
};

// Mock game rooms data (in real app, this would come from server)
const mockGameRooms = [
  { id: 1, name: 'Room 1', currentPlayers: 3, maxPlayers: 10, rounds: 3, time: 3 },
  { id: 2, name: 'Room 2', currentPlayers: 8, maxPlayers: 10, rounds: 5, time: 5 },
  { id: 3, name: 'Room 3', currentPlayers: 10, maxPlayers: 10, rounds: 1, time: 1 },
  { id: 4, name: 'Room 4', currentPlayers: 5, maxPlayers: 8, rounds: 3, time: 3 },
];

// Handle option button clicks
document.querySelectorAll('.option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const setting = btn.dataset.setting;
    const value = parseInt(btn.dataset.value);
    
    // Remove selected class from siblings
    document.querySelectorAll(`[data-setting="${setting}"]`).forEach(b => {
      b.classList.remove('selected');
    });
    
    // Add selected class to clicked button
    btn.classList.add('selected');
    
    // Update config
    gameConfig[setting] = value;
    
    // If players setting changed, update AI count
    if (setting === 'players') {
      const aiCount = value - 1; // 1 human player + (value - 1) AI
      NUM_AI_PLAYERS = aiCount;
      createAIPlayers(aiCount);
      console.log(`Updated to ${value} total players (1 human + ${aiCount} AI)`);
    }
  });
});

startGameBtn.addEventListener('click', () => {
  // Show game list
  startGameBtn.style.display = 'none';
  createGameBtn.style.display = 'none';
  viewStatsBtn.style.display = 'none';
  gameList.classList.add('active');
  
  // Populate game list
  displayGameList();
});

function displayGameList() {
  gamesContainer.innerHTML = '';
  
  mockGameRooms.forEach(room => {
    const gameItem = document.createElement('div');
    gameItem.className = 'game-item';
    
    const isFull = room.currentPlayers >= room.maxPlayers;
    
    gameItem.innerHTML = `
      <div class="game-info">
        <h3>${room.name}</h3>
        <p>人数: ${room.currentPlayers}/${room.maxPlayers}</p>
        <p>ラウンド: ${room.rounds} | 時間: ${room.time}分</p>
      </div>
      <button class="join-button" data-room-id="${room.id}" ${isFull ? 'disabled' : ''}>
        ${isFull ? '満員' : '参加'}
      </button>
    `;
    
    gamesContainer.appendChild(gameItem);
  });
  
  // Add event listeners to join buttons
  document.querySelectorAll('.join-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const roomId = e.target.dataset.roomId;
      joinGame(roomId);
    });
  });
}

function joinGame(roomId) {
  console.log('Joining game room:', roomId);
  titleScreen.classList.add('hidden');
  gameStarted = true;
  
  // Assign random oni
  assignRandomOni();
  
  renderer.domElement.requestPointerLock();
}

function assignRandomOni() {
  // Reset all players
  gameState.isOni = false;
  gameState.wasTagged = false;
  gameState.survivedTime = 0;
  aiPlayers.forEach(ai => {
    ai.isOni = false;
    ai.wasTagged = false;
    ai.survivedTime = 0;
  });
  
  // Randomly select oni from all players (human + AI)
  const allPlayers = [{ type: 'human', ref: gameState }, ...aiPlayers.map(ai => ({ type: 'ai', ref: ai }))];
  const randomIndex = Math.floor(Math.random() * allPlayers.length);
  const selectedPlayer = allPlayers[randomIndex];
  
  selectedPlayer.ref.isOni = true;
  
  if (selectedPlayer.type === 'human') {
    console.log('You are the ONI!');
  } else {
    console.log(`AI ${selectedPlayer.ref.id} is the ONI!`);
  }
  
  // Reset game stats
  const currentTime = performance.now() / 1000;
  gameStats.gameStartTime = currentTime;
  gameStats.gameEnded = false;
  gameStats.beaconActivated = false;
  gameStats.beaconEndTime = 0;
  gameStats.beaconChargeTime = currentTime; // Start charging beacon
  gameStats.beaconReady = false;
}

// Show toast message
function showToast(message, type = 'default') {
  const toast = document.getElementById('toast-message');
  toast.textContent = message;
  toast.className = 'show';
  
  if (type === 'oni-became') {
    toast.classList.add('oni-became');
  } else if (type === 'oni-tagged') {
    toast.classList.add('oni-tagged');
  }
  
  // Hide after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.className = '';
    }, 500);
  }, 5000);
}

// Check if game has ended (all players are oni)
function checkGameEnd() {
  if (gameStats.gameEnded) return false;
  
  const allOni = gameState.isOni && aiPlayers.every(ai => ai.isOni);
  if (allOni) {
    gameStats.gameEnded = true;
    showGameEndScreen();
    return true;
  }
  return false;
}

// Show game end screen with results
function showGameEndScreen() {
  const gameEndScreen = document.getElementById('game-end-screen');
  const resultsList = document.getElementById('results-list');
  
  // Calculate survival times
  const currentTime = performance.now() / 1000;
  const gameTime = currentTime - gameStats.gameStartTime;
  
  // Collect all players with their stats
  const allPlayers = [
    {
      name: 'You',
      isHuman: true,
      survivedTime: gameState.wasTagged ? gameState.survivedTime : gameTime,
      wasTagged: gameState.wasTagged,
      wasInitialOni: !gameState.wasTagged && gameState.isOni,
    },
    ...aiPlayers.map(ai => ({
      name: ai.id,
      isHuman: false,
      survivedTime: ai.wasTagged ? ai.survivedTime : gameTime,
      wasTagged: ai.wasTagged,
      wasInitialOni: !ai.wasTagged && ai.isOni,
    }))
  ];
  
  // Determine win condition
  // Win: At least one player escaped (not tagged and not initial oni)
  // Loss: All players became oni
  const anyoneEscaped = allPlayers.some(p => !p.wasTagged && !p.wasInitialOni);
  const allBecameOni = allPlayers.every(p => p.wasTagged || p.wasInitialOni);
  
  // Record stats for human player
  const humanPlayer = allPlayers.find(p => p.isHuman);
  if (humanPlayer) {
    // Win if anyone escaped, loss if all became oni
    const playerWon = anyoneEscaped;
    recordGameResult(playerWon);
  }
  
  // Sort by survival time (longest first)
  allPlayers.sort((a, b) => b.survivedTime - a.survivedTime);
  
  // Generate results HTML with win/loss message
  let resultMessage = '';
  if (anyoneEscaped) {
    resultMessage = '<div style="color: #00ff00; font-size: 28px; font-weight: bold; margin-bottom: 20px; text-align: center;">🏆 VICTORY! Someone Escaped! 🏆</div>';
  } else if (allBecameOni) {
    resultMessage = '<div style="color: #ff6666; font-size: 28px; font-weight: bold; margin-bottom: 20px; text-align: center;">👹 DEFEAT! All Became Oni! 👹</div>';
  }
  
  resultsList.innerHTML = resultMessage + allPlayers.map((player, index) => {
    const isWinner = index === 0;
    const minutes = Math.floor(player.survivedTime / 60);
    const seconds = Math.floor(player.survivedTime % 60);
    const timeStr = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
    
    let statusText = '';
    if (player.wasInitialOni) {
      statusText = '最初の鬼';
    } else if (player.wasTagged) {
      statusText = `生存: ${timeStr}`;
    } else {
      statusText = `生存: ${timeStr} (逃げ切り!)`;
    }
    
    return `
      <div class="player-result ${isWinner ? 'winner' : ''}">
        <div class="player-name">
          ${isWinner ? '<span class="winner-crown">👑</span>' : ''}
          <span>${player.name}</span>
        </div>
        <div class="player-stats">
          <div>${statusText}</div>
        </div>
      </div>
    `;
  }).join('');
  
  gameEndScreen.classList.add('active');
}

backFromListBtn.addEventListener('click', () => {
  gameList.classList.remove('active');
  startGameBtn.style.display = 'block';
  createGameBtn.style.display = 'block';
  viewStatsBtn.style.display = 'block';
});

createGameBtn.addEventListener('click', () => {
  // Show settings panel
  startGameBtn.style.display = 'none';
  createGameBtn.style.display = 'none';
  viewStatsBtn.style.display = 'none';
  gameSettings.classList.add('active');
});

viewStatsBtn.addEventListener('click', () => {
  // Show stats screen
  startGameBtn.style.display = 'none';
  createGameBtn.style.display = 'none';
  viewStatsBtn.style.display = 'none';
  statsScreen.classList.add('active');
  updateStatsDisplay();
});

backFromStatsBtn.addEventListener('click', () => {
  // Hide stats screen
  statsScreen.classList.remove('active');
  startGameBtn.style.display = 'block';
  createGameBtn.style.display = 'block';
  viewStatsBtn.style.display = 'block';
});

resetStatsBtn.addEventListener('click', () => {
  resetStats();
});

// Language switcher
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const lang = btn.getAttribute('data-lang');
    i18n.setLanguage(lang);
    
    // Update active state
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

startWithSettingsBtn.addEventListener('click', () => {
  console.log('Starting game with settings:', gameConfig);
  titleScreen.classList.add('hidden');
  
  // Enter lobby mode
  gameStats.inLobby = true;
  gameStats.isHost = true;
  gameStarted = false; // Not started yet, in lobby
  
  // Set round duration based on config (convert minutes to seconds)
  gameStats.roundDuration = gameConfig.time * 60;
  
  // Show lobby message
  const lobbyMessage = document.getElementById('lobby-message');
  const lobbyPlayerCount = document.getElementById('lobby-player-count');
  lobbyMessage.classList.add('active');
  
  // Calculate current players (1 human + AI)
  const totalPlayers = 1 + aiPlayers.length;
  const targetPlayers = gameConfig.players;
  lobbyPlayerCount.textContent = `Players: ${totalPlayers} / ${targetPlayers}`;
  
  renderer.domElement.requestPointerLock();
});

backToMenuBtn.addEventListener('click', () => {
  // Hide settings panel
  gameSettings.classList.remove('active');
  startGameBtn.style.display = 'block';
  createGameBtn.style.display = 'block';
  viewStatsBtn.style.display = 'block';
});

// Return to menu from game end screen
const returnToMenuBtn = document.getElementById('return-to-menu');
returnToMenuBtn.addEventListener('click', () => {
  // Hide game end screen
  const gameEndScreen = document.getElementById('game-end-screen');
  gameEndScreen.classList.remove('active');
  
  // Show title screen
  const titleScreen = document.getElementById('title-screen');
  titleScreen.classList.remove('hidden');
  
  // Reset game state
  gameStarted = false;
  gameStats.gameEnded = false;
  
  // Exit pointer lock
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  
  // Reset player position
  gameState.position.set(0, 2, 0);
  gameState.velocity.set(0, 0, 0);
  gameState.isOni = false;
  gameState.wasTagged = false;
  gameState.survivedTime = 0;
  
  // Reset AI players
  aiPlayers.forEach((ai, i) => {
    const spawnX = (Math.random() - 0.5) * 100;
    const spawnZ = (Math.random() - 0.5) * 100;
    ai.position.set(spawnX, 2, spawnZ);
    ai.velocity.set(0, 0, 0);
    ai.isOni = false;
    ai.wasTagged = false;
    ai.survivedTime = 0;
  });
});

// Input handling
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  
  // Toggle dev mode with F3 (prevent default browser behavior)
  if (e.key === 'F3') {
    e.preventDefault();
    devMode = !devMode;
    console.log('Dev mode:', devMode ? 'ON' : 'OFF');
    return;
  }
  
  // Start game from lobby (host only)
  if (key === ' ' && gameStats.inLobby && gameStats.isHost) {
    e.preventDefault();
    startGameFromLobby();
    return;
  }
  
  if (key === ' ') {
    keys.space = true;
  } else if (key === 'shift') {
    keys.shift = true;
  } else if (key in keys) {
    keys[key] = true;
  }
});

function startGameFromLobby() {
  // Hide lobby message
  const lobbyMessage = document.getElementById('lobby-message');
  lobbyMessage.classList.remove('active');
  
  // Exit lobby mode
  gameStats.inLobby = false;
  gameStarted = true;
  
  // Fill remaining slots with AI if needed
  const currentPlayers = 1 + aiPlayers.length;
  const targetPlayers = gameConfig.players;
  if (currentPlayers < targetPlayers) {
    const aiNeeded = targetPlayers - currentPlayers;
    const newAICount = aiPlayers.length + aiNeeded;
    createAIPlayers(newAICount);
    console.log(`Added ${aiNeeded} AI players to reach ${targetPlayers} total players`);
  }
  
  // Assign random oni
  assignRandomOni();
  
  console.log('Game started from lobby!');
}

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key === ' ') {
    keys.space = false;
  } else if (key === 'shift') {
    keys.shift = false;
  } else if (key in keys) {
    keys[key] = false;
  }
});

// Dash/Jetpack button controls (changes based on oni status)
const dashButton = document.getElementById('dash-button');

dashButton.addEventListener('mousedown', (e) => {
  e.preventDefault();
  if (gameState.isOni) {
    keys.space = true; // Jetpack for oni
  } else {
    keys.shift = true; // Dash for runner
  }
});

dashButton.addEventListener('mouseup', (e) => {
  e.preventDefault();
  if (gameState.isOni) {
    keys.space = false;
  } else {
    keys.shift = false;
  }
});

dashButton.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (gameState.isOni) {
    keys.space = true;
  } else {
    keys.shift = true;
  }
}, { passive: false });

dashButton.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (gameState.isOni) {
    keys.space = false;
  } else {
    keys.shift = false;
  }
}, { passive: false });

// Beacon button controls (only for oni)
const beaconButton = document.getElementById('beacon-button');

beaconButton.addEventListener('click', (e) => {
  e.preventDefault();
  if (gameState.isOni && gameStats.beaconReady && !gameStats.beaconActivated) {
    // Activate beacon
    const currentTime = performance.now() / 1000;
    gameStats.beaconActivated = true;
    gameStats.beaconEndTime = currentTime + 10; // Show for 10 seconds
    gameStats.beaconReady = false;
    gameStats.beaconChargeTime = currentTime; // Start recharging
    
    // Show activation effect
    showBeaconActivationEffect();
    
    console.log('Beacon activated by oni! All runners are visible for 10 seconds!');
  }
});

beaconButton.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (gameState.isOni && gameStats.beaconReady && !gameStats.beaconActivated) {
    const currentTime = performance.now() / 1000;
    gameStats.beaconActivated = true;
    gameStats.beaconEndTime = currentTime + 10;
    gameStats.beaconReady = false;
    gameStats.beaconChargeTime = currentTime;
    
    // Show activation effect
    showBeaconActivationEffect();
    
    console.log('Beacon activated by oni! All runners are visible for 10 seconds!');
  }
}, { passive: false });

// Show beacon activation effect
function showBeaconActivationEffect() {
  const effect = document.getElementById('beacon-activation-effect');
  const icon = document.getElementById('beacon-activation-icon');
  const waves = document.getElementById('beacon-waves');
  
  // Show effects
  effect.classList.add('active');
  icon.classList.add('active');
  waves.classList.add('active');
  
  // Remove after animation
  setTimeout(() => {
    effect.classList.remove('active');
  }, 500);
  
  setTimeout(() => {
    icon.classList.remove('active');
  }, 1000);
  
  setTimeout(() => {
    waves.classList.remove('active');
  }, 1500);
}

// Mouse look
let mouseX = 0;
let mouseY = 0;
let isPointerLocked = false;

renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = document.pointerLockElement === renderer.domElement;
});

document.addEventListener('mousemove', (e) => {
  if (isPointerLocked) {
    mouseX -= e.movementX * 0.002; // Inverted horizontal movement
    mouseY -= e.movementY * 0.002;
    mouseY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseY));
  }
});

// Update UI
function updateUI() {
  document.getElementById('position').textContent = 
    `${gameState.position.x.toFixed(1)}, ${gameState.position.y.toFixed(1)}, ${gameState.position.z.toFixed(1)}`;
  
  const speed = Math.sqrt(
    gameState.velocity.x ** 2 + 
    gameState.velocity.z ** 2
  );
  document.getElementById('speed').textContent = speed.toFixed(1);
  
  // Update ability gauge
  const abilityFill = document.getElementById('ability-fill');
  abilityFill.style.width = `${gameState.jetpackFuel}%`;
  
  // Update button based on oni status
  if (gameState.isOni) {
    // Update gauge color for jetpack
    abilityFill.style.background = 'linear-gradient(90deg, #ff6600, #ff9900)';
  } else {
    // Update gauge color for dash
    abilityFill.style.background = 'linear-gradient(90deg, #00ff88, #00ccff)';
  }
  
  if (gameState.isOni) {
    // Oni mode: Jetpack button
    dashButton.textContent = '🔥';
    dashButton.classList.add('oni-mode');
    
    // Disable if no fuel
    if (gameState.jetpackFuel <= 0) {
      dashButton.classList.add('disabled');
    } else {
      dashButton.classList.remove('disabled');
    }
    
    // Visual feedback for jetpack (space key pressed)
    if (keys.space && gameState.jetpackFuel > 0) {
      dashButton.style.transform = 'scale(0.95)';
      dashButton.style.boxShadow = '0 0 20px rgba(255, 102, 0, 0.8)';
    } else {
      dashButton.style.transform = '';
      dashButton.style.boxShadow = '';
    }
  } else {
    // Runner mode: Dash button
    dashButton.textContent = '⚡';
    dashButton.classList.remove('oni-mode');
    
    // Disable if no fuel
    if (gameState.jetpackFuel <= 0) {
      dashButton.classList.add('disabled');
    } else {
      dashButton.classList.remove('disabled');
    }
    
    // Visual feedback for dashing
    if (gameState.isDashing) {
      dashButton.style.transform = 'scale(0.95)';
      dashButton.style.boxShadow = '0 0 20px rgba(0, 204, 255, 0.8)';
    } else {
      dashButton.style.transform = '';
      dashButton.style.boxShadow = '';
    }
  }
  
  const statusEl = document.getElementById('status');
  const oniOverlay = document.getElementById('oni-overlay');
  
  if (gameState.isOni) {
    statusEl.textContent = i18n.t('oni');
    statusEl.className = 'oni';
    player.material.color.setHex(0xff0000);
    oniOverlay.style.display = 'block'; // Show red overlay
  } else {
    statusEl.textContent = i18n.t('runner');
    statusEl.className = 'runner';
    player.material.color.setHex(0x00ff00);
    oniOverlay.style.display = 'none'; // Hide red overlay
  }
  
  // Update timer
  const timerEl = document.getElementById('timer');
  if (gameStarted && !gameStats.gameEnded) {
    const currentTime = performance.now() / 1000;
    const elapsedTime = currentTime - gameStats.gameStartTime;
    const remainingTime = Math.max(0, gameStats.roundDuration - elapsedTime);
    
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Change color based on remaining time
    if (remainingTime <= 30) {
      timerEl.className = 'critical';
    } else if (remainingTime <= 60) {
      timerEl.className = 'warning';
    } else {
      timerEl.className = '';
    }
    
    // Update beacon charge (3 minutes = 180 seconds to fully charge)
    if (gameState.isOni && !gameStats.beaconReady) {
      const chargeElapsed = currentTime - gameStats.beaconChargeTime;
      const chargeProgress = Math.min(1, chargeElapsed / 180); // 3 minutes
      
      if (chargeProgress >= 1) {
        gameStats.beaconReady = true;
      }
      
      // Update beacon button charge indicator
      const beaconChargeEl = document.getElementById('beacon-charge');
      beaconChargeEl.style.height = `${chargeProgress * 100}%`;
    }
    
    // Update beacon button visibility and state
    if (gameState.isOni) {
      beaconButton.classList.add('visible');
      
      if (gameStats.beaconReady && !gameStats.beaconActivated) {
        beaconButton.classList.remove('disabled');
        beaconButton.classList.add('ready');
      } else {
        beaconButton.classList.add('disabled');
        beaconButton.classList.remove('ready');
      }
    } else {
      beaconButton.classList.remove('visible');
    }
    
    // Update beacon visibility
    const beaconActive = gameStats.beaconActivated && currentTime < gameStats.beaconEndTime;
    
    // Reset beacon activation after it ends
    if (gameStats.beaconActivated && currentTime >= gameStats.beaconEndTime) {
      gameStats.beaconActivated = false;
    }
    
    // Show player beacon (only if not oni)
    if (!gameState.isOni && beaconActive) {
      playerBeacon.visible = true;
      playerBeaconGlow.visible = true;
      // Pulsing animation
      const pulseScale = 1 + Math.sin(currentTime * 5) * 0.2;
      playerBeaconGlow.scale.set(pulseScale, pulseScale, pulseScale);
    } else {
      playerBeacon.visible = false;
      playerBeaconGlow.visible = false;
    }
    
    // Show AI beacons (only if not oni)
    for (const ai of aiPlayers) {
      if (!ai.isOni && beaconActive) {
        ai.beacon.visible = true;
        ai.beaconGlow.visible = true;
        // Pulsing animation
        const pulseScale = 1 + Math.sin(currentTime * 5) * 0.2;
        ai.beaconGlow.scale.set(pulseScale, pulseScale, pulseScale);
      } else {
        ai.beacon.visible = false;
        ai.beaconGlow.visible = false;
      }
    }
    
    // Update player count
    const oniCountEl = document.getElementById('oni-count');
    const runnerCountEl = document.getElementById('runner-count');
    
    let oniCount = gameState.isOni ? 1 : 0;
    let runnerCount = gameState.isOni ? 0 : 1;
    
    for (const ai of aiPlayers) {
      if (ai.isOni) {
        oniCount++;
      } else {
        runnerCount++;
      }
    }
    
    oniCountEl.textContent = oniCount;
    runnerCountEl.textContent = runnerCount;
    
    // End game when time runs out
    if (remainingTime <= 0 && !gameStats.gameEnded) {
      gameStats.gameEnded = true;
      showGameEndScreen();
    }
  }
  
  // Update spotted indicator (only for runners)
  const spottedIndicator = document.getElementById('spotted-indicator');
  if (!gameState.isOni && gameStarted && !gameStats.gameEnded) {
    const isSpotted = isSpottedByOni(gameState.position, aiPlayers);
    if (isSpotted) {
      spottedIndicator.classList.add('visible');
    } else {
      spottedIndicator.classList.remove('visible');
    }
  } else {
    spottedIndicator.classList.remove('visible');
  }
  
  // Update oni info and AI players (only visible in dev mode)
  const hudElement = document.getElementById('hud');
  const oniInfoElement = document.getElementById('oni-info');
  const aiPlayersInfoElement = document.getElementById('ai-players-info');
  
  if (devMode) {
    hudElement.style.display = 'block';
    oniInfoElement.style.display = 'block';
    aiPlayersInfoElement.style.display = 'block';
    
    // Find current oni
    let oniPlayer = null;
    let oniName = 'None';
    let oniPos = '-';
    
    if (gameState.isOni) {
      oniName = 'You';
      oniPos = `${gameState.position.x.toFixed(1)}, ${gameState.position.y.toFixed(1)}, ${gameState.position.z.toFixed(1)}`;
    } else {
      for (const ai of aiPlayers) {
        if (ai.isOni) {
          oniName = ai.id;
          oniPos = `${ai.position.x.toFixed(1)}, ${ai.position.y.toFixed(1)}, ${ai.position.z.toFixed(1)}`;
          break;
        }
      }
    }
    
    document.getElementById('oni-name').textContent = oniName;
    document.getElementById('oni-position').textContent = oniPos;
    
    // Update AI players list
    const aiListElement = document.getElementById('ai-list');
    let aiListHTML = '';
    
    aiPlayers.forEach((ai, index) => {
      const role = ai.isOni ? '👹' : '🏃';
      const color = ai.isOni ? '#ff6666' : '#66ff66';
      aiListHTML += `<div style="color: ${color}; font-size: 12px; margin: 2px 0;">
        ${role} ${ai.id}: (${ai.position.x.toFixed(0)}, ${ai.position.y.toFixed(0)}, ${ai.position.z.toFixed(0)})
      </div>`;
    });
    
    aiListElement.innerHTML = aiListHTML;
  } else {
    // Hide debug info in normal mode
    oniInfoElement.style.display = 'none';
    aiPlayersInfoElement.style.display = 'none';
  }
}

// Game loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const deltaTime = clock.getDelta();
  
  // In lobby: allow movement but no game logic
  if (gameStats.inLobby) {
    // Basic movement in lobby
    const moveDirection = new THREE.Vector3();
    if (keys.w) moveDirection.z -= 1;
    if (keys.s) moveDirection.z += 1;
    if (keys.a) moveDirection.x -= 1;
    if (keys.d) moveDirection.x += 1;
    
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
      gameState.velocity.x = moveDirection.x * MOVE_SPEED;
      gameState.velocity.z = moveDirection.z * MOVE_SPEED;
    } else {
      gameState.velocity.x *= 0.85;
      gameState.velocity.z *= 0.85;
    }
    
    // Apply gravity
    gameState.velocity.y += GRAVITY * deltaTime;
    
    // Update position
    gameState.position.x += gameState.velocity.x * deltaTime;
    gameState.position.y += gameState.velocity.y * deltaTime;
    gameState.position.z += gameState.velocity.z * deltaTime;
    
    // Ground collision
    if (gameState.position.y < GROUND_LEVEL) {
      gameState.position.y = GROUND_LEVEL;
      gameState.velocity.y = 0;
    }
    
    // Update player mesh
    playerGroup.position.copy(gameState.position);
    playerGroup.rotation.y = mouseX;
    
    // Update camera (first person)
    camera.position.copy(gameState.position);
    camera.position.y += 1.5;
    camera.rotation.y = mouseX;
    camera.rotation.x = mouseY;
    camera.rotation.z = 0;
    
    renderer.render(scene, camera);
    return;
  }
  
  // Don't update game logic if not started or game ended
  if (!gameStarted || gameStats.gameEnded) {
    renderer.render(scene, camera);
    return;
  }
  
  // Check if near ladder
  const nearLadder = checkNearLadder(gameState.position, ladders);
  
  // Movement
  const moveDirection = new THREE.Vector3();
  
  if (keys.w) moveDirection.z -= 1;
  if (keys.s) moveDirection.z += 1;
  if (keys.a) moveDirection.x -= 1;
  if (keys.d) moveDirection.x += 1;
  
  // Ladder climbing
  // Exit climbing when reaching ground
  if (gameState.isClimbing && gameState.position.y <= GROUND_LEVEL + 0.5) {
    gameState.isClimbing = false;
    gameState.currentLadder = null;
    // Push player slightly away from ladder when exiting at ground
    if (gameState.currentLadder) {
      const awayX = gameState.position.x - gameState.currentLadder.x;
      const awayZ = gameState.position.z - gameState.currentLadder.z;
      const dist = Math.sqrt(awayX * awayX + awayZ * awayZ);
      if (dist > 0) {
        gameState.position.x += (awayX / dist) * 1.5;
        gameState.position.z += (awayZ / dist) * 1.5;
      }
    }
  }
  
  // Exit climbing when reaching top of ladder
  if (gameState.isClimbing && gameState.currentLadder && gameState.position.y >= gameState.currentLadder.height + 1.5) {
    gameState.isClimbing = false;
    const exitLadder = gameState.currentLadder;
    gameState.currentLadder = null;
    // Push player slightly away from ladder when exiting at top
    const awayX = gameState.position.x - exitLadder.x;
    const awayZ = gameState.position.z - exitLadder.z;
    const dist = Math.sqrt(awayX * awayX + awayZ * awayZ);
    if (dist > 0) {
      gameState.position.x += (awayX / dist) * 1.5;
      gameState.position.z += (awayZ / dist) * 1.5;
    }
  }
  
  if (nearLadder && (keys.w || keys.s) && !gameState.isClimbing) {
    // Start climbing only if not already on ground trying to go down
    if (!(keys.s && gameState.position.y <= GROUND_LEVEL + 0.5)) {
      gameState.isClimbing = true;
      gameState.currentLadder = nearLadder;
    }
  } else if (!nearLadder && gameState.isClimbing) {
    // Exit climbing if moved away from ladder (player pressed A or D)
    gameState.isClimbing = false;
    gameState.currentLadder = null;
  }
  
  if (gameState.isClimbing && gameState.currentLadder) {
    // Climbing mode
    gameState.velocity.x = 0;
    gameState.velocity.z = 0;
    
    if (keys.w && gameState.position.y < gameState.currentLadder.height + 2) {
      gameState.velocity.y = CLIMB_SPEED;
    } else if (keys.s && gameState.position.y > GROUND_LEVEL + 0.5) {
      gameState.velocity.y = -CLIMB_SPEED;
    } else {
      gameState.velocity.y = 0;
    }
    
    // Snap to ladder position
    gameState.position.x += (gameState.currentLadder.x - gameState.position.x) * 0.1;
    gameState.position.z += (gameState.currentLadder.z - gameState.position.z) * 0.1;
  } else {
    // Dash while holding shift (oni cannot dash)
    if (keys.shift && moveDirection.length() > 0 && !gameState.isOni && gameState.jetpackFuel > 0) {
      gameState.isDashing = true;
      // Drain fuel while dashing
      gameState.jetpackFuel = Math.max(0, gameState.jetpackFuel - DASH_DRAIN_RATE * deltaTime);
    } else {
      gameState.isDashing = false;
    }
    
    // Spawn dash particles when dashing
    if (gameState.isDashing && Math.random() > 0.3) {
      const particle = dashParticles.find(p => !p.visible);
      if (particle) {
        particle.visible = true;
        particle.position.copy(gameState.position);
        particle.position.y += 0.5; // Center of player
        
        // Position behind player based on movement direction
        const moveDir = new THREE.Vector3(gameState.velocity.x, 0, gameState.velocity.z);
        if (moveDir.length() > 0) {
          moveDir.normalize();
          particle.position.x -= moveDir.x * 1.5;
          particle.position.z -= moveDir.z * 1.5;
          
          // Rotate particle to face movement direction
          particle.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        }
        
        // Random offset
        particle.position.x += (Math.random() - 0.5) * 0.5;
        particle.position.z += (Math.random() - 0.5) * 0.5;
        
        particle.userData.velocity.set(0, 0, 0);
        particle.userData.life = particle.userData.maxLife;
        
        // Cyan to white gradient
        const brightness = 0.5 + Math.random() * 0.5;
        particle.material.color.setHSL(0.5, 0.8, brightness);
      }
    }
    
    // Normal movement with smooth speed transition
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
      
      // Oni moves 1.5x faster
      const baseSpeed = gameState.isOni ? MOVE_SPEED * ONI_SPEED_MULTIPLIER : MOVE_SPEED;
      const targetSpeed = gameState.isDashing ? DASH_SPEED : baseSpeed;
      const targetVelocityX = moveDirection.x * targetSpeed;
      const targetVelocityZ = moveDirection.z * targetSpeed;
      
      // Smooth interpolation for natural speed transition
      const lerpFactor = gameState.isDashing ? 0.3 : 0.15; // Faster acceleration when dashing, slower deceleration
      gameState.velocity.x += (targetVelocityX - gameState.velocity.x) * lerpFactor;
      gameState.velocity.z += (targetVelocityZ - gameState.velocity.z) * lerpFactor;
    } else {
      gameState.velocity.x *= 0.9;
      gameState.velocity.z *= 0.9;
    }
  }
  
  // Jetpack
  const isGrounded = gameState.position.y <= GROUND_LEVEL;
  const isOnRoof = checkRoofLanding(gameState.position, { y: -0.1 }, buildings) !== null;
  const isOnBridgeSurface = checkRoofLanding(gameState.position, { y: -0.1 }, bridges) !== null;
  const isOnSurface = isGrounded || isOnRoof || isOnBridgeSurface;
  
  // Jump or Jetpack based on oni status
  if (keys.space && !gameState.isClimbing) {
    if (gameState.isOni && gameState.jetpackFuel > 0) {
      // Oni can use jetpack (continuous flight with fuel consumption)
      gameState.velocity.y = JETPACK_POWER;
      gameState.jetpackFuel = Math.max(0, gameState.jetpackFuel - JETPACK_DRAIN_RATE * deltaTime);
    } else if (!gameState.isOni && isOnSurface) {
      // Runner can only jump when on surface (no fuel cost)
      gameState.velocity.y = JETPACK_POWER * 0.7;
    }
  }
  
  if (!gameState.isClimbing) {
    // Apply gravity (not when climbing)
    gameState.velocity.y += GRAVITY * deltaTime;
    
    // Recharge fuel based on oni status
    if (gameState.isOni) {
      // Oni: recharge when on surface (even while moving)
      if (isOnSurface) {
        gameState.jetpackFuel = Math.min(100, gameState.jetpackFuel + JETPACK_RECHARGE_RATE * deltaTime);
      }
    } else {
      // Runner: recharge only when on surface AND stationary
      const horizontalSpeed = Math.sqrt(gameState.velocity.x ** 2 + gameState.velocity.z ** 2);
      const isStationary = horizontalSpeed < 0.5;
      
      if (isOnSurface && isStationary) {
        gameState.jetpackFuel = Math.min(100, gameState.jetpackFuel + JETPACK_RECHARGE_RATE * deltaTime);
      }
    }
  }
  
  // Update flame particles
  for (const particle of flameParticles) {
    if (particle.visible) {
      particle.userData.life -= deltaTime;
      
      if (particle.userData.life <= 0) {
        particle.visible = false;
      } else {
        // Update position
        particle.position.x += particle.userData.velocity.x * deltaTime;
        particle.position.y += particle.userData.velocity.y * deltaTime;
        particle.position.z += particle.userData.velocity.z * deltaTime;
        
        // Fade out
        const lifeRatio = particle.userData.life / particle.userData.maxLife;
        particle.material.opacity = lifeRatio * 0.8;
        particle.scale.setScalar(0.5 + lifeRatio * 0.5);
      }
    }
  }
  
  // Update dash particles
  for (const particle of dashParticles) {
    if (particle.visible) {
      particle.userData.life -= deltaTime;
      
      if (particle.userData.life <= 0) {
        particle.visible = false;
      } else {
        // Fade out and shrink
        const lifeRatio = particle.userData.life / particle.userData.maxLife;
        particle.material.opacity = lifeRatio * 0.6;
        particle.scale.set(1, 1, 1 + (1 - lifeRatio) * 2); // Stretch backwards
      }
    }
  }
  
  // Store old position for collision resolution
  const oldPosition = gameState.position.clone();
  
  // Update position
  gameState.position.x += gameState.velocity.x * deltaTime;
  gameState.position.y += gameState.velocity.y * deltaTime;
  gameState.position.z += gameState.velocity.z * deltaTime;
  
  // Check collision with buildings (walls)
  const collision = checkCollision(gameState.position, buildings);
  if (collision.collided) {
    // Push player out of collision
    gameState.position.x = oldPosition.x;
    gameState.position.z = oldPosition.z;
    
    // Slide along wall
    const slideVelocity = new THREE.Vector3(
      gameState.velocity.x,
      0,
      gameState.velocity.z
    );
    const dot = slideVelocity.dot(collision.normal);
    slideVelocity.sub(collision.normal.multiplyScalar(dot));
    
    gameState.position.x += slideVelocity.x * deltaTime;
    gameState.position.z += slideVelocity.z * deltaTime;
    
    // Check again after sliding
    const slideCollision = checkCollision(gameState.position, buildings);
    if (slideCollision.collided) {
      gameState.position.x = oldPosition.x;
      gameState.position.z = oldPosition.z;
    }
  }
  
  // Check for roof landing
  const roofHeight = checkRoofLanding(gameState.position, gameState.velocity, buildings);
  if (roofHeight !== null) {
    // If player is falling and close to roof, snap to roof
    if (gameState.velocity.y <= 0 && gameState.position.y < roofHeight + 2) {
      gameState.position.y = roofHeight;
      gameState.velocity.y = 0;
    }
    // If player is below roof level (somehow got inside), push them up
    else if (gameState.position.y < roofHeight - 0.5) {
      gameState.position.y = roofHeight;
      gameState.velocity.y = 0;
    }
  }
  
  // Check for tower platform landing
  const towerPlatformHeight = checkTowerPlatformLanding(gameState.position, gameState.velocity, tower);
  if (towerPlatformHeight !== null && gameState.velocity.y <= 0) {
    gameState.position.y = towerPlatformHeight;
    gameState.velocity.y = 0;
  }
  
  // Check for bridge landing with more lenient detection
  let isOnBridge = false;
  let bridgeHeight = null;
  
  for (const bridge of bridges) {
    if (!bridge.userData) continue;
    
    const halfWidth = bridge.userData.width / 2;
    const halfDepth = bridge.userData.depth / 2;
    const bridgeTop = bridge.userData.height;
    
    const dx = Math.abs(gameState.position.x - bridge.position.x);
    const dz = Math.abs(gameState.position.z - bridge.position.z);
    
    // Check if player is within bridge footprint (with margin)
    if (dx < halfWidth + 1 && dz < halfDepth + 1) {
      // Check if player is at bridge level (more lenient range)
      if (gameState.position.y >= bridgeTop - 1 && gameState.position.y <= bridgeTop + 2) {
        isOnBridge = true;
        bridgeHeight = bridgeTop + 1; // Player center height on bridge
        break;
      }
    }
  }
  
  if (isOnBridge && gameState.velocity.y <= 0) {
    gameState.position.y = bridgeHeight;
    gameState.velocity.y = 0;
  }
  
  // Ground and water collision (skip if on bridge)
  if (!isOnBridge) {
    const inWater = isInWater(gameState.position, river);
    const floorLevel = inWater ? WATER_LEVEL : GROUND_LEVEL;
    
    if (gameState.position.y < floorLevel) {
      gameState.position.y = floorLevel;
      gameState.velocity.y = 0;
    }
    
    // Slow movement in water
    if (inWater && gameState.position.y < GROUND_LEVEL) {
      gameState.velocity.x *= 0.5;
      gameState.velocity.z *= 0.5;
    }
  }
  
  // Check car collision
  const carHit = checkCarCollision(gameState.position, cars);
  if (carHit) {
    // Push player back
    gameState.position.x = oldPosition.x;
    gameState.position.z = oldPosition.z;
    
    // Add knockback effect
    const carPos = carHit.mesh.position;
    const knockbackDir = new THREE.Vector3(
      gameState.position.x - carPos.x,
      0,
      gameState.position.z - carPos.z
    ).normalize();
    
    gameState.velocity.x = knockbackDir.x * 15;
    gameState.velocity.z = knockbackDir.z * 15;
    gameState.velocity.y = 5; // Bounce up
    
    // Flash player red briefly
    player.material.color.setHex(0xff0000);
    setTimeout(() => {
      if (!gameState.isOni) {
        player.material.color.setHex(0x00ff00);
      }
    }, 200);
  }
  
  // Check pedestrian collision
  const pedHit = checkPedestrianCollision(gameState.position, pedestrians);
  if (pedHit) {
    // Push player back slightly
    const pedPos = pedHit.mesh.position;
    const pushDir = new THREE.Vector3(
      gameState.position.x - pedPos.x,
      0,
      gameState.position.z - pedPos.z
    ).normalize();
    
    gameState.position.x = pedPos.x + pushDir.x * 1;
    gameState.position.z = pedPos.z + pushDir.z * 1;
    
    // Push pedestrian away
    pedHit.mesh.position.x -= pushDir.x * 0.5;
    pedHit.mesh.position.z -= pushDir.z * 0.5;
  }
  
  // Map boundaries
  const boundary = MAP_SIZE;
  gameState.position.x = Math.max(-boundary, Math.min(boundary, gameState.position.x));
  gameState.position.z = Math.max(-boundary, Math.min(boundary, gameState.position.z));
  
  // Update player mesh
  playerGroup.position.copy(gameState.position);
  playerGroup.rotation.y = mouseX;
  
  // Update player marker visibility and color
  const playerSpeed = Math.sqrt(gameState.velocity.x ** 2 + gameState.velocity.z ** 2);
  const isPlayerMoving = playerSpeed > 0.5;
  
  // Always show marker
  playerMarker.visible = true;
  
  // Update marker color and opacity based on oni status and movement
  if (gameState.isOni) {
    playerMarkerMaterial.color.setHex(0xff0000); // Red for oni
    playerMarkerMaterial.opacity = 1.0; // Fully visible
  } else {
    playerMarkerMaterial.color.setHex(0x00ff00); // Green for runner
    // Fade when stationary to indicate they can recharge
    playerMarkerMaterial.opacity = isPlayerMoving ? 0.9 : 0.5;
  }
  
  // Rotate marker
  playerMarker.rotation.y += deltaTime * 3;
  
  // Update camera - Switch between first person and third person
  if (gameState.isClimbing) {
    // Third person view when climbing
    const cameraDistance = 8;
    const cameraHeightOffset = 2; // Camera slightly above player's feet
    
    // Position camera behind the player at a fixed relative height
    const targetCameraPos = new THREE.Vector3();
    targetCameraPos.x = gameState.position.x - Math.sin(mouseX) * cameraDistance;
    targetCameraPos.z = gameState.position.z - Math.cos(mouseX) * cameraDistance;
    targetCameraPos.y = gameState.position.y + cameraHeightOffset;
    
    camera.position.copy(targetCameraPos);
    
    // Look at player's center (slightly above their position)
    const lookAtPoint = new THREE.Vector3(
      gameState.position.x,
      gameState.position.y + 1,
      gameState.position.z
    );
    
    // Calculate direction to player
    const lookDirection = new THREE.Vector3();
    lookDirection.subVectors(lookAtPoint, camera.position);
    lookDirection.normalize();
    
    // Set camera rotation manually to avoid gimbal lock
    camera.rotation.x = Math.atan2(lookDirection.y, Math.sqrt(lookDirection.x ** 2 + lookDirection.z ** 2));
    camera.rotation.y = Math.atan2(lookDirection.x, lookDirection.z);
    camera.rotation.z = 0; // Keep camera upright
    
    // Show player model when climbing
    player.visible = true;
  } else {
    // First person view when not climbing
    const targetCameraPos = gameState.position.clone();
    targetCameraPos.y += 1.5; // Eye level
    
    // Check if camera would be inside a building
    let cameraInsideBuilding = false;
    for (const building of buildings) {
      if (building.userData && building.userData.collidable) {
        const pos = building.userData.position || building.position;
        const size = building.userData.size || { x: 10, y: 20, z: 10 };
        
        // Check if camera is inside building bounds
        const dx = Math.abs(targetCameraPos.x - pos.x);
        const dy = Math.abs(targetCameraPos.y - pos.y);
        const dz = Math.abs(targetCameraPos.z - pos.z);
        
        if (dx < size.x / 2 && dy < size.y / 2 && dz < size.z / 2) {
          cameraInsideBuilding = true;
          break;
        }
      }
    }
    
    // If camera is inside building, lower it to ground level
    if (cameraInsideBuilding) {
      targetCameraPos.y = GROUND_LEVEL + 0.5; // Just above ground
    }
    
    camera.position.copy(targetCameraPos);
    camera.rotation.y = mouseX;
    camera.rotation.z = 0; // Keep camera upright (no roll)
    
    // Hide player in first person view (unless dev mode)
    player.visible = devMode;
  }
  
  // Lock camera to horizontal when on ground and moving
  const horizontalSpeed = Math.sqrt(gameState.velocity.x ** 2 + gameState.velocity.z ** 2);
  const isMoving = horizontalSpeed > 0.1; // Lower threshold for earlier activation
  const isOnGround = gameState.position.y <= GROUND_LEVEL + 0.5;
  
  if (isOnGround && isMoving) {
    // Smoothly return to horizontal view when moving on ground
    const targetY = 0;
    const lerpSpeed = 0.2; // Faster return to horizontal (was 0.1)
    mouseY += (targetY - mouseY) * lerpSpeed;
  }
  
  camera.rotation.x = mouseY;
  camera.rotation.z = 0; // Always keep camera upright
  
  // Update cars
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    
    if (car.road.isVertical) {
      // Move along Z axis (parallel to river, no bridge crossing)
      car.mesh.position.z += car.road.direction * car.speed * deltaTime;
      car.mesh.position.y = 0.5; // Always on road level
      
      // Wrap around when car goes off map
      if (car.road.direction === 1 && car.mesh.position.z > MAP_SIZE) {
        car.mesh.position.z = -MAP_SIZE;
      } else if (car.road.direction === -1 && car.mesh.position.z < -MAP_SIZE) {
        car.mesh.position.z = MAP_SIZE;
      }
    } else {
      // Move along X axis
      car.mesh.position.x += car.road.direction * car.speed * deltaTime;
      
      // Adjust height based on bridge position
      const dx = Math.abs(car.mesh.position.x - car.riverX);
      if (dx < car.riverWidth / 2 + 5) {
        car.mesh.position.y = 0.8; // On bridge
      } else {
        car.mesh.position.y = 0.5; // On road
      }
      
      // Wrap around when car goes off map
      if (car.road.direction === 1 && car.mesh.position.x > MAP_SIZE) {
        car.mesh.position.x = -MAP_SIZE;
      } else if (car.road.direction === -1 && car.mesh.position.x < -MAP_SIZE) {
        car.mesh.position.x = MAP_SIZE;
      }
    }
    
    // Check collision with other cars on same road
    for (let j = i + 1; j < cars.length; j++) {
      const otherCar = cars[j];
      
      // Only check cars on same road
      if (car.road !== otherCar.road) continue;
      
      const dx = Math.abs(car.mesh.position.x - otherCar.mesh.position.x);
      const dz = Math.abs(car.mesh.position.z - otherCar.mesh.position.z);
      
      // Simple collision check
      if (dx < 3 && dz < 5) {
        // Slow down the car behind
        if (car.road.isVertical) {
          if ((car.road.direction === 1 && car.mesh.position.z < otherCar.mesh.position.z) ||
              (car.road.direction === -1 && car.mesh.position.z > otherCar.mesh.position.z)) {
            car.speed = Math.max(5, otherCar.speed - 2);
          } else {
            otherCar.speed = Math.max(5, car.speed - 2);
          }
        } else {
          if ((car.road.direction === 1 && car.mesh.position.x < otherCar.mesh.position.x) ||
              (car.road.direction === -1 && car.mesh.position.x > otherCar.mesh.position.x)) {
            car.speed = Math.max(5, otherCar.speed - 2);
          } else {
            otherCar.speed = Math.max(5, car.speed - 2);
          }
        }
      } else {
        // Restore normal speed when not colliding
        if (car.speed < 15) car.speed = Math.min(25, car.speed + deltaTime * 5);
        if (otherCar.speed < 15) otherCar.speed = Math.min(25, otherCar.speed + deltaTime * 5);
      }
    }
  }
  
  // Update pedestrians
  for (const ped of pedestrians) {
    ped.walkTime += deltaTime * 5;
    
    // Simple walking animation (bob up and down)
    const bodyMesh = ped.mesh.children[0];
    if (bodyMesh) {
      bodyMesh.position.y = 0.9 + Math.sin(ped.walkTime) * 0.05;
    }
    
    // Store old position in case we need to revert
    const oldX = ped.mesh.position.x;
    const oldZ = ped.mesh.position.z;
    
    if (ped.road.isVertical) {
      // Walk along Z axis
      const direction = ped.mesh.rotation.y === 0 ? 1 : -1;
      ped.mesh.position.z += direction * ped.speed * deltaTime;
      
      // Wrap around
      if (ped.mesh.position.z > MAP_SIZE) {
        ped.mesh.position.z = -MAP_SIZE;
      } else if (ped.mesh.position.z < -MAP_SIZE) {
        ped.mesh.position.z = MAP_SIZE;
      }
    } else {
      // Walk along X axis
      const direction = ped.mesh.rotation.y === Math.PI / 2 ? 1 : -1;
      ped.mesh.position.x += direction * ped.speed * deltaTime;
      
      // Wrap around
      if (ped.mesh.position.x > MAP_SIZE) {
        ped.mesh.position.x = -MAP_SIZE;
      } else if (ped.mesh.position.x < -MAP_SIZE) {
        ped.mesh.position.x = MAP_SIZE;
      }
    }
    
    // Check if pedestrian is in river and revert if so
    if (isInWater(ped.mesh.position, river)) {
      ped.mesh.position.x = oldX;
      ped.mesh.position.z = oldZ;
      // Turn around
      ped.mesh.rotation.y += Math.PI;
    }
  }
  
  // Update AI players
  const currentTime = performance.now() / 1000;
  for (const ai of aiPlayers) {
    // Simple AI behavior
    if (currentTime > ai.nextActionTime) {
      // Decide next action every 2-4 seconds
      ai.nextActionTime = currentTime + 2 + Math.random() * 2;
      
      if (ai.isOni) {
        // Chase nearest visible player (marker must be visible)
        let nearestDist = Infinity;
        let nearestTarget = null;
        
        // Check human player (marker is always visible now)
        const distToPlayer = ai.position.distanceTo(gameState.position);
        
        if (distToPlayer < nearestDist && !gameState.isOni) {
          // Check if player is within vision range
          if (distToPlayer < ONI_VISION_DISTANCE) {
            nearestDist = distToPlayer;
            nearestTarget = gameState.position.clone();
          }
        }
        
        // Check other AI players (only if their marker is visible - moving)
        for (const otherAI of aiPlayers) {
          if (otherAI === ai || otherAI.isOni) continue;
          const dist = ai.position.distanceTo(otherAI.position);
          
          // Marker is always visible now
          if (dist < nearestDist && dist < ONI_VISION_DISTANCE) {
            nearestDist = dist;
            nearestTarget = otherAI.position.clone();
          }
        }
        
        ai.target = nearestTarget;
        ai.isChasing = nearestTarget !== null;
      } else {
        // Run away from oni
        let nearestOni = null;
        let nearestOniDist = Infinity;
        
        // Check if player is oni
        if (gameState.isOni) {
          const dist = ai.position.distanceTo(gameState.position);
          if (dist < nearestOniDist) {
            nearestOniDist = dist;
            nearestOni = gameState.position;
          }
        }
        
        // Check other AI
        for (const otherAI of aiPlayers) {
          if (!otherAI.isOni) continue;
          const dist = ai.position.distanceTo(otherAI.position);
          if (dist < nearestOniDist) {
            nearestOniDist = dist;
            nearestOni = otherAI.position;
          }
        }
        
        if (nearestOni && nearestOniDist < 30) {
          // Run away
          ai.target = nearestOni;
          ai.isChasing = false;
        } else {
          // Wander randomly
          ai.target = null;
          ai.searchRotation += (Math.random() - 0.5) * 0.5;
        }
      }
    }
    
    // AI decision making for abilities
    let useJetpack = false;
    let useDash = false;
    
    if (ai.target) {
      const distToTarget = ai.position.distanceTo(ai.target);
      
      // Use jetpack if target is far or to escape
      if (currentTime > ai.nextJetpackTime && ai.jetpackFuel > 30) {
        if ((!ai.isChasing && distToTarget < 20) || // Escape when close
            (ai.isChasing && distToTarget > 15 && Math.random() > 0.7)) { // Chase from distance
          useJetpack = true;
          ai.nextJetpackTime = currentTime + 2 + Math.random() * 3;
        }
      }
      
      // Use dash when chasing or escaping
      if (currentTime > ai.nextDashTime && ai.jetpackFuel > 10) {
        if ((ai.isChasing && distToTarget < 30 && distToTarget > 5) || // Chase
            (!ai.isChasing && distToTarget < 25)) { // Escape
          useDash = true;
          ai.isDashing = true;
          ai.dashEndTime = currentTime + 1.5; // Dash for 1.5 seconds
          ai.nextDashTime = currentTime + 4 + Math.random() * 2;
        }
      }
    }
    
    // Drain fuel while dashing and check if dash ended
    if (ai.isDashing) {
      ai.jetpackFuel = Math.max(0, ai.jetpackFuel - DASH_DRAIN_RATE * deltaTime);
      if (currentTime >= ai.dashEndTime || ai.jetpackFuel <= 0) {
        ai.isDashing = false;
      }
    }
    
    // Move AI
    let moveSpeed = ai.isOni ? ONI_CHASE_SPEED : ONI_MOVE_SPEED;
    if (ai.isDashing) {
      moveSpeed = DASH_SPEED;
    }
    
    if (ai.target) {
      // Move towards or away from target
      const direction = new THREE.Vector3();
      direction.subVectors(ai.target, ai.position);
      direction.y = 0;
      
      if (!ai.isChasing) {
        // Run away (reverse direction)
        direction.multiplyScalar(-1);
      }
      
      if (direction.length() > 0.1) {
        direction.normalize();
        ai.rotation = Math.atan2(direction.x, direction.z);
        
        ai.velocity.x = direction.x * moveSpeed;
        ai.velocity.z = direction.z * moveSpeed;
      }
    } else {
      // Wander
      ai.rotation += ai.searchRotation * deltaTime;
      const forward = new THREE.Vector3(Math.sin(ai.rotation), 0, Math.cos(ai.rotation));
      ai.velocity.x = forward.x * ONI_MOVE_SPEED * 0.5;
      ai.velocity.z = forward.z * ONI_MOVE_SPEED * 0.5;
    }
    
    // Use jetpack
    if (useJetpack && ai.jetpackFuel > 0) {
      ai.velocity.y = JETPACK_POWER;
      ai.jetpackFuel = Math.max(0, ai.jetpackFuel - JETPACK_DRAIN_RATE * deltaTime);
    }
    
    // Apply gravity
    ai.velocity.y += GRAVITY * deltaTime;
    
    // Update position
    ai.position.x += ai.velocity.x * deltaTime;
    ai.position.y += ai.velocity.y * deltaTime;
    ai.position.z += ai.velocity.z * deltaTime;
    
    // Check for roof landing (prevent falling through buildings)
    const aiRoofHeight = checkRoofLanding(ai.position, ai.velocity, buildings);
    if (aiRoofHeight !== null) {
      // If AI is falling and close to roof, snap to roof
      if (ai.velocity.y <= 0 && ai.position.y < aiRoofHeight + 2) {
        ai.position.y = aiRoofHeight;
        ai.velocity.y = 0;
      }
      // If AI is below roof level (somehow got inside), push them up
      else if (ai.position.y < aiRoofHeight - 0.5) {
        ai.position.y = aiRoofHeight;
        ai.velocity.y = 0;
      }
    }
    
    // Ground collision and jetpack recharge
    const aiIsGrounded = ai.position.y <= GROUND_LEVEL;
    const aiIsOnRoof = aiRoofHeight !== null && Math.abs(ai.position.y - aiRoofHeight) < 0.5;
    
    if (aiIsGrounded) {
      ai.position.y = GROUND_LEVEL;
      ai.velocity.y = 0;
    }
    
    // Recharge jetpack when on ground or roof
    if (aiIsGrounded || aiIsOnRoof) {
      // Recharge jetpack based on oni status
      if (ai.isOni) {
        // Oni: recharge when on surface (even while moving)
        ai.jetpackFuel = Math.min(100, ai.jetpackFuel + JETPACK_RECHARGE_RATE * deltaTime);
      } else {
        // Runner: recharge only when on surface AND stationary
        const aiHorizontalSpeed = Math.sqrt(ai.velocity.x ** 2 + ai.velocity.z ** 2);
        const aiIsStationary = aiHorizontalSpeed < 0.5;
        
        if (aiIsStationary) {
          ai.jetpackFuel = Math.min(100, ai.jetpackFuel + JETPACK_RECHARGE_RATE * deltaTime);
        }
      }
    }
    
    // Map boundaries
    const boundary = MAP_SIZE;
    if (Math.abs(ai.position.x) > boundary) {
      ai.position.x = Math.sign(ai.position.x) * boundary;
      ai.velocity.x *= -0.5;
    }
    if (Math.abs(ai.position.z) > boundary) {
      ai.position.z = Math.sign(ai.position.z) * boundary;
      ai.velocity.z *= -0.5;
    }
    
    // Building collision
    const collision = checkCollision(ai.position, buildings);
    if (collision.collided) {
      ai.position.x -= collision.normal.x * 0.5;
      ai.position.z -= collision.normal.z * 0.5;
      ai.velocity.x *= -0.5;
      ai.velocity.z *= -0.5;
    }
    
    // Update mesh
    ai.mesh.position.copy(ai.position);
    ai.mesh.rotation.y = ai.rotation;
    
    // Update color and opacity based on oni status and movement
    const aiSpeed = Math.sqrt(ai.velocity.x ** 2 + ai.velocity.z ** 2);
    const aiIsMoving = aiSpeed > 0.5;
    
    if (ai.isOni) {
      ai.body.material.color.setHex(0xff0000); // Red body for oni
      ai.head.material.color.setHex(0xff6600); // Orange head for oni
      ai.marker.material.color.setHex(0xff0000); // Red marker for oni
      ai.marker.material.opacity = 1.0; // Always fully visible
    } else {
      ai.body.material.color.setHex(0x4488ff); // Blue body for runner
      ai.head.material.color.setHex(0xffcc00); // Yellow head for runner
      ai.marker.material.color.setHex(0x00ff00); // Green marker for runner
      // Fade when stationary to indicate they can recharge
      ai.marker.material.opacity = aiIsMoving ? 0.9 : 0.5;
    }
    
    // Always show marker
    ai.marker.visible = true;
    ai.marker.rotation.y += deltaTime * 3; // Rotate marker
    
    // Check collision with player
    const distToPlayer = ai.position.distanceTo(gameState.position);
    if (distToPlayer < 1.5) {
      if (ai.isOni && !gameState.isOni) {
        const currentTime = performance.now() / 1000;
        gameState.survivedTime = currentTime - gameStats.gameStartTime;
        gameState.wasTagged = true;
        gameState.isOni = true;
        
        // Start beacon charge when becoming oni
        gameStats.beaconChargeTime = currentTime;
        gameStats.beaconReady = false;
        gameStats.beaconActivated = false;
        
        console.log('AI tagged you! You are now oni!');
        showToast(i18n.t('becameOni'), 'oni-became');
        
        // Check if game ended
        checkGameEnd();
      } else if (!ai.isOni && gameState.isOni) {
        const currentTime = performance.now() / 1000;
        ai.survivedTime = currentTime - gameStats.gameStartTime;
        ai.wasTagged = true;
        ai.isOni = true;
        console.log('You tagged AI!');
        showToast(i18n.t('taggedPlayer', { player: ai.id }), 'oni-tagged');
        
        // Check if game ended
        checkGameEnd();
      }
    }
    
    // Check collision with other AI
    for (const otherAI of aiPlayers) {
      if (otherAI === ai) continue;
      const dist = ai.position.distanceTo(otherAI.position);
      if (dist < 1.5) {
        if (ai.isOni && !otherAI.isOni) {
          const currentTime = performance.now() / 1000;
          otherAI.survivedTime = currentTime - gameStats.gameStartTime;
          otherAI.wasTagged = true;
          otherAI.isOni = true;
          console.log('AI tagged another AI!');
          showToast(i18n.t('playerTagged', { player1: ai.id, player2: otherAI.id }), 'oni-tagged');
          
          // Check if game ended
          checkGameEnd();
        }
      }
    }
  }
  
  // Update UI
  updateUI();
  
  // Render
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();

console.log('JetOni Prototype loaded! Click to lock pointer and use WASD + Space to move.');
