import { canPour } from '../rules';
import { hintMove, solve } from '../solver';
import { Bottle, Color } from '../types';

const b = (id: string, ...segments: Color[]): Bottle => ({ id, segments });

describe('solve', () => {
  it('reports an already-won state as solvable in 0 moves', () => {
    const state = [
      b('a', 'ruby', 'ruby', 'ruby', 'ruby'),
      b('c', 'gold', 'gold', 'gold', 'gold'),
      b('e'),
    ];
    expect(solve(state)).toEqual({ solvable: true, moveEstimate: 0 });
  });

  it('solves a simple two-color level', () => {
    const state = [
      b('a', 'ruby', 'ruby', 'gold', 'gold'),
      b('c', 'gold', 'gold', 'ruby', 'ruby'),
      b('e'),
    ];
    const result = solve(state);
    expect(result.solvable).toBe(true);
    expect(result.moveEstimate).toBeGreaterThan(0);
  });

  it('rejects a dead position with no space and no legal moves', () => {
    const state = [
      b('a', 'ruby', 'gold', 'ruby', 'gold'),
      b('c', 'gold', 'ruby', 'gold', 'ruby'),
    ];
    expect(solve(state).solvable).toBe(false);
  });

  it('is deterministic for the same input', () => {
    const state = [
      b('a', 'ruby', 'gold', 'ruby', 'gold'),
      b('c', 'gold', 'ruby', 'gold', 'ruby'),
      b('e'),
    ];
    expect(solve(state)).toEqual(solve(state));
  });
});

describe('hintMove', () => {
  it('returns a legal first move that advances toward a solution', () => {
    const state = [
      b('a', 'ruby', 'ruby', 'gold', 'gold'),
      b('c', 'gold', 'gold', 'ruby', 'ruby'),
      b('e'),
    ];
    const move = hintMove(state)!;
    expect(move).not.toBeNull();
    const from = state.find((x) => x.id === move.from)!;
    const to = state.find((x) => x.id === move.to)!;
    expect(canPour(from, to)).toBe(true);
  });

  it('returns null for a dead position', () => {
    expect(
      hintMove([
        b('a', 'ruby', 'gold', 'ruby', 'gold'),
        b('c', 'gold', 'ruby', 'gold', 'ruby'),
      ]),
    ).toBeNull();
  });

  it('returns null for an already-won board', () => {
    expect(hintMove([b('a', 'ruby', 'ruby', 'ruby', 'ruby'), b('e')])).toBeNull();
  });
});
