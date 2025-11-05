import * as THREE from 'three';
import { Player } from '../../shared/types/game';

/**
 * Particle for jetpack effect
 */
interface JetpackParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

/**
 * JetpackEffect displays particle effects for players using jetpack
 */
export class JetpackEffect {
  private scene: THREE.Scene;
  private particleSystems: Map<string, THREE.Points> = new Map();
  private particles: Map<string, JetpackParticle[]> = new Map();
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Create shared particle material
    this.particleMaterial = new THREE.PointsMaterial({
      color: 0xff6600, // Orange/red flame color
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Create shared geometry
    this.particleGeometry = new THREE.BufferGeometry();
  }

  /**
   * Update jetpack effects for all players
   */
  public update(players: Player[], deltaTime: number): void {
    for (const player of players) {
      if (player.isJetpacking) {
        this.updatePlayerEffect(player, deltaTime);
      } else {
        // Remove effect if player stopped jetpacking
        this.removePlayerEffect(player.id);
      }
    }
  }

  /**
   * Update effect for a single player
   */
  private updatePlayerEffect(player: Player, deltaTime: number): void {
    let playerParticles = this.particles.get(player.id);
    
    if (!playerParticles) {
      playerParticles = [];
      this.particles.set(player.id, playerParticles);
      
      // Create new particle system for player
    }

    // Spawn new particles
    const particlesToSpawn = 3; // Particles per frame
    for (let i = 0; i < particlesToSpawn; i++) {
      const particle: JetpackParticle = {
        position: new THREE.Vector3(
          player.position.x + (Math.random() - 0.5) * 0.5,
          player.position.y - 0.5, // Below player
          player.position.z + (Math.random() - 0.5) * 0.5
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          -5 - Math.random() * 3, // Downward
          (Math.random() - 0.5) * 2
        ),
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
        size: 0.2 + Math.random() * 0.2,
      };
      playerParticles.push(particle);
    }

    // Update existing particles
    for (let i = playerParticles.length - 1; i >= 0; i--) {
      const particle = playerParticles[i];
      if (!particle) continue;

      particle.life += deltaTime;
      
      // Remove dead particles
      if (particle.life >= particle.maxLife) {
        playerParticles.splice(i, 1);
        continue;
      }

      // Update position
      particle.position.x += particle.velocity.x * deltaTime;
      particle.position.y += particle.velocity.y * deltaTime;
      particle.position.z += particle.velocity.z * deltaTime;

      // Apply drag
      particle.velocity.multiplyScalar(0.95);
    }

    // Update or create particle system
    this.updateParticleSystem(player.id, playerParticles);
  }

  /**
   * Update the THREE.Points system for a player
   */
  private updateParticleSystem(playerId: string, playerParticles: JetpackParticle[]): void {
    let particleSystem = this.particleSystems.get(playerId);

    if (playerParticles.length === 0) {
      if (particleSystem) {
        this.scene.remove(particleSystem);
        particleSystem.geometry.dispose();
        this.particleSystems.delete(playerId);
      }
      return;
    }

    // Create positions array
    const positions = new Float32Array(playerParticles.length * 3);
    const colors = new Float32Array(playerParticles.length * 3);
    const sizes = new Float32Array(playerParticles.length);

    for (let i = 0; i < playerParticles.length; i++) {
      const particle = playerParticles[i];
      if (!particle) continue;

      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      // Fade out over lifetime
      const lifeRatio = particle.life / particle.maxLife;
      const alpha = 1 - lifeRatio;

      // Orange to red gradient
      colors[i * 3] = 1.0; // R
      colors[i * 3 + 1] = 0.4 * alpha; // G
      colors[i * 3 + 2] = 0.0; // B

      sizes[i] = particle.size * alpha;
    }

    if (!particleSystem) {
      // Create new particle system
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 0.3,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
        sizeAttenuation: true,
      });

      particleSystem = new THREE.Points(geometry, material);
      this.scene.add(particleSystem);
      this.particleSystems.set(playerId, particleSystem);
    } else {
      // Update existing system
      const geometry = particleSystem.geometry;
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      const posAttr = geometry.attributes.position;
      const colorAttr = geometry.attributes.color;
      const sizeAttr = geometry.attributes.size;
      if (posAttr) posAttr.needsUpdate = true;
      if (colorAttr) colorAttr.needsUpdate = true;
      if (sizeAttr) sizeAttr.needsUpdate = true;
    }
  }

  /**
   * Remove effect for a player
   */
  private removePlayerEffect(playerId: string): void {
    const particleSystem = this.particleSystems.get(playerId);
    if (particleSystem) {
      this.scene.remove(particleSystem);
      particleSystem.geometry.dispose();
      if (Array.isArray(particleSystem.material)) {
        particleSystem.material.forEach(m => m.dispose());
      } else {
        particleSystem.material.dispose();
      }
      this.particleSystems.delete(playerId);
    }
    this.particles.delete(playerId);
  }

  /**
   * Clean up all effects
   */
  public dispose(): void {
    for (const [playerId] of this.particleSystems) {
      this.removePlayerEffect(playerId);
    }
    this.particleMaterial.dispose();
    this.particleGeometry.dispose();
  }
}
