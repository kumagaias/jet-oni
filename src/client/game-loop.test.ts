import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameLoopState } from './game-loop';

describe('Game Loop', () => {
  describe('GameLoopState', () => {
    let state: GameLoopState;
    
    beforeEach(() => {
      state = {
        gameStarted: false,
        gameHasStarted: false,
        gameStartTime: 0,
        lastGameEndCheck: 0,
        wasOni: false,
        cloakActiveUntil: 0,
        isHost: false,
        currentGameId: null,
        taggedTimeMap: new Map(),
        aiLastSyncTime: new Map(),
      };
    });
    
    it('should initialize with default values', () => {
      expect(state.gameStarted).toBe(false);
      expect(state.gameHasStarted).toBe(false);
      expect(state.gameStartTime).toBe(0);
      expect(state.lastGameEndCheck).toBe(0);
      expect(state.wasOni).toBe(false);
      expect(state.cloakActiveUntil).toBe(0);
      expect(state.isHost).toBe(false);
      expect(state.currentGameId).toBeNull();
      expect(state.taggedTimeMap.size).toBe(0);
      expect(state.aiLastSyncTime.size).toBe(0);
    });
    
    it('should allow updating game state', () => {
      state.gameStarted = true;
      state.gameHasStarted = true;
      state.gameStartTime = Date.now();
      state.isHost = true;
      state.currentGameId = 'game-123';
      
      expect(state.gameStarted).toBe(true);
      expect(state.gameHasStarted).toBe(true);
      expect(state.gameStartTime).toBeGreaterThan(0);
      expect(state.isHost).toBe(true);
      expect(state.currentGameId).toBe('game-123');
    });
    
    it('should track tagged players', () => {
      const now = Date.now();
      state.taggedTimeMap.set('player1', now);
      state.taggedTimeMap.set('player2', now + 1000);
      
      expect(state.taggedTimeMap.size).toBe(2);
      expect(state.taggedTimeMap.get('player1')).toBe(now);
      expect(state.taggedTimeMap.get('player2')).toBe(now + 1000);
    });
    
    it('should track AI sync times', () => {
      const now = Date.now();
      state.aiLastSyncTime.set('ai1', now);
      state.aiLastSyncTime.set('ai2', now + 200);
      
      expect(state.aiLastSyncTime.size).toBe(2);
      expect(state.aiLastSyncTime.get('ai1')).toBe(now);
      expect(state.aiLastSyncTime.get('ai2')).toBe(now + 200);
    });
    
    it('should clear maps when needed', () => {
      state.taggedTimeMap.set('player1', Date.now());
      state.aiLastSyncTime.set('ai1', Date.now());
      
      state.taggedTimeMap.clear();
      state.aiLastSyncTime.clear();
      
      expect(state.taggedTimeMap.size).toBe(0);
      expect(state.aiLastSyncTime.size).toBe(0);
    });
  });
});
