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

import { BeaconVisual } from './effects/beacon-visual';
import { BeaconItem } from './items/beacon-item';
import { CarSystem } from './environment/car-system';
import { AIController } from './ai/ai-controller';
import { PlayerModel } from './player/player-model';
import { I18n } from './i18n/i18n';
import { UIManager } from './ui/ui-manager';
import { UIMenu } from './ui/ui-menu';
import { GameAPIClient } from './api/game-api-client';
import { RealtimeSyncManager } from './sync/realtime-sync-manager';
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
      // Generate unique player ID
      const playerId = data.username || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize game state with player ID
      const gameState = new GameState(playerId);
      
      // Start in lobby state
      gameState.setGamePhase('lobby');
      
      // Generate city environment with fixed seed for consistent map across all players
      console.log('Generating city...');
      const cityGenerator = new CityGenerator('jetoni-v1'); // Fixed seed ensures same map for all players
      const city = cityGenerator.generateCity();
      gameEngine.addToScene(city);
      console.log('City generated with seed: jetoni-v1');
      
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
      
      // Initialize beacon item system
      const beaconItem = new BeaconItem(gameEngine.getScene());
      
      // Initialize beacon visual (for showing player locations when beacon is active)
      const beaconVisual = new BeaconVisual(gameEngine.getScene());
      
      // Track beacon state
      let beaconActiveUntil = 0;
      const BEACON_DURATION = 10; // seconds
      
      // Initialize car system
      const carSystem = new CarSystem(gameEngine.getScene());
      carSystem.init();
      console.log('Car system initialized');
      
      // Initialize AI system
      const aiController = new AIController(gameState);
      const aiPlayerModels: Map<string, PlayerModel> = new Map();
      
      // Track remote player models (for multiplayer)
      const remotePlayerModels: Map<string, PlayerModel> = new Map();
      
      // Add AI players when in lobby (will be added when game is created)
      const addAIPlayers = (count: number) => {
        for (let i = 0; i < count; i++) {
          const aiId = `ai-${i}`;
          const startPos = {
            x: (Math.random() - 0.5) * 40,
            y: 2,
            z: (Math.random() - 0.5) * 40,
          };
          
          gameState.updateRemotePlayer({
            id: aiId,
            username: `AI-${i + 1}`,
            position: startPos,
            velocity: { x: 0, y: 0, z: 0 },
            rotation: { yaw: 0, pitch: 0 },
            fuel: MAX_FUEL,
            isOni: false,
            isOnSurface: true,
            isDashing: false,
            isJetpacking: false,
            survivedTime: 0,
            wasTagged: false,
            beaconCooldown: 0,
            isAI: true, // Mark as AI player
          });
          
          // Create 3D model for AI player
          const aiModel = new PlayerModel(false);
          aiModel.setPosition(startPos.x, startPos.y, startPos.z);
          gameEngine.addToScene(aiModel.getModel());
          aiPlayerModels.set(aiId, aiModel);
        }
        console.log(`Added ${count} AI players with 3D models`);
      };
      
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
      
      // Toggle debug mode with F2 (only in r/jet_oni_dev)
      let debugMode = false;
      
      window.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
          e.preventDefault();
          
          // Check if in dev subreddit (check every time in case URL changes)
          const url = window.location.href.toLowerCase();
          const isDevSubreddit = url.includes('jet_oni_dev') || 
                                 url.includes('localhost') ||
                                 url.includes('playtest');
          
          // Only allow debug mode in dev subreddit
          if (!isDevSubreddit) {
            console.log('Debug mode is only available in r/jet_oni_dev. Current URL:', window.location.href);
            return;
          }
          
          debugMode = !debugMode;
          debugInfo.style.display = debugMode ? 'block' : 'none';
          console.log(`Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
        }
      });
      
      // Track previous ONI state to detect changes
      let wasOni = gameState.getLocalPlayer().isOni;
      let gameHasStarted = false;
      
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
        
        // Check if player became ONI (only after game has started)
        const localPlayer = gameState.getLocalPlayer();
        if (gameHasStarted && localPlayer.isOni && !wasOni) {
          console.log('Became ONI');
        }
        wasOni = localPlayer.isOni;
        
        // Update ONI screen overlay
        let oniOverlay = document.getElementById('oni-overlay');
        if (!oniOverlay) {
          oniOverlay = document.createElement('div');
          oniOverlay.id = 'oni-overlay';
          oniOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
            transition: background-color 0.5s ease;
          `;
          document.body.appendChild(oniOverlay);
        }
        
        if (localPlayer.isOni) {
          oniOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.15)';
        } else {
          oniOverlay.style.backgroundColor = 'transparent';
        }
        
        // Check beacon item collection (ONI only)
        const collectedBeacon = beaconItem.checkCollection(localPlayer.position, localPlayer.isOni);
        if (collectedBeacon) {
          beaconItem.collectItem(collectedBeacon.id);
          // Activate beacon for 10 seconds
          beaconActiveUntil = Date.now() + BEACON_DURATION * 1000;
          console.log('Beacon collected! Activated for 10 seconds');
        }
        
        // Animate beacon items
        beaconItem.animate(deltaTime);
        
        // Update UI controls
        uiControls.update(gameState);
        
        // Update AI players
        aiController.update(deltaTime);
        
        // Apply physics to AI players and update models
        for (const [aiId, aiModel] of aiPlayerModels) {
          const aiPlayer = gameState.getPlayer(aiId);
          if (aiPlayer) {
            // Apply physics to AI player
            const physicsResult = playerPhysics.applyPhysics(
              aiPlayer.position,
              aiPlayer.velocity,
              deltaTime,
              aiPlayer.isJetpacking
            );
            
            // Apply collision detection
            const collisionResult = collisionSystem.checkCollision(
              aiPlayer.position,
              physicsResult.position,
              0.5 // AI player radius
            );
            
            // Update AI player position and state
            gameState.setPlayerPosition(aiId, collisionResult.position);
            gameState.setPlayerVelocity(aiId, physicsResult.velocity);
            gameState.setPlayerOnSurface(aiId, physicsResult.isOnSurface);
            
            // Update AI player model
            aiModel.setPosition(collisionResult.position.x, collisionResult.position.y, collisionResult.position.z);
            if (aiPlayer.rotation) {
              aiModel.setRotation(aiPlayer.rotation.yaw);
            }
            aiModel.setIsOni(aiPlayer.isOni);
          }
        }
        
        // Update beacon visuals (show player locations when beacon is active)
        const now = Date.now();
        const isBeaconActive = now < beaconActiveUntil;
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
        
        // Send player state to sync manager (if game is playing)
        if (gameState.getGamePhase() === 'playing' && currentGameId !== null) {
          const localPlayer = gameState.getLocalPlayer();
          realtimeSyncManager.sendPlayerState({
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
        
        // Update interpolation for remote players
        realtimeSyncManager.updateInterpolation(deltaTime);
        
        // Update debug info
        const beaconActive = Date.now() < beaconActiveUntil;
        const beaconTimeRemaining = beaconActive ? Math.ceil((beaconActiveUntil - Date.now()) / 1000) : 0;
        const beaconItemsCount = beaconItem.getPlacedItems().length;
        
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
          <br>
          Beacon: ${beaconActive ? `ACTIVE (${beaconTimeRemaining}s)` : 'Inactive'}<br>
          ${localPlayer.isOni ? `Beacon Items: ${beaconItemsCount}<br>` : ''}
          <br>
          <strong>F3:</strong> Toggle ONI/Runner${localPlayer.isOni ? '<br><strong>Collect beacon items to activate</strong>' : ''}
        `;
      });
      
      // Initialize GameAPIClient
      const gameApiClient = new GameAPIClient();
      
      // Initialize RealtimeSyncManager
      const realtimeSyncManager = new RealtimeSyncManager();
      
      // Register callback for player disconnection
      realtimeSyncManager.onPlayerDisconnect(async (playerId) => {
        console.log(`Player ${playerId} disconnected`);
        
        // If we have a current game, notify server to replace with AI
        if (currentGameId) {
          try {
            await gameApiClient.replacePlayerWithAI(currentGameId, playerId);
            console.log(`Replaced disconnected player ${playerId} with AI`);
          } catch (error) {
            console.error(`Failed to replace player ${playerId} with AI:`, error);
          }
        }
      });
      
      // Register callback for remote player updates
      realtimeSyncManager.onRemotePlayerUpdate((remotePlayers) => {
        // Update or create models for remote players
        for (const remotePlayer of remotePlayers) {
          let model = remotePlayerModels.get(remotePlayer.id);
          
          if (!model) {
            // Create new model for remote player
            model = new PlayerModel(false);
            gameEngine.addToScene(model.getModel());
            remotePlayerModels.set(remotePlayer.id, model);
          }
          
          // Update model position and state (interpolated position from GameSyncManager)
          model.setPosition(
            remotePlayer.position.x,
            remotePlayer.position.y,
            remotePlayer.position.z
          );
          if (remotePlayer.rotation) {
            model.setRotation(remotePlayer.rotation.yaw);
          }
          model.setIsOni(remotePlayer.isOni);
          
          // Update game state with remote player data
          gameState.updateRemotePlayer({
            id: remotePlayer.id,
            username: remotePlayer.username,
            position: remotePlayer.position,
            velocity: remotePlayer.velocity,
            rotation: remotePlayer.rotation,
            fuel: remotePlayer.fuel,
            isOni: remotePlayer.isOni,
            isOnSurface: remotePlayer.isOnSurface,
            isDashing: remotePlayer.isDashing,
            isJetpacking: remotePlayer.isJetpacking,
            survivedTime: remotePlayer.survivedTime,
            wasTagged: remotePlayer.wasTagged,
            beaconCooldown: remotePlayer.beaconCooldown,
            isAI: false, // Remote players are not AI
          });
        }
        
        // Remove models for players that left
        const remotePlayerIds = new Set(remotePlayers.map(p => p.id));
        for (const [playerId, model] of remotePlayerModels) {
          if (!remotePlayerIds.has(playerId)) {
            gameEngine.removeFromScene(model.getModel());
            remotePlayerModels.delete(playerId);
            gameState.removePlayer(playerId);
          }
        }
      });
      
      // Initialize UI menu
      const uiMenu = new UIMenu(uiManager, i18n, data.username || 'Player', gameApiClient, gameEngine);
      
      // Initialize HUD (but keep it hidden until game starts)
      const { UIHud } = await import('./ui/ui-hud');
      const uiHud = new UIHud(gameState, i18n);
      uiHud.hide(); // Hide until game starts
      
      // Initialize UI controls for mobile
      const { UIControls } = await import('./ui/ui-controls');
      const uiControls = new UIControls(gameState, i18n);
      uiControls.hide(); // Hide until game starts
      
      // Add HUD update to game loop
      let lastGameEndCheck = 0;
      gameEngine.onUpdate((_deltaTime: number) => {
        if (gameState.getGamePhase() === 'playing') {
          // No beacon cooldown in item-based system
          uiHud.update(0);
          
          // Check if game should end (only once per second to reduce overhead)
          const now = Date.now();
          if (now - lastGameEndCheck > 1000) {
            lastGameEndCheck = now;
            if (gameState.shouldGameEnd()) {
              console.log('Game should end - triggering gameEnd event');
              window.dispatchEvent(new Event('gameEnd'));
            }
          }
        }
      });
      
      // Track current game ID for sync
      let currentGameId: string | null = null;
      
      // Listen for game start event
      window.addEventListener('gameStart', ((e: CustomEvent) => {
        console.log('Game starting - showing HUD and controls');
        
        // Set game config if provided
        if (e.detail?.config) {
          gameState.setGameConfig(e.detail.config);
          console.log(`Game config set: ${e.detail.config.roundDuration}s duration, ${e.detail.config.totalPlayers} players`);
        } else {
          // Default config if not provided
          gameState.setGameConfig({
            totalPlayers: 6,
            roundDuration: 300,
            rounds: 1,
          });
          console.log('Using default game config: 300s duration, 6 players');
        }
        
        // Ensure AI players are added before game starts
        const config = gameState.getGameConfig();
        const currentPlayerCount = gameState.getAllPlayers().length;
        const aiNeeded = (config?.totalPlayers ?? 6) - currentPlayerCount;
        if (aiNeeded > 0) {
          console.log(`[Game Start] Adding ${aiNeeded} AI players`);
          addAIPlayers(aiNeeded);
        }
        
        gameState.setGamePhase('playing');
        gameHasStarted = true; // Mark that game has started
        
        uiHud.show();
        uiHud.startTimer(gameState.getGameConfig()?.roundDuration ?? 300);
        uiControls.show();
        
        // Debug: Log initial player state (once at game start)
        const allPlayersAtStart = gameState.getAllPlayers();
        console.log('[Game Start] Local player isOni:', gameState.getLocalPlayer().isOni);
        console.log('[Game Start] ONI count:', gameState.countOniPlayers(), 'Runners:', gameState.countRunnerPlayers());
        console.log('[Game Start] All players:', allPlayersAtStart.length, allPlayersAtStart.map(p => ({ id: p.id, username: p.username, isAI: p.isAI })));
        
        // Set random spawn position for local player
        const spawnX = (Math.random() - 0.5) * 180; // Random X between -90 and 90
        const spawnZ = (Math.random() - 0.5) * 180; // Random Z between -90 and 90
        const localPlayer = gameState.getLocalPlayer();
        localPlayer.position = { x: spawnX, y: 2, z: spawnZ };
        localPlayer.velocity = { x: 0, y: 0, z: 0 };
        console.log(`Spawned at (${spawnX.toFixed(1)}, 2, ${spawnZ.toFixed(1)})`);
        
        // Start Realtime synchronization if gameId is provided
        if (e.detail?.gameId) {
          currentGameId = e.detail.gameId as string;
          const playerId = gameState.getLocalPlayer().id;
          console.log(`[Realtime] Connecting to game ${currentGameId} as player ${playerId}`);
          void realtimeSyncManager.connect(currentGameId, playerId);
        } else {
          console.warn('[Realtime] No gameId provided in gameStart event');
        }
        
        // Assign random ONI after a short delay to ensure all players are loaded
        // Note: In multiplayer, ONI assignment should be done by the server
        // For now, each client assigns ONI independently (will be synced via Realtime)
        setTimeout(() => {
          const allPlayers = gameState.getAllPlayers();
          console.log('[ONI Assignment] Total players:', allPlayers.length);
          
          if (allPlayers.length > 0) {
            // Calculate number of ONI: minimum 2, or 1/3 of total players (rounded up)
            const oniCount = Math.max(2, Math.ceil(allPlayers.length / 3));
            console.log(`[ONI Assignment] Assigning ${oniCount} ONI out of ${allPlayers.length} players`);
            
            // Shuffle players and select first N as ONI
            const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
            const oniPlayers = shuffled.slice(0, oniCount);
            
            // Assign ONI status
            oniPlayers.forEach(oniPlayer => {
              if (oniPlayer.id === gameState.getLocalPlayer().id) {
                // Local player is ONI
                gameState.setLocalPlayerIsOni(true);
                console.log('You are ONI!');
                // Update wasOni to prevent "Became ONI" message
                wasOni = true;
              } else {
                // Remote/AI player is ONI
                const remotePlayer = gameState.getPlayer(oniPlayer.id);
                if (remotePlayer) {
                  remotePlayer.isOni = true;
                  // Update AI model color
                  const aiModel = aiPlayerModels.get(oniPlayer.id);
                  if (aiModel) {
                    aiModel.setIsOni(true);
                  }
                  console.log(`${oniPlayer.username} is ONI!`);
                }
              }
            });
            
            // Ensure local player is set as runner if not selected as ONI
            if (!oniPlayers.some(p => p.id === gameState.getLocalPlayer().id)) {
              gameState.setLocalPlayerIsOni(false);
            }
          }
        }, 100); // 100ms delay to ensure AI players are added
        
        // Place beacon items on the map
        const buildings = cityGenerator.getBuildingData();
        beaconItem.placeItems(buildings);
        console.log('Beacon items placed on map');
      }) as EventListener);
      
      // Listen for lobby event (when user creates a game)
      window.addEventListener('showLobby', ((e: CustomEvent) => {
        console.log('Showing lobby');
        gameState.setGamePhase('lobby');
        const { currentPlayers, maxPlayers, isHost } = e.detail;
        
        // Add AI players to fill remaining slots
        const aiCount = maxPlayers - currentPlayers;
        if (aiCount > 0) {
          addAIPlayers(aiCount);
        }
        
        // Show lobby with human player count only (not including AI)
        uiMenu.showLobbyScreen(currentPlayers, maxPlayers, isHost);
      }) as EventListener);
      
      // Listen for game end event
      window.addEventListener('gameEnd', async () => {
        console.log('Game ending - disconnecting from Realtime');
        
        // Disconnect from Realtime
        await realtimeSyncManager.disconnect();
        
        // Call endGame API if we have a game ID
        if (currentGameId) {
          try {
            const endGameResponse = await gameApiClient.endGame(currentGameId);
            console.log('Game ended successfully:', endGameResponse);
            
            // Show results screen with game results
            if (endGameResponse.success && endGameResponse.results) {
              const { UIResults } = await import('./ui/ui-results');
              const { GameResults } = await import('./game/game-results');
              const gameResults = new GameResults();
              
              // Convert PlayerResult[] to Player[] for GameResults
              const players = gameState.getAllPlayers().map(player => ({
                ...player,
                survivedTime: endGameResponse.results?.players.find(p => p.id === player.id)?.survivedTime || 0,
                wasTagged: endGameResponse.results?.players.find(p => p.id === player.id)?.wasTagged || false,
              }));
              
              gameResults.setResults(players, null);
              const uiResults = new UIResults(gameResults, i18n);
              uiResults.create();
              
              // Set callback to return to menu
              uiResults.setOnBackToMenu(() => {
                console.log('[Back to Menu] Starting cleanup...');
                
                // Hide and destroy results screen
                uiResults.hide();
                uiResults.destroy();
                
                // Reset game state
                gameState.setGamePhase('lobby');
                gameHasStarted = false;
                wasOni = false;
                
                // Hide HUD and controls
                uiHud.hide();
                uiControls.hide();
                
                // Disconnect from Realtime
                if (currentGameId) {
                  void realtimeSyncManager.disconnect();
                  currentGameId = null;
                }
                
                // Clear remote player models
                remotePlayerModels.forEach((model) => {
                  gameEngine.removeFromScene(model.getModel());
                });
                remotePlayerModels.clear();
                
                // Clear AI player models
                aiPlayerModels.forEach((model) => {
                  gameEngine.removeFromScene(model.getModel());
                });
                aiPlayerModels.clear();
                
                // Reset local player position
                gameState.setLocalPlayerPosition({ x: 0, y: 2, z: 0 });
                gameState.setLocalPlayerVelocity({ x: 0, y: 0, z: 0 });
                gameState.setLocalPlayerIsOni(false);
                
                // Show canvas again
                const canvas = document.getElementById('bg') as HTMLCanvasElement;
                if (canvas) {
                  canvas.style.display = 'block';
                }
                
                // Resume game engine (for background animation)
                gameEngine.resume();
                
                // Ensure overlay is visible
                const overlay = document.querySelector('.overlay') as HTMLElement;
                if (overlay) {
                  overlay.style.display = 'flex';
                  console.log('[Back to Menu] Overlay display set to flex');
                }
                
                // Show title screen
                uiMenu.showTitleScreen();
                
                console.log('[Back to Menu] Cleanup complete, title screen should be visible');
              });
              
              uiResults.show(gameState.getLocalPlayer().id);
            }
          } catch (error) {
            console.error('Failed to end game:', error);
            // Show error message but still transition to ended state
          }
        }
        
        // Reset game state
        gameState.setGamePhase('ended');
        currentGameId = null;
        
        // Hide HUD and controls
        uiHud.hide();
        uiControls.hide();
        
        console.log('Realtime disconnected');
      });
      
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
