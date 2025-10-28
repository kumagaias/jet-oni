import { Vector3 } from '../../shared/types/game';

/**
 * EdgeCaseHandler provides utilities for handling edge cases
 */
export class EdgeCaseHandler {
  /**
   * Safely parse JSON with fallback
   */
  public static safeJSONParse<T>(json: string, fallback: T): T {
    try {
      return JSON.parse(json) as T;
    } catch (error) {
      console.warn('Failed to parse JSON:', error);
      return fallback;
    }
  }

  /**
   * Safely stringify JSON with fallback
   */
  public static safeJSONStringify(obj: unknown, fallback = '{}'): string {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      console.warn('Failed to stringify JSON:', error);
      return fallback;
    }
  }

  /**
   * Clamp value between min and max
   */
  public static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Check if value is finite number
   */
  public static isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && isFinite(value);
  }

  /**
   * Sanitize vector to ensure all components are finite
   */
  public static sanitizeVector(vector: Vector3): Vector3 {
    return {
      x: this.isFiniteNumber(vector.x) ? vector.x : 0,
      y: this.isFiniteNumber(vector.y) ? vector.y : 0,
      z: this.isFiniteNumber(vector.z) ? vector.z : 0,
    };
  }

  /**
   * Safely get array element with bounds checking
   */
  public static safeArrayGet<T>(array: T[], index: number, fallback: T): T {
    if (index >= 0 && index < array.length) {
      return array[index];
    }
    return fallback;
  }

  /**
   * Debounce function calls
   */
  public static debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function (this: unknown, ...args: Parameters<T>) {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        func.apply(this, args);
        timeout = null;
      }, wait);
    };
  }

  /**
   * Throttle function calls
   */
  public static throttle<T extends (...args: unknown[]) => void>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return function (this: unknown, ...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * Retry async function with exponential backoff
   */
  public static async retry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, i);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Safe division with zero check
   */
  public static safeDivide(numerator: number, denominator: number, fallback = 0): number {
    if (denominator === 0 || !this.isFiniteNumber(denominator)) {
      return fallback;
    }
    const result = numerator / denominator;
    return this.isFiniteNumber(result) ? result : fallback;
  }

  /**
   * Linear interpolation with clamping
   */
  public static lerp(start: number, end: number, t: number): number {
    const clampedT = this.clamp(t, 0, 1);
    return start + (end - start) * clampedT;
  }

  /**
   * Smooth step interpolation
   */
  public static smoothStep(start: number, end: number, t: number): number {
    const clampedT = this.clamp(t, 0, 1);
    const smoothT = clampedT * clampedT * (3 - 2 * clampedT);
    return start + (end - start) * smoothT;
  }

  /**
   * Check if two vectors are approximately equal
   */
  public static vectorsApproximatelyEqual(
    a: Vector3,
    b: Vector3,
    epsilon = 0.001
  ): boolean {
    return (
      Math.abs(a.x - b.x) < epsilon &&
      Math.abs(a.y - b.y) < epsilon &&
      Math.abs(a.z - b.z) < epsilon
    );
  }

  /**
   * Normalize angle to [-PI, PI] range
   */
  public static normalizeAngle(angle: number): number {
    while (angle > Math.PI) {
      angle -= Math.PI * 2;
    }
    while (angle < -Math.PI) {
      angle += Math.PI * 2;
    }
    return angle;
  }

  /**
   * Get shortest angle difference
   */
  public static angleDifference(a: number, b: number): number {
    const diff = this.normalizeAngle(b - a);
    return diff;
  }
}
