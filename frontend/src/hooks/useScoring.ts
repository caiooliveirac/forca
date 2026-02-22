import { useState, useCallback, useRef, useEffect } from 'react';
import type { RoundScore, SessionScore, HintPenalties } from '../types';
import { saveRound } from '../lib/gameApi';
import type { RoundData } from '../lib/gameApi';

const SESSION_KEY = 'galgenspiel-session-score';
const BEST_KEY = 'galgenspiel-best-score';

const createEmptySession = (): SessionScore => ({
  totalPoints: 0,
  roundsPlayed: 0,
  currentCombo: 0,
  bestCombo: 0,
  bestRound: 0,
  averagePoints: 0,
  history: [],
});

const loadSession = (): SessionScore => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SessionScore;
      // Don't restore combo between sessions
      return { ...parsed, currentCombo: 0 };
    }
  } catch {
    // ignore
  }
  return createEmptySession();
};

const saveSession = (session: SessionScore): void => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const loadBestScore = (): number => {
  try {
    const stored = localStorage.getItem(BEST_KEY);
    if (stored) return Number(stored);
  } catch {
    // ignore
  }
  return 0;
};

const saveBestScore = (score: number): void => {
  localStorage.setItem(BEST_KEY, String(score));
};

export const getTimeMultiplier = (seconds: number): number => {
  if (seconds < 30) return 1.4;
  if (seconds < 60) return 1.2;
  if (seconds < 90) return 1.0;
  if (seconds < 120) return 0.9;
  return 0.8;
};

export const getComboMultiplier = (combo: number): number => {
  if (combo <= 1) return 1.0;
  if (combo === 2) return 1.2;
  if (combo === 3) return 1.5;
  if (combo === 4) return 1.8;
  return 2.0; // 5+
};

export const calculateRoundScore = (
  difficulty: number,
  wordLength: number,
  hintPenalties: HintPenalties,
  wrongGuesses: number,
  timeSeconds: number,
  comboStreak: number,
  umlautPartialCount: number = 0,
  wordHasUmlauts: boolean = false,
): RoundScore => {
  const base = difficulty * 100;
  const lengthBonus = wordLength * 15;

  // Hint penalties
  let hintPenaltyTotal = 0;
  if (hintPenalties.buchstabe) hintPenaltyTotal += base * 0.30;
  if (hintPenalties.beispiel) hintPenaltyTotal += base * 0.20;
  if (hintPenalties.kategorie) hintPenaltyTotal += base * 0.10;
  hintPenaltyTotal = Math.round(hintPenaltyTotal);

  // Wrong guess penalty
  const guessPenalty = Math.round(base * (wrongGuesses * 0.05));

  // Umlaut partial penalty: -15% of base per occurrence
  const umlautPartialPenalty = Math.round(base * umlautPartialCount * 0.15);

  // Perfektes Deutsch bonus: +50 if word has umlauts/ß and player used 0 partials
  const perfectDeutschBonus = (wordHasUmlauts && umlautPartialCount === 0) ? 50 : 0;

  // Adjusted subtotal (min 10)
  const subtotal = base + lengthBonus + perfectDeutschBonus;
  const adjusted = Math.max(10, subtotal - hintPenaltyTotal - guessPenalty - umlautPartialPenalty);

  // Multipliers
  const timeMultiplier = getTimeMultiplier(timeSeconds);
  const comboMultiplier = getComboMultiplier(comboStreak);

  const total = Math.round(adjusted * timeMultiplier * comboMultiplier);

  return {
    base,
    lengthBonus,
    hintPenalties,
    hintPenaltyTotal,
    wrongGuesses,
    guessPenalty,
    umlautPartialCount,
    umlautPartialPenalty,
    perfectDeutschBonus,
    timeSeconds,
    timeMultiplier,
    comboStreak,
    comboMultiplier,
    total,
  };
};

export const useScoring = () => {
  const [session, setSession] = useState<SessionScore>(loadSession);
  const [bestScore, setBestScore] = useState<number>(loadBestScore);
  const [lastRound, setLastRound] = useState<RoundScore | null>(null);

  // Timer
  const startTimeRef = useRef<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerActiveRef = useRef(true);

  useEffect(() => {
    const interval = setInterval(() => {
      if (timerActiveRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const stopTimer = useCallback(() => {
    timerActiveRef.current = false;
  }, []);

  const resetTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    timerActiveRef.current = true;
  }, []);

  const getElapsedSeconds = useCallback(() => {
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }, []);

  // Record a win
  const recordWin = useCallback(
    (
      difficulty: number,
      wordLength: number,
      hintPenalties: HintPenalties,
      wrongGuesses: number,
      umlautPartialCount: number = 0,
      wordHasUmlauts: boolean = false,
      meta?: { wordId: string; word: string; isLoggedIn: boolean },
    ) => {
      const timeSeconds = getElapsedSeconds();
      const newCombo = session.currentCombo + 1;
      const roundScore = calculateRoundScore(
        difficulty,
        wordLength,
        hintPenalties,
        wrongGuesses,
        timeSeconds,
        newCombo,
        umlautPartialCount,
        wordHasUmlauts,
      );

      setLastRound(roundScore);

      setSession((prev) => {
        const newTotal = prev.totalPoints + roundScore.total;
        const newRoundsPlayed = prev.roundsPlayed + 1;
        const newBestCombo = Math.max(prev.bestCombo, newCombo);
        const newBestRound = Math.max(prev.bestRound, roundScore.total);
        const newAvg = Math.round(newTotal / newRoundsPlayed);
        const newHistory = [...prev.history, roundScore];

        const newSession: SessionScore = {
          totalPoints: newTotal,
          roundsPlayed: newRoundsPlayed,
          currentCombo: newCombo,
          bestCombo: newBestCombo,
          bestRound: newBestRound,
          averagePoints: newAvg,
          history: newHistory,
        };
        saveSession(newSession);
        return newSession;
      });

      // Update best score
      setBestScore((prev) => {
        const newTotal = session.totalPoints + roundScore.total;
        if (newTotal > prev) {
          saveBestScore(newTotal);
          return newTotal;
        }
        return prev;
      });

      stopTimer();

      // Persist to backend if logged in
      if (meta?.isLoggedIn) {
        const roundData: RoundData = {
          wordId: meta.wordId,
          word: meta.word,
          won: true,
          score: roundScore.total,
          difficulty,
          wrongGuesses,
          timeSeconds,
          hintsUsed: {
            buchstabe: hintPenalties.buchstabe,
            kategorie: hintPenalties.kategorie,
            beispiel: hintPenalties.beispiel,
          },
          usedPartialUmlauts: umlautPartialCount > 0,
          comboAtTime: newCombo,
        };
        saveRound(roundData).catch((err) =>
          console.error('Failed to save round:', err),
        );
      }
    },
    [session.currentCombo, session.totalPoints, getElapsedSeconds, stopTimer],
  );

  // Record a loss (breaks combo, no points)
  const recordLoss = useCallback(
    (meta?: { wordId: string; word: string; difficulty: number; wrongGuesses: number; isLoggedIn: boolean; hintPenalties: HintPenalties }) => {
    setLastRound(null);

    const timeSeconds = getElapsedSeconds();

    setSession((prev) => {
      const newSession: SessionScore = {
        ...prev,
        currentCombo: 0,
      };
      saveSession(newSession);
      return newSession;
    });

    stopTimer();

    // Persist to backend if logged in
    if (meta?.isLoggedIn) {
      const roundData: RoundData = {
        wordId: meta.wordId,
        word: meta.word,
        won: false,
        score: 0,
        difficulty: meta.difficulty,
        wrongGuesses: meta.wrongGuesses,
        timeSeconds,
        hintsUsed: {
          buchstabe: meta.hintPenalties.buchstabe,
          kategorie: meta.hintPenalties.kategorie,
          beispiel: meta.hintPenalties.beispiel,
        },
        usedPartialUmlauts: false,
        comboAtTime: 0,
      };
      saveRound(roundData).catch((err) =>
        console.error('Failed to save round:', err),
      );
    }
  }, [stopTimer, getElapsedSeconds]);

  const resetSessionScore = useCallback(() => {
    const empty = createEmptySession();
    setSession(empty);
    setLastRound(null);
    saveSession(empty);
  }, []);

  return {
    session,
    bestScore,
    lastRound,
    elapsedSeconds,
    recordWin,
    recordLoss,
    resetTimer,
    stopTimer,
    resetSessionScore,
  };
};
