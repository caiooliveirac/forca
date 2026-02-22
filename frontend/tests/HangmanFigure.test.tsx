import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HangmanFigure } from '../src/components/HangmanFigure';

describe('HangmanFigure', () => {
  it('renders 4 static gallows elements when wrongGuesses = 0', () => {
    const { container } = render(
      <HangmanFigure wrongGuesses={0} isLost={false} isWon={false} />,
    );
    const gallowsParts = container.querySelectorAll('[data-part="gallows"]');
    expect(gallowsParts.length).toBe(4);
  });

  it('renders head (opacity 1) when wrongGuesses >= 1', () => {
    const { container } = render(
      <HangmanFigure wrongGuesses={1} isLost={false} isWon={false} />,
    );
    const svg = container.querySelector('svg')!;
    // Head is the first circle inside bodyGroup
    const bodyGroup = svg.querySelector('[data-testid="bodyGroup"]')!;
    const head = bodyGroup.querySelector('circle');
    expect(head).not.toBeNull();
    expect(head!.style.opacity).toBe('1');
  });

  it('renders all 8 body parts visible when wrongGuesses = 8', () => {
    const { container } = render(
      <HangmanFigure wrongGuesses={8} isLost={true} isWon={false} />,
    );
    const bodyGroup = container.querySelector('[data-testid="bodyGroup"]')!;
    // Count elements with opacity: 1 (lines + circles that are body parts)
    const allParts = bodyGroup.querySelectorAll<SVGElement>(
      'line[style], circle[style]',
    );
    const visibleParts = Array.from(allParts).filter(
      (el) => el.style.opacity === '1',
    );
    expect(visibleParts.length).toBe(8);
  });

  it('shows no body parts when wrongGuesses = 0', () => {
    const { container } = render(
      <HangmanFigure wrongGuesses={0} isLost={false} isWon={false} />,
    );
    const bodyGroup = container.querySelector('[data-testid="bodyGroup"]')!;
    const allParts = bodyGroup.querySelectorAll<SVGElement>(
      'line[style], circle[style]',
    );
    const visibleParts = Array.from(allParts).filter(
      (el) => el.style.opacity === '1',
    );
    expect(visibleParts.length).toBe(0);
  });

  it('applies pendulum-death animation class when isLost is true', () => {
    const { container } = render(
      <HangmanFigure wrongGuesses={8} isLost={true} isWon={false} />,
    );
    const bodyGroup = container.querySelector('[data-testid="bodyGroup"]')!;
    expect(bodyGroup.classList.contains('animate-pendulum-death')).toBe(true);
  });

  it('applies drop-free animation class when isWon is true', async () => {
    const { container } = render(
      <HangmanFigure wrongGuesses={3} isLost={false} isWon={true} />,
    );
    // winPhase starts at 1 (rope-break), rope gets animate-rope-break
    const gallowsParts = container.querySelectorAll('[data-part="gallows"]');
    const ropeEl = gallowsParts[3];
    expect(ropeEl.classList.contains('animate-rope-break')).toBe(true);
  });
});
