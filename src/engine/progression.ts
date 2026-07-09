import { Modifier } from './types';

/** Unlock schedule — data, not code. The Journey tab (Phase 5) renders straight from this. */
export const MECHANIC_UNLOCKS = {
  veiled: 20,
  mystery: 40,
  chained: 60,
} as const;

export type MechanicKind = keyof typeof MECHANIC_UNLOCKS;

/** Difficulty ramp tunables — every knob for how mechanics are dealt lives here. */
export const RAMP = {
  /** share of eligible levels that get no modifier at all (breathers) */
  breatherChance: 0.25,
  /** a mechanic ramps (and is favored) for this many levels after its unlock */
  introBand: 20,
  /** selection weight of the newest mechanic while inside its intro band */
  introWeight: 3,
  /** never modify more than filled − keepFree bottles (the player needs room to work) */
  keepFree: 2,
  veiled: { minCount: 1, maxCount: 3 },
  mystery: { minCount: 1, maxCount: 3 },
  chained: { minCount: 1, maxCount: 2, minLocks: 2, maxLocks: 3 },
} as const;

/** n distinct indices from 0..poolSize-1, order-stable draw from the rng */
function sampleIndices(poolSize: number, n: number, rng: () => number): number[] {
  const pool = Array.from({ length: poolSize }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).sort((a, b) => a - b);
}

/** How many bottles the mechanic touches at this level: ramps min→max across the intro band. */
function rampCount(kind: MechanicKind, level: number, filled: number): number {
  const { minCount, maxCount } = RAMP[kind];
  const t = Math.min(1, (level - MECHANIC_UNLOCKS[kind]) / RAMP.introBand);
  const count = minCount + Math.round(t * (maxCount - minCount));
  return Math.max(1, Math.min(count, filled - RAMP.keepFree));
}

/**
 * The modifier set for a generated level: at most ONE mechanic per level in v1.3
 * (stacking is in BACKLOG.md). Deterministic for a given (level, filled, rng stream).
 * `filled` = number of pre-filled bottles; indices returned always target those.
 */
export function modifiersFor(level: number, filled: number, rng: () => number): Modifier[] {
  const unlocked = (Object.keys(MECHANIC_UNLOCKS) as MechanicKind[]).filter(
    (k) => level >= MECHANIC_UNLOCKS[k],
  );
  if (unlocked.length === 0) return [];

  // a mechanic's debut level (exactly its unlock) always features it — the unlock
  // interstitial must be followed by the real thing, never a breather
  const newest = unlocked[unlocked.length - 1];
  const debut = level === MECHANIC_UNLOCKS[newest];
  if (!debut && rng() < RAMP.breatherChance) return [];

  // rotation weighted toward the newest mechanic during its intro band
  let kind: MechanicKind = newest;
  if (!debut) {
    const inIntro = level < MECHANIC_UNLOCKS[newest] + RAMP.introBand;
    const weights = unlocked.map((k) => (k === newest && inIntro ? RAMP.introWeight : 1));
    const total = weights.reduce((a, w) => a + w, 0);
    let roll = rng() * total;
    for (let i = 0; i < unlocked.length; i++) {
      roll -= weights[i];
      if (roll < 0) {
        kind = unlocked[i];
        break;
      }
    }
  }

  const count = rampCount(kind, level, filled);
  const indices = sampleIndices(filled, count, rng);
  if (kind === 'chained') {
    const { minLocks, maxLocks } = RAMP.chained;
    return [
      {
        type: 'chained',
        bottles: indices.map((index) => ({
          index,
          locks: minLocks + Math.floor(rng() * (maxLocks - minLocks + 1)),
        })),
      },
    ];
  }
  return [{ type: kind, bottles: indices }];
}

/**
 * The unlock interstitial to show, if any: the OLDEST unlocked mechanic the player
 * hasn't been introduced to. Pure — the metaStore `seenUnlocks` latch feeds `seen`.
 */
export function pendingUnlock(level: number, seen: readonly MechanicKind[]): MechanicKind | null {
  for (const kind of Object.keys(MECHANIC_UNLOCKS) as MechanicKind[]) {
    if (level >= MECHANIC_UNLOCKS[kind] && !seen.includes(kind)) return kind;
  }
  return null;
}
