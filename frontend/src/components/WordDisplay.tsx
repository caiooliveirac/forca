import { useEffect, useState } from 'react';

interface WordDisplayProps {
  revealedWord: string[];
  fullWord: string;
  article: 'der' | 'die' | 'das' | null;
  status: 'playing' | 'won' | 'lost';
  partialPositions?: Record<number, string>; // position → base letter for amber partial state
}

export const WordDisplay = ({
  revealedWord,
  fullWord,
  article,
  status,
  partialPositions = {},
}: WordDisplayProps) => {
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(
    new Set(),
  );
  const [winAnimating, setWinAnimating] = useState(false);

  useEffect(() => {
    if (status === 'won') {
      setWinAnimating(true);
      const timeout = setTimeout(() => setWinAnimating(false), 1500);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  useEffect(() => {
    const newRevealed = revealedWord.reduce<number[]>((acc, letter, i) => {
      if (letter !== '_') acc.push(i);
      return acc;
    }, []);

    if (newRevealed.length > 0) {
      setAnimatingIndices(new Set(newRevealed));
      const timeout = setTimeout(() => setAnimatingIndices(new Set()), 400);
      return () => clearTimeout(timeout);
    }
  }, [revealedWord.join('')]);

  const articleColor =
    article === 'der'
      ? 'text-blue-400'
      : article === 'die'
        ? 'text-pink-400'
        : article === 'das'
          ? 'text-green-400'
          : '';

  return (
    <div className="flex flex-col items-center gap-3" aria-live="polite">
      {/* Article display */}
      {article && status !== 'playing' && (
        <span
          className={`font-chalk text-2xl md:text-3xl ${articleColor} animate-chalk`}
          style={{ textShadow: '0 0 8px rgba(255,255,255,0.25)' }}
        >
          {article}
        </span>
      )}

      {/* Word display */}
      <div
        className="flex flex-wrap justify-center gap-2 md:gap-3"
        role="status"
        aria-label={`Palavra: ${revealedWord.join(' ')}`}
      >
        {revealedWord.map((letter, index) => {
          const isRevealed = letter !== '_';
          const isPartial = index in partialPositions;
          const isMissing = status === 'lost' && !isRevealed && !isPartial;
          const fullLetter = fullWord[index]?.toUpperCase() ?? '';
          const isAnimating = animatingIndices.has(index);

          // Determine display character and styles for 3 states
          let displayChar = '\u00A0';
          let textColor: string | undefined;
          let textShadow: string | undefined;
          let borderStyle: string;
          let extraClass = '';

          if (isPartial && status === 'playing') {
            // Partial state: show the special character in amber with pulse
            displayChar = fullLetter;
            textColor = '#f59e0b';
            textShadow = '0 0 10px rgba(245,158,11,0.4)';
            borderStyle = '2px solid rgba(245,158,11,0.5)';
            extraClass = 'animate-partial-pulse';
          } else if (isRevealed) {
            displayChar = letter;
            textColor = '#F5F0E6';
            textShadow = '0 0 8px rgba(255,255,255,0.3)';
            borderStyle = '2px solid rgba(245,240,230,0.4)';
          } else if (isMissing) {
            displayChar = fullLetter;
            borderStyle = '2px dashed rgba(239,68,68,0.5)';
          } else if (isPartial && status !== 'playing') {
            // Game ended while partial — show as revealed
            displayChar = fullLetter;
            textColor = '#F5F0E6';
            textShadow = '0 0 8px rgba(255,255,255,0.3)';
            borderStyle = '2px solid rgba(245,240,230,0.4)';
          } else {
            borderStyle = '2px dashed rgba(245,240,230,0.25)';
          }

          return (
            <span
              key={`${index}-${letter}-${isPartial}`}
              className={`
                inline-flex items-center justify-center
                w-10 h-12 md:w-14 md:h-16
                text-[2rem] md:text-[3rem] font-chalk
                transition-all duration-300
                ${isMissing ? 'text-error' : ''}
                ${isAnimating && !isPartial ? 'animate-fade-in-scale' : ''}
                ${winAnimating ? 'animate-bounce-letter' : ''}
                ${extraClass}
              `}
              style={{
                color: textColor,
                textShadow,
                borderBottom: borderStyle,
                ...(winAnimating ? { animationDelay: `${index * 80}ms` } : {}),
              }}
            >
              {displayChar}
            </span>
          );
        })}
      </div>
    </div>
  );
};
