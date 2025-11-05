import type { Player } from '../../shared/types/game';

/**
 * AI API Client for managing AI players via HTTP
 */
export class AIAPIClient {
  /**
   * Get AI players for a game
   */
  async getAIPlayers(gameId: string): Promise<Player[]> {
    try {
      const response = await fetch(`/api/ai/players/${gameId}`);
      
      if (!response.ok) {
        console.warn(`Failed to get AI players: ${response.status}`);
        return [];
      }
      
      const data = await response.json() as { players: Player[]; timestamp: number };
      return data.players;
    } catch (error) {
      console.error('Error getting AI players:', error);
      return [];
    }
  }

  /**
   * Update AI players for a game (host only)
   */
  async updateAIPlayers(gameId: string, players: Player[]): Promise<boolean> {
    try {
      const response = await fetch(`/api/ai/update/${gameId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ players }),
      });
      
      if (!response.ok) {
        console.warn(`Failed to update AI players: ${response.status}`);
        return false;
      }
      
      const data = await response.json() as { success: boolean };
      return data.success;
    } catch (error) {
      console.error('Error updating AI players:', error);
      return false;
    }
  }
}
