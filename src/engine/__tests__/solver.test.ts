import { canPour } from '../rules';
import { hintMove, solve } from '../solver';
import { Bottle, Color } from '../types';

const b = (id: string, ...segments: Color[]): Bottle => ({ id, segments });
const veiled = (id: string, ...segments: Color[]): Bottle => ({ id, segments, veiled: true });
const chained = (id: string, locks: number, ...segments: Color[]): Bottle => ({ id, segments, locks });

/** Solvable ONLY through the reveal chain: cork ruby → veil lifts → finish gold. */
const veiledFixture = () => [
  b('a', 'ruby', 'ruby', 'ruby'),
  b('c', 'ruby', 'gold'),
  veiled('v', 'gold', 'gold', 'gold'),
  b('e'),
];

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

describe('solve with modifiers', () => {
  it('solves a veiled board that requires the cork-reveal transition', () => {
    // gold→e, ruby→a corks ruby → v unveils → golds consolidate → win
    expect(solve(veiledFixture()).solvable).toBe(true);
  });

  it('treats the same board as unsolvable when the veil could never lift', () => {
    // no empty bottle: the cork is impossible, so the veil is permanent
    const state = [
      b('a', 'ruby', 'gold', 'ruby', 'gold'),
      b('c', 'gold', 'ruby', 'gold', 'ruby'),
      veiled('v', 'emerald', 'emerald'),
    ];
    expect(solve(state).solvable).toBe(false);
  });

  it('solves a chained board once the locks tick down', () => {
    // d→c corks gold (k: 2→1), a→e (k: 1→0), then k's ruby joins the rest
    const state = [
      b('a', 'ruby', 'ruby', 'ruby'),
      b('c', 'gold', 'gold', 'gold'),
      b('d', 'gold'),
      chained('k', 2, 'ruby'),
      b('e'),
    ];
    expect(solve(state).solvable).toBe(true);
  });

  it('reports identical results for a board with explicit falsy modifier fields', () => {
    const plain = [b('a', 'ruby', 'ruby', 'gold', 'gold'), b('c', 'gold', 'gold', 'ruby', 'ruby'), b('e')];
    const flagged: Bottle[] = plain.map((x) => ({ ...x, veiled: false, locks: 0 }));
    expect(solve(flagged)).toEqual(solve(plain));
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

  it('returns a legal first move on a veiled board (never a false null)', () => {
    const state = veiledFixture();
    const move = hintMove(state)!;
    expect(move).not.toBeNull();
    const from = state.find((x) => x.id === move.from)!;
    const to = state.find((x) => x.id === move.to)!;
    expect(canPour(from, to)).toBe(true);
  });
});
