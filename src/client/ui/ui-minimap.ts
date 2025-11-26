import { GameState } from '../game/game-state';

/**
 * UIMinimap displays a top-down minimap of the game world
 * Toggled with F1 key in dev environment
 */
export class UIMinimap {
  private container: HTMLCanvasElement | null = null;
  private isVisible = false;
  private gameState: GameState;
  private ctx: CanvasRenderingContext2D | null = null;
  private readonly MINIMAP_SIZE = 200; // pixels
  private readonly WORLD_SIZE = 400; // game units
  private readonly SCALE = this.MINIMAP_SIZE / this.WORLD_SIZE;

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.createMinimapCanvas();
    this.setupKeyListener();
  }

  /**
   * Create minimap canvas element
   */
  private createMinimapCanvas(): void {
    this.container = document.createElement('canvas');
    this.container.id = 'minimap-canvas';
    this.container.width = this.MINIMAP_SIZE;
    this.container.height = this.MINIMAP_SIZE;
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: rgba(0, 0, 0, 0.7);
      border: 2px solid #00ff00;
      border-radius: 8px;
      z-index: 1000;
      display: none;
    `;
    document.body.appendChild(this.container);
    this.ctx = this.container.getContext('2d');
  }

  /**
   * Setup F1 key listener to toggle minimap (dev environment only)
   */
  private setupKeyListener(): void {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      // Check if in dev environment
      const url = window.location.href.toLowerCase();
      const isDevEnvironment = url.includes('jet_oni_dev') || 
                               url.includes('localhost') ||
                               url.includes('playtest');
      
      if (event.key === 'F1' && isDevEnvironment) {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Toggle minimap visibility
   */
  public toggle(): void {
    this.isVisible = !this.isVisible;
    if (this.container) {
      this.container.style.display = this.isVisible ? 'block' : 'none';
    }
  }

  /**
   * Update minimap display
   */
  public update(): void {
    if (!this.isVisible || !this.ctx || !this.container) return;

    const ctx = this.ctx;
    const size = this.MINIMAP_SIZE;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, size, size);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 60 * this.SCALE; // 60 units grid
    for (let i = 0; i <= size; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    // Draw center crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    // Draw all players
    const allPlayers = this.gameState.getAllPlayers();
    const localPlayer = this.gameState.getLocalPlayer();

    for (const player of allPlayers) {
      const x = (player.position.x * this.SCALE) + size / 2;
      const z = (player.position.z * this.SCALE) + size / 2;

      // Skip if out of bounds
      if (x < 0 || x > size || z < 0 || z > size) continue;

      // Draw player dot
      ctx.beginPath();
      ctx.arc(x, z, player.id === localPlayer.id ? 5 : 3, 0, Math.PI * 2);
      
      if (player.id === localPlayer.id) {
        // Local player - bright green
        ctx.fillStyle = '#00ff00';
      } else if (player.isOni) {
        // ONI - red
        ctx.fillStyle = '#ff0000';
      } else {
        // Runner - blue
        ctx.fillStyle = '#0088ff';
      }
      
      ctx.fill();

      // Draw player name (for local player only)
      if (player.id === localPlayer.id) {
        ctx.fillStyle = '#00ff00';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', x, z - 8);
      }
    }

    // Draw legend
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00ff00';
    ctx.fillText('YOU', 10, 15);
    ctx.fillStyle = '#ff0000';
    ctx.fillText('ONI', 10, 30);
    ctx.fillStyle = '#0088ff';
    ctx.fillText('RUNNER', 10, 45);
  }

  /**
   * Remove minimap from DOM
   */
  public dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
      this.ctx = null;
    }
  }
}
