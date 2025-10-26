import type { GameState, GameConfig, PlayerStats } from './game.js';

// Legacy API types (can be removed if not needed)
export type InitResponse = {
  type: "init";
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: "increment";
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: "decrement";
  postId: string;
  count: number;
};

// Game API Request types
export interface CreateGameRequest {
  config: GameConfig;
}

export interface JoinGameRequest {
  gameId: string;
  username: string;
}

export interface UpdatePlayerRequest {
  gameId: string;
  playerId: string;
  position?: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };
  fuel?: number;
  isOni?: boolean;
}

export interface EndGameRequest {
  gameId: string;
}

export interface SaveStatsRequest {
  userId: string;
  won: boolean;
  survivalTime: number;
}

export interface GetStatsRequest {
  userId: string;
}

// Game API Response types
export interface CreateGameResponse {
  success: boolean;
  gameId?: string;
  error?: string;
}

export interface JoinGameResponse {
  success: boolean;
  playerId?: string;
  gameState?: GameState;
  error?: string;
}

export interface GetGameStateResponse {
  success: boolean;
  gameState?: GameState;
  error?: string;
}

export interface UpdatePlayerResponse {
  success: boolean;
  error?: string;
}

export interface EndGameResponse {
  success: boolean;
  results?: GameResults;
  error?: string;
}

export interface SaveStatsResponse {
  success: boolean;
  stats?: PlayerStats;
  error?: string;
}

export interface GetStatsResponse {
  success: boolean;
  stats?: PlayerStats;
  error?: string;
}

export interface GameListResponse {
  success: boolean;
  games?: GameListItem[];
  error?: string;
}

// Helper types
export interface GameListItem {
  gameId: string;
  hostUsername: string;
  currentPlayers: number;
  totalPlayers: number;
  roundDuration: number;
  rounds: number;
  status: 'lobby' | 'playing' | 'ended';
}

export interface GameResults {
  players: PlayerResult[];
  winner?: PlayerResult;
}

export interface PlayerResult {
  id: string;
  username: string;
  survivedTime: number;
  wasTagged: boolean;
  isAI: boolean;
}
