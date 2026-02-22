import { useState, useCallback, useEffect, useRef } from 'react';
import { useHangman } from '../hooks/useHangman';
import { useScoring } from '../hooks/useScoring';
import { useAuth } from '../hooks/useAuth';
import { useGameFilters, GameFiltersBar } from './GameFiltersBar';
import { HangmanFigure } from './HangmanFigure';
import { WordDisplay } from './WordDisplay';
import { Keyboard } from './Keyboard';
import { HintPanel } from './HintPanel';
import { GameStatus } from './GameStatus';
import { DifficultyBadge } from './DifficultyBadge';
import { AuthModal } from './AuthModal';
import { wordHasUmlauts } from '../hooks/useHangman';
import type { HintPenalties } from '../types';

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const Game = () => {
  const { filters, setFilters } = useGameFilters();
  const { user, loading: authLoading, isLoggedIn, signUp, signIn, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const {
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
  } = useHangman(filters);

  const {
    session,
    lastRound,
    elapsedSeconds,
    recordWin,
    recordLoss,
    resetTimer,
  } = useScoring();

  const [transitioning, setTransitioning] = useState(false);
  const scoringDoneRef = useRef(false);

  const hintInfo = getHintInfo();
  const isGameOver =
    gameState.status === 'won' || gameState.status === 'lost';

  // Record score when game ends
  useEffect(() => {
    if (!isGameOver || scoringDoneRef.current) return;
    scoringDoneRef.current = true;

    const word = gameState.currentWord;
    if (!word) return;

    const hintPenalties: HintPenalties = {
      buchstabe: gameState.hintsUsed > 0,
      kategorie: gameState.hintCategoryRevealed,
      beispiel: gameState.hintExampleRevealed,
    };

    const meta = {
      wordId: word.id,
      word: word.word,
      isLoggedIn,
      difficulty: word.difficulty,
      wrongGuesses: gameState.wrongGuesses,
      hintPenalties,
    };

    if (gameState.status === 'won') {
      recordWin(
        word.difficulty,
        word.word.length,
        hintPenalties,
        gameState.wrongGuesses,
        gameState.umlautPartialCount,
        wordHasUmlauts(word.word),
        meta,
      );
    } else {
      recordLoss(meta);
    }
  }, [isGameOver, gameState, recordWin, recordLoss, isLoggedIn]);

  const handleNextWord = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      scoringDoneRef.current = false;
      resetGame();
      resetTimer();
      setTransitioning(false);
    }, 400);
  }, [resetGame, resetTimer]);

  const handleFilterChange = useCallback(
    (newFilters: typeof filters) => {
      setFilters(newFilters);
    },
    [setFilters],
  );

  // Progress bar gradient: green → amber → red based on error ratio
  const errorRatio = gameState.wrongGuesses / gameState.maxAttempts;
  const progressColor =
    errorRatio < 0.35
      ? '#22c55e'
      : errorRatio < 0.65
        ? '#f59e0b'
        : '#ef4444';

  return (
    <div className="min-h-screen chalkboard-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 md:px-8 md:py-4 border-b border-chalk/10">
        <h1
          className="font-chalk text-2xl md:text-4xl text-chalk tracking-wide"
          style={{ textShadow: '0 0 12px rgba(255,255,255,0.15)' }}
        >
          Galgenspiel
        </h1>
        <div className="flex items-center gap-2 md:gap-3 font-body text-sm md:text-base">
          {/* Total points */}
          <span
            className="inline-flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1 text-chalk-dim"
            title="Gesamtpunkte"
          >
            🏆 {session.totalPoints.toLocaleString()}
          </span>

          {/* Combo (only show if >= 2) */}
          {session.currentCombo >= 2 && (
            <span
              className="inline-flex items-center gap-1.5 bg-amber-400/10 rounded-full px-3 py-1 text-amber-300 animate-combo-pulse"
              title={`${session.currentCombo}× Combo`}
            >
              🔥 {session.currentCombo}×
            </span>
          )}

          {/* Timer */}
          <span
            className="inline-flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1 text-chalk-dim tabular-nums"
            title="Zeit"
          >
            ⏱ {formatTime(isGameOver ? (lastRound?.timeSeconds ?? elapsedSeconds) : elapsedSeconds)}
          </span>

          {/* Win rate */}
          <span
            className="inline-flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1 text-chalk-dim"
            title="Siegquote"
          >
            🎮{' '}
            {stats.totalGames > 0
              ? Math.round((stats.wins / stats.totalGames) * 100)
              : 0}
            %
          </span>

          {/* Auth */}
          {isLoggedIn && user ? (
            <span className="inline-flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1 text-chalk-dim">
              🎓 {user.displayName}
              <button
                onClick={signOut}
                className="ml-1 text-chalk-dim/50 hover:text-chalk transition-colors"
                title="Abmelden"
              >
                ✕
              </button>
            </span>
          ) : (
            !authLoading && (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-amber-400/10 hover:bg-amber-400/20 rounded-full px-3 py-1 text-amber-300 transition-colors"
              >
                Anmelden 👤
              </button>
            )
          )}
        </div>
      </header>

      {/* Filters bar */}
      <div className="py-2">
        <GameFiltersBar
          filters={filters}
          onChange={handleFilterChange}
          disabled={gameState.status === 'playing' && gameState.guessedLetters.length > 0}
        />
      </div>

      {/* Main game area — chalkboard frame */}
      <main className="flex-1 flex items-stretch p-3 md:p-6 pt-0 md:pt-0">
        <div
          className={`
            chalkboard-frame rounded-lg flex-1
            flex flex-col lg:flex-row gap-4 md:gap-6
            p-4 md:p-8 max-w-6xl mx-auto w-full
            ${transitioning ? 'animate-board-shake' : ''}
          `}
        >
          {/* Left column: Hangman + progress */}
          <div
            className={`
              flex flex-col items-center gap-4
              lg:w-[40%] lg:justify-center
              ${transitioning ? 'animate-fade-up-out' : 'animate-fade-up-in'}
            `}
          >
            <div className="w-full max-h-[240px] lg:max-h-none flex items-center justify-center">
              <HangmanFigure
                key={gameState.currentWord?.id ?? ''}
                wrongGuesses={gameState.wrongGuesses}
                isLost={gameState.status === 'lost'}
                isWon={gameState.status === 'won'}
              />
            </div>

            {/* Themed progress bar */}
            <div className="w-full max-w-[280px]">
              <div className="text-xs text-chalk-dim font-body mb-1.5 text-center">
                {gameState.wrongGuesses}/{gameState.maxAttempts} Fehler
                &nbsp;·&nbsp;
                {revealedPercentage}% gelöst
              </div>
              <div
                className="h-2 border border-dashed border-chalk/20 overflow-hidden"
                style={{ background: 'transparent' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(gameState.wrongGuesses / gameState.maxAttempts) * 100}%`,
                    backgroundColor: progressColor,
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right column: Difficulty + Word + Hints + Keyboard */}
          <div
            className={`
              flex flex-col items-center justify-center gap-4 md:gap-5
              lg:w-[60%]
              ${transitioning ? 'animate-fade-up-out' : 'animate-fade-up-in'}
            `}
          >
            {/* Difficulty badge */}
            {gameState.currentWord && (
              <DifficultyBadge
                difficulty={gameState.currentWord.difficulty}
              />
            )}

            {/* Word display */}
            <div className="w-full flex justify-center">
              <WordDisplay
                revealedWord={revealedWord}
                fullWord={gameState.currentWord?.word ?? ''}
                article={gameState.currentWord?.article ?? null}
                status={gameState.status}
                partialPositions={gameState.partialLetters}
              />
            </div>

            {/* Hint buttons + revealed hints */}
            <div className="w-full max-w-lg">
              <HintPanel
                hintInfo={hintInfo}
                hintCategoryRevealed={gameState.hintCategoryRevealed}
                hintExampleRevealed={gameState.hintExampleRevealed}
                onRevealLetter={useHint}
                onRevealCategory={revealCategory}
                onRevealExample={revealExample}
                disabled={isGameOver}
              />
            </div>

            {/* Keyboard */}
            <div className="w-full max-w-lg">
              <Keyboard
                guessedLetters={gameState.guessedLetters}
                correctLetters={correctLetters}
                wrongLetters={wrongLetters}
                partialBaseLetters={gameState.partialBaseLetters}
                onGuess={guessLetter}
                disabled={isGameOver}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Game end overlay */}
      <GameStatus
        status={gameState.status}
        word={gameState.currentWord}
        stats={stats}
        onNextWord={handleNextWord}
        roundScore={lastRound}
        combo={session.currentCombo}
        totalPoints={session.totalPoints}
        umlautPartialCount={gameState.umlautPartialCount}
      />

      {/* Auth modal */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSignUp={signUp}
        onSignIn={signIn}
      />
    </div>
  );
};
