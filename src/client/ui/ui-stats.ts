import { StatsManager } from '../game/stats-manager';
import { I18n } from '../i18n/i18n';

/**
 * UIStats manages the statistics display screen
 */
export class UIStats {
  private container: HTMLElement | null = null;
  private statsManager: StatsManager;
  private i18n: I18n;
  private onBack: (() => void) | null = null;

  constructor(statsManager: StatsManager, i18n: I18n) {
    this.statsManager = statsManager;
    this.i18n = i18n;
  }

  /**
   * Create stats UI elements
   */
  public create(): void {
    this.container = document.createElement('div');
    this.container.id = 'stats-screen';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      font-family: Arial, sans-serif;
    `;

    document.body.appendChild(this.container);
  }

  /**
   * Show statistics screen
   */
  public show(): void {
    if (!this.container) {
      return;
    }

    const stats = this.statsManager.loadStats();
    const winRate = this.statsManager.getWinRate();
    const averageSurvival = stats.gamesPlayed > 0
      ? stats.totalSurvivalTime / stats.gamesPlayed
      : 0;

    // Clear previous content
    this.container.innerHTML = '';

    // Create stats panel
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: rgba(20, 20, 30, 0.95);
      border: 2px solid #4a90e2;
      border-radius: 10px;
      padding: 30px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 0 20px rgba(74, 144, 226, 0.5);
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = this.i18n.t('stats.title');
    title.style.cssText = `
      color: #4a90e2;
      text-align: center;
      margin: 0 0 30px 0;
      font-size: 32px;
    `;
    panel.appendChild(title);

    // Stats container
    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 15px;
    `;

    // Create stat rows
    this.createStatRow(
      statsContainer,
      this.i18n.t('stats.gamesPlayed'),
      stats.gamesPlayed.toString(),
      '#4a90e2'
    );

    this.createStatRow(
      statsContainer,
      this.i18n.t('stats.wins'),
      stats.wins.toString(),
      '#4caf50'
    );

    this.createStatRow(
      statsContainer,
      this.i18n.t('stats.losses'),
      stats.losses.toString(),
      '#f44336'
    );

    this.createStatRow(
      statsContainer,
      this.i18n.t('stats.winRate'),
      `${winRate.toFixed(1)}%`,
      winRate >= 50 ? '#4caf50' : '#ff9800'
    );

    this.createStatRow(
      statsContainer,
      this.i18n.t('stats.totalSurvivalTime'),
      this.formatTime(stats.totalSurvivalTime),
      '#9c27b0'
    );

    this.createStatRow(
      statsContainer,
      this.i18n.t('stats.longestSurvival'),
      this.formatTime(stats.longestSurvival),
      '#ff9800'
    );

    this.createStatRow(
      statsContainer,
      this.i18n.t('stats.averageSurvival'),
      this.formatTime(averageSurvival),
      '#00bcd4'
    );

    panel.appendChild(statsContainer);

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 10px;
      margin-top: 30px;
    `;

    // Reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = this.i18n.t('stats.reset');
    resetButton.style.cssText = `
      flex: 1;
      padding: 15px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.3s;
    `;
    resetButton.onmouseover = () => {
      resetButton.style.background = '#d32f2f';
    };
    resetButton.onmouseout = () => {
      resetButton.style.background = '#f44336';
    };
    resetButton.onclick = () => {
      if (confirm(this.i18n.t('stats.confirmReset'))) {
        this.statsManager.resetStats();
        this.show(); // Refresh display
      }
    };
    buttonsContainer.appendChild(resetButton);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = this.i18n.t('menu.back');
    backButton.style.cssText = `
      flex: 1;
      padding: 15px;
      background: #4a90e2;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.3s;
    `;
    backButton.onmouseover = () => {
      backButton.style.background = '#357abd';
    };
    backButton.onmouseout = () => {
      backButton.style.background = '#4a90e2';
    };
    backButton.onclick = () => {
      this.hide();
      if (this.onBack) {
        this.onBack();
      }
    };
    buttonsContainer.appendChild(backButton);

    panel.appendChild(buttonsContainer);

    this.container.appendChild(panel);
    this.container.style.display = 'flex';
  }

  /**
   * Create a stat row
   */
  private createStatRow(
    container: HTMLElement,
    label: string,
    value: string,
    color: string
  ): void {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 5px;
      border-left: 4px solid ${color};
    `;

    const labelElement = document.createElement('div');
    labelElement.textContent = label;
    labelElement.style.cssText = `
      color: #ffffff;
      font-size: 16px;
    `;
    row.appendChild(labelElement);

    const valueElement = document.createElement('div');
    valueElement.textContent = value;
    valueElement.style.cssText = `
      color: ${color};
      font-size: 20px;
      font-weight: bold;
    `;
    row.appendChild(valueElement);

    container.appendChild(row);
  }

  /**
   * Hide statistics screen
   */
  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Set back callback
   */
  public setOnBack(callback: () => void): void {
    this.onBack = callback;
  }

  /**
   * Format time in seconds to HH:MM:SS or MM:SS
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Update translations
   */
  public updateTranslations(): void {
    // Stats screen will be regenerated when shown
  }

  /**
   * Destroy stats UI
   */
  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
