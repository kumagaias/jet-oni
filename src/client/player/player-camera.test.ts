import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PlayerCamera, CameraMode } from './player-camera';
import { GameState } from '../game/game-state';
import { CAMERA_HEIGHT, CAMERA_DISTANCE_THIRD_PERSON } from '../../shared/constants';

describe('PlayerCamera', () => {
  let camera: THREE.PerspectiveCamera;
  let gameState: GameState;
  let playerCamera: PlayerCamera;

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    gameState = new GameState('test-player');
    playerCamera = new PlayerCamera(camera, gameState);
  });

  describe('constructor', () => {
    it('should initialize with first-person mode', () => {
      expect(playerCamera.getMode()).toBe(CameraMode.FIRST_PERSON);
    });

    it('should initialize with default smoothing factor', () => {
      expect(playerCamera.getSmoothingFactor()).toBe(0.1);
    });
  });

  describe('update - first person mode', () => {
    it('should position camera at player eye height', () => {
      // Set player position
      gameState.setLocalPlayerPosition({ x: 10, y: 5, z: 15 });
      
      // Ensure first-person mode
      playerCamera.setMode(CameraMode.FIRST_PERSON);
      
      // Update camera multiple times to reach target (lerp smoothing)
      for (let i = 0; i < 50; i++) {
        playerCamera.update(0.016);
      }
      
      // Camera should be at player position + eye height
      // Use larger tolerance due to lerp smoothing
      expect(camera.position.x).toBeCloseTo(10, 0);
      expect(camera.position.y).toBeCloseTo(5 + CAMERA_HEIGHT, 0);
      expect(camera.position.z).toBeCloseTo(15, 0);
    });

    it('should apply player rotation to camera', () => {
      const yaw = Math.PI / 4; // 45 degrees
      const pitch = Math.PI / 6; // 30 degrees
      
      gameState.setLocalPlayerRotation(yaw, pitch);
      
      playerCamera.update(0.016);
      
      expect(camera.rotation.y).toBe(yaw);
      expect(camera.rotation.x).toBe(pitch);
      expect(camera.rotation.order).toBe('YXZ');
    });

    it('should smoothly transition camera position', () => {
      // Start at origin
      camera.position.set(0, 0, 0);
      
      // Set target position
      gameState.setLocalPlayerPosition({ x: 100, y: 0, z: 100 });
      
      // First update - should move towards target but not reach it
      playerCamera.update(0.016);
      
      const firstX = camera.position.x;
      const firstZ = camera.position.z;
      
      // Should have moved but not reached target
      expect(firstX).toBeGreaterThan(0);
      expect(firstX).toBeLessThan(100);
      expect(firstZ).toBeGreaterThan(0);
      expect(firstZ).toBeLessThan(100);
      
      // Second update - should move closer
      playerCamera.update(0.016);
      
      expect(camera.position.x).toBeGreaterThan(firstX);
      expect(camera.position.z).toBeGreaterThan(firstZ);
    });
  });

  describe('update - third person mode', () => {
    beforeEach(() => {
      playerCamera.setMode(CameraMode.THIRD_PERSON);
    });

    it('should position camera behind player', () => {
      // Set player position and rotation
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });
      gameState.setLocalPlayerRotation(0, 0); // Facing forward (north)
      
      // Manually set mode to prevent auto-switching
      playerCamera.setMode(CameraMode.THIRD_PERSON);
      
      // Update camera multiple times to reach target (lerp smoothing)
      for (let i = 0; i < 50; i++) {
        playerCamera.update(0.016);
        // Keep mode set to third person after each update
        playerCamera.setMode(CameraMode.THIRD_PERSON);
      }
      
      // Camera should be behind player (positive Z due to yaw=0)
      // Use larger tolerance due to lerp smoothing
      expect(camera.position.z).toBeCloseTo(CAMERA_DISTANCE_THIRD_PERSON, 0);
      expect(camera.position.y).toBeCloseTo(CAMERA_HEIGHT, 0);
    });

    it('should calculate correct offset based on player yaw', () => {
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });
      gameState.setLocalPlayerRotation(Math.PI / 2, 0); // Facing right (east)
      
      // Manually set mode to prevent auto-switching
      playerCamera.setMode(CameraMode.THIRD_PERSON);
      
      // Update camera multiple times to reach target (lerp smoothing)
      for (let i = 0; i < 50; i++) {
        playerCamera.update(0.016);
        // Keep mode set to third person after each update
        playerCamera.setMode(CameraMode.THIRD_PERSON);
      }
      
      // Camera should be to the left of player (positive X)
      // Use larger tolerance due to lerp smoothing
      expect(camera.position.x).toBeCloseTo(CAMERA_DISTANCE_THIRD_PERSON, 0);
    });

    it('should look at player position', () => {
      gameState.setLocalPlayerPosition({ x: 10, y: 5, z: 15 });
      gameState.setLocalPlayerRotation(0, 0);
      
      // Manually set mode to prevent auto-switching
      playerCamera.setMode(CameraMode.THIRD_PERSON);
      
      // Update camera multiple times to reach target
      for (let i = 0; i < 50; i++) {
        playerCamera.update(0.016);
        // Keep mode set to third person after each update
        playerCamera.setMode(CameraMode.THIRD_PERSON);
      }
      
      // Camera should be looking at player
      // We can't easily test lookAt directly, but we can verify camera moved
      // Use larger tolerance due to lerp smoothing
      expect(camera.position.x).toBeCloseTo(10, 0);
      expect(camera.position.z).toBeCloseTo(15 + CAMERA_DISTANCE_THIRD_PERSON, 0);
    });
  });

  describe('setMode', () => {
    it('should change camera mode to third person', () => {
      playerCamera.setMode(CameraMode.THIRD_PERSON);
      expect(playerCamera.getMode()).toBe(CameraMode.THIRD_PERSON);
    });

    it('should change camera mode to first person', () => {
      playerCamera.setMode(CameraMode.THIRD_PERSON);
      playerCamera.setMode(CameraMode.FIRST_PERSON);
      expect(playerCamera.getMode()).toBe(CameraMode.FIRST_PERSON);
    });
  });

  describe('toggleMode', () => {
    it('should toggle from first person to third person', () => {
      expect(playerCamera.getMode()).toBe(CameraMode.FIRST_PERSON);
      playerCamera.toggleMode();
      expect(playerCamera.getMode()).toBe(CameraMode.THIRD_PERSON);
    });

    it('should toggle from third person to first person', () => {
      playerCamera.setMode(CameraMode.THIRD_PERSON);
      playerCamera.toggleMode();
      expect(playerCamera.getMode()).toBe(CameraMode.FIRST_PERSON);
    });

    it('should toggle back and forth multiple times', () => {
      playerCamera.toggleMode(); // -> third person
      playerCamera.toggleMode(); // -> first person
      playerCamera.toggleMode(); // -> third person
      expect(playerCamera.getMode()).toBe(CameraMode.THIRD_PERSON);
    });
  });

  describe('setSmoothingFactor', () => {
    it('should set smoothing factor within valid range', () => {
      playerCamera.setSmoothingFactor(0.5);
      expect(playerCamera.getSmoothingFactor()).toBe(0.5);
    });

    it('should clamp smoothing factor to minimum 0', () => {
      playerCamera.setSmoothingFactor(-0.5);
      expect(playerCamera.getSmoothingFactor()).toBe(0);
    });

    it('should clamp smoothing factor to maximum 1', () => {
      playerCamera.setSmoothingFactor(1.5);
      expect(playerCamera.getSmoothingFactor()).toBe(1);
    });

    it('should accept boundary values', () => {
      playerCamera.setSmoothingFactor(0);
      expect(playerCamera.getSmoothingFactor()).toBe(0);
      
      playerCamera.setSmoothingFactor(1);
      expect(playerCamera.getSmoothingFactor()).toBe(1);
    });
  });

  describe('getCamera', () => {
    it('should return the camera instance', () => {
      const returnedCamera = playerCamera.getCamera();
      expect(returnedCamera).toBe(camera);
    });
  });

  describe('rotation limits', () => {
    it('should apply pitch rotation correctly', () => {
      const pitch = Math.PI / 3; // 60 degrees
      gameState.setLocalPlayerRotation(0, pitch);
      
      playerCamera.update(0.016);
      
      expect(camera.rotation.x).toBe(pitch);
    });

    it('should apply yaw rotation correctly', () => {
      const yaw = -Math.PI / 4; // -45 degrees
      gameState.setLocalPlayerRotation(yaw, 0);
      
      playerCamera.update(0.016);
      
      expect(camera.rotation.y).toBe(yaw);
    });
  });
});
