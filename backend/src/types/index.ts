// ===== Shared backend types =====

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface PlayerStatsRow {
  id: string;
  user_id: string;
  total_games: number;
  total_wins: number;
  total_points: number;
  best_round_score: number;
  best_combo: number;
  current_combo: number;
  updated_at: Date;
}

export interface GameRoundRow {
  id: string;
  user_id: string;
  word_id: string;
  word: string;
  won: boolean;
  score: number;
  difficulty: number;
  wrong_guesses: number;
  time_seconds: number;
  hints_used: Record<string, boolean>;
  used_partial_umlauts: boolean;
  combo_at_time: number;
  played_at: Date;
}

export interface WordErrorRow {
  id: string;
  user_id: string;
  word_id: string;
  word: string;
  times_seen: number;
  times_correct: number;
  times_wrong: number;
  last_seen_at: Date;
  next_review_at: Date | null;
  ease_factor: number;
}

export interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface SaveRoundBody {
  wordId: string;
  word: string;
  won: boolean;
  score: number;
  difficulty: number;
  wrongGuesses: number;
  timeSeconds: number;
  hintsUsed: Record<string, boolean>;
  usedPartialUmlauts: boolean;
  comboAtTime: number;
}
