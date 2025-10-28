/**
 * ConnectionIndicator - Shows connection status to server
 */

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export class ConnectionIndicator {
  private container: HTMLElement | null = null;
  private status: ConnectionStatus = 'disconnected';

  /**
   * Initialize connection indicator
   */
  public init(): void {
    this.container = document.createElement('div');
    this.container.id = 'connection-indicator';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #333;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(this.container);
    
    this.updateDisplay();
  }

  /**
   * Set connection status
   */
  public setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.updateDisplay();
  }

  /**
   * Get current status
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Update display based on current status
   */
  private updateDisplay(): void {
    if (!this.container) return;

    const statusConfig = this.getStatusConfig(this.status);
    
    this.container.innerHTML = `
      <div style="
        width: 10px;
        height: 10px;
        background: ${statusConfig.color};
        border-radius: 50%;
        box-shadow: 0 0 10px ${statusConfig.color};
        animation: ${statusConfig.animation};
      "></div>
      <span style="color: ${statusConfig.textColor}; font-weight: bold;">
        ${statusConfig.icon} ${statusConfig.text}
      </span>
    `;
    
    this.container.style.borderColor = statusConfig.borderColor;
    
    // Ensure animations are added
    this.ensureAnimations();
  }

  /**
   * Get status configuration
   */
  private getStatusConfig(status: ConnectionStatus): {
    color: string;
    textColor: string;
    borderColor: string;
    text: string;
    icon: string;
    animation: string;
  } {
    switch (status) {
      case 'connecting':
        return {
          color: '#ffa500',
          textColor: '#ffa500',
          borderColor: '#ffa500',
          text: 'CONNECTING',
          icon: '⟳',
          animation: 'pulse 1s infinite, spin 2s linear infinite',
        };
      case 'connected':
        return {
          color: '#0f0',
          textColor: '#0f0',
          borderColor: '#0f0',
          text: 'CONNECTED',
          icon: '✓',
          animation: 'pulse 2s infinite',
        };
      case 'disconnected':
        return {
          color: '#666',
          textColor: '#666',
          borderColor: '#666',
          text: 'DISCONNECTED',
          icon: '✕',
          animation: 'none',
        };
      case 'error':
        return {
          color: '#ff0000',
          textColor: '#ff0000',
          borderColor: '#ff0000',
          text: 'ERROR',
          icon: '⚠',
          animation: 'pulse 0.5s infinite',
        };
    }
  }

  /**
   * Ensure CSS animations are added to the document
   */
  private ensureAnimations(): void {
    if (document.getElementById('connection-indicator-animations')) return;

    const style = document.createElement('style');
    style.id = 'connection-indicator-animations';
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show indicator
   */
  public show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  /**
   * Hide indicator
   */
  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Dispose connection indicator
   */
  public dispose(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    const animations = document.getElementById('connection-indicator-animations');
    if (animations) {
      animations.remove();
    }
  }
}
