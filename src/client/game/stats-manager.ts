/**
 * PlayerStatistics stored in localStorage
 */
export interface PlayerStatistics {
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalSurvivalTime: number;
  longestSurvival: number;
}

/**
 * StatsManager handles player statistics persistence
 */
export class StatsManager {
  private static readonly STORAGE_KEY = 'jetoni_player_stats';

  /**
   * Load statistics from localStorage
   */
  public loadStats(): PlayerStatistics {
    try {
      const stored = localStorage.getItem(StatsManager.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }

    // Return default stats
    return {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      totalSurvivalTime: 0,
      longestSurvival: 0,
    };
  }

  /**
   * Save statistics to localStorage
   */
  public saveStats(stats: PlayerStatistics): void {
    try {
      localStorage.setItem(StatsManager.STORAGE_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }

  /**
   * Update statistics after a game
   */
  public updateStats(won: boolean, survivalTime: number): void {
    const stats = this.loadStats();

    stats.gamesPlayed++;
    if (won) {
      stats.wins++;
    } else {
      stats.losses++;
    }
    stats.totalSurvivalTime += survivalTime;
    stats.longestSurvival = Math.max(stats.longestSurvival, survivalTime);

    this.saveStats(stats);
  }

  /**
   * Calculate win rate
   */
  public getWinRate(): number {
    const stats = this.loadStats();
    if (stats.gamesPlayed === 0) {
      return 0;
    }
    return (stats.wins / stats.gamesPlayed) * 100;
  }

  /**
   * Reset all statistics
   */
  public resetStats(): void {
    const defaultStats: PlayerStatistics = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      totalSurvivalTime: 0,
      longestSurvival: 0,
    };
    this.saveStats(defaultStats);
  }
}
