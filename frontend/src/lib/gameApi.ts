import { api } from './api';

export interface RoundData {
  wordId: string;
  word: string;
  cefrLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  won: boolean;
  score: number;
  difficulty: number;
  wrongGuesses: number;
  timeSeconds: number;
  hintsUsed: { buchstabe: boolean; kategorie: boolean; beispiel: boolean };
  usedPartialUmlauts: boolean;
  comboAtTime: number;
}

export async function saveRound(data: RoundData) {
  return api.post('/api/game/rounds', data);
}

export async function getStats() {
  return api.get('/api/game/stats');
}

export async function getRoundHistory(limit = 20, offset = 0) {
  return api.get(`/api/game/rounds?limit=${limit}&offset=${offset}`);
}

export async function getWordErrors(sort = 'times_wrong', limit = 20) {
  return api.get(`/api/game/word-errors?sort=${sort}&limit=${limit}`);
}

export async function getLeaderboard(
  window: 'weekly' | 'monthly' | 'all' = 'weekly',
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | null = null,
  limit = 20,
) {
  const levelQuery = level ? `&level=${level}` : '';
  return api.get(`/api/game/leaderboard?window=${window}${levelQuery}&limit=${limit}`);
}
