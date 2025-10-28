/**
 * Generic object pool for reusing objects
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize = 10, maxSize = 100) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;

    // Pre-allocate initial objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * Get an object from the pool
   */
  public acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.factory();
    }

    this.active.add(obj);
    return obj;
  }

  /**
   * Return an object to the pool
   */
  public release(obj: T): void {
    if (!this.active.has(obj)) {
      return; // Object not from this pool
    }

    this.active.delete(obj);
    this.reset(obj);

    // Only keep up to maxSize objects in pool
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  /**
   * Release all active objects
   */
  public releaseAll(): void {
    for (const obj of this.active) {
      this.reset(obj);
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj);
      }
    }
    this.active.clear();
  }

  /**
   * Get pool statistics
   */
  public getStats(): { available: number; active: number; total: number } {
    return {
      available: this.pool.length,
      active: this.active.size,
      total: this.pool.length + this.active.size,
    };
  }

  /**
   * Clear the pool
   */
  public clear(): void {
    this.pool = [];
    this.active.clear();
  }
}
