import { Vector3, Rotation } from '../../shared/types/game';

/**
 * State validation utilities for player state updates
 */
export class StateValidator {
  // Position limits (Earth radius + atmosphere)
  private static readonly MIN_POSITION = -10000;
  private static readonly MAX_POSITION = 10000;

  // Velocity limits (m/s)
  private static readonly MAX_VELOCITY = 500;

  // Rotation limits
  private static readonly MIN_YAW = -Math.PI;
  private static readonly MAX_YAW = Math.PI;
  private static readonly MIN_PITCH = -Math.PI / 2;
  private static readonly MAX_PITCH = Math.PI / 2;

  // Fuel limits
  private static readonly MIN_FUEL = 0;
  private static readonly MAX_FUEL = 100;

  // Beacon cooldown limits
  private static readonly MIN_BEACON_COOLDOWN = 0;
  private static readonly MAX_BEACON_COOLDOWN = 30;

  /**
   * Validate and clamp position vector
   */
  static validatePosition(position: Vector3): Vector3 {
    return {
      x: this.clamp(position.x, this.MIN_POSITION, this.MAX_POSITION),
      y: this.clamp(position.y, this.MIN_POSITION, this.MAX_POSITION),
      z: this.clamp(position.z, this.MIN_POSITION, this.MAX_POSITION),
    };
  }

  /**
   * Validate and clamp velocity vector
   */
  static validateVelocity(velocity: Vector3): Vector3 {
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);

    if (speed > this.MAX_VELOCITY) {
      const scale = this.MAX_VELOCITY / speed;
      return {
        x: velocity.x * scale,
        y: velocity.y * scale,
        z: velocity.z * scale,
      };
    }

    return velocity;
  }

  /**
   * Validate and clamp rotation
   */
  static validateRotation(rotation: Rotation): Rotation {
    return {
      yaw: this.clamp(rotation.yaw, this.MIN_YAW, this.MAX_YAW),
      pitch: this.clamp(rotation.pitch, this.MIN_PITCH, this.MAX_PITCH),
    };
  }

  /**
   * Validate and clamp fuel value
   */
  static validateFuel(fuel: number): number {
    return this.clamp(fuel, this.MIN_FUEL, this.MAX_FUEL);
  }

  /**
   * Validate and clamp beacon cooldown
   */
  static validateBeaconCooldown(cooldown: number): number {
    return this.clamp(cooldown, this.MIN_BEACON_COOLDOWN, this.MAX_BEACON_COOLDOWN);
  }

  /**
   * Clamp a value between min and max
   */
  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Check if position is valid (not NaN or Infinity)
   */
  static isValidNumber(value: number): boolean {
    return typeof value === 'number' && isFinite(value);
  }

  /**
   * Check if vector is valid
   */
  static isValidVector(vector: Vector3): boolean {
    return (
      this.isValidNumber(vector.x) &&
      this.isValidNumber(vector.y) &&
      this.isValidNumber(vector.z)
    );
  }

  /**
   * Check if rotation is valid
   */
  static isValidRotation(rotation: Rotation): boolean {
    return this.isValidNumber(rotation.yaw) && this.isValidNumber(rotation.pitch);
  }
}
