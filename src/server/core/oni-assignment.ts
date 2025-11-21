/**
 * ONI Assignment Logic
 * Handles the logic for assigning ONI roles to players
 */

import { GameState } from '../../shared/types/game';

/**
 * Assign random ONI to players
 * Rules:
 * - 1 ONI for every 3 players (minimum 1)
 * - If 2+ human players: ensure at least 1 human ONI and 1 human Runner
 * - If 1 human player: random assignment
 * - If 0 human players: random assignment
 */
export function assignRandomOni(gameState: GameState): void {
  try {
    if (!gameState || !gameState.players) {
      console.error('[ONI Assignment] Invalid game state');
      return;
    }

    if (gameState.players.length === 0) {
      console.warn('[ONI Assignment] No players to assign ONI');
      return;
    }

    // Count human players
    const humanPlayers = gameState.players.filter(p => !p.isAI);
    const humanCount = humanPlayers.length;
    
    console.log(`[ONI Assignment] Total players: ${gameState.players.length}, Human players: ${humanCount}`);

    // Calculate number of oni: 1 oni for every 3 players (rounded down)
    const oniCount = Math.max(1, Math.floor(gameState.players.length / 3));
    console.log(`[ONI Assignment] Required ONI count: ${oniCount}`);

    // Reset all players to runner
    gameState.players.forEach((player) => {
      if (player) {
        player.isOni = false;
      }
    });

    // Special case: Only 1 human player - random assignment
    if (humanCount === 1) {
      console.log(`[ONI Assignment] Single human player - random assignment`);
      assignRandomOniToAll(gameState.players, oniCount);
    } 
    // 2+ human players: Ensure at least 1 human is oni AND at least 1 human is runner
    else if (humanCount >= 2) {
      console.log(`[ONI Assignment] Multiple human players - ensuring at least 1 human ONI and 1 human Runner`);
      assignOniWithHumanConstraints(gameState.players, humanPlayers, oniCount, humanCount);
    }
    // No human players (all AI) - random assignment
    else {
      console.log(`[ONI Assignment] No human players - random assignment`);
      assignRandomOniToAll(gameState.players, oniCount);
    }

    console.log(`[ONI Assignment] Completed. ONI players: ${gameState.players.filter(p => p.isOni).length}`);
  } catch (error) {
    console.error('[ONI Assignment] Unexpected error:', error);
    throw error;
  }
}

/**
 * Assign ONI randomly to all players
 */
function assignRandomOniToAll(players: any[], oniCount: number): void {
  // Shuffle all players
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  
  // Select first N players as oni
  for (let i = 0; i < oniCount && i < shuffled.length; i++) {
    const selectedPlayer = shuffled[i];
    if (selectedPlayer) {
      selectedPlayer.isOni = true;
      console.log(`[ONI Assignment] Assigned ${selectedPlayer.username} (${selectedPlayer.id}) as ONI`);
    }
  }
}

/**
 * Assign ONI with constraints to ensure human representation
 */
function assignOniWithHumanConstraints(
  allPlayers: any[],
  humanPlayers: any[],
  oniCount: number,
  humanCount: number
): void {
  // Shuffle human players
  const shuffledHumans = [...humanPlayers].sort(() => Math.random() - 0.5);
  
  // Calculate how many humans should be oni
  // Must be: at least 1, at most (humanCount - 1) to ensure at least 1 runner
  const maxHumanOni = Math.min(oniCount, humanCount - 1);
  const humanOniCount = Math.max(1, maxHumanOni);
  
  console.log(`[ONI Assignment] Assigning ${humanOniCount} human ONI (max: ${maxHumanOni})`);
  
  // Assign humans as oni
  let assignedOniCount = 0;
  for (let i = 0; i < humanOniCount && i < shuffledHumans.length; i++) {
    const selectedPlayer = shuffledHumans[i];
    if (selectedPlayer) {
      selectedPlayer.isOni = true;
      assignedOniCount++;
      console.log(`[ONI Assignment] Assigned human ${selectedPlayer.username} (${selectedPlayer.id}) as ONI`);
    }
  }
  
  // If we need more oni, assign from AI players only (to preserve human runners)
  if (assignedOniCount < oniCount) {
    const aiPlayers = allPlayers.filter(p => p.isAI && !p.isOni);
    const shuffledAI = [...aiPlayers].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffledAI.length && assignedOniCount < oniCount; i++) {
      const selectedPlayer = shuffledAI[i];
      if (selectedPlayer) {
        selectedPlayer.isOni = true;
        assignedOniCount++;
        console.log(`[ONI Assignment] Assigned AI ${selectedPlayer.username} (${selectedPlayer.id}) as ONI`);
      }
    }
  }
  
  // Log human distribution
  const humanOni = allPlayers.filter(p => !p.isAI && p.isOni).length;
  const humanRunner = allPlayers.filter(p => !p.isAI && !p.isOni).length;
  console.log(`[ONI Assignment] Human distribution - ONI: ${humanOni}, Runner: ${humanRunner}`);
}
