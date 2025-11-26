/**
 * Game Initializer
 * Handles initialization of all game systems, UI, and player setup
 */

import * as THREE from 'three';
import { GameEngine } from './game/game-engine';
import { GameState } from './game/game-state';
import { TagSystem } from './game/tag-system';
import { LadderSystem } from './environment/ladder-system';
import { CollisionSystem } from './environment/collision-system';
import { PlayerController } from './player/player-controller';
import { PlayerPhysics } from './player/player-physics';
import { PlayerCamera } from './player/player-camera';
import { BeaconVisual } from './effects/beacon-visual';
import { VisualIndicators } from './effects/visual-indicators';
import { ParticleSystem } from './effects/particle-system';
import { OniSpawnItem } from './items/oni-spawn-item';
import { CloakItem } from './items/cloak-item';
import { CarSystem } from './environment/car-system';
import { AIController } from './ai/ai-controller';
import { PlayerModel } from './player/player-model';
import { ToastNotification } from './ui/toast-notification';
import { TagRangeVisual } from './effects/tag-range-visual';
import { TargetLockVisual } from './effects/target-lock-visual';
import { JetpackEffect } from './effects/jetpack-effect';
import type { UIControls } from './ui/ui-controls';

export interface GameSystems {
  ladderSystem: LadderSystem;
  collisionSystem: CollisionSystem;
  playerPhysics: PlayerPhysics;
  playerCamera: PlayerCamera;
  playerController: PlayerController;
  tagSystem: TagSystem;
  oniSpawnItem: OniSpawnItem;
  cloakItem: CloakItem;
  beaconVisual: BeaconVisual;
  visualIndicators: VisualIndicators;
  particleSystem: ParticleSystem;
  carSystem: CarSystem;
  aiController: AIController;
  tagRangeVisual: TagRangeVisual;
  targetLockVisual: TargetLockVisual;
  jetpackEffect: JetpackEffect;
}

export interface GameCollections {
  aiPlayerModels: Map<string, PlayerModel>;
  remotePlayerModels: Map<string, PlayerModel>;
  uiControls?: UIControls;
}

/**
 * Initialize all game systems
 */
export async function initializeGameSystems(
  gameEngine: GameEngine,
  gameState: GameState,
  toast: ToastNotification
): Promise<GameSystems> {
  // Initialize systems
  const ladderSystem = new LadderSystem();
  const collisionSystem = new CollisionSystem();
  const playerPhysics = new PlayerPhysics();
  
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
    // Tag events are handled in game loop
  });
  
  // Initialize item systems
  const oniSpawnItem = new OniSpawnItem(gameEngine.getScene());
  const cloakItem = new CloakItem(gameEngine.getScene());
  
  // Initialize visual effects
  const beaconVisual = new BeaconVisual(gameEngine.getScene());
  const visualIndicators = new VisualIndicators(gameEngine.getScene());
  const particleSystem = new ParticleSystem(gameEngine.getScene());
  
  // Initialize tag range visual
  const { TagRangeVisual } = await import('./effects/tag-range-visual');
  const tagRangeVisual = new TagRangeVisual(gameEngine.getScene());
  
  // Initialize target lock visual
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
  
  // Initialize jetpack effect
  const { JetpackEffect } = await import('./effects/jetpack-effect');
  const jetpackEffect = new JetpackEffect(gameEngine.getScene());
  
  // Initialize car system
  const carSystem = new CarSystem(gameEngine.getScene());
  carSystem.setPlayerPhysics(playerPhysics);
  carSystem.init();
  
  // Initialize AI system
  const aiController = new AIController(gameState);
  
  return {
    ladderSystem,
    collisionSystem,
    playerPhysics,
    playerCamera,
    playerController,
    tagSystem,
    oniSpawnItem,
    cloakItem,
    beaconVisual,
    visualIndicators,
    particleSystem,
    carSystem,
    aiController,
    tagRangeVisual,
    targetLockVisual,
    jetpackEffect,
  };
}

/**
 * Initialize player model collections
 */
export function initializeCollections(): GameCollections {
  return {
    aiPlayerModels: new Map(),
    remotePlayerModels: new Map(),
  };
}

/**
 * Create debug info element
 */
export function createDebugInfo(): HTMLDivElement {
  const debugInfo = document.createElement('div');
  debugInfo.id = 'debug-info';
  debugInfo.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: #ff8800;
    padding: 15px;
    font-family: monospace;
    font-size: 20px;
    line-height: 1.6;
    border: 2px solid #ff8800;
    border-radius: 8px;
    z-index: 1000;
    pointer-events: none;
    display: none;
    min-width: 300px;
  `;
  document.body.appendChild(debugInfo);
  return debugInfo;
}

/**
 * Setup debug mode toggle (F2 key in dev subreddit)
 */
export function setupDebugMode(debugInfo: HTMLDivElement): { isDebugMode: () => boolean } {
  let debugMode = false;
  
  window.addEventListener('keydown', (e) => {
    // Check if in dev subreddit
    const url = window.location.href.toLowerCase();
    const isDevSubreddit = url.includes('jet_oni_dev') || 
                           url.includes('localhost') ||
                           url.includes('playtest');
    
    if (e.code === 'F2' && isDevSubreddit) {
      e.preventDefault();
      debugMode = !debugMode;
      debugInfo.style.display = debugMode ? 'block' : 'none';
    }
  });
  
  return {
    isDebugMode: () => debugMode,
  };
}
