import type { HintInfo } from '../types';

interface HintPanelProps {
  hintInfo: HintInfo | null;
  hintCategoryRevealed: boolean;
  hintExampleRevealed: boolean;
  onRevealLetter: () => void;
  onRevealCategory: () => void;
  onRevealExample: () => void;
  disabled: boolean;
}

export const HintPanel = ({
  hintInfo,
  hintCategoryRevealed,
  hintExampleRevealed,
  onRevealLetter,
  onRevealCategory,
  onRevealExample,
  disabled,
}: HintPanelProps) => {
  const btnBase = `
    flex items-center justify-center gap-1.5
    px-3 py-2 rounded-lg font-body text-xs font-semibold
    transition-all duration-200
  `;
  const btnActive = `
    bg-transparent text-amber-300 border border-dashed border-chalk/30
    hover:border-solid hover:border-amber-400/60 cursor-pointer
  `;
  const btnRevealed = `
    bg-amber-400/10 text-amber-300 border border-solid border-amber-400/40
    cursor-default
  `;
  const btnDisabled = `
    bg-transparent text-chalk-dim/30 border border-dashed border-chalk-dim/15
    cursor-default
  `;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Three hint buttons side by side */}
      <div className="flex gap-2">
        {/* Button 1: Reveal a letter */}
        <button
          onClick={onRevealLetter}
          disabled={disabled}
          className={`${btnBase} flex-1 ${disabled ? btnDisabled : btnActive}`}
          aria-label="Einen Buchstaben aufdecken"
        >
          <span>💡</span>
          <span>Buchstabe</span>
        </button>

        {/* Button 2: Reveal category */}
        <button
          onClick={onRevealCategory}
          disabled={disabled || hintCategoryRevealed}
          className={`${btnBase} flex-1 ${
            hintCategoryRevealed
              ? btnRevealed
              : disabled
                ? btnDisabled
                : btnActive
          }`}
          aria-label="Kategorie anzeigen"
        >
          <span>🏷️</span>
          <span>Kategorie</span>
        </button>

        {/* Button 3: Reveal example */}
        <button
          onClick={onRevealExample}
          disabled={disabled || hintExampleRevealed}
          className={`${btnBase} flex-1 ${
            hintExampleRevealed
              ? btnRevealed
              : disabled
                ? btnDisabled
                : btnActive
          }`}
          aria-label="Beispielsatz anzeigen"
        >
          <span>💬</span>
          <span>Beispiel</span>
        </button>
      </div>

      {/* Hint displays */}
      {(hintCategoryRevealed || hintExampleRevealed) && hintInfo && (
        <div className="animate-chalk space-y-2 mt-1">
          {/* Category hint */}
          {hintCategoryRevealed && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
              <span className="text-lg">{hintInfo.categoryIcon}</span>
              <span className="text-accent text-sm font-body">
                {hintInfo.category}
              </span>
            </div>
          )}

          {/* Example hint */}
          {hintExampleRevealed && (
            <div className="px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-chalk/80 text-sm italic font-body">
                „{hintInfo.example}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
