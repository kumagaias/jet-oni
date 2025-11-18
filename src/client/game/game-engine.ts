import * as THREE from 'three';
import { CAMERA_HEIGHT, MAP_SIZE, MAP_HEIGHT } from '../../shared/constants';
import { PerformanceOptimizer } from '../utils/performance-optimizer';

/**
 * GameEngine manages the Three.js scene, camera, renderer, and game loop
 */
export class GameEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private isPaused = false;
  private lastTime = 0;
  private updateCallbacks: Array<(deltaTime: number) => void> = [];
  private performanceOptimizer: PerformanceOptimizer;
  private shadowUpdateCounter = 0;
  private readonly shadowUpdateInterval = 10; // Update shadows every 10 frames

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.performanceOptimizer = PerformanceOptimizer.getInstance();
    
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, MAP_SIZE * 1.5);

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      MAP_SIZE * 3
    );
    this.camera.position.set(0, CAMERA_HEIGHT, 0);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(window.devicePixelRatio ?? 1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; // Manual shadow updates for performance

    // Apply performance optimizations
    this.performanceOptimizer.optimizeRenderer(this.renderer);

    // Setup lighting
    this.setupLighting();

    // Handle window resize
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Setup scene lighting
   */
  private setupLighting(): void {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    ambientLight.name = 'ambientLight';
    this.scene.add(ambientLight);

    // Directional light (sun) for shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.name = 'directionalLight';
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;

    // Configure shadow properties
    directionalLight.shadow.camera.left = -MAP_SIZE;
    directionalLight.shadow.camera.right = MAP_SIZE;
    directionalLight.shadow.camera.top = MAP_SIZE;
    directionalLight.shadow.camera.bottom = -MAP_SIZE;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = MAP_SIZE * 3;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    this.scene.add(directionalLight);

    // Hemisphere light for natural sky/ground lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x545454, 0.4);
    hemisphereLight.name = 'hemisphereLight';
    this.scene.add(hemisphereLight);
  }

  /**
   * Set time of day (day or night)
   */
  public setTimeOfDay(timeOfDay: 'day' | 'night'): void {
    const ambientLight = this.scene.getObjectByName('ambientLight') as THREE.AmbientLight;
    const directionalLight = this.scene.getObjectByName('directionalLight') as THREE.DirectionalLight;
    const hemisphereLight = this.scene.getObjectByName('hemisphereLight') as THREE.HemisphereLight;

    if (timeOfDay === 'night') {
      // Night mode: darker ambient, moonlight, dark blue sky
      if (ambientLight) {
        ambientLight.intensity = 0.2;
        ambientLight.color.setHex(0x4a5f8f); // Blue-ish ambient
      }
      if (directionalLight) {
        directionalLight.intensity = 0.3;
        directionalLight.color.setHex(0x9db4d4); // Moonlight color
        directionalLight.position.set(-50, 100, -50); // Moon position
      }
      if (hemisphereLight) {
        hemisphereLight.intensity = 0.2;
        hemisphereLight.color.setHex(0x1a1a2e); // Dark sky
        hemisphereLight.groundColor.setHex(0x0f0f1e); // Dark ground
      }
      
      // Change scene background and fog to night
      this.scene.background = new THREE.Color(0x0a0a1a);
      this.scene.fog = new THREE.Fog(0x0a0a1a, 30, MAP_SIZE * 1.2);
    } else {
      // Day mode: bright ambient, sunlight, sky blue
      if (ambientLight) {
        ambientLight.intensity = 0.6;
        ambientLight.color.setHex(0xffffff);
      }
      if (directionalLight) {
        directionalLight.intensity = 0.8;
        directionalLight.color.setHex(0xffffff);
        directionalLight.position.set(50, 100, 50); // Sun position
      }
      if (hemisphereLight) {
        hemisphereLight.intensity = 0.4;
        hemisphereLight.color.setHex(0x87ceeb); // Sky blue
        hemisphereLight.groundColor.setHex(0x545454); // Ground color
      }
      
      // Change scene background and fog to day
      this.scene.background = new THREE.Color(0x87ceeb);
      this.scene.fog = new THREE.Fog(0x87ceeb, 50, MAP_SIZE * 1.5);
    }
  }

  /**
   * Handle window resize
   */
  private handleResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  };

  /**
   * Register a callback to be called on each update
   */
  public onUpdate(callback: (deltaTime: number) => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Remove an update callback
   */
  public offUpdate(callback: (deltaTime: number) => void): void {
    const index = this.updateCallbacks.indexOf(callback);
    if (index !== -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  /**
   * Main game loop
   */
  private gameLoop = (currentTime: number): void => {
    if (!this.isRunning) return;

    // Calculate delta time in seconds
    const deltaTime = this.lastTime === 0 ? 0 : (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Cap delta time to prevent large jumps
    const cappedDeltaTime = Math.min(deltaTime, 0.1);

    // Update FPS tracking
    this.performanceOptimizer.updateFPS(currentTime);

    // Only run update callbacks if not paused
    if (!this.isPaused) {
      // Call all update callbacks
      for (const callback of this.updateCallbacks) {
        callback(cappedDeltaTime);
      }

      // Update shadows periodically instead of every frame
      this.shadowUpdateCounter++;
      if (this.shadowUpdateCounter >= this.shadowUpdateInterval) {
        this.renderer.shadowMap.needsUpdate = true;
        this.shadowUpdateCounter = 0;
      }
    }

    // Always render the scene (even when paused)
    this.renderer.render(this.scene, this.camera);

    // Continue the loop
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  /**
   * Start the game loop
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = 0;
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Pause the game loop (keeps rendering but stops updates)
   */
  public pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume the game loop
   */
  public resume(): void {
    this.isPaused = false;
    this.lastTime = 0; // Reset time to avoid large delta
  }

  /**
   * Add an object to the scene
   */
  public addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * Remove an object from the scene
   */
  public removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * Optimize scene for performance
   */
  public optimizeScene(): void {
    this.performanceOptimizer.optimizeScene(this.scene);
  }

  /**
   * Get current FPS
   */
  public getFPS(): number {
    return this.performanceOptimizer.getAverageFPS();
  }

  /**
   * Check if performance is low
   */
  public isLowPerformance(): boolean {
    return this.performanceOptimizer.isLowPerformance();
  }

  /**
   * Get the scene
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get the camera
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Get the renderer
   */
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    
    // Dispose all scene objects
    this.performanceOptimizer.disposeObject(this.scene);
    
    this.renderer.dispose();
    this.updateCallbacks = [];
    this.performanceOptimizer.reset();
  }
}
