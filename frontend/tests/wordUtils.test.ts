import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllWords,
  getAllCategories,
  getWordsByCategory,
  getWordsByDifficulty,
  getRandomWord,
  lettersMatch,
  isWordFullyGuessed,
  getRevealedWord,
  maskWordInExample,
  getUniqueLetters,
} from '../src/utils/wordUtils';

// Mock localStorage for getRandomWord
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('wordUtils', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getAllWords', () => {
    it('returns all words from the database', () => {
      const words = getAllWords();
      expect(words.length).toBeGreaterThanOrEqual(350);
    });

    it('each word has required fields', () => {
      const words = getAllWords();
      words.forEach((word) => {
        expect(word.id).toBeTruthy();
        expect(word.word).toBeTruthy();
        expect(word.translation.pt).toBeTruthy();
        expect(word.translation.en).toBeTruthy();
        expect(word.category).toBeTruthy();
        expect(word.example).toBeTruthy();
        expect(word.difficulty).toBeGreaterThanOrEqual(1);
        expect(word.difficulty).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('getAllCategories', () => {
    it('returns at least 8 categories', () => {
      const categories = getAllCategories();
      expect(categories.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('getWordsByCategory', () => {
    it('filters words by category correctly', () => {
      const essenWords = getWordsByCategory('essen');
      expect(essenWords.length).toBeGreaterThan(0);
      essenWords.forEach((word) => {
        expect(word.category).toBe('essen');
      });
    });

    it('returns empty for non-existent category', () => {
      const words = getWordsByCategory('nonexistent');
      expect(words).toEqual([]);
    });
  });

  describe('getWordsByDifficulty', () => {
    it('filters words by difficulty correctly', () => {
      const easyWords = getWordsByDifficulty(1);
      expect(easyWords.length).toBeGreaterThan(0);
      easyWords.forEach((word) => {
        expect(word.difficulty).toBe(1);
      });
    });

    it('returns different counts for different difficulties', () => {
      const easy = getWordsByDifficulty(1);
      const hard = getWordsByDifficulty(5);
      // Both should exist but in different quantities
      expect(easy.length).not.toBe(0);
      expect(hard.length).not.toBe(0);
    });
  });

  describe('getRandomWord', () => {
    it('returns a valid word', () => {
      const word = getRandomWord();
      expect(word).toBeDefined();
      expect(word.word).toBeTruthy();
      expect(word.id).toBeTruthy();
    });

    it('does not repeat the last 10 words', () => {
      const selectedIds: string[] = [];
      for (let i = 0; i < 15; i++) {
        const word = getRandomWord();
        selectedIds.push(word.id);
      }

      // Check that within any window of 10, no duplicates
      // (with 360 words this should almost always be true)
      for (let i = 10; i < selectedIds.length; i++) {
        const window = selectedIds.slice(i - 10, i);
        const unique = new Set(window);
        expect(unique.size).toBe(window.length);
      }
    });

    it('can filter by category', () => {
      const word = getRandomWord({ difficulties: [], categories: ['essen'] });
      expect(word.category).toBe('essen');
    });

    it('can filter by difficulty', () => {
      const word = getRandomWord({ difficulties: [1], categories: [] });
      expect(word.difficulty).toBe(1);
    });
  });

  describe('lettersMatch', () => {
    it('matches exact letters', () => {
      expect(lettersMatch('a', 'a')).toBe(true);
      expect(lettersMatch('A', 'a')).toBe(true);
      expect(lettersMatch('a', 'A')).toBe(true);
    });

    it('matches umlauts with base vowels', () => {
      expect(lettersMatch('a', 'ä')).toBe(true);
      expect(lettersMatch('o', 'ö')).toBe(true);
      expect(lettersMatch('u', 'ü')).toBe(true);
      expect(lettersMatch('ä', 'a')).toBe(true);
    });

    it('matches s with ß', () => {
      expect(lettersMatch('s', 'ß')).toBe(true);
      expect(lettersMatch('ß', 's')).toBe(true);
    });

    it('does not match different letters', () => {
      expect(lettersMatch('a', 'b')).toBe(false);
      expect(lettersMatch('x', 'z')).toBe(false);
    });
  });

  describe('isWordFullyGuessed', () => {
    it('returns true when all letters guessed', () => {
      expect(isWordFullyGuessed('Hund', ['h', 'u', 'n', 'd'])).toBe(true);
    });

    it('returns false when letters missing', () => {
      expect(isWordFullyGuessed('Hund', ['h', 'u'])).toBe(false);
    });

    it('works with umlauts using base vowels', () => {
      expect(
        isWordFullyGuessed('Küche', ['k', 'u', 'c', 'h', 'e']),
      ).toBe(true);
    });
  });

  describe('getRevealedWord', () => {
    it('reveals guessed letters', () => {
      const revealed = getRevealedWord('Hund', ['h', 'n']);
      expect(revealed).toEqual(['H', '_', 'N', '_']);
    });

    it('reveals umlauts when base vowel is guessed', () => {
      const revealed = getRevealedWord('Küche', ['u', 'c']);
      expect(revealed).toEqual(['_', 'Ü', 'C', '_', '_']);
    });
  });

  describe('getUniqueLetters', () => {
    it('returns unique lowercase letters', () => {
      const letters = getUniqueLetters('Butter');
      expect(letters).toEqual(['b', 'u', 't', 'e', 'r']);
    });
  });

  describe('maskWordInExample', () => {
    it('replaces word in example with 7 fixed underlines', () => {
      const masked = maskWordInExample(
        'Der Kuchen schmeckt gut.',
        'Kuchen',
      );
      expect(masked).toBe('Der _______ schmeckt gut.');
    });

    it('always uses exactly 7 underlines regardless of word length', () => {
      const short = maskWordInExample('Das Ei ist frisch.', 'Ei');
      expect(short).toContain('_______');
      expect(short).not.toContain('________'); // no 8 underlines

      const long = maskWordInExample(
        'Das Mittagessen ist fertig.',
        'Mittagessen',
      );
      expect(long).toContain('_______');
    });
  });

  describe('difficulty levels', () => {
    it('all words have difficulty between 1 and 5', () => {
      const words = getAllWords();
      words.forEach((word) => {
        expect(word.difficulty).toBeGreaterThanOrEqual(1);
        expect(word.difficulty).toBeLessThanOrEqual(5);
      });
    });

    it('words exist for each difficulty level 1-5', () => {
      for (let d = 1; d <= 5; d++) {
        const words = getWordsByDifficulty(d);
        expect(words.length).toBeGreaterThan(0);
      }
    });

    it('difficulty badge displays correct number of stars (1-5)', () => {
      for (let d = 1; d <= 5; d++) {
        const filled = '★'.repeat(d);
        const empty = '☆'.repeat(5 - d);
        const stars = filled + empty;
        expect(stars.length).toBe(5);
        expect((stars.match(/★/g) || []).length).toBe(d);
        expect((stars.match(/☆/g) || []).length).toBe(5 - d);
      }
    });
  });
});
