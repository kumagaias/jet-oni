import * as THREE from 'three';
import { Player } from '../../shared/types/game';

const DETECTION_RANGE = 50; // 50 units detection range (10x TAG_DISTANCE)
const LOCK_ON_COLOR = 0xff0000; // Red
const LOCK_ON_OPACITY = 0.8;
const LOCK_ON_COOLDOWN = 3000; // 3 seconds in milliseconds (reduced for better gameplay)
const LOCK_ON_DURATION = 3000; // Show lock-on for 3 seconds

/**
 * TargetLockVisual displays lock-on indicators for nearby runners when playing as ONI
 */
export class TargetLockVisual {
  private scene: THREE.Scene;
  private lockIndicators: Map<string, THREE.Group> = new Map();
  private lastLockTime = 0; // Last time a lock-on was triggered
  private currentLockEndTime = 0; // When current lock-on should end
  private lockedTargetIds = new Set<string>(); // Currently locked targets
  private onTargetLockedCallback?: (targetIds: string[]) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Set callback for when targets are locked
   */
  public onTargetLocked(callback: (targetIds: string[]) => void): void {
    this.onTargetLockedCallback = callback;
  }

  /**
   * Update lock-on indicators for nearby runners
   */
  public update(localPlayer: Player, allPlayers: Player[], camera: THREE.Camera): void {
    // Only show lock-on when local player is ONI
    if (!localPlayer.isOni) {
      this.clearAll();
      return;
    }

    const now = Date.now();

    // Check if current lock-on has expired
    if (now > this.currentLockEndTime) {
      this.clearAll();
      this.lockedTargetIds.clear();
    }

    // If lock-on is active, update existing indicators
    if (this.lockedTargetIds.size > 0) {
      this.updateExistingLockOns(allPlayers, camera);
      return;
    }

    // Check if we can trigger a new lock-on (cooldown check)
    if (now - this.lastLockTime < LOCK_ON_COOLDOWN) {
      return; // Still in cooldown
    }

    // Find nearby runners that have clear line of sight
    const nearbyRunners = this.findNearbyRunners(localPlayer, allPlayers);
    
    // If we found runners, trigger lock-on
    if (nearbyRunners.length > 0) {
      this.triggerLockOn(nearbyRunners, now);
    }
  }

  /**
   * Trigger lock-on for nearby runners
   */
  private triggerLockOn(runners: Player[], now: number): void {
    this.lastLockTime = now;
    this.currentLockEndTime = now + LOCK_ON_DURATION;
    this.lockedTargetIds.clear();

    const targetIds: string[] = [];

    // Create indicators for all nearby runners
    for (const runner of runners) {
      this.lockedTargetIds.add(runner.id);
      targetIds.push(runner.id);
      
      const indicator = this.createLockIndicator();
      this.scene.add(indicator);
      this.lockIndicators.set(runner.id, indicator);

      // Set initial position
      indicator.position.set(
        runner.position.x,
        runner.position.y + 3,
        runner.position.z
      );
    }

    // Notify callback
    if (this.onTargetLockedCallback && targetIds.length > 0) {
      this.onTargetLockedCallback(targetIds);
    }
  }

  /**
   * Update existing lock-on indicators
   */
  private updateExistingLockOns(allPlayers: Player[], camera: THREE.Camera): void {
    const localPlayer = allPlayers.find(p => p.isOni);
    if (!localPlayer) return;

    const toRemove: string[] = [];

    for (const [id, indicator] of this.lockIndicators.entries()) {
      // Find the player
      const player = allPlayers.find(p => p.id === id);
      
      if (player) {
        // Check if line of sight is still clear
        const hasLOS = this.hasLineOfSight(localPlayer.position, player.position);
        
        if (!hasLOS) {
          // Line of sight blocked, remove lock-on
          toRemove.push(id);
          continue;
        }

        // Update indicator position (follow the player)
        indicator.position.set(
          player.position.x,
          player.position.y + 3,
          player.position.z
        );

        // Make indicator face the camera (billboard effect)
        indicator.quaternion.copy(camera.quaternion);

        // Animate the indicator
        const userData = indicator.userData;
        if (userData) {
          userData.animationTime += 0.05;
          
          // Rotate outer ring slowly
          if (userData.outerRing) {
            userData.outerRing.rotation.z += 0.02;
          }
          
          // Rotate inner ring in opposite direction
          if (userData.innerRing) {
            userData.innerRing.rotation.z -= 0.03;
            // Pulse effect
            const pulse = Math.sin(userData.animationTime * 2) * 0.1 + 0.9;
            userData.innerRing.scale.set(pulse, pulse, 1);
          }
          
          // Animate scan line
          if (userData.scanLine) {
            userData.scanLine.rotation.z += 0.04;
          }
        }
      } else {
        // Player no longer exists, remove indicator
        toRemove.push(id);
      }
    }

    // Remove indicators that lost line of sight or player no longer exists
    for (const id of toRemove) {
      const indicator = this.lockIndicators.get(id);
      if (indicator) {
        this.scene.remove(indicator);
      }
      this.lockIndicators.delete(id);
      this.lockedTargetIds.delete(id);
    }
  }

  /**
   * Find all runners within detection range and line of sight
   */
  private findNearbyRunners(localPlayer: Player, allPlayers: Player[]): Player[] {
    const nearby: Player[] = [];

    for (const player of allPlayers) {
      // Skip self and other ONI players
      if (player.id === localPlayer.id || player.isOni) {
        continue;
      }

      const distance = this.calculateDistance(localPlayer.position, player.position);
      
      if (distance <= DETECTION_RANGE) {
        // Check line of sight (building occlusion)
        const hasLOS = this.hasLineOfSight(localPlayer.position, player.position);
        
        if (hasLOS) {
          nearby.push(player);
        }
      }
    }

    return nearby;
  }



  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Check if there's a clear line of sight between two positions
   * Returns false if blocked by buildings or walls
   */
  private hasLineOfSight(from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }): boolean {
    // Create a raycaster from ONI to runner at eye height
    // Player position is at ground level, so add eye height (1.7)
    const origin = new THREE.Vector3(from.x, from.y + 1.7, from.z); // Eye level
    const target = new THREE.Vector3(to.x, to.y + 1.7, to.z); // Target eye level
    const direction = new THREE.Vector3().subVectors(target, origin).normalize();
    const distance = origin.distanceTo(target);

    // Add small offset to avoid self-intersection
    const raycaster = new THREE.Raycaster(origin, direction, 1.0, distance - 1.0);

    // Only check against building meshes (large vertical structures)
    const buildingMeshes: THREE.Mesh[] = [];
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // Skip UI elements and player models
        if (obj.renderOrder === 999) return;
        
        // Skip player markers (visual indicators)
        if (obj.name === 'player-marker') return;
        
        // Skip ground plane (usually large and flat)
        if (obj.name === 'ground' || obj.name === 'Ground') return;
        
        // Skip cars (they shouldn't block line of sight for lock-on)
        if (obj.parent?.name?.includes('car') || obj.name?.includes('car')) return;
        
        // Skip pedestrians and other small objects
        if (obj.parent?.name?.includes('pedestrian') || obj.name?.includes('pedestrian')) return;
        
        // Skip ladders and other climbable objects
        if (obj.parent?.name?.includes('ladder') || obj.name?.includes('ladder')) return;
        
        // Get bounding box to check object size
        const bbox = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        
        // Only check buildings (large objects with significant height)
        // Buildings are typically larger than 5x5x5 units
        if (size.x < 5 && size.z < 5) {
          return; // Skip small objects (not buildings)
        }
        
        // Must have significant height to be a building (taller than player eye level)
        // Reduced from 5 to 3 to catch more buildings
        if (size.y < 3) {
          return; // Skip flat objects (roads, ground, etc.)
        }
        
        // Skip if geometry is too large (likely ground or sky)
        const geometry = obj.geometry;
        if (geometry instanceof THREE.PlaneGeometry) {
          const params = geometry.parameters;
          if (params.width > 1000 || params.height > 1000) {
            return; // Skip very large planes (ground)
          }
        }
        if (geometry instanceof THREE.CircleGeometry) {
          const params = geometry.parameters;
          if (params.radius > 500) {
            return; // Skip very large circles (ground)
          }
        }
        
        // Skip if it's a player model (check parent names)
        let parent = obj.parent;
        let isPlayer = false;
        while (parent) {
          if (parent.name && (parent.name.includes('player') || parent.name.includes('Player'))) {
            isPlayer = true;
            break;
          }
          parent = parent.parent;
        }
        if (!isPlayer) {
          buildingMeshes.push(obj);
        }
      }
    });

    // Check for intersections with building meshes only
    const intersects = raycaster.intersectObjects(buildingMeshes, false);

    // If we hit any building, line of sight is blocked
    return intersects.length === 0;
  }

  /**
   * Create a lock-on indicator (fighter jet style)
   */
  private createLockIndicator(): THREE.Group {
    const group = new THREE.Group();
    
    // Set render order to appear on top of buildings
    group.renderOrder = 999;

    // Larger outer rotating ring (facing forward, not down)
    const outerRingGeometry = new THREE.RingGeometry(3.0, 3.3, 64);
    const outerRingMaterial = new THREE.MeshBasicMaterial({
      color: LOCK_ON_COLOR,
      transparent: true,
      opacity: LOCK_ON_OPACITY,
      side: THREE.DoubleSide,
      depthTest: false, // Always render on top
    });
    const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
    outerRing.renderOrder = 999;
    // No rotation - will face camera directly
    group.add(outerRing);

    // Inner pulsing ring (facing forward, not down)
    const innerRingGeometry = new THREE.RingGeometry(2.2, 2.5, 64);
    const innerRingMaterial = new THREE.MeshBasicMaterial({
      color: LOCK_ON_COLOR,
      transparent: true,
      opacity: LOCK_ON_OPACITY * 0.7,
      side: THREE.DoubleSide,
      depthTest: false, // Always render on top
    });
    const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
    innerRing.renderOrder = 999;
    // No rotation - will face camera directly
    group.add(innerRing);

    // Center crosshair
    const lineMaterial = new THREE.LineBasicMaterial({
      color: LOCK_ON_COLOR,
      transparent: true,
      opacity: LOCK_ON_OPACITY,
      linewidth: 2,
      depthTest: false, // Always render on top
    });

    // Horizontal crosshair (longer)
    const hLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2.5, 0, 0),
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(0.5, 0, 0),
      new THREE.Vector3(2.5, 0, 0),
    ]);
    const hLine = new THREE.Line(hLineGeometry, lineMaterial);
    hLine.renderOrder = 999;
    group.add(hLine);

    // Vertical crosshair (longer)
    const vLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -2.5, 0),
      new THREE.Vector3(0, -0.5, 0),
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, 2.5, 0),
    ]);
    const vLine = new THREE.Line(vLineGeometry, lineMaterial);
    vLine.renderOrder = 999;
    group.add(vLine);

    // Large corner brackets (fighter jet style)
    const bracketSize = 1.2;
    const bracketOffset = 3.5;
    const bracketThickness = 0.15;
    
    // Create 4 corner brackets (in XY plane for camera-facing)
    const corners = [
      { x: -bracketOffset, y: -bracketOffset, angle: Math.PI },
      { x: bracketOffset, y: -bracketOffset, angle: -Math.PI / 2 },
      { x: -bracketOffset, y: bracketOffset, angle: Math.PI / 2 },
      { x: bracketOffset, y: bracketOffset, angle: 0 },
    ];
    
    for (const corner of corners) {
      const bracket = this.createFighterBracket(bracketSize, bracketThickness);
      bracket.rotation.z = corner.angle;
      bracket.position.set(corner.x, corner.y, 0);
      group.add(bracket);
    }

    // Add scanning lines (animated effect)
    const scanLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-3, 0, 0),
      new THREE.Vector3(3, 0, 0),
    ]);
    const scanLineMaterial = new THREE.LineBasicMaterial({
      color: LOCK_ON_COLOR,
      transparent: true,
      opacity: LOCK_ON_OPACITY * 0.5,
      depthTest: false, // Always render on top
    });
    const scanLine = new THREE.Line(scanLineGeometry, scanLineMaterial);
    scanLine.renderOrder = 999;
    // No rotation - will face camera directly
    group.add(scanLine);

    // Store references for animation
    group.userData = {
      outerRing,
      innerRing,
      scanLine,
      animationTime: 0,
    };

    return group;
  }

  /**
   * Create a fighter jet style corner bracket (in XY plane for camera-facing)
   */
  private createFighterBracket(size: number, thickness: number): THREE.Group {
    const bracketGroup = new THREE.Group();
    
    const material = new THREE.LineBasicMaterial({
      color: LOCK_ON_COLOR,
      transparent: true,
      opacity: LOCK_ON_OPACITY,
      linewidth: 3,
    });

    // L-shaped bracket in XY plane (facing camera)
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(size, 0, 0),
      new THREE.Vector3(size, 0, 0),
      new THREE.Vector3(size, size, 0),
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const bracket = new THREE.Line(geometry, material);
    bracketGroup.add(bracket);

    // Add inner line for thickness effect
    const innerPoints = [
      new THREE.Vector3(thickness, thickness, 0),
      new THREE.Vector3(size - thickness, thickness, 0),
      new THREE.Vector3(size - thickness, thickness, 0),
      new THREE.Vector3(size - thickness, size - thickness, 0),
    ];
    const innerGeometry = new THREE.BufferGeometry().setFromPoints(innerPoints);
    const innerBracket = new THREE.Line(innerGeometry, material);
    bracketGroup.add(innerBracket);

    return bracketGroup;
  }

  /**
   * Clear all lock-on indicators
   */
  private clearAll(): void {
    for (const indicator of this.lockIndicators.values()) {
      this.scene.remove(indicator);
    }
    this.lockIndicators.clear();
  }

  /**
   * Public method to clear all indicators (called from game loop)
   */
  public clear(): void {
    this.clearAll();
    this.lockedTargetIds.clear();
  }

  /**
   * Reset cooldown (useful when game restarts)
   */
  public resetCooldown(): void {
    this.lastLockTime = 0;
    this.currentLockEndTime = 0;
    this.lockedTargetIds.clear();
    this.clearAll();
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.clearAll();
  }
}
