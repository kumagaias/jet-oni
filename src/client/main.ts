/**
 * JetOni - Main entry point
 * A 3D multiplayer tag game built with Three.js and Devvit
 */

import * as THREE from 'three';
import { GameEngine } from './game/game-engine';
import { GameState } from './game/game-state';
import { CityGenerator } from './environment/city-generator';
import { DynamicObjects } from './environment/dynamic-objects';
import { LadderSystem } from './environment/ladder-system';
import { CollisionSystem } from './environment/collision-system';
import { PlayerController } from './player/player-controller';
import { PlayerPhysics, BuildingData } from './player/player-physics';
import { PlayerCamera } from './player/player-camera';
import { BeaconSystem } from './abilities/beacon-system';
import { BeaconVisual } from './effects/beacon-visual';
import { CarSystem } from './environment/car-system';
import { I18n } from './i18n/i18n';
import { UIManager } from './ui/ui-manager';
import { UIMenu } from './ui/ui-menu';
import { en } from './i18n/translations/en';
import { jp } from './i18n/translations/jp';
import { InitResponse } from '../shared/types/api';
import { MAX_FUEL } from '../shared/constants';

// Create translations object
const translations = { en, jp };

// Initialize i18n system
const i18n = new I18n(translations);

// Initialize UI manager
const uiManager = new UIManager();

// Get canvas element
const canvas = document.getElementById('bg') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

// Initialize game engine
const gameEngine = new GameEngine(canvas);

// Fetch user info and initialize game
async function initGame(): Promise<void> {
  try {
    // Fetch initial data from server
    const response = await fetch('/api/init');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = (await response.json()) as InitResponse;
    
    if (data.type === 'init') {
      const playerId = data.username || 'anonymous';
      
      // Initialize game state with player ID
      const gameState = new GameState(playerId);
      
      // Set game to playing state immediately for testing
      gameState.setGamePhase('playing');
      
      // Set player as ONI for testing jetpack
      gameState.setLocalPlayerIsOni(true);
      
      // Generate city environment
      console.log('Generating city...');
      const cityGenerator = new CityGenerator();
      const city = cityGenerator.generateCity();
      gameEngine.addToScene(city);
      console.log('City generated');
      
      // Generate dynamic objects (cars, pedestrians, ladders)
      console.log('Generating dynamic objects...');
      const dynamicObjects = new DynamicObjects();
      const dynamicGroup = dynamicObjects.initialize(cityGenerator.getBuildings());
      gameEngine.addToScene(dynamicGroup);
      console.log('Dynamic objects generated');
      
      // Initialize ladder system
      const ladderSystem = new LadderSystem();
      ladderSystem.registerLadders(dynamicObjects.getLadders());
      console.log(`Registered ${ladderSystem.getLadders().length} ladders`);
      
      // Initialize collision system
      const collisionSystem = new CollisionSystem();
      // Convert buildings to BuildingData format for collision
      const buildingData: BuildingData[] = [];
      cityGenerator.getBuildings().traverse((object) => {
        if (object instanceof THREE.Mesh && object.geometry instanceof THREE.BoxGeometry) {
          const params = object.geometry.parameters;
          buildingData.push({
            position: { x: object.position.x, y: object.position.y, z: object.position.z },
            width: params.width,
            height: params.height,
            depth: params.depth,
            shape: 'box',
          });
        } else if (object instanceof THREE.Mesh && object.geometry instanceof THREE.CylinderGeometry) {
          const params = object.geometry.parameters;
          buildingData.push({
            position: { x: object.position.x, y: object.position.y, z: object.position.z },
            width: params.radiusTop * 2,
            height: params.height,
            depth: params.radiusTop * 2,
            shape: 'cylinder',
          });
        }
      });
      collisionSystem.registerBuildings(buildingData);
      console.log(`Registered ${buildingData.length} buildings for collision`);
      
      // Initialize player physics
      const playerPhysics = new PlayerPhysics();
      playerPhysics.registerBuildings(buildingData);
      
      // Initialize player camera
      const playerCamera = new PlayerCamera(gameEngine.getCamera(), gameState);
      
      // Initialize player controller
      const playerController = new PlayerController(gameState);
      playerController.setLadderSystem(ladderSystem);
      playerController.init();
      
      // Initialize beacon system
      const beaconSystem = new BeaconSystem(gameState);
      
      // Initialize beacon visual
      const beaconVisual = new BeaconVisual(gameEngine.getScene());
      
      // Initialize car system
      const carSystem = new CarSystem(gameEngine.getScene());
      carSystem.init();
      console.log('Car system initialized');
      
      // Create debug info element (initially hidden)
      const debugInfo = document.createElement('div');
      debugInfo.id = 'debug-info';
      debugInfo.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: #ff8800;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        border: 1px solid #ff8800;
        border-radius: 4px;
        z-index: 1000;
        pointer-events: none;
        display: none;
      `;
      document.body.appendChild(debugInfo);
      
      // Toggle debug mode with F12
      let debugMode = false;
      window.addEventListener('keydown', (e) => {
        if (e.key === 'F12') {
          e.preventDefault();
          debugMode = !debugMode;
          debugInfo.style.display = debugMode ? 'block' : 'none';
          console.log(`Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
        }
      });
      
      // Track previous ONI state to detect changes
      let wasOni = gameState.getLocalPlayer().isOni;
      
      // Setup game loop
      gameEngine.onUpdate((deltaTime: number) => {
        // Update player controller
        playerController.update(deltaTime);
        
        // Get mobile control input and merge with keyboard input
        const buttonState = uiControls.getButtonState();
        if (buttonState.dash || buttonState.jetpack) {
          // Simulate SHIFT key press for dash/jetpack
          const inputState = playerController.getInputState();
          inputState.dash = true;
          inputState.jetpack = true;
        }
        if (buttonState.beacon) {
          // Simulate B key press for beacon
          const inputState = playerController.getInputState();
          inputState.beacon = true;
        }
        
        // Check if player became ONI
        const localPlayer = gameState.getLocalPlayer();
        if (localPlayer.isOni && !wasOni) {
          beaconSystem.onBecameOni();
          console.log('Became ONI - Beacon system initialized');
        }
        wasOni = localPlayer.isOni;
        
        // Update beacon system
        beaconSystem.update();
        
        // Handle beacon input
        const inputState = playerController.getInputState();
        if (inputState.beacon && beaconSystem.isAvailable()) {
          beaconSystem.activate();
          console.log('Beacon activated!');
        }
        
        // Update UI controls
        uiControls.update(gameState);
        
        // Update beacon visuals
        const isBeaconActive = beaconSystem.isBeaconActive();
        beaconVisual.update(gameState.getAllPlayers(), isBeaconActive, localPlayer.id);
        beaconVisual.animate(deltaTime);
        
        // Update dynamic objects (cars, pedestrians)
        dynamicObjects.update(deltaTime);
        
        // Update car system
        carSystem.update(deltaTime);
        
        // Update collision system with car positions
        collisionSystem.updateDynamicObjects(carSystem.getDynamicObjects());
        
        // Apply physics to player (skip if climbing)
        if (!localPlayer.isClimbing) {
          const physicsResult = playerPhysics.applyPhysics(
            localPlayer.position,
            localPlayer.velocity,
            deltaTime,
            localPlayer.isJetpacking
          );
          
          // Check car collision first (for bounce effect)
          const carCollision = carSystem.checkCarCollision(
            physicsResult.position,
            physicsResult.velocity
          );
          
          // If car collision, apply bounce velocity
          let finalVelocity = physicsResult.velocity;
          if (carCollision.collided) {
            finalVelocity = carCollision.newVelocity;
            console.log('Car collision! Bouncing player');
          }
          
          // Apply collision detection with buildings
          const collisionResult = collisionSystem.checkCollision(
            localPlayer.position,
            physicsResult.position
          );
          
          // Update player state with physics and collision results
          gameState.setLocalPlayerPosition(collisionResult.position);
          gameState.setLocalPlayerVelocity(finalVelocity);
          gameState.setLocalPlayerOnSurface(physicsResult.isOnSurface);
        }
        
        // Update camera
        playerCamera.update(deltaTime);
        
        // Update debug info
        const beaconCooldown = beaconSystem.getRemainingCooldown();
        const beaconActive = beaconSystem.isBeaconActive();
        const beaconProgress = beaconSystem.getCooldownProgress();
        
        debugInfo.innerHTML = `
          <strong>[DEBUG MODE]</strong><br>
          Role: ${localPlayer.isOni ? 'ONI' : 'RUNNER'}<br>
          Fuel: ${Math.round(localPlayer.fuel)}/${MAX_FUEL}<br>
          Position: (${Math.round(localPlayer.position.x)}, ${Math.round(localPlayer.position.y)}, ${Math.round(localPlayer.position.z)})<br>
          Velocity Y: ${localPlayer.velocity.y.toFixed(2)}<br>
          On Surface: ${localPlayer.isOnSurface ? 'Yes' : 'No'}<br>
          Jetpacking: ${localPlayer.isJetpacking ? 'Yes' : 'No'}<br>
          Dashing: ${localPlayer.isDashing ? 'Yes' : 'No'}<br>
          Climbing: ${localPlayer.isClimbing ? 'Yes' : 'No'}<br>
          ${localPlayer.isOni ? `<br>Beacon: ${beaconActive ? 'ACTIVE' : beaconCooldown > 0 ? `Cooldown ${Math.ceil(beaconCooldown)}s` : 'READY'}<br>` : ''}
          ${localPlayer.isOni ? `Beacon Progress: ${Math.round(beaconProgress * 100)}%<br>` : ''}
          <br>
          <strong>F3:</strong> Toggle ONI/Runner${localPlayer.isOni ? '<br><strong>B:</strong> Activate Beacon' : ''}
        `;
      });
      
      // Initialize UI menu
      const uiMenu = new UIMenu(uiManager, i18n, data.username || 'Player', gameEngine);
      
      // Initialize HUD (but keep it hidden until game starts)
      const { UIHud } = await import('./ui/ui-hud');
      const uiHud = new UIHud(gameState, i18n);
      uiHud.hide(); // Hide until game starts
      
      // Initialize UI controls for mobile
      const { UIControls } = await import('./ui/ui-controls');
      const uiControls = new UIControls(gameState, i18n);
      uiControls.hide(); // Hide until game starts
      
      // Add HUD update to game loop
      gameEngine.onUpdate((deltaTime: number) => {
        if (gameState.getGamePhase() === 'playing') {
          const beaconCooldown = beaconSystem.getRemainingCooldown();
          uiHud.update(beaconCooldown);
        }
      });
      
      // Listen for game start event
      window.addEventListener('gameStart', () => {
        console.log('Game starting - showing HUD and controls');
        gameState.setGamePhase('playing');
        uiHud.show();
        uiControls.show();
      });
      
      // Listen for lobby event (when user creates a game)
      window.addEventListener('showLobby', ((e: CustomEvent) => {
        console.log('Showing lobby');
        gameState.setGamePhase('lobby');
        const { currentPlayers, maxPlayers, isHost } = e.detail;
        uiMenu.showLobbyScreen(currentPlayers, maxPlayers, isHost);
      }) as EventListener);
      
      uiMenu.showTitleScreen();
      
      // Start game loop (will be paused by showTitleScreen)
      gameEngine.start();
      console.log('Game started');
      
    } else {
      console.error('Invalid response from server');
      showError('Failed to initialize game');
    }
  } catch (err) {
    console.error('Error initializing game:', err);
    showError('Failed to connect to server');
  }
}



/**
 * Show error message
 */
function showError(message: string): void {
  const overlay = document.querySelector('.overlay') as HTMLElement;
  if (!overlay) return;
  
  overlay.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <h1 style="color: red; font-size: 36px; margin-bottom: 20px;">Error</h1>
      <p style="color: white; font-size: 18px;">${message}</p>
      <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px; font-size: 18px; cursor: pointer;">
        Reload
      </button>
    </div>
  `;
}

// Start the game
void initGame();
