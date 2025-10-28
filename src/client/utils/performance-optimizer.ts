import * as THREE from 'three';

/**
 * PerformanceOptimizer provides utilities for optimizing game performance
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private fpsHistory: number[] = [];
  private readonly fpsHistorySize = 60;
  private lastFrameTime = 0;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Optimize renderer settings based on device capabilities
   */
  public optimizeRenderer(renderer: THREE.WebGLRenderer): void {
    // Detect device performance tier
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    const isLowEnd = isMobile || navigator.hardwareConcurrency <= 4;

    // Adjust pixel ratio for performance
    const pixelRatio = isLowEnd ? 1 : Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);

    // Adjust shadow map resolution
    if (renderer.shadowMap.enabled) {
      renderer.shadowMap.autoUpdate = false; // Manual shadow updates
      
      // Update shadow map size for all lights
      renderer.shadowMap.needsUpdate = true;
    }

    // Enable performance optimizations
    renderer.info.autoReset = false; // Manual reset for monitoring
  }

  /**
   * Optimize scene for better performance
   */
  public optimizeScene(scene: THREE.Scene): void {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Enable frustum culling (default, but ensure it's on)
        object.frustumCulled = true;

        // Optimize geometry
        if (object.geometry) {
          object.geometry.computeBoundingSphere();
          object.geometry.computeBoundingBox();
        }

        // Optimize materials
        if (object.material instanceof THREE.Material) {
          // Disable unnecessary features
          object.material.precision = 'mediump';
        }
      }
    });
  }

  /**
   * Update FPS tracking
   */
  public updateFPS(currentTime: number): number {
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = currentTime;
      return 60;
    }

    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    const fps = deltaTime > 0 ? 1000 / deltaTime : 60;
    
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.fpsHistorySize) {
      this.fpsHistory.shift();
    }

    return fps;
  }

  /**
   * Get average FPS
   */
  public getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60;
    
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length;
  }

  /**
   * Check if performance is low
   */
  public isLowPerformance(): boolean {
    return this.getAverageFPS() < 30;
  }

  /**
   * Dispose geometry to free memory
   */
  public disposeGeometry(geometry: THREE.BufferGeometry): void {
    geometry.dispose();
  }

  /**
   * Dispose material to free memory
   */
  public disposeMaterial(material: THREE.Material | THREE.Material[]): void {
    if (Array.isArray(material)) {
      material.forEach((m) => m.dispose());
    } else {
      material.dispose();
    }
  }

  /**
   * Dispose object and its children
   */
  public disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          this.disposeGeometry(child.geometry);
        }
        if (child.material) {
          this.disposeMaterial(child.material);
        }
      }
    });
  }

  /**
   * Reset FPS history
   */
  public reset(): void {
    this.fpsHistory = [];
    this.lastFrameTime = 0;
  }
}
