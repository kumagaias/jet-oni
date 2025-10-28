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
   * Get the winner (longest survival time)
   */
  public getWinner(): Player | null {
    if (this.players.length === 0) {
      return null;
    }

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
