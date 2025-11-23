/**
 * Event Handlers
 * Handles all game events (lobby, countdown, game start/end, etc.)
 */

import * as THREE from 'three';
import { GameEngine } from './game/game-engine';
import { GameState } from './game/game-state';
import { CityGenerator } from './environment/city-generator';
import { PlayerModel } from './player/player-model';
import { GameSystems, GameCollections } from './game-initializer';
import { GameLoopState } from './game-loop';
import { RealtimeSyncManager } from './sync/realtime-sync-manager';
import { HostMonitor } from './game/host-monitor';
import { GameAPIClient } from './api/game-api-client';
import { ToastNotification } from './ui/toast-notification';
import { UIMenu } from './ui/ui-menu';
import { UICountdown } from './ui/ui-countdown';
import { I18n } from './i18n/i18n';
import { BuildingData } from './player/player-physics';

export interface EventHandlerDependencies {
  gameEngine: GameEngine;
  gameState: GameState;
  systems: GameSystems;
  collections: GameCollections;
  state: GameLoopState;
  realtimeSyncManager: RealtimeSyncManager;
  hostMonitor: HostMonitor;
  gameApiClient: GameAPIClient;
  toast: ToastNotification;
  uiMenu: UIMenu;
  uiCountdown: UICountdown;
  i18n: I18n;
}

export interface CityState {
  cityGenerator: CityGenerator | null;
  city: THREE.Group | null;
}

/**
 * Setup lobby event handler
 */
export function setupLobbyHandler(
  deps: EventHandlerDependencies,
  cityState: CityState
): void {
  window.addEventListener('showLobby', (async (e: Event) => {
    const customEvent = e as CustomEvent;
    
    // Clean up previous game state
    if (deps.state.currentGameId) {
      await deps.realtimeSyncManager.disconnect();
      deps.state.currentGameId = null;
    }
    
    deps.hostMonitor.stop();
    
    // Clear player models
    deps.collections.remotePlayerModels.forEach((model) => {
      deps.gameEngine.removeFromScene(model.getModel());
    });
    deps.collections.remotePlayerModels.clear();
    
    deps.collections.aiPlayerModels.forEach((model) => {
      deps.gameEngine.removeFromScene(model.getModel());
    });
    deps.collections.aiPlayerModels.clear();
    
    // Clear remote players from game state
    deps.gameState.clearRemotePlayers();
    
    // Reset game state
    deps.gameState.setGamePhase('lobby');
    deps.state.gameHasStarted = false;
    deps.state.wasOni = false;
    
    // Reset local player
    deps.gameState.setLocalPlayerPosition({ x: 0, y: 2, z: 0 });
    deps.gameState.setLocalPlayerVelocity({ x: 0, y: 0, z: 0 });
    deps.gameState.setLocalPlayerIsOni(false);
    
    // Show canvas during lobby
    const canvas = document.getElementById('bg') as HTMLCanvasElement;
    if (canvas) {
      canvas.style.display = 'block';
    }
    
    // Resume game engine first
    deps.gameEngine.resume();
    
    // Generate city for lobby (with delay to ensure initialization)
    setTimeout(() => {
      const { gameId } = customEvent.detail;
      const gameIdForCity = gameId || `game-${Date.now()}`;
      
      if (!cityState.city) {
        try {
          cityState.cityGenerator = new CityGenerator(gameIdForCity);
          cityState.city = cityState.cityGenerator.generateCity();
          deps.gameEngine.addToScene(cityState.city);
          
          // Update collision system with buildings
          const buildingData = cityState.cityGenerator.getBuildingData();
          deps.systems.collisionSystem.registerBuildings(buildingData);
          deps.systems.playerPhysics.registerBuildings(buildingData);
          
          // Register river and bridge data
          const riverData = cityState.cityGenerator.getRiverData();
          if (riverData) {
            deps.systems.playerPhysics.registerWaterAreas([riverData]);
          }
          const bridgeData = cityState.cityGenerator.getBridgeData();
          if (bridgeData && bridgeData.length > 0) {
            deps.systems.playerPhysics.registerBridges(bridgeData);
          }
          
          // Note: Ladders and road segments are not yet implemented in CityGenerator
          // TODO: Add getLadders() and getRoadSegments() methods to CityGenerator
        } catch (error) {
          console.error('[Lobby] Failed to generate city:', error);
        }
      }
    }, 100);
    
    const { currentPlayers, maxPlayers, isHost: isHostFlag, gameId } = customEvent.detail;
    deps.state.isHost = isHostFlag;
    
    // Set current game ID
    if (gameId) {
      deps.state.currentGameId = gameId;
      
      // Start host monitoring
      if (deps.state.isHost) {
        deps.hostMonitor.startAsHost(gameId);
      } else {
        deps.hostMonitor.startAsParticipant(gameId);
        
        // Set up host disconnect callback
        deps.hostMonitor.onHostDisconnect(() => {
          deps.toast.error(deps.i18n.t('lobby.hostDisconnected'), 5000);
          
          setTimeout(() => {
            window.dispatchEvent(new Event('returnToMenu'));
          }, 2000);
        });
      }
    }
    
    // Fetch game config from server
    if (gameId) {
      try {
        const serverGameState = await deps.gameApiClient.getGameState(gameId);
        if (serverGameState?.config?.timeOfDay) {
          deps.gameEngine.setTimeOfDay(serverGameState.config.timeOfDay);
        }
      } catch (error) {
        console.warn('[Lobby] Failed to fetch game config:', error);
      }
    }
    
    // Show lobby screen
    deps.uiMenu.showLobbyScreen(currentPlayers, maxPlayers, isHostFlag);
  }) as EventListener);
}

/**
 * Setup countdown event handler
 */
export function setupCountdownHandler(
  deps: EventHandlerDependencies,
  cityState: CityState
): void {
  window.addEventListener('gameStartCountdown', ((e: Event) => {
    const customEvent = e as CustomEvent;
    
    // Reset game state for new game
    deps.state.gameStarted = false;
    deps.state.gameHasStarted = false;
    deps.state.gameStartTime = 0;
    deps.state.lastGameEndCheck = 0;
    deps.state.wasOni = false;
    
    // Clear tagged time map
    deps.state.taggedTimeMap.clear();
    
    // Clear AI sync time map
    deps.state.aiLastSyncTime.clear();
    
    // If host, broadcast game-start to all players
    if (!customEvent.detail?.startTimestamp && deps.state.isHost) {
      const config = customEvent.detail?.config || deps.gameState.getGameConfig();
      deps.realtimeSyncManager.sendGameStart(config);
    }
    
    // Hide lobby screen
    const overlay = document.querySelector('.overlay') as HTMLElement;
    if (overlay) {
      overlay.style.display = 'none';
    }
    
    // Show canvas and resume game engine
    const canvas = document.getElementById('bg') as HTMLCanvasElement;
    if (canvas) {
      canvas.style.display = 'block';
    }
    deps.gameEngine.resume();
    
    // Set game config
    if (customEvent.detail?.config) {
      deps.gameState.setGameConfig(customEvent.detail.config);
      
      // Apply time of day setting
      const timeOfDay = customEvent.detail.config.timeOfDay || 'day';
      deps.gameEngine.setTimeOfDay(timeOfDay);
    }
    
    // Set game ID and connect to Realtime
    if (customEvent.detail?.gameId) {
      deps.state.currentGameId = customEvent.detail.gameId as string;
      
      const playerId = deps.gameState.getLocalPlayer().id;
      void deps.realtimeSyncManager.connect(deps.state.currentGameId, playerId);
    }
    
    // Change phase to countdown
    deps.gameState.setGamePhase('countdown');
    
    // Generate city during countdown (if not already generated)
    const gameIdForCity = deps.state.currentGameId || `game-${Date.now()}`;
    if (!cityState.city) {
      cityState.cityGenerator = new CityGenerator(gameIdForCity);
      cityState.city = cityState.cityGenerator.generateCity();
      deps.gameEngine.addToScene(cityState.city);
      
      // Update collision system with buildings
      const buildingData: BuildingData[] = cityState.cityGenerator.getBuildingData();
      deps.systems.collisionSystem.registerBuildings(buildingData);
      deps.systems.playerPhysics.registerBuildings(buildingData);
      
      // Register river and bridge data
      const riverData = cityState.cityGenerator.getRiverData();
      if (riverData) {
        deps.systems.playerPhysics.registerWaterAreas([riverData]);
      }
      const bridgeData = cityState.cityGenerator.getBridgeData();
      if (bridgeData && bridgeData.length > 0) {
        deps.systems.playerPhysics.registerBridges(bridgeData);
      }
      
      // Note: Ladders and road segments are not yet implemented in CityGenerator
      // TODO: Add getLadders() and getRoadSegments() methods to CityGenerator
    }
    
    // Start countdown
    const startTimestamp = customEvent.detail?.startTimestamp || Date.now();
    deps.uiCountdown.start(10, async () => {
      window.dispatchEvent(new CustomEvent('gameStart', {
        detail: {
          config: deps.gameState.getGameConfig(),
          gameId: deps.state.currentGameId,
        },
      }));
    }, startTimestamp);
  }) as EventListener);
}
