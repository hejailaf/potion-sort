import { applyPour } from '../rules';
import { popMove, pushMove, revertMove } from '../undo';
import { Bottle, Color, Move } from '../types';

const b = (id: string, ...segments: Color[]): Bottle => ({ id, segments });

describe('revertMove', () => {
  it('restores the exact state before a pour', () => {
    const initial = [b('a', 'gold', 'ruby', 'ruby'), b('c', 'ruby')];
    const { bottles, move } = applyPour(initial, 'a', 'c')!;
    expect(revertMove(bottles, move)).toEqual(initial);
  });

  it('restores the exact state before a partial pour', () => {
    const initial = [b('a', 'ruby', 'ruby', 'ruby'), b('c', 'gold', 'gold', 'ruby')];
    const { bottles, move } = applyPour(initial, 'a', 'c')!;
    expect(move.count).toBe(1);
    expect(revertMove(bottles, move)).toEqual(initial);
  });

  it('unwinds a chain of moves back to the initial state', () => {
    const initial = [b('a', 'gold', 'ruby', 'ruby'), b('c', 'gold', 'gold'), b('e')];
    let state = initial;
    let history: Move[] = [];
    for (const [from, to] of [
      ['a', 'e'],
      ['a', 'c'],
      ['e', 'a'],
    ] as const) {
      const result = applyPour(state, from, to)!;
      state = result.bottles;
      history = pushMove(history, result.move);
    }
    while (history.length > 0) {
      const { history: rest, move } = popMove(history);
      state = revertMove(state, move!);
      history = rest;
    }
    expect(state).toEqual(initial);
  });
});

describe('move history', () => {
  it('pushes and pops without mutating, and pops null when empty', () => {
    const move: Move = { from: 'a', to: 'c', count: 1, color: 'ruby' };
    const h1 = pushMove([], move);
    expect(h1).toEqual([move]);
    const { history: h0, move: popped } = popMove(h1);
    expect(popped).toEqual(move);
    expect(h0).toEqual([]);
    expect(h1).toEqual([move]);
    expect(popMove([]).move).toBeNull();
  });
});
