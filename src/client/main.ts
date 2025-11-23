/**
 * JetOni - Main entry point
 * A 3D multiplayer tag game built with Three.js and Devvit
 */

import { GameEngine } from './game/game-engine';
import { GameState } from './game/game-state';
import { I18n } from './i18n/i18n';
import { UIManager } from './ui/ui-manager';
import { UIMenu } from './ui/ui-menu';
import { UICountdown } from './ui/ui-countdown';
import { UILoading } from './ui/ui-loading';
import { ToastNotification } from './ui/toast-notification';
import { GameAPIClient } from './api/game-api-client';
import { AIAPIClient } from './api/ai-api-client';
import { RealtimeSyncManager } from './sync/realtime-sync-manager';
import { HostMonitor } from './game/host-monitor';
import { en } from './i18n/translations/en';
import { jp } from './i18n/translations/jp';
import { InitResponse } from '../shared/types/api';
import { MAX_FUEL } from '../shared/constants';
import {
  initializeGameSystems,
  initializeCollections,
  createDebugInfo,
  setupDebugMode,
} from './game-initializer';
import { createGameLoop, GameLoopState } from './game-loop';
import { setupLobbyHandler, setupCountdownHandler, CityState } from './event-handlers';

// Initialize i18n system
const translations = { en, jp };
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
  // Show loading screen
  const uiLoading = new UILoading();
  uiLoading.show();
  
  try {
    // Fetch initial data from server
    const response = await fetch('/api/init');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = (await response.json()) as InitResponse;
    
    if (data.type === 'init') {
      // Check if username is anonymous
      if (data.username === 'anonymous' || !data.username) {
        console.warn('[Init] Username is anonymous - Reddit account may not be fully set up');
        showAnonymousWarning();
      }
      
      const playerId = data.userId || `player_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Initialize game state
      const gameState = new GameState(playerId);
      gameState.setLocalPlayerUsername(data.username || playerId);
      gameState.setGamePhase('lobby');
      gameState.setLocalPlayerFuel(MAX_FUEL);
      
      // Initialize systems
      const toast = new ToastNotification();
      const systems = await initializeGameSystems(gameEngine, gameState, toast);
      const collections = initializeCollections();
      
      // Initialize city state
      const cityState: CityState = {
        cityGenerator: null,
        city: null,
      };
      
      // Initialize game loop state
      const gameLoopState: GameLoopState = {
        gameStarted: false,
        gameHasStarted: false,
        gameStartTime: 0,
        lastGameEndCheck: 0,
        wasOni: false,
        cloakActiveUntil: 0,
        isHost: false,
        currentGameId: null,
        taggedTimeMap: new Map(),
        aiLastSyncTime: new Map(),
      };
      
      // Initialize API clients
      const gameApiClient = new GameAPIClient();
      const aiApiClient = new AIAPIClient();
      
      // Initialize sync and monitoring
      const realtimeSyncManager = new RealtimeSyncManager(gameState);
      const hostMonitor = new HostMonitor(gameApiClient);
      
      // Initialize UI
      const uiMenu = new UIMenu(uiManager, i18n, data.username || playerId, gameApiClient, gameEngine);
      const uiCountdown = new UICountdown(i18n);
      
      // Setup debug mode
      const debugInfo = createDebugInfo();
      const debugMode = setupDebugMode(debugInfo);
      
      // Create game loop
      const gameLoop = createGameLoop(
        gameEngine,
        gameState,
        systems,
        collections,
        gameLoopState,
        {
          onGameEnd: () => {
            if (gameLoopState.currentGameId && realtimeSyncManager.isConnected()) {
              realtimeSyncManager.sendGameEnd();
            }
            window.dispatchEvent(new Event('gameEnd'));
          },
          onAISync: (aiId: string, aiPlayer: any) => {
            if (realtimeSyncManager.isConnected()) {
              realtimeSyncManager.sendPlayerUpdate({
                playerId: aiId,
                position: aiPlayer.position,
                velocity: aiPlayer.velocity,
                rotation: aiPlayer.rotation,
                fuel: aiPlayer.fuel,
                isOni: aiPlayer.isOni,
                isDashing: aiPlayer.isDashing,
                isJetpacking: aiPlayer.isJetpacking,
                isOnSurface: aiPlayer.isOnSurface,
              });
            }
          },
        }
      );
      
      // Setup event handlers
      const eventDeps = {
        gameEngine,
        gameState,
        systems,
        collections,
        state: gameLoopState,
        realtimeSyncManager,
        hostMonitor,
        gameApiClient,
        toast,
        uiMenu,
        uiCountdown,
        i18n,
      };
      
      setupLobbyHandler(eventDeps, cityState);
      setupCountdownHandler(eventDeps, cityState);
      
      // Setup game start handler (temporary - should be in event-handlers.ts)
      window.addEventListener('gameStart', (() => {
        gameLoopState.gameStarted = true;
        gameLoopState.gameHasStarted = true;
        gameState.setGamePhase('playing');
      }) as EventListener);
      
      // Start game engine with game loop
      gameEngine.start(gameLoop);
      
      // Show title screen
      uiMenu.showTitleScreen();
      
      // Hide loading screen
      uiLoading.hide();
    }
  } catch (error) {
    console.error('[Init] Failed to initialize game:', error);
    alert('Failed to initialize game. Please refresh the page.');
  }
}

/**
 * Show anonymous user warning
 */
function showAnonymousWarning(): void {
  const warningDiv = document.createElement('div');
  warningDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 136, 0, 0.95);
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 14px;
    z-index: 10000;
    max-width: 500px;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  warningDiv.innerHTML = `
    <strong>⚠️ Account Setup Required</strong><br>
    <span style="font-size: 12px;">
      Please set up your Reddit username to play.<br>
      Go to Reddit Settings → Profile → Display Name
    </span>
  `;
  document.body.appendChild(warningDiv);
  
  setTimeout(() => {
    warningDiv.remove();
  }, 10000);
}

// Start the game
void initGame();
