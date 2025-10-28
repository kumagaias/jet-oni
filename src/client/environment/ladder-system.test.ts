import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { LadderSystem } from './ladder-system';

describe('LadderSystem', () => {
  let ladderSystem: LadderSystem;
  let ladderGroup: THREE.Group;

  beforeEach(() => {
    ladderSystem = new LadderSystem();
    ladderGroup = new THREE.Group();

    // Create a test ladder
    const testLadder = new THREE.Group();
    testLadder.position.set(10, 0, 20);

    // Add rails (cylinders with height 15)
    const railGeometry = new THREE.CylinderGeometry(0.05, 0.05, 15, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

    const leftRail = new THREE.Mesh(railGeometry, material);
    leftRail.position.set(-0.2, 7.5, 0);
    testLadder.add(leftRail);

    const rightRail = new THREE.Mesh(railGeometry, material);
    rightRail.position.set(0.2, 7.5, 0);
    testLadder.add(rightRail);

    ladderGroup.add(testLadder);
  });

  describe('Ladder Registration', () => {
    it('should register ladders from group', () => {
      ladderSystem.registerLadders(ladderGroup);
      const ladders = ladderSystem.getLadders();

      expect(ladders.length).toBe(1);
      expect(ladders[0].position.x).toBe(10);
      expect(ladders[0].position.z).toBe(20);
    });

    it('should calculate ladder height correctly', () => {
      ladderSystem.registerLadders(ladderGroup);
      const ladders = ladderSystem.getLadders();

      expect(ladders[0].height).toBe(15);
    });
  });

  describe('Ladder Detection', () => {
    beforeEach(() => {
      ladderSystem.registerLadders(ladderGroup);
    });

    it('should find nearby ladder', () => {
      const playerPosition = { x: 10.5, y: 0, z: 20 };
      const ladder = ladderSystem.findNearestLadder(playerPosition);

      expect(ladder).not.toBeNull();
      expect(ladder?.position.x).toBe(10);
    });

    it('should not find ladder if too far', () => {
      const playerPosition = { x: 15, y: 0, z: 20 };
      const ladder = ladderSystem.findNearestLadder(playerPosition);

      expect(ladder).toBeNull();
    });

    it('should not find ladder if above ladder height', () => {
      const playerPosition = { x: 10, y: 20, z: 20 };
      const ladder = ladderSystem.findNearestLadder(playerPosition);

      expect(ladder).toBeNull();
    });
  });

  describe('Climbing', () => {
    beforeEach(() => {
      ladderSystem.registerLadders(ladderGroup);
    });

    it('should start climbing at correct position', () => {
      const playerPosition = { x: 10.5, y: 2, z: 20 };
      const ladder = ladderSystem.findNearestLadder(playerPosition)!;

      const { position, progress } = ladderSystem.startClimbing(playerPosition, ladder);

      expect(position.x).toBe(10);
      expect(position.z).toBe(20);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(1);
    });

    it('should update climbing position when moving up', () => {
      const ladder = ladderSystem.getLadders()[0];
      const climbState = {
        isClimbing: true,
        currentLadder: ladder,
        climbProgress: 0.5,
      };

      const { position, progress } = ladderSystem.updateClimbing(climbState, 1, 0.1);

      expect(progress).toBeGreaterThan(0.5);
      expect(position.y).toBeGreaterThan(7.5);
    });

    it('should update climbing position when moving down', () => {
      const ladder = ladderSystem.getLadders()[0];
      const climbState = {
        isClimbing: true,
        currentLadder: ladder,
        climbProgress: 0.5,
      };

      const { position, progress } = ladderSystem.updateClimbing(climbState, -1, 0.1);

      expect(progress).toBeLessThan(0.5);
      expect(position.y).toBeLessThan(7.5);
    });

    it('should signal exit when reaching top', () => {
      const ladder = ladderSystem.getLadders()[0];
      const climbState = {
        isClimbing: true,
        currentLadder: ladder,
        climbProgress: 0.95,
      };

      const { shouldExit } = ladderSystem.updateClimbing(climbState, 1, 1);

      expect(shouldExit).toBe(true);
    });

    it('should signal exit when reaching bottom', () => {
      const ladder = ladderSystem.getLadders()[0];
      const climbState = {
        isClimbing: true,
        currentLadder: ladder,
        climbProgress: 0.05,
      };

      const { shouldExit } = ladderSystem.updateClimbing(climbState, -1, 1);

      expect(shouldExit).toBe(true);
    });
  });

  describe('Exit Climbing', () => {
    beforeEach(() => {
      ladderSystem.registerLadders(ladderGroup);
    });

    it('should exit away from ladder', () => {
      const ladder = ladderSystem.getLadders()[0];
      const facingDirection = 0; // facing forward

      const exitPosition = ladderSystem.exitClimbing(ladder, 0.5, facingDirection);

      // Should be away from ladder position
      const distance = Math.sqrt(
        Math.pow(exitPosition.x - ladder.position.x, 2) +
          Math.pow(exitPosition.z - ladder.position.z, 2)
      );

      expect(distance).toBeGreaterThan(0.5);
    });
  });

  describe('Configuration', () => {
    it('should allow setting climb speed', () => {
      ladderSystem.setClimbSpeed(5);
      expect(ladderSystem.getClimbSpeed()).toBe(5);
    });

    it('should allow setting detection radius', () => {
      ladderSystem.setDetectionRadius(2);
      expect(ladderSystem.getDetectionRadius()).toBe(2);
    });
  });

  describe('Clear', () => {
    it('should clear all ladders', () => {
      ladderSystem.registerLadders(ladderGroup);
      expect(ladderSystem.getLadders().length).toBe(1);

      ladderSystem.clear();
      expect(ladderSystem.getLadders().length).toBe(0);
    });
  });
});
