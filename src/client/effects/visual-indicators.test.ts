import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { VisualIndicators } from './visual-indicators';

describe('VisualIndicators', () => {
  let scene: THREE.Scene;
  let indicators: VisualIndicators;

  beforeEach(() => {
    scene = new THREE.Scene();
    indicators = new VisualIndicators(scene);
  });

  describe('updateMarker', () => {
    it('should create a marker for a new player', () => {
      const position = new THREE.Vector3(10, 0, 10);
      indicators.updateMarker('player1', position, false, true);

      expect(scene.children.length).toBe(1);
    });

    it('should use red color for oni players', () => {
      const position = new THREE.Vector3(10, 0, 10);
      indicators.updateMarker('player1', position, true, true);

      const marker = scene.children[0] as THREE.Mesh;
      const material = marker.material as THREE.MeshBasicMaterial;
      expect(material.color.getHex()).toBe(0xff0000);
    });

    it('should use green color for runner players', () => {
      const position = new THREE.Vector3(10, 0, 10);
      indicators.updateMarker('player1', position, false, true);

      const marker = scene.children[0] as THREE.Mesh;
      const material = marker.material as THREE.MeshBasicMaterial;
      expect(material.color.getHex()).toBe(0x00ff00);
    });

    it('should use 90% opacity when player is moving', () => {
      const position = new THREE.Vector3(10, 0, 10);
      indicators.updateMarker('player1', position, false, true);

      const marker = scene.children[0] as THREE.Mesh;
      const material = marker.material as THREE.MeshBasicMaterial;
      expect(material.opacity).toBe(0.9);
    });

    it('should use 50% opacity when player is stationary', () => {
      const position = new THREE.Vector3(10, 0, 10);
      indicators.updateMarker('player1', position, false, false);

      const marker = scene.children[0] as THREE.Mesh;
      const material = marker.material as THREE.MeshBasicMaterial;
      expect(material.opacity).toBe(0.5);
    });

    it('should position marker 3 units above player', () => {
      const position = new THREE.Vector3(10, 5, 10);
      indicators.updateMarker('player1', position, false, true);

      const marker = scene.children[0] as THREE.Mesh;
      expect(marker.position.y).toBe(8); // 5 + 3
    });

    it('should reuse existing marker for same player', () => {
      const position1 = new THREE.Vector3(10, 0, 10);
      const position2 = new THREE.Vector3(20, 0, 20);

      indicators.updateMarker('player1', position1, false, true);
      indicators.updateMarker('player1', position2, false, true);

      expect(scene.children.length).toBe(1);
    });

    it('should update marker color when player becomes oni', () => {
      const position = new THREE.Vector3(10, 0, 10);

      // Start as runner
      indicators.updateMarker('player1', position, false, true);
      let marker = scene.children[0] as THREE.Mesh;
      let material = marker.material as THREE.MeshBasicMaterial;
      expect(material.color.getHex()).toBe(0x00ff00);

      // Become oni
      indicators.updateMarker('player1', position, true, true);
      marker = scene.children[0] as THREE.Mesh;
      material = marker.material as THREE.MeshBasicMaterial;
      expect(material.color.getHex()).toBe(0xff0000);
    });
  });

  describe('removeMarker', () => {
    it('should remove marker from scene', () => {
      const position = new THREE.Vector3(10, 0, 10);
      indicators.updateMarker('player1', position, false, true);

      expect(scene.children.length).toBe(1);

      indicators.removeMarker('player1');

      expect(scene.children.length).toBe(0);
    });

    it('should handle removing non-existent marker', () => {
      expect(() => {
        indicators.removeMarker('nonexistent');
      }).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all markers', () => {
      const position = new THREE.Vector3(10, 0, 10);
      indicators.updateMarker('player1', position, false, true);
      indicators.updateMarker('player2', position, true, true);
      indicators.updateMarker('player3', position, false, false);

      expect(scene.children.length).toBe(3);

      indicators.clear();

      expect(scene.children.length).toBe(0);
    });
  });
});
