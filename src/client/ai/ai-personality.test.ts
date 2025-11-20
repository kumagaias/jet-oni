import { describe, it, expect, beforeEach } from 'vitest';
import { AIController, AIBehavior } from './ai-controller';
import { GameState } from '../game/game-state';

describe('AI Personality System', () => {
  let gameState: GameState;
  let aiController: AIController;

  beforeEach(() => {
    gameState = new GameState('test-player');
    aiController = new AIController(gameState);
  });

  describe('Personality Integration', () => {
    it('should create AI controller with personality system', () => {
      expect(aiController).toBeDefined();
    });

    it('should handle ONI decisions with personality', () => {
      // Set local player as ONI
      gameState.setLocalPlayerIsOni(true);
      
      // Add AI ONI player
      gameState.updateRemotePlayer({
        id: 'ai-oni',
        username: 'AI ONI',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        isOni: true,
        isAI: true,
        fuel: 100,
        isOnSurface: true,
        isJetpacking: false,
        isDashing: false,
        survivedTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
        tagCount: 0,
      });

      // Add runner
      gameState.updateRemotePlayer({
        id: 'runner-1',
        username: 'Runner 1',
        position: { x: 50, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        isOni: false,
        isAI: false,
        fuel: 100,
        isOnSurface: true,
        isJetpacking: false,
        isDashing: false,
        survivedTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
        tagCount: 0,
      });

      const aiPlayer = gameState.getPlayer('ai-oni')!;
      const allPlayers = gameState.getAllPlayers();
      const decision = aiController.makeDecision(aiPlayer, allPlayers, 0.016);

      expect(decision).toBeDefined();
      expect(decision.behavior).toBe(AIBehavior.CHASE);
      expect(decision.targetPlayerId).toBe('runner-1');
    });

    it('should reset personality system on reset', () => {
      aiController.reset();
      expect(aiController).toBeDefined();
    });
  });
});
