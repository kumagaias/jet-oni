import { GameState } from './game-state';

/**
 * GameEndManager handles game end conditions and transitions
 */
export class GameEndManager {
  private gameState: GameState;
  private onGameEnd: (() => void) | null = null;
  private hasEnded = false;
  private endReason: 'timeout' | 'all-oni' | null = null;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /**
   * Set callback for when game ends
   */
  public setOnGameEnd(callback: () => void): void {
    this.onGameEnd = callback;
  }

  /**
   * Update and check for game end conditions
   * Should be called every frame
   */
  public update(): void {
    // Only check if game is playing and hasn't ended yet
    if (!this.gameState.isPlaying() || this.hasEnded) {
      return;
    }

    // Check if game should end
    if (this.gameState.shouldGameEnd()) {
      // Determine end reason (priority: all-oni > timeout)
      if (this.gameState.areAllPlayersOni()) {
        this.endReason = 'all-oni';
      } else if (this.gameState.hasTimeRunOut()) {
        this.endReason = 'timeout';
      }
      
      this.endGame();
    }
  }

  /**
   * End the game
   */
  private endGame(): void {
    if (this.hasEnded) {
      return;
    }

    this.hasEnded = true;
    this.gameState.setGamePhase('ended');

    // Call the callback if set
    if (this.onGameEnd) {
      this.onGameEnd();
    }
  }

  /**
   * Reset for new round
   */
  public reset(): void {
    this.hasEnded = false;
    this.endReason = null;
  }

  /**
   * Get the reason for game end
   */
  public getEndReason(): 'timeout' | 'all-oni' | null {
    return this.endReason;
  }
}
