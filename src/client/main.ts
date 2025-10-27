/**
 * JetOni - Main entry point
 * A 3D multiplayer tag game built with Three.js and Devvit
 */

import { GameEngine } from './game/game-engine';
import { GameState } from './game/game-state';
import { CityGenerator } from './environment/city-generator';
import { PlayerController } from './player/player-controller';
import { I18n } from './i18n/i18n';
import { UIManager } from './ui/ui-manager';
import { UIMenu } from './ui/ui-menu';
import { en } from './i18n/translations/en';
import { jp } from './i18n/translations/jp';
import { InitResponse } from '../shared/types/api';

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
      
      // Generate city environment
      console.log('Generating city...');
      const cityGenerator = new CityGenerator();
      const city = cityGenerator.generateCity();
      gameEngine.addToScene(city);
      console.log('City generated');
      
      // Initialize player controller
      const playerController = new PlayerController(gameState);
      playerController.init();
      
      // Setup game loop
      gameEngine.onUpdate((deltaTime: number) => {
        // Update player controller
        playerController.update(deltaTime);
        
        // Update camera position to follow player
        const localPlayer = gameState.getLocalPlayer();
        const camera = gameEngine.getCamera();
        camera.position.set(
          localPlayer.position.x,
          localPlayer.position.y + 1.7, // Eye height
          localPlayer.position.z
        );
        
        // Apply player rotation to camera
        camera.rotation.order = 'YXZ';
        camera.rotation.y = localPlayer.rotation.yaw;
        camera.rotation.x = localPlayer.rotation.pitch;
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
