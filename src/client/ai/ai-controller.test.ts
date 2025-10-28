import { describe, it, expect, beforeEach } from 'vitest';
import { AIController, AIBehavior } from './ai-controller';
import { GameState } from '../game/game-state';

describe('AIController', () => {
  let gameState: GameState;
  let aiController: AIController;

  beforeEach(() => {
    gameState = new GameState('human-player');
    aiController = new AIController(gameState);
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const config = aiController.getConfig();
      
      expect(config.chaseDistance).toBe(100);
      expect(config.fleeDistance).toBe(50);
      expect(config.wanderChangeInterval).toBe(3);
      expect(config.abilityUseChance).toBe(0.3);
      expect(config.abilityUseCooldown).toBe(2);
    });

    it('should accept custom config', () => {
      const customController = new AIController(gameState, {
        chaseDistance: 150,
        fleeDistance: 75,
      });
      
      const config = customController.getConfig();
      expect(config.chaseDistance).toBe(150);
      expect(config.fleeDistance).toBe(75);
    });
  });

  describe('makeDecision - ONI', () => {
    beforeEach(() => {
      // Set local player as ONI so it doesn't interfere with AI ONI tests
      gameState.setLocalPlayerIsOni(true);
      
      // Add AI ONI player
      gameState.updateRemotePlayer({
        id: 'ai-oni',
        username: 'AI ONI',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        isOni: true,
        isAI: true,
        fuel: 100,
        isOnSurface: true,
        isJetpacking: false,
        isDashing: false,
        survivalTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
      });
    });

    it('should chase nearest runner when within chase distance', () => {
      // Add runner within chase distance
      gameState.updateRemotePlayer({
        id: 'runner-1',
        username: 'Runner 1',
        position: { x: 50, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        isOni: false,
        isAI: false,
        fuel: 100,
        isOnSurface: true,
        isJetpacking: false,
        isDashing: false,
        survivalTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
      });

      const aiPlayer = gameState.getPlayer('ai-oni')!;
      const allPlayers = gameState.getAllPlayers();
      const decision = aiController.makeDecision(aiPlayer, allPlayers, 0.016);

      expect(decision.behavior).toBe(AIBehavior.CHASE);
      expect(decision.targetPlayerId).toBe('runner-1');
      expect(decision.moveDirection.x).toBeGreaterThan(0); // Moving towards runner
    });

    it('should wander when no runners nearby', () => {
      // Add runner far away
      gameState.updateRemotePlayer({
        id: 'runner-1',
        username: 'Runner 1',
        position: { x: 200, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        isOni: false,
        isAI: false,
        fuel: 100,
        isOnSurface: true,
        isJetpacking: false,
        isDashing: false,
        survivalTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
      });

      const aiPlayer = gameState.getPlayer('ai-oni')!;
      const allPlayers = gameState.getAllPlayers();
      const decision = aiController.makeDecision(aiPlayer, allPlayers, 0.016);

      expect(decision.behavior).toBe(AIBehavior.WANDER);
      expect(decision.targetPlayerId).toBeNull();
    });

    it('should wander when no runners exist', () => {
      const aiPlayer = gameState.getPlayer('ai-oni')!;
      const allPlayers = gameState.getAllPlayers();
      const decision = aiController.makeDecision(aiPlayer, allPlayers, 0.016);

      expect(decision.behavior).toBe(AIBehavior.WANDER);
      expect(decision.targetPlayerId).toBeNull();
    });
  });

  describe('makeDecision - Runner', () => {
    beforeEach(() => {
      // Add AI runner player
      gameState.updateRemotePlayer({
        id: 'ai-runner',
        username: 'AI Runner',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        isOni: false,
        isAI: true,
        fuel: 100,
        isOnSurface: true,
        isJetpacking: false,
        isDashing: false,
        survivalTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
      });
    });

    it('should flee from nearest ONI when within flee distance', () => {
      // Add ONI within flee distance
      gameState.updateRemotePlayer({
        id: 'oni-1',
        username: 'ONI 1',
        position: { x: 30, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        isOni: true,
        isAI: false,
        fuel: 100,
        isOnSurface: true,
        isJetpacking: false,
        isDashing: false,
        survivalTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
      });

      const aiPlayer = gameState.getPlayer('ai-runner')!;
      const allPlayers = gameState.getAllPlayers();
      const decision = aiController.makeDecision(aiPlayer, allPlayers, 0.016);

      expect(decision.behavior).toBe(AIBehavior.FLEE);
      expect(decision.targetPlayerId).toBe('oni-1');
      expect(decision.moveDirection.x).toBeLessThan(0); // Moving away from ONI
    });

    it('should wander when no ONI nearby', () => {
      // Add ONI far away
      gameState.updateRemotePlayer({
        id: 'oni-1',
        username: 'ONI 1',
        position: { x: 100, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        isOni: true,
        isAI: false,
        fuel: 100,
        isOnSurface: true,
        isJetpacking: false,
        isDashing: false,
        survivalTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
      });

      const aiPlayer = gameState.getPlayer('ai-runner')!;
      const allPlayers = gameState.getAllPlayers();
      const decision = aiController.makeDecision(aiPlayer, allPlayers, 0.016);

      expect(decision.behavior).toBe(AIBehavior.WANDER);
      expect(decision.targetPlayerId).toBeNull();
    });

    it('should wander when no ONI exists', () => {
      const aiPlayer = gameState.getPlayer('ai-runner')!;
      const allPlayers = gameState.getAllPlayers();
      const decision = aiController.makeDecision(aiPlayer, allPlayers, 0.016);

      expect(decision.behavior).toBe(AIBehavior.WANDER);
      expect(decision.targetPlayerId).toBeNull();
    });
  });

  describe('wander behavior', () => {
    beforeEach(() => {
      // Add AI runner player
      gameState.updateRemotePlayer({
        id: 'ai-runner',
        username: 'AI Runner',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        isOni: false,
        isAI: true,
        fuel: 100,
        isOnSurface: true,
        isJetpacking: false,
        isDashing: false,
        survivalTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
      });
    });

    it('should change wander direction after interval', () => {
      const aiPlayer = gameState.getPlayer('ai-runner')!;
      const allPlayers = gameState.getAllPlayers();

      // First decision
      const decision1 = aiController.makeDecision(aiPlayer, allPlayers, 0.016);
      const direction1 = decision1.moveDirection;

      // Wait for wander interval to pass
      const decision2 = aiController.makeDecision(aiPlayer, allPlayers, 3.0);
      const direction2 = decision2.moveDirection;

      // Directions should be different (with high probability)
      // Note: There's a small chance they could be the same due to randomness
      expect(
        direction1.x !== direction2.x || direction1.z !== direction2.z
      ).toBe(true);
    });

    it('should maintain wander direction within interval', () => {
      const aiPlayer = gameState.getPlayer('ai-runner')!;
      const allPlayers = gameState.getAllPlayers();

      // First decision
      const decision1 = aiController.makeDecision(aiPlayer, allPlayers, 0.016);
      const direction1 = decision1.moveDirection;

      // Second decision shortly after
      const decision2 = aiController.makeDecision(aiPlayer, allPlayers, 0.016);
      const direction2 = decision2.moveDirection;

      // Directions should be the same
      expect(direction1.x).toBe(direction2.x);
      expect(direction1.z).toBe(direction2.z);
    });
  });

  describe('config management', () => {
    it('should get current config', () => {
      const config = aiController.getConfig();
      
      expect(config).toHaveProperty('chaseDistance');
      expect(config).toHaveProperty('fleeDistance');
      expect(config).toHaveProperty('wanderChangeInterval');
    });

    it('should update config', () => {
      aiController.setConfig({
        chaseDistance: 200,
        fleeDistance: 100,
      });
      
      const config = aiController.getConfig();
      expect(config.chaseDistance).toBe(200);
      expect(config.fleeDistance).toBe(100);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      // Add AI player
      gameState.updateRemotePlayer({
        id: 'ai-runner',
        username: 'AI Runner',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        isOni: false,
        isAI: true,
        fuel: 100,
        isOnSurface: true,
        isJetpacking: false,
        isDashing: false,
        survivalTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
      });
    });

    it('should reset player state', () => {
      const aiPlayer = gameState.getPlayer('ai-runner')!;
      const allPlayers = gameState.getAllPlayers();

      // Make some decisions to build state
      aiController.makeDecision(aiPlayer, allPlayers, 0.016);
      aiController.makeDecision(aiPlayer, allPlayers, 0.016);

      // Reset player
      aiController.resetPlayer('ai-runner');

      // Next decision should start fresh
      const decision = aiController.makeDecision(aiPlayer, allPlayers, 0.016);
      expect(decision).toBeDefined();
    });

    it('should reset all state', () => {
      const aiPlayer = gameState.getPlayer('ai-runner')!;
      const allPlayers = gameState.getAllPlayers();

      // Make some decisions to build state
      aiController.makeDecision(aiPlayer, allPlayers, 0.016);
      aiController.makeDecision(aiPlayer, allPlayers, 0.016);

      // Reset all
      aiController.reset();

      // Next decision should start fresh
      const decision = aiController.makeDecision(aiPlayer, allPlayers, 0.016);
      expect(decision).toBeDefined();
    });
  });
});
