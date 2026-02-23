import { useState, useEffect, useMemo } from 'react';
import type { GameFilters as GameFiltersType, Category, CEFRLevel } from '../types';
import { getAllCategories, getFilteredWords, CEFR_LEVELS } from '../utils/wordUtils';

const FILTERS_KEY = 'galgenspiel-filters';

const loadFilters = (): GameFiltersType => {
  try {
    const stored = localStorage.getItem(FILTERS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as GameFiltersType;
      // Migration: add levels if missing from old stored data
      if (!parsed.levels) parsed.levels = [];
      return parsed;
    }
  } catch {
    // ignore
  }
  return { levels: [], difficulties: [], categories: [] };
};

const saveFilters = (filters: GameFiltersType): void => {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
};

interface GameFiltersBarProps {
  filters: GameFiltersType;
  onChange: (filters: GameFiltersType) => void;
  disabled?: boolean;
}

const DIFFICULTY_LABELS = [
  { level: 1, label: '★', title: 'Leicht' },
  { level: 2, label: '★★', title: 'Einfach' },
  { level: 3, label: '★★★', title: 'Mittel' },
  { level: 4, label: '★★★★', title: 'Schwer' },
  { level: 5, label: '★★★★★', title: 'Experte' },
];

export const useGameFilters = () => {
  const [filters, setFilters] = useState<GameFiltersType>(loadFilters);

  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  return { filters, setFilters };
};

export const GameFiltersBar = ({
  filters,
  onChange,
  disabled = false,
}: GameFiltersBarProps) => {
  const categories: Category[] = getAllCategories();

  const wordCount = useMemo(() => {
    return getFilteredWords(filters).length;
  }, [filters]);

  const totalCount = useMemo(() => {
    return getFilteredWords().length;
  }, []);

  const toggleDifficulty = (level: number) => {
    if (disabled) return;
    const current = filters.difficulties;
    const newDiffs = current.includes(level)
      ? current.filter((d) => d !== level)
      : [...current, level].sort();
    onChange({ ...filters, difficulties: newDiffs });
  };

  const toggleLevel = (lvl: CEFRLevel) => {
    if (disabled) return;
    const current = filters.levels;
    const newLevels = current.includes(lvl)
      ? current.filter((l) => l !== lvl)
      : [...current, lvl];
    onChange({ ...filters, levels: newLevels });
  };

  const toggleCategory = (id: string) => {
    if (disabled) return;
    const current = filters.categories;
    const newCats = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    onChange({ ...filters, categories: newCats });
  };

  const clearAll = () => {
    if (disabled) return;
    onChange({ levels: [], difficulties: [], categories: [] });
  };

  const hasActiveFilters =
    filters.levels.length > 0 ||
    filters.difficulties.length > 0 ||
    filters.categories.length > 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 md:px-6">
      <div
        className={`
          rounded-lg border border-chalk/10 bg-white/[0.03] px-3 py-2 md:px-4 md:py-2.5
          flex flex-col gap-2
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        {/* Row 1: CEFR Level */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-chalk-dim font-body shrink-0">
            Niveau:
          </span>
          <div className="flex gap-1 flex-wrap">
            {CEFR_LEVELS.map((lvl) => {
              const selected = filters.levels.includes(lvl);
              const active =
                filters.levels.length === 0 || selected;
              return (
                <button
                  key={lvl}
                  onClick={() => toggleLevel(lvl)}
                  title={`CEFR ${lvl}`}
                  className={`
                    px-2.5 py-0.5 rounded text-xs font-body font-semibold transition-all duration-150
                    ${
                      selected
                        ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                        : active
                          ? 'bg-white/5 text-chalk-dim border border-transparent hover:bg-white/10'
                          : 'bg-white/5 text-chalk-dim/40 border border-transparent hover:bg-white/10'
                    }
                  `}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Difficulty */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-chalk-dim font-body shrink-0">
            Schwierigkeit:
          </span>
          <div className="flex gap-1 flex-wrap">
            {DIFFICULTY_LABELS.map(({ level, title }) => {
              const active =
                filters.difficulties.length === 0 ||
                filters.difficulties.includes(level);
              const selected = filters.difficulties.includes(level);
              return (
                <button
                  key={level}
                  onClick={() => toggleDifficulty(level)}
                  title={title}
                  className={`
                    px-2 py-0.5 rounded text-xs font-body transition-all duration-150
                    ${
                      selected
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : active
                          ? 'bg-white/5 text-chalk-dim border border-transparent hover:bg-white/10'
                          : 'bg-white/5 text-chalk-dim/40 border border-transparent hover:bg-white/10'
                    }
                  `}
                >
                  {'★'.repeat(level)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Categories */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-chalk-dim font-body shrink-0">
            Kategorie:
          </span>
          <div className="flex gap-1 flex-wrap">
            {categories.map((cat) => {
              const selected = filters.categories.includes(cat.id);
              const active =
                filters.categories.length === 0 || selected;
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  title={cat.name}
                  className={`
                    px-2 py-0.5 rounded text-xs font-body transition-all duration-150
                    ${
                      selected
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : active
                          ? 'bg-white/5 text-chalk-dim border border-transparent hover:bg-white/10'
                          : 'bg-white/5 text-chalk-dim/40 border border-transparent hover:bg-white/10'
                    }
                  `}
                >
                  {cat.icon} {cat.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Word count + clear */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-chalk-dim/70 font-body">
            {wordCount}/{totalCount} Wörter verfügbar
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-amber-400/70 hover:text-amber-400 font-body transition-colors"
            >
              Alle zurücksetzen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
