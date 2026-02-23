import type { Word, Category, GameFilters, CEFRLevel } from '../types';
import type { WortlisteData } from '../types';

// Import all level word lists
import wortlisteA1 from '../data/wortliste-a1.json';
import wortlisteA2 from '../data/wortliste-a2.json';
import wortlisteB1 from '../data/wortliste-b1.json';
import wortlisteB2 from '../data/wortliste-b2.json';
import wortlisteC1 from '../data/wortliste-c1.json';

const levelFiles: { level: CEFRLevel; data: WortlisteData }[] = [
  { level: 'A1', data: wortlisteA1 as WortlisteData },
  { level: 'A2', data: wortlisteA2 as WortlisteData },
  { level: 'B1', data: wortlisteB1 as WortlisteData },
  { level: 'B2', data: wortlisteB2 as WortlisteData },
  { level: 'C1', data: wortlisteC1 as WortlisteData },
];

// Merge all words, tagging each with its level
const allWords: Word[] = levelFiles.flatMap(({ level, data }) =>
  data.words.map((w) => ({ ...w, level })),
);

// Merge categories (deduplicate by id)
const allCategories: Category[] = Object.values(
  Object.fromEntries(
    levelFiles.flatMap(({ data }) => data.categories.map((c) => [c.id, c])),
  ),
);

export const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

const RECENT_WORDS_KEY = 'galgenspiel_recent_words';
const RECENT_WORDS_MAX = 10;

export const normalizeLetterForComparison = (letter: string): string => {
  const map: Record<string, string> = {
    ä: 'a',
    ö: 'o',
    ü: 'u',
    ß: 's',
  };
  return map[letter.toLowerCase()] ?? letter.toLowerCase();
};

export const lettersMatch = (input: string, target: string): boolean => {
  const normalizedInput = normalizeLetterForComparison(input.toLowerCase());
  const normalizedTarget = normalizeLetterForComparison(target.toLowerCase());
  return normalizedInput === normalizedTarget;
};

export const getAllWords = (): Word[] => {
  return allWords;
};

export const getAllCategories = (): Category[] => {
  return allCategories;
};

export const getCategoryById = (id: string): Category | undefined => {
  return allCategories.find((c) => c.id === id);
};

export const getWordsByCategory = (categoryId: string): Word[] => {
  return allWords.filter((w) => w.category === categoryId);
};

export const getWordsByDifficulty = (difficulty: number): Word[] => {
  return allWords.filter((w) => w.difficulty === difficulty);
};

export const getWordsByDifficultyRange = (
  min: number,
  max: number,
): Word[] => {
  return allWords.filter((w) => w.difficulty >= min && w.difficulty <= max);
};

export const getWordsByLevel = (level: CEFRLevel): Word[] => {
  return allWords.filter((w) => w.level === level);
};

const getRecentWordIds = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_WORDS_KEY);
    if (stored) {
      return JSON.parse(stored) as string[];
    }
  } catch {
    // ignore parse errors
  }
  return [];
};

const addRecentWordId = (id: string): void => {
  const recent = getRecentWordIds();
  const updated = [id, ...recent.filter((r) => r !== id)].slice(
    0,
    RECENT_WORDS_MAX,
  );
  localStorage.setItem(RECENT_WORDS_KEY, JSON.stringify(updated));
};

export const getFilteredWords = (filters?: GameFilters): Word[] => {
  let pool = getAllWords();
  if (filters) {
    if (filters.levels.length > 0) {
      pool = pool.filter((w) => filters.levels.includes(w.level));
    }
    if (filters.difficulties.length > 0) {
      pool = pool.filter((w) => filters.difficulties.includes(w.difficulty));
    }
    if (filters.categories.length > 0) {
      pool = pool.filter((w) => filters.categories.includes(w.category));
    }
  }
  return pool;
};

export const getRandomWord = (filters?: GameFilters): Word => {
  let pool = getFilteredWords(filters);
  if (pool.length === 0) pool = getAllWords(); // fallback
  const recentIds = getRecentWordIds();

  const nonRecent = pool.filter((w) => !recentIds.includes(w.id));
  if (nonRecent.length > 0) {
    pool = nonRecent;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  const selected = pool[randomIndex];
  addRecentWordId(selected.id);
  return selected;
};

export const getUniqueLetters = (word: string): string[] => {
  const letters = word.toLowerCase().split('');
  return [...new Set(letters)];
};

export const isWordFullyGuessed = (
  word: string,
  guessedLetters: string[],
): boolean => {
  const uniqueLetters = getUniqueLetters(word);
  return uniqueLetters.every((letter) =>
    guessedLetters.some((g) => lettersMatch(g, letter)),
  );
};

export const getRevealedWord = (
  word: string,
  guessedLetters: string[],
): string[] => {
  return word.split('').map((letter) => {
    if (guessedLetters.some((g) => lettersMatch(g, letter))) {
      return letter.toUpperCase();
    }
    return '_';
  });
};

export const maskWordInExample = (example: string, word: string): string => {
  // Try exact match first
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactRegex = new RegExp(escape(word), 'gi');
  if (exactRegex.test(example)) {
    return example.replace(exactRegex, '_______');
  }

  // Build umlaut-aware pattern for German word forms
  // e.g. Vogel → V[oö]gel matches Vögel; Garten → G[aä]rten matches Gärten
  const umlautMap: Record<string, string> = {
    a: '[aä]', o: '[oö]', u: '[uü]',
    A: '[AÄ]', O: '[OÖ]', U: '[UÜ]',
  };
  const buildPattern = (w: string) =>
    w.split('').map((ch) => umlautMap[ch] ?? escape(ch)).join('');

  // Allow optional suffixes for plural / case endings
  const fuzzyRegex = new RegExp(buildPattern(word) + '[a-zäöüß]*', 'gi');
  if (fuzzyRegex.test(example)) {
    return example.replace(fuzzyRegex, '_______');
  }

  // Handle German separable verbs: e.g. "aufhören" → stem "hör" + prefix "auf"
  // Try matching the word stem (after common separable prefixes)
  const separablePrefixes = [
    'ab', 'an', 'auf', 'aus', 'bei', 'ein', 'mit', 'nach', 'vor', 'weg', 'zu', 'zurück',
    'heraus', 'herein', 'hinaus', 'hinein', 'zusammen', 'fest', 'hin', 'her', 'um', 'los',
  ];
  const wordLower = word.toLowerCase();
  for (const prefix of separablePrefixes) {
    if (wordLower.startsWith(prefix) && wordLower.length > prefix.length + 2) {
      const stem = word.slice(prefix.length);
      const stemPattern = buildPattern(stem) + '[a-zäöüß]*';
      const prefixPattern = buildPattern(prefix);
      // Match the stem (conjugated) and prefix separately
      const stemRegex = new RegExp(stemPattern, 'gi');
      const prefixRegex = new RegExp('\\b' + prefixPattern + '\\b', 'gi');
      if (stemRegex.test(example) && prefixRegex.test(example)) {
        return example
          .replace(new RegExp(stemPattern, 'gi'), '_______')
          .replace(new RegExp('\\b' + prefixPattern + '\\b', 'gi'), '_______');
      }
    }
  }

  // Fallback: return example unmodified
  return example;
};
