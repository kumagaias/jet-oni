/**
 * UIMenu - Title screen and menu system with prototype styling
 */

import { UIManager } from './ui-manager';
import { I18n } from '../i18n/i18n';

export class UIMenu {
  private uiManager: UIManager;
  private i18n: I18n;
  private username: string;
  private gameEngine: any; // GameEngine instance

  constructor(uiManager: UIManager, i18n: I18n, username: string, gameEngine?: any) {
    this.uiManager = uiManager;
    this.i18n = i18n;
    this.username = username;
    this.gameEngine = gameEngine;
  }

  /**
   * Set game engine reference
   */
  public setGameEngine(gameEngine: any): void {
    this.gameEngine = gameEngine;
  }

  /**
   * Start the game (called when user clicks start)
   */
  public startGame(): void {
    this.uiManager.hideOverlay();
    
    // Resume game engine
    if (this.gameEngine) {
      this.gameEngine.resume();
    }
    
    // Dispatch custom event to notify game start
    window.dispatchEvent(new CustomEvent('gameStart'));
    
    // Show debug info when game starts
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
      debugInfo.style.display = 'block';
    }
  }

  /**
   * Show title screen
   */
  public showTitleScreen(): void {
    // Pause game engine when showing menu
    if (this.gameEngine) {
      this.gameEngine.pause();
    }
    
    const overlay = this.uiManager.getOverlay();
    
    overlay.innerHTML = `
      <div style="
        background: rgba(0, 0, 0, 0.85);
        border: 2px solid #666;
        border-radius: 8px;
        padding: 30px;
        max-width: 500px;
        font-family: monospace;
      ">
        <h1 style="
          color: #ff8800;
          font-size: 36px;
          margin-bottom: 10px;
          font-weight: bold;
          letter-spacing: 2px;
        ">${this.i18n.t('menu.title')} [PROTOTYPE]</h1>
        
        <p style="
          color: #888;
          font-size: 12px;
          margin-bottom: 20px;
          border-bottom: 1px solid #333;
          padding-bottom: 10px;
        ">v0.1.0-alpha | User: ${this.username}</p>
        
        <div style="margin-bottom: 20px;">
          <p style="color: #aaa; font-size: 11px; margin-bottom: 5px;">${this.i18n.t('menu.languageSelect').toUpperCase()}:</p>
          <button id="lang-en" style="
            padding: 8px 16px;
            margin: 3px;
            font-size: 14px;
            cursor: pointer;
            font-family: monospace;
            border: 1px solid #666;
            background: #222;
            color: #aaa;
          ">EN</button>
          <button id="lang-jp" style="
            padding: 8px 16px;
            margin: 3px;
            font-size: 14px;
            cursor: pointer;
            font-family: monospace;
            border: 1px solid #666;
            background: #222;
            color: #aaa;
          ">JP</button>
        </div>
        
        <div style="
          background: #111;
          border: 1px solid #333;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 15px;
        ">
          <button id="btn-create-game" style="
            width: 100%;
            padding: 12px;
            margin: 5px 0;
            font-size: 14px;
            cursor: pointer;
            font-family: monospace;
            border: 1px solid #ff8800;
            background: #331a00;
            color: #ff8800;
            font-weight: bold;
          ">▶ ${this.i18n.t('menu.createGame').toUpperCase()}</button>
          
          <button id="btn-join-game" style="
            width: 100%;
            padding: 12px;
            margin: 5px 0;
            font-size: 14px;
            cursor: pointer;
            font-family: monospace;
            border: 1px solid #666;
            background: #222;
            color: #aaa;
          ">▶ ${this.i18n.t('menu.joinGame').toUpperCase()}</button>
          
          <button id="btn-stats" style="
            width: 100%;
            padding: 12px;
            margin: 5px 0;
            font-size: 14px;
            cursor: pointer;
            font-family: monospace;
            border: 1px solid #666;
            background: #222;
            color: #aaa;
          ">▶ ${this.i18n.t('menu.statistics').toUpperCase()}</button>
        </div>
        
        <div style="
          background: #111;
          border: 1px solid #333;
          padding: 15px;
          border-radius: 4px;
          text-align: left;
        ">
          <p style="color: #ff8800; font-size: 12px; margin-bottom: 10px;">${this.i18n.t('controls.movement').toUpperCase()}:</p>
          <p style="color: #aaa; font-size: 11px; margin: 3px 0;">→ ${this.i18n.t('controls.wasd')}</p>
          <p style="color: #aaa; font-size: 11px; margin: 3px 0;">→ ${this.i18n.t('controls.mouse')}</p>
          <p style="color: #aaa; font-size: 11px; margin: 3px 0;">→ ${this.i18n.t('controls.space')}</p>
        </div>
        
        <p style="
          color: #666;
          font-size: 10px;
          margin-top: 15px;
          font-style: italic;
        ">* Minimal viable prototype - More features coming soon</p>
      </div>
    `;
    
    // Setup event listeners
    this.setupTitleScreenListeners();
  }

  /**
   * Setup title screen event listeners
   */
  private setupTitleScreenListeners(): void {
    // Language buttons
    const enButton = document.getElementById('lang-en');
    const jpButton = document.getElementById('lang-jp');
    
    enButton?.addEventListener('click', () => {
      this.i18n.setLanguage('en');
      this.showTitleScreen(); // Redraw with new language
    });
    
    jpButton?.addEventListener('click', () => {
      this.i18n.setLanguage('jp');
      this.showTitleScreen(); // Redraw with new language
    });
    
    this.updateLanguageButtons();
    
    // Menu buttons
    document.getElementById('btn-create-game')?.addEventListener('click', () => {
      this.showCreateGameScreen();
    });
    
    document.getElementById('btn-join-game')?.addEventListener('click', () => {
      this.showJoinGameScreen();
    });
    
    document.getElementById('btn-stats')?.addEventListener('click', () => {
      this.showStatsScreen();
    });
  }

  /**
   * Update language button styles
   */
  private updateLanguageButtons(): void {
    const currentLang = this.i18n.getLanguage();
    const enButton = document.getElementById('lang-en') as HTMLButtonElement;
    const jpButton = document.getElementById('lang-jp') as HTMLButtonElement;
    
    if (enButton) {
      enButton.style.backgroundColor = currentLang === 'en' ? '#ff8800' : '#222';
      enButton.style.color = currentLang === 'en' ? '#000' : '#aaa';
      enButton.style.border = currentLang === 'en' ? '1px solid #ff8800' : '1px solid #666';
      enButton.style.fontWeight = currentLang === 'en' ? 'bold' : 'normal';
    }
    
    if (jpButton) {
      jpButton.style.backgroundColor = currentLang === 'jp' ? '#ff8800' : '#222';
      jpButton.style.color = currentLang === 'jp' ? '#000' : '#aaa';
      jpButton.style.border = currentLang === 'jp' ? '1px solid #ff8800' : '1px solid #666';
      jpButton.style.fontWeight = currentLang === 'jp' ? 'bold' : 'normal';
    }
  }

  /**
   * Show create game screen
   */
  public showCreateGameScreen(): void {
    const overlay = this.uiManager.getOverlay();
    
    overlay.innerHTML = `
      <div style="
        background: rgba(0, 0, 0, 0.85);
        border: 2px solid #666;
        border-radius: 8px;
        padding: 30px;
        max-width: 500px;
        font-family: monospace;
      ">
        <h2 style="
          color: #ff8800;
          font-size: 24px;
          margin-bottom: 20px;
          font-weight: bold;
        ">${this.i18n.t('settings.title')}</h2>
        
        <div style="
          background: #111;
          border: 1px solid #333;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 15px;
        ">
          <div style="margin-bottom: 15px;">
            <p style="color: #aaa; font-size: 11px; margin-bottom: 5px;">${this.i18n.t('settings.players').toUpperCase()}:</p>
            <div id="player-options">
              ${[4, 6, 8, 10, 15, 20].map(num => `
                <button class="option-btn" data-option="players" data-value="${num}" style="
                  padding: 8px 16px;
                  margin: 3px;
                  font-size: 12px;
                  cursor: pointer;
                  font-family: monospace;
                  border: 1px solid #666;
                  background: #222;
                  color: #aaa;
                ">${num}</button>
              `).join('')}
            </div>
          </div>
          
          <div style="margin-bottom: 15px;">
            <p style="color: #aaa; font-size: 11px; margin-bottom: 5px;">${this.i18n.t('settings.duration').toUpperCase()}:</p>
            <div id="duration-options">
              ${[3, 5].map(min => `
                <button class="option-btn" data-option="duration" data-value="${min}" style="
                  padding: 8px 16px;
                  margin: 3px;
                  font-size: 12px;
                  cursor: pointer;
                  font-family: monospace;
                  border: 1px solid #666;
                  background: #222;
                  color: #aaa;
                ">${this.i18n.t('settings.minutes', { value: min })}</button>
              `).join('')}
            </div>
          </div>
          
          <div style="margin-bottom: 15px;">
            <p style="color: #aaa; font-size: 11px; margin-bottom: 5px;">${this.i18n.t('settings.rounds').toUpperCase()}:</p>
            <div id="rounds-options">
              ${[1, 3, 5].map(num => `
                <button class="option-btn" data-option="rounds" data-value="${num}" style="
                  padding: 8px 16px;
                  margin: 3px;
                  font-size: 12px;
                  cursor: pointer;
                  font-family: monospace;
                  border: 1px solid #666;
                  background: #222;
                  color: #aaa;
                ">${num}</button>
              `).join('')}
            </div>
          </div>
        </div>
        
        <button id="btn-start-game" style="
          width: 100%;
          padding: 12px;
          margin: 5px 0;
          font-size: 14px;
          cursor: pointer;
          font-family: monospace;
          border: 1px solid #ff8800;
          background: #331a00;
          color: #ff8800;
          font-weight: bold;
        ">${this.i18n.t('settings.confirm').toUpperCase()}</button>
        
        <button id="btn-back" style="
          width: 100%;
          padding: 12px;
          margin: 5px 0;
          font-size: 14px;
          cursor: pointer;
          font-family: monospace;
          border: 1px solid #666;
          background: #222;
          color: #aaa;
        ">← ${this.i18n.t('menu.back').toUpperCase()}</button>
      </div>
    `;
    
    this.setupCreateGameListeners();
  }

  /**
   * Setup create game screen listeners
   */
  private setupCreateGameListeners(): void {
    const selectedOptions = {
      players: 4,
      duration: 3,
      rounds: 1,
    };
    
    // Option buttons
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const option = target.dataset.option as keyof typeof selectedOptions;
        const value = parseInt(target.dataset.value || '0');
        
        selectedOptions[option] = value;
        
        // Update button styles
        document.querySelectorAll(`[data-option="${option}"]`).forEach(b => {
          const button = b as HTMLButtonElement;
          if (button.dataset.value === value.toString()) {
            button.style.backgroundColor = '#ff8800';
            button.style.color = '#000';
            button.style.border = '1px solid #ff8800';
            button.style.fontWeight = 'bold';
          } else {
            button.style.backgroundColor = '#222';
            button.style.color = '#aaa';
            button.style.border = '1px solid #666';
            button.style.fontWeight = 'normal';
          }
        });
      });
    });
    
    // Start game button (actually goes to lobby)
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      console.log('Creating game with options:', selectedOptions);
      // Dispatch event to show lobby
      window.dispatchEvent(new CustomEvent('showLobby', {
        detail: {
          currentPlayers: 1,
          maxPlayers: selectedOptions.players,
          isHost: true
        }
      }));
    });
    
    // Back button
    document.getElementById('btn-back')?.addEventListener('click', () => {
      this.showTitleScreen();
    });
    
    // Set default selections
    document.querySelector('[data-option="players"][data-value="4"]')?.dispatchEvent(new Event('click'));
    document.querySelector('[data-option="duration"][data-value="3"]')?.dispatchEvent(new Event('click'));
    document.querySelector('[data-option="rounds"][data-value="1"]')?.dispatchEvent(new Event('click'));
  }

  /**
   * Show join game screen
   */
  public showJoinGameScreen(games?: Array<{
    id: string;
    hostName: string;
    currentPlayers: number;
    maxPlayers: number;
    duration: number;
    rounds: number;
    isFull: boolean;
  }>): void {
    const overlay = this.uiManager.getOverlay();
    
    const gameListHTML = games && games.length > 0
      ? games.map(game => `
          <div style="
            background: #222;
            border: 1px solid ${game.isFull ? '#666' : '#ff8800'};
            padding: 12px;
            margin-bottom: 10px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <div style="flex: 1;">
              <p style="color: #ff8800; font-size: 14px; font-weight: bold; margin-bottom: 5px;">
                ${game.hostName}'s Game
              </p>
              <p style="color: #aaa; font-size: 11px; margin: 2px 0;">
                ${this.i18n.t('gameList.players', { current: game.currentPlayers, max: game.maxPlayers })} | 
                ${this.i18n.t('gameList.duration', { minutes: game.duration })} | 
                ${this.i18n.t('gameList.rounds', { count: game.rounds })}
              </p>
            </div>
            <button 
              class="join-game-btn" 
              data-game-id="${game.id}"
              ${game.isFull ? 'disabled' : ''}
              style="
                padding: 8px 16px;
                font-size: 12px;
                cursor: ${game.isFull ? 'not-allowed' : 'pointer'};
                font-family: monospace;
                border: 1px solid ${game.isFull ? '#666' : '#0f0'};
                background: ${game.isFull ? '#333' : '#003300'};
                color: ${game.isFull ? '#666' : '#0f0'};
                font-weight: bold;
                opacity: ${game.isFull ? '0.5' : '1'};
              ">
              ${game.isFull ? this.i18n.t('gameList.full').toUpperCase() : this.i18n.t('gameList.join').toUpperCase()}
            </button>
          </div>
        `).join('')
      : `<p style="color: #666; font-size: 12px; text-align: center; padding: 20px;">
          ${this.i18n.t('gameList.noGames')}
        </p>`;
    
    overlay.innerHTML = `
      <div style="
        background: rgba(0, 0, 0, 0.85);
        border: 2px solid #666;
        border-radius: 8px;
        padding: 30px;
        max-width: 500px;
        font-family: monospace;
      ">
        <h2 style="
          color: #ff8800;
          font-size: 24px;
          margin-bottom: 20px;
          font-weight: bold;
        ">${this.i18n.t('gameList.title')}</h2>
        
        <div style="
          background: #111;
          border: 1px solid #333;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          max-height: 300px;
          overflow-y: auto;
        ">
          ${gameListHTML}
        </div>
        
        <button id="btn-back" style="
          width: 100%;
          padding: 12px;
          margin: 5px 0;
          font-size: 14px;
          cursor: pointer;
          font-family: monospace;
          border: 1px solid #666;
          background: #222;
          color: #aaa;
        ">← ${this.i18n.t('menu.back').toUpperCase()}</button>
      </div>
    `;
    
    // Setup join button listeners
    document.querySelectorAll('.join-game-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const gameId = target.dataset.gameId;
        if (gameId) {
          console.log('Joining game:', gameId);
          // TODO: Implement join game logic
          this.uiManager.hideOverlay();
        }
      });
    });
    
    document.getElementById('btn-back')?.addEventListener('click', () => {
      this.showTitleScreen();
    });
  }

  /**
   * Show lobby screen
   */
  public showLobbyScreen(currentPlayers: number, maxPlayers: number, isHost: boolean): void {
    // Resume game engine so players can walk around
    if (this.gameEngine) {
      this.gameEngine.resume();
    }
    
    const overlay = this.uiManager.getOverlay();
    
    overlay.innerHTML = `
      <div style="
        background: rgba(0, 0, 0, 0.85);
        border: 2px solid #666;
        border-radius: 8px;
        padding: 30px;
        max-width: 500px;
        font-family: monospace;
      ">
        <h2 style="
          color: #ff8800;
          font-size: 24px;
          margin-bottom: 20px;
          font-weight: bold;
        ">${this.i18n.t('lobby.title')}</h2>
        
        <div style="
          background: #111;
          border: 1px solid #333;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          text-align: center;
        ">
          <p style="color: #aaa; font-size: 14px; margin-bottom: 10px;">
            ${this.i18n.t('lobby.waiting')}
          </p>
          
          <p style="color: #ff8800; font-size: 24px; font-weight: bold; margin: 20px 0;">
            ${this.i18n.t('lobby.players', { current: currentPlayers, max: maxPlayers })}
          </p>
          
          ${isHost ? `
            <p style="color: #0f0; font-size: 16px; margin-top: 20px; animation: pulse 1.5s infinite;">
              ${this.i18n.t('lobby.pressSpace')}
            </p>
          ` : `
            <p style="color: #aaa; font-size: 14px; margin-top: 20px;">
              ${this.i18n.t('lobby.ready')}
            </p>
          `}
          
          ${currentPlayers < maxPlayers ? `
            <p style="color: #666; font-size: 12px; margin-top: 15px; font-style: italic;">
              ${this.i18n.t('lobby.addingAI')}
            </p>
          ` : ''}
        </div>
        
        <button id="btn-back" style="
          width: 100%;
          padding: 12px;
          margin: 5px 0;
          font-size: 14px;
          cursor: pointer;
          font-family: monospace;
          border: 1px solid #666;
          background: #222;
          color: #aaa;
        ">← ${this.i18n.t('menu.back').toUpperCase()}</button>
      </div>
      
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      </style>
    `;
    
    document.getElementById('btn-back')?.addEventListener('click', () => {
      this.showTitleScreen();
    });
    
    // Listen for SPACE key to start game (host only)
    if (isHost) {
      const spaceKeyHandler = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
          e.preventDefault();
          console.log('Host pressed SPACE - starting game');
          this.startGame();
          window.removeEventListener('keydown', spaceKeyHandler);
        }
      };
      window.addEventListener('keydown', spaceKeyHandler);
    }
  }

  /**
   * Show statistics screen
   */
  public showStatsScreen(): void {
    const overlay = this.uiManager.getOverlay();
    
    // Mock stats data
    const stats = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalSurvivalTime: 0,
      longestSurvival: 0,
    };
    
    overlay.innerHTML = `
      <div style="
        background: rgba(0, 0, 0, 0.85);
        border: 2px solid #666;
        border-radius: 8px;
        padding: 30px;
        max-width: 500px;
        font-family: monospace;
      ">
        <h2 style="
          color: #ff8800;
          font-size: 24px;
          margin-bottom: 20px;
          font-weight: bold;
        ">${this.i18n.t('stats.title')}</h2>
        
        <div style="
          background: #111;
          border: 1px solid #333;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 15px;
        ">
          <div style="margin-bottom: 10px;">
            <p style="color: #aaa; font-size: 11px;">${this.i18n.t('stats.gamesPlayed').toUpperCase()}:</p>
            <p style="color: #ff8800; font-size: 18px; font-weight: bold;">${stats.gamesPlayed}</p>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <div style="flex: 1;">
              <p style="color: #aaa; font-size: 11px;">${this.i18n.t('stats.wins').toUpperCase()}:</p>
              <p style="color: #ff8800; font-size: 16px; font-weight: bold;">${stats.wins}</p>
            </div>
            <div style="flex: 1;">
              <p style="color: #aaa; font-size: 11px;">${this.i18n.t('stats.losses').toUpperCase()}:</p>
              <p style="color: #ff0000; font-size: 16px; font-weight: bold;">${stats.losses}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 10px;">
            <p style="color: #aaa; font-size: 11px;">${this.i18n.t('stats.winRate').toUpperCase()}:</p>
            <p style="color: #ff8800; font-size: 18px; font-weight: bold;">${stats.winRate}%</p>
          </div>
          
          <div style="border-top: 1px solid #333; padding-top: 10px; margin-top: 10px;">
            <p style="color: #aaa; font-size: 11px;">${this.i18n.t('stats.totalSurvivalTime').toUpperCase()}:</p>
            <p style="color: #ff8800; font-size: 16px; font-weight: bold;">${stats.totalSurvivalTime}s</p>
          </div>
          
          <div style="margin-top: 10px;">
            <p style="color: #aaa; font-size: 11px;">${this.i18n.t('stats.longestSurvival').toUpperCase()}:</p>
            <p style="color: #ff8800; font-size: 16px; font-weight: bold;">${stats.longestSurvival}s</p>
          </div>
        </div>
        
        <button id="btn-reset-stats" style="
          width: 100%;
          padding: 12px;
          margin: 5px 0;
          font-size: 14px;
          cursor: pointer;
          font-family: monospace;
          border: 1px solid #ff0000;
          background: #330000;
          color: #ff0000;
        ">${this.i18n.t('stats.reset').toUpperCase()}</button>
        
        <button id="btn-back" style="
          width: 100%;
          padding: 12px;
          margin: 5px 0;
          font-size: 14px;
          cursor: pointer;
          font-family: monospace;
          border: 1px solid #666;
          background: #222;
          color: #aaa;
        ">← ${this.i18n.t('menu.back').toUpperCase()}</button>
      </div>
    `;
    
    document.getElementById('btn-reset-stats')?.addEventListener('click', () => {
      if (confirm(this.i18n.t('stats.confirmReset'))) {
        console.log('Resetting statistics...');
        this.showStatsScreen(); // Refresh
      }
    });
    
    document.getElementById('btn-back')?.addEventListener('click', () => {
      this.showTitleScreen();
    });
  }
}
