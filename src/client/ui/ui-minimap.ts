import { GameState } from '../game/game-state';
import { MAP_SIZE } from '../../shared/constants';

/**
 * UIMinimap displays a minimap showing all player positions
 * (Development mode only)
 */
export class UIMinimap {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private gameState: GameState;
  private isVisible: boolean = false;
  private mapSize: number = 200; // Minimap size in pixels

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /**
   * Create minimap UI elements
   */
  public create(): void {
    // Container
    this.container = document.createElement('div');
    this.container.id = 'minimap';
    this.container.style.cssText = `
      position: fixed;
      top: 120px;
      right: 20px;
      width: ${this.mapSize}px;
      height: ${this.mapSize}px;
      background: rgba(0, 0, 0, 0.7);
      border: 2px solid #4a90e2;
      border-radius: 5px;
      display: none;
      z-index: 900;
      padding: 5px;
    `;

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.mapSize;
    this.canvas.height = this.mapSize;
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
    `;

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      console.error('Failed to get canvas context for minimap');
      return;
    }

    this.container.appendChild(this.canvas);
    document.body.appendChild(this.container);
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
   * Show minimap
   */
  public show(): void {
    this.isVisible = true;
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  /**
   * Hide minimap
   */
  public hide(): void {
    this.isVisible = false;
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Update minimap display
   */
  public update(): void {
    if (!this.isVisible || !this.ctx || !this.canvas) {
      return;
    }

    const ctx = this.ctx;
    const size = this.mapSize;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = size / 4;
    for (let i = 0; i <= 4; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(i * gridSize, 0);
      ctx.lineTo(i * gridSize, size);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, i * gridSize);
      ctx.lineTo(size, i * gridSize);
      ctx.stroke();
    }

    // Draw center marker
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(size / 2 - 2, size / 2 - 2, 4, 4);

    // Get all players
    const players = this.gameState.getAllPlayers();
    const localPlayer = this.gameState.getLocalPlayer();

    // Draw players
    for (const player of players) {
      // Convert world position to minimap position
      const x = ((player.position.x / (MAP_SIZE * 2)) + 0.5) * size;
      const y = ((player.position.z / (MAP_SIZE * 2)) + 0.5) * size;

      // Determine color
      let color: string;
      if (player.id === localPlayer.id) {
        color = '#ffff00'; // Yellow for local player
      } else if (player.isOni) {
        color = '#ff0000'; // Red for ONI
      } else {
        color = '#00ff00'; // Green for runners
      }

      // Draw player dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw player name (small)
      ctx.fillStyle = 'white';
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(player.username.substring(0, 8), x, y - 8);
    }

    // Draw legend
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffff00';
    ctx.fillText('● You', 5, size - 35);
    ctx.fillStyle = '#ff0000';
    ctx.fillText('● ONI', 5, size - 22);
    ctx.fillStyle = '#00ff00';
    ctx.fillText('● Runner', 5, size - 9);
  }

  /**
   * Destroy minimap
   */
  public destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.canvas = null;
    this.ctx = null;
  }
}
