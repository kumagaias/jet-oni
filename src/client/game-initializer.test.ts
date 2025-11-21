import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeCollections, createDebugInfo, setupDebugMode } from './game-initializer';

describe('Game Initializer', () => {
  describe('initializeCollections', () => {
    it('should create empty player model collections', () => {
      const collections = initializeCollections();
      
      expect(collections.aiPlayerModels).toBeInstanceOf(Map);
      expect(collections.remotePlayerModels).toBeInstanceOf(Map);
      expect(collections.aiPlayerModels.size).toBe(0);
      expect(collections.remotePlayerModels.size).toBe(0);
    });
  });
  
  describe('createDebugInfo', () => {
    beforeEach(() => {
      // Clean up any existing debug info
      const existing = document.getElementById('debug-info');
      if (existing) {
        existing.remove();
      }
    });
    
    it('should create debug info element', () => {
      const debugInfo = createDebugInfo();
      
      expect(debugInfo).toBeInstanceOf(HTMLDivElement);
      expect(debugInfo.id).toBe('debug-info');
      expect(debugInfo.style.display).toBe('none');
    });
    
    it('should append debug info to document body', () => {
      createDebugInfo();
      
      const debugInfo = document.getElementById('debug-info');
      expect(debugInfo).toBeTruthy();
      expect(debugInfo?.parentElement).toBe(document.body);
    });
  });
  
  describe('setupDebugMode', () => {
    let debugInfo: HTMLDivElement;
    
    beforeEach(() => {
      const existing = document.getElementById('debug-info');
      if (existing) {
        existing.remove();
      }
      debugInfo = createDebugInfo();
    });
    
    it('should return debug mode checker', () => {
      const debugMode = setupDebugMode(debugInfo);
      
      expect(debugMode.isDebugMode).toBeInstanceOf(Function);
      expect(debugMode.isDebugMode()).toBe(false);
    });
    
    it('should toggle debug mode on F2 in dev subreddit', () => {
      // Mock URL to be dev subreddit
      Object.defineProperty(window, 'location', {
        value: { href: 'https://reddit.com/r/jet_oni_dev' },
        writable: true,
      });
      
      const debugMode = setupDebugMode(debugInfo);
      
      // Initially off
      expect(debugMode.isDebugMode()).toBe(false);
      expect(debugInfo.style.display).toBe('none');
      
      // Press F2
      const event = new KeyboardEvent('keydown', { code: 'F2' });
      window.dispatchEvent(event);
      
      // Should be on now
      expect(debugMode.isDebugMode()).toBe(true);
      expect(debugInfo.style.display).toBe('block');
      
      // Press F2 again
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F2' }));
      
      // Should be off again
      expect(debugMode.isDebugMode()).toBe(false);
      expect(debugInfo.style.display).toBe('none');
    });
    
    it('should not toggle debug mode in production', () => {
      // Mock URL to be production
      Object.defineProperty(window, 'location', {
        value: { href: 'https://reddit.com/r/some_subreddit' },
        writable: true,
      });
      
      const debugMode = setupDebugMode(debugInfo);
      
      // Press F2
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F2' }));
      
      // Should still be off
      expect(debugMode.isDebugMode()).toBe(false);
      expect(debugInfo.style.display).toBe('none');
    });
  });
});
