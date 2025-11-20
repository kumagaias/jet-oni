import { Player, Vector3 } from '../../shared/types/game';

/**
 * Stuck detection and escape manager for AI
 */
export class StuckDetectionManager {
  private lastPositions: Map<string, { x: number; y: number; z: number; time: number }> = new Map();
  private stuckLocations: Map<string, Array<{ x: number; z: number; time: number }>> = new Map();
  private unstuckUntil: Map<string, number> = new Map();
  
  private readonly stuckThreshold: number = 5.0; // If moved less than 5 units in 5 seconds, consider stuck
  private readonly stuckCheckInterval: number = 5000; // Check every 5 seconds

  /**
   * Check if AI player is stuck (not moving much)
   */
  public checkIfStuck(aiPlayer: Player): boolean {
    const now = Date.now();
    const lastPos = this.lastPositions.get(aiPlayer.id);
    
    if (!lastPos) {
      // First time checking, record position
      this.lastPositions.set(aiPlayer.id, {
        x: aiPlayer.position.x,
        y: aiPlayer.position.y,
        z: aiPlayer.position.z,
        time: now,
      });
      return false;
    }
    
    // Check if enough time has passed
    if (now - lastPos.time < this.stuckCheckInterval) {
      return false;
    }
    
    // Calculate distance moved
    const dx = aiPlayer.position.x - lastPos.x;
    const dy = aiPlayer.position.y - lastPos.y;
    const dz = aiPlayer.position.z - lastPos.z;
    const distanceMoved = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Update last position
    this.lastPositions.set(aiPlayer.id, {
      x: aiPlayer.position.x,
      y: aiPlayer.position.y,
      z: aiPlayer.position.z,
      time: now,
    });
    
    // If moved less than threshold, consider stuck
    return distanceMoved < this.stuckThreshold;
  }

  /**
   * Check if currently in unstuck mode
   */
  public isInUnstuckMode(playerId: string): boolean {
    const now = Date.now();
    const unstuckUntilTime = this.unstuckUntil.get(playerId) || 0;
    return now < unstuckUntilTime;
  }

  /**
   * Start unstuck period (3 seconds)
   */
  public startUnstuckPeriod(playerId: string): void {
    const now = Date.now();
    this.unstuckUntil.set(playerId, now + 3000); // 3 seconds from now
  }

  /**
   * Record a stuck location to avoid returning to it
   */
  public recordStuckLocation(aiPlayer: Player): void {
    const now = Date.now();
    const locations = this.stuckLocations.get(aiPlayer.id) || [];
    
    // Add current location
    locations.push({
      x: aiPlayer.position.x,
      z: aiPlayer.position.z,
      time: now,
    });
    
    // Keep only recent stuck locations (last 10 seconds)
    const recentLocations = locations.filter(loc => now - loc.time < 10000);
    this.stuckLocations.set(aiPlayer.id, recentLocations);
  }

  /**
   * Generate escape direction away from stuck locations
   */
  public generateEscapeDirection(aiPlayer: Player): Vector3 {
    const stuckLocs = this.stuckLocations.get(aiPlayer.id) || [];
    
    if (stuckLocs.length === 0) {
      // No stuck history, use random direction
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.cos(angle),
        y: 0,
        z: Math.sin(angle),
      };
    }
    
    // Calculate average stuck location
    let avgX = 0;
    let avgZ = 0;
    for (const loc of stuckLocs) {
      avgX += loc.x;
      avgZ += loc.z;
    }
    avgX /= stuckLocs.length;
    avgZ /= stuckLocs.length;
    
    // Move away from average stuck location
    let escapeX = aiPlayer.position.x - avgX;
    let escapeZ = aiPlayer.position.z - avgZ;
    
    // If too close to stuck location, use perpendicular direction
    const distToStuck = Math.sqrt(escapeX * escapeX + escapeZ * escapeZ);
    if (distToStuck < 1.0) {
      // Use perpendicular direction
      const temp = escapeX;
      escapeX = -escapeZ;
      escapeZ = temp;
    }
    
    // Normalize
    const length = Math.sqrt(escapeX * escapeX + escapeZ * escapeZ);
    if (length > 0) {
      escapeX /= length;
      escapeZ /= length;
    }
    
    // Add some randomness to avoid predictable patterns
    const randomAngle = (Math.random() - 0.5) * Math.PI * 0.5; // ±45 degrees
    const cos = Math.cos(randomAngle);
    const sin = Math.sin(randomAngle);
    const rotatedX = escapeX * cos - escapeZ * sin;
    const rotatedZ = escapeX * sin + escapeZ * cos;
    
    return {
      x: rotatedX,
      y: 0,
      z: rotatedZ,
    };
  }

  /**
   * Check if AI is near a stuck location
   */
  public isNearStuckLocation(aiPlayer: Player): boolean {
    const stuckLocs = this.stuckLocations.get(aiPlayer.id) || [];
    const now = Date.now();
    
    for (const loc of stuckLocs) {
      // Only check recent stuck locations (last 5 seconds)
      if (now - loc.time > 5000) continue;
      
      const dx = aiPlayer.position.x - loc.x;
      const dz = aiPlayer.position.z - loc.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // If within 5 units of a stuck location, consider near
      if (distance < 5) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Clear all stuck detection data
   */
  public clear(): void {
    this.lastPositions.clear();
    this.stuckLocations.clear();
    this.unstuckUntil.clear();
  }
}
