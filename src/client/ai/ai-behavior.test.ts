import { describe, it, expect, beforeEach } from 'vitest';
import { AIBehaviorSystem } from './ai-behavior';
import { AIBehavior } from './ai-controller';
import { Player } from '../../shared/types/game';

describe('AIBehaviorSystem', () => {
  let behaviorSystem: AIBehaviorSystem;

  beforeEach(() => {
    behaviorSystem = new AIBehaviorSystem({
      chaseDistance: 100,
      fleeDistance: 50,
      wanderChangeInterval: 3,
    });
  });

  describe('chase behavior', () => {
    it('should return chase decision with direction towards target', () => {
      const aiPlayer: Player = {
        id: 'ai-1',
        username: 'AI 1',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        isOni: true,
        isAI: true,
        fuel: 100,
        isOnSurface: true,
        isJetpacking: false,
        isDashing: false,
        survivalTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
      };

      const target: Player = {
        id: 'target-1',
        username: 'Target 1',
        position: { x: 10, y: 0, z: 0 },
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
      };

      const decision = behaviorSystem.chase(aiPlayer, target);

      expect(decision.behavior).toBe(AIBehavior.CHASE);
      expect(decision.targetPlayerId).toBe('target-1');
      expect(decision.moveDirection.x).toBeGreaterThan(0);
      expect(decision.moveDirection.z).toBe(0);
    });
  });

  describe('flee behavior', () => {
    it('should return flee decision with direction away from threat', () => {
      const aiPlayer: Player = {
        id: 'ai-1',
        username: 'AI 1',
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
      };

      const threat: Player = {
        id: 'threat-1',
        username: 'Threat 1',
        position: { x: 10, y: 0, z: 0 },
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
      };

      const decision = behaviorSystem.flee(aiPlayer, threat);

      expect(decision.behavior).toBe(AIBehavior.FLEE);
      expect(decision.targetPlayerId).toBe('threat-1');
      expect(decision.moveDirection.x).toBeLessThan(0);
      expect(decision.moveDirection.z).toBe(0);
    });
  });

  describe('wander behavior', () => {
    it('should return wander decision with random direction', () => {
      const aiPlayer: Player = {
        id: 'ai-1',
        username: 'AI 1',
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
      };

      const decision = behaviorSystem.wander(aiPlayer, 0.016);

      expect(decision.behavior).toBe(AIBehavior.WANDER);
      expect(decision.targetPlayerId).toBeNull();
      expect(decision.moveDirection).toBeDefined();
    });

    it('should change direction after wander interval', () => {
      const aiPlayer: Player = {
        id: 'ai-1',
        username: 'AI 1',
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
      };

      const decision1 = behaviorSystem.wander(aiPlayer, 0.016);
      const direction1 = decision1.moveDirection;

      const decision2 = behaviorSystem.wander(aiPlayer, 3.0);
      const direction2 = decision2.moveDirection;

      // Directions should be different after interval
      expect(
        direction1.x !== direction2.x || direction1.z !== direction2.z
      ).toBe(true);
    });

    it('should maintain direction within interval', () => {
      const aiPlayer: Player = {
        id: 'ai-1',
        username: 'AI 1',
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
      };

      const decision1 = behaviorSystem.wander(aiPlayer, 0.016);
      const direction1 = decision1.moveDirection;

      const decision2 = behaviorSystem.wander(aiPlayer, 0.016);
      const direction2 = decision2.moveDirection;

      // Directions should be the same within interval
      expect(direction1.x).toBe(direction2.x);
      expect(direction1.z).toBe(direction2.z);
    });
  });

  describe('findNearestRunner', () => {
    it('should find nearest runner to ONI', () => {
      const aiPlayer: Player = {
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
      };

      const runner1: Player = {
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
      };

      const runner2: Player = {
        id: 'runner-2',
        username: 'Runner 2',
        position: { x: 100, y: 0, z: 0 },
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
      };

      const allPlayers = [aiPlayer, runner1, runner2];
      const nearest = behaviorSystem.findNearestRunner(aiPlayer, allPlayers);

      expect(nearest).toBe(runner1);
    });

    it('should return null when no runners exist', () => {
      const aiPlayer: Player = {
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
      };

      const allPlayers = [aiPlayer];
      const nearest = behaviorSystem.findNearestRunner(aiPlayer, allPlayers);

      expect(nearest).toBeNull();
    });
  });

  describe('findNearestOni', () => {
    it('should find nearest ONI to runner', () => {
      const aiPlayer: Player = {
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
      };

      const oni1: Player = {
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
      };

      const oni2: Player = {
        id: 'oni-2',
        username: 'ONI 2',
        position: { x: 60, y: 0, z: 0 },
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
      };

      const allPlayers = [aiPlayer, oni1, oni2];
      const nearest = behaviorSystem.findNearestOni(aiPlayer, allPlayers);

      expect(nearest).toBe(oni1);
    });

    it('should return null when no ONI exists', () => {
      const aiPlayer: Player = {
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
      };

      const allPlayers = [aiPlayer];
      const nearest = behaviorSystem.findNearestOni(aiPlayer, allPlayers);

      expect(nearest).toBeNull();
    });
  });

  describe('distance checks', () => {
    it('should correctly check if within chase distance', () => {
      const aiPlayer: Player = {
        id: 'ai-1',
        username: 'AI 1',
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
      };

      const nearTarget: Player = {
        id: 'near',
        username: 'Near',
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
      };

      const farTarget: Player = {
        id: 'far',
        username: 'Far',
        position: { x: 150, y: 0, z: 0 },
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
      };

      expect(behaviorSystem.isWithinChaseDistance(aiPlayer, nearTarget)).toBe(true);
      expect(behaviorSystem.isWithinChaseDistance(aiPlayer, farTarget)).toBe(false);
    });

    it('should correctly check if within flee distance', () => {
      const aiPlayer: Player = {
        id: 'ai-1',
        username: 'AI 1',
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
      };

      const nearThreat: Player = {
        id: 'near',
        username: 'Near',
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
      };

      const farThreat: Player = {
        id: 'far',
        username: 'Far',
        position: { x: 80, y: 0, z: 0 },
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
      };

      expect(behaviorSystem.isWithinFleeDistance(aiPlayer, nearThreat)).toBe(true);
      expect(behaviorSystem.isWithinFleeDistance(aiPlayer, farThreat)).toBe(false);
    });
  });

  describe('config management', () => {
    it('should get current config', () => {
      const config = behaviorSystem.getConfig();

      expect(config.chaseDistance).toBe(100);
      expect(config.fleeDistance).toBe(50);
      expect(config.wanderChangeInterval).toBe(3);
    });

    it('should update config', () => {
      behaviorSystem.setConfig({
        chaseDistance: 150,
        fleeDistance: 75,
      });

      const config = behaviorSystem.getConfig();
      expect(config.chaseDistance).toBe(150);
      expect(config.fleeDistance).toBe(75);
    });
  });

  describe('reset', () => {
    it('should reset player state', () => {
      const aiPlayer: Player = {
        id: 'ai-1',
        username: 'AI 1',
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
      };

      // Build some state
      behaviorSystem.wander(aiPlayer, 0.016);
      behaviorSystem.wander(aiPlayer, 0.016);

      // Reset player
      behaviorSystem.resetPlayer('ai-1');

      // Should work without errors
      const decision = behaviorSystem.wander(aiPlayer, 0.016);
      expect(decision).toBeDefined();
    });

    it('should reset all state', () => {
      const aiPlayer: Player = {
        id: 'ai-1',
        username: 'AI 1',
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
      };

      // Build some state
      behaviorSystem.wander(aiPlayer, 0.016);
      behaviorSystem.wander(aiPlayer, 0.016);

      // Reset all
      behaviorSystem.reset();

      // Should work without errors
      const decision = behaviorSystem.wander(aiPlayer, 0.016);
      expect(decision).toBeDefined();
    });
  });
});
