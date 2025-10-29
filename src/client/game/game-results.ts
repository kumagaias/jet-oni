import { Player } from '../../shared/types/game';

/**
 * GameResults manages game end results and statistics
 */
export class GameResults {
  private players: Player[] = [];
  private endReason: 'timeout' | 'all-oni' | null = null;

  /**
   * Set game results
   */
  public setResults(players: Player[], endReason: 'timeout' | 'all-oni' | null): void {
    this.players = [...players];
    this.endReason = endReason;
  }

  /**
   * Get sorted players by survival time (longest first)
   */
  public getSortedPlayers(): Player[] {
    return [...this.players].sort((a, b) => b.survivedTime - a.survivedTime);
  }

  /**
   * Get the winner
   * - If there are survivors (runners who weren't tagged): longest survivor wins
   * - If all players became oni: the one who was oni longest (tagged first) wins
   */
  public getWinner(): Player | null {
    if (this.players.length === 0) {
      return null;
    }

    // Winner is a runner who wasn't tagged (survived)
    const survivors = this.players.filter(p => !p.wasTagged && !p.isOni);
    if (survivors.length > 0) {
      // Sort survivors by survival time (longest survivor wins)
      survivors.sort((a, b) => b.survivedTime - a.survivedTime);
      return survivors[0];
    }

    // If all players became oni, the one who was oni longest wins
    // This is the player who was tagged first (highest survivedTime when tagged)
    const taggedPlayers = this.players.filter(p => p.wasTagged);
    if (taggedPlayers.length > 0) {
      // Sort by survival time (highest = tagged first = was oni longest)
      taggedPlayers.sort((a, b) => b.survivedTime - a.survivedTime);
      return taggedPlayers[0];
    }

    // Fallback: longest survival time
    const sorted = this.getSortedPlayers();
    return sorted[0];
  }

  /**
   * Get players who escaped (never became oni)
   */
  public getEscapedPlayers(): Player[] {
    return this.players.filter(player => !player.wasTagged && !player.isOni);
  }

  /**
   * Get end reason
   */
  public getEndReason(): 'timeout' | 'all-oni' | null {
    return this.endReason;
  }

  /**
   * Check if local player won
   */
  public didLocalPlayerWin(localPlayerId: string): boolean {
    const winner = this.getWinner();
    return winner !== null && winner.id === localPlayerId;
  }

  /**
   * Check if local player escaped
   */
  public didLocalPlayerEscape(localPlayerId: string): boolean {
    return this.getEscapedPlayers().some(player => player.id === localPlayerId);
  }

  /**
   * Get statistics for local player
   */
  public getLocalPlayerStats(localPlayerId: string): {
    survived: boolean;
    survivedTime: number;
    rank: number;
  } | null {
    const player = this.players.find(p => p.id === localPlayerId);
    if (!player) {
      return null;
    }

    const sorted = this.getSortedPlayers();
    const rank = sorted.findIndex(p => p.id === localPlayerId) + 1;

    return {
      survived: !player.wasTagged && !player.isOni,
      survivedTime: player.survivedTime,
      rank,
    };
  }

  /**
   * Clear results
   */
  public clear(): void {
    this.players = [];
    this.endReason = null;
  }
}
