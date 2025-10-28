import { GameResults } from '../game/game-results';
import { I18n } from '../i18n/i18n';

/**
 * UIResults manages the game results screen
 */
export class UIResults {
  private container: HTMLElement | null = null;
  private gameResults: GameResults;
  private i18n: I18n;
  private onBackToMenu: (() => void) | null = null;

  constructor(gameResults: GameResults, i18n: I18n) {
    this.gameResults = gameResults;
    this.i18n = i18n;
  }

  /**
   * Create results UI elements
   */
  public create(): void {
    this.container = document.createElement('div');
    this.container.id = 'results-screen';
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
   * Show results screen
   */
  public show(localPlayerId: string): void {
    if (!this.container) {
      return;
    }

    const sortedPlayers = this.gameResults.getSortedPlayers();
    const winner = this.gameResults.getWinner();
    const escapedPlayers = this.gameResults.getEscapedPlayers();
    const localPlayerStats = this.gameResults.getLocalPlayerStats(localPlayerId);

    // Clear previous content
    this.container.innerHTML = '';

    // Create results panel
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: rgba(20, 20, 30, 0.95);
      border: 2px solid #4a90e2;
      border-radius: 10px;
      padding: 30px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 0 20px rgba(74, 144, 226, 0.5);
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = this.i18n.t('results.title');
    title.style.cssText = `
      color: #4a90e2;
      text-align: center;
      margin: 0 0 20px 0;
      font-size: 32px;
    `;
    panel.appendChild(title);

    // Local player result
    if (localPlayerStats) {
      const localResult = document.createElement('div');
      localResult.style.cssText = `
        background: ${localPlayerStats.survived ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'};
        border: 2px solid ${localPlayerStats.survived ? '#4caf50' : '#f44336'};
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
        text-align: center;
      `;

      const resultText = document.createElement('div');
      resultText.style.cssText = `
        color: ${localPlayerStats.survived ? '#4caf50' : '#f44336'};
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
      `;
      resultText.textContent = localPlayerStats.survived
        ? this.i18n.t('results.escaped')
        : this.i18n.t('results.caught');
      localResult.appendChild(resultText);

      const timeText = document.createElement('div');
      timeText.style.cssText = `
        color: #ffffff;
        font-size: 18px;
      `;
      timeText.textContent = this.i18n.t('results.survivalTime', {
        time: this.formatTime(localPlayerStats.survivedTime),
      });
      localResult.appendChild(timeText);

      const rankText = document.createElement('div');
      rankText.style.cssText = `
        color: #aaaaaa;
        font-size: 16px;
        margin-top: 5px;
      `;
      rankText.textContent = `${this.i18n.t('results.rank')}: ${localPlayerStats.rank}`;
      localResult.appendChild(rankText);

      panel.appendChild(localResult);
    }

    // Player list header
    const listHeader = document.createElement('div');
    listHeader.style.cssText = `
      display: grid;
      grid-template-columns: 50px 1fr 120px 100px;
      gap: 10px;
      padding: 10px;
      border-bottom: 2px solid #4a90e2;
      margin-bottom: 10px;
      color: #4a90e2;
      font-weight: bold;
    `;

    const rankHeader = document.createElement('div');
    rankHeader.textContent = this.i18n.t('results.rank');
    listHeader.appendChild(rankHeader);

    const playerHeader = document.createElement('div');
    playerHeader.textContent = this.i18n.t('results.player');
    listHeader.appendChild(playerHeader);

    const timeHeader = document.createElement('div');
    timeHeader.textContent = this.i18n.t('results.time');
    listHeader.appendChild(timeHeader);

    const statusHeader = document.createElement('div');
    statusHeader.textContent = this.i18n.t('results.status');
    listHeader.appendChild(statusHeader);

    panel.appendChild(listHeader);

    // Player list
    sortedPlayers.forEach((player, index) => {
      const playerRow = document.createElement('div');
      const isWinner = winner && player.id === winner.id;
      const isEscaped = escapedPlayers.some(p => p.id === player.id);
      const isLocalPlayer = player.id === localPlayerId;

      playerRow.style.cssText = `
        display: grid;
        grid-template-columns: 50px 1fr 120px 100px;
        gap: 10px;
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 5px;
        background: ${isLocalPlayer ? 'rgba(74, 144, 226, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
        ${isWinner ? 'border: 2px solid gold;' : ''}
      `;

      // Rank
      const rank = document.createElement('div');
      rank.style.cssText = `
        color: ${isWinner ? 'gold' : '#ffffff'};
        font-weight: ${isWinner ? 'bold' : 'normal'};
        font-size: ${isWinner ? '20px' : '16px'};
      `;
      rank.textContent = `${index + 1}`;
      if (isWinner) {
        rank.textContent += ' 👑';
      }
      playerRow.appendChild(rank);

      // Player name
      const name = document.createElement('div');
      name.style.cssText = `
        color: #ffffff;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      name.textContent = player.username;
      if (player.isAI) {
        name.textContent += ' (AI)';
      }
      playerRow.appendChild(name);

      // Survival time
      const time = document.createElement('div');
      time.style.cssText = `
        color: #aaaaaa;
      `;
      time.textContent = this.formatTime(player.survivedTime);
      playerRow.appendChild(time);

      // Status
      const status = document.createElement('div');
      status.style.cssText = `
        color: ${isEscaped ? '#4caf50' : '#f44336'};
        font-weight: bold;
      `;
      status.textContent = isEscaped
        ? this.i18n.t('results.survived')
        : this.i18n.t('results.tagged');
      playerRow.appendChild(status);

      panel.appendChild(playerRow);
    });

    // Back to menu button
    const backButton = document.createElement('button');
    backButton.textContent = this.i18n.t('results.backToMenu');
    backButton.style.cssText = `
      width: 100%;
      padding: 15px;
      margin-top: 20px;
      background: #4a90e2;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 18px;
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
      if (this.onBackToMenu) {
        this.onBackToMenu();
      }
    };
    panel.appendChild(backButton);

    this.container.appendChild(panel);
    this.container.style.display = 'flex';
  }

  /**
   * Hide results screen
   */
  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Set back to menu callback
   */
  public setOnBackToMenu(callback: () => void): void {
    this.onBackToMenu = callback;
  }

  /**
   * Format time in seconds to MM:SS
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Update translations
   */
  public updateTranslations(): void {
    // Results screen will be regenerated when shown
  }

  /**
   * Destroy results UI
   */
  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
