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
import { ScreenFade } from './effects/screen-fade';
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
import { UIMinimap } from './ui/ui-minimap';
import { GameAPIClient } from './api/game-api-client';
import { AIAPIClient } from './api/ai-api-client';
import { RealtimeSyncManager } from './sync/realtime-sync-manager';
import { HostMonitor } from './game/host-monitor';
import { en } from './i18n/translations/en';
import { jp } from './i18n/translations/jp';
import { InitResponse } from '../shared/types/api';
import { MAX_FUEL } from '../shared/constants';

// Main.ts executing

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
      
      // Set local player username (Reddit username)
      gameState.setLocalPlayerUsername(data.username || playerId);
      
      // Start in lobby state
      gameState.setGamePhase('lobby');
      
      // Generate preview city for lobby (will be regenerated with gameId when game starts)
      const previewSeed = 'lobby-preview-city';
      let cityGenerator: CityGenerator = new CityGenerator(previewSeed);
      let city: THREE.Group = cityGenerator.generateCity();
      gameEngine.addToScene(city);
      
      // Generate dynamic objects for preview
      let dynamicObjects: DynamicObjects = new DynamicObjects();
      let dynamicGroup: THREE.Group = dynamicObjects.initialize(cityGenerator.getBuildings());
      gameEngine.addToScene(dynamicGroup);
      
      // Initialize systems with preview city data
      const ladderSystem = new LadderSystem();
      ladderSystem.registerLadders(dynamicObjects.getLadders());
      
      const collisionSystem = new CollisionSystem();
      const buildingData: BuildingData[] = cityGenerator.getBuildingData();
      collisionSystem.registerBuildings(buildingData);
      
      const playerPhysics = new PlayerPhysics();
      playerPhysics.registerBuildings(buildingData);
      
      // Register river and bridge data
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
      
      // Lobby AI players are no longer created on client side
      // They will be created by the server when the game starts
      
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
        // Check if in dev subreddit (check every time in case URL changes)
        const url = window.location.href.toLowerCase();
        const isDevSubreddit = url.includes('jet_oni_dev') || 
                               url.includes('localhost') ||
                               url.includes('playtest');
        
        // F1: Set remaining time to 20 seconds (dev mode only)
        if (e.key === 'F1') {
          e.preventDefault();
          
          // Only allow in dev subreddit
          if (!isDevSubreddit) {
            return;
          }
          
          // Only works during gameplay
          if (gameState.getGamePhase() !== 'playing') {
            console.log('[Debug] F1: Game is not playing, cannot set timer');
            return;
          }
          
          // Get game config to know the round duration
          const config = gameState.getGameConfig();
          if (!config) {
            console.log('[Debug] F1: No game config found');
            return;
          }
          
          // Calculate new start time so that remaining time is 20 seconds
          const newStartTime = Date.now() - (config.roundDuration - 20) * 1000;
          gameState.setGameStartTime(newStartTime);
          
          console.log('[Debug] F1: Set remaining time to 20 seconds');
          toast.show('⏱️ Timer set to 20 seconds!', 'info', 2000);
        }
        
        // F2: Toggle debug mode and minimap
        if (e.key === 'F2') {
          e.preventDefault();
          
          // Only allow debug mode in dev subreddit
          if (!isDevSubreddit) {
            return;
          }
          
          debugMode = !debugMode;
          debugInfo.style.display = debugMode ? 'block' : 'none';
          
          // Toggle minimap
          if (debugMode) {
            uiMinimap.show();
          } else {
            uiMinimap.hide();
          }
        }
        
        // F4: Gather all players to center (dev mode only)
        if (e.key === 'F4') {
          e.preventDefault();
          
          // Only allow in dev subreddit
          if (!isDevSubreddit) {
            return;
          }
          
          // Gather all players to center in a circle
          const players = gameState.getAllPlayers();
          const radius = 20; // 20 units apart
          const angleStep = (Math.PI * 2) / players.length;
          
          players.forEach((player, index) => {
            const angle = angleStep * index;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            gameState.setPlayerPosition(player.id, {
              x: x,
              y: 2, // Ground level
              z: z,
            });
            
            // Reset velocity
            gameState.setPlayerVelocity(player.id, { x: 0, y: 0, z: 0 });
          });
          
          console.log(`[Debug] Gathered ${players.length} players to center`);
        }
      });
      
      // Track previous ONI state to detect changes
      let wasOni = gameState.getLocalPlayer().isOni;
      let gameHasStarted = false;
      let gameStartTime = 0; // Track game start time for timer sync
      let lastTimerSync = 0; // Track last timer sync time
      
      // Create ONI overlay once (outside game loop)
      const oniOverlay = document.createElement('div');
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
          // Update overlay when becoming ONI
          oniOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.05)';
        } else if (gameHasStarted && !localPlayer.isOni && wasOni) {
          // Update overlay when becoming Runner
          oniOverlay.style.backgroundColor = 'transparent';
        }
        wasOni = localPlayer.isOni;
        
        // Check ONI spawn item collection (ONI only) - spawns 2 AI ONI
        const collectedOniSpawn = oniSpawnItem.checkCollection(localPlayer.position, localPlayer.isOni);
        if (collectedOniSpawn) {
          oniSpawnItem.collectItem(collectedOniSpawn.id);
          
          // Broadcast item collection to other players
          realtimeSyncManager.sendItemCollected(collectedOniSpawn.id, 'oni-spawn');
          
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
          
          // Broadcast item collection to other players
          realtimeSyncManager.sendItemCollected(collectedCloak.id, 'cloak');
          
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
        
        // Update minimap (if visible)
        uiMinimap.update();
        
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
          
          // Note: Local player model opacity is not updated here because:
          // 1. Local player is in first-person view (no model visible)
          // 2. Remote players see the cloaked state via their own client
          // 3. Cloak visual effect is handled by the cloak item itself
          
          // Update AI controller (host only)
          if (isHost) {
            aiController.update(deltaTime);
          }
          
          // Update tag system (check for tags between players)
          tagSystem.update();
        }
        
        // Apply physics to AI players and update models (host only)
        if (isHost) {
          for (const [aiId, aiModel] of aiPlayerModels) {
            const aiPlayer = gameState.getPlayer(aiId);
            if (!aiPlayer) {
              console.warn(`[AI] AI player ${aiId} not found in game state`);
              continue;
            }
            
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
                // When AI hits a wall, try multiple escape strategies
                const speed = Math.sqrt(aiPlayer.velocity.x ** 2 + aiPlayer.velocity.z ** 2);
                
                // Strategy 1: Try perpendicular directions (left and right)
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
                
                // Normalize perpendicular vectors
                const perp1Length = Math.sqrt(perpendicular1.x ** 2 + perpendicular1.z ** 2);
                const perp2Length = Math.sqrt(perpendicular2.x ** 2 + perpendicular2.z ** 2);
                
                if (perp1Length > 0) {
                  perpendicular1.x = (perpendicular1.x / perp1Length) * speed;
                  perpendicular1.z = (perpendicular1.z / perp1Length) * speed;
                }
                if (perp2Length > 0) {
                  perpendicular2.x = (perpendicular2.x / perp2Length) * speed;
                  perpendicular2.z = (perpendicular2.z / perp2Length) * speed;
                }
                
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
                
                // Use the first non-colliding alternative
                if (!altCollision1.collided) {
                  finalPosition = altCollision1.position;
                  finalVelocity = perpendicular1;
                } else if (!altCollision2.collided) {
                  finalPosition = altCollision2.position;
                  finalVelocity = perpendicular2;
                } else {
                  // Strategy 2: Try diagonal directions
                  const diagonal1 = {
                    x: (aiPlayer.velocity.x + perpendicular1.x) * 0.5,
                    y: aiPlayer.velocity.y,
                    z: (aiPlayer.velocity.z + perpendicular1.z) * 0.5,
                  };
                  const diagonal2 = {
                    x: (aiPlayer.velocity.x + perpendicular2.x) * 0.5,
                    y: aiPlayer.velocity.y,
                    z: (aiPlayer.velocity.z + perpendicular2.z) * 0.5,
                  };
                  
                  const diagPosition1 = {
                    x: aiPlayer.position.x + diagonal1.x * deltaTime,
                    y: aiPlayer.position.y + diagonal1.y * deltaTime,
                    z: aiPlayer.position.z + diagonal1.z * deltaTime,
                  };
                  const diagPosition2 = {
                    x: aiPlayer.position.x + diagonal2.x * deltaTime,
                    y: aiPlayer.position.y + diagonal2.y * deltaTime,
                    z: aiPlayer.position.z + diagonal2.z * deltaTime,
                  };
                  
                  const diagCollision1 = collisionSystem.checkCollision(aiPlayer.position, diagPosition1, 0.5);
                  const diagCollision2 = collisionSystem.checkCollision(aiPlayer.position, diagPosition2, 0.5);
                  
                  if (!diagCollision1.collided) {
                    finalPosition = diagCollision1.position;
                    finalVelocity = diagonal1;
                  } else if (!diagCollision2.collided) {
                    finalPosition = diagCollision2.position;
                    finalVelocity = diagonal2;
                  } else {
                    // Strategy 3: Try backing up slightly and then moving perpendicular
                    const backupPosition = {
                      x: aiPlayer.position.x - aiPlayer.velocity.x * deltaTime * 0.5,
                      y: aiPlayer.position.y,
                      z: aiPlayer.position.z - aiPlayer.velocity.z * deltaTime * 0.5,
                    };
                    
                    const backupCollision = collisionSystem.checkCollision(aiPlayer.position, backupPosition, 0.5);
                    
                    if (!backupCollision.collided) {
                      finalPosition = backupCollision.position;
                      // Choose a random perpendicular direction
                      finalVelocity = Math.random() > 0.5 ? perpendicular1 : perpendicular2;
                    } else {
                      // Last resort: Stop moving
                      finalVelocity = {
                        x: 0,
                        y: physicsResult.velocity.y,
                        z: 0,
                      };
                    }
                  }
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
                
                // Host: Send AI player state via Realtime (throttled to 2 updates/sec per AI)
                if (isHost) {
                  const now = Date.now();
                  const lastSync = aiLastSyncTime.get(aiId) || 0;
                  
                  if (now - lastSync >= AI_SYNC_INTERVAL) {
                    aiLastSyncTime.set(aiId, now);
                    
                    realtimeSyncManager.sendPlayerState({
                      position: updatedAiPlayer.position,
                      velocity: updatedAiPlayer.velocity,
                      rotation: updatedAiPlayer.rotation,
                      fuel: updatedAiPlayer.fuel,
                      isOni: updatedAiPlayer.isOni,
                      isDashing: updatedAiPlayer.isDashing,
                      isJetpacking: updatedAiPlayer.isJetpacking,
                      isOnSurface: updatedAiPlayer.isOnSurface,
                      beaconCooldown: updatedAiPlayer.beaconCooldown,
                      survivedTime: updatedAiPlayer.survivedTime,
                      wasTagged: updatedAiPlayer.wasTagged,
                      isCloaked: updatedAiPlayer.isCloaked,
                      isAI: true, // Mark as AI player
                    }, updatedAiPlayer.id);
                  }
                }
              }
            }
          }
        } // End of isHost check for AI physics
        
        // Update beacon visuals (will be used for Super ONI ability later)
        beaconVisual.update(gameState.getAllPlayers(), false, localPlayer.id);
        beaconVisual.animate(deltaTime);
        
        // Update dynamic objects (cars, pedestrians) - only if initialized
        if (dynamicObjects) {
          dynamicObjects.update(deltaTime);
        }
        
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
          
          // If collision occurred, apply sliding movement along the wall
          if (collisionResult.collided && collisionResult.normal) {
            // Apply sliding movement to velocity
            finalVelocity = collisionSystem.applySlidingMovement(
              finalVelocity,
              collisionResult.normal
            );
          }
          
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
          const activePlayerIds = new Set(allPlayers.map(p => p.id));
          
          // Remove markers for players that are no longer in the game
          visualIndicators.removeMarkersNotInSet(activePlayerIds);
          
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
          const isCloaked = Date.now() < cloakActiveUntil;
          
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
            isCloaked: isCloaked,
          });
          
          // AI players are now synced via Realtime (see AI update loop above)
          // No need for separate HTTP API sync
        }
        
        // Update interpolation for remote players
        realtimeSyncManager.updateInterpolation(deltaTime);
        
        // Update debug info
        const oniSpawnItemsCount = oniSpawnItem.getPlacedItems().length;
        
        // Get AI player info
        const aiPlayers = gameState.getAllPlayers().filter(p => p.isAI);
        const aiInfo = aiPlayers.map(ai => {
          const speed = Math.sqrt(ai.velocity.x ** 2 + ai.velocity.z ** 2);
          return `${ai.username}: ${ai.isOni ? 'ONI' : 'RUN'} spd=${speed.toFixed(1)}`;
        }).join('<br>          ');
        
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
          ${aiPlayers.length > 0 ? `<br><strong>AI Players (${aiPlayers.length}):</strong><br>          ${aiInfo}<br>` : ''}
          <br>
          <strong>F1:</strong> Set timer to 10s<br>
          <strong>F3:</strong> Toggle ONI/Runner${localPlayer.isOni ? '<br><strong>Collect ONI spawn items to summon AI ONI</strong>' : ''}
        `;
      });
      
      // Initialize GameAPIClient
      const gameApiClient = new GameAPIClient();
      
      // Initialize AIAPIClient
      const aiApiClient = new AIAPIClient();
      
      // Initialize RealtimeSyncManager with shorter interpolation for smoother movement
      const realtimeSyncManager = new RealtimeSyncManager({
        interpolationDuration: 100, // 100ms interpolation (was 500ms default)
      });
      
      // Initialize HostMonitor
      const hostMonitor = new HostMonitor(gameApiClient);
      
      // Track if local player is host
      let isHost = false;
      
      // Register callback for player disconnection
      realtimeSyncManager.onPlayerDisconnect(async (playerId) => {
        // Note: We don't replace disconnected players with AI
        // Disconnected players remain in the game state
        // Their last known position and state are preserved
        console.log(`[Disconnect] Player ${playerId} disconnected`);
      });
      

      
      // Register callback for remote player updates
      realtimeSyncManager.onRemotePlayerUpdate((remotePlayers) => {
        // Skip if no remote players (avoid clearing game state during connection)
        if (remotePlayers.length === 0) {
          return;
        }
        
        // Update or create models for remote players
        for (const remotePlayer of remotePlayers) {
          const isAIPlayer = remotePlayer.isAI ?? false;
          
          // Host: Update AI player state (especially isOni) but don't create models
          if (isHost && isAIPlayer) {
            // Update AI player state in GameState (for tag events)
            const aiPlayer = gameState.getPlayer(remotePlayer.id);
            if (aiPlayer) {
              aiPlayer.isOni = remotePlayer.isOni;
              aiPlayer.wasTagged = remotePlayer.wasTagged;
              aiPlayer.survivedTime = remotePlayer.survivedTime;
              
              // Update AI model
              const aiModel = aiPlayerModels.get(remotePlayer.id);
              if (aiModel) {
                aiModel.setIsOni(remotePlayer.isOni);
              }
            }
            continue;
          }
          
          // Skip local player (don't create model for ourselves)
          if (remotePlayer.id === gameState.getLocalPlayer().id) {
            continue;
          }
          
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
          
          // Update model opacity and visibility based on cloak state
          if (remotePlayer.isCloaked) {
            model.setOpacity(0.05); // 5% opacity when cloaked (almost invisible)
            model.setMarkerVisible(false); // Hide triangle marker
            model.setNameTagVisible(false); // Hide name tag
            console.log(`[Cloak] Player ${remotePlayer.username} is cloaked - hiding marker`);
          } else {
            model.setOpacity(1.0); // 100% opacity when not cloaked
            model.setMarkerVisible(true); // Show triangle marker
            model.setNameTagVisible(true); // Show name tag
          }
          
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
            isAI: isAIPlayer, // Preserve AI flag from remote player
            isCloaked: remotePlayer.isCloaked,
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
      
      // Initialize screen fade effect (early, so it's accessible in all event handlers)
      const screenFade = new ScreenFade();
      
      // Set up tag event handler to show toast notifications
      tagSystem.onTag((tagEvent) => {
        const localPlayerId = gameState.getLocalPlayer().id;
        const tagger = gameState.getPlayer(tagEvent.taggerId);
        const tagged = gameState.getPlayer(tagEvent.taggedId);
        const taggerName = tagger?.username || 'Someone';
        const taggedName = tagged?.username || 'Someone';
        
        // Host: Record tagged time for survivedTime calculation
        if (isHost && tagEvent.taggedId) {
          taggedTimeMap.set(tagEvent.taggedId, Date.now());
          console.log(`[Host] Player ${taggedName} tagged at ${Date.now()}`);
        }
        
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
        
        // Send updated state to Realtime immediately for the tagged player
        if (tagged && currentGameId && realtimeSyncManager.isConnected()) {
          realtimeSyncManager.sendPlayerState({
            position: tagged.position,
            velocity: tagged.velocity,
            rotation: tagged.rotation,
            fuel: tagged.fuel,
            isOni: tagged.isOni, // Now ONI
            isDashing: tagged.isDashing,
            isJetpacking: tagged.isJetpacking,
            isOnSurface: tagged.isOnSurface,
            beaconCooldown: tagged.beaconCooldown,
            survivedTime: tagged.survivedTime,
            wasTagged: tagged.wasTagged,
            isCloaked: false,
            isAI: tagged.isAI,
          }, tagged.id);
        }
      });
      
      // Hide loading screen after UI is ready
      uiLoading.hide();
      
      // Initialize countdown UI
      const uiCountdown = new UICountdown();
      
      // Set countdown change callback to apply night mode at countdown 3
      uiCountdown.setOnCountdownChange((value: number) => {
        // When countdown reaches 3, apply time of day setting
        if (value === 3) {
          const gameConfig = gameState.getGameConfig();
          if (gameConfig?.timeOfDay === 'night') {
            gameEngine.setTimeOfDay('night');
          }
        }
      });
      
      // Initialize minimap (dev mode only)
      const uiMinimap = new UIMinimap(gameState);
      uiMinimap.create();
      
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
          // Calculate cloak remaining time
          const cloakRemaining = Math.max(0, cloakActiveUntil - Date.now());
          
          // Update HUD with cloak timer
          uiHud.update(0, cloakRemaining);
          
          // Check if game should end (only host checks, once per second to reduce overhead)
          // Non-host clients will receive game-end message from host via Realtime
          const now = Date.now();
          if (isHost && now - lastGameEndCheck > 1000) {
            lastGameEndCheck = now;
            if (gameState.shouldGameEnd()) {
              // Broadcast game-end to all players
              if (currentGameId && realtimeSyncManager.isConnected()) {
                realtimeSyncManager.sendGameEnd();
              }
              window.dispatchEvent(new Event('gameEnd'));
            }
          }
        }
      });
      
      // Track current game ID for sync
      let currentGameId: string | null = null;
      
      // Track tagged time for each player (Host only)
      // Map<playerId, taggedTime> - records when each player was tagged
      const taggedTimeMap: Map<string, number> = new Map();
      
      // Track last AI sync time per AI player (to throttle Realtime updates)
      const aiLastSyncTime: Map<string, number> = new Map();
      const AI_SYNC_INTERVAL = 200; // Send AI updates every 200ms (5 times per second)
      
      // Listen for game start countdown event (when host presses start button)
      window.addEventListener('gameStartCountdown', ((e: Event) => {
        const customEvent = e as CustomEvent;
        
        // Reset game state for new game
        gameStarted = false;
        gameHasStarted = false;
        gameStartTime = 0;
        lastGameEndCheck = 0;
        wasOni = false;
        
        // Clear tagged time map
        taggedTimeMap.clear();
        
        // Clear AI sync time map
        aiLastSyncTime.clear();
        
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
          
          // Apply time of day setting from config
          const timeOfDay = customEvent.detail.config.timeOfDay || 'day';
          gameEngine.setTimeOfDay(timeOfDay);
        }
        
        // Set game ID and connect to Realtime
        if (customEvent.detail?.gameId) {
          currentGameId = customEvent.detail.gameId as string;
          
          // Connect to Realtime before countdown starts (so we can send game-start message)
          const playerId = gameState.getLocalPlayer().id;
          void realtimeSyncManager.connect(currentGameId, playerId);
        }
        
        // Change phase to countdown
        gameState.setGamePhase('countdown');
        
        // Show controls during countdown so mobile players can move
        uiControls.show();
        
        // Start countdown (10 seconds) with timestamp synchronization
        const startTimestamp = customEvent.detail?.startTimestamp || Date.now();
        uiCountdown.start(10, async () => {
          // Trigger game start immediately (spawn processing happens during black screen)
          window.dispatchEvent(new CustomEvent('gameStart', {
            detail: {
              config: gameState.getGameConfig(),
              gameId: currentGameId,
            },
          }));
          
          // No fade needed - countdown handles the black screen display
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
        
        console.log(`[Game Start] isHost: ${isHost}, aiPlayerModels size before clear: ${aiPlayerModels.size}, remotePlayerModels size: ${remotePlayerModels.size}`);
        
        // Clear all remote player models from previous game
        for (const [playerId, model] of remotePlayerModels.entries()) {
          gameEngine.removeFromScene(model.getModel());
        }
        remotePlayerModels.clear();
        
        // Clear AI player models for both host and non-host
        // They will be recreated from server game state
        for (const [playerId, model] of aiPlayerModels.entries()) {
          gameEngine.removeFromScene(model.getModel());
        }
        aiPlayerModels.clear();
        
        // Reset AI controller (host only)
        if (isHost) {
          aiController.reset();
        }
        
        // Clear all remote players from game state
        gameState.clearRemotePlayers();
        
        // Regenerate city with gameId as seed for consistent map across all players
        const gameId = customEvent.detail?.gameId as string || `game-${Date.now()}`;
        console.log(`[Game Start] Generating city with gameId: ${gameId}`);
        
        // Remove old city if exists
        if (city) {
          gameEngine.removeFromScene(city);
        }
        
        // Generate new city with gameId as seed
        cityGenerator = new CityGenerator(gameId);
        city = cityGenerator.generateCity();
        gameEngine.addToScene(city);
        console.log(`[Game Start] City generated and added to scene`);
        
        // Update collision system with new buildings
        const newBuildingData: BuildingData[] = cityGenerator.getBuildingData();
        collisionSystem.registerBuildings(newBuildingData);
        playerPhysics.registerBuildings(newBuildingData);
        
        // Register river and bridge data for water physics
        const newRiverData = cityGenerator.getRiverData();
        if (newRiverData) {
          playerPhysics.registerWaterAreas([newRiverData]);
        }
        const newBridgeData = cityGenerator.getBridgeData();
        playerPhysics.registerBridges(newBridgeData);
        
        // Regenerate dynamic objects
        if (dynamicGroup) {
          gameEngine.removeFromScene(dynamicGroup);
        }
        dynamicObjects = new DynamicObjects();
        dynamicGroup = dynamicObjects.initialize(cityGenerator.getBuildings());
        gameEngine.addToScene(dynamicGroup);
        
        // Update ladder system
        ladderSystem.registerLadders(dynamicObjects.getLadders());
        
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
            
            // Sync game start time from server only if it's valid
            // (startTime should be set when game status changes to 'playing')
            if (serverGameState.startTime && serverGameState.startTime > 0) {
              gameStartTime = serverGameState.startTime;
              gameState.setGameStartTime(serverGameState.startTime);
              console.log(`[Game Start] Synced startTime from server: ${serverGameState.startTime}`);
            } else {
              console.log(`[Game Start] Server startTime not set yet, will use client time`);
            }
            
            // Find the server player that matches the local player's username
            const matchingServerPlayer = serverGameState.players.find(p => 
              p.username === localPlayer.id || // If local ID is username
              p.id === localPlayer.id || // If local ID already matches
              p.username === localPlayer.username // Match by username
            );
            
            if (matchingServerPlayer) {
              // Update local player ID to match server
              gameState.setLocalPlayerId(matchingServerPlayer.id);
              
              // Update local player ONI status from server
              gameState.setLocalPlayerIsOni(matchingServerPlayer.isOni);
            }
            
            // Update local game state with server players
            const updatedLocalPlayerId = matchingServerPlayer?.id || localPlayer.id;
            
            // Get buildings for spawn position calculation
            const buildings = cityGenerator.getBuildingData();
            
            // Helper function to find safe spawn position
            const findSafeSpawnPosition = () => {
              const maxAttempts = 50;
              for (let attempt = 0; attempt < maxAttempts; attempt++) {
                const spawnX = (Math.random() - 0.5) * 360;
                const spawnZ = (Math.random() - 0.5) * 360;
                
                let insideBuilding = false;
                for (const building of buildings) {
                  const halfWidth = building.width / 2;
                  const halfDepth = building.depth / 2;
                  
                  if (
                    spawnX >= building.x - halfWidth &&
                    spawnX <= building.x + halfWidth &&
                    spawnZ >= building.z - halfDepth &&
                    spawnZ <= building.z + halfDepth
                  ) {
                    insideBuilding = true;
                    break;
                  }
                }
                
                if (!insideBuilding) {
                  return { x: spawnX, y: 0.5, z: spawnZ };
                }
              }
              return { x: 0, y: 0.5, z: 0 };
            };
            
            for (const player of serverGameState.players) {
              if (player.id === updatedLocalPlayerId) {
                // Set local player spawn position
                const spawnPosition = findSafeSpawnPosition();
                gameState.setLocalPlayerPosition(spawnPosition);
                gameState.setLocalPlayerVelocity({ x: 0, y: 0, z: 0 });
                console.log(`[Game Start] Set local player spawn position: (${spawnPosition.x}, ${spawnPosition.y}, ${spawnPosition.z})`);
              } else {
                // Set random spawn position for remote/AI players
                const spawnPosition = findSafeSpawnPosition();
                
                // Update player with spawn position
                const playerWithSpawn = {
                  ...player,
                  position: spawnPosition,
                };
                
                // Host: Add AI players to aiPlayerModels
                // Non-host: Add all non-local players to remotePlayerModels
                if (isHost && player.isAI) {
                  // Host: Add AI player to game state and aiPlayerModels
                  gameState.updateRemotePlayer(playerWithSpawn);
                  
                  if (!aiPlayerModels.has(player.id)) {
                    const aiModel = new PlayerModel(player.isOni);
                    aiModel.setName(player.username);
                    aiModel.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);
                    aiModel.setIsOni(player.isOni);
                    gameEngine.addToScene(aiModel.getModel());
                    aiPlayerModels.set(player.id, aiModel);
                    console.log(`[Game Start] Created AI model for ${player.id} at (${spawnPosition.x}, ${spawnPosition.y}, ${spawnPosition.z})`);
                  }
                } else if (!isHost || !player.isAI) {
                  // Non-host: Add all non-local players to remotePlayerModels
                  // Host: Add human players (not AI) to remotePlayerModels
                  gameState.updateRemotePlayer(playerWithSpawn);
                  
                  if (!remotePlayerModels.has(player.id)) {
                    const remoteModel = new PlayerModel(player.isOni);
                    remoteModel.setName(player.username);
                    remoteModel.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);
                    remoteModel.setIsOni(player.isOni);
                    gameEngine.addToScene(remoteModel.getModel());
                    remotePlayerModels.set(player.id, remoteModel);
                    console.log(`[Game Start] Created remote model for ${player.id} (isAI: ${player.isAI}) at (${spawnPosition.x}, ${spawnPosition.y}, ${spawnPosition.z})`);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Failed to fetch game state from server:', error);
          }
          
          // Log final player count after server sync
          const finalPlayers = gameState.getAllPlayers();
          console.log(`[Game Start] Final player count: ${finalPlayers.length}`, finalPlayers.map(p => ({ id: p.id, isAI: p.isAI })));
        }
        
        console.log(`[Game Start] After server fetch - aiPlayerModels size: ${aiPlayerModels.size}, remotePlayerModels size: ${remotePlayerModels.size}`);
        
        gameState.setGamePhase('playing');
        gameHasStarted = true; // Mark that game has started
        
        // If startTime was not set from server, use current time as fallback
        if (!gameStartTime) {
          gameStartTime = Date.now();
          gameState.setGameStartTime(gameStartTime);
        }
        
        // Reset tag system grace period
        tagSystem.resetGameStartTime();
        
        uiHud.show();
        uiHud.startTimer(gameState.getGameConfig()?.roundDuration ?? 300);
        uiHud.update(0); // Force initial update to show correct player counts
        uiControls.show();
        
        // Set random spawn position for local player (avoid buildings)
        const buildings = cityGenerator.getBuildingData();
        const findSafeSpawnPosition = () => {
          const maxAttempts = 50;
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const spawnX = (Math.random() - 0.5) * 360; // Random X between -180 and 180
            const spawnZ = (Math.random() - 0.5) * 360; // Random Z between -180 and 180
            
            // Check if position is inside any building
            let insideBuilding = false;
            for (const building of buildings) {
              const halfWidth = building.width / 2;
              const halfDepth = building.depth / 2;
              
              if (
                spawnX >= building.x - halfWidth &&
                spawnX <= building.x + halfWidth &&
                spawnZ >= building.z - halfDepth &&
                spawnZ <= building.z + halfDepth
              ) {
                insideBuilding = true;
                break;
              }
            }
            
            if (!insideBuilding) {
              return { x: spawnX, y: 2, z: spawnZ };
            }
          }
          
          // Fallback: spawn at origin if no safe position found
          return { x: 0, y: 2, z: 0 };
        };
        
        // Set random spawn position for local player (preserve ONI status)
        const localPlayer = gameState.getLocalPlayer();
        const spawnPosition = findSafeSpawnPosition();
        gameState.setLocalPlayerPosition(spawnPosition);
        gameState.setLocalPlayerVelocity({ x: 0, y: 0, z: 0 });
        
        // Log local player state after spawn
        console.log(`[Game Start] Local player after spawn: id=${localPlayer.id}, isOni=${localPlayer.isOni}, position=(${spawnPosition.x}, ${spawnPosition.y}, ${spawnPosition.z})`);
        
        // Start Realtime synchronization if not already connected
        if (customEvent.detail?.gameId) {
          currentGameId = customEvent.detail.gameId as string;
          
          // Only connect if not already connected (may have connected during countdown)
          if (!realtimeSyncManager.isConnected()) {
            const playerId = gameState.getLocalPlayer().id;
            void realtimeSyncManager.connect(currentGameId, playerId);
          }
          
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
        // Wait for fade sequence to complete (300ms + 800ms + 500ms = 1600ms)
        setTimeout(() => {
          const localPlayer = gameState.getLocalPlayer();
          
          if (localPlayer.isOni) {
            // Update wasOni to prevent "Became ONI" message
            wasOni = true;
            
            // Show ONI role message (after fade completes)
            toast.show(i18n.t('game.assignedOni'), 'warning', 5000);
          } else {
            // Show Runner role message (after fade completes)
            toast.show(i18n.t('game.assignedRunner'), 'info', 5000);
          }
          
          // Update AI model colors based on server ONI assignment
          for (const [playerId, aiModel] of aiPlayerModels) {
            const player = gameState.getPlayer(playerId);
            if (player && player.isOni) {
              aiModel.setIsOni(true);
            }
          }
        }, 2000); // 2s delay to wait for fade sequence to complete
        
        // Only host places items on the map
        if (isHost) {
          const buildings = cityGenerator.getBuildingData();
          oniSpawnItem.placeItems(buildings);
          cloakItem.placeItems(buildings);
          
          // Broadcast initial item state to all players
          setTimeout(() => {
            const itemsState = {
              beacons: [],
              cloaks: cloakItem.getItems().map(item => ({
                id: item.id,
                position: item.position,
                state: item.state,
              })),
              oniSpawns: oniSpawnItem.getItems().map(item => ({
                id: item.id,
                position: item.position,
                state: item.state,
              })),
            };
            realtimeSyncManager.sendItemsSync(itemsState);
          }, 500); // Small delay to ensure all players are connected
        }
        // Non-host will receive item positions via itemsSync event
      }) as unknown as EventListener);
      
      // Listen for item collected events from other players
      window.addEventListener('itemCollected', ((event: CustomEvent) => {
        const { itemId, itemType, playerId } = event.detail;
        
        // Skip if it's from local player (already handled)
        const localPlayer = gameState.getLocalPlayer();
        if (playerId === localPlayer.id) {
          return;
        }
        
        // Collect the item locally
        if (itemType === 'cloak') {
          cloakItem.collectItem(itemId);
        } else if (itemType === 'oni-spawn') {
          oniSpawnItem.collectItem(itemId);
        }
      }) as unknown as EventListener);
      
      // Listen for full items sync from host
      window.addEventListener('itemsSync', ((event: CustomEvent) => {
        const { items } = event.detail;
        
        // Place cloak items at positions from host
        if (items.cloaks && items.cloaks.length > 0) {
          cloakItem.placeItemsAtPositions(items.cloaks);
        }
        
        // Place oni spawn items at positions from host
        if (items.oniSpawns && items.oniSpawns.length > 0) {
          oniSpawnItem.placeItemsAtPositions(items.oniSpawns);
        }
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
        console.log(`[Lobby] isHost set to: ${isHost}, gameId: ${gameId}`);
        
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
        
        // Fetch game config from server to get timeOfDay setting
        if (gameId) {
          try {
            const serverGameState = await gameApiClient.getGameState(gameId);
            if (serverGameState?.config?.timeOfDay) {
              gameEngine.setTimeOfDay(serverGameState.config.timeOfDay);
            }
          } catch (error) {
            console.warn('[Lobby] Failed to fetch game config:', error);
          }
        }
        
        // Add AI players to fill remaining slots
        // AI players will be added by the server when the game starts
        // No need to create them in the lobby
        
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
        
        // IMPORTANT: Save elapsed time BEFORE changing game phase
        // because getElapsedTime() returns 0 when game is not playing
        const finalGameElapsedTime = gameState.getElapsedTime();
        console.log(`[Game End] Saved final elapsed time: ${finalGameElapsedTime} seconds`);
        
        // DON'T set game phase to ended yet - we need to update player states first
        // gameState.setGamePhase('ended');
        
        // If host, broadcast game-end message to all players
        if (isHost && currentGameId) {
          realtimeSyncManager.sendGameEnd();
        }
        
        // Show "Game Finished" message immediately
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
        gameOverMessage.textContent = i18n.t('game.gameFinished');
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
        
        // Stop host monitoring to prevent 404 errors
        hostMonitor.stop();
        
        // Disconnect from Realtime (don't wait)
        void realtimeSyncManager.disconnect();
        
        // Call endGame API if we have a game ID
        if (currentGameId) {
          try {
            console.log('[Game End] Starting game end process...');
            
            // CRITICAL FIX: Only host updates all player states to prevent race conditions
            // Non-host clients only update their own player state
            if (isHost) {
              // Host: Update all player states (including survivedTime)
              const allPlayers = gameState.getAllPlayers();
              console.log('[Game End] [HOST] Updating player states for', allPlayers.length, 'players');
              
              // Use the saved elapsed time (not getElapsedTime() which returns 0 after game ends)
              const gameElapsedTime = finalGameElapsedTime;
              const gameStartTime = Date.now() - (gameElapsedTime * 1000);
              console.log(`[Game End] [HOST] Using saved elapsed time: ${gameElapsedTime} seconds`);
              
              const updatePromises = allPlayers.map(player => {
                // Calculate survivedTime based on tagged time
                const taggedTime = taggedTimeMap.get(player.id);
                let finalSurvivedTime: number;
                
                if (taggedTime) {
                  // Player was tagged - calculate time from game start to tagged time
                  finalSurvivedTime = (taggedTime - gameStartTime) / 1000;
                } else {
                  // Player was never tagged - survived the entire game
                  finalSurvivedTime = gameElapsedTime;
                }
                console.log(`[Game End] [HOST] Player ${player.username} (${player.id}): isOni=${player.isOni}, wasTagged=${!!taggedTime}, survivedTime=${finalSurvivedTime}`);
                
                // Validate and sanitize data before sending
                const isValidNumber = (n: number) => typeof n === 'number' && isFinite(n);
                const isValidVector = (v: { x: number; y: number; z: number }) => 
                  isValidNumber(v.x) && isValidNumber(v.y) && isValidNumber(v.z);
                const isValidRotation = (r: { yaw: number; pitch: number }) =>
                  isValidNumber(r.yaw) && isValidNumber(r.pitch);
                
                // Clamp extremely small values to zero (denormalized numbers)
                const clampSmallValues = (n: number, threshold = 1e-100) => 
                  Math.abs(n) < threshold ? 0 : n;
                
                const sanitizedVelocity = {
                  x: clampSmallValues(player.velocity.x),
                  y: clampSmallValues(player.velocity.y),
                  z: clampSmallValues(player.velocity.z)
                };
                
                if (!isValidVector(player.position)) {
                  console.error(`[Game End] [HOST] Invalid position for ${player.id}:`, player.position);
                }
                if (!isValidVector(sanitizedVelocity)) {
                  console.error(`[Game End] [HOST] Invalid velocity for ${player.id}:`, sanitizedVelocity);
                }
                if (!isValidRotation(player.rotation)) {
                  console.error(`[Game End] [HOST] Invalid rotation for ${player.id}:`, player.rotation);
                }
                if (!isValidNumber(player.fuel)) {
                  console.error(`[Game End] [HOST] Invalid fuel for ${player.id}:`, player.fuel);
                }
                
                console.log(`[Game End] [HOST] Updating Player ${player.id}: isOni=${player.isOni}, survivedTime=${finalSurvivedTime}, wasTagged=${player.wasTagged}, tagCount=${player.tagCount}`);
                return gameApiClient.updatePlayerState(currentGameId, player.id, {
                  position: player.position,
                  velocity: sanitizedVelocity,
                  rotation: player.rotation,
                  fuel: player.fuel,
                  isOni: player.isOni,
                  survivedTime: finalSurvivedTime,
                  wasTagged: player.wasTagged,
                  tagCount: player.tagCount,
                }).catch(error => {
                  console.error(`[Game End] [HOST] Failed to update player ${player.username} (${player.id}) state:`, error);
                });
              });
              
              // Wait for all updates to complete
              await Promise.all(updatePromises);
              console.log('[Game End] [HOST] Player states updated');
            } else {
              // Non-host: Only update own player state
              const localPlayer = gameState.getLocalPlayer();
              console.log('[Game End] [NON-HOST] Updating only local player state:', localPlayer.id);
              
              // Validate and sanitize data before sending
              const isValidNumber = (n: number) => typeof n === 'number' && isFinite(n);
              const isValidVector = (v: { x: number; y: number; z: number }) => 
                isValidNumber(v.x) && isValidNumber(v.y) && isValidNumber(v.z);
              const isValidRotation = (r: { yaw: number; pitch: number }) =>
                isValidNumber(r.yaw) && isValidNumber(r.pitch);
              
              // Clamp extremely small values to zero (denormalized numbers)
              const clampSmallValues = (n: number, threshold = 1e-100) => 
                Math.abs(n) < threshold ? 0 : n;
              
              const sanitizedVelocity = {
                x: clampSmallValues(localPlayer.velocity.x),
                y: clampSmallValues(localPlayer.velocity.y),
                z: clampSmallValues(localPlayer.velocity.z)
              };
              
              if (!isValidVector(localPlayer.position)) {
                console.error(`[Game End] [NON-HOST] Invalid position:`, localPlayer.position);
              }
              if (!isValidVector(sanitizedVelocity)) {
                console.error(`[Game End] [NON-HOST] Invalid velocity:`, sanitizedVelocity);
              }
              if (!isValidRotation(localPlayer.rotation)) {
                console.error(`[Game End] [NON-HOST] Invalid rotation:`, localPlayer.rotation);
              }
              if (!isValidNumber(localPlayer.fuel)) {
                console.error(`[Game End] [NON-HOST] Invalid fuel:`, localPlayer.fuel);
              }
              
              console.log(`[Game End] [NON-HOST] Updating local player: isOni=${localPlayer.isOni}, wasTagged=${localPlayer.wasTagged}, tagCount=${localPlayer.tagCount}`);
              await gameApiClient.updatePlayerState(currentGameId, localPlayer.id, {
                position: localPlayer.position,
                velocity: sanitizedVelocity,
                rotation: localPlayer.rotation,
                fuel: localPlayer.fuel,
                isOni: localPlayer.isOni,
                wasTagged: localPlayer.wasTagged,
                tagCount: localPlayer.tagCount,
              }).catch(error => {
                console.error(`[Game End] [NON-HOST] Failed to update local player state:`, error);
              });
              console.log('[Game End] [NON-HOST] Local player state updated');
            }
            
            // NOW set game phase to ended (after updating all player states)
            gameState.setGamePhase('ended');
            
            // Only host calls endGame API to prevent race conditions
            let endGameResponse;
            if (isHost) {
              // Host: Call endGame API to calculate results
              console.log('[Game End] [HOST] Calling endGame API...');
              endGameResponse = await gameApiClient.endGame(currentGameId);
              console.log('[Game End] [HOST] endGame response:', endGameResponse);
            } else {
              // Non-host: Wait a bit for host to calculate results, then fetch them
              console.log('[Game End] [NON-HOST] Waiting for host to calculate results...');
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
              
              console.log('[Game End] [NON-HOST] Fetching game results...');
              endGameResponse = await gameApiClient.endGame(currentGameId);
              console.log('[Game End] [NON-HOST] endGame response:', endGameResponse);
            }
            
            // Keep game finished message visible until results screen is ready
            // Don't remove it here - will be removed when showing results
            
            // Show results screen with game results
            if (endGameResponse && endGameResponse.success && endGameResponse.results) {
              console.log('[Game End] Showing results screen...');
              
              try {
                // Remove any existing results screen from previous game
                const existingResults = document.getElementById('results-screen');
                if (existingResults) {
                  existingResults.remove();
                }
                
                // Fade to black before showing results
                await screenFade.fadeToBlack(500);
                
                const { UIResults } = await import('./ui/ui-results');
                
                // Use server results directly
                const uiResults = new UIResults(endGameResponse.results, i18n);
                uiResults.create();
                
                // Fade from black to reveal results
                await screenFade.fadeFromBlack(500);
                
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
                gameStartTime = 0; // Reset game start time
                lastGameEndCheck = 0; // Reset game end check timer
                
                // Clear tagged time map
                taggedTimeMap.clear();
                
                // Clear AI sync time map
                aiLastSyncTime.clear();
                
                // Reset time of day to default (day)
                gameEngine.setTimeOfDay('day');
                
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
                
                // Remove game finished message before showing results
                gameOverMessage.remove();
                style.remove();
                
                uiResults.show(gameState.getLocalPlayer().id);
              } catch (error) {
                console.error('[Game End] Error showing results:', error);
                // Ensure screen is not stuck in black
                await screenFade.fadeFromBlack(500);
              }
            } else {
              console.error('[Game End] Failed to get results:', endGameResponse);
              // Remove game finished message and show error
              gameOverMessage.remove();
              style.remove();
              
              // Show error toast
              toast.show('Failed to load game results. Returning to menu...', 'error', 3000);
              
              // Return to menu after delay
              setTimeout(() => {
                // Reset and return to menu
                gameState.setGamePhase('lobby');
                gameHasStarted = false;
                gameStarted = false;
                currentGameId = null;
                uiMenu.showTitleScreen();
              }, 3000);
            }
          } catch (error) {
            console.error('[Game End] Error during game end:', error);
            
            // Remove game finished message
            gameOverMessage.remove();
            style.remove();
            
            // Show error toast
            toast.show('Error ending game. Returning to menu...', 'error', 3000);
            
            // Return to menu after delay
            setTimeout(() => {
              // Reset and return to menu
              gameState.setGamePhase('lobby');
              gameHasStarted = false;
              gameStarted = false;
              currentGameId = null;
              uiMenu.showTitleScreen();
            }, 3000);
          }
        } else {
          console.warn('[Game End] No currentGameId, cannot end game properly');
          // Remove game finished message
          gameOverMessage.remove();
          style.remove();
          
          // Return to menu
          gameState.setGamePhase('lobby');
          gameHasStarted = false;
          gameStarted = false;
          uiMenu.showTitleScreen();
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
      
      // Listen for time of day changes in lobby
      window.addEventListener('timeOfDayChange', ((e: Event) => {
        const customEvent = e as CustomEvent;
        const timeOfDay = customEvent.detail?.timeOfDay as 'day' | 'night';
        
        // Only apply in lobby phase
        if (gameState.getGamePhase() === 'lobby') {
          gameEngine.setTimeOfDay(timeOfDay);
        }
      }) as EventListener);
      
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
