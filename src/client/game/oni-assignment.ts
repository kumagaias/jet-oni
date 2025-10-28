import { Player } from '../../shared/types/game';
import { MIN_ONI_COUNT, MIN_TOTAL_PLAYERS } from '../../shared/constants';

/**
 * OniAssignment handles the logic for assigning oni roles to players
 */
export class OniAssignment {
  /**
   * Calculate the number of oni players based on total player count
   * Minimum 2 oni, scales with player count
   */
  public static calculateOniCount(totalPlayers: number): number {
    if (totalPlayers < MIN_TOTAL_PLAYERS) {
      throw new Error(`Minimum ${MIN_TOTAL_PLAYERS} players required`);
    }

    // Scale oni count: 2 for 6-8 players, 3 for 9-12, 4 for 13-16, etc.
    const oniCount = Math.max(MIN_ONI_COUNT, Math.floor(totalPlayers / 4));
    
    // Ensure at least 2 runners remain
    return Math.min(oniCount, totalPlayers - 2);
  }

  /**
   * Randomly select oni players from a list of players
   */
  public static assignRandomOni(players: Player[]): Player[] {
    if (players.length < MIN_TOTAL_PLAYERS) {
      throw new Error(`Minimum ${MIN_TOTAL_PLAYERS} players required`);
    }

    const oniCount = this.calculateOniCount(players.length);
    
    // Create a copy of players array to shuffle
    const shuffled = [...players];
    
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }

    // Select first N players as oni
    const oniPlayers = shuffled.slice(0, oniCount);
    
    // Mark selected players as oni
    oniPlayers.forEach(player => {
      player.isOni = true;
    });

    // Mark remaining players as runners
    shuffled.slice(oniCount).forEach(player => {
      player.isOni = false;
    });

    return players;
  }

  /**
   * Validate that oni assignment meets minimum requirements
   */
  public static validateOniAssignment(players: Player[]): boolean {
    const oniCount = players.filter(p => p.isOni).length;
    const runnerCount = players.filter(p => !p.isOni).length;

    // Check minimum oni count
    if (oniCount < MIN_ONI_COUNT) {
      return false;
    }

    // Check minimum runner count (at least 2)
    if (runnerCount < 2) {
      return false;
    }

    // Check total player count
    if (players.length < MIN_TOTAL_PLAYERS) {
      return false;
    }

    return true;
  }

  /**
   * Get recommended oni count for a given player count
   */
  public static getRecommendedOniCount(totalPlayers: number): number {
    try {
      return this.calculateOniCount(totalPlayers);
    } catch {
      return MIN_ONI_COUNT;
    }
  }
}
