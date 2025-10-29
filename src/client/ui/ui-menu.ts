/**
 * UIMenu - Title screen and menu system with prototype styling
 */

import { UIManager } from './ui-manager';
import { I18n } from '../i18n/i18n';
import { GameAPIClient } from '../api/game-api-client.js';
import { LobbyManager } from '../lobby/lobby-manager.js';
import { ToastNotification } from './toast-notification.js';
import type { GameConfig } from '../../shared/types/game.js';

export class UIMenu {
  private uiManager: UIManager;
  private i18n: I18n;
  private username: string;
  private gameEngine: { pause: () => void; resume: () => void } | null = null;
  private gameApiClient: GameAPIClient;
  private lobbyManager: LobbyManager | null = null;
  private currentGameId: string | null = null;
  private currentPlayerId: string | null = null;
  private toast: ToastNotification;

  constructor(
    uiManager: UIManager, 
    i18n: I18n, 
    username: string, 
    gameApiClient: GameAPIClient,
    gameEngine?: { pause: () => void; resume: () => void }
  ) {
    this.uiManager = uiManager;
    this.i18n = i18n;
    this.username = username;
    this.gameApiClient = gameApiClient;
    this.gameEngine = gameEngine || null;
    
    // Initialize toast notification
    this.toast = new ToastNotification(i18n);
    this.toast.init();
  }

  /**
   * Set game engine reference
   */
  public setGameEngine(gameEngine: { pause: () => void; resume: () => void }): void {
    this.gameEngine = gameEngine;
  }

  /**
   * Show error message as toast
   */
  private showErrorMessage(message: string): void {
    this.toast.error(message, 3000);
  }

  /**
   * Show success message as toast
   */
  private showSuccessMessage(message: string): void {
    this.toast.success(message, 3000);
  }

  /**
   * Show info message as toast
   */
  private showInfoMessage(message: string): void {
    this.toast.info(message, 3000);
  }

  /**
   * Setup lobby event handlers
   */
  private setupLobbyEventHandlers(): void {
    if (!this.lobbyManager) return;
    
    // Handle player joined
    this.lobbyManager.on('playerJoined', (data) => {
      console.log('Player joined:', data);
      this.updateLobbyDisplay();
    });
    
    // Handle player left
    this.lobbyManager.on('playerLeft', (data) => {
      console.log('Player left:', data);
      this.updateLobbyDisplay();
    });
    
    // Handle countdown started
    this.lobbyManager.on('countdownStarted', () => {
      console.log('Countdown started');
      this.updateLobbyDisplay();
    });
    
    // Handle game starting
    this.lobbyManager.on('gameStarting', () => {
      console.log('Game starting');
      this.startGame();
    });
  }

  /**
   * Update lobby display with current state
   */
  private updateLobbyDisplay(): void {
    if (!this.lobbyManager) return;
    
    const playerCountElement = document.getElementById('lobby-player-count');
    const playerListElement = document.getElementById('lobby-player-list');
    const countdownDisplay = document.getElementById('countdown-display');
    const countdownNumber = document.getElementById('countdown-number');
    const waitingMessage = document.getElementById('waiting-message');
    
    // Update player count
    if (playerCountElement) {
      playerCountElement.textContent = `${this.lobbyManager.getPlayerCount()} / ${this.lobbyManager.getMaxPlayers()}`;
    }
    
    // Update player list
    if (playerListElement) {
      const players = this.lobbyManager.getPlayers();
      const maxPlayers = this.lobbyManager.getMaxPlayers();
      const emptySlots = maxPlayers - players.length;
      
      // Create list items for actual players
      const playerItems = players.map((player, index) => {
        const isCurrentPlayer = player.id === this.currentPlayerId;
        const isPlayerHost = index === 0; // First player is host
        
        return `
          <div class="player-list-item" style="
            background: ${isCurrentPlayer ? 'linear-gradient(135deg, #331a00 0%, #442200 100%)' : 'linear-gradient(135deg, #1a1a1a 0%, #222 100%)'};
            border: 2px solid ${isCurrentPlayer ? '#ff8800' : '#333'};
            padding: 10px 14px;
            margin: 6px 0;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s ease;
            box-shadow: ${isCurrentPlayer ? '0 0 10px rgba(255, 136, 0, 0.3)' : 'none'};
          ">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="
                width: 8px;
                height: 8px;
                background: #0f0;
                border-radius: 50%;
                display: inline-block;
                box-shadow: 0 0 8px rgba(0, 255, 0, 0.6);
                animation: pulse 2s infinite;
              "></span>
              <span style="
                color: ${isCurrentPlayer ? '#ff8800' : '#aaa'};
                font-size: 13px;
                font-weight: ${isCurrentPlayer ? 'bold' : 'normal'};
              ">
                ${player.username}${isCurrentPlayer ? ' (You)' : ''}
              </span>
            </div>
            ${isPlayerHost ? `
              <span style="
                background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                color: #000;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
              ">👑 HOST</span>
            ` : ''}
          </div>
        `;
      });
      
      // Create list items for empty slots (shown as AI players)
      const emptySlotItems = Array.from({ length: emptySlots }, (_, index) => {
        return `
          <div class="player-list-item" style="
            background: linear-gradient(135deg, #0a0a0a 0%, #151515 100%);
            border: 2px solid #222;
            padding: 10px 14px;
            margin: 6px 0;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s ease;
            opacity: 0.6;
          ">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="
                width: 8px;
                height: 8px;
                background: #666;
                border-radius: 50%;
                display: inline-block;
              "></span>
              <span style="
                color: #666;
                font-size: 13px;
                font-style: italic;
              ">
                AI Player ${players.length + index + 1}
              </span>
            </div>
            <span style="
              background: #222;
              color: #666;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
            ">🤖 AI</span>
          </div>
        `;
      });
      
      playerListElement.innerHTML = [...playerItems, ...emptySlotItems].join('');
    }
    
    // Show/hide countdown
    if (this.lobbyManager.isCountdownActive()) {
      if (countdownDisplay && countdownNumber && waitingMessage) {
        countdownDisplay.style.display = 'block';
        waitingMessage.style.display = 'none';
        countdownNumber.textContent = this.lobbyManager.getCountdownRemaining().toString();
      }
    } else {
      if (countdownDisplay && waitingMessage) {
        countdownDisplay.style.display = 'none';
        waitingMessage.style.display = 'block';
      }
    }
  }

  /**
   * Start the game (called when user clicks start)
   */
  public startGame(): void {
    this.uiManager.hideOverlay();
    
    // Show canvas when game starts
    const canvas = document.getElementById('bg') as HTMLCanvasElement;
    if (canvas) {
      canvas.style.display = 'block';
    }
    
    // Resume game engine
    if (this.gameEngine) {
      this.gameEngine.resume();
    }
    
    // Get game config from lobby manager
    let config: GameConfig | undefined;
    if (this.lobbyManager) {
      const gameState = this.lobbyManager.getGameState();
      if (gameState) {
        config = gameState.config;
      }
    }
    
    // Dispatch custom event to notify game start with config
    window.dispatchEvent(new CustomEvent('gameStart', { 
      detail: { 
        config,
        gameId: this.currentGameId 
      } 
    }));
  }

  /**
   * Show title screen
   */
  public showTitleScreen(): void {
    // Pause game engine when showing menu
    if (this.gameEngine) {
      this.gameEngine.pause();
    }
    
    // Hide canvas on title screen
    const canvas = document.getElementById('bg') as HTMLCanvasElement;
    if (canvas) {
      canvas.style.display = 'none';
    }
    
    const overlay = this.uiManager.getOverlay();
    
    overlay.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: 600px;
        font-family: monospace;
      ">
        <h1 style="
          color: #ff8800;
          font-size: 48px;
          margin-bottom: 40px;
          font-weight: bold;
          letter-spacing: 3px;
          text-align: center;
          text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.8);
        ">${this.i18n.t('menu.title')}</h1>
        
        <div style="margin-bottom: 30px; text-align: center;">
          <button id="lang-en" style="
            padding: 10px 20px;
            margin: 5px;
            font-size: 16px;
            cursor: pointer;
            font-family: monospace;
            border: 2px solid #666;
            background: #222;
            color: #aaa;
            border-radius: 4px;
          ">EN</button>
          <button id="lang-jp" style="
            padding: 10px 20px;
            margin: 5px;
            font-size: 16px;
            cursor: pointer;
            font-family: monospace;
            border: 2px solid #666;
            background: #222;
            color: #aaa;
            border-radius: 4px;
          ">JP</button>
        </div>
        
        <button id="btn-create-game" style="
          width: 100%;
          padding: 20px;
          margin: 10px 0;
          font-size: 20px;
          cursor: pointer;
          font-family: monospace;
          border: 3px solid #ff8800;
          background: #331a00;
          color: #ff8800;
          font-weight: bold;
          border-radius: 8px;
          transition: transform 0.1s;
        ">▶ ${this.i18n.t('menu.createGame').toUpperCase()}</button>
        
        <button id="btn-join-game" style="
          width: 100%;
          padding: 18px;
          margin: 10px 0;
          font-size: 18px;
          cursor: pointer;
          font-family: monospace;
          border: 3px solid #666;
          background: #222;
          color: #aaa;
          border-radius: 8px;
          font-weight: bold;
          transition: transform 0.1s;
          ">▶ ${this.i18n.t('menu.joinGame').toUpperCase()}</button>
        
        <button id="btn-stats" style="
          width: 100%;
          padding: 18px;
          margin: 10px 0;
          font-size: 18px;
          cursor: pointer;
          font-family: monospace;
          border: 3px solid #666;
          background: #222;
          color: #aaa;
          border-radius: 8px;
          font-weight: bold;
          transition: transform 0.1s;
        ">▶ ${this.i18n.t('menu.statistics').toUpperCase()}</button>
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
      void this.showJoinGameScreen();
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
    // Hide canvas on settings screen
    const canvas = document.getElementById('bg') as HTMLCanvasElement;
    if (canvas) {
      canvas.style.display = 'none';
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
    
    // Start game button - create game via API
    document.getElementById('btn-start-game')?.addEventListener('click', async () => {
      const startButton = document.getElementById('btn-start-game') as HTMLButtonElement;
      if (!startButton) return;
      
      // Disable button and show loading
      startButton.disabled = true;
      startButton.textContent = this.i18n.t('common.loading');
      
      try {
        // Create game config
        const config: GameConfig = {
          totalPlayers: selectedOptions.players,
          roundDuration: selectedOptions.duration * 60, // Convert minutes to seconds
          rounds: selectedOptions.rounds,
        };
        
        // Call API to create game
        const response = await this.gameApiClient.createGame(config);
        
        if (response.success && response.gameId) {
          // Store game ID and player ID (host is first player)
          this.currentGameId = response.gameId;
          this.currentPlayerId = this.username; // Use username as player ID for now
          
          // Initialize lobby manager
          this.lobbyManager = new LobbyManager({
            gameApiClient: this.gameApiClient,
          });
          
          await this.lobbyManager.initialize(response.gameId, this.currentPlayerId, true);
          
          // Set up lobby event handlers
          this.setupLobbyEventHandlers();
          
          // Show lobby screen
          this.showLobbyScreenWithManager();
        } else {
          // Show error message
          this.showErrorMessage(response.error || this.i18n.t('error.unknown'));
          startButton.disabled = false;
          startButton.textContent = this.i18n.t('settings.confirm').toUpperCase();
        }
      } catch (error) {
        console.error('Failed to create game:', error);
        this.showErrorMessage(this.i18n.t('error.connectionFailed'));
        startButton.disabled = false;
        startButton.textContent = this.i18n.t('settings.confirm').toUpperCase();
      }
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
  public async showJoinGameScreen(): Promise<void> {
    // Hide canvas on join game screen
    const canvas = document.getElementById('bg') as HTMLCanvasElement;
    if (canvas) {
      canvas.style.display = 'none';
    }
    
    const overlay = this.uiManager.getOverlay();
    
    // Show loading state
    overlay.innerHTML = `
      <div style="
        background: rgba(0, 0, 0, 0.85);
        border: 2px solid #666;
        border-radius: 8px;
        padding: 30px;
        max-width: 500px;
        font-family: monospace;
        text-align: center;
      ">
        <h2 style="
          color: #ff8800;
          font-size: 24px;
          margin-bottom: 20px;
          font-weight: bold;
        ">${this.i18n.t('gameList.title')}</h2>
        <p style="color: #aaa; font-size: 14px;">${this.i18n.t('common.loading')}</p>
      </div>
    `;
    
    try {
      // Fetch game list from API
      const response = await this.gameApiClient.listGames();
      
      if (!response.success || !response.games) {
        this.showErrorMessage(response.error || this.i18n.t('error.unknown'));
        this.showTitleScreen();
        return;
      }
      
      // Convert API response to display format
      const games = response.games
        .filter(game => game.status === 'lobby') // Only show lobby games
        .map(game => ({
          id: game.gameId,
          hostName: game.hostUsername,
          currentPlayers: game.currentPlayers,
          maxPlayers: game.totalPlayers,
          duration: Math.floor(game.roundDuration / 60), // Convert seconds to minutes
          rounds: game.rounds,
          isFull: game.currentPlayers >= game.totalPlayers,
        }));
      
      this.renderJoinGameScreen(games);
    } catch (error) {
      console.error('Failed to fetch game list:', error);
      this.showErrorMessage(this.i18n.t('error.connectionFailed'));
      this.showTitleScreen();
    }
  }

  /**
   * Create a game card HTML element
   */
  private createGameCard(game: {
    id: string;
    hostName: string;
    currentPlayers: number;
    maxPlayers: number;
    duration: number;
    rounds: number;
    isFull: boolean;
  }): string {
    const playerPercentage = (game.currentPlayers / game.maxPlayers) * 100;
    const statusColor = game.isFull ? '#666' : playerPercentage > 75 ? '#ff8800' : '#0f0';
    
    return `
      <div class="game-card" style="
        background: linear-gradient(135deg, #1a1a1a 0%, #222 100%);
        border: 2px solid ${statusColor};
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      ">
        <!-- Host info -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="
              background: #ff8800;
              color: #000;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
            ">👑 HOST</span>
            <span style="color: #ff8800; font-size: 16px; font-weight: bold;">
              ${game.hostName}
            </span>
          </div>
          <span style="
            background: ${game.isFull ? '#666' : 'rgba(0, 255, 0, 0.2)'};
            color: ${game.isFull ? '#999' : '#0f0'};
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
          ">
            ${game.isFull ? '● FULL' : '● OPEN'}
          </span>
        </div>
        
        <!-- Game info grid -->
        <div style="
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 12px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        ">
          <div style="text-align: center;">
            <p style="color: #666; font-size: 10px; margin-bottom: 4px;">PLAYERS</p>
            <p style="color: ${statusColor}; font-size: 18px; font-weight: bold;">
              ${game.currentPlayers}/${game.maxPlayers}
            </p>
          </div>
          <div style="text-align: center;">
            <p style="color: #666; font-size: 10px; margin-bottom: 4px;">TIME</p>
            <p style="color: #aaa; font-size: 18px; font-weight: bold;">
              ${game.duration}m
            </p>
          </div>
          <div style="text-align: center;">
            <p style="color: #666; font-size: 10px; margin-bottom: 4px;">ROUNDS</p>
            <p style="color: #aaa; font-size: 18px; font-weight: bold;">
              ${game.rounds}
            </p>
          </div>
        </div>
        
        <!-- Player progress bar -->
        <div style="
          width: 100%;
          height: 6px;
          background: #333;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 12px;
        ">
          <div style="
            width: ${playerPercentage}%;
            height: 100%;
            background: ${statusColor};
            transition: width 0.3s ease;
          "></div>
        </div>
        
        <!-- Join button -->
        <button 
          class="join-game-btn" 
          data-game-id="${game.id}"
          ${game.isFull ? 'disabled' : ''}
          style="
            width: 100%;
            padding: 12px;
            font-size: 14px;
            cursor: ${game.isFull ? 'not-allowed' : 'pointer'};
            font-family: monospace;
            border: 2px solid ${game.isFull ? '#666' : '#0f0'};
            background: ${game.isFull ? '#333' : 'linear-gradient(135deg, #003300 0%, #005500 100%)'};
            color: ${game.isFull ? '#666' : '#0f0'};
            font-weight: bold;
            border-radius: 6px;
            opacity: ${game.isFull ? '0.5' : '1'};
            transition: all 0.2s ease;
            text-transform: uppercase;
          ">
          ${game.isFull ? '🔒 ' + this.i18n.t('gameList.full') : '▶ ' + this.i18n.t('gameList.join')}
        </button>
      </div>
    `;
  }

  /**
   * Render join game screen with game list
   */
  private renderJoinGameScreen(games: Array<{
    id: string;
    hostName: string;
    currentPlayers: number;
    maxPlayers: number;
    duration: number;
    rounds: number;
    isFull: boolean;
  }>): void {
    const overlay = this.uiManager.getOverlay();
    
    const gameListHTML = games.length > 0
      ? games.map(game => this.createGameCard(game)).join('')
      : `<p style="color: #666; font-size: 12px; text-align: center; padding: 20px;">
          ${this.i18n.t('gameList.noGames')}
        </p>`;
    
    overlay.innerHTML = `
      <style>
        .game-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(255, 136, 0, 0.3);
        }
        
        .join-game-btn:not(:disabled):hover {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
        }
        
        .join-game-btn:not(:disabled):active {
          transform: scale(0.98);
        }
      </style>
      
      <div style="
        background: rgba(0, 0, 0, 0.85);
        border: 2px solid #666;
        border-radius: 8px;
        padding: 30px;
        max-width: 600px;
        font-family: monospace;
      ">
        <h2 style="
          color: #ff8800;
          font-size: 24px;
          margin-bottom: 20px;
          font-weight: bold;
        ">${this.i18n.t('gameList.title')}</h2>
        
        <div id="game-list-container" style="
          background: #111;
          border: 1px solid #333;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          max-height: 400px;
          overflow-y: auto;
        ">
          ${gameListHTML}
        </div>
        
        <div style="display: flex; gap: 10px;">
          <button id="btn-refresh" style="
            flex: 1;
            padding: 12px;
            font-size: 14px;
            cursor: pointer;
            font-family: monospace;
            border: 1px solid #ff8800;
            background: #331a00;
            color: #ff8800;
            border-radius: 4px;
          ">🔄 ${this.i18n.t('error.retry').toUpperCase()}</button>
          
          <button id="btn-back" style="
            flex: 1;
            padding: 12px;
            font-size: 14px;
            cursor: pointer;
            font-family: monospace;
            border: 1px solid #666;
            background: #222;
            color: #aaa;
            border-radius: 4px;
          ">← ${this.i18n.t('menu.back').toUpperCase()}</button>
        </div>
      </div>
    `;
    
    // Setup join button listeners
    document.querySelectorAll('.join-game-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.target as HTMLButtonElement;
        const gameId = target.dataset.gameId;
        if (gameId && !target.disabled) {
          await this.handleJoinGame(gameId);
        }
      });
    });
    
    // Refresh button
    document.getElementById('btn-refresh')?.addEventListener('click', () => {
      void this.showJoinGameScreen();
    });
    
    // Back button
    document.getElementById('btn-back')?.addEventListener('click', () => {
      this.showTitleScreen();
    });
  }

  /**
   * Handle joining a game
   */
  private async handleJoinGame(gameId: string): Promise<void> {
    try {
      // Call API to join game
      const response = await this.gameApiClient.joinGame(gameId, this.username);
      
      if (response.success && response.playerId && response.gameState) {
        // Store game ID and player ID
        this.currentGameId = gameId;
        this.currentPlayerId = response.playerId;
        
        // Initialize lobby manager
        this.lobbyManager = new LobbyManager({
          gameApiClient: this.gameApiClient,
        });
        
        await this.lobbyManager.initialize(gameId, response.playerId, false);
        
        // Set up lobby event handlers
        this.setupLobbyEventHandlers();
        
        // Show lobby screen
        this.showLobbyScreenWithManager();
      } else {
        // Show error message
        this.showErrorMessage(response.error || this.i18n.t('error.unknown'));
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      this.showErrorMessage(this.i18n.t('error.connectionFailed'));
    }
  }

  /**
   * Show lobby screen with LobbyManager integration
   */
  private showLobbyScreenWithManager(): void {
    if (!this.lobbyManager) return;
    
    const currentPlayers = this.lobbyManager.getPlayerCount();
    const maxPlayers = this.lobbyManager.getMaxPlayers();
    const isHost = this.lobbyManager.isCurrentPlayerHost();
    
    this.showLobbyScreen(currentPlayers, maxPlayers, isHost);
    
    // Start periodic updates
    const updateInterval = setInterval(() => {
      if (!this.lobbyManager) {
        clearInterval(updateInterval);
        return;
      }
      this.updateLobbyDisplay();
    }, 100);
  }

  /**
   * Show lobby screen
   */
  public showLobbyScreen(currentPlayers: number, maxPlayers: number, isHost: boolean): void {
    // Show canvas in lobby so players can walk around
    const canvas = document.getElementById('bg') as HTMLCanvasElement;
    if (canvas) {
      canvas.style.display = 'block';
    }
    
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
        padding: 20px;
        max-width: 400px;
        font-family: monospace;
      ">
        <h2 style="
          color: #ff8800;
          font-size: 24px;
          margin-bottom: 20px;
          font-weight: bold;
          text-align: center;
        ">${this.i18n.t('lobby.title')}</h2>
        
        <div style="
          background: #111;
          border: 2px solid #ff8800;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 15px;
          text-align: center;
        ">
          <p id="lobby-player-count" style="color: #ff8800; font-size: 36px; font-weight: bold; margin: 10px 0;">
            ${currentPlayers} / ${maxPlayers}
          </p>
          
          <p style="color: #aaa; font-size: 14px; margin-bottom: 15px;">
            Players
          </p>
          
          <div id="lobby-player-list" style="
            max-height: 200px;
            overflow-y: auto;
            margin: 15px 0;
            text-align: left;
            padding: 5px;
          ">
            <!-- Player list will be populated here -->
          </div>
          
          <style>
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            
            .player-list-item:hover {
              transform: scale(1.02);
              box-shadow: 0 2px 8px rgba(255, 136, 0, 0.2);
            }
            
            #lobby-player-list::-webkit-scrollbar {
              width: 6px;
            }
            
            #lobby-player-list::-webkit-scrollbar-track {
              background: #111;
              border-radius: 3px;
            }
            
            #lobby-player-list::-webkit-scrollbar-thumb {
              background: #ff8800;
              border-radius: 3px;
            }
            
            #lobby-player-list::-webkit-scrollbar-thumb:hover {
              background: #ffa500;
            }
          </style>
          
          <div id="countdown-display" style="display: none; margin-top: 15px;">
            <div style="
              background: linear-gradient(135deg, #ff8800 0%, #ff4400 100%);
              border: 3px solid #fff;
              border-radius: 50%;
              width: 120px;
              height: 120px;
              margin: 0 auto;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 30px rgba(255, 136, 0, 0.8), 0 0 60px rgba(255, 136, 0, 0.4);
              animation: countdownPulse 1s infinite, countdownRotate 2s linear infinite;
            ">
              <span id="countdown-number" style="
                color: #fff;
                font-size: 64px;
                font-weight: bold;
                text-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
              ">5</span>
            </div>
            <p style="
              color: #ff8800;
              font-size: 24px;
              font-weight: bold;
              margin-top: 20px;
              text-shadow: 0 0 10px rgba(255, 136, 0, 0.5);
              animation: pulse 1s infinite;
            ">GAME STARTING!</p>
            
            <style>
              @keyframes countdownPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
              }
              
              @keyframes countdownRotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </div>
          
          <p id="waiting-message" style="color: #666; font-size: 14px; margin-top: 15px; animation: pulse 2s infinite;">
            Waiting for players...
          </p>
        </div>
        
        <div style="display: flex; gap: 10px;">
          <button id="btn-back" style="
            flex: 1;
            padding: 12px;
            font-size: 14px;
            cursor: pointer;
            font-family: monospace;
            border: 2px solid #666;
            background: #222;
            color: #aaa;
            border-radius: 4px;
          ">← BACK</button>
          
          ${isHost ? `
            <button id="btn-start" style="
              flex: 1;
              padding: 12px;
              font-size: 14px;
              cursor: pointer;
              font-family: monospace;
              border: 2px solid #0f0;
              background: #0a0;
              color: #fff;
              border-radius: 4px;
              font-weight: bold;
            ">START</button>
          ` : ''}
        </div>
      </div>
      
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      </style>
    `;
    
    document.getElementById('btn-back')?.addEventListener('click', () => {
      // Clean up lobby manager
      if (this.lobbyManager) {
        this.lobbyManager.destroy();
        this.lobbyManager = null;
      }
      this.showTitleScreen();
    });
    
    // Start button (host only)
    document.getElementById('btn-start')?.addEventListener('click', () => {
      if (this.lobbyManager) {
        void this.lobbyManager.startGameEarly();
      } else {
        this.startGame();
      }
    });
    
    // Auto-start countdown when lobby is full
    if (currentPlayers >= maxPlayers) {
      const countdownDisplay = document.getElementById('countdown-display');
      const countdownNumber = document.getElementById('countdown-number');
      const waitingMessage = document.getElementById('waiting-message');
      
      if (countdownDisplay && countdownNumber && waitingMessage) {
        countdownDisplay.style.display = 'block';
        waitingMessage.style.display = 'none';
        
        let countdown = 10;
        countdownNumber.textContent = countdown.toString();
        const countdownInterval = setInterval(() => {
          countdown--;
          countdownNumber.textContent = countdown.toString();
          
          if (countdown <= 0) {
            clearInterval(countdownInterval);
            this.startGame();
          }
        }, 1000);
      }
    }
    
  }

  /**
   * Show statistics screen
   */
  public showStatsScreen(): void {
    // Hide canvas on stats screen
    const canvas = document.getElementById('bg') as HTMLCanvasElement;
    if (canvas) {
      canvas.style.display = 'none';
    }
    
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
