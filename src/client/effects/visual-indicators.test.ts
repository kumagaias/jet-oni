import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VisualIndicators } from './visual-indicators';
import { Player } from '../../shared/types/game';
import * as THREE from 'three';
import {
  MARKER_OPACITY_MOVING,
  MARKER_OPACITY_STATIONARY,
} from '../../shared/constants';

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

describe('VisualIndicators', () => {
  let scene: MockScene;
  let visualIndicators: VisualIndicators;
  let mockPlayers: Player[];

  beforeEach(() => {
    scene = new MockScene();
    visualIndicators = new VisualIndicators(scene as unknown as THREE.Scene);

    // Create mock players
    mockPlayers = [
      {
        id: 'player1',
        username: 'Player 1',
        isOni: true,
        isAI: false,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 5, y: 0, z: 0 }, // Moving
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      },
      {
        id: 'player2',
        username: 'Player 2',
        isOni: false,
        isAI: false,
        position: { x: 10, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 }, // Stationary
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      },
      {
        id: 'player3',
        username: 'Player 3',
        isOni: false,
        isAI: true,
        position: { x: 20, y: 0, z: 0 },
        velocity: { x: 3, y: 0, z: 3 }, // Moving
        fuel: 50,
        survivedTime: 10,
        wasTagged: false,
        isOnSurface: false,
        isDashing: true,
        isJetpacking: false,
        beaconCooldown: 0,
      },
    ];
  });

  describe('updateMarkers', () => {
    it('should create markers for all players except local player', () => {
      const localPlayerId = 'player1';

      visualIndicators.updateMarkers(mockPlayers, localPlayerId);

      // Should create markers for player2 and player3 only
      expect(scene.objects.length).toBe(2);
    });

    it('should set red color for ONI players', () => {
      const localPlayerId = 'player2';

      visualIndicators.updateMarkers(mockPlayers, localPlayerId);

      // Find marker for player1 (ONI)
      const oniMarker = scene.objects[0] as THREE.Group;
      const cone = oniMarker.children[0] as THREE.Mesh;
      const material = cone.material as THREE.MeshBasicMaterial;

      expect(material.color.getHex()).toBe(0xff0000); // Red
    });

    it('should set green color for runner players', () => {
      const localPlayerId = 'player1';

      visualIndicators.updateMarkers(mockPlayers, localPlayerId);

      // Find marker for player2 (runner)
      const runnerMarker = scene.objects[0] as THREE.Group;
      const cone = runnerMarker.children[0] as THREE.Mesh;
      const material = cone.material as THREE.MeshBasicMaterial;

      expect(material.color.getHex()).toBe(0x00ff00); // Green
    });

    it('should set opacity to MARKER_OPACITY_MOVING for moving players', () => {
      const localPlayerId = 'player2';

      visualIndicators.updateMarkers(mockPlayers, localPlayerId);

      // Find marker for player1 (moving)
      const movingMarker = scene.objects[0] as THREE.Group;
      const cone = movingMarker.children[0] as THREE.Mesh;
      const material = cone.material as THREE.MeshBasicMaterial;

      expect(material.opacity).toBe(MARKER_OPACITY_MOVING);
    });

    it('should set opacity to MARKER_OPACITY_STATIONARY for stationary players', () => {
      const localPlayerId = 'player1';

      visualIndicators.updateMarkers(mockPlayers, localPlayerId);

      // Find marker for player2 (stationary)
      const stationaryMarker = scene.objects[0] as THREE.Group;
      const cone = stationaryMarker.children[0] as THREE.Mesh;
      const material = cone.material as THREE.MeshBasicMaterial;

      expect(material.opacity).toBe(MARKER_OPACITY_STATIONARY);
    });

    it('should position markers above player heads', () => {
      const localPlayerId = 'player1';

      visualIndicators.updateMarkers(mockPlayers, localPlayerId);

      // Check marker for player2
      const marker = scene.objects[0] as THREE.Group;

      expect(marker.position.x).toBe(mockPlayers[1].position.x);
      expect(marker.position.y).toBe(mockPlayers[1].position.y + 2.5);
      expect(marker.position.z).toBe(mockPlayers[1].position.z);
    });

    it('should remove markers for players that no longer exist', () => {
      const localPlayerId = 'player1';

      // First update with all players
      visualIndicators.updateMarkers(mockPlayers, localPlayerId);
      expect(scene.objects.length).toBe(2);

      // Remove player3
      const reducedPlayers = mockPlayers.slice(0, 2);
      visualIndicators.updateMarkers(reducedPlayers, localPlayerId);

      // Should only have marker for player2 now
      expect(scene.objects.length).toBe(1);
    });
  });

  describe('updateSpotIndicators', () => {
    it('should not show spot indicator when local player is ONI', () => {
      const localPlayerId = 'player1'; // ONI player

      visualIndicators.updateSpotIndicators(mockPlayers, localPlayerId);

      // No spot indicators should be created
      const spotIndicators = scene.objects.filter((obj) => {
        return obj.children.some((child) => child instanceof THREE.Sprite);
      });
      expect(spotIndicators.length).toBe(0);
    });

    it('should show spot indicator when ONI is within range', () => {
      const localPlayerId = 'player2'; // Runner at x=10

      // Move ONI player closer (within 50 units)
      mockPlayers[0].position.x = 15; // 5 units away

      visualIndicators.updateSpotIndicators(mockPlayers, localPlayerId, 50);

      // Spot indicator should be created
      const spotIndicators = scene.objects.filter((obj) => {
        return obj.children.some((child) => child instanceof THREE.Sprite);
      });
      expect(spotIndicators.length).toBe(1);
    });

    it('should not show spot indicator when ONI is out of range', () => {
      const localPlayerId = 'player2'; // Runner at x=10

      // ONI player is at x=0 (10 units away)
      visualIndicators.updateSpotIndicators(mockPlayers, localPlayerId, 5);

      // No spot indicator should be created
      const spotIndicators = scene.objects.filter((obj) => {
        return obj.children.some((child) => child instanceof THREE.Sprite);
      });
      expect(spotIndicators.length).toBe(0);
    });

    it('should remove spot indicator when ONI moves out of range', () => {
      const localPlayerId = 'player2';

      // First, ONI is close
      mockPlayers[0].position.x = 15;
      visualIndicators.updateSpotIndicators(mockPlayers, localPlayerId, 50);

      let spotIndicators = scene.objects.filter((obj) => {
        return obj.children.some((child) => child instanceof THREE.Sprite);
      });
      expect(spotIndicators.length).toBe(1);

      // Now, ONI moves far away
      mockPlayers[0].position.x = 100;
      visualIndicators.updateSpotIndicators(mockPlayers, localPlayerId, 50);

      spotIndicators = scene.objects.filter((obj) => {
        return obj.children.some((child) => child instanceof THREE.Sprite);
      });
      expect(spotIndicators.length).toBe(0);
    });
  });

  describe('animate', () => {
    it('should rotate markers over time', () => {
      const localPlayerId = 'player1';

      visualIndicators.updateMarkers(mockPlayers, localPlayerId);

      const marker = scene.objects[0] as THREE.Group;
      const initialRotation = marker.rotation.y;

      // Animate for 1 second
      visualIndicators.animate(1);

      expect(marker.rotation.y).toBeGreaterThan(initialRotation);
    });

    it('should pulse spot indicator opacity', () => {
      const localPlayerId = 'player2';

      // Create spot indicator
      mockPlayers[0].position.x = 15;
      visualIndicators.updateSpotIndicators(mockPlayers, localPlayerId, 50);

      const spotIndicator = scene.objects.find((obj) => {
        return obj.children.some((child) => child instanceof THREE.Sprite);
      }) as THREE.Group;

      const sprite = spotIndicator.children[0] as THREE.Sprite;
      const material = sprite.material as THREE.SpriteMaterial;
      const initialOpacity = material.opacity;

      // Animate
      visualIndicators.animate(0.1);

      // Opacity should change (pulse effect)
      expect(material.opacity).not.toBe(initialOpacity);
    });
  });

  describe('dispose', () => {
    it('should remove all markers and spot indicators', () => {
      const localPlayerId = 'player1';

      // Create markers
      visualIndicators.updateMarkers(mockPlayers, localPlayerId);

      // Create spot indicator
      mockPlayers[0].position.x = 15;
      visualIndicators.updateSpotIndicators(
        [mockPlayers[1]],
        mockPlayers[1].id,
        50
      );

      expect(scene.objects.length).toBeGreaterThan(0);

      // Dispose
      visualIndicators.dispose();

      expect(scene.objects.length).toBe(0);
    });
  });
});
