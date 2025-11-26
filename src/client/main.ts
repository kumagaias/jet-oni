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
import { Player } from '../shared/types/game';
import {
  initializeGameSystems,
  initializeCollections,
  createDebugInfo,
  setupDebugMode,
} from './game-initializer';
import { createGameLoop, GameLoopState } from './game-loop';
import { setupLobbyHandler, setupCountdownHandler, CityState } from './event-handlers';

// Initialize i18n system with translations
const translations = { en, jp };
const i18n = new I18n(translations);



// Initialize UI manager for game interface
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
      
      // Initialize toast notification system for game messages
      const toast = new ToastNotification(i18n);
      if (!toast.init) {
        throw new Error('ToastNotification.init is not defined');
      }
      toast.init();
      
      // Initialize game systems
      const systems = await initializeGameSystems(gameEngine, gameState, toast);
      const collections = initializeCollections();
      
      // Initialize UI components first (before collections)
      const { UIHud } = await import('./ui/ui-hud');
      const { UIControls } = await import('./ui/ui-controls');
      const { UIResults } = await import('./ui/ui-results');
      const { UIMinimap } = await import('./ui/ui-minimap');
      
      const uiHud = new UIHud(gameState, i18n);
      const uiControls = new UIControls(gameState, i18n);
      const uiResults = new UIResults(i18n);
      const uiMinimap = new UIMinimap(gameState);
      
      uiHud.init();
      uiControls.init();
      
      // Add uiControls to collections
      collections.uiControls = uiControls;
      
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
          onAISync: (aiId: string, aiPlayer: Player) => {
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
          onTag: (taggerId: string, taggedId: string) => {
            // Record tag time for host
            if (gameLoopState.isHost) {
              gameLoopState.taggedTimeMap.set(taggedId, Date.now());
            }
            
            // Show toast notification
            const tagger = gameState.getPlayer(taggerId);
            const tagged = gameState.getPlayer(taggedId);
            if (tagger && tagged) {
              toast.show(`${tagged.username} was tagged by ${tagger.username}!`, 'info', 2000);
            }
          },
          onUIUpdate: (deltaTime: number) => {
            // Update HUD with beacon cooldown and cloak timer
            const localPlayer = gameState.getLocalPlayer();
            uiHud.update(localPlayer.beaconCooldown, 0);
            
            // Update controls (shows/hides buttons based on role)
            uiControls.update();
            
            // Update minimap (F1)
            uiMinimap.update();
            
            // Update F2 debug info
            if (debugMode.isDebugMode()) {
              const allPlayers = gameState.getAllPlayers();
              const oniPlayers = allPlayers.filter(p => p.isOni);
              const aiPlayers = allPlayers.filter(p => p.isAI);
              
              const debugText = [
                `Position: (${localPlayer.position.x.toFixed(1)}, ${localPlayer.position.y.toFixed(1)}, ${localPlayer.position.z.toFixed(1)})`,
                `Velocity: (${localPlayer.velocity.x.toFixed(2)}, ${localPlayer.velocity.y.toFixed(2)}, ${localPlayer.velocity.z.toFixed(2)})`,
                `Fuel: ${Math.round(localPlayer.fuel)}`,
                `ONI: ${localPlayer.isOni}`,
                `Players: ${allPlayers.length} (ONI: ${oniPlayers.length}, AI: ${aiPlayers.length})`,
                `Phase: ${gameState.getGamePhase()}`,
              ];
              
              if (gameState.isPlaying()) {
                const remaining = gameState.getRemainingTime();
                const minutes = Math.floor(remaining / 60);
                const seconds = Math.floor(remaining % 60);
                debugText.push(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
              }
              
              debugInfo.innerHTML = debugText.join('<br>');
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
      
      // Show controls when countdown starts
      window.addEventListener('gameStartCountdown', (() => {
        uiControls.show();
      }) as EventListener);
      
      // Setup game start handler (temporary - should be in event-handlers.ts)
      window.addEventListener('gameStart', (() => {
        console.log('[Game Start] Event received');
        gameLoopState.gameStarted = true;
        gameLoopState.gameHasStarted = true;
        gameState.setGamePhase('playing');
        console.log('[Game Start] Game phase set to playing');
        
        // Show game UI
        uiHud.show();
        uiControls.show();
        console.log('[Game Start] UI shown');
        
        // Set game start time
        const startTime = Date.now();
        gameLoopState.gameStartTime = startTime;
        gameState.setGameStartTime(startTime);
        console.log('[Game Start] Game started at', startTime);
      }) as EventListener);
      
      // Setup game end handler
      window.addEventListener('gameEnd', (async () => {
        console.log('[Game End] Event received, currentGameId:', gameLoopState.currentGameId);
        gameState.setGamePhase('ended');
        gameLoopState.gameStarted = false;
        
        // Hide HUD and controls
        uiHud.hide();
        uiControls.hide();
        
        // Fetch game results from server
        if (gameLoopState.currentGameId) {
          try {
            console.log('[Game End] Fetching results from server...');
            const response = await gameApiClient.endGame(gameLoopState.currentGameId);
            console.log('[Game End] Server response:', response);
            if (response.success && response.results) {
              console.log('[Game End] Showing results screen');
              // Show results screen
              uiResults.show(response.results);
              
              // Setup back to menu button
              uiResults.setOnBackToMenu(() => {
                uiResults.hide();
                window.dispatchEvent(new Event('returnToMenu'));
              });
            } else {
              console.warn('[Game End] No results in response');
            }
          } catch (error) {
            console.error('[Game End] Failed to fetch results:', error);
            // Show menu anyway
            setTimeout(() => {
              window.dispatchEvent(new Event('returnToMenu'));
            }, 3000);
          }
        } else {
          console.warn('[Game End] No currentGameId, cannot fetch results');
        }
      }) as EventListener);
      
      // Setup return to menu handler
      window.addEventListener('returnToMenu', (() => {
        // Clean up and return to title screen
        gameState.setGamePhase('lobby');
        gameLoopState.gameStarted = false;
        gameLoopState.gameHasStarted = false;
        
        // Disconnect from Realtime
        if (gameLoopState.currentGameId) {
          void realtimeSyncManager.disconnect();
          gameLoopState.currentGameId = null;
        }
        
        // Show title screen
        uiMenu.showTitleScreen();
      }) as EventListener);
      
      // Setup Realtime event handlers
      realtimeSyncManager.onPlayerUpdate(async (update) => {
        // Update remote player in game state
        gameState.updateRemotePlayer({
          id: update.playerId,
          username: update.playerId,
          isOni: update.isOni,
          isAI: false,
          position: update.position,
          velocity: update.velocity,
          rotation: update.rotation,
          fuel: update.fuel,
          survivedTime: 0,
          wasTagged: false,
          tagCount: 0,
          isOnSurface: update.isOnSurface,
          isDashing: update.isDashing,
          isJetpacking: update.isJetpacking,
          beaconCooldown: 0,
        });
        
        // Create or update player model
        if (!collections.remotePlayerModels.has(update.playerId)) {
          const { PlayerModel } = await import('./player/player-model');
          const model = new PlayerModel(gameEngine.getScene(), update.playerId, false);
          model.setPosition(update.position);
          model.setRotation(update.rotation.yaw);
          model.setOniState(update.isOni);
          gameEngine.addToScene(model.getModel());
          collections.remotePlayerModels.set(update.playerId, model);
        }
      });
      
      realtimeSyncManager.onPlayerDisconnect((playerId) => {
        // Remove player model
        const model = collections.remotePlayerModels.get(playerId);
        if (model) {
          gameEngine.removeFromScene(model.getModel());
          collections.remotePlayerModels.delete(playerId);
        }
        
        // Remove from game state
        gameState.removePlayer(playerId);
      });
      
      realtimeSyncManager.onGameEnd(() => {
        window.dispatchEvent(new Event('gameEnd'));
      });
      
      // Send local player updates to Realtime (every 50ms)
      setInterval(() => {
        if (gameState.isPlaying() && realtimeSyncManager.isConnected()) {
          const localPlayer = gameState.getLocalPlayer();
          realtimeSyncManager.sendPlayerUpdate({
            playerId: localPlayer.id,
            position: localPlayer.position,
            velocity: localPlayer.velocity,
            rotation: localPlayer.rotation,
            fuel: localPlayer.fuel,
            isOni: localPlayer.isOni,
            isDashing: localPlayer.isDashing,
            isJetpacking: localPlayer.isJetpacking,
            isOnSurface: localPlayer.isOnSurface,
          });
        }
      }, 50);
      
      // Register game loop callback
      gameEngine.onUpdate(gameLoop);
      
      // Start game engine
      gameEngine.start();
      
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
