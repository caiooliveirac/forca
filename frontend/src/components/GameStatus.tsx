import { useState, useEffect } from 'react';
import type { GameStats, Word, RoundScore } from '../types';

interface GameStatusProps {
  status: 'playing' | 'won' | 'lost';
  word: Word | null;
  stats: GameStats;
  onNextWord: () => void;
  roundScore?: RoundScore | null;
  combo?: number;
  totalPoints?: number;
  umlautPartialCount?: number;
}

const ConfettiPiece = ({
  color,
}: {
  color: string;
}) => {
  const left = Math.random() * 100;
  const delay = Math.random() * 2;
  const size = Math.random() * 8 + 4;

  return (
    <div
      className="fixed animate-confetti pointer-events-none"
      style={{
        left: `${left}%`,
        top: '-20px',
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '0%',
        animationDelay: `${delay}s`,
        zIndex: 100,
      }}
    />
  );
};

export const GameStatus = ({
  status,
  word,
  stats,
  onNextWord,
  roundScore,
  combo: _combo,
  totalPoints = 0,
  umlautPartialCount = 0,
}: GameStatusProps) => {
  const [showModal, setShowModal] = useState(false);

  const isGameOver = status !== 'playing' && word != null;

  useEffect(() => {
    if (isGameOver) {
      const timer = setTimeout(() => setShowModal(true), 1500);
      return () => clearTimeout(timer);
    }
    setShowModal(false);
  }, [isGameOver]);

  if (!isGameOver) return null;

  const isWin = status === 'won';
  const confettiColors = [
    '#f59e0b',
    '#22c55e',
    '#3b82f6',
    '#ef4444',
    '#a855f7',
    '#ec4899',
  ];

  const articleColor =
    word.article === 'der'
      ? 'text-blue-400'
      : word.article === 'die'
        ? 'text-pink-400'
        : word.article === 'das'
          ? 'text-green-400'
          : 'text-chalk';

  const winRate =
    stats.totalGames > 0
      ? Math.round((stats.wins / stats.totalGames) * 100)
      : 0;

  return (
    <>
      {/* Confetti */}
      {isWin &&
        Array.from({ length: 30 }).map((_, i) => (
          <ConfettiPiece
            key={i}
            color={confettiColors[i % confettiColors.length]}
          />
        ))}

      {/* Overlay — delayed 1.5s so player can see hangman animation */}
      {showModal && (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-modal-backdrop">
        <div
          className="bg-slate-800/95 chalkboard-frame rounded-2xl p-6 md:p-8 max-w-md w-full animate-modal-enter shadow-2xl"
          role="dialog"
          aria-label={isWin ? 'Gewonnen!' : 'Verloren!'}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="font-chalk text-3xl md:text-4xl mb-2">
              {isWin ? (
                <span className="text-success">Richtig! 🎉</span>
              ) : (
                <span className="text-error">Schade! 😔</span>
              )}
            </h2>
          </div>

          {/* Word info */}
          <div className="bg-board-dark/50 rounded-xl p-4 mb-6 space-y-2">
            <div className="text-center">
              <span className={`font-chalk text-lg ${articleColor}`}>
                {word.article ? `${word.article} ` : ''}
              </span>
              <span className="font-chalk text-2xl text-chalk">
                {word.word}
              </span>
            </div>
            <div className="text-center text-chalk-dim text-sm font-body space-y-1">
              <p>🇧🇷 {word.translation.pt}</p>
              <p>🇬🇧 {word.translation.en}</p>
            </div>
            <p className="text-chalk/60 text-xs italic text-center font-body mt-2">
              „{word.example}"
            </p>
            {/* Educational tip when partials were used */}
            {umlautPartialCount > 0 && (
              <p className="text-amber-400/80 text-xs text-center font-body mt-2 bg-amber-400/5 rounded px-2 py-1">
                💡 Tipp: Umlaute (Ä, Ö, Ü) und ß sind eigene Buchstaben im Deutschen!
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { label: 'Spiele', value: stats.totalGames },
              { label: 'Siege', value: `${winRate}%` },
              { label: 'Serie', value: stats.currentStreak },
              { label: 'Beste', value: stats.bestStreak },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-chalk text-xl text-accent">
                  {stat.value}
                </div>
                <div className="text-chalk-dim text-xs font-body">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Score breakdown */}
          {isWin && roundScore ? (() => {
            // Compute running subtotals for the right column
            const afterBase = roundScore.base;
            const afterLength = afterBase + roundScore.lengthBonus;
            const afterHints = afterLength - roundScore.hintPenaltyTotal;
            const afterErrors = afterHints - roundScore.guessPenalty;
            const afterUmlaut = afterErrors - roundScore.umlautPartialPenalty;
            const afterPerfect = afterUmlaut + roundScore.perfectDeutschBonus;
            const adjusted = Math.max(10, afterPerfect);
            const afterTime = Math.round(adjusted * roundScore.timeMultiplier);
            const afterCombo = roundScore.total;

            let delay = 0;
            const nextDelay = () => { const d = delay; delay += 0.15; return d; };

            return (
              <div className="bg-board-dark/40 rounded-lg p-3 mb-4 font-body text-sm">
                {/* Additive section */}
                <div className="space-y-1">
                  <div
                    className="flex justify-between text-chalk-dim animate-score-line"
                    style={{ animationDelay: `${nextDelay()}s` }}
                  >
                    <span>{'★'.repeat(roundScore.base / 100)} Basis</span>
                    <span className="text-chalk tabular-nums">{afterBase}</span>
                  </div>
                  <div
                    className="flex justify-between text-chalk-dim animate-score-line"
                    style={{ animationDelay: `${nextDelay()}s` }}
                  >
                    <span>+ Längenbonus ({Math.round(roundScore.lengthBonus / 15)} Buchst.)</span>
                    <span className="text-chalk tabular-nums">{afterLength}</span>
                  </div>
                  {roundScore.hintPenaltyTotal > 0 && (
                    <div
                      className="flex justify-between text-red-400 animate-score-line"
                      style={{ animationDelay: `${nextDelay()}s` }}
                    >
                      <span>− Hinweise</span>
                      <span className="tabular-nums">{afterHints}</span>
                    </div>
                  )}
                  {roundScore.guessPenalty > 0 && (
                    <div
                      className="flex justify-between text-red-400 animate-score-line"
                      style={{ animationDelay: `${nextDelay()}s` }}
                    >
                      <span>− Fehler ({roundScore.wrongGuesses}×)</span>
                      <span className="tabular-nums">{Math.max(10, afterErrors)}</span>
                    </div>
                  )}
                  {roundScore.umlautPartialPenalty > 0 && (
                    <div
                      className="flex justify-between text-red-400 animate-score-line"
                      style={{ animationDelay: `${nextDelay()}s` }}
                    >
                      <span>− Umlaut-Hilfe ({roundScore.umlautPartialCount}×)</span>
                      <span className="tabular-nums">{Math.max(10, afterUmlaut)}</span>
                    </div>
                  )}
                  {roundScore.perfectDeutschBonus > 0 && (
                    <div
                      className="flex justify-between text-green-400 animate-score-line"
                      style={{ animationDelay: `${nextDelay()}s` }}
                    >
                      <span>+ Perfektes Deutsch! 🇩🇪</span>
                      <span className="tabular-nums">{afterPerfect}</span>
                    </div>
                  )}
                </div>

                {/* Multiplier section */}
                <div className="mt-2 pt-2 border-t border-chalk/5 space-y-1">
                  <div
                    className="flex justify-between text-chalk-dim animate-score-line"
                    style={{ animationDelay: `${nextDelay()}s` }}
                  >
                    <span>
                      {roundScore.timeSeconds < 30 ? '⚡' : roundScore.timeSeconds < 60 ? '🏃' : roundScore.timeSeconds < 90 ? '⏱' : '🐢'}
                      {' '}×{roundScore.timeMultiplier.toFixed(1)} Zeit
                    </span>
                    <span className="text-chalk tabular-nums">{afterTime}</span>
                  </div>
                  {roundScore.comboMultiplier > 1 && (
                    <div
                      className="flex justify-between text-amber-300 animate-score-line"
                      style={{ animationDelay: `${nextDelay()}s` }}
                    >
                      <span>🔥 ×{roundScore.comboMultiplier.toFixed(1)} Combo ({roundScore.comboStreak}× Serie)</span>
                      <span className="tabular-nums">{afterCombo}</span>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="mt-2 pt-2 border-t border-chalk/10 space-y-1">
                  <div
                    className="flex justify-between font-bold text-base animate-score-line animate-score-highlight"
                    style={{ animationDelay: `${nextDelay()}s` }}
                  >
                    <span className="text-amber-300">Diese Runde</span>
                    <span className="text-amber-300 tabular-nums">+{roundScore.total}</span>
                  </div>
                  <div
                    className="flex justify-between font-bold text-base animate-score-line"
                    style={{ animationDelay: `${nextDelay()}s` }}
                  >
                    <span className="text-chalk">🏆 Gesamt</span>
                    <span className="text-chalk tabular-nums">{totalPoints.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })() : !isWin ? (
            <div className="text-center mb-4 py-3 bg-board-dark/40 rounded-lg">
              <span className="text-red-400 font-body text-sm">
                Kein Punkt — Combo verloren! 💔
              </span>
            </div>
          ) : null}

          {/* Next word button */}
          <button
            onClick={onNextWord}
            className="w-full py-3 px-6 bg-transparent border-2 border-dashed border-amber-400/50 hover:border-solid hover:border-amber-400 text-amber-300 font-body font-bold text-lg rounded-xl transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            style={{ textShadow: '0 0 8px rgba(251,191,36,0.3)' }}
            aria-label="Nächstes Wort"
            autoFocus
          >
            Nächstes Wort →
          </button>
        </div>
      </div>
      )}
    </>
  );
};
