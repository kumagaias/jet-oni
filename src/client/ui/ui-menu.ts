/**
 * UIMenu - Title screen and menu system with prototype styling
 */

import { UIManager } from './ui-manager';
import { I18n } from '../i18n/i18n';

export class UIMenu {
  private uiManager: UIManager;
  private i18n: I18n;
  private username: string;

  constructor(uiManager: UIManager, i18n: I18n, username: string) {
    this.uiManager = uiManager;
    this.i18n = i18n;
    this.username = username;
  }

  /**
   * Show title screen
   */
  public showTitleScreen(): void {
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
          color: #00ff00;
          font-size: 36px;
          margin-bottom: 10px;
          font-weight: bold;
          letter-spacing: 2px;
        ">JetOni [PROTOTYPE]</h1>
        
        <p style="
          color: #888;
          font-size: 12px;
          margin-bottom: 20px;
          border-bottom: 1px solid #333;
          padding-bottom: 10px;
        ">v0.1.0-alpha | User: ${this.username}</p>
        
        <div style="margin-bottom: 20px;">
          <p style="color: #aaa; font-size: 11px; margin-bottom: 5px;">LANGUAGE:</p>
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
            border: 1px solid #00ff00;
            background: #003300;
            color: #00ff00;
            font-weight: bold;
          ">▶ CREATE GAME</button>
          
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
          ">▶ JOIN GAME</button>
          
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
          ">▶ STATISTICS</button>
        </div>
        
        <div style="
          background: #111;
          border: 1px solid #333;
          padding: 15px;
          border-radius: 4px;
          text-align: left;
        ">
          <p style="color: #00ff00; font-size: 12px; margin-bottom: 10px;">CONTROLS:</p>
          <p style="color: #aaa; font-size: 11px; margin: 3px 0;">→ WASD: Move</p>
          <p style="color: #aaa; font-size: 11px; margin: 3px 0;">→ Mouse: Click & drag to look</p>
          <p style="color: #aaa; font-size: 11px; margin: 3px 0;">→ Space: Jump / Jetpack</p>
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
      this.updateLanguageButtons();
    });
    
    jpButton?.addEventListener('click', () => {
      this.i18n.setLanguage('jp');
      this.updateLanguageButtons();
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
      enButton.style.backgroundColor = currentLang === 'en' ? '#00ff00' : '#222';
      enButton.style.color = currentLang === 'en' ? '#000' : '#aaa';
      enButton.style.border = currentLang === 'en' ? '1px solid #00ff00' : '1px solid #666';
      enButton.style.fontWeight = currentLang === 'en' ? 'bold' : 'normal';
    }
    
    if (jpButton) {
      jpButton.style.backgroundColor = currentLang === 'jp' ? '#00ff00' : '#222';
      jpButton.style.color = currentLang === 'jp' ? '#000' : '#aaa';
      jpButton.style.border = currentLang === 'jp' ? '1px solid #00ff00' : '1px solid #666';
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
          color: #00ff00;
          font-size: 24px;
          margin-bottom: 20px;
          font-weight: bold;
        ">CREATE GAME</h2>
        
        <div style="
          background: #111;
          border: 1px solid #333;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 15px;
        ">
          <div style="margin-bottom: 15px;">
            <p style="color: #aaa; font-size: 11px; margin-bottom: 5px;">PLAYERS:</p>
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
            <p style="color: #aaa; font-size: 11px; margin-bottom: 5px;">DURATION:</p>
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
                ">${min} min</button>
              `).join('')}
            </div>
          </div>
          
          <div style="margin-bottom: 15px;">
            <p style="color: #aaa; font-size: 11px; margin-bottom: 5px;">ROUNDS:</p>
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
          border: 1px solid #00ff00;
          background: #003300;
          color: #00ff00;
          font-weight: bold;
        ">START GAME</button>
        
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
        ">← BACK</button>
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
            button.style.backgroundColor = '#00ff00';
            button.style.color = '#000';
            button.style.border = '1px solid #00ff00';
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
    
    // Start game button
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      console.log('Starting game with options:', selectedOptions);
      // TODO: Implement game start logic
      this.uiManager.hideOverlay();
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
  public showJoinGameScreen(): void {
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
          color: #00ff00;
          font-size: 24px;
          margin-bottom: 20px;
          font-weight: bold;
        ">JOIN GAME</h2>
        
        <div style="
          background: #111;
          border: 1px solid #333;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          max-height: 300px;
          overflow-y: auto;
        ">
          <p style="color: #666; font-size: 12px; text-align: center; padding: 20px;">
            No active games found.<br>
            Create a new game to start playing!
          </p>
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
        ">← BACK</button>
      </div>
    `;
    
    document.getElementById('btn-back')?.addEventListener('click', () => {
      this.showTitleScreen();
    });
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
          color: #00ff00;
          font-size: 24px;
          margin-bottom: 20px;
          font-weight: bold;
        ">STATISTICS</h2>
        
        <div style="
          background: #111;
          border: 1px solid #333;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 15px;
        ">
          <div style="margin-bottom: 10px;">
            <p style="color: #aaa; font-size: 11px;">GAMES PLAYED:</p>
            <p style="color: #00ff00; font-size: 18px; font-weight: bold;">${stats.gamesPlayed}</p>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <div style="flex: 1;">
              <p style="color: #aaa; font-size: 11px;">WINS:</p>
              <p style="color: #00ff00; font-size: 16px; font-weight: bold;">${stats.wins}</p>
            </div>
            <div style="flex: 1;">
              <p style="color: #aaa; font-size: 11px;">LOSSES:</p>
              <p style="color: #ff0000; font-size: 16px; font-weight: bold;">${stats.losses}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 10px;">
            <p style="color: #aaa; font-size: 11px;">WIN RATE:</p>
            <p style="color: #00ff00; font-size: 18px; font-weight: bold;">${stats.winRate}%</p>
          </div>
          
          <div style="border-top: 1px solid #333; padding-top: 10px; margin-top: 10px;">
            <p style="color: #aaa; font-size: 11px;">TOTAL SURVIVAL TIME:</p>
            <p style="color: #00ff00; font-size: 16px; font-weight: bold;">${stats.totalSurvivalTime}s</p>
          </div>
          
          <div style="margin-top: 10px;">
            <p style="color: #aaa; font-size: 11px;">LONGEST SURVIVAL:</p>
            <p style="color: #00ff00; font-size: 16px; font-weight: bold;">${stats.longestSurvival}s</p>
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
        ">RESET STATISTICS</button>
        
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
        ">← BACK</button>
      </div>
    `;
    
    document.getElementById('btn-reset-stats')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all statistics?')) {
        console.log('Resetting statistics...');
        this.showStatsScreen(); // Refresh
      }
    });
    
    document.getElementById('btn-back')?.addEventListener('click', () => {
      this.showTitleScreen();
    });
  }
}
