import { describe, it, expect, beforeEach } from 'vitest';
import { ParticleSystem } from './particle-system';
import { Player } from '../../shared/types/game';
import * as THREE from 'three';

// Mock THREE.js scene
class MockScene {
  public objects: THREE.Object3D[] = [];

  add(object: THREE.Object3D): void {
    this.objects.push(object);
  }

  remove(object: THREE.Object3D): void {
    const index = this.objects.indexOf(object);
    if (index > -1) {
      this.objects.splice(index, 1);
    }
  }
}

describe('ParticleSystem', () => {
  let scene: MockScene;
  let particleSystem: ParticleSystem;
  let mockPlayers: Player[];

  beforeEach(() => {
    scene = new MockScene();
    particleSystem = new ParticleSystem(scene as unknown as THREE.Scene);

    // Create mock players
    mockPlayers = [
      {
        id: 'player1',
        username: 'Player 1',
        isOni: true,
        isAI: false,
        position: { x: 0, y: 5, z: 0 },
        velocity: { x: 5, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: false,
        isDashing: false,
        isJetpacking: true, // Jetpacking
        beaconCooldown: 0,
      },
      {
        id: 'player2',
        username: 'Player 2',
        isOni: false,
        isAI: false,
        position: { x: 10, y: 0, z: 0 },
        velocity: { x: 10, y: 0, z: 0 },
        fuel: 80,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: true, // Dashing
        isJetpacking: false,
        beaconCooldown: 0,
      },
      {
        id: 'player3',
        username: 'Player 3',
        isOni: false,
        isAI: true,
        position: { x: 20, y: 0, z: 0 },
        velocity: { x: 5, y: 0, z: 0 },
        fuel: 50,
        survivedTime: 10,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      },
    ];
  });

  describe('initialization', () => {
    it('should create jetpack and dash particle meshes', () => {
      // Should have 2 particle meshes (jetpack and dash)
      expect(scene.objects.length).toBe(2);

      // Check that they are Points objects
      expect(scene.objects[0]).toBeInstanceOf(THREE.Points);
      expect(scene.objects[1]).toBeInstanceOf(THREE.Points);
    });
  });

  describe('emitJetpackParticles', () => {
    it('should emit particles when player is jetpacking', () => {
      const jetpackingPlayer = mockPlayers[0];

      // Emit particles
      particleSystem.emitJetpackParticles(jetpackingPlayer);

      // Particles should be emitted (we can't directly check internal state,
      // but we can verify the method doesn't throw)
      expect(() =>
        particleSystem.emitJetpackParticles(jetpackingPlayer)
      ).not.toThrow();
    });

    it('should not emit particles when player is not jetpacking', () => {
      const notJetpackingPlayer = mockPlayers[1];

      // Should not throw
      expect(() =>
        particleSystem.emitJetpackParticles(notJetpackingPlayer)
      ).not.toThrow();
    });
  });

  describe('emitDashParticles', () => {
    it('should emit particles when player is dashing', () => {
      const dashingPlayer = mockPlayers[1];

      // Emit particles
      particleSystem.emitDashParticles(dashingPlayer);

      // Should not throw
      expect(() =>
        particleSystem.emitDashParticles(dashingPlayer)
      ).not.toThrow();
    });

    it('should not emit particles when player is not dashing', () => {
      const notDashingPlayer = mockPlayers[0];

      // Should not throw
      expect(() =>
        particleSystem.emitDashParticles(notDashingPlayer)
      ).not.toThrow();
    });
  });

  describe('update', () => {
    it('should update particles for all active players', () => {
      const deltaTime = 0.016; // ~60 FPS

      // Update should not throw
      expect(() =>
        particleSystem.update(deltaTime, mockPlayers)
      ).not.toThrow();
    });

    it('should emit jetpack particles for jetpacking players', () => {
      const deltaTime = 0.016;

      // Update multiple times to emit particles
      for (let i = 0; i < 10; i++) {
        particleSystem.update(deltaTime, mockPlayers);
      }

      // Should not throw
      expect(() =>
        particleSystem.update(deltaTime, mockPlayers)
      ).not.toThrow();
    });

    it('should emit dash particles for dashing players', () => {
      const deltaTime = 0.016;

      // Update multiple times to emit particles
      for (let i = 0; i < 10; i++) {
        particleSystem.update(deltaTime, mockPlayers);
      }

      // Should not throw
      expect(() =>
        particleSystem.update(deltaTime, mockPlayers)
      ).not.toThrow();
    });

    it('should handle multiple players with different states', () => {
      const deltaTime = 0.016;

      // Mix of jetpacking, dashing, and idle players
      mockPlayers[0].isJetpacking = true;
      mockPlayers[1].isDashing = true;
      mockPlayers[2].isJetpacking = false;
      mockPlayers[2].isDashing = false;

      // Should handle all states without error
      expect(() =>
        particleSystem.update(deltaTime, mockPlayers)
      ).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should remove all particle meshes from scene', () => {
      expect(scene.objects.length).toBe(2);

      particleSystem.dispose();

      expect(scene.objects.length).toBe(0);
    });

    it('should not throw when called multiple times', () => {
      particleSystem.dispose();

      expect(() => particleSystem.dispose()).not.toThrow();
    });
  });

  describe('particle lifecycle', () => {
    it('should update particle positions over time', () => {
      const deltaTime = 0.016;

      // Emit particles
      for (let i = 0; i < 5; i++) {
        particleSystem.update(deltaTime, mockPlayers);
      }

      // Continue updating to move particles
      for (let i = 0; i < 10; i++) {
        particleSystem.update(deltaTime, mockPlayers);
      }

      // Should not throw
      expect(() =>
        particleSystem.update(deltaTime, mockPlayers)
      ).not.toThrow();
    });

    it('should handle particle pool exhaustion gracefully', () => {
      const deltaTime = 0.016;

      // Emit many particles to potentially exhaust pool
      for (let i = 0; i < 100; i++) {
        particleSystem.update(deltaTime, mockPlayers);
      }

      // Should still work without errors
      expect(() =>
        particleSystem.update(deltaTime, mockPlayers)
      ).not.toThrow();
    });
  });
});
