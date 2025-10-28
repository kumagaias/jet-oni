/**
 * JetOni - Main entry point
 * A 3D multiplayer tag game built with Three.js and Devvit
 */

import { GameEngine } from './game/game-engine';
import { GameState } from './game/game-state';
import { CityGenerator } from './environment/city-generator';
import { PlayerController } from './player/player-controller';
import { PlayerPhysics } from './player/player-physics';
import { BeaconSystem } from './abilities/beacon-system';
import { BeaconVisual } from './effects/beacon-visual';
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
      
      // Initialize player physics
      const playerPhysics = new PlayerPhysics();
      // Register buildings for collision detection (if needed)
      // playerPhysics.registerBuildings(cityGenerator.getBuildings());
      
      // Initialize player controller
      const playerController = new PlayerController(gameState);
      playerController.init();
      
      // Initialize beacon system
      const beaconSystem = new BeaconSystem(gameState);
      
      // Initialize beacon visual
      const beaconVisual = new BeaconVisual(gameEngine.getScene());
      
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
      
      // Track previous ONI state to detect changes
      let wasOni = gameState.getLocalPlayer().isOni;
      
      // Setup game loop
      gameEngine.onUpdate((deltaTime: number) => {
        // Update player controller
        playerController.update(deltaTime);
        
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
        
        // Update beacon visuals
        const isBeaconActive = beaconSystem.isBeaconActive();
        beaconVisual.update(gameState.getAllPlayers(), isBeaconActive, localPlayer.id);
        beaconVisual.animate(deltaTime);
        
        // Apply physics to player
        const physicsResult = playerPhysics.applyPhysics(
          localPlayer.position,
          localPlayer.velocity,
          deltaTime,
          localPlayer.isJetpacking
        );
        
        // Update player state with physics results
        gameState.setLocalPlayerPosition(physicsResult.position);
        gameState.setLocalPlayerVelocity(physicsResult.velocity);
        gameState.setLocalPlayerOnSurface(physicsResult.isOnSurface);
        
        // Update camera position to follow player
        const camera = gameEngine.getCamera();
        camera.position.set(
          physicsResult.position.x,
          physicsResult.position.y + 1.7, // Eye height
          physicsResult.position.z
        );
        
        // Apply player rotation to camera
        camera.rotation.order = 'YXZ';
        camera.rotation.y = localPlayer.rotation.yaw;
        camera.rotation.x = localPlayer.rotation.pitch;
        
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
          ${localPlayer.isOni ? `<br>Beacon: ${beaconActive ? 'ACTIVE' : beaconCooldown > 0 ? `Cooldown ${Math.ceil(beaconCooldown)}s` : 'READY'}<br>` : ''}
          ${localPlayer.isOni ? `Beacon Progress: ${Math.round(beaconProgress * 100)}%<br>` : ''}
          <br>
          <strong>F3:</strong> Toggle ONI/Runner${localPlayer.isOni ? '<br><strong>B:</strong> Activate Beacon' : ''}
        `;
      });
      
      // Initialize UI menu
      const uiMenu = new UIMenu(uiManager, i18n, data.username || 'Player');
      uiMenu.showTitleScreen();
      
      // Start game loop
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
