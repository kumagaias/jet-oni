// Game state type definitions

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type GameStatus = 'lobby' | 'countdown' | 'playing' | 'ended';

export type PlayerRole = 'oni' | 'runner';

export interface GameConfig {
  totalPlayers: number;
  roundDuration: number; // seconds
  rounds: number;
  timeOfDay?: 'day' | 'night'; // Time of day setting (optional, defaults to 'day')
}

export interface Rotation {
  yaw: number;
  pitch: number;
}

export interface Player {
  id: string;
  username: string;
  isOni: boolean;
  isAI: boolean;
  position: Vector3;
  velocity: Vector3;
  rotation: Rotation;
  fuel: number;
  survivedTime: number;
  wasTagged: boolean;
  tagCount: number; // Number of players this ONI has tagged
  isOnSurface: boolean;
  isDashing: boolean;
  isJetpacking: boolean;
  beaconCooldown: number;
  isCloaked?: boolean; // Whether player is currently cloaked (invisible)
}

export interface GameState {
  gameId: string;
  hostId: string;
  status: GameStatus;
  config: GameConfig;
  players: Player[];
  startTime: number;
  endTime: number;
  currentRound: number;
  timeRemaining: number;
  lastHostHeartbeat?: number; // Timestamp of last host activity
  initialOniIds?: string[]; // IDs of players who were ONI at game start
  cachedResults?: {
    players: Array<{
      id: string;
      username: string;
      survivedTime: number;
      wasTagged: boolean;
      isAI: boolean;
      tagCount?: number;
      wasInitialOni?: boolean;
    }>;
    teamWinner: 'runners' | 'oni';
  }; // Cached results to ensure consistency across multiple endGame calls
}

export interface PlayerStats {
  userId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalSurvivalTime: number;
  longestSurvival: number;
}

export interface BeaconState {
  isActive: boolean;
  activatedAt: number;
  duration: number;
  cooldown: number;
  lastUsed: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  dash: boolean;
  jetpack: boolean;
  beacon: boolean;
  mouseX: number;
  mouseY: number;
}

/**
 * Item types
 */
export type ItemType = 'beacon' | 'cloak' | 'oni-spawn';

/**
 * Item state
 */
export type ItemState = 'placed' | 'collected';

/**
 * Item data for synchronization
 */
export interface ItemData {
  id: string;
  type: ItemType;
  position: Vector3;
  state: ItemState;
}

/**
 * Items state for a game
 */
export interface ItemsState {
  beacons: ItemData[];
  cloaks: ItemData[];
  oniSpawns: ItemData[];
}
