import { useEffect, useCallback } from 'react';

interface KeyboardProps {
  guessedLetters: string[];
  correctLetters: string[];
  wrongLetters: string[];
  partialBaseLetters?: string[];   // base letters in partial state (e.g. ['a'] when word has 'ä')
  onGuess: (letter: string) => void;
  disabled: boolean;
}

const QWERTZ_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
  ['ß', 'Y', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const PHYSICAL_TO_GERMAN: Record<string, string> = {
  y: 'Z',
  z: 'Y',
};

// Map special chars back to base for keyboard highlighting
const SPECIAL_TO_BASE_KEY: Record<string, string> = { ä: 'a', ö: 'o', ü: 'u', ß: 's' };

export const Keyboard = ({
  guessedLetters,
  correctLetters,
  wrongLetters,
  partialBaseLetters = [],
  onGuess,
  disabled,
}: KeyboardProps) => {
  const isGuessed = (letter: string) =>
    guessedLetters.includes(letter.toLowerCase());
  const isCorrect = (letter: string) =>
    correctLetters.includes(letter.toLowerCase());
  const isWrong = (letter: string) =>
    wrongLetters.includes(letter.toLowerCase());
  const isPartialBase = (letter: string) =>
    partialBaseLetters.includes(letter.toLowerCase());
  const isPartialHintTarget = (letter: string) => {
    // This special key should pulse if its corresponding base letter is partial
    const base = SPECIAL_TO_BASE_KEY[letter.toLowerCase()];
    return base ? partialBaseLetters.includes(base) : false;
  };

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;
      const key = event.key.toUpperCase();

      // Map physical keyboard Y/Z for QWERTZ
      const mapped = PHYSICAL_TO_GERMAN[event.key.toLowerCase()] ?? key;

      const allLetters = QWERTZ_LAYOUT.flat();
      if (allLetters.includes(mapped)) {
        event.preventDefault();
        const lower = mapped.toLowerCase();
        if (!isGuessed(mapped) && !partialBaseLetters.includes(lower)) {
          onGuess(lower);
        }
      }
    },
    [disabled, onGuess, guessedLetters, partialBaseLetters],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const getKeyClass = (letter: string): string => {
    const base =
      'inline-flex items-center justify-center rounded font-body font-semibold transition-all duration-150 select-none focus:outline-none focus:ring-1 focus:ring-chalk/30';
    const size =
      'min-w-[32px] h-11 px-1.5 text-sm md:min-w-[44px] md:h-12 md:px-2.5 md:text-base';

    if (isCorrect(letter)) {
      return `${base} ${size} bg-success/15 text-success border border-success/50 cursor-default`;
    }
    if (isWrong(letter)) {
      return `${base} ${size} bg-error/15 text-error/60 border border-error/40 opacity-60 cursor-default`;
    }
    if (isPartialBase(letter)) {
      // Base letter in partial state: amber, disabled-looking
      return `${base} ${size} bg-amber-500/15 text-amber-400 border border-amber-500/50 cursor-default`;
    }
    if (isPartialHintTarget(letter)) {
      // Special key that should pulse to guide player
      return `${base} ${size} bg-transparent text-amber-300 border border-solid border-amber-400/60 hover:border-amber-400 hover:text-amber-200 cursor-pointer animate-key-hint-pulse`;
    }
    if (isGuessed(letter)) {
      return `${base} ${size} bg-transparent text-chalk-dim/40 border border-dashed border-chalk-dim/15 cursor-default`;
    }
    return `${base} ${size} bg-transparent text-chalk-worn border border-dashed border-chalk/25 hover:border-solid hover:border-chalk/50 hover:text-chalk cursor-pointer active:animate-key-press`;
  };

  return (
    <div className="flex flex-col items-center gap-1.5 md:gap-2" role="group" aria-label="Tastatur">
      {QWERTZ_LAYOUT.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1 md:gap-1.5 justify-center">
          {row.map((letter) => {
            const isDisabledKey = disabled || isGuessed(letter) || isPartialBase(letter);
            return (
              <button
                key={letter}
                className={getKeyClass(letter)}
                onClick={() => onGuess(letter.toLowerCase())}
                disabled={isDisabledKey}
                aria-label={`Buchstabe ${letter}${isCorrect(letter) ? ', richtig' : isWrong(letter) ? ', falsch' : isPartialBase(letter) ? ', teilweise' : isPartialHintTarget(letter) ? ', Umlaut-Hinweis' : ''}`}
                aria-disabled={isDisabledKey}
              >
                {letter}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
