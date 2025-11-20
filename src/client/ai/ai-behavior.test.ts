import { describe, it, expect, beforeEach } from 'vitest';
import { AIBehaviorSystem } from './ai-behavior';
import { Player } from '../../shared/types/game';
import { AIBehavior } from './ai-controller';

describe('AI Behavior System', () => {
  let behaviorSystem: AIBehaviorSystem;
  let mockPlayer: Player;
  let mockTarget: Player;

  beforeEach(() => {
    behaviorSystem = new AIBehaviorSystem({
      chaseDistance: 100,
      fleeDistance: 50,
      wanderChangeInterval: 3,
    });

    mockPlayer = {
      id: 'player1',
      username: 'Player 1',
      isOni: false,
      isAI: true,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { yaw: 0, pitch: 0 },
      fuel: 100,
      survivedTime: 0,
    };

    mockTarget = {
      id: 'target1',
      username: 'Target 1',
      isOni: true,
      isAI: false,
      position: { x: 10, y: 0, z: 10 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { yaw: 0, pitch: 0 },
      fuel: 100,
      survivedTime: 0,
    };
  });

  describe('Chase Behavior', () => {
    it('should return chase decision with direction toward target', () => {
      const decision = behaviorSystem.chase(mockPlayer, mockTarget);

      expect(decision.behavior).toBe(AIBehavior.CHASE);
      expect(decision.targetPlayerId).toBe('target1');
      expect(decision.moveDirection.x).toBeGreaterThan(0);
      expect(decision.moveDirection.z).toBeGreaterThan(0);
      expect(decision.useAbility).toBe(false);
    });

    it('should normalize direction vector', () => {
      const decision = behaviorSystem.chase(mockPlayer, mockTarget);
      const length = Math.sqrt(
        decision.moveDirection.x ** 2 + decision.moveDirection.z ** 2
      );

      expect(length).toBeCloseTo(1, 5);
    });
  });

  describe('Flee Behavior', () => {
    it('should return flee decision with direction away from threat', () => {
      const decision = behaviorSystem.flee(mockPlayer, mockTarget);

      expect(decision.behavior).toBe(AIBehavior.FLEE);
      expect(decision.targetPlayerId).toBe('target1');
      expect(decision.moveDirection.x).toBeLessThan(0);
      expect(decision.moveDirection.z).toBeLessThan(0);
      expect(decision.useAbility).toBe(false);
    });
  });

  describe('Wander Behavior', () => {
    it('should return wander decision with random direction', () => {
      const decision = behaviorSystem.wander(mockPlayer, 0.016);

      expect(decision.behavior).toBe(AIBehavior.WANDER);
      expect(decision.targetPlayerId).toBeNull();
      expect(decision.useAbility).toBe(false);
    });

    it('should change direction after interval', () => {
      const decision1 = behaviorSystem.wander(mockPlayer, 0.016);
      const direction1 = { ...decision1.moveDirection };

      // Advance time past interval
      const decision2 = behaviorSystem.wander(mockPlayer, 3.5);
      const direction2 = { ...decision2.moveDirection };

      // Directions should be different after interval
      const same =
        direction1.x === direction2.x && direction1.z === direction2.z;
      expect(same).toBe(false);
    });
  });

  describe('Find Nearest Runner', () => {
    it('should find nearest runner to ONI', () => {
      const oni: Player = { ...mockPlayer, isOni: true };
      const runner1: Player = {
        ...mockPlayer,
        id: 'runner1',
        isOni: false,
        position: { x: 10, y: 0, z: 0 },
      };
      const runner2: Player = {
        ...mockPlayer,
        id: 'runner2',
        isOni: false,
        position: { x: 5, y: 0, z: 0 },
      };

      const nearest = behaviorSystem.findNearestRunner(oni, [
        oni,
        runner1,
        runner2,
      ]);

      expect(nearest?.id).toBe('runner2');
    });

    it('should return null if no runners exist', () => {
      const oni: Player = { ...mockPlayer, isOni: true };
      const nearest = behaviorSystem.findNearestRunner(oni, [oni]);

      expect(nearest).toBeNull();
    });

    it('should prefer unassigned runners when target distribution is enabled', () => {
      const oni: Player = { ...mockPlayer, isOni: true };
      const runner1: Player = {
        ...mockPlayer,
        id: 'runner1',
        isOni: false,
        position: { x: 5, y: 0, z: 0 },
      };
      const runner2: Player = {
        ...mockPlayer,
        id: 'runner2',
        isOni: false,
        position: { x: 10, y: 0, z: 0 },
      };

      const assignedTargets = new Map([['other-oni', 'runner1']]);
      const nearest = behaviorSystem.findNearestRunner(
        oni,
        [oni, runner1, runner2],
        assignedTargets
      );

      expect(nearest?.id).toBe('runner2');
    });
  });

  describe('Find Nearest ONI', () => {
    it('should find nearest ONI to runner', () => {
      const runner: Player = { ...mockPlayer, isOni: false };
      const oni1: Player = {
        ...mockPlayer,
        id: 'oni1',
        isOni: true,
        position: { x: 10, y: 0, z: 0 },
      };
      const oni2: Player = {
        ...mockPlayer,
        id: 'oni2',
        isOni: true,
        position: { x: 5, y: 0, z: 0 },
      };

      const nearest = behaviorSystem.findNearestOni(runner, [
        runner,
        oni1,
        oni2,
      ]);

      expect(nearest?.id).toBe('oni2');
    });

    it('should return null if no ONI exist', () => {
      const runner: Player = { ...mockPlayer, isOni: false };
      const nearest = behaviorSystem.findNearestOni(runner, [runner]);

      expect(nearest).toBeNull();
    });
  });

  describe('Distance Checks', () => {
    it('should correctly check if within chase distance', () => {
      const player: Player = { ...mockPlayer, position: { x: 0, y: 0, z: 0 } };
      const target: Player = {
        ...mockTarget,
        position: { x: 50, y: 0, z: 0 },
      };

      const within = behaviorSystem.isWithinChaseDistance(player, target);
      expect(within).toBe(true);
    });

    it('should correctly check if outside chase distance', () => {
      const player: Player = { ...mockPlayer, position: { x: 0, y: 0, z: 0 } };
      const target: Player = {
        ...mockTarget,
        position: { x: 150, y: 0, z: 0 },
      };

      const within = behaviorSystem.isWithinChaseDistance(player, target);
      expect(within).toBe(false);
    });

    it('should correctly check if within flee distance', () => {
      const player: Player = { ...mockPlayer, position: { x: 0, y: 0, z: 0 } };
      const threat: Player = {
        ...mockTarget,
        position: { x: 30, y: 0, z: 0 },
      };

      const within = behaviorSystem.isWithinFleeDistance(player, threat);
      expect(within).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should return current configuration', () => {
      const config = behaviorSystem.getConfig();

      expect(config.chaseDistance).toBe(100);
      expect(config.fleeDistance).toBe(50);
      expect(config.wanderChangeInterval).toBe(3);
    });

    it('should update configuration', () => {
      behaviorSystem.setConfig({ chaseDistance: 150 });
      const config = behaviorSystem.getConfig();

      expect(config.chaseDistance).toBe(150);
      expect(config.fleeDistance).toBe(50);
    });
  });

  describe('Reset', () => {
    it('should clear all state on reset', () => {
      behaviorSystem.wander(mockPlayer, 0.016);
      behaviorSystem.reset();

      const decision = behaviorSystem.wander(mockPlayer, 0.016);
      expect(decision.moveDirection).toBeDefined();
    });

    it('should clear player-specific state', () => {
      behaviorSystem.wander(mockPlayer, 0.016);
      behaviorSystem.resetPlayer('player1');

      const decision = behaviorSystem.wander(mockPlayer, 0.016);
      expect(decision.moveDirection).toBeDefined();
    });
  });
});
