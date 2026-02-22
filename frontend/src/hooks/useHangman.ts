import { useState, useCallback, useEffect } from 'react';
import type { GameState, GameStats, Word, HintInfo, GameFilters } from '../types';
import {
  getRandomWord,
  getCategoryById,
  maskWordInExample,
} from '../utils/wordUtils';

const STATS_KEY = 'galgenspiel_stats';
const MAX_ATTEMPTS = 8;

// Umlaut partial matching maps
const BASE_TO_SPECIAL: Record<string, string> = { a: 'ä', o: 'ö', u: 'ü', s: 'ß' };
const SPECIAL_TO_BASE: Record<string, string> = { ä: 'a', ö: 'o', ü: 'u', ß: 's' };

/** Check if a word contains any umlaut or ß */
export const wordHasUmlauts = (word: string): boolean =>
  /[äöüß]/i.test(word);

/** Exact-match revealed word (no normalization) */
const getExactRevealedWord = (word: string, guessedLetters: string[]): string[] =>
  word.split('').map((letter) =>
    guessedLetters.includes(letter.toLowerCase()) ? letter.toUpperCase() : '_',
  );

/** Exact-match win check (every unique letter must be in guessedLetters, no normalization) */
const isWordFullyGuessedExact = (word: string, guessedLetters: string[]): boolean => {
  const uniqueLetters = [...new Set(word.toLowerCase().split(''))];
  return uniqueLetters.every((letter) => guessedLetters.includes(letter));
};

const loadStats = (): GameStats => {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (stored) {
      return JSON.parse(stored) as GameStats;
    }
  } catch {
    // ignore
  }
  return {
    totalGames: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    bestStreak: 0,
    averageGuesses: 0,
  };
};

const saveStats = (stats: GameStats): void => {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

const createInitialGameState = (word: Word): GameState => ({
  currentWord: word,
  guessedLetters: [],
  wrongGuesses: 0,
  maxAttempts: MAX_ATTEMPTS,
  status: 'playing',
  hintsUsed: 0,
  hintCategoryRevealed: false,
  hintExampleRevealed: false,
  partialLetters: {},
  partialBaseLetters: [],
  umlautPartialCount: 0,
});

export const useHangman = (filters?: GameFilters) => {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState(getRandomWord(filters)),
  );
  const [stats, setStats] = useState<GameStats>(loadStats);

  useEffect(() => {
    saveStats(stats);
  }, [stats]);

  const correctLetters = gameState.currentWord
    ? gameState.guessedLetters.filter((letter) =>
        gameState.currentWord!.word
          .toLowerCase()
          .split('')
          .some((wl) => wl === letter),
      )
    : [];

  const wrongLetters = gameState.guessedLetters.filter(
    (letter) => !correctLetters.includes(letter),
  );

  const revealedWord = gameState.currentWord
    ? getExactRevealedWord(gameState.currentWord.word, gameState.guessedLetters)
    : [];

  const revealedPercentage = gameState.currentWord
    ? Math.round(
        (revealedWord.filter((l) => l !== '_').length /
          gameState.currentWord.word.length) *
          100,
      )
    : 0;

  const guessLetter = useCallback(
    (letter: string) => {
      setGameState((prev) => {
        if (prev.status !== 'playing' || !prev.currentWord) return prev;

        const normalizedLetter = letter.toLowerCase();

        // Already guessed exact or already an active partial base
        if (prev.guessedLetters.includes(normalizedLetter)) return prev;
        if (prev.partialBaseLetters.includes(normalizedLetter)) return prev;

        const wordLower = prev.currentWord.word.toLowerCase();
        const wordLetters = wordLower.split('');

        // 1) Exact match (no normalization)
        const hasExactMatch = wordLetters.some((wl) => wl === normalizedLetter);

        // 2) Partial match: base letter (a/o/u/s) → special char in word
        const specialChar = BASE_TO_SPECIAL[normalizedLetter];
        const hasSpecialMatch = specialChar
          ? wordLetters.some((wl) => wl === specialChar)
          : false;

        // 3) Completing a partial: player clicked special char whose base was partial
        const baseChar = SPECIAL_TO_BASE[normalizedLetter];
        const isCompletingPartial = baseChar
          ? prev.partialBaseLetters.includes(baseChar)
          : false;

        if (hasExactMatch || isCompletingPartial) {
          // ── Correct guess or partial completion ──
          const newGuessedLetters = [...prev.guessedLetters, normalizedLetter];
          let newPartialLetters = { ...prev.partialLetters };
          let newPartialBaseLetters = [...prev.partialBaseLetters];

          // Clear partial positions if completing
          if (isCompletingPartial && baseChar) {
            newPartialLetters = Object.fromEntries(
              Object.entries(newPartialLetters).filter(([, base]) => base !== baseChar),
            );
            newPartialBaseLetters = newPartialBaseLetters.filter((b) => b !== baseChar);
          }

          // If this base letter ALSO creates new partials for special chars
          if (hasSpecialMatch && specialChar) {
            wordLetters.forEach((wl, idx) => {
              if (wl === specialChar) {
                newPartialLetters[idx] = normalizedLetter;
              }
            });
            if (!newPartialBaseLetters.includes(normalizedLetter)) {
              newPartialBaseLetters.push(normalizedLetter);
            }
          }

          // Win: all letters guessed exactly AND no partials remain
          const hasWon =
            isWordFullyGuessedExact(wordLower, newGuessedLetters) &&
            Object.keys(newPartialLetters).length === 0;

          return {
            ...prev,
            guessedLetters: newGuessedLetters,
            status: hasWon ? 'won' : prev.status,
            partialLetters: newPartialLetters,
            partialBaseLetters: newPartialBaseLetters,
            // umlautPartialCount only increases for new partials created this turn
            umlautPartialCount:
              prev.umlautPartialCount +
              (hasSpecialMatch && specialChar ? 1 : 0),
          };
        } else if (hasSpecialMatch && specialChar) {
          // ── Pure partial: base letter, no exact match ──
          const newPartialLetters = { ...prev.partialLetters };
          const newPartialBaseLetters = [...prev.partialBaseLetters];

          wordLetters.forEach((wl, idx) => {
            if (wl === specialChar) {
              newPartialLetters[idx] = normalizedLetter;
            }
          });
          if (!newPartialBaseLetters.includes(normalizedLetter)) {
            newPartialBaseLetters.push(normalizedLetter);
          }

          // NOT an error, NOT added to guessedLetters
          return {
            ...prev,
            partialLetters: newPartialLetters,
            partialBaseLetters: newPartialBaseLetters,
            umlautPartialCount: prev.umlautPartialCount + 1,
          };
        } else {
          // ── No match at all: error ──
          const newGuessedLetters = [...prev.guessedLetters, normalizedLetter];
          const newWrongGuesses = prev.wrongGuesses + 1;
          const hasLost = newWrongGuesses >= prev.maxAttempts;

          return {
            ...prev,
            guessedLetters: newGuessedLetters,
            wrongGuesses: newWrongGuesses,
            status: hasLost ? 'lost' : prev.status,
          };
        }
      });
    },
    [],
  );

  // Update stats when game ends
  useEffect(() => {
    if (gameState.status === 'won' || gameState.status === 'lost') {
      setStats((prev) => {
        const isWin = gameState.status === 'won';
        const newCurrentStreak = isWin ? prev.currentStreak + 1 : 0;
        const newBestStreak = Math.max(prev.bestStreak, newCurrentStreak);
        const totalGuesses =
          prev.averageGuesses * prev.totalGames +
          gameState.guessedLetters.length;
        const newTotalGames = prev.totalGames + 1;
        const newAverageGuesses = Math.round(totalGuesses / newTotalGames);

        return {
          totalGames: newTotalGames,
          wins: prev.wins + (isWin ? 1 : 0),
          losses: prev.losses + (isWin ? 0 : 1),
          currentStreak: newCurrentStreak,
          bestStreak: newBestStreak,
          averageGuesses: newAverageGuesses,
        };
      });
    }
  }, [gameState.status, gameState.guessedLetters.length]);

  const useHint = useCallback(() => {
    setGameState((prev) => {
      if (prev.status !== 'playing' || !prev.currentWord) return prev;
      // Reveal a random unrevealed letter (exact match, preserves umlauts)
      const word = prev.currentWord.word.toLowerCase();
      const unrevealed = word.split('').filter(
        (letter) => !prev.guessedLetters.includes(letter),
      );
      if (unrevealed.length === 0) return prev;
      const hintLetter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      const newGuessedLetters = [...prev.guessedLetters, hintLetter];

      // If the hint reveals a special char, clear any partials for it
      const baseChar = SPECIAL_TO_BASE[hintLetter];
      let newPartialLetters = prev.partialLetters;
      let newPartialBaseLetters = prev.partialBaseLetters;
      if (baseChar && prev.partialBaseLetters.includes(baseChar)) {
        newPartialLetters = Object.fromEntries(
          Object.entries(prev.partialLetters).filter(([, base]) => base !== baseChar),
        );
        newPartialBaseLetters = prev.partialBaseLetters.filter((b) => b !== baseChar);
      }

      const hasWon =
        isWordFullyGuessedExact(word, newGuessedLetters) &&
        Object.keys(newPartialLetters).length === 0;

      return {
        ...prev,
        guessedLetters: newGuessedLetters,
        hintsUsed: prev.hintsUsed + 1,
        status: hasWon ? 'won' : prev.status,
        partialLetters: newPartialLetters,
        partialBaseLetters: newPartialBaseLetters,
      };
    });
  }, []);

  const revealCategory = useCallback(() => {
    setGameState((prev) => {
      if (prev.status !== 'playing' || prev.hintCategoryRevealed) return prev;
      return { ...prev, hintCategoryRevealed: true };
    });
  }, []);

  const revealExample = useCallback(() => {
    setGameState((prev) => {
      if (prev.status !== 'playing' || prev.hintExampleRevealed) return prev;
      return { ...prev, hintExampleRevealed: true };
    });
  }, []);

  const getHintInfo = useCallback((): HintInfo | null => {
    if (!gameState.currentWord) return null;
    const category = getCategoryById(gameState.currentWord.category);
    return {
      category: category?.name ?? gameState.currentWord.category,
      categoryIcon: category?.icon ?? '📝',
      example: maskWordInExample(
        gameState.currentWord.example,
        gameState.currentWord.word,
      ),
    };
  }, [gameState.currentWord]);

  const resetGame = useCallback(() => {
    const newWord = getRandomWord(filters);
    setGameState(createInitialGameState(newWord));
  }, [filters]);

  const initGame = useCallback(() => {
    resetGame();
  }, [resetGame]);

  return {
    gameState,
    stats,
    correctLetters,
    wrongLetters,
    revealedWord,
    revealedPercentage,
    guessLetter,
    useHint,
    revealCategory,
    revealExample,
    getHintInfo,
    resetGame,
    initGame,
  };
};
