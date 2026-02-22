export interface Word {
  id: string;
  word: string;
  article: 'der' | 'die' | 'das' | null;
  translation: {
    pt: string;
    en: string;
  };
  category: string;
  example: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  currentWord: Word | null;
  guessedLetters: string[];
  wrongGuesses: number;
  maxAttempts: number;
  status: GameStatus;
  hintsUsed: number;
  hintCategoryRevealed: boolean;
  hintExampleRevealed: boolean;
  partialLetters: Record<number, string>;   // position → base letter (e.g. 'a' for position of 'ä')
  partialBaseLetters: string[];             // currently active partial base letters (for keyboard)
  umlautPartialCount: number;              // cumulative count of partial umlaut guesses (for scoring)
}

export interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  averageGuesses: number;
}

export interface HintInfo {
  category: string;
  categoryIcon: string;
  example: string;
}

export interface WortlisteData {
  metadata: {
    level: string;
    source: string;
    sourceUrl: string;
    totalWords: number;
    lastUpdated: string;
  };
  categories: Category[];
  words: Word[];
}

// ===== Filters =====

export interface GameFilters {
  difficulties: number[];   // empty = all
  categories: string[];     // empty = all
}

// ===== Scoring =====

export interface HintPenalties {
  buchstabe: boolean;
  kategorie: boolean;
  beispiel: boolean;
}

export interface RoundScore {
  base: number;
  lengthBonus: number;
  hintPenalties: HintPenalties;
  hintPenaltyTotal: number;
  wrongGuesses: number;
  guessPenalty: number;
  umlautPartialCount: number;      // how many times player used base letter as partial
  umlautPartialPenalty: number;    // -15% of base per occurrence
  perfectDeutschBonus: number;     // +50 if word has umlauts/ß and player used 0 partials
  timeSeconds: number;
  timeMultiplier: number;
  comboStreak: number;
  comboMultiplier: number;
  total: number;
}

export interface SessionScore {
  totalPoints: number;
  roundsPlayed: number;
  currentCombo: number;
  bestCombo: number;
  bestRound: number;
  averagePoints: number;
  history: RoundScore[];
}
