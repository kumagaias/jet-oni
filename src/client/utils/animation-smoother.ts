import { Vector3 } from '../../shared/types/game';
import { EdgeCaseHandler } from './edge-case-handler';

/**
 * AnimationSmoother provides smooth interpolation for animations
 */
export class AnimationSmoother {
  private targetValue: number;
  private currentValue: number;
  private velocity = 0;
  private smoothTime: number;

  constructor(initialValue = 0, smoothTime = 0.3) {
    this.currentValue = initialValue;
    this.targetValue = initialValue;
    this.smoothTime = smoothTime;
  }

  /**
   * Set target value
   */
  public setTarget(value: number): void {
    this.targetValue = value;
  }

  /**
   * Get current value
   */
  public getValue(): number {
    return this.currentValue;
  }

  /**
   * Update with smooth damping
   */
  public update(deltaTime: number): number {
    this.currentValue = this.smoothDamp(
      this.currentValue,
      this.targetValue,
      deltaTime
    );
    return this.currentValue;
  }

  /**
   * Smooth damp interpolation (similar to Unity's SmoothDamp)
   */
  private smoothDamp(current: number, target: number, deltaTime: number): number {
    const smoothTime = Math.max(0.0001, this.smoothTime);
    const omega = 2 / smoothTime;
    const x = omega * deltaTime;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    
    let change = current - target;
    const originalTo = target;
    
    // Clamp maximum speed
    const maxChange = Infinity;
    change = EdgeCaseHandler.clamp(change, -maxChange, maxChange);
    target = current - change;
    
    const temp = (this.velocity + omega * change) * deltaTime;
    this.velocity = (this.velocity - omega * temp) * exp;
    let output = target + (change + temp) * exp;
    
    // Prevent overshooting
    if ((originalTo - current > 0) === (output > originalTo)) {
      output = originalTo;
      this.velocity = (output - originalTo) / deltaTime;
    }
    
    return output;
  }

  /**
   * Reset to value
   */
  public reset(value: number): void {
    this.currentValue = value;
    this.targetValue = value;
    this.velocity = 0;
  }
}

/**
 * Vector3 animation smoother
 */
export class Vector3Smoother {
  private xSmoother: AnimationSmoother;
  private ySmoother: AnimationSmoother;
  private zSmoother: AnimationSmoother;

  constructor(initialValue: Vector3 = { x: 0, y: 0, z: 0 }, smoothTime = 0.3) {
    this.xSmoother = new AnimationSmoother(initialValue.x, smoothTime);
    this.ySmoother = new AnimationSmoother(initialValue.y, smoothTime);
    this.zSmoother = new AnimationSmoother(initialValue.z, smoothTime);
  }

  /**
   * Set target vector
   */
  public setTarget(target: Vector3): void {
    this.xSmoother.setTarget(target.x);
    this.ySmoother.setTarget(target.y);
    this.zSmoother.setTarget(target.z);
  }

  /**
   * Get current vector
   */
  public getValue(): Vector3 {
    return {
      x: this.xSmoother.getValue(),
      y: this.ySmoother.getValue(),
      z: this.zSmoother.getValue(),
    };
  }

  /**
   * Update with smooth damping
   */
  public update(deltaTime: number): Vector3 {
    return {
      x: this.xSmoother.update(deltaTime),
      y: this.ySmoother.update(deltaTime),
      z: this.zSmoother.update(deltaTime),
    };
  }

  /**
   * Reset to vector
   */
  public reset(value: Vector3): void {
    this.xSmoother.reset(value.x);
    this.ySmoother.reset(value.y);
    this.zSmoother.reset(value.z);
  }
}

/**
 * Spring-based animation smoother
 */
export class SpringSmoother {
  private position: number;
  private velocity: number;
  private target: number;
  private stiffness: number;
  private damping: number;

  constructor(
    initialValue = 0,
    stiffness = 170,
    damping = 26
  ) {
    this.position = initialValue;
    this.velocity = 0;
    this.target = initialValue;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  /**
   * Set target value
   */
  public setTarget(value: number): void {
    this.target = value;
  }

  /**
   * Get current value
   */
  public getValue(): number {
    return this.position;
  }

  /**
   * Update spring physics
   */
  public update(deltaTime: number): number {
    const force = (this.target - this.position) * this.stiffness;
    const dampingForce = this.velocity * this.damping;
    const acceleration = force - dampingForce;
    
    this.velocity += acceleration * deltaTime;
    this.position += this.velocity * deltaTime;
    
    return this.position;
  }

  /**
   * Reset to value
   */
  public reset(value: number): void {
    this.position = value;
    this.velocity = 0;
    this.target = value;
  }

  /**
   * Check if spring is at rest
   */
  public isAtRest(threshold = 0.01): boolean {
    return (
      Math.abs(this.position - this.target) < threshold &&
      Math.abs(this.velocity) < threshold
    );
  }
}
