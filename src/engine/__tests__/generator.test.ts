import { createBottles, difficultyFor, generateLevel, shuffleBottles } from '../generator';
import { isBottleComplete } from '../rules';
import { solve } from '../solver';
import { Bottle, BOTTLE_CAPACITY, Color } from '../types';

const TIER_SAMPLE_LEVELS = [1, 5, 10, 25, 50, 60];

describe('generateLevel', () => {
  it('is deterministic for the same level and seed', () => {
    expect(generateLevel(5, 42)).toEqual(generateLevel(5, 42));
    expect(generateLevel(3)).toEqual(generateLevel(3));
  });

  it('produces different deals for different seeds', () => {
    expect(generateLevel(10, 1)).not.toEqual(generateLevel(10, 2));
  });

  it.each(TIER_SAMPLE_LEVELS)('level %i matches its difficulty tier invariants', (level) => {
    const tier = difficultyFor(level);
    const def = generateLevel(level, 7);

    expect(def.bottles).toHaveLength(tier.filled);
    expect(def.emptyBottles).toBe(tier.empty);
    for (const segments of def.bottles) {
      expect(segments).toHaveLength(BOTTLE_CAPACITY);
      expect(isBottleComplete({ id: '', segments })).toBe(false);
    }

    const counts = new Map<Color, number>();
    for (const segments of def.bottles) {
      for (const c of segments) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    expect(counts.size).toBe(tier.colors);
    for (const total of counts.values()) {
      expect(total % BOTTLE_CAPACITY).toBe(0);
    }
  });

  it('materializes filled bottles plus empties via createBottles', () => {
    const def = generateLevel(1, 3);
    const bottles = createBottles(def);
    expect(bottles).toHaveLength(def.bottles.length + def.emptyBottles);
    expect(bottles.slice(def.bottles.length).every((b) => b.segments.length === 0)).toBe(true);
    expect(new Set(bottles.map((b) => b.id)).size).toBe(bottles.length);
  });

  // Acceptance property test: 100+ seeds across all difficulty tiers are solver-verified solvable.
  it.each(TIER_SAMPLE_LEVELS)(
    'level %i generates solvable deals for 17 consecutive seeds',
    (level) => {
      for (let seed = 1; seed <= 17; seed++) {
        const def = generateLevel(level, seed);
        expect(solve(createBottles(def)).solvable).toBe(true);
      }
    },
    30_000,
  );
});

describe('curated early levels and level sweep', () => {
  it('levels 1-10 default seeds ramp smoothly within each difficulty tier', () => {
    const tiers = [
      [1, 2, 3],
      [4, 5, 6, 7],
      [8, 9, 10],
    ];
    for (const tier of tiers) {
      const estimates = tier.map((level) => {
        const result = solve(createBottles(generateLevel(level)));
        expect(result.solvable).toBe(true);
        return result.moveEstimate!;
      });
      const sorted = [...estimates].sort((a, b) => a - b);
      expect(estimates).toEqual(sorted);
    }
  });

  // automated half of the Phase 6 acceptance: no unsolvable board in levels 1-30
  it('levels 1-30 with default seeds all generate solvable boards', () => {
    for (let level = 1; level <= 30; level++) {
      expect(solve(createBottles(generateLevel(level))).solvable).toBe(true);
    }
  }, 30_000);
});

describe('shuffleBottles', () => {
  const b = (id: string, ...segments: Color[]): Bottle => ({ id, segments });

  const board = [
    b('done', 'ruby', 'ruby', 'ruby', 'ruby'),
    b('a', 'gold', 'teal', 'gold', 'teal'),
    b('c', 'teal', 'gold'),
    b('e', 'teal', 'gold'),
    b('empty'),
  ];

  it('keeps fill counts, completed bottles, and empties intact', () => {
    const result = shuffleBottles(board, 5)!;
    expect(result).not.toBeNull();
    expect(result.find((x) => x.id === 'done')).toEqual(board[0]);
    expect(result.find((x) => x.id === 'empty')?.segments).toEqual([]);
    for (const id of ['a', 'c', 'e']) {
      expect(result.find((x) => x.id === id)?.segments).toHaveLength(
        board.find((x) => x.id === id)!.segments.length,
      );
    }
    // same liquid overall, just rearranged
    const count = (bs: Bottle[]) =>
      bs.flatMap((x) => x.segments).sort().join(',');
    expect(count(result)).toBe(count(board));
  });

  it('always returns a solver-verified solvable, different arrangement', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const result = shuffleBottles(board, seed)!;
      expect(result).not.toBeNull();
      expect(result).not.toEqual(board);
      expect(solve(result).solvable).toBe(true);
    }
  });

  it('is deterministic for the same seed', () => {
    expect(shuffleBottles(board, 9)).toEqual(shuffleBottles(board, 9));
  });

  it('returns null when no different arrangement exists', () => {
    // a single uniform (but incomplete) bottle can only re-deal identically
    const stuck = [b('a', 'ruby', 'ruby'), b('done', 'gold', 'gold', 'gold', 'gold')];
    expect(shuffleBottles(stuck, 3)).toBeNull();
    // nothing movable at all
    expect(shuffleBottles([b('empty')], 3)).toBeNull();
  });
});
