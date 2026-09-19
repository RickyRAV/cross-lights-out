import { describe, expect, it } from 'vitest';
import { scorePrediction } from '../src/lib/scoring';

describe('scorePrediction', () => {
  it('awards full points for an exact match', () => {
    const order = ['VER', 'NOR', 'LEC', 'HAM', 'RUS'];
    expect(scorePrediction(order, order)).toBe(25);
  });

  it('awards partial points for correct drivers in the wrong position', () => {
    const predicted = ['NOR', 'VER', 'LEC', 'RUS', 'HAM'];
    const actual = ['VER', 'NOR', 'LEC', 'HAM', 'RUS'];
    // LEC exact (5) + NOR, VER, RUS, HAM all present but misplaced (2 each)
    expect(scorePrediction(predicted, actual)).toBe(13);
  });

  it('awards no points when no predicted driver appears in the actual order', () => {
    const predicted = ['ALO', 'STR', 'GAS', 'OCO', 'ALB'];
    const actual = ['VER', 'NOR', 'LEC', 'HAM', 'RUS'];
    expect(scorePrediction(predicted, actual)).toBe(0);
  });
});
