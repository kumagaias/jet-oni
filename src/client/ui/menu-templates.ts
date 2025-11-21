/**
 * Menu Templates
 * HTML templates for menu screens
 */

import { I18n } from '../i18n/i18n';

/**
 * Create game settings screen template
 */
export function createGameSettingsTemplate(i18n: I18n): string {
  return `
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
      ">${i18n.t('settings.title')}</h2>
      
      <div style="
        background: #111;
        border: 1px solid #333;
        padding: 20px;
        border-radius: 4px;
        margin-bottom: 15px;
      ">
        <!-- Players Slider -->
        <div style="margin-bottom: 25px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <p style="color: #aaa; font-size: 11px; margin: 0;">${i18n.t('settings.players').toUpperCase()}</p>
            <p id="players-value" style="color: #ff8800; font-size: 20px; font-weight: bold; margin: 0;">6</p>
          </div>
          <input 
            type="range" 
            id="players-slider" 
            min="6" 
            max="20"
            step="2" 
            value="6"
            data-dev-min="2"
            style="
              width: 100%;
              height: 6px;
              background: linear-gradient(to right, #ff8800 0%, #ff8800 0%, #333 0%, #333 100%);
              border-radius: 3px;
              outline: none;
              -webkit-appearance: none;
            "
          />
          <div style="display: flex; justify-content: space-between; margin-top: 5px;">
            <span id="players-min-label" style="color: #666; font-size: 10px;">6</span>
            <span style="color: #666; font-size: 10px;">20</span>
          </div>
          <!-- ONI count message -->
          <div id="oni-count-message" style="
            color: #ff8800;
            font-size: 11px;
            margin-top: 8px;
            text-align: center;
            padding: 5px;
            background: rgba(255, 136, 0, 0.1);
            border-radius: 3px;
          "></div>
        </div>

        <!-- Duration Slider -->
        <div style="margin-bottom: 25px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <p style="color: #aaa; font-size: 11px; margin: 0;">${i18n.t('settings.duration').toUpperCase()}</p>
            <p id="duration-value" style="color: #ff8800; font-size: 20px; font-weight: bold; margin: 0;">3 min</p>
          </div>
          <input 
            type="range" 
            id="duration-slider" 
            min="180" 
            max="420"
            step="120" 
            value="180"
            data-dev-min="60"
            style="
              width: 100%;
              height: 6px;
              background: linear-gradient(to right, #ff8800 0%, #ff8800 0%, #333 0%, #333 100%);
              border-radius: 3px;
              outline: none;
              -webkit-appearance: none;
            "
          />
          <div style="display: flex; justify-content: space-between; margin-top: 5px;">
            <span id="duration-min-label" style="color: #666; font-size: 10px;">3 min</span>
            <span style="color: #666; font-size: 10px;">7 min</span>
          </div>
        </div>

        <!-- Time of Day Toggle -->
        <div style="margin-bottom: 15px;">
          <p style="color: #aaa; font-size: 11px; margin-bottom: 10px;">${i18n.t('settings.timeOfDay').toUpperCase()}</p>
          <div style="display: flex; gap: 10px;">
            <button id="time-day-btn" style="
              flex: 1;
              padding: 12px;
              background: #ff8800;
              color: white;
              border: 2px solid #ff8800;
              border-radius: 4px;
              font-family: monospace;
              font-size: 14px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.2s;
            ">☀️ ${i18n.t('settings.day')}</button>
            <button id="time-night-btn" style="
              flex: 1;
              padding: 12px;
              background: #222;
              color: #aaa;
              border: 2px solid #444;
              border-radius: 4px;
              font-family: monospace;
              font-size: 14px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.2s;
            ">🌙 ${i18n.t('settings.night')}</button>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 15px; margin-top: 20px;">
        <button id="back-btn" style="
          flex: 1;
          padding: 15px;
          background: transparent;
          color: #ff3333;
          border: 2px solid #ff3333;
          border-radius: 4px;
          font-family: monospace;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        ">${i18n.t('menu.back')}</button>
        <button id="confirm-btn" style="
          flex: 2;
          padding: 15px;
          background: #00ff00;
          color: black;
          border: 2px solid #00ff00;
          border-radius: 4px;
          font-family: monospace;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        ">${i18n.t('settings.confirm')}</button>
      </div>
    </div>
  `;
}

/**
 * Create title screen template
 */
export function createTitleScreenTemplate(i18n: I18n): string {
  return `
    <div style="
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid #666;
      border-radius: 8px;
      padding: 40px;
      max-width: 400px;
      font-family: monospace;
      text-align: center;
    ">
      <h1 style="
        color: #ff8800;
        font-size: 48px;
        margin-bottom: 10px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      ">${i18n.t('menu.title')}</h1>
      
      <p style="
        color: #aaa;
        font-size: 12px;
        margin-bottom: 30px;
      ">${i18n.t('menu.subtitle')}</p>

      <!-- Language Selection -->
      <div style="display: flex; gap: 10px; margin-bottom: 30px; justify-content: center;">
        <button id="lang-en-btn" class="lang-btn" data-lang="en" style="
          padding: 8px 16px;
          background: #ff8800;
          color: white;
          border: 2px solid #ff8800;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        ">EN</button>
        <button id="lang-jp-btn" class="lang-btn" data-lang="jp" style="
          padding: 8px 16px;
          background: #222;
          color: #aaa;
          border: 2px solid #444;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        ">日本語</button>
      </div>

      <button id="create-game-btn" style="
        width: 100%;
        padding: 15px;
        margin-bottom: 15px;
        background: #00ff00;
        color: black;
        border: 2px solid #00ff00;
        border-radius: 4px;
        font-family: monospace;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
      ">${i18n.t('menu.createGame')}</button>

      <button id="join-game-btn" style="
        width: 100%;
        padding: 15px;
        background: #0088ff;
        color: white;
        border: 2px solid #0088ff;
        border-radius: 4px;
        font-family: monospace;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
      ">${i18n.t('menu.joinGame')}</button>
    </div>
  `;
}
