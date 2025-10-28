import * as THREE from 'three';
import { Player } from '../../shared/types/game';
import { ObjectPool } from '../utils/object-pool';

/**
 * Particle represents a single particle in the system
 */
interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number; // 0 to 1
  maxLife: number;
  size: number;
  color: THREE.Color;
  active: boolean;
}

/**
 * ParticleSystem manages particle effects for jetpack and dash
 */
export class ParticleSystem {
  private scene: THREE.Scene;
  private jetpackParticles: Particle[] = [];
  private dashParticles: Particle[] = [];
  private jetpackMesh: THREE.Points | null = null;
  private dashMesh: THREE.Points | null = null;
  private readonly maxJetpackParticles = 100;
  private readonly maxDashParticles = 50;
  private updateCounter = 0;
  private readonly updateInterval = 1; // Update every frame (can be increased for performance)

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeParticlePools();
  }

  /**
   * Initialize particle pools
   */
  private initializeParticlePools(): void {
    // Initialize jetpack particles
    for (let i = 0; i < this.maxJetpackParticles; i++) {
      this.jetpackParticles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size: 0.3,
        color: new THREE.Color(0xff6600),
        active: false,
      });
    }

    // Initialize dash particles
    for (let i = 0; i < this.maxDashParticles; i++) {
      this.dashParticles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size: 0.2,
        color: new THREE.Color(0x00ffff),
        active: false,
      });
    }

    // Create particle meshes
    this.createParticleMeshes();
  }

  /**
   * Create Three.js meshes for particles
   */
  private createParticleMeshes(): void {
    // Jetpack particles (fire)
    const jetpackGeometry = new THREE.BufferGeometry();
    const jetpackPositions = new Float32Array(this.maxJetpackParticles * 3);
    const jetpackColors = new Float32Array(this.maxJetpackParticles * 3);
    const jetpackSizes = new Float32Array(this.maxJetpackParticles);

    jetpackGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(jetpackPositions, 3)
    );
    jetpackGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(jetpackColors, 3)
    );
    jetpackGeometry.setAttribute(
      'size',
      new THREE.BufferAttribute(jetpackSizes, 1)
    );

    const jetpackMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.jetpackMesh = new THREE.Points(jetpackGeometry, jetpackMaterial);
    this.scene.add(this.jetpackMesh);

    // Dash particles (trail)
    const dashGeometry = new THREE.BufferGeometry();
    const dashPositions = new Float32Array(this.maxDashParticles * 3);
    const dashColors = new Float32Array(this.maxDashParticles * 3);
    const dashSizes = new Float32Array(this.maxDashParticles);

    dashGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(dashPositions, 3)
    );
    dashGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(dashColors, 3)
    );
    dashGeometry.setAttribute(
      'size',
      new THREE.BufferAttribute(dashSizes, 1)
    );

    const dashMaterial = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.dashMesh = new THREE.Points(dashGeometry, dashMaterial);
    this.scene.add(this.dashMesh);
  }

  /**
   * Emit jetpack particles for a player
   */
  public emitJetpackParticles(player: Player): void {
    if (!player.isJetpacking) return;

    // Emit 2-3 particles per frame
    const particlesToEmit = 3;

    for (let i = 0; i < particlesToEmit; i++) {
      // Find inactive particle
      const particle = this.jetpackParticles.find((p) => !p.active);
      if (!particle) break;

      // Activate particle at player position (below player)
      particle.position.set(
        player.position.x + (Math.random() - 0.5) * 0.5,
        player.position.y - 0.5,
        player.position.z + (Math.random() - 0.5) * 0.5
      );

      // Velocity downward with some randomness
      particle.velocity.set(
        (Math.random() - 0.5) * 2,
        -5 + Math.random() * 2,
        (Math.random() - 0.5) * 2
      );

      particle.life = 1;
      particle.maxLife = 0.5 + Math.random() * 0.3;
      particle.active = true;

      // Color variation (orange to yellow)
      const hue = 0.05 + Math.random() * 0.1; // Orange to yellow
      particle.color.setHSL(hue, 1, 0.5);
    }
  }

  /**
   * Emit dash particles for a player
   */
  public emitDashParticles(player: Player): void {
    if (!player.isDashing) return;

    // Emit 1-2 particles per frame
    const particlesToEmit = 2;

    for (let i = 0; i < particlesToEmit; i++) {
      // Find inactive particle
      const particle = this.dashParticles.find((p) => !p.active);
      if (!particle) break;

      // Activate particle at player position
      particle.position.set(
        player.position.x + (Math.random() - 0.5) * 0.3,
        player.position.y + Math.random() * 1.5,
        player.position.z + (Math.random() - 0.5) * 0.3
      );

      // Velocity opposite to player movement
      particle.velocity.set(
        -player.velocity.x * 0.3 + (Math.random() - 0.5),
        (Math.random() - 0.5) * 0.5,
        -player.velocity.z * 0.3 + (Math.random() - 0.5)
      );

      particle.life = 1;
      particle.maxLife = 0.3 + Math.random() * 0.2;
      particle.active = true;

      // Cyan color
      particle.color.setHex(0x00ffff);
    }
  }

  /**
   * Update all particles
   */
  public update(deltaTime: number, players: Player[]): void {
    this.updateCounter++;

    // Emit particles for active players
    for (const player of players) {
      if (player.isJetpacking) {
        this.emitJetpackParticles(player);
      }
      if (player.isDashing) {
        this.emitDashParticles(player);
      }
    }

    // Update particles every frame
    if (this.updateCounter >= this.updateInterval) {
      // Update jetpack particles
      this.updateParticles(this.jetpackParticles, deltaTime * this.updateInterval);

      // Update dash particles
      this.updateParticles(this.dashParticles, deltaTime * this.updateInterval);

      // Update meshes
      this.updateMeshes();

      this.updateCounter = 0;
    }
  }

  /**
   * Update particle positions and life
   */
  private updateParticles(particles: Particle[], deltaTime: number): void {
    for (const particle of particles) {
      if (!particle.active) continue;

      // Update position
      particle.position.x += particle.velocity.x * deltaTime;
      particle.position.y += particle.velocity.y * deltaTime;
      particle.position.z += particle.velocity.z * deltaTime;

      // Update life
      particle.life -= deltaTime / particle.maxLife;

      // Deactivate if life is over
      if (particle.life <= 0) {
        particle.active = false;
      }
    }
  }

  /**
   * Update particle meshes with current particle data
   */
  private updateMeshes(): void {
    // Update jetpack mesh
    if (this.jetpackMesh) {
      const geometry = this.jetpackMesh.geometry;
      const positions = geometry.attributes.position.array as Float32Array;
      const colors = geometry.attributes.color.array as Float32Array;
      const sizes = geometry.attributes.size.array as Float32Array;

      for (let i = 0; i < this.jetpackParticles.length; i++) {
        const particle = this.jetpackParticles[i];
        const i3 = i * 3;

        if (particle.active) {
          positions[i3] = particle.position.x;
          positions[i3 + 1] = particle.position.y;
          positions[i3 + 2] = particle.position.z;

          colors[i3] = particle.color.r;
          colors[i3 + 1] = particle.color.g;
          colors[i3 + 2] = particle.color.b;

          sizes[i] = particle.size * particle.life;
        } else {
          // Hide inactive particles
          positions[i3] = 0;
          positions[i3 + 1] = -1000;
          positions[i3 + 2] = 0;
          sizes[i] = 0;
        }
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;
    }

    // Update dash mesh
    if (this.dashMesh) {
      const geometry = this.dashMesh.geometry;
      const positions = geometry.attributes.position.array as Float32Array;
      const colors = geometry.attributes.color.array as Float32Array;
      const sizes = geometry.attributes.size.array as Float32Array;

      for (let i = 0; i < this.dashParticles.length; i++) {
        const particle = this.dashParticles[i];
        const i3 = i * 3;

        if (particle.active) {
          positions[i3] = particle.position.x;
          positions[i3 + 1] = particle.position.y;
          positions[i3 + 2] = particle.position.z;

          colors[i3] = particle.color.r;
          colors[i3 + 1] = particle.color.g;
          colors[i3 + 2] = particle.color.b;

          sizes[i] = particle.size * particle.life;
        } else {
          // Hide inactive particles
          positions[i3] = 0;
          positions[i3 + 1] = -1000;
          positions[i3 + 2] = 0;
          sizes[i] = 0;
        }
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;
    }
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    if (this.jetpackMesh) {
      this.scene.remove(this.jetpackMesh);
      this.jetpackMesh.geometry.dispose();
      (this.jetpackMesh.material as THREE.Material).dispose();
    }

    if (this.dashMesh) {
      this.scene.remove(this.dashMesh);
      this.dashMesh.geometry.dispose();
      (this.dashMesh.material as THREE.Material).dispose();
    }
  }
}
