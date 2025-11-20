import { I18n } from '../i18n/i18n';
import type { GameResults as ServerGameResults } from '../../shared/types/api';

/**
 * UIResults manages the game results screen
 */
export class UIResults {
  private container: HTMLElement | null = null;
  private results: ServerGameResults;
  private i18n: I18n;
  private onBackToMenu: (() => void) | null = null;

  constructor(results: ServerGameResults, i18n: I18n) {
    this.results = results;
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

    // Use server-provided team winner
    const runnersWin = this.results.teamWinner === 'runners';
    
    // Players are already sorted by server
    const sortedPlayers = this.results.players;

    // Clear previous content
    this.container.innerHTML = '';

    // Create results panel
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: rgba(20, 20, 30, 0.95);
      border: 2px solid #4a90e2;
      border-radius: 10px;
      padding: 20px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 0 20px rgba(74, 144, 226, 0.5);
      overflow-y: auto;
      overflow-x: hidden;
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = this.i18n.t('results.title');
    title.style.cssText = `
      color: #4a90e2;
      text-align: center;
      margin: 0 0 20px 0;
      font-size: 28px;
    `;
    panel.appendChild(title);
    
    // Victory image
    const victoryImage = document.createElement('img');
    victoryImage.src = runnersWin ? '/runners_win.jpg' : '/oni_win.jpg';
    victoryImage.alt = runnersWin ? 'Runners Win!' : 'ONI Wins!';
    victoryImage.style.cssText = `
      width: 100%;
      max-width: 400px;
      height: auto;
      border-radius: 8px;
      margin: 0 auto 20px auto;
      display: block;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    `;
    panel.appendChild(victoryImage);
    
    // Winner announcement
    const winnerBox = document.createElement('div');
    winnerBox.style.cssText = `
      background: ${runnersWin ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 0, 0, 0.3)'};
      border: 2px solid ${runnersWin ? '#4caf50' : '#ff0000'};
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      text-align: center;
    `;

    const winnerText = document.createElement('div');
    winnerText.style.cssText = `
      color: ${runnersWin ? '#4caf50' : '#ff0000'};
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
    `;
    winnerText.textContent = runnersWin
      ? this.i18n.t('results.runnersWin')
      : this.i18n.t('results.oniWins');
    winnerBox.appendChild(winnerText);

    panel.appendChild(winnerBox);

    // Show all players (already sorted by server)
    const playersToShow = sortedPlayers;
    
    // Create container for player list (no fixed height, will scroll with panel)
    const playerListContainer = document.createElement('div');
    playerListContainer.style.cssText = `
      margin-bottom: 10px;
    `;
    
    // Player list header
    const listHeader = document.createElement('div');
    
    if (runnersWin) {
      // Runners Win: Show only "Survivors" header (no rank)
      listHeader.style.cssText = `
        display: block;
        padding: 10px;
        border-bottom: 2px solid #4a90e2;
        margin-bottom: 10px;
        color: #4a90e2;
        font-weight: bold;
        font-size: 14px;
      `;
      
      const survivorsHeader = document.createElement('div');
      survivorsHeader.textContent = this.i18n.t('results.survivors');
      listHeader.appendChild(survivorsHeader);
    } else {
      // ONI Win: Show "Rank" and "Player" headers
      listHeader.style.cssText = `
        display: grid;
        grid-template-columns: 50px minmax(0, 1fr);
        gap: 10px;
        padding: 10px;
        border-bottom: 2px solid #4a90e2;
        margin-bottom: 10px;
        color: #4a90e2;
        font-weight: bold;
        font-size: 14px;
      `;

      const rankHeader = document.createElement('div');
      rankHeader.textContent = this.i18n.t('results.rank');
      listHeader.appendChild(rankHeader);

      const playerHeader = document.createElement('div');
      playerHeader.textContent = this.i18n.t('results.player');
      listHeader.appendChild(playerHeader);
    }

    playerListContainer.appendChild(listHeader);

    // Player list
    playersToShow.forEach((player, index) => {
      const playerRow = document.createElement('div');
      const isLocalPlayer = player.id === localPlayerId;
      const isTopPlayer = index === 0;

      if (runnersWin) {
        // Runners Win: Simple list without rank
        playerRow.style.cssText = `
          display: block;
          padding: 12px 10px;
          border-radius: 5px;
          margin-bottom: 5px;
          background: ${isLocalPlayer ? 'rgba(74, 144, 226, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
        `;

        // Player name only
        const name = document.createElement('div');
        name.style.cssText = `
          color: #ffffff;
          overflow: hidden;
          word-wrap: break-word;
          word-break: break-word;
          line-height: 1.3;
          font-size: 14px;
          max-width: 100%;
        `;
        // Remove "Player " prefix from human player names, keep "AI_" prefix for AI players
        let displayName = player.username;
        if (!player.isAI && displayName.startsWith('Player ')) {
          displayName = displayName.substring(7); // Remove "Player " (7 characters)
        } else if (!player.isAI && displayName.startsWith('player_')) {
          // If it's a generated ID like "player_1234567890_abc", show a shortened version
          displayName = displayName.substring(7, 20); // Show part of the ID
        }
        
        // Add crown for top player (winner)
        if (isTopPlayer) {
          displayName = '👑 ' + displayName;
        }
        
        // Add "(You)" for local player
        if (isLocalPlayer) {
          displayName += ' (You)';
        }
        
        name.textContent = displayName;
        playerRow.appendChild(name);
      } else {
        // ONI Win: Show rank and player
        playerRow.style.cssText = `
          display: grid;
          grid-template-columns: 50px minmax(0, 1fr);
          gap: 10px;
          padding: 12px 10px;
          border-radius: 5px;
          margin-bottom: 5px;
          background: ${isLocalPlayer ? 'rgba(74, 144, 226, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
          ${isTopPlayer ? 'border: 2px solid gold;' : ''}
          align-items: center;
        `;

        // Rank
        const rank = document.createElement('div');
        rank.style.cssText = `
          color: ${isTopPlayer ? 'gold' : '#ffffff'};
          font-weight: ${isTopPlayer ? 'bold' : 'normal'};
          font-size: ${isTopPlayer ? '20px' : '16px'};
        `;
        rank.textContent = `${index + 1}`;
        if (isTopPlayer) {
          rank.textContent += ' 👑';
        }
        playerRow.appendChild(rank);

        // Player name
        const name = document.createElement('div');
        name.style.cssText = `
          color: #ffffff;
          overflow: hidden;
          word-wrap: break-word;
          word-break: break-word;
          line-height: 1.3;
          font-size: 14px;
          max-width: 100%;
        `;
        // Remove "Player " prefix from human player names, keep "AI_" prefix for AI players
        let displayName = player.username;
        if (!player.isAI && displayName.startsWith('Player ')) {
          displayName = displayName.substring(7); // Remove "Player " (7 characters)
        } else if (!player.isAI && displayName.startsWith('player_')) {
          // If it's a generated ID like "player_1234567890_abc", show a shortened version
          displayName = displayName.substring(7, 20); // Show part of the ID
        }
        
        // Add "(You)" for local player
        if (isLocalPlayer) {
          displayName += ' (You)';
        }
        
        name.textContent = displayName;
        playerRow.appendChild(name);
      }

      playerListContainer.appendChild(playerRow);
    });
    
    // Add player list container to panel
    panel.appendChild(playerListContainer);

    // Back to menu button
    const backButton = document.createElement('button');
    backButton.textContent = this.i18n.t('results.backToMenu');
    backButton.style.cssText = `
      width: 100%;
      padding: 15px;
      margin-top: 10px;
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
      // Prevent multiple clicks
      if (backButton.disabled) {
        return;
      }
      backButton.disabled = true;
      backButton.textContent = 'Loading...';
      
      // Hide results screen first
      this.hide();
      
      // Call callback to return to title screen
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
