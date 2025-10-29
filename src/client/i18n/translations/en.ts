/**
 * English translations for JetOni game
 */

import type { Translations } from '../i18n';

export const en: Translations = {
  // Menu screen
  menu: {
    title: 'JetOni',
    subtitle: '3D Tag Game',
    createGame: 'Create Game',
    joinGame: 'Join Game',
    statistics: 'Statistics',
    settings: 'Settings',
    languageSelect: 'Language',
    back: 'Back',
  },

  // Game settings
  settings: {
    title: 'Game Settings',
    players: 'Players',
    duration: 'Duration',
    rounds: 'Rounds',
    minutes: '{value} min',
    confirm: 'Start Game',
    playerCount: '{count} Players',
  },

  // Game list
  gameList: {
    title: 'Available Games',
    noGames: 'No games available',
    join: 'Join',
    full: 'Full',
    players: '{current}/{max}',
    duration: '{minutes} min',
    rounds: '{count} rounds',
  },

  // Lobby
  lobby: {
    title: 'Lobby',
    waiting: 'Waiting for players...',
    players: 'Players: {current}/{max}',
    pressSpace: 'Press SPACE to start',
    addingAI: 'Adding AI players...',
    ready: 'Ready!',
  },

  // Game HUD
  hud: {
    timer: 'Time: {time}',
    oni: 'ONI',
    runners: 'Runners',
    fuel: 'Fuel',
    status: {
      oni: 'You are ONI',
      runner: 'You are RUNNER',
    },
    playerCount: 'ONI: {oni} | Runners: {runners}',
    beacon: 'Beacon',
    beaconReady: 'Beacon Ready',
    beaconCooldown: 'Beacon: {seconds}s',
  },

  // Controls
  controls: {
    movement: 'Movement',
    wasd: 'WASD - Move',
    mouse: 'Mouse - Look',
    space: 'SPACE - Jump/Jetpack',
    shift: 'SHIFT - Dash',
    esc: 'ESC - Menu',
    abilities: 'Abilities',
    jetpack: 'Jetpack (ONI)',
    jump: 'Jump (Runner)',
    dash: 'Dash (Runner)',
    beacon: 'Beacon (ONI)',
  },

  // Mobile controls
  mobile: {
    dash: 'Dash',
    jetpack: 'Jetpack',
    beacon: 'Beacon',
  },

  // Game messages
  game: {
    becameOni: 'You became ONI!',
    tagged: 'You tagged {player}!',
    gotTagged: 'You were tagged by {player}!',
    spotted: 'Spotted!',
    beaconActivated: 'Beacon activated!',
    outOfFuel: 'Out of fuel!',
    gameStarting: 'Game starting...',
    roundStarting: 'Round {round} starting...',
    getReady: 'Get ready!',
    playerDisconnected: '{player} disconnected',
    playerReplacedWithAI: '{player} was replaced with AI',
    notifications: {
      becameOni: 'You became ONI!',
      taggedPlayer: 'Tagged {player}!',
    },
  },

  // Results screen
  results: {
    title: 'Game Results',
    winner: 'Winner!',
    survived: 'Survived',
    tagged: 'Tagged',
    survivalTime: 'Survival Time: {time}',
    longestSurvival: 'Longest Survival',
    escaped: 'Escaped!',
    caught: 'Caught',
    rank: 'Rank',
    player: 'Player',
    time: 'Time',
    status: 'Status',
    backToMenu: 'Back to Menu',
    nextRound: 'Next Round',
  },

  // Statistics
  stats: {
    title: 'Statistics',
    gamesPlayed: 'Games Played',
    wins: 'Wins',
    losses: 'Losses',
    winRate: 'Win Rate',
    totalSurvivalTime: 'Total Survival Time',
    longestSurvival: 'Longest Survival',
    averageSurvival: 'Average Survival',
    reset: 'Reset Statistics',
    confirmReset: 'Are you sure you want to reset all statistics?',
    resetSuccess: 'Statistics reset successfully',
  },

  // Errors
  error: {
    connectionFailed: 'Connection failed',
    gameNotFound: 'Game not found',
    gameFull: 'Game is full',
    invalidSettings: 'Invalid game settings',
    unknown: 'An error occurred',
    retry: 'Retry',
    networkError: 'Network error occurred',
    timeout: 'Request timed out',
    serverError: 'Server error occurred',
    validationError: 'Invalid data',
    retrying: 'Retrying... ({attempt}/{max})',
  },

  // Common
  common: {
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    cancel: 'Cancel',
    close: 'Close',
    loading: 'Loading...',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
  },

  // Debug
  debug: {
    title: 'Debug Info',
    position: 'Position',
    velocity: 'Velocity',
    fuel: 'Fuel',
    isOni: 'Is ONI',
    onGround: 'On Ground',
    fps: 'FPS',
    players: 'Players',
    aiPlayers: 'AI Players',
  },
};
