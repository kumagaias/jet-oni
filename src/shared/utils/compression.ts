import type { Vector3, Rotation } from '../types/game.js';

/**
 * Compressed player state for network transmission
 * Uses Float32 arrays for efficient serialization
 */
export interface CompressedPlayerState {
  // Position (3 floats)
  p?: Float32Array;
  // Velocity (3 floats)
  v?: Float32Array;
  // Rotation (2 floats: yaw, pitch)
  r?: Float32Array;
  // Fuel (1 float)
  f?: number;
  // Boolean flags packed into a single byte
  flags?: number;
  // Beacon cooldown (1 float)
  bc?: number;
  // Survived time (1 float)
  st?: number;
}

/**
 * Flag bit positions for boolean state
 */
const FLAGS = {
  IS_ONI: 1 << 0, // 0b00000001
  IS_DASHING: 1 << 1, // 0b00000010
  IS_JETPACKING: 1 << 2, // 0b00000100
  IS_ON_SURFACE: 1 << 3, // 0b00001000
  WAS_TAGGED: 1 << 4, // 0b00010000
};

/**
 * Full player state for compression
 */
export interface FullPlayerState {
  position: Vector3;
  velocity: Vector3;
  rotation: Rotation;
  fuel: number;
  isOni: boolean;
  isDashing: boolean;
  isJetpacking: boolean;
  isOnSurface: boolean;
  wasTagged: boolean;
  beaconCooldown?: number;
  survivedTime?: number;
}

/**
 * Compression utility for player state
 * Reduces network payload by using Float32 and delta compression
 */
export class StateCompressor {
  private lastSentState: Map<string, FullPlayerState> = new Map();
  private readonly POSITION_THRESHOLD = 0.01; // 1cm
  private readonly VELOCITY_THRESHOLD = 0.01; // 1cm/s
  private readonly ROTATION_THRESHOLD = 0.01; // ~0.57 degrees
  private readonly FUEL_THRESHOLD = 0.01; // 1%

  /**
   * Compress player state for network transmission
   * Only includes fields that have changed significantly
   * @param playerId - Player ID
   * @param state - Full player state
   * @returns Compressed state or null if no significant changes
   */
  compress(playerId: string, state: FullPlayerState): CompressedPlayerState | null {
    const lastState = this.lastSentState.get(playerId);
    const compressed: CompressedPlayerState = {};
    let hasChanges = false;

    // Check position delta
    if (!lastState || this.hasPositionChanged(lastState.position, state.position)) {
      compressed.p = new Float32Array([state.position.x, state.position.y, state.position.z]);
      hasChanges = true;
    }

    // Check velocity delta
    if (!lastState || this.hasVelocityChanged(lastState.velocity, state.velocity)) {
      compressed.v = new Float32Array([state.velocity.x, state.velocity.y, state.velocity.z]);
      hasChanges = true;
    }

    // Check rotation delta
    if (!lastState || this.hasRotationChanged(lastState.rotation, state.rotation)) {
      compressed.r = new Float32Array([state.rotation.yaw, state.rotation.pitch]);
      hasChanges = true;
    }

    // Check fuel delta
    if (!lastState || Math.abs(lastState.fuel - state.fuel) > this.FUEL_THRESHOLD) {
      compressed.f = state.fuel;
      hasChanges = true;
    }

    // Check boolean flags
    const currentFlags = this.packFlags(state);
    const lastFlags = lastState ? this.packFlags(lastState) : 0;
    if (currentFlags !== lastFlags) {
      compressed.flags = currentFlags;
      hasChanges = true;
    }

    // Always include beacon cooldown and survived time if present
    if (state.beaconCooldown !== undefined) {
      compressed.bc = state.beaconCooldown;
      hasChanges = true;
    }

    if (state.survivedTime !== undefined) {
      compressed.st = state.survivedTime;
      hasChanges = true;
    }

    // If no significant changes, return null to skip transmission
    if (!hasChanges) {
      return null;
    }

    // Update last sent state
    this.lastSentState.set(playerId, { ...state });

    return compressed;
  }

  /**
   * Decompress player state from network transmission
   * @param compressed - Compressed state
   * @param previousState - Previous full state (for delta decompression)
   * @returns Full player state
   */
  decompress(compressed: CompressedPlayerState, previousState?: FullPlayerState): FullPlayerState {
    const state: FullPlayerState = previousState
      ? { ...previousState }
      : {
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { yaw: 0, pitch: 0 },
          fuel: 100,
          isOni: false,
          isDashing: false,
          isJetpacking: false,
          isOnSurface: true,
          wasTagged: false,
        };

    // Decompress position
    if (compressed.p) {
      state.position = {
        x: compressed.p[0],
        y: compressed.p[1],
        z: compressed.p[2],
      };
    }

    // Decompress velocity
    if (compressed.v) {
      state.velocity = {
        x: compressed.v[0],
        y: compressed.v[1],
        z: compressed.v[2],
      };
    }

    // Decompress rotation
    if (compressed.r) {
      state.rotation = {
        yaw: compressed.r[0],
        pitch: compressed.r[1],
      };
    }

    // Decompress fuel
    if (compressed.f !== undefined) {
      state.fuel = compressed.f;
    }

    // Decompress flags
    if (compressed.flags !== undefined) {
      const flags = this.unpackFlags(compressed.flags);
      state.isOni = flags.isOni;
      state.isDashing = flags.isDashing;
      state.isJetpacking = flags.isJetpacking;
      state.isOnSurface = flags.isOnSurface;
      state.wasTagged = flags.wasTagged;
    }

    // Decompress optional fields
    if (compressed.bc !== undefined) {
      state.beaconCooldown = compressed.bc;
    }

    if (compressed.st !== undefined) {
      state.survivedTime = compressed.st;
    }

    return state;
  }

  /**
   * Pack boolean flags into a single byte
   */
  private packFlags(state: FullPlayerState): number {
    let flags = 0;
    if (state.isOni) flags |= FLAGS.IS_ONI;
    if (state.isDashing) flags |= FLAGS.IS_DASHING;
    if (state.isJetpacking) flags |= FLAGS.IS_JETPACKING;
    if (state.isOnSurface) flags |= FLAGS.IS_ON_SURFACE;
    if (state.wasTagged) flags |= FLAGS.WAS_TAGGED;
    return flags;
  }

  /**
   * Unpack boolean flags from a single byte
   */
  private unpackFlags(flags: number): {
    isOni: boolean;
    isDashing: boolean;
    isJetpacking: boolean;
    isOnSurface: boolean;
    wasTagged: boolean;
  } {
    return {
      isOni: (flags & FLAGS.IS_ONI) !== 0,
      isDashing: (flags & FLAGS.IS_DASHING) !== 0,
      isJetpacking: (flags & FLAGS.IS_JETPACKING) !== 0,
      isOnSurface: (flags & FLAGS.IS_ON_SURFACE) !== 0,
      wasTagged: (flags & FLAGS.WAS_TAGGED) !== 0,
    };
  }

  /**
   * Check if position has changed significantly
   */
  private hasPositionChanged(a: Vector3, b: Vector3): boolean {
    return (
      Math.abs(a.x - b.x) > this.POSITION_THRESHOLD ||
      Math.abs(a.y - b.y) > this.POSITION_THRESHOLD ||
      Math.abs(a.z - b.z) > this.POSITION_THRESHOLD
    );
  }

  /**
   * Check if velocity has changed significantly
   */
  private hasVelocityChanged(a: Vector3, b: Vector3): boolean {
    return (
      Math.abs(a.x - b.x) > this.VELOCITY_THRESHOLD ||
      Math.abs(a.y - b.y) > this.VELOCITY_THRESHOLD ||
      Math.abs(a.z - b.z) > this.VELOCITY_THRESHOLD
    );
  }

  /**
   * Check if rotation has changed significantly
   */
  private hasRotationChanged(a: Rotation, b: Rotation): boolean {
    return (
      Math.abs(a.yaw - b.yaw) > this.ROTATION_THRESHOLD ||
      Math.abs(a.pitch - b.pitch) > this.ROTATION_THRESHOLD
    );
  }

  /**
   * Reset compression state for a player
   * @param playerId - Player ID
   */
  reset(playerId: string): void {
    this.lastSentState.delete(playerId);
  }

  /**
   * Clear all compression state
   */
  clear(): void {
    this.lastSentState.clear();
  }

  /**
   * Get estimated size of compressed state in bytes
   * @param compressed - Compressed state
   * @returns Estimated size in bytes
   */
  static getCompressedSize(compressed: CompressedPlayerState): number {
    let size = 0;
    if (compressed.p) size += 12; // 3 * 4 bytes
    if (compressed.v) size += 12; // 3 * 4 bytes
    if (compressed.r) size += 8; // 2 * 4 bytes
    if (compressed.f !== undefined) size += 4; // 4 bytes
    if (compressed.flags !== undefined) size += 1; // 1 byte
    if (compressed.bc !== undefined) size += 4; // 4 bytes
    if (compressed.st !== undefined) size += 4; // 4 bytes
    return size;
  }
}
