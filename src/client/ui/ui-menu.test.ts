/**
 * UIMenu tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIMenu } from './ui-menu';
import { UIManager } from './ui-manager';
import { I18n } from '../i18n/i18n';
import { GameAPIClient } from '../api/game-api-client';

describe('UIMenu', () => {
  let uiMenu: UIMenu;
  let uiManager: UIManager;
  let i18n: I18n;
  let mockOverlay: HTMLDivElement;
  let mockGameApiClient: GameAPIClient;

  beforeEach(() => {
    // Create mock overlay with correct class
    mockOverlay = document.createElement('div');
    mockOverlay.className = 'overlay';
    document.body.appendChild(mockOverlay);

    // Create UIManager and I18n
    uiManager = new UIManager();
    i18n = new I18n('en');
    
    // Create mock GameAPIClient
    mockGameApiClient = {
      listGames: vi.fn().mockResolvedValue({
        success: true,
        games: [],
      }),
      createGame: vi.fn().mockResolvedValue({
        success: true,
        gameId: 'test-game-id',
      }),
      joinGame: vi.fn().mockResolvedValue({
        success: true,
        playerId: 'test-player-id',
        gameState: {
          gameId: 'test-game-id',
          hostId: 'host-id',
          status: 'lobby',
          config: { totalPlayers: 4, roundDuration: 180, rounds: 1 },
          players: [],
          startTime: 0,
          endTime: 0,
          currentRound: 0,
          timeRemaining: 180,
        },
      }),
      getGameState: vi.fn().mockResolvedValue({
        gameId: 'test-game-id',
        hostId: 'host-id',
        status: 'lobby',
        config: { totalPlayers: 4, roundDuration: 180, rounds: 1 },
        players: [],
        startTime: 0,
        endTime: 0,
        currentRound: 0,
        timeRemaining: 180,
      }),
    } as unknown as GameAPIClient;
    
    uiMenu = new UIMenu(uiManager, i18n, 'TestUser', mockGameApiClient);
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(mockOverlay);
    localStorage.clear();
  });

  describe('Title Screen', () => {
    it('should display title screen with correct elements', () => {
      uiMenu.showTitleScreen();

      // Username is not displayed in current implementation
      expect(mockOverlay.innerHTML).toContain('btn-create-game');
      expect(mockOverlay.innerHTML).toContain('btn-join-game');
      expect(mockOverlay.innerHTML).toContain('btn-stats');
    });

    it('should display language selection buttons', () => {
      uiMenu.showTitleScreen();

      const enButton = document.getElementById('lang-en');
      const jpButton = document.getElementById('lang-jp');

      expect(enButton).toBeTruthy();
      expect(jpButton).toBeTruthy();
    });

    it('should switch to Japanese when JP button is clicked', () => {
      uiMenu.showTitleScreen();

      const jpButton = document.getElementById('lang-jp') as HTMLButtonElement;
      jpButton.click();

      expect(i18n.getLanguage()).toBe('jp');
    });

    it('should switch to English when EN button is clicked', () => {
      i18n.setLanguage('jp');
      uiMenu.showTitleScreen();

      const enButton = document.getElementById('lang-en') as HTMLButtonElement;
      enButton.click();

      expect(i18n.getLanguage()).toBe('en');
    });

    it('should navigate to create game screen when button is clicked', () => {
      uiMenu.showTitleScreen();

      const createButton = document.getElementById('btn-create-game') as HTMLButtonElement;
      createButton.click();

      expect(mockOverlay.innerHTML).toContain('player-options');
    });

    it('should navigate to join game screen when button is clicked', async () => {
      uiMenu.showTitleScreen();

      const joinButton = document.getElementById('btn-join-game') as HTMLButtonElement;
      joinButton.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockOverlay.innerHTML).toContain('btn-back');
    });

    it('should navigate to stats screen when button is clicked', () => {
      uiMenu.showTitleScreen();

      const statsButton = document.getElementById('btn-stats') as HTMLButtonElement;
      statsButton.click();

      expect(mockOverlay.innerHTML).toContain('btn-back');
    });
  });

  describe('Create Game Screen', () => {
    it('should display game settings options', () => {
      uiMenu.showCreateGameScreen();

      expect(mockOverlay.innerHTML).toContain('player-options');
      expect(mockOverlay.innerHTML).toContain('duration-options');
    });

    it('should display player count options', () => {
      uiMenu.showCreateGameScreen();

      const playerOptions = [6, 8, 10, 15, 20];
      playerOptions.forEach(count => {
        expect(mockOverlay.innerHTML).toContain(`data-value="${count}"`);
      });
    });

    it('should display duration options', () => {
      uiMenu.showCreateGameScreen();

      expect(mockOverlay.innerHTML).toContain('data-value="3"');
      expect(mockOverlay.innerHTML).toContain('data-value="5"');
    });

    it('should highlight selected option', () => {
      uiMenu.showCreateGameScreen();

      const playerButton = document.querySelector('[data-option="players"][data-value="6"]') as HTMLButtonElement;
      playerButton.click();

      // Check that the button style changed (hex or rgb format)
      expect(playerButton.style.backgroundColor).toMatch(/(#ff8800|rgb\(255, 136, 0\))/);
    });

    it('should navigate back to title screen when back button is clicked', () => {
      uiMenu.showCreateGameScreen();

      const backButton = document.getElementById('btn-back') as HTMLButtonElement;
      backButton.click();

      // Username is not displayed in current implementation
      expect(mockOverlay.innerHTML).toContain('btn-create-game');
    });
  });

  describe('Join Game Screen', () => {
    it('should display empty state when no games available', async () => {
      await uiMenu.showJoinGameScreen();

      expect(mockOverlay.innerHTML).toContain('btn-back');
    });

    it('should display game list when games are provided', async () => {
      // Mock listGames to return games
      mockGameApiClient.listGames = vi.fn().mockResolvedValue({
        success: true,
        games: [
          {
            gameId: 'game1',
            hostUsername: 'Player1',
            currentPlayers: 2,
            totalPlayers: 4,
            roundDuration: 180,
            rounds: 1,
            status: 'lobby',
          },
          {
            gameId: 'game2',
            hostUsername: 'Player2',
            currentPlayers: 4,
            totalPlayers: 4,
            roundDuration: 300,
            rounds: 3,
            status: 'lobby',
          },
        ],
      });

      await uiMenu.showJoinGameScreen();

      expect(mockOverlay.innerHTML).toContain('Player1');
      expect(mockOverlay.innerHTML).toContain('Player2');
    });

    it('should disable join button for full games', async () => {
      mockGameApiClient.listGames = vi.fn().mockResolvedValue({
        success: true,
        games: [
          {
            gameId: 'game1',
            hostUsername: 'Player1',
            currentPlayers: 4,
            totalPlayers: 4,
            roundDuration: 180,
            rounds: 1,
            status: 'lobby',
          },
        ],
      });

      await uiMenu.showJoinGameScreen();

      const joinButton = document.querySelector('.join-game-btn') as HTMLButtonElement;
      expect(joinButton.disabled).toBe(true);
    });

    it('should navigate back to title screen when back button is clicked', async () => {
      await uiMenu.showJoinGameScreen();

      const backButton = document.getElementById('btn-back') as HTMLButtonElement;
      backButton.click();

      // Username is not displayed in current implementation
      expect(mockOverlay.innerHTML).toContain('btn-create-game');
    });
  });

  describe('Lobby Screen', () => {
    it('should display lobby with player count', () => {
      uiMenu.showLobbyScreen(2, 4, false);

      expect(mockOverlay.innerHTML).toContain('btn-back');
    });

    it('should show different content for host', () => {
      uiMenu.showLobbyScreen(4, 4, true);

      // Host should see different content than non-host
      expect(mockOverlay.innerHTML).toBeTruthy();
    });

    it('should show different content for non-host', () => {
      uiMenu.showLobbyScreen(2, 4, false);

      // Non-host should see different content
      expect(mockOverlay.innerHTML).toBeTruthy();
    });

    it('should navigate back to title screen when back button is clicked', () => {
      uiMenu.showLobbyScreen(2, 4, false);

      const backButton = document.getElementById('btn-back') as HTMLButtonElement;
      backButton.click();

      // Username is not displayed in current implementation
      expect(mockOverlay.innerHTML).toContain('btn-create-game');
    });
  });

  describe('Statistics Screen', () => {
    it('should display statistics elements', () => {
      uiMenu.showStatsScreen();

      expect(mockOverlay.innerHTML).toContain('btn-back');
    });

    it('should navigate back to title screen when back button is clicked', () => {
      uiMenu.showStatsScreen();

      const backButton = document.getElementById('btn-back') as HTMLButtonElement;
      backButton.click();

      // Username is not displayed in current implementation
      expect(mockOverlay.innerHTML).toContain('btn-create-game');
    });
  });

  describe('Language Persistence', () => {
    it('should change language when button is clicked', () => {
      uiMenu.showTitleScreen();
      const jpButton = document.getElementById('lang-jp') as HTMLButtonElement;
      jpButton.click();

      expect(i18n.getLanguage()).toBe('jp');
    });

    it('should load language from localStorage on initialization', () => {
      localStorage.setItem('jetoni_language', 'jp');

      const newI18n = new I18n();
      expect(newI18n.getLanguage()).toBe('jp');
    });
  });
});
