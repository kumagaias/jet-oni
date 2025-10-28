import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TagSystem, TagEvent } from './tag-system';
import { GameState } from './game-state';
import { TAG_DISTANCE } from '../../shared/constants';

describe('TagSystem', () => {
  let gameState: GameState;
  let tagSystem: TagSystem;

  beforeEach(() => {
    gameState = new GameState('player1');
    tagSystem = new TagSystem(gameState);
    gameState.setGamePhase('playing');
  });

  describe('Distance calculation', () => {
    it('should calculate correct distance between players', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.position = { x: 0, y: 0, z: 0 };

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: true,
        isAI: false,
        position: { x: 3, y: 4, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      const distance = tagSystem.getDistanceToPlayer('player2');
      expect(distance).toBe(5); // sqrt(3^2 + 4^2) = 5
    });
  });

  describe('Tag detection', () => {
    it('should detect when oni is within tag distance of runner', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.position = { x: 0, y: 0, z: 0 };
      localPlayer.isOni = true;

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: false,
        isAI: false,
        position: { x: 1, y: 0, z: 0 }, // Within TAG_DISTANCE
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 10,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      let tagEventFired = false;
      tagSystem.onTag((event: TagEvent) => {
        tagEventFired = true;
        expect(event.taggerId).toBe('player1');
        expect(event.taggedId).toBe('player2');
        expect(event.survivedTime).toBe(10);
      });

      tagSystem.update(0.016);
      expect(tagEventFired).toBe(true);
    });

    it('should not detect tag when players are too far apart', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.position = { x: 0, y: 0, z: 0 };
      localPlayer.isOni = true;

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: false,
        isAI: false,
        position: { x: 10, y: 0, z: 0 }, // Far away
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 10,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      let tagEventFired = false;
      tagSystem.onTag(() => {
        tagEventFired = true;
      });

      tagSystem.update(0.016);
      expect(tagEventFired).toBe(false);
    });

    it('should not allow runner to tag another player', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.position = { x: 0, y: 0, z: 0 };
      localPlayer.isOni = false; // Runner

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
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

      let tagEventFired = false;
      tagSystem.onTag(() => {
        tagEventFired = true;
      });

      tagSystem.update(0.016);
      expect(tagEventFired).toBe(false);
    });

    it('should not allow oni to tag another oni', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.position = { x: 0, y: 0, z: 0 };
      localPlayer.isOni = true;

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: true, // Also oni
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

      let tagEventFired = false;
      tagSystem.onTag(() => {
        tagEventFired = true;
      });

      tagSystem.update(0.016);
      expect(tagEventFired).toBe(false);
    });
  });

  describe('State changes on tag', () => {
    it('should convert tagged player to oni', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.position = { x: 0, y: 0, z: 0 };
      localPlayer.isOni = true;

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
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

      tagSystem.update(0.016);

      const player2 = gameState.getRemotePlayer('player2');
      expect(player2?.isOni).toBe(true);
      expect(player2?.wasTagged).toBe(true);
    });

    it('should convert local player to oni when tagged', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.position = { x: 0, y: 0, z: 0 };
      localPlayer.isOni = false;

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
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

      tagSystem.update(0.016);

      expect(localPlayer.isOni).toBe(true);
    });

    it('should record survived time when player is tagged', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.position = { x: 0, y: 0, z: 0 };
      localPlayer.isOni = true;

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: false,
        isAI: false,
        position: { x: 1, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 42.5,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      let recordedTime = 0;
      tagSystem.onTag((event: TagEvent) => {
        recordedTime = event.survivedTime;
      });

      tagSystem.update(0.016);
      expect(recordedTime).toBe(42.5);
    });
  });

  describe('Game end condition', () => {
    it('should detect when all players are oni', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.isOni = true;

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: true,
        isAI: false,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      expect(tagSystem.areAllPlayersOni()).toBe(true);
    });

    it('should return false when at least one runner exists', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.isOni = true;

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: false, // Still a runner
        isAI: false,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      expect(tagSystem.areAllPlayersOni()).toBe(false);
    });
  });

  describe('Close to being tagged detection', () => {
    it('should detect when runner is close to oni', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.position = { x: 0, y: 0, z: 0 };
      localPlayer.isOni = false;

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: true,
        isAI: false,
        position: { x: 2, y: 0, z: 0 }, // Within 2x TAG_DISTANCE
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      expect(tagSystem.isCloseToBeingTagged()).toBe(true);
    });

    it('should return false when no oni is nearby', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.position = { x: 0, y: 0, z: 0 };
      localPlayer.isOni = false;

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: true,
        isAI: false,
        position: { x: 50, y: 0, z: 0 }, // Far away
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      expect(tagSystem.isCloseToBeingTagged()).toBe(false);
    });

    it('should return false when local player is oni', () => {
      const localPlayer = gameState.getLocalPlayer();
      localPlayer.position = { x: 0, y: 0, z: 0 };
      localPlayer.isOni = true; // Oni cannot be tagged

      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: true,
        isAI: false,
        position: { x: 2, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });

      expect(tagSystem.isCloseToBeingTagged()).toBe(false);
    });
  });
});
