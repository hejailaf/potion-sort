import { ALL_COLORS, Bottle, BOTTLE_CAPACITY, Color, LevelDef } from './types';
import { isBottleComplete } from './rules';
import { solve } from './solver';

/** Tiny deterministic PRNG (mulberry32) — JS has no seeded random built in. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DifficultyTier {
  /** bottles that start with liquid (each holds exactly 4 segments) */
  filled: number;
  /** distinct colors in play; when filled > colors, colors repeat across bottles */
  colors: number;
  /** empty bottles appended after the filled ones */
  empty: number;
}

/**
 * Difficulty curve
 *
 * | level | filled | colors | empty | total bottles |
 * |-------|--------|--------|-------|---------------|
 * | 1–3   |   3    |   3    |   2   |       5       |
 * | 4–7   |   4    |   4    |   2   |       6       |
 * | 8–14  |   5    |   5    |   2   |       7       |
 * | 15–24 |   6    |   6    |   2   |       8       |
 * | 25–39 |   7    |   7    |   2   |       9       |
 * | 40–59 |   8    |   8    |   2   |      10       |
 * | 60+   |  10    |   8    |   2   |      12       |
 */
export function difficultyFor(level: number): DifficultyTier {
  if (level <= 3) return { filled: 3, colors: 3, empty: 2 };
  if (level <= 7) return { filled: 4, colors: 4, empty: 2 };
  if (level <= 14) return { filled: 5, colors: 5, empty: 2 };
  if (level <= 24) return { filled: 6, colors: 6, empty: 2 };
  if (level <= 39) return { filled: 7, colors: 7, empty: 2 };
  if (level <= 59) return { filled: 8, colors: 8, empty: 2 };
  return { filled: 10, colors: 8, empty: 2 };
}

/** Hand-tuned levels override the generator when present (PLAN.md open question #3). */
const HAND_TUNED: Record<number, LevelDef> = {};

/**
 * Curated default seeds for the first levels: picked by scanning 200 seeds per
 * level and choosing solver move-estimates that rise smoothly for new players
 * (6, 8, 10, 11, 13, 15, 16, 16, 18, 20 moves). Explicit seeds bypass this.
 */
const CURATED_SEEDS: Record<number, number> = {
  1: 197, 2: 181, 3: 31, 4: 77, 5: 95, 6: 16, 7: 110, 8: 11, 9: 106, 10: 73,
};

function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Materialize a LevelDef into the runtime bottle state (filled bottles, then empties). */
export function createBottles(def: LevelDef): Bottle[] {
  const filled = def.bottles.map((segments, i) => ({ id: `b${i}`, segments: [...segments] }));
  const empties = Array.from({ length: def.emptyBottles }, (_, i) => ({
    id: `b${def.bottles.length + i}`,
    segments: [] as Color[],
  }));
  return [...filled, ...empties];
}

const MAX_ATTEMPTS = 200;

/**
 * Deterministic, guaranteed-solvable level for (levelNumber, seed).
 * Deals a shuffled segment pool into bottles and retries (advancing the same RNG)
 * until the solver confirms solvability and no bottle starts already complete.
 */
export function generateLevel(
  levelNumber: number,
  seed: number = CURATED_SEEDS[levelNumber] ?? levelNumber,
): LevelDef {
  const tuned = HAND_TUNED[levelNumber];
  if (tuned) return tuned;

  const { filled, colors, empty } = difficultyFor(levelNumber);
  const rng = mulberry32(seed);
  const palette = shuffleInPlace([...ALL_COLORS], rng).slice(0, colors);

  const pool: Color[] = [];
  for (let k = 0; k < filled; k++) {
    for (let s = 0; s < BOTTLE_CAPACITY; s++) pool.push(palette[k % colors]);
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    shuffleInPlace(pool, rng);
    const bottles: Color[][] = [];
    for (let k = 0; k < filled; k++) {
      bottles.push(pool.slice(k * BOTTLE_CAPACITY, (k + 1) * BOTTLE_CAPACITY));
    }
    if (bottles.some((segments) => isBottleComplete({ id: '', segments }))) continue;

    const def: LevelDef = { id: levelNumber, seed, bottles, emptyBottles: empty };
    if (solve(createBottles(def)).solvable) return def;
  }
  throw new Error(`generateLevel: no solvable deal in ${MAX_ATTEMPTS} attempts (level ${levelNumber}, seed ${seed})`);
}

const SHUFFLE_ATTEMPTS = 60;

/**
 * Shuffle booster: re-deal the liquid of non-completed bottles, keeping every
 * bottle's fill count (empties stay empty — shuffling never costs working space)
 * and leaving completed bottles untouched. Only returns solver-verified solvable
 * arrangements that actually differ and complete no new bottle; null when no
 * such arrangement exists (caller keeps the charge).
 */
export function shuffleBottles(bottles: Bottle[], seed: number): Bottle[] | null {
  const rng = mulberry32(seed);
  const movable = bottles.filter((b) => b.segments.length > 0 && !isBottleComplete(b));
  const pool = movable.flatMap((b) => b.segments);
  if (pool.length === 0) return null;

  for (let attempt = 0; attempt < SHUFFLE_ATTEMPTS; attempt++) {
    shuffleInPlace(pool, rng);
    let offset = 0;
    const reallocated = new Map<string, Color[]>();
    for (const b of movable) {
      reallocated.set(b.id, pool.slice(offset, offset + b.segments.length));
      offset += b.segments.length;
    }
    const changed = movable.some((b) => reallocated.get(b.id)!.join(',') !== b.segments.join(','));
    if (!changed) continue;
    if (movable.some((b) => isBottleComplete({ id: b.id, segments: reallocated.get(b.id)! }))) continue;
    const next = bottles.map((b) =>
      reallocated.has(b.id) ? { ...b, segments: reallocated.get(b.id)! } : b,
    );
    if (solve(next).solvable) return next;
  }
  return null;
}
