import { describe, it, expect } from 'vitest';
import {
  calculateRoundScore,
  getTimeMultiplier,
  getComboMultiplier,
} from '../src/hooks/useScoring';
import type { HintPenalties } from '../src/types';

const noHints: HintPenalties = {
  buchstabe: false,
  kategorie: false,
  beispiel: false,
};

describe('getTimeMultiplier', () => {
  it('returns 1.4 for under 30 seconds (fast bonus)', () => {
    expect(getTimeMultiplier(15)).toBe(1.4);
    expect(getTimeMultiplier(0)).toBe(1.4);
    expect(getTimeMultiplier(29)).toBe(1.4);
  });

  it('returns 1.2 for 30-59 seconds', () => {
    expect(getTimeMultiplier(30)).toBe(1.2);
    expect(getTimeMultiplier(59)).toBe(1.2);
  });

  it('returns 1.0 for 60-89 seconds (normal pace)', () => {
    expect(getTimeMultiplier(60)).toBe(1.0);
    expect(getTimeMultiplier(89)).toBe(1.0);
  });

  it('returns 0.9 for 90-119 seconds (slow)', () => {
    expect(getTimeMultiplier(90)).toBe(0.9);
    expect(getTimeMultiplier(119)).toBe(0.9);
  });

  it('returns 0.8 for 120+ seconds (very slow)', () => {
    expect(getTimeMultiplier(120)).toBe(0.8);
    expect(getTimeMultiplier(300)).toBe(0.8);
  });
});

describe('getComboMultiplier', () => {
  it('returns 1.0 for combo 0 and 1', () => {
    expect(getComboMultiplier(0)).toBe(1.0);
    expect(getComboMultiplier(1)).toBe(1.0);
  });

  it('returns 1.2 for combo 2', () => {
    expect(getComboMultiplier(2)).toBe(1.2);
  });

  it('returns 1.5 for combo 3', () => {
    expect(getComboMultiplier(3)).toBe(1.5);
  });

  it('returns 1.8 for combo 4', () => {
    expect(getComboMultiplier(4)).toBe(1.8);
  });

  it('returns 2.0 for combo 5+', () => {
    expect(getComboMultiplier(5)).toBe(2.0);
    expect(getComboMultiplier(10)).toBe(2.0);
  });
});

describe('calculateRoundScore', () => {
  it('calculates base score correctly (difficulty × 100)', () => {
    const score = calculateRoundScore(3, 5, noHints, 0, 100, 1);
    expect(score.base).toBe(300);
  });

  it('calculates length bonus correctly (wordLength × 15)', () => {
    const score = calculateRoundScore(2, 8, noHints, 0, 100, 1);
    expect(score.lengthBonus).toBe(120);
  });

  it('applies no hint penalties when no hints used', () => {
    const score = calculateRoundScore(3, 5, noHints, 0, 100, 1);
    expect(score.hintPenaltyTotal).toBe(0);
  });

  it('applies correct hint penalties (30% buchstabe, 20% beispiel, 10% kategorie)', () => {
    const allHints: HintPenalties = {
      buchstabe: true,
      beispiel: true,
      kategorie: true,
    };
    const score = calculateRoundScore(2, 5, allHints, 0, 100, 1);
    // base = 200; buchstabe=60, beispiel=40, kategorie=20 → total=120
    expect(score.hintPenaltyTotal).toBe(120);
  });

  it('applies wrong guess penalty correctly (base × wrongGuesses × 0.05)', () => {
    const score = calculateRoundScore(4, 6, noHints, 3, 100, 1);
    // base=400, guessPenalty = 400 * 3 * 0.05 = 60
    expect(score.guessPenalty).toBe(60);
  });

  it('enforces minimum score of 10 before multipliers', () => {
    // Use max penalties to push subtotal very low
    const allHints: HintPenalties = {
      buchstabe: true,
      beispiel: true,
      kategorie: true,
    };
    // difficulty=1, wordLength=2 → base=100, lengthBonus=30, subtotal=130
    // hintPenalty = 100*0.6 = 60, guessPenalty = 100*7*0.05 = 35,
    // adjusted = max(10, 130 - 60 - 35) = 35
    const score = calculateRoundScore(1, 2, allHints, 7, 100, 1);
    expect(score.total).toBeGreaterThanOrEqual(10);
  });

  it('applies time multiplier correctly', () => {
    // Fast game (< 30s) should get 1.4 multiplier
    const fast = calculateRoundScore(3, 5, noHints, 0, 20, 1);
    // base=300, length=75, adjusted=375, time=1.4, combo=1.0 → 525
    expect(fast.timeMultiplier).toBe(1.4);
    expect(fast.total).toBe(525);
  });

  it('applies combo multiplier correctly', () => {
    // Combo of 3 → 1.5x, time 90-119s → 0.9x
    const score = calculateRoundScore(2, 5, noHints, 0, 100, 3);
    // base=200, length=75, adjusted=275, time=0.9, combo=1.5 → round(275*0.9*1.5) = 371
    expect(score.comboMultiplier).toBe(1.5);
    expect(score.total).toBe(371);
  });

  it('computes a full realistic example correctly', () => {
    // difficulty=4, wordLength=9, buchstabe hint, 2 wrong, 45s, combo=2
    const hints: HintPenalties = {
      buchstabe: true,
      kategorie: false,
      beispiel: false,
    };
    const score = calculateRoundScore(4, 9, hints, 2, 45, 2);
    // base=400, lengthBonus=135, subtotal=535
    // hintPenalty = round(400*0.30) = 120
    // guessPenalty = round(400*2*0.05) = 40
    // adjusted = max(10, 535-120-40) = 375
    // time=1.2 (30-59s), combo=1.2
    // total = round(375 * 1.2 * 1.2) = round(540) = 540
    expect(score.base).toBe(400);
    expect(score.lengthBonus).toBe(135);
    expect(score.hintPenaltyTotal).toBe(120);
    expect(score.guessPenalty).toBe(40);
    expect(score.timeMultiplier).toBe(1.2);
    expect(score.comboMultiplier).toBe(1.2);
    expect(score.total).toBe(540);
  });

  it('includes correct hint penalty flags in result', () => {
    const hints: HintPenalties = {
      buchstabe: true,
      kategorie: false,
      beispiel: true,
    };
    const score = calculateRoundScore(2, 5, hints, 0, 50, 1);
    expect(score.hintPenalties).toEqual(hints);
  });

  it('demonstrates time multiplier impact on a real scenario', () => {
    // Same word, different speeds — show impact is moderate
    const fast   = calculateRoundScore(3, 7, noHints, 1, 25, 1);  // <30s
    const normal = calculateRoundScore(3, 7, noHints, 1, 70, 1);  // 60-89s
    const slow   = calculateRoundScore(3, 7, noHints, 1, 130, 1); // 120s+

    // base=300, length=105, subtotal=405, guessPenalty=15, adjusted=390
    expect(fast.timeMultiplier).toBe(1.4);
    expect(normal.timeMultiplier).toBe(1.0);
    expect(slow.timeMultiplier).toBe(0.8);

    // fast: 390*1.4 = 546, normal: 390*1.0 = 390, slow: 390*0.8 = 312
    expect(fast.total).toBe(546);
    expect(normal.total).toBe(390);
    expect(slow.total).toBe(312);

    // Fast bonus is only ~40% more than normal, not double
    expect(fast.total / normal.total).toBeCloseTo(1.4, 1);
    // Slow penalty is only ~20% less than normal
    expect(slow.total / normal.total).toBeCloseTo(0.8, 1);
  });

  // ===== Umlaut Partial Scoring Tests =====

  it('applies umlaut partial penalty (-15% of base per occurrence)', () => {
    // difficulty=3, base=300, 2 partial uses → penalty = 300 * 2 * 0.15 = 90
    const score = calculateRoundScore(3, 5, noHints, 0, 70, 1, 2, true);
    expect(score.umlautPartialCount).toBe(2);
    expect(score.umlautPartialPenalty).toBe(90);
    // base=300, length=75, subtotal=375, penalty=90, adjusted=285, time=1.0
    expect(score.total).toBe(285);
  });

  it('awards Perfektes Deutsch bonus (+50) when word has umlauts and no partials used', () => {
    const score = calculateRoundScore(3, 5, noHints, 0, 70, 1, 0, true);
    expect(score.perfectDeutschBonus).toBe(50);
    // base=300, length=75, +50 bonus, subtotal=425, time=1.0
    expect(score.total).toBe(425);
  });

  it('no Perfektes Deutsch bonus for words without umlauts', () => {
    const score = calculateRoundScore(3, 5, noHints, 0, 70, 1, 0, false);
    expect(score.perfectDeutschBonus).toBe(0);
    // base=300, length=75, subtotal=375, time=1.0
    expect(score.total).toBe(375);
  });

  it('no Perfektes Deutsch bonus when partials were used', () => {
    const score = calculateRoundScore(3, 5, noHints, 0, 70, 1, 1, true);
    expect(score.perfectDeutschBonus).toBe(0);
    expect(score.umlautPartialPenalty).toBe(45); // 300 * 1 * 0.15
    // base=300, length=75, subtotal=375, -45 umlaut, adjusted=330, time=1.0
    expect(score.total).toBe(330);
  });
});
