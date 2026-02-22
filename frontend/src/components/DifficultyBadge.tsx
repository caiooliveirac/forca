import { useEffect, useState } from 'react';

interface DifficultyBadgeProps {
  difficulty: 1 | 2 | 3 | 4 | 5;
}

const DIFFICULTY_CONFIG: Record<
  number,
  { label: string; colorClass: string }
> = {
  1: { label: 'Sehr leicht', colorClass: 'text-green-400' },
  2: { label: 'Leicht', colorClass: 'text-lime-400' },
  3: { label: 'Mittel', colorClass: 'text-amber-400' },
  4: { label: 'Schwer', colorClass: 'text-orange-400' },
  5: { label: 'Sehr schwer', colorClass: 'text-red-400' },
};

export const DifficultyBadge = ({ difficulty }: DifficultyBadgeProps) => {
  const config = DIFFICULTY_CONFIG[difficulty];
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(t);
  }, [difficulty]);

  return (
    <div
      className="flex items-center gap-2 font-body text-base px-4 py-1.5 rounded-full border border-dashed border-chalk/20"
      aria-label={`Schwierigkeit: ${config.label} (${difficulty} von 5)`}
      data-testid="difficulty-badge"
    >
      <span className={`text-lg ${config.colorClass} ${pulse ? 'animate-pulse-star' : ''}`}>
        {'★'.repeat(difficulty)}
        {'☆'.repeat(5 - difficulty)}
      </span>
      <span className="text-chalk-dim text-sm">{config.label}</span>
    </div>
  );
};
