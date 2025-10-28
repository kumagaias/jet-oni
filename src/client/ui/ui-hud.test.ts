import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UIHud } from './ui-hud';
import { GameState } from '../game/game-state';
import { I18n } from '../i18n/i18n';
import { en } from '../i18n/translations/en';
import { jp } from '../i18n/translations/jp';

describe('UIHud', () => {
  let uiHud: UIHud;
  let gameState: GameState;
  let i18n: I18n;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    // Create game state and i18n
    gameState = new GameState('test-player');
    i18n = new I18n({ en, jp }, 'en');
    
    // Create UI HUD
    uiHud = new UIHud(gameState, i18n);
  });

  afterEach(() => {
    uiHud.dispose();
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('should create HUD container', () => {
      const container = document.getElementById('hud-container');
      expect(container).not.toBeNull();
    });

    it('should create status element', () => {
      const status = document.getElementById('hud-status');
      expect(status).not.toBeNull();
    });

    it('should create player count element', () => {
      const playerCount = document.getElementById('hud-player-count');
      expect(playerCount).not.toBeNull();
    });

    it('should create fuel container', () => {
      const fuelContainer = document.getElementById('hud-fuel-container');
      expect(fuelContainer).not.toBeNull();
    });

    it('should create fuel bar', () => {
      const fuelBar = document.getElementById('hud-fuel-bar');
      expect(fuelBar).not.toBeNull();
    });

    it('should create beacon element', () => {
      const beacon = document.getElementById('hud-beacon');
      expect(beacon).not.toBeNull();
    });
  });

  describe('status display', () => {
    it('should display runner status when player is not oni', () => {
      gameState.setLocalPlayerIsOni(false);
      uiHud.update();

      const status = document.getElementById('hud-status');
      expect(status?.textContent).toBe('You are RUNNER');
      expect(status?.style.backgroundColor).toContain('0, 255, 0'); // Green
    });

    it('should display oni status when player is oni', () => {
      gameState.setLocalPlayerIsOni(true);
      uiHud.update();

      const status = document.getElementById('hud-status');
      expect(status?.textContent).toBe('You are ONI');
      expect(status?.style.backgroundColor).toContain('255, 0, 0'); // Red
    });
  });

  describe('player count display', () => {
    it('should display correct player counts', () => {
      gameState.setLocalPlayerIsOni(true);
      uiHud.update();

      const playerCount = document.getElementById('hud-player-count');
      expect(playerCount?.textContent).toContain('ONI: 1');
      expect(playerCount?.textContent).toContain('Runners: 0');
    });

    it('should update when players change', () => {
      gameState.setLocalPlayerIsOni(false);
      gameState.updateRemotePlayer({
        id: 'player2',
        username: 'Player 2',
        isOni: true,
        isAI: false,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 100,
        survivedTime: 0,
        wasTagged: false,
        isOnSurface: true,
        isDashing: false,
        isJetpacking: false,
        beaconCooldown: 0,
      });
      uiHud.update();

      const playerCount = document.getElementById('hud-player-count');
      expect(playerCount?.textContent).toContain('ONI: 1');
      expect(playerCount?.textContent).toContain('Runners: 1');
    });
  });

  describe('fuel gauge', () => {
    it('should display full fuel at 100%', () => {
      gameState.setLocalPlayerFuel(100);
      uiHud.update();

      const fuelBar = document.getElementById('hud-fuel-bar');
      const fuelText = document.getElementById('hud-fuel-text');
      
      expect(fuelBar?.style.width).toBe('100%');
      expect(fuelText?.textContent).toBe('100');
    });

    it('should display half fuel at 50%', () => {
      gameState.setLocalPlayerFuel(50);
      uiHud.update();

      const fuelBar = document.getElementById('hud-fuel-bar');
      const fuelText = document.getElementById('hud-fuel-text');
      
      expect(fuelBar?.style.width).toBe('50%');
      expect(fuelText?.textContent).toBe('50');
    });

    it('should display empty fuel at 0%', () => {
      gameState.setLocalPlayerFuel(0);
      uiHud.update();

      const fuelBar = document.getElementById('hud-fuel-bar');
      const fuelText = document.getElementById('hud-fuel-text');
      
      expect(fuelBar?.style.width).toBe('0%');
      expect(fuelText?.textContent).toBe('0');
    });

    it('should change color when fuel is low', () => {
      gameState.setLocalPlayerFuel(20);
      uiHud.update();

      const fuelBar = document.getElementById('hud-fuel-bar');
      expect(fuelBar?.style.background).toContain('#ff0000'); // Red
    });
  });

  describe('beacon display', () => {
    it('should hide beacon when player is runner', () => {
      gameState.setLocalPlayerIsOni(false);
      uiHud.update(0);

      const beacon = document.getElementById('hud-beacon');
      expect(beacon?.style.display).toBe('none');
    });

    it('should show beacon ready when player is oni and cooldown is 0', () => {
      gameState.setLocalPlayerIsOni(true);
      uiHud.update(0);

      const beacon = document.getElementById('hud-beacon');
      expect(beacon?.style.display).toBe('block');
      expect(beacon?.textContent).toBe('Beacon Ready');
      expect(beacon?.style.backgroundColor).toContain('0, 255, 0'); // Green
    });

    it('should show beacon cooldown when player is oni and cooldown > 0', () => {
      gameState.setLocalPlayerIsOni(true);
      uiHud.update(15);

      const beacon = document.getElementById('hud-beacon');
      expect(beacon?.style.display).toBe('block');
      expect(beacon?.textContent).toContain('15');
      expect(beacon?.style.backgroundColor).toContain('0, 0, 0'); // Dark
    });
  });

  describe('visibility', () => {
    it('should show HUD when show() is called', () => {
      uiHud.hide();
      uiHud.show();

      const container = document.getElementById('hud-container');
      expect(container?.style.display).toBe('block');
    });

    it('should hide HUD when hide() is called', () => {
      uiHud.show();
      uiHud.hide();

      const container = document.getElementById('hud-container');
      expect(container?.style.display).toBe('none');
    });
  });

  describe('disposal', () => {
    it('should remove HUD from DOM when disposed', () => {
      uiHud.dispose();

      const container = document.getElementById('hud-container');
      expect(container).toBeNull();
    });
  });

  describe('language update', () => {
    it('should recreate elements when language is updated', () => {
      const oldContainer = document.getElementById('hud-container');
      uiHud.updateLanguage();
      const newContainer = document.getElementById('hud-container');

      expect(newContainer).not.toBeNull();
      expect(newContainer).not.toBe(oldContainer);
    });
  });
});
