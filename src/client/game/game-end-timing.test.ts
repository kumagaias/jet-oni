import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from './game-state';
import type { Player } from '../../shared/types/game';

describe('Game End Timing', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = new GameState();
    gameState.setGamePhase('playing');
    gameState.setGameConfig({
      totalPlayers: 6,
      roundDuration: 60,
      rounds: 1,
    });
    
    // Mock Date.now() to control time
    vi.useFakeTimers();
  });

  describe('1 human + 5 AI scenario', () => {
    beforeEach(() => {
      // Set up 1 human (local) + 5 AI (remote)
      gameState.setLocalPlayerIsOni(false); // Human is runner
      
      // Add 5 AI players (2 ONI, 3 runners)
      for (let i = 1; i <= 5; i++) {
        const isOni = i <= 2; // First 2 are ONI
        gameState.updateRemotePlayer({
          id: `ai_${i}`,
          username: `AI_${i}`,
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { yaw: 0, pitch: 0 },
          fuel: 100,
          isOni,
          isAI: true,
          isOnSurface: true,
          isDashing: false,
          isJetpacking: false,
          survivedTime: 0,
          wasTagged: false,
          beaconCooldown: 0,
          tagCount: 0,
        });
      }
    });

    it('should NOT end game immediately after start (< 10 seconds)', () => {
      // Start game
      gameState.setGameStartTime(Date.now());
      
      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);
      
      // Game should NOT end (within 10 second grace period)
      expect(gameState.shouldGameEnd()).toBe(false);
    });

    it('should NOT end game at 10 seconds if runners exist', () => {
      // Start game
      gameState.setGameStartTime(Date.now());
      
      // Advance time by 10 seconds
      vi.advanceTimersByTime(10000);
      
      // Game should NOT end (runners still exist)
      expect(gameState.shouldGameEnd()).toBe(false);
    });

    it('should end game after 10 seconds if all players become ONI', () => {
      // Start game
      gameState.setGameStartTime(Date.now());
      
      // Advance time by 11 seconds
      vi.advanceTimersByTime(11000);
      
      // Make all players ONI
      gameState.setLocalPlayerIsOni(true);
      for (let i = 1; i <= 5; i++) {
        gameState.updateRemotePlayer({
          id: `ai_${i}`,
          username: `AI_${i}`,
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { yaw: 0, pitch: 0 },
          fuel: 100,
          isOni: true,
          isAI: true,
          isOnSurface: true,
          isDashing: false,
          isJetpacking: false,
          survivedTime: 0,
          wasTagged: true,
          beaconCooldown: 0,
          tagCount: 0,
        });
      }
      
      // Game should end (all players are ONI)
      expect(gameState.shouldGameEnd()).toBe(true);
    });
  });

  describe('2 human + 4 AI scenario', () => {
    beforeEach(() => {
      // Set up 2 human (1 local + 1 remote) + 4 AI (remote)
      gameState.setLocalPlayerIsOni(false); // Local human is runner
      
      // Add 1 remote human player (runner)
      gameState.updateRemotePlayer({
        id: 'human_2',
        username: 'Player2',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        isOni: false,
        isAI: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        survivedTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
        tagCount: 0,
      });
      
      // Add 4 AI players (2 ONI, 2 runners)
      for (let i = 1; i <= 4; i++) {
        const isOni = i <= 2; // First 2 are ONI
        gameState.updateRemotePlayer({
          id: `ai_${i}`,
          username: `AI_${i}`,
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { yaw: 0, pitch: 0 },
          fuel: 100,
          isOni,
          isAI: true,
          isOnSurface: true,
          isDashing: false,
          isJetpacking: false,
          survivedTime: 0,
          wasTagged: false,
          beaconCooldown: 0,
          tagCount: 0,
        });
      }
    });

    it('should NOT end game immediately after start (< 10 seconds)', () => {
      // Start game
      gameState.setGameStartTime(Date.now());
      
      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);
      
      // Game should NOT end (within 10 second grace period)
      expect(gameState.shouldGameEnd()).toBe(false);
    });

    it('should NOT end game at 10 seconds if runners exist', () => {
      // Start game
      gameState.setGameStartTime(Date.now());
      
      // Advance time by 10 seconds
      vi.advanceTimersByTime(10000);
      
      // Game should NOT end (runners still exist)
      expect(gameState.shouldGameEnd()).toBe(false);
    });

    it('should end game after 10 seconds if all players become ONI', () => {
      // Start game
      gameState.setGameStartTime(Date.now());
      
      // Advance time by 11 seconds
      vi.advanceTimersByTime(11000);
      
      // Make all players ONI
      gameState.setLocalPlayerIsOni(true);
      gameState.updateRemotePlayer({
        id: 'human_2',
        username: 'Player2',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        isOni: true,
        isAI: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        survivedTime: 0,
        wasTagged: true,
        beaconCooldown: 0,
        tagCount: 0,
      });
      for (let i = 1; i <= 4; i++) {
        gameState.updateRemotePlayer({
          id: `ai_${i}`,
          username: `AI_${i}`,
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { yaw: 0, pitch: 0 },
          fuel: 100,
          isOni: true,
          isAI: true,
          isOnSurface: true,
          isDashing: false,
          isJetpacking: false,
          survivedTime: 0,
          wasTagged: true,
          beaconCooldown: 0,
          tagCount: 0,
        });
      }
      
      // Game should end (all players are ONI)
      expect(gameState.shouldGameEnd()).toBe(true);
    });
  });

  describe('Time-based game end', () => {
    beforeEach(() => {
      // Set up game with 60 second duration
      gameState.setGameConfig({
        totalPlayers: 6,
        roundDuration: 60,
        rounds: 1,
      });
      
      // Add some players
      gameState.setLocalPlayerIsOni(false);
      gameState.updateRemotePlayer({
        id: 'player_2',
        username: 'Player2',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        fuel: 100,
        isOni: true,
        isAI: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        survivedTime: 0,
        wasTagged: false,
        beaconCooldown: 0,
        tagCount: 0,
      });
    });

    it('should end game when time runs out', () => {
      // Start game
      gameState.setGameStartTime(Date.now());
      
      // Advance time by 61 seconds (past round duration)
      vi.advanceTimersByTime(61000);
      
      // Game should end (time ran out)
      expect(gameState.shouldGameEnd()).toBe(true);
    });

    it('should NOT end game before time runs out', () => {
      // Start game
      gameState.setGameStartTime(Date.now());
      
      // Advance time by 30 seconds (half of round duration)
      vi.advanceTimersByTime(30000);
      
      // Game should NOT end (time not up yet)
      expect(gameState.shouldGameEnd()).toBe(false);
    });
  });
});
