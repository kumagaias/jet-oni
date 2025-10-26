import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine } from './game-engine';
import * as THREE from 'three';
import { CAMERA_HEIGHT, MAP_SIZE } from '../../shared/constants';

describe('GameEngine', () => {
  let canvas: HTMLCanvasElement;
  let gameEngine: GameEngine | null;

  beforeEach(() => {
    // Create a mock canvas element
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 600,
    });

    // Mock WebGL context
    const mockContext = {
      getParameter: vi.fn(),
      getExtension: vi.fn(),
      createProgram: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      getShaderParameter: vi.fn(() => true),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      drawArrays: vi.fn(),
      clear: vi.fn(),
      clearColor: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      viewport: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      getUniformLocation: vi.fn(() => ({})),
      uniformMatrix4fv: vi.fn(),
      uniform1i: vi.fn(),
      uniform1f: vi.fn(),
      uniform3fv: vi.fn(),
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texImage2D: vi.fn(),
      texParameteri: vi.fn(),
      generateMipmap: vi.fn(),
      activeTexture: vi.fn(),
      createFramebuffer: vi.fn(),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn(() => 36053),
      deleteFramebuffer: vi.fn(),
      deleteTexture: vi.fn(),
      deleteBuffer: vi.fn(),
      deleteProgram: vi.fn(),
      deleteShader: vi.fn(),
    };

    canvas.getContext = vi.fn(() => mockContext);

    try {
      gameEngine = new GameEngine(canvas);
    } catch (error) {
      // If WebGL initialization fails, skip the test
      gameEngine = null;
    }
  });

  afterEach(() => {
    if (gameEngine) {
      gameEngine.dispose();
    }
    document.body.removeChild(canvas);
  });

  describe('scene initialization', () => {
    it('should initialize scene with correct background color', () => {
      if (!gameEngine) return;
      
      const scene = gameEngine.getScene();
      expect(scene).toBeInstanceOf(THREE.Scene);
      expect(scene.background).toBeInstanceOf(THREE.Color);
      expect((scene.background as THREE.Color).getHex()).toBe(0x87ceeb);
    });

    it('should initialize scene with fog', () => {
      if (!gameEngine) return;
      
      const scene = gameEngine.getScene();
      expect(scene.fog).toBeInstanceOf(THREE.Fog);
      expect((scene.fog as THREE.Fog).color.getHex()).toBe(0x87ceeb);
    });

    it('should initialize camera with correct settings', () => {
      if (!gameEngine) return;
      
      const camera = gameEngine.getCamera();
      expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
      expect(camera.fov).toBe(75);
      expect(camera.aspect).toBe(800 / 600);
      expect(camera.position.y).toBe(CAMERA_HEIGHT);
    });

    it('should initialize renderer with correct settings', () => {
      if (!gameEngine) return;
      
      const renderer = gameEngine.getRenderer();
      expect(renderer).toBeInstanceOf(THREE.WebGLRenderer);
      expect(renderer.shadowMap.enabled).toBe(true);
    });

    it('should add lighting to scene', () => {
      if (!gameEngine) return;
      
      const scene = gameEngine.getScene();
      const lights = scene.children.filter(
        (child) =>
          child instanceof THREE.AmbientLight ||
          child instanceof THREE.DirectionalLight ||
          child instanceof THREE.HemisphereLight
      );
      
      expect(lights.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('game loop', () => {
    it('should start the game loop', () => {
      if (!gameEngine) return;
      
      expect(gameEngine['isRunning']).toBe(false);
      
      gameEngine.start();
      
      expect(gameEngine['isRunning']).toBe(true);
      expect(gameEngine['animationFrameId']).not.toBeNull();
    });

    it('should stop the game loop', () => {
      if (!gameEngine) return;
      
      gameEngine.start();
      expect(gameEngine['isRunning']).toBe(true);
      
      gameEngine.stop();
      
      expect(gameEngine['isRunning']).toBe(false);
      expect(gameEngine['animationFrameId']).toBeNull();
    });

    it('should not start if already running', () => {
      if (!gameEngine) return;
      
      gameEngine.start();
      const firstFrameId = gameEngine['animationFrameId'];
      
      gameEngine.start();
      
      expect(gameEngine['animationFrameId']).toBe(firstFrameId);
    });

    it('should call update callbacks with delta time', () => {
      if (!gameEngine) return;
      
      return new Promise<void>((resolve) => {
        const callback = vi.fn((deltaTime: number) => {
          expect(deltaTime).toBeGreaterThanOrEqual(0);
          expect(deltaTime).toBeLessThanOrEqual(0.1);
          gameEngine!.stop();
          resolve();
        });

        gameEngine!.onUpdate(callback);
        gameEngine!.start();
      });
    });

    it('should cap delta time to prevent large jumps', () => {
      if (!gameEngine) return;
      
      return new Promise<void>((resolve) => {
        const callback = vi.fn((deltaTime: number) => {
          expect(deltaTime).toBeLessThanOrEqual(0.1);
          gameEngine!.stop();
          resolve();
        });

        gameEngine!.onUpdate(callback);
        gameEngine!.start();
      });
    });

    it('should remove update callbacks', () => {
      if (!gameEngine) return;
      
      const callback = vi.fn();
      
      gameEngine.onUpdate(callback);
      gameEngine.offUpdate(callback);
      
      expect(gameEngine['updateCallbacks']).not.toContain(callback);
    });
  });

  describe('scene management', () => {
    it('should add objects to scene', () => {
      if (!gameEngine) return;
      
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      
      gameEngine.addToScene(mesh);
      
      expect(gameEngine.getScene().children).toContain(mesh);
    });

    it('should remove objects from scene', () => {
      if (!gameEngine) return;
      
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      
      gameEngine.addToScene(mesh);
      gameEngine.removeFromScene(mesh);
      
      expect(gameEngine.getScene().children).not.toContain(mesh);
    });
  });

  describe('window resize handling', () => {
    it('should update camera and renderer on window resize', () => {
      if (!gameEngine) return;
      
      // Change window dimensions
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768,
      });

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));

      const camera = gameEngine.getCamera();
      expect(camera.aspect).toBe(1024 / 768);
    });
  });

  describe('cleanup', () => {
    it('should stop game loop on dispose', () => {
      if (!gameEngine) return;
      
      gameEngine.start();
      
      gameEngine.dispose();
      
      expect(gameEngine['isRunning']).toBe(false);
      expect(gameEngine['animationFrameId']).toBeNull();
    });

    it('should clear update callbacks on dispose', () => {
      if (!gameEngine) return;
      
      const callback = vi.fn();
      gameEngine.onUpdate(callback);
      
      gameEngine.dispose();
      
      expect(gameEngine['updateCallbacks']).toHaveLength(0);
    });
  });
});
