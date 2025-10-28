import { Vector3 } from '../../shared/types/game';

/**
 * Grid cell containing objects
 */
interface GridCell<T> {
  objects: T[];
}

/**
 * Object with position for spatial partitioning
 */
export interface SpatialObject {
  position: Vector3;
  [key: string]: unknown;
}

/**
 * SpatialGrid provides spatial partitioning for efficient collision detection
 */
export class SpatialGrid<T extends SpatialObject> {
  private grid: Map<string, GridCell<T>>;
  private cellSize: number;
  private mapSize: number;

  constructor(cellSize: number, mapSize: number) {
    this.grid = new Map();
    this.cellSize = cellSize;
    this.mapSize = mapSize;
  }

  /**
   * Get grid cell key for a position
   */
  private getCellKey(x: number, z: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellZ}`;
  }

  /**
   * Add object to grid
   */
  public add(object: T): void {
    const key = this.getCellKey(object.position.x, object.position.z);
    
    if (!this.grid.has(key)) {
      this.grid.set(key, { objects: [] });
    }

    const cell = this.grid.get(key)!;
    if (!cell.objects.includes(object)) {
      cell.objects.push(object);
    }
  }

  /**
   * Remove object from grid
   */
  public remove(object: T): void {
    const key = this.getCellKey(object.position.x, object.position.z);
    const cell = this.grid.get(key);
    
    if (cell) {
      const index = cell.objects.indexOf(object);
      if (index !== -1) {
        cell.objects.splice(index, 1);
      }
    }
  }

  /**
   * Update object position in grid
   */
  public update(object: T, oldPosition: Vector3): void {
    const oldKey = this.getCellKey(oldPosition.x, oldPosition.z);
    const newKey = this.getCellKey(object.position.x, object.position.z);

    // If cell changed, move object
    if (oldKey !== newKey) {
      // Remove from old cell
      const oldCell = this.grid.get(oldKey);
      if (oldCell) {
        const index = oldCell.objects.indexOf(object);
        if (index !== -1) {
          oldCell.objects.splice(index, 1);
        }
      }

      // Add to new cell
      if (!this.grid.has(newKey)) {
        this.grid.set(newKey, { objects: [] });
      }
      const newCell = this.grid.get(newKey)!;
      if (!newCell.objects.includes(object)) {
        newCell.objects.push(object);
      }
    }
  }

  /**
   * Get nearby objects within radius
   */
  public getNearby(position: Vector3, radius: number): T[] {
    const nearby: T[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    
    const centerCellX = Math.floor(position.x / this.cellSize);
    const centerCellZ = Math.floor(position.z / this.cellSize);

    // Check surrounding cells
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const key = `${centerCellX + dx},${centerCellZ + dz}`;
        const cell = this.grid.get(key);
        
        if (cell) {
          for (const object of cell.objects) {
            // Check actual distance
            const distSq = 
              (object.position.x - position.x) ** 2 +
              (object.position.z - position.z) ** 2;
            
            if (distSq <= radius * radius) {
              nearby.push(object);
            }
          }
        }
      }
    }

    return nearby;
  }

  /**
   * Get all objects in grid
   */
  public getAll(): T[] {
    const all: T[] = [];
    
    for (const cell of this.grid.values()) {
      all.push(...cell.objects);
    }

    return all;
  }

  /**
   * Clear all objects from grid
   */
  public clear(): void {
    this.grid.clear();
  }

  /**
   * Get grid statistics
   */
  public getStats(): { cellCount: number; objectCount: number; avgObjectsPerCell: number } {
    const cellCount = this.grid.size;
    let objectCount = 0;

    for (const cell of this.grid.values()) {
      objectCount += cell.objects.length;
    }

    return {
      cellCount,
      objectCount,
      avgObjectsPerCell: cellCount > 0 ? objectCount / cellCount : 0,
    };
  }
}
