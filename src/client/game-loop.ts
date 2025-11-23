/**
 * Game Loop
 * Handles the main game update loop and frame-by-frame updates
 */

import * as THREE from 'three';
import { GameEngine } from './game/game-engine';
import { GameState } from './game/game-state';
import { PlayerPhysics } from './player/player-physics';
import { CollisionSystem } from './environment/collision-system';
import { PlayerModel } from './player/player-model';
import { GameSystems, GameCollections } from './game-initializer';

export interface GameLoopState {
  gameStarted: boolean;
  gameHasStarted: boolean;
  gameStartTime: number;
  lastGameEndCheck: number;
  wasOni: boolean;
  cloakActiveUntil: number;
  isHost: boolean;
  currentGameId: string | null;
  taggedTimeMap: Map<string, number>;
  aiLastSyncTime: Map<string, number>;
}

export interface GameLoopCallbacks {
  onGameEnd: () => void;
  onAISync: (aiId: string, aiPlayer: any) => void;
  onTag?: (taggerId: string, taggedId: string) => void;
}

/**
 * Create game loop update function
 */
export function createGameLoop(
  gameEngine: GameEngine,
  gameState: GameState,
  systems: GameSystems,
  collections: GameCollections,
  state: GameLoopState,
  callbacks: GameLoopCallbacks
) {
  let aiUpdateSkip = false;
  const CLOAK_DURATION = 60; // seconds
  const AI_SYNC_INTERVAL = 200; // Send AI updates every 200ms
  
  return (deltaTime: number) => {
    // Update player controller
    systems.playerController.update(deltaTime);
    
    // Update player camera
    systems.playerCamera.update();
    
    // Update game phase-specific logic
    if (gameState.isPlaying()) {
      // Update cloak state
      const now = Date.now();
      const cloakRemaining = Math.max(0, (state.cloakActiveUntil - now) / 1000);
      
      // Update AI controller (host only)
      if (state.isHost) {
        systems.aiController.update(deltaTime);
      }
      
      // Update tag system and handle tag events
      const tagEvent = systems.tagSystem.update();
      if (tagEvent && callbacks.onTag) {
        callbacks.onTag(tagEvent.taggerId, tagEvent.taggedId);
      }
    }
    
    // Apply physics to AI players (host only)
    const shouldUpdateAI = !aiUpdateSkip;
    aiUpdateSkip = !aiUpdateSkip;
    
    if (state.isHost && shouldUpdateAI) {
      updateAIPlayers(
        collections.aiPlayerModels,
        gameState,
        systems.playerPhysics,
        systems.collisionSystem,
        deltaTime
      );
      
      // Sync AI players to other clients
      syncAIPlayers(
        collections.aiPlayerModels,
        gameState,
        state.aiLastSyncTime,
        callbacks.onAISync,
        AI_SYNC_INTERVAL
      );
    }
    
    // Update remote player models
    updateRemotePlayerModels(collections.remotePlayerModels, gameState);
    
    // Update visual effects
    updateVisualEffects(systems, gameState, collections);
    
    // Check if game should end (host only, once per second)
    if (state.isHost && gameState.isPlaying()) {
      const now = Date.now();
      if (now - state.lastGameEndCheck > 1000) {
        state.lastGameEndCheck = now;
        if (gameState.shouldGameEnd()) {
          callbacks.onGameEnd();
        }
      }
    }
  };
}

/**
 * Update AI players physics and models
 */
function updateAIPlayers(
  aiPlayerModels: Map<string, PlayerModel>,
  gameState: GameState,
  playerPhysics: PlayerPhysics,
  collisionSystem: CollisionSystem,
  deltaTime: number
): void {
  for (const [aiId, aiModel] of aiPlayerModels) {
    const aiPlayer = gameState.getPlayer(aiId);
    if (!aiPlayer) {
      console.warn(`[AI] AI player ${aiId} not found in game state`);
      continue;
    }
    
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
    
    // If collision occurred, apply sliding movement
    let finalVelocity = physicsResult.velocity;
    const finalPosition = collisionResult.position;
    
    if (collisionResult.collided && collisionResult.normal) {
      // Apply sliding movement along the wall
      finalVelocity = collisionSystem.applySlidingMovement(
        physicsResult.velocity,
        collisionResult.normal
      );
    }
    
    // Update AI player state
    gameState.setPlayerPosition(aiId, finalPosition);
    gameState.setPlayerVelocity(aiId, finalVelocity);
    gameState.setPlayerOnSurface(aiId, physicsResult.isOnSurface);
    
    // Update AI model
    aiModel.setPosition(finalPosition);
    aiModel.setRotation(aiPlayer.rotation.yaw);
    aiModel.setOniState(aiPlayer.isOni);
  }
}

/**
 * Sync AI players to other clients via Realtime
 */
function syncAIPlayers(
  aiPlayerModels: Map<string, PlayerModel>,
  gameState: GameState,
  aiLastSyncTime: Map<string, number>,
  onAISync: (aiId: string, aiPlayer: any) => void,
  syncInterval: number
): void {
  const now = Date.now();
  
  for (const [aiId] of aiPlayerModels) {
    const lastSync = aiLastSyncTime.get(aiId) || 0;
    
    if (now - lastSync > syncInterval) {
      const aiPlayer = gameState.getPlayer(aiId);
      if (aiPlayer) {
        onAISync(aiId, aiPlayer);
        aiLastSyncTime.set(aiId, now);
      }
    }
  }
}

/**
 * Update remote player models
 */
function updateRemotePlayerModels(
  remotePlayerModels: Map<string, PlayerModel>,
  gameState: GameState
): void {
  for (const [playerId, model] of remotePlayerModels) {
    const player = gameState.getPlayer(playerId);
    if (player) {
      model.setPosition(player.position);
      model.setRotation(player.rotation.yaw);
      model.setOniState(player.isOni);
    }
  }
}

/**
 * Update visual effects
 */
function updateVisualEffects(
  systems: GameSystems,
  gameState: GameState,
  collections: GameCollections
): void {
  const localPlayer = gameState.getLocalPlayer();
  
  // Update particle system
  systems.particleSystem.update();
  
  // Update visual indicators
  const allPlayers = gameState.getAllPlayers();
  systems.visualIndicators.update(allPlayers, localPlayer.id);
  
  // Update tag range visual (ONI only)
  if (localPlayer.isOni) {
    systems.tagRangeVisual.update(localPlayer.position);
  } else {
    systems.tagRangeVisual.hide();
  }
  
  // Update target lock visual (ONI only)
  if (localPlayer.isOni && gameState.isPlaying()) {
    const runners = allPlayers.filter(p => !p.isOni && p.id !== localPlayer.id);
    systems.targetLockVisual.update(localPlayer.position, runners);
  } else {
    systems.targetLockVisual.clear();
  }
  
  // Update jetpack effect
  if (localPlayer.isJetpacking) {
    systems.jetpackEffect.update(localPlayer.position);
  } else {
    systems.jetpackEffect.hide();
  }
  
  // Emit particles for all players
  for (const player of allPlayers) {
    systems.particleSystem.emitPlayerParticles(player);
  }
}
