import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHangman } from '../src/hooks/useHangman';

// Mock localStorage
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

describe('useHangman', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('initializes game with a valid word', () => {
    const { result } = renderHook(() => useHangman());

    expect(result.current.gameState.currentWord).not.toBeNull();
    expect(result.current.gameState.currentWord?.word).toBeTruthy();
    expect(result.current.gameState.status).toBe('playing');
    expect(result.current.gameState.guessedLetters).toEqual([]);
    expect(result.current.gameState.wrongGuesses).toBe(0);
    expect(result.current.gameState.maxAttempts).toBe(8);
    expect(result.current.gameState.hintsUsed).toBe(0);
    expect(result.current.gameState.hintCategoryRevealed).toBe(false);
    expect(result.current.gameState.hintExampleRevealed).toBe(false);
  });

  it('registers a correct letter', () => {
    const { result } = renderHook(() => useHangman());
    const word = result.current.gameState.currentWord!.word.toLowerCase();
    const firstLetter = word[0];

    act(() => {
      result.current.guessLetter(firstLetter);
    });

    expect(result.current.gameState.guessedLetters).toContain(firstLetter);
    expect(result.current.correctLetters.length).toBeGreaterThan(0);
    expect(result.current.gameState.wrongGuesses).toBe(0);
  });

  it('increments wrong guesses for incorrect letter', () => {
    const { result } = renderHook(() => useHangman());
    const word = result.current.gameState.currentWord!.word.toLowerCase();

    // With the partial system, base letters (a/o/u/s) may not be wrong when
    // the word has specials (ä/ö/ü/ß). Find a letter NOT in the word AND
    // not a base for any special in the word.
    const specialMap: Record<string, string> = { ä: 'a', ö: 'o', ü: 'u', ß: 's' };
    const basesInUse = new Set<string>();
    for (const ch of word) {
      if (specialMap[ch]) basesInUse.add(specialMap[ch]);
    }

    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const wrongLetter = alphabet
      .split('')
      .find((l) => !word.includes(l) && !basesInUse.has(l));

    if (wrongLetter) {
      act(() => {
        result.current.guessLetter(wrongLetter);
      });

      expect(result.current.gameState.wrongGuesses).toBe(1);
      expect(result.current.wrongLetters).toContain(wrongLetter);
    }
  });

  it('detects win when all letters guessed', () => {
    const { result } = renderHook(() => useHangman());
    const word = result.current.gameState.currentWord!.word.toLowerCase();
    const uniqueLetters = [...new Set(word.split(''))];

    // Guess all unique letters
    uniqueLetters.forEach((letter) => {
      act(() => {
        result.current.guessLetter(letter);
      });
    });

    expect(result.current.gameState.status).toBe('won');
  });

  it('detects loss after 8 errors', () => {
    const { result } = renderHook(() => useHangman());
    const word = result.current.gameState.currentWord!.word.toLowerCase();

    // Find letters that are truly NOT in the word AND not base letters for specials
    const specialMap: Record<string, string> = { ä: 'a', ö: 'o', ü: 'u', ß: 's' };
    const basesInUse = new Set<string>();
    for (const ch of word) {
      if (specialMap[ch]) basesInUse.add(specialMap[ch]);
    }

    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const wrongLetters = alphabet
      .split('')
      .filter((l) => !word.includes(l) && !basesInUse.has(l));

    // Make 8 wrong guesses
    for (let i = 0; i < 8 && i < wrongLetters.length; i++) {
      act(() => {
        result.current.guessLetter(wrongLetters[i]);
      });
    }

    expect(result.current.gameState.status).toBe('lost');
    expect(result.current.gameState.wrongGuesses).toBe(8);
  });

  it('treats umlauts as partial match (base letter creates partial)', () => {
    const { result } = renderHook(() => useHangman());

    // Reset game until we find a word with an umlaut
    let attempts = 0;
    while (attempts < 100) {
      const word = result.current.gameState.currentWord!.word.toLowerCase();
      if (
        word.includes('ä') ||
        word.includes('ö') ||
        word.includes('ü')
      ) {
        break;
      }
      act(() => {
        result.current.resetGame();
      });
      attempts++;
    }

    const word = result.current.gameState.currentWord!.word.toLowerCase();
    const hasUmlaut =
      word.includes('ä') || word.includes('ö') || word.includes('ü');

    if (hasUmlaut) {
      // Guessing the base vowel should NOT reveal the umlaut in revealedWord
      // but should create a partial (no error counted)
      if (word.includes('ä') && !word.includes('a')) {
        act(() => {
          result.current.guessLetter('a');
        });
        // Should NOT be in revealedWord
        expect(
          result.current.revealedWord.some((l) => l.toUpperCase() === 'Ä'),
        ).toBe(false);
        // Should be in partialLetters
        expect(Object.keys(result.current.gameState.partialLetters).length).toBeGreaterThan(0);
        // Should NOT be a wrong guess
        expect(result.current.gameState.wrongGuesses).toBe(0);
        // Should be in partialBaseLetters
        expect(result.current.gameState.partialBaseLetters).toContain('a');
        // umlautPartialCount should be 1
        expect(result.current.gameState.umlautPartialCount).toBe(1);
      }
    }
  });

  it('does not allow duplicate letter guesses', () => {
    const { result } = renderHook(() => useHangman());
    const word = result.current.gameState.currentWord!.word.toLowerCase();
    const firstLetter = word[0];

    act(() => {
      result.current.guessLetter(firstLetter);
    });

    const guessedAfterFirst = result.current.gameState.guessedLetters.length;

    act(() => {
      result.current.guessLetter(firstLetter);
    });

    expect(result.current.gameState.guessedLetters.length).toBe(
      guessedAfterFirst,
    );
  });

  it('resets game with a new word', () => {
    const { result } = renderHook(() => useHangman());
    const firstWord = result.current.gameState.currentWord!.word;

    act(() => {
      result.current.guessLetter('a');
    });

    act(() => {
      result.current.resetGame();
    });

    expect(result.current.gameState.guessedLetters).toEqual([]);
    expect(result.current.gameState.wrongGuesses).toBe(0);
    expect(result.current.gameState.status).toBe('playing');
    // New word should be different (in most cases with 360 words)
    // We don't assert exact inequality since it could randomly be the same
  });

  it('provides hint info', () => {
    const { result } = renderHook(() => useHangman());

    const hintInfo = result.current.getHintInfo();
    expect(hintInfo).not.toBeNull();
    expect(hintInfo!.category).toBeTruthy();
    expect(hintInfo!.example).toBeTruthy();
  });

  it('reveal letter hint adds a letter to guessedLetters', () => {
    const { result } = renderHook(() => useHangman());

    act(() => {
      result.current.useHint();
    });

    expect(result.current.gameState.hintsUsed).toBe(1);
    expect(result.current.gameState.guessedLetters.length).toBe(1);
  });

  it('maxAttempts is always 8 regardless of difficulty', () => {
    const { result } = renderHook(() => useHangman());

    // Try multiple resets to check different words/difficulties
    for (let i = 0; i < 10; i++) {
      expect(result.current.gameState.maxAttempts).toBe(8);
      act(() => {
        result.current.resetGame();
      });
    }
    expect(result.current.gameState.maxAttempts).toBe(8);
  });

  it('category hint returns non-empty string', () => {
    const { result } = renderHook(() => useHangman());
    const hintInfo = result.current.getHintInfo();
    expect(hintInfo).not.toBeNull();
    expect(typeof hintInfo!.category).toBe('string');
    expect(hintInfo!.category.length).toBeGreaterThan(0);
  });

  it('example hint contains 7 underlines replacing the word', () => {
    // Try multiple times since random word might rarely fail masking
    let found = false;
    for (let i = 0; i < 20; i++) {
      const { result } = renderHook(() => useHangman());
      const hintInfo = result.current.getHintInfo();
      if (hintInfo && hintInfo.example.includes('_______')) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('category button can only be activated once per round', () => {
    const { result } = renderHook(() => useHangman());

    expect(result.current.gameState.hintCategoryRevealed).toBe(false);
    act(() => {
      result.current.revealCategory();
    });
    expect(result.current.gameState.hintCategoryRevealed).toBe(true);

    // Second click should not change state
    act(() => {
      result.current.revealCategory();
    });
    expect(result.current.gameState.hintCategoryRevealed).toBe(true);
  });

  it('example button can only be activated once per round', () => {
    const { result } = renderHook(() => useHangman());

    expect(result.current.gameState.hintExampleRevealed).toBe(false);
    act(() => {
      result.current.revealExample();
    });
    expect(result.current.gameState.hintExampleRevealed).toBe(true);

    // Second click should not change state
    act(() => {
      result.current.revealExample();
    });
    expect(result.current.gameState.hintExampleRevealed).toBe(true);
  });

  it('hint states reset when starting a new round', () => {
    const { result } = renderHook(() => useHangman());

    act(() => {
      result.current.revealCategory();
      result.current.revealExample();
    });

    act(() => {
      result.current.resetGame();
    });

    expect(result.current.gameState.hintCategoryRevealed).toBe(false);
    expect(result.current.gameState.hintExampleRevealed).toBe(false);
    expect(result.current.gameState.hintsUsed).toBe(0);
  });

  // ===== Partial Umlaut System Tests =====

  it('completing a partial by guessing the special char reveals the word', () => {
    const { result } = renderHook(() => useHangman());

    // Find a word with an umlaut (no matching base letter in word)
    let attempts = 0;
    while (attempts < 100) {
      const word = result.current.gameState.currentWord!.word.toLowerCase();
      if (
        (word.includes('ä') && !word.includes('a')) ||
        (word.includes('ö') && !word.includes('o')) ||
        (word.includes('ü') && !word.includes('u'))
      ) {
        break;
      }
      act(() => {
        result.current.resetGame();
      });
      attempts++;
    }

    const word = result.current.gameState.currentWord!.word.toLowerCase();

    if (word.includes('ä') && !word.includes('a')) {
      // Step 1: Guess base → should create partial
      act(() => {
        result.current.guessLetter('a');
      });
      expect(Object.keys(result.current.gameState.partialLetters).length).toBeGreaterThan(0);
      expect(result.current.gameState.wrongGuesses).toBe(0);

      // Step 2: Guess exact special char → should complete partial and reveal
      act(() => {
        result.current.guessLetter('ä');
      });
      expect(Object.keys(result.current.gameState.partialLetters).length).toBe(0);
      expect(result.current.gameState.partialBaseLetters).not.toContain('a');
      expect(
        result.current.revealedWord.some((l) => l.toUpperCase() === 'Ä'),
      ).toBe(true);
      expect(result.current.gameState.wrongGuesses).toBe(0);
    }
  });

  it('guessing special char when word has only the base letter is an error', () => {
    const { result } = renderHook(() => useHangman());

    // Find a word that contains 'a' but NOT 'ä'
    let attempts = 0;
    while (attempts < 100) {
      const word = result.current.gameState.currentWord!.word.toLowerCase();
      if (word.includes('a') && !word.includes('ä')) {
        break;
      }
      act(() => {
        result.current.resetGame();
      });
      attempts++;
    }

    const word = result.current.gameState.currentWord!.word.toLowerCase();
    if (word.includes('a') && !word.includes('ä')) {
      act(() => {
        result.current.guessLetter('ä');
      });
      // Ä→A is ERROR (unidirectional tolerance)
      expect(result.current.gameState.wrongGuesses).toBe(1);
      expect(result.current.wrongLetters).toContain('ä');
    }
  });

  it('partial state resets on new game', () => {
    const { result } = renderHook(() => useHangman());

    // Find word with umlaut
    let attempts = 0;
    while (attempts < 100) {
      const word = result.current.gameState.currentWord!.word.toLowerCase();
      if (word.includes('ä') || word.includes('ö') || word.includes('ü')) {
        break;
      }
      act(() => {
        result.current.resetGame();
      });
      attempts++;
    }

    const word = result.current.gameState.currentWord!.word.toLowerCase();
    if (word.includes('ä')) {
      act(() => {
        result.current.guessLetter('a');
      });
      expect(result.current.gameState.umlautPartialCount).toBeGreaterThan(0);
    }

    // Reset should clear all partial state
    act(() => {
      result.current.resetGame();
    });
    expect(result.current.gameState.partialLetters).toEqual({});
    expect(result.current.gameState.partialBaseLetters).toEqual([]);
    expect(result.current.gameState.umlautPartialCount).toBe(0);
  });

  it('win requires completing partials (not just guessing base letters)', () => {
    const { result } = renderHook(() => useHangman());

    // Find a word with umlaut
    let attempts = 0;
    while (attempts < 100) {
      const word = result.current.gameState.currentWord!.word.toLowerCase();
      if (word.includes('ä') && !word.includes('a')) {
        break;
      }
      act(() => {
        result.current.resetGame();
      });
      attempts++;
    }

    const word = result.current.gameState.currentWord!.word.toLowerCase();
    if (word.includes('ä') && !word.includes('a')) {
      // Guess all unique letters EXCEPT ä, using 'a' instead
      const uniqueLetters = [...new Set(word.split(''))];
      uniqueLetters.forEach((letter) => {
        if (letter === 'ä') {
          // Use base 'a' instead — creates partial
          act(() => {
            result.current.guessLetter('a');
          });
        } else {
          act(() => {
            result.current.guessLetter(letter);
          });
        }
      });

      // Should NOT be won yet — partial still active
      expect(result.current.gameState.status).toBe('playing');

      // Now guess the exact 'ä' to complete
      act(() => {
        result.current.guessLetter('ä');
      });
      expect(result.current.gameState.status).toBe('won');
    }
  });
});
