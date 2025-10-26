/**
 * English translations for JetOni game
 */

import { Translations } from '../i18n';

export const en: Translations = {
  // Menu translations
  menu: {
    title: 'JetOni',
    subtitle: '3D Tag Game',
    createGame: 'Create Game',
    joinGame: 'Join Game',
    statistics: 'Statistics',
    settings: 'Settings',
    back: 'Back',
    language: 'Language',
    english: 'English',
    japanese: '日本語',
  },

  // Game settings
  settings: {
    title: 'Game Settings',
    players: 'Players',
    duration: 'Duration',
    rounds: 'Rounds',
    minutes: '{count} minutes',
    round: '{count} round',
    roundPlural: '{count} rounds',
    startGame: 'Start Game',
    confirm: 'Confirm',
    cancel: 'Cancel',
  },

  // Game list
  gameList: {
    title: 'Available Games',
    noGames: 'No games available',
    join: 'Join',
    full: 'Full',
    players: '{current}/{max} players',
    duration: '{minutes}min',
    rounds: '{count} rounds',
  },

  // Lobby
  lobby: {
    title: 'Lobby',
    waiting: 'Waiting for players...',
    players: 'Players: {current}/{max}',
    pressSpace: 'Press SPACE to start',
    ready: 'Ready',
    notReady: 'Not Ready',
  },

  // Game HUD
  hud: {
    timer: 'Time: {time}',
    oni: 'ONI',
    runners: 'Runners',
    fuel: 'Fuel',
    status: {
      oni: 'ONI',
      runner: 'RUNNER',
    },
    playerCount: 'ONI: {oni} | Runners: {runners}',
  },

  // Game messages
  game: {
    becameOni: 'You became ONI!',
    tagged: 'Tagged {player}!',
    spotted: 'Spotted!',
    escaped: 'You escaped!',
    gameStart: 'Game Start!',
    gameEnd: 'Game Over!',
    roundEnd: 'Round {round} End',
    nextRound: 'Next Round in {seconds}s',
  },

  // Controls
  controls: {
    movement: 'Movement',
    wasd: 'WASD - Move',
    mouse: 'Mouse - Look',
    space: 'SPACE - Jump/Jetpack',
    shift: 'SHIFT - Dash',
    e: 'E - Beacon',
    esc: 'ESC - Menu',
    f3: 'F3 - Debug',
    
    // Mobile controls
    dash: 'Dash',
    jetpack: 'Jetpack',
    beacon: 'Beacon',
    jump: 'Jump',
  },

  // Abilities
  abilities: {
    jetpack: {
      name: 'Jetpack',
      description: 'Fly upward (ONI only)',
      fuelCost: 'Fuel: {cost}/s',
    },
    dash: {
      name: 'Dash',
      description: 'Sprint faster (Runner only)',
      fuelCost: 'Fuel: {cost}/s',
    },
    beacon: {
      name: 'Beacon',
      description: 'Reveal all runners (ONI only)',
      cooldown: 'Cooldown: {time}s',
      active: 'Active: {time}s',
      ready: 'Ready!',
    },
    jump: {
      name: 'Jump',
      description: 'Jump (Runner only)',
    },
  },

  // Results screen
  results: {
    title: 'Results',
    winner: 'Winner',
    survived: 'Survived',
    tagged: 'Tagged',
    survivalTime: 'Survival Time: {time}s',
    longestSurvival: 'Longest Survival: {player} ({time}s)',
    escaped: 'Escaped!',
    caught: 'Caught',
    backToMenu: 'Back to Menu',
    nextRound: 'Next Round',
    finalResults: 'Final Results',
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
    reset: 'Reset Statistics',
    confirmReset: 'Are you sure you want to reset all statistics?',
    noStats: 'No statistics yet. Play some games!',
  },

  // Errors
  errors: {
    connectionFailed: 'Connection failed',
    gameNotFound: 'Game not found',
    gameFull: 'Game is full',
    invalidSettings: 'Invalid settings',
    unknown: 'An error occurred',
  },

  // Common
  common: {
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    cancel: 'Cancel',
    close: 'Close',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
  },
};
