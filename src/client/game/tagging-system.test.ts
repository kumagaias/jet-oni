import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaggingSystem } from './tagging-system';
import { GameState } from './game-state';
import { BeaconSystem } from '../abilities/beacon-system';

describe('TaggingSystem', () => {
  let gameState: GameState;
  let taggingSystem: TaggingSystem;
  let beaconSystem: BeaconSystem;

  beforeEach(() => {
    gameState = new GameState('player1');
    taggingSystem = new TaggingSystem(gameState);
    beaconSystem = new BeaconSystem(gameState);
    taggingSystem.setBeaconSystem(beaconSystem);
    
    // Set game to playing state
    gameState.setGamePhase('playing');
  });

  describe('Distance checking', () => {
    it('should detect tag when oni is within TAG_DISTANCE of runner', () => {
      // Set local player as oni
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });

      // Add a runner player within tag distance
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Runner',
        isOni: false,
        isAI: false,
        position: { x: 1, y: 0, z: 0 }, // 1 unit away
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        survivedTime: 10,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      // Update tagging system
      const tagEvent = taggingSystem.update(0.016);

      // Should detect tag
      expect(tagEvent).not.toBeNull();
      expect(tagEvent?.taggedId).toBe('player2');
      expect(tagEvent?.taggerId).toBe('player1');
    });

    it('should not detect tag when distance is greater than TAG_DISTANCE', () => {
      // Set local player as oni
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });

      // Add a runner player outside tag distance
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Runner',
        isOni: false,
        isAI: false,
        position: { x: 5, y: 0, z: 0 }, // 5 units away (> TAG_DISTANCE)
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 10,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      // Update tagging system
      const tagEvent = taggingSystem.update(0.016);

      // Should not detect tag
      expect(tagEvent).toBeNull();
    });

    it('should not detect tag when local player is not oni', () => {
      // Set local player as runner
      gameState.setLocalPlayerIsOni(false);
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });

      // Add an oni player within tag distance
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Oni',
        isOni: true,
        isAI: false,
        position: { x: 1, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      // Update tagging system
      const tagEvent = taggingSystem.update(0.016);

      // Should not detect tag (runner can't tag)
      expect(tagEvent).toBeNull();
    });
  });

  describe('State changes', () => {
    it('should convert runner to oni when tagged', () => {
      // Set local player as oni
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });

      // Add a runner player
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Runner',
        isOni: false,
        isAI: false,
        position: { x: 1, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 10,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      // Update tagging system
      const tagEvent = taggingSystem.update(0.016);

      // Check that player was converted to oni
      const taggedPlayer = gameState.getRemotePlayer('player2');
      expect(taggedPlayer?.isOni).toBe(true);
      expect(taggedPlayer?.wasTagged).toBe(true);
    });

    it('should reset dash state when converting to oni', () => {
      // Set local player as oni
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });

      // Add a runner player who is dashing
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Runner',
        isOni: false,
        isAI: false,
        position: { x: 1, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 10,
        wasTagged: false,
        isOnSurface: true,
        isDashing: true, // Dashing
        isJetpacking: false,
        beaconCooldown: 0,
      });

      // Update tagging system
      taggingSystem.update(0.016);

      // Check that dash state was reset
      const taggedPlayer = gameState.getRemotePlayer('player2');
      expect(taggedPlayer?.isDashing).toBe(false);
    });

    it('should start beacon cooldown when local player becomes oni', () => {
      // Set local player as runner initially
      gameState.setLocalPlayerIsOni(false);
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });

      // Add an oni player
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Oni',
        isOni: true,
        isAI: false,
        position: { x: 1, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      // Manually convert local player to oni (simulating being tagged)
      gameState.setLocalPlayerIsOni(true);
      beaconSystem.onBecameOni();

      // Check that beacon is not available immediately
      expect(beaconSystem.isAvailable()).toBe(false);
      expect(beaconSystem.getRemainingCooldown()).toBeGreaterThan(0);
    });
  });

  describe('Tag cooldown', () => {
    it('should prevent double-tagging with cooldown', () => {
      // Set local player as oni
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });

      // Add a runner player
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Runner',
        isOni: false,
        isAI: false,
        position: { x: 1, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 10,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      // First tag
      const firstTag = taggingSystem.update(0.016);
      expect(firstTag).not.toBeNull();

      // Immediate second update should not tag again (cooldown)
      const secondTag = taggingSystem.update(0.016);
      expect(secondTag).toBeNull();
    });
  });

  describe('Tag events', () => {
    it('should record tag events', () => {
      // Set local player as oni
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });

      // Add a runner player
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Runner',
        isOni: false,
        isAI: false,
        position: { x: 1, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 10,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      // Update tagging system
      taggingSystem.update(0.016);

      // Check that event was recorded
      const events = taggingSystem.getTagEvents();
      expect(events.length).toBe(1);
      expect(events[0].taggerId).toBe('player1');
      expect(events[0].taggedId).toBe('player2');
    });

    it('should clear tag events', () => {
      // Set local player as oni
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });

      // Add a runner player
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Runner',
        isOni: false,
        isAI: false,
        position: { x: 1, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 10,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      // Update tagging system
      taggingSystem.update(0.016);

      // Clear events
      taggingSystem.clearTagEvents();

      // Check that events were cleared
      const events = taggingSystem.getTagEvents();
      expect(events.length).toBe(0);
    });
  });

  describe('Reset', () => {
    it('should reset tagging system for new round', () => {
      // Set local player as oni
      gameState.setLocalPlayerIsOni(true);
      gameState.setLocalPlayerPosition({ x: 0, y: 0, z: 0 });

      // Add a runner player
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Runner',
        isOni: false,
        isAI: false,
        position: { x: 1, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 10,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      // Update tagging system
      taggingSystem.update(0.016);

      // Reset
      taggingSystem.reset();

      // Check that state was reset
      const events = taggingSystem.getTagEvents();
      expect(events.length).toBe(0);
    });
  });
});
