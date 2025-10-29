// Game state type definitions

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type GameStatus = 'lobby' | 'playing' | 'ended';

export type PlayerRole = 'oni' | 'runner';

export interface GameConfig {
  totalPlayers: number;
  roundDuration: number; // seconds
  rounds: number;
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
  isOnSurface: boolean;
  isDashing: boolean;
  isJetpacking: boolean;
  beaconCooldown: number;
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
