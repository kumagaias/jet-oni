/**
 * JetOni - Main entry point
 * A 3D multiplayer tag game built with Three.js and Devvit
 */

import * as THREE from 'three';
import { GameEngine } from './game/game-engine';
import { GameState } from './game/game-state';
import { TagSystem } from './game/tag-system';
import { CityGenerator } from './environment/city-generator';
import { DynamicObjects } from './environment/dynamic-objects';
import { LadderSystem } from './environment/ladder-system';
import { CollisionSystem } from './environment/collision-system';
import { PlayerController } from './player/player-controller';
import { PlayerPhysics, BuildingData } from './player/player-physics';
import { PlayerCamera, CameraMode } from './player/player-camera';

import { BeaconVisual } from './effects/beacon-visual';
import { VisualIndicators } from './effects/visual-indicators';
import { ParticleSystem } from './effects/particle-system';
import { OniSpawnItem } from './items/oni-spawn-item';
import { CloakItem } from './items/cloak-item';
import { CarSystem } from './environment/car-system';
import { AIController } from './ai/ai-controller';
import { PlayerModel } from './player/player-model';
import { I18n } from './i18n/i18n';
import { UIManager } from './ui/ui-manager';
import { UIMenu } from './ui/ui-menu';
import { UICountdown } from './ui/ui-countdown';
import { UILoading } from './ui/ui-loading';
import { ToastNotification } from './ui/toast-notification';
import { GameAPIClient } from './api/game-api-client';
import { RealtimeSyncManager } from './sync/realtime-sync-manager';
import { HostMonitor } from './game/host-monitor';
import { en } from './i18n/translations/en';
import { jp } from './i18n/translations/jp';
import { InitResponse } from '../shared/types/api';
import { MAX_FUEL } from '../shared/constants';

// Debug: Log that main.ts is executing
console.log('[Main] main.ts executing');
console.log('[Main] User agent:', navigator.userAgent);
console.log('[Main] Window size:', window.innerWidth, 'x', window.innerHeight);

// Create translations object
const translations = { en, jp };

// Initialize i18n system
const i18n = new I18n(translations);
console.log('[Main] i18n initialized');

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
      // Check if username is anonymous (Google login issue)
      if (data.username === 'anonymous' || !data.username) {
        console.warn('[Init] Username is anonymous - Reddit account may not be fully set up');
        
        // Show warning message to user
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
            Please set up your Reddit username to create games.<br>
            You can still join games created by others.
          </span>
        `;
        document.body.appendChild(warningDiv);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
          warningDiv.style.transition = 'opacity 0.5s';
          warningDiv.style.opacity = '0';
          setTimeout(() => warningDiv.remove(), 500);
        }, 10000);
      }
      
      // Generate unique player ID
      const playerId = data.username || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize game state with player ID
      const gameState = new GameState(playerId);
      
      // Start in lobby state
      gameState.setGamePhase('lobby');
      
      // Generate city environment with fixed seed (will be regenerated with gameId when game starts)
      // Use fixed seed for initial lobby view
      const initialSeed = 'lobby-preview-city';
      const cityGenerator = new CityGenerator(initialSeed);
      let city = cityGenerator.generateCity();
      gameEngine.addToScene(city);
      
      // Generate dynamic objects (cars, pedestrians, ladders)
      let dynamicObjects = new DynamicObjects();
      let dynamicGroup = dynamicObjects.initialize(cityGenerator.getBuildings());
      gameEngine.addToScene(dynamicGroup);
      
      // Initialize ladder system
      const ladderSystem = new LadderSystem();
      ladderSystem.registerLadders(dynamicObjects.getLadders());
      
      // Initialize collision system
      const collisionSystem = new CollisionSystem();
      // Get building data directly from city generator (already in correct format)
      const buildingData: BuildingData[] = cityGenerator.getBuildingData();
      collisionSystem.registerBuildings(buildingData);
      
      // Initialize player physics
      const playerPhysics = new PlayerPhysics();
      playerPhysics.registerBuildings(buildingData);
      
      // Register river and bridge data for water physics
      const riverData = cityGenerator.getRiverData();
      if (riverData) {
        playerPhysics.registerWaterAreas([riverData]);
      }
      const bridgeData = cityGenerator.getBridgeData();
      playerPhysics.registerBridges(bridgeData);
      
      // Initialize player camera
      const playerCamera = new PlayerCamera(gameEngine.getCamera(), gameState);
      
      // Initialize player controller
      const playerController = new PlayerController(gameState);
      playerController.setLadderSystem(ladderSystem);
      playerController.setPlayerPhysics(playerPhysics);
      playerController.init();
      
      // Initialize tag system
      const tagSystem = new TagSystem(gameState);
      tagSystem.onTag((_event) => {
      });
      
      // Initialize ONI spawn item system
      const oniSpawnItem = new OniSpawnItem(gameEngine.getScene());
      
      // Initialize cloak item system
      const cloakItem = new CloakItem(gameEngine.getScene());
      
      // Initialize beacon visual (for showing player locations when beacon is active)
      const beaconVisual = new BeaconVisual(gameEngine.getScene());
      
      // Initialize visual indicators (player markers)
      const visualIndicators = new VisualIndicators(gameEngine.getScene());
      
      // Initialize particle system (jetpack and dash effects)
      const particleSystem = new ParticleSystem(gameEngine.getScene());
      
      // Initialize tag range visual (shows ONI tagging range)
      const { TagRangeVisual } = await import('./effects/tag-range-visual');
      const tagRangeVisual = new TagRangeVisual(gameEngine.getScene());
      
      // Initialize target lock visual (shows lock-on for nearby runners)
      const { TargetLockVisual } = await import('./effects/target-lock-visual');
      const targetLockVisual = new TargetLockVisual(gameEngine.getScene());
      
      // Set up callback for when targets are locked
      targetLockVisual.onTargetLocked((targetIds: string[]) => {
        const localPlayer = gameState.getLocalPlayer();
        
        // If local player (runner) is one of the locked targets, show warning
        if (targetIds.includes(localPlayer.id)) {
          toast.show('⚠️ 見つかった！', 'warning', 2000);
          
          // Show spotted indicator above player
          const playerPos = new THREE.Vector3(
            localPlayer.position.x,
            localPlayer.position.y,
            localPlayer.position.z
          );
          visualIndicators.showSpottedIndicator(localPlayer.id, playerPos, 2);
        }
      });
      
      // Initialize jetpack effect (shows jetpack particles)
      const { JetpackEffect } = await import('./effects/jetpack-effect');
      const jetpackEffect = new JetpackEffect(gameEngine.getScene());
      
      // Beacon visual is now only used for Super ONI ability (implemented later)
      
      // Track cloak state
      let cloakActiveUntil = 0;
      const CLOAK_DURATION = 60; // seconds
      
      // Initialize car system
      const carSystem = new CarSystem(gameEngine.getScene());
      carSystem.setPlayerPhysics(playerPhysics);
      carSystem.init();
      
      // Initialize AI system
      const aiController = new AIController(gameState);
      const aiPlayerModels: Map<string, PlayerModel> = new Map();
      
      // Track remote player models (for multiplayer)
      const remotePlayerModels: Map<string, PlayerModel> = new Map();
      
      // Add AI players when in lobby (will be added when game is created)
      const addAIPlayers = (count: number) => {
        for (let i = 0; i < count; i++) {
          const aiId = `ai-${i}`;
          
          // Check if this AI already exists
          const existingPlayer = gameState.getPlayer(aiId);
          if (existingPlayer) {
            continue; // Skip if already exists
          }
          
          // Spread AI players across the map (200x200 area)
          const startPos = {
            x: (Math.random() - 0.5) * 200,
            y: 2,
            z: (Math.random() - 0.5) * 200,
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
            tagCount: 0,
            isAI: true, // Mark as AI player
          });
          
          // Create 3D model for AI player
          const aiModel = new PlayerModel(false);
          aiModel.setName(`AI-${i + 1}`);
          aiModel.setPosition(startPos.x, startPos.y, startPos.z);
          gameEngine.addToScene(aiModel.getModel());
          aiPlayerModels.set(aiId, aiModel);
        }
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
            return;
          }
          
          debugMode = !debugMode;
          debugInfo.style.display = debugMode ? 'block' : 'none';
        }
      });
      
      // Track previous ONI state to detect changes
      let wasOni = gameState.getLocalPlayer().isOni;
      let gameHasStarted = false;
      let gameStartTime = 0;
      let lastTimerSync = 0; // Track last timer sync time
      
      // Setup game loop
      gameEngine.onUpdate((deltaTime: number) => {
        // Get mobile control input and apply to player controller
        const buttonState = uiControls.getButtonState();
        
        // Set mobile input state (separate from keyboard)
        playerController.setMobileInputState({
          forward: buttonState.moveForward,
          backward: buttonState.moveBackward,
          left: buttonState.moveLeft,
          right: buttonState.moveRight,
          dash: buttonState.dash || buttonState.jetpack,
          jetpack: buttonState.dash || buttonState.jetpack,
          jump: buttonState.jump,
          beacon: buttonState.beacon,
        });
        
        // Update player controller (will merge keyboard + mobile internally)
        playerController.update(deltaTime);
        
        // Check if player became ONI (only after game has started)
        const localPlayer = gameState.getLocalPlayer();
        if (gameHasStarted && localPlayer.isOni && !wasOni) {
          // Show toast message when becoming ONI
          toast.show(i18n.t('game.becameOni'), 'warning');
        }
        wasOni = localPlayer.isOni;
        
        // Update ONI screen overlay (always visible when ONI, fixed to screen)
        let oniOverlay = document.getElementById('oni-overlay');
        if (!oniOverlay) {
          oniOverlay = document.createElement('div');
          oniOverlay.id = 'oni-overlay';
          oniOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 10;
            background-color: transparent;
            transition: background-color 0.3s ease;
          `;
          document.body.appendChild(oniOverlay);
        }
        
        // Always show red overlay when ONI (fixed to screen, not affected by player movement)
        if (localPlayer.isOni) {
          oniOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        } else {
          oniOverlay.style.backgroundColor = 'transparent';
        }
        
        // Check ONI spawn item collection (ONI only) - spawns 2 AI ONI
        const collectedOniSpawn = oniSpawnItem.checkCollection(localPlayer.position, localPlayer.isOni);
        if (collectedOniSpawn) {
          oniSpawnItem.collectItem(collectedOniSpawn.id);
          
          // Show collection message
          toast.show('ONI Spawn Item collected! 2 AI ONI incoming!', 'warning', 3000);
          
          // Spawn 2 AI ONI from the sky
          const oniCount = 2;
          
          for (let i = 0; i < oniCount; i++) {
            const spawnX = (Math.random() - 0.5) * 360;
            const spawnZ = (Math.random() - 0.5) * 360;
            const spawnY = 50;
            
            const aiId = `spawn-oni-${Date.now()}-${i}`;
            
            const aiPlayer = {
              id: aiId,
              username: `Sky ONI ${i + 1}`,
              isOni: true,
              isAI: true,
              position: { x: spawnX, y: spawnY, z: spawnZ },
              velocity: { x: 0, y: 0, z: 0 },
              rotation: { yaw: 0, pitch: 0 },
              fuel: 100,
              survivedTime: 0,
              wasTagged: false,
              isOnSurface: false,
              isDashing: false,
              isJetpacking: false,
              beaconCooldown: 0,
              tagCount: 0,
            };
            
            gameState.updateRemotePlayer(aiPlayer);
            
            const aiModel = new PlayerModel(false);
            aiModel.setIsOni(true);
            aiModel.setName(`Sky ONI ${i + 1}`);
            aiModel.setPosition(spawnX, spawnY, spawnZ);
            gameEngine.addToScene(aiModel.getModel());
            aiPlayerModels.set(aiPlayer.id, aiModel);
          }
        }
        
        // Check cloak item collection (Runner only)
        const collectedCloak = cloakItem.checkCollection(localPlayer.position, localPlayer.isOni);
        if (collectedCloak) {
          cloakItem.collectItem(collectedCloak.id);
          // Activate cloak for 60 seconds
          cloakActiveUntil = Date.now() + CLOAK_DURATION * 1000;
          // Show toast message
          toast.show(i18n.t('game.cloakActivated'), 'info', 3000);
          
          // Switch to third-person view when cloak is activated
          playerCamera.setAutoSwitch(false); // Disable auto-switch
          playerCamera.setMode(CameraMode.THIRD_PERSON);
        }
        
        // Check if cloak has expired and switch back to first-person
        if (cloakActiveUntil > 0 && Date.now() >= cloakActiveUntil) {
          // Only switch back once when cloak expires
          if (playerCamera.getMode() === CameraMode.THIRD_PERSON && !localPlayer.isClimbing) {
            playerCamera.setMode(CameraMode.FIRST_PERSON);
            playerCamera.setAutoSwitch(true); // Re-enable auto-switch
          }
        }
        
        // Animate ONI spawn items
        oniSpawnItem.animate(deltaTime);
        
        // Animate cloak items
        cloakItem.animate(deltaTime);
        
        // Update UI controls
        uiControls.update(gameState);
        
        // Update AI players (only during gameplay)
        if (gameState.getGamePhase() === 'playing') {
          // Host sends timer sync every 10 seconds
          if (isHost && gameStartTime > 0) {
            const now = Date.now();
            if (now - lastTimerSync >= 10000) { // 10 seconds
              lastTimerSync = now;
              realtimeSyncManager.sendTimerSync(gameStartTime);
            }
          }
          
          // Update survived time for local player
          gameState.updateLocalPlayerSurvivedTime(deltaTime);
          
          // Update cloak state for AI (AI ignores cloaked player)
          const isCloaked = Date.now() < cloakActiveUntil;
          aiController.setCloakedPlayer(isCloaked ? localPlayer.id : null);
          
          aiController.update(deltaTime);
          
          // Update tag system (check for tags between players)
          tagSystem.update();
        }
        
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
            
            // If collision occurred, try to move AI around obstacle
            let finalVelocity = physicsResult.velocity;
            let finalPosition = collisionResult.position;
            
            if (collisionResult.collided) {
              // Instead of reducing velocity, try to move AI around obstacle
              // Calculate perpendicular direction to try
              const perpendicular1 = {
                x: -aiPlayer.velocity.z,
                y: aiPlayer.velocity.y,
                z: aiPlayer.velocity.x,
              };
              const perpendicular2 = {
                x: aiPlayer.velocity.z,
                y: aiPlayer.velocity.y,
                z: -aiPlayer.velocity.x,
              };
              
              // Try moving in perpendicular directions
              const altPosition1 = {
                x: aiPlayer.position.x + perpendicular1.x * deltaTime,
                y: aiPlayer.position.y + perpendicular1.y * deltaTime,
                z: aiPlayer.position.z + perpendicular1.z * deltaTime,
              };
              const altPosition2 = {
                x: aiPlayer.position.x + perpendicular2.x * deltaTime,
                y: aiPlayer.position.y + perpendicular2.y * deltaTime,
                z: aiPlayer.position.z + perpendicular2.z * deltaTime,
              };
              
              const altCollision1 = collisionSystem.checkCollision(aiPlayer.position, altPosition1, 0.5);
              const altCollision2 = collisionSystem.checkCollision(aiPlayer.position, altPosition2, 0.5);
              
              // Use the first non-colliding alternative, or reduce velocity if both collide
              if (!altCollision1.collided) {
                finalPosition = altCollision1.position;
                finalVelocity = perpendicular1;
              } else if (!altCollision2.collided) {
                finalPosition = altCollision2.position;
                finalVelocity = perpendicular2;
              } else {
                // Both alternatives collide, reduce velocity
                finalVelocity = {
                  x: physicsResult.velocity.x * 0.3,
                  y: physicsResult.velocity.y,
                  z: physicsResult.velocity.z * 0.3,
                };
              }
            }
            
            // Update AI player position and state
            gameState.setPlayerPosition(aiId, finalPosition);
            gameState.setPlayerVelocity(aiId, finalVelocity);
            gameState.setPlayerOnSurface(aiId, physicsResult.isOnSurface);
            
            // Get updated player state from game state
            const updatedAiPlayer = gameState.getPlayer(aiId);
            if (updatedAiPlayer) {
              // Update AI player model with the latest position from game state
              aiModel.setPosition(
                updatedAiPlayer.position.x,
                updatedAiPlayer.position.y,
                updatedAiPlayer.position.z
              );
              if (updatedAiPlayer.rotation) {
                aiModel.setRotation(updatedAiPlayer.rotation.yaw);
              }
              aiModel.setIsOni(updatedAiPlayer.isOni);
            }
          }
        }
        
        // Update beacon visuals (will be used for Super ONI ability later)
        beaconVisual.update(gameState.getAllPlayers(), false, localPlayer.id);
        beaconVisual.animate(deltaTime);
        
        // Update dynamic objects (cars, pedestrians)
        dynamicObjects.update(deltaTime);
        
        // Update car system
        carSystem.update(deltaTime);
        
        // Update collision system with car positions (only during gameplay)
        if (gameState.getGamePhase() === 'playing') {
          collisionSystem.updateDynamicObjects(carSystem.getDynamicObjects());
        } else {
          // Clear dynamic objects during countdown
          collisionSystem.updateDynamicObjects([]);
        }
        
        // Apply physics to player (skip if climbing)
        if (!localPlayer.isClimbing) {
          const physicsResult = playerPhysics.applyPhysics(
            localPlayer.position,
            localPlayer.velocity,
            deltaTime,
            localPlayer.isJetpacking
          );
          
          // Check car collision first (for bounce effect) - only during gameplay
          let finalVelocity = physicsResult.velocity;
          if (gameState.getGamePhase() === 'playing') {
            const carCollision = carSystem.checkCarCollision(
              physicsResult.position,
              physicsResult.velocity
            );
            
            // If car collision, apply bounce velocity
            if (carCollision.collided) {
              finalVelocity = carCollision.newVelocity;
            }
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
        
        // Update visual effects AFTER physics (so they use updated positions)
        // Update tag range visual (show ONI tagging range) - only during gameplay
        if (gameState.getGamePhase() === 'playing' || gameState.getGamePhase() === 'countdown') {
          tagRangeVisual.update(gameState.getAllPlayers());
          
          // Update target lock visual (show lock-on for nearby runners when ONI)
          const localPlayerData = gameState.getLocalPlayer();
          const localPlayerFull = gameState.getAllPlayers().find(p => p.id === localPlayerData.id);
          if (localPlayerFull) {
            const camera = gameEngine.getCamera();
            targetLockVisual.update(localPlayerFull, gameState.getAllPlayers(), camera);
          }
        }
        
        // Update jetpack effect (show jetpack particles for all players)
        jetpackEffect.update(gameState.getAllPlayers(), deltaTime);
        
        // Update visual indicators (player markers) - only during gameplay
        if (gameState.getGamePhase() === 'playing' || gameState.getGamePhase() === 'countdown') {
          const allPlayers = gameState.getAllPlayers();
          const localPlayerId = gameState.getLocalPlayer().id;
          
          for (const player of allPlayers) {
            // Skip local player's marker (don't show own marker in first-person view)
            if (player.id === localPlayerId) {
              visualIndicators.removeMarker(player.id);
              continue;
            }
            
            // Check if player is moving (velocity magnitude > threshold)
            const velocityMagnitude = Math.sqrt(
              player.velocity.x * player.velocity.x +
              player.velocity.z * player.velocity.z
            );
            const isMoving = velocityMagnitude > 0.5;
            
            // Update marker for this player
            visualIndicators.updateMarker(
              player.id,
              new THREE.Vector3(player.position.x, player.position.y, player.position.z),
              player.isOni,
              isMoving
            );
          }
        } else {
          // Clear markers when not in gameplay
          visualIndicators.clear();
        }
        
        // Update particle system (jetpack and dash effects)
        particleSystem.update(deltaTime, gameState.getAllPlayers());
        
        // Update camera
        playerCamera.update(deltaTime);
        
        // Send player state to sync manager (only during gameplay, not in lobby)
        const phase = gameState.getGamePhase();
        
        if (phase === 'playing' && currentGameId !== null && realtimeSyncManager.isConnected()) {
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
            survivedTime: localPlayer.survivedTime,
          });
        }
        
        // Update interpolation for remote players
        realtimeSyncManager.updateInterpolation(deltaTime);
        
        // Update debug info
        const oniSpawnItemsCount = oniSpawnItem.getPlacedItems().length;
        
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
          ${localPlayer.isOni ? `ONI Spawn Items: ${oniSpawnItemsCount}<br>` : ''}
          <br>
          <strong>F3:</strong> Toggle ONI/Runner${localPlayer.isOni ? '<br><strong>Collect ONI spawn items to summon AI ONI</strong>' : ''}
        `;
      });
      
      // Initialize GameAPIClient
      const gameApiClient = new GameAPIClient();
      
      // Initialize RealtimeSyncManager
      const realtimeSyncManager = new RealtimeSyncManager();
      
      // Initialize HostMonitor
      const hostMonitor = new HostMonitor(gameApiClient);
      
      // Track if local player is host
      let isHost = false;
      
      // Register callback for player disconnection
      realtimeSyncManager.onPlayerDisconnect(async (playerId) => {
        
        // If we have a current game, notify server to replace with AI
        if (currentGameId) {
          try {
            await gameApiClient.replacePlayerWithAI(currentGameId, playerId);
          } catch (error) {
            console.error(`Failed to replace player ${playerId} with AI:`, error);
          }
        }
      });
      
      // Register callback for remote player updates
      realtimeSyncManager.onRemotePlayerUpdate((remotePlayers) => {
        // Skip if no remote players (avoid clearing game state during connection)
        if (remotePlayers.length === 0) {
          return;
        }
        
        // Update or create models for remote players
        for (const remotePlayer of remotePlayers) {
          let model = remotePlayerModels.get(remotePlayer.id);
          
          if (!model) {
            // Create new model for remote player
            model = new PlayerModel(false);
            model.setName(remotePlayer.username);
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
            tagCount: remotePlayer.tagCount ?? 0,
            isAI: remotePlayer.isAI ?? false, // Preserve AI flag from remote player
          });
        }
        
        // Remove models for players that left (but keep AI players)
        const remotePlayerIds = new Set(remotePlayers.map(p => p.id));
        for (const [playerId, model] of remotePlayerModels) {
          // Don't remove AI players (they don't send Realtime updates)
          const player = gameState.getPlayer(playerId);
          const isAIPlayer = player?.isAI ?? false;
          
          if (!remotePlayerIds.has(playerId) && !isAIPlayer) {
            gameEngine.removeFromScene(model.getModel());
            remotePlayerModels.delete(playerId);
            gameState.removePlayer(playerId);
          }
        }
      });
      
      // Initialize UI menu
      const uiMenu = new UIMenu(uiManager, i18n, data.username || 'Player', gameApiClient, gameEngine);
      
      // Initialize toast notification
      const toast = new ToastNotification(i18n);
      toast.init();
      
      // Set up tag event handler to show toast notifications
      tagSystem.onTag((tagEvent) => {
        const localPlayerId = gameState.getLocalPlayer().id;
        const tagger = gameState.getPlayer(tagEvent.taggerId);
        const tagged = gameState.getPlayer(tagEvent.taggedId);
        const taggerName = tagger?.username || 'Someone';
        const taggedName = tagged?.username || 'Someone';
        
        // Show message to all players with player names
        if (tagEvent.taggedId === localPlayerId) {
          // Local player got tagged
          toast.showGotTagged(taggerName, 'You');
        } else if (tagEvent.taggerId === localPlayerId) {
          // Local player tagged someone
          toast.showTagged(taggedName, 'You');
        } else {
          // Show tag event to all other players
          toast.show(`${taggedName} tagged by ${taggerName}!`, 'info', 3000);
        }
      });
      
      // Hide loading screen after UI is ready
      uiLoading.hide();
      
      // Initialize countdown UI
      const uiCountdown = new UICountdown(i18n);
      
      // Initialize HUD (but keep it hidden until game starts)
      const { UIHud } = await import('./ui/ui-hud');
      const uiHud = new UIHud(gameState, i18n);
      uiHud.hide(); // Hide until game starts
      
      // Initialize UI controls for mobile
      console.log('[Main] About to create UIControls...');
      const { UIControls } = await import('./ui/ui-controls');
      console.log('[Main] UIControls imported');
      const uiControls = new UIControls(gameState, i18n);
      console.log('[Main] UIControls instance created');
      uiControls.hide(); // Hide until game starts
      console.log('[Main] UIControls hidden');
      
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
              window.dispatchEvent(new Event('gameEnd'));
            }
          }
        }
      });
      
      // Track current game ID for sync
      let currentGameId: string | null = null;
      
      // Listen for game start countdown event (when host presses start button)
      window.addEventListener('gameStartCountdown', ((e: Event) => {
        const customEvent = e as CustomEvent;
        
        // If this is the host (no startTimestamp in detail), broadcast game-start to all players
        if (!customEvent.detail?.startTimestamp && isHost) {
          const config = customEvent.detail?.config || gameState.getGameConfig();
          realtimeSyncManager.sendGameStart(config);
        }
        
        // Hide lobby screen (overlay)
        const overlay = document.querySelector('.overlay') as HTMLElement;
        if (overlay) {
          overlay.style.display = 'none';
        }
        
        // Show canvas and resume game engine
        const canvas = document.getElementById('bg') as HTMLCanvasElement;
        if (canvas) {
          canvas.style.display = 'block';
        }
        gameEngine.resume();
        
        // Set game config if provided
        if (customEvent.detail?.config) {
          gameState.setGameConfig(customEvent.detail.config);
        }
        
        // Set game ID
        if (customEvent.detail?.gameId) {
          currentGameId = customEvent.detail.gameId as string;
        }
        
        // Change phase to countdown
        gameState.setGamePhase('countdown');
        
        // Show controls during countdown so mobile players can move
        uiControls.show();
        
        // Start countdown (10 seconds) with timestamp synchronization
        const startTimestamp = customEvent.detail?.startTimestamp || Date.now();
        uiCountdown.start(10, () => {
          // Countdown complete - trigger actual game start
          window.dispatchEvent(new CustomEvent('gameStart', {
            detail: {
              config: gameState.getGameConfig(),
              gameId: currentGameId,
            },
          }));
        }, startTimestamp);
      }) as EventListener);
      
      // Track if game has been started to prevent duplicate starts
      let gameStarted = false;
      
      // Listen for game start event (after countdown)
      window.addEventListener('gameStart', (async (e: Event) => {
        const customEvent = e as CustomEvent;
        if (gameStarted) {
          return;
        }
        gameStarted = true;
        
        // Clear all remote player models from previous game
        for (const [playerId, model] of remotePlayerModels.entries()) {
          gameEngine.removeFromScene(model.getModel());
        }
        remotePlayerModels.clear();
        aiPlayerModels.clear();
        
        // Clear all players from game state (except local player)
        gameState.clearRemotePlayers();
        
        // Regenerate city with gameId as seed for consistent map across all players
        if (customEvent.detail?.gameId) {
          const gameId = customEvent.detail.gameId as string;
          
          // Remove old city
          gameEngine.removeFromScene(city);
          
          // Generate new city with gameId as seed
          const newCityGenerator = new CityGenerator(gameId);
          city = newCityGenerator.generateCity();
          gameEngine.addToScene(city);
          
          // Update collision system with new buildings
          const newBuildingData: BuildingData[] = newCityGenerator.getBuildingData();
          collisionSystem.registerBuildings(newBuildingData);
          playerPhysics.registerBuildings(newBuildingData);
          
          // Register river and bridge data for water physics
          const newRiverData = newCityGenerator.getRiverData();
          if (newRiverData) {
            playerPhysics.registerWaterAreas([newRiverData]);
          }
          const newBridgeData = newCityGenerator.getBridgeData();
          playerPhysics.registerBridges(newBridgeData);
          
          // Regenerate dynamic objects
          gameEngine.removeFromScene(dynamicGroup);
          dynamicObjects = new DynamicObjects();
          dynamicGroup = dynamicObjects.initialize(newCityGenerator.getBuildings());
          gameEngine.addToScene(dynamicGroup);
          
          // Update ladder system
          ladderSystem.registerLadders(dynamicObjects.getLadders());
          
        }
        
        // Show canvas and resume game engine
        const canvas = document.getElementById('bg') as HTMLCanvasElement;
        if (canvas) {
          canvas.style.display = 'block';
        }
        gameEngine.resume();
        
        // Set game config if provided
        if (customEvent.detail?.config) {
          gameState.setGameConfig(customEvent.detail.config);
        } else {
          // Default config if not provided
          gameState.setGameConfig({
            totalPlayers: 6,
            roundDuration: 300,
            rounds: 1,
          });
        }
        
        // Fetch latest game state from server to get AI players
        if (currentGameId) {
          try {
            const serverGameState = await gameApiClient.getGameState(currentGameId);
            const localPlayer = gameState.getLocalPlayer();
            
            // Find the server player that matches the local player's username
            const matchingServerPlayer = serverGameState.players.find(p => 
              p.username === localPlayer.id || // If local ID is username
              p.id === localPlayer.id // If local ID already matches
            );
            
            if (matchingServerPlayer) {
              // Update local player ID to match server
              gameState.setLocalPlayerId(matchingServerPlayer.id);
              
              // Update local player ONI status from server
              gameState.setLocalPlayerIsOni(matchingServerPlayer.isOni);
            }
            
            // Update local game state with server players
            const updatedLocalPlayerId = matchingServerPlayer?.id || localPlayer.id;
            for (const player of serverGameState.players) {
              if (player.id !== updatedLocalPlayerId) {
                // Set random spawn position for each player (spread across entire map)
                const spawnX = (Math.random() - 0.5) * 360; // Random X between -180 and 180
                const spawnZ = (Math.random() - 0.5) * 360; // Random Z between -180 and 180
                const spawnPosition = { x: spawnX, y: 2, z: spawnZ };
                
                // Update player with spawn position
                const playerWithSpawn = {
                  ...player,
                  position: spawnPosition,
                };
                
                gameState.updateRemotePlayer(playerWithSpawn);
                
                // Create 3D model for remote player if not exists
                if (!remotePlayerModels.has(player.id)) {
                  const remoteModel = new PlayerModel(player.isOni);
                  remoteModel.setName(player.username);
                  remoteModel.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);
                  remoteModel.setIsOni(player.isOni); // Ensure ONI status is set
                  gameEngine.addToScene(remoteModel.getModel());
                  remotePlayerModels.set(player.id, remoteModel);
                }
                
                // If AI player, also add to AI models map
                if (player.isAI && !aiPlayerModels.has(player.id)) {
                  const aiModel = remotePlayerModels.get(player.id);
                  if (aiModel) {
                    aiPlayerModels.set(player.id, aiModel);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Failed to fetch game state from server:', error);
          }
        }
        
        gameState.setGamePhase('playing');
        gameHasStarted = true; // Mark that game has started
        gameStartTime = Date.now(); // Record game start time
        
        // Reset tag system grace period
        tagSystem.resetGameStartTime();
        
        uiHud.show();
        uiHud.startTimer(gameState.getGameConfig()?.roundDuration ?? 300);
        uiHud.update(0); // Force initial update to show correct player counts
        uiControls.show();
        
        // Set random spawn position for local player (spread across entire map)
        const spawnX = (Math.random() - 0.5) * 360; // Random X between -180 and 180
        const spawnZ = (Math.random() - 0.5) * 360; // Random Z between -180 and 180
        const localPlayer = gameState.getLocalPlayer();
        localPlayer.position = { x: spawnX, y: 2, z: spawnZ };
        localPlayer.velocity = { x: 0, y: 0, z: 0 };
        
        // Start Realtime synchronization if gameId is provided
        if (customEvent.detail?.gameId) {
          currentGameId = customEvent.detail.gameId as string;
          const playerId = gameState.getLocalPlayer().id;
          void realtimeSyncManager.connect(currentGameId, playerId);
          
          // Start host monitoring if not already started
          if (!hostMonitor.isMonitoring()) {
            if (isHost) {
              hostMonitor.startAsHost(currentGameId);
            } else {
              hostMonitor.startAsParticipant(currentGameId);
              
              // Set up host disconnect callback
              hostMonitor.onHostDisconnect(() => {
                toast.error(i18n.t('lobby.hostDisconnected'), 5000);
                
                // Return to title screen after a short delay
                setTimeout(() => {
                  window.dispatchEvent(new Event('returnToMenu'));
                }, 2000);
              });
            }
          }
        } else {
          console.warn('[Realtime] No gameId provided in gameStart event');
        }
        
        // Use ONI assignment from server (already set when syncing with server)
        // Check if local player is ONI and show appropriate message
        setTimeout(() => {
          const localPlayer = gameState.getLocalPlayer();
          
          if (localPlayer.isOni) {
            // Update wasOni to prevent "Became ONI" message
            wasOni = true;
            
            // Show ONI role message
            toast.show(i18n.t('game.assignedOni'), 'warning', 5000);
          } else {
            // Show Runner role message
            toast.show(i18n.t('game.assignedRunner'), 'info', 5000);
          }
          
          // Update AI model colors based on server ONI assignment
          for (const [playerId, aiModel] of aiPlayerModels) {
            const player = gameState.getPlayer(playerId);
            if (player && player.isOni) {
              aiModel.setIsOni(true);
            }
          }
        }, 1500); // 1.5s delay for better UX
        
        // Place ONI spawn items on the map
        const buildings = cityGenerator.getBuildingData();
        oniSpawnItem.placeItems(buildings);
        
        // Place cloak items on the map
        cloakItem.placeItems(buildings);
      }) as unknown as EventListener);
      
      // Listen for lobby exit event (when host leaves lobby)
      window.addEventListener('lobbyExit', (async () => {
        
        // If host, delete the game
        if (isHost && currentGameId) {
          await hostMonitor.deleteGameOnExit();
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
        
        // Clear remote players from game state
        gameState.clearRemotePlayers();
        
        // Clean up
        hostMonitor.stop();
        isHost = false;
        currentGameId = null;
      }) as EventListener);
      
      // Listen for lobby event (when user creates a game)
      window.addEventListener('showLobby', (async (e: Event) => {
        const customEvent = e as CustomEvent;
        
        // Clean up previous game state first
        
        // Disconnect from Realtime if connected
        if (currentGameId) {
          await realtimeSyncManager.disconnect();
          currentGameId = null;
        }
        
        // Stop host monitoring
        hostMonitor.stop();
        
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
        
        // Clear remote players from game state
        gameState.clearRemotePlayers();
        
        // Reset game state
        gameState.setGamePhase('lobby');
        gameHasStarted = false;
        wasOni = false;
        
        // Reset local player
        gameState.setLocalPlayerPosition({ x: 0, y: 2, z: 0 });
        gameState.setLocalPlayerVelocity({ x: 0, y: 0, z: 0 });
        gameState.setLocalPlayerIsOni(false);
        
        
        // Hide canvas during lobby
        const canvas = document.getElementById('bg') as HTMLCanvasElement;
        if (canvas) {
          canvas.style.display = 'none';
        }
        
        // Pause game engine
        gameEngine.pause();
        
        const { currentPlayers, maxPlayers, isHost: isHostFlag, gameId } = customEvent.detail;
        isHost = isHostFlag;
        
        // Set current game ID
        if (gameId) {
          currentGameId = gameId;
          
          // Start host monitoring
          if (isHost) {
            hostMonitor.startAsHost(gameId);
          } else {
            hostMonitor.startAsParticipant(gameId);
            
            // Set up host disconnect callback
            hostMonitor.onHostDisconnect(() => {
              toast.error(i18n.t('lobby.hostDisconnected'), 5000);
              
              // Return to title screen after a short delay
              setTimeout(() => {
                window.dispatchEvent(new Event('returnToMenu'));
              }, 2000);
            });
          }
        }
        
        // Add AI players to fill remaining slots
        const aiCount = maxPlayers - currentPlayers;
        if (aiCount > 0) {
          addAIPlayers(aiCount);
        }
        
        // Show lobby with human player count only (not including AI)
        uiMenu.showLobbyScreen(currentPlayers, maxPlayers, isHostFlag);
      }) as EventListener);
      
      // Listen for timer sync event (participants only)
      window.addEventListener('timerSync', ((e: CustomEvent) => {
        if (!isHost && e.detail?.gameStartTime) {
          // Sync game start time from host
          gameStartTime = e.detail.gameStartTime;
          gameState.setGameStartTime(gameStartTime);
        }
      }) as EventListener);
      
      // Listen for game end event
      window.addEventListener('gameEnd', async () => {
        
        // Set game phase to ended immediately to stop game loop updates
        gameState.setGamePhase('ended');
        
        // Show "Game Over" message immediately
        const gameOverMessage = document.createElement('div');
        gameOverMessage.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 64px;
          font-weight: bold;
          color: #ffffff;
          text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.8);
          z-index: 9999;
          animation: pulse 1s ease-in-out infinite;
        `;
        gameOverMessage.textContent = i18n.t('game.gameOver');
        document.body.appendChild(gameOverMessage);
        
        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.1); }
          }
        `;
        document.head.appendChild(style);
        
        // Disconnect from Realtime (don't wait)
        void realtimeSyncManager.disconnect();
        
        // Call endGame API if we have a game ID
        if (currentGameId) {
          try {
            const endGameResponse = await gameApiClient.endGame(currentGameId);
            
            // Remove game over message
            gameOverMessage.remove();
            style.remove();
            
            // Show results screen with game results
            if (endGameResponse.success && endGameResponse.results) {
              const { UIResults } = await import('./ui/ui-results');
              const { GameResults } = await import('./game/game-results');
              const gameResults = new GameResults();
              
              // Convert PlayerResult[] to Player[] for GameResults
              // Use local survivedTime if available, fallback to server data
              const players = gameState.getAllPlayers().map(player => {
                const serverPlayer = endGameResponse.results?.players.find(p => p.id === player.id);
                return {
                  ...player,
                  survivedTime: player.survivedTime || serverPlayer?.survivedTime || 0,
                  wasTagged: serverPlayer?.wasTagged || player.wasTagged || false,
                  tagCount: serverPlayer?.tagCount || player.tagCount || 0,
                };
              });
              
              gameResults.setResults(players, null);
              const uiResults = new UIResults(gameResults, i18n);
              uiResults.create();
              
              // Track if already returning to menu to prevent duplicate calls
              let returningToMenu = false;
              
              // Set callback to return to menu
              uiResults.setOnBackToMenu(() => {
                // Prevent duplicate calls
                if (returningToMenu) {
                  return;
                }
                returningToMenu = true;
                
                // Hide and destroy results screen
                uiResults.hide();
                uiResults.destroy();
                
                // Reset game state
                gameState.setGamePhase('lobby');
                gameHasStarted = false;
                gameStarted = false;
                wasOni = false;
                
                // Clean up visual effects
                tagRangeVisual.dispose();
                targetLockVisual.dispose();
                visualIndicators.clear();
                particleSystem.dispose();
                
                // Remove ONI overlay
                const oniOverlay = document.getElementById('oni-overlay');
                if (oniOverlay) {
                  oniOverlay.remove();
                }
                
                // Hide HUD and controls
                uiHud.hide();
                uiControls.hide();
                
                // Disconnect from Realtime (if not already disconnected)
                if (currentGameId && realtimeSyncManager.isConnected()) {
                  void realtimeSyncManager.disconnect();
                }
                currentGameId = null;
                
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
                
                // Clear remote players from game state
                gameState.clearRemotePlayers();
                
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
                }
                
                // Show title screen
                uiMenu.showTitleScreen();
                
              });
              
              uiResults.show(gameState.getLocalPlayer().id);
            }
          } catch (error) {
            console.error('Failed to end game:', error);
            // Show error message but still transition to ended state
          }
        }
        
        // currentGameId will be cleared in the back to menu callback
        
        // Clean up visual effects (if not already done)
        if (gameState.getGamePhase() === 'ended') {
          tagRangeVisual.dispose();
          targetLockVisual.dispose();
          visualIndicators.clear();
          particleSystem.dispose();
          
          // Hide HUD and controls
          uiHud.hide();
          uiControls.hide();
        }
        
      });
      
      uiMenu.showTitleScreen();
      
      // Start game loop (will be paused by showTitleScreen)
      gameEngine.start();
      
    } else {
      console.error('Invalid response from server');
      showError('Failed to initialize game');
    }
  } catch (err) {
    console.error('Error initializing game:', err);
    uiLoading.hide();
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
      <button id="error-reload-btn" style="padding: 10px 20px; margin-top: 20px; font-size: 18px; cursor: pointer;">
        Reload
      </button>
    </div>
  `;
  
  // Add event listener for reload button
  document.getElementById('error-reload-btn')?.addEventListener('click', () => {
    location.reload();
  });
}

// Start the game
void initGame();
