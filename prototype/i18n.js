// i18n (Internationalization) System
const translations = {
  en: {
    // Menu
    gameTitle: 'JET ONI',
    joinGame: 'Join Game',
    createGame: 'Create Game',
    
    // Settings
    gameSettings: 'Game Settings',
    players: 'Players',
    time: 'Time',
    rounds: 'Rounds',
    minutes: 'min',
    startGame: 'Start Game',
    back: 'Back',
    
    // Game List
    gameList: 'Game List',
    room: 'Room',
    
    // HUD
    oni: 'ONI',
    runner: 'RUNNER',
    spotted: 'SPOTTED!',
    
    // Controls
    controls: {
      move: 'WASD: Move',
      jump: 'SPACE: Jump',
      dash: 'SHIFT: Dash',
      look: 'Mouse: Look Around',
      devMode: 'F3: Dev Mode',
    },
    
    // Toast Messages
    becameOni: '👹 You became ONI!',
    taggedPlayer: '✨ Tagged {player}!',
    playerTagged: '{player1} tagged {player2}!',
    
    // Game End
    gameOver: 'GAME OVER',
    results: 'Results',
    survived: 'Survived',
    initialOni: 'Initial ONI',
    escaped: 'Escaped!',
    returnToMenu: 'Return to Menu',
    
    // Position
    position: 'Position',
    speed: 'Speed',
  },
  
  jp: {
    // Menu
    gameTitle: 'JET ONI',
    joinGame: 'ゲーム参加',
    createGame: 'ゲーム作成',
    
    // Settings
    gameSettings: 'ゲーム設定',
    players: '人数',
    time: '時間',
    rounds: 'ラウンド',
    minutes: '分',
    startGame: 'ゲーム開始',
    back: '戻る',
    
    // Game List
    gameList: 'ゲーム一覧',
    room: 'ルーム',
    
    // HUD
    oni: '鬼',
    runner: '逃げる側',
    spotted: '見つかった！',
    
    // Controls
    controls: {
      move: 'WASD: 移動',
      jump: 'SPACE: ジャンプ',
      dash: 'SHIFT: ダッシュ',
      look: 'マウス: 視点移動',
      devMode: 'F3: 開発モード',
    },
    
    // Toast Messages
    becameOni: '👹 鬼になった！',
    taggedPlayer: '✨ {player} を鬼にした！',
    playerTagged: '{player1} が {player2} を鬼にした！',
    
    // Game End
    gameOver: 'ゲーム終了',
    results: '結果',
    survived: '生存',
    initialOni: '最初の鬼',
    escaped: '逃げ切り!',
    returnToMenu: 'メニューに戻る',
    
    // Position
    position: '位置',
    speed: '速度',
  }
};

class I18n {
  constructor(defaultLang = 'en') {
    this.currentLang = defaultLang;
    this.translations = translations;
  }
  
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      this.updateUI();
      // Save to localStorage
      localStorage.setItem('jetoni_language', lang);
    }
  }
  
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations[this.currentLang];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    // Replace parameters
    if (typeof value === 'string') {
      Object.keys(params).forEach(param => {
        value = value.replace(`{${param}}`, params[param]);
      });
    }
    
    return value || key;
  }
  
  updateUI() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
    
    // Update all elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });
  }
  
  getCurrentLanguage() {
    return this.currentLang;
  }
}

// Initialize i18n
const savedLang = localStorage.getItem('jetoni_language') || 'en';
const i18n = new I18n(savedLang);

export { i18n };
