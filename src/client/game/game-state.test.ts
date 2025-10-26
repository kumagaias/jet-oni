import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from './game-state';
import { MAX_FUEL, MAP_SIZE } from '../../shared/constants';

describe('GameState', () => {
  let gameState: GameState;
  const playerId = 'test-player-1';

  beforeEach(() => {
    gameState = new GameState(playerId);
  });

  describe('initialization', () => {
    it('should initialize with lobby phase', () => {
      expect(gameState.getGamePhase()).toBe('lobby');
      expect(gameState.isInLobby()).toBe(true);
    });

    it('should initialize local player with default values', () => {
      const player = gameState.getLocalPlayer();
      expect(player.id).toBe(playerId);
      expect(player.fuel).toBe(MAX_FUEL);
      expect(player.isOni).toBe(false);
      expect(player.isOnSurface).toBe(true);
    });
  });

  describe('game phase management', () => {
    it('should transition between game phases', () => {
      gameState.setGamePhase('playing');
      expect(gameState.isPlaying()).toBe(true);
      expect(gameState.isInLobby()).toBe(false);

      gameState.setGamePhase('ended');
      expect(gameState.hasEnded()).toBe(true);
      expect(gameState.isPlaying()).toBe(false);
    });
  });

  describe('local player state', () => {
    it('should update local player position', () => {
      const newPosition = { x: 10, y: 5, z: 15 };
      gameState.setLocalPlayerPosition(newPosition);
      
      const player = gameState.getLocalPlayer();
      expect(player.position).toEqual(newPosition);
    });

    it('should update local player velocity', () => {
      const newVelocity = { x: 1, y: 0, z: 2 };
      gameState.setLocalPlayerVelocity(newVelocity);
      
      const player = gameState.getLocalPlayer();
      expect(player.velocity).toEqual(newVelocity);
    });

    it('should update local player rotation', () => {
      gameState.setLocalPlayerRotation(Math.PI / 2, Math.PI / 4);
      
      const player = gameState.getLocalPlayer();
      expect(player.rotation.yaw).toBe(Math.PI / 2);
      expect(player.rotation.pitch).toBe(Math.PI / 4);
    });

    it('should clamp fuel between 0 and MAX_FUEL', () => {
      gameState.setLocalPlayerFuel(150);
      expect(gameState.getLocalPlayer().fuel).toBe(MAX_FUEL);

      gameState.setLocalPlayerFuel(-10);
      expect(gameState.getLocalPlayer().fuel).toBe(0);

      gameState.setLocalPlayerFuel(50);
      expect(gameState.getLocalPlayer().fuel).toBe(50);
    });

    it('should update oni status', () => {
      gameState.setLocalPlayerIsOni(true);
      expect(gameState.getLocalPlayer().isOni).toBe(true);

      gameState.setLocalPlayerIsOni(false);
      expect(gameState.getLocalPlayer().isOni).toBe(false);
    });
  });

  describe('map bounds', () => {
    it('should check if position is within bounds', () => {
      expect(gameState.isPositionInBounds({ x: 0, y: 0, z: 0 })).toBe(true);
      expect(gameState.isPositionInBounds({ x: MAP_SIZE, y: 0, z: MAP_SIZE })).toBe(true);
      expect(gameState.isPositionInBounds({ x: MAP_SIZE + 1, y: 0, z: 0 })).toBe(false);
      expect(gameState.isPositionInBounds({ x: 0, y: -1, z: 0 })).toBe(false);
    });

    it('should clamp position to bounds', () => {
      const outOfBounds = { x: MAP_SIZE + 10, y: -5, z: MAP_SIZE + 20 };
      const clamped = gameState.clampPositionToBounds(outOfBounds);
      
      expect(clamped.x).toBe(MAP_SIZE);
      expect(clamped.y).toBe(0);
      expect(clamped.z).toBe(MAP_SIZE);
    });
  });

  describe('remote players', () => {
    it('should add and retrieve remote players', () => {
      const remotePlayer = {
        id: 'remote-1',
        username: 'Remote Player',
        isOni: false,
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
      };

      gameState.updateRemotePlayer(remotePlayer);
      
      const retrieved = gameState.getRemotePlayer('remote-1');
      expect(retrieved).toEqual(remotePlayer);
    });

    it('should remove remote players', () => {
      const remotePlayer = {
        id: 'remote-1',
        username: 'Remote Player',
        isOni: false,
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
      };

      gameState.updateRemotePlayer(remotePlayer);
      gameState.removeRemotePlayer('remote-1');
      
      expect(gameState.getRemotePlayer('remote-1')).toBeUndefined();
    });

    it('should count oni and runner players', () => {
      gameState.setLocalPlayerIsOni(true);
      
      const runner1 = {
        id: 'runner-1',
        username: 'Runner 1',
        isOni: false,
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
      };

      const oni1 = { ...runner1, id: 'oni-1', username: 'Oni 1', isOni: true };

      gameState.updateRemotePlayer(runner1);
      gameState.updateRemotePlayer(oni1);

      expect(gameState.countOniPlayers()).toBe(2);
      expect(gameState.countRunnerPlayers()).toBe(1);
    });
  });

  describe('time management', () => {
    it('should track elapsed time when playing', () => {
      gameState.setGamePhase('playing');
      
      // Wait a bit
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const elapsed = gameState.getElapsedTime();
          expect(elapsed).toBeGreaterThan(0);
          resolve();
        }, 100);
      });
    });

    it('should calculate remaining time', () => {
      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 180,
        rounds: 1,
      });
      
      gameState.setGamePhase('playing');
      
      const remaining = gameState.getRemainingTime();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(180);
    });

    it('should detect when time runs out', () => {
      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 0,
        rounds: 1,
      });
      
      gameState.setGamePhase('playing');
      
      expect(gameState.hasTimeRunOut()).toBe(true);
    });
  });

  describe('reset and clear', () => {
    it('should reset for new round', () => {
      gameState.setLocalPlayerPosition({ x: 100, y: 50, z: 100 });
      gameState.setLocalPlayerFuel(50);
      
      gameState.resetForNewRound();
      
      const player = gameState.getLocalPlayer();
      expect(player.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(player.fuel).toBe(MAX_FUEL);
    });

    it('should clear all state', () => {
      gameState.setGamePhase('playing');
      gameState.setGameConfig({
        totalPlayers: 4,
        roundDuration: 180,
        rounds: 1,
      });
      
      gameState.clear();
      
      expect(gameState.getGamePhase()).toBe('lobby');
      expect(gameState.getGameConfig()).toBeNull();
    });
  });
});
