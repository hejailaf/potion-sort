import { mulberry32 } from '../generator';
import { MECHANIC_UNLOCKS, MechanicKind, modifiersFor, pendingUnlock, RAMP } from '../progression';
import { Modifier } from '../types';

const FILLED = 10; // level-60 tier size; big enough for every mechanic's max count

/** every modifier produced for `level` across many rng seeds */
function sample(level: number, seeds = 40, filled = FILLED): Modifier[] {
  const out: Modifier[] = [];
  for (let s = 1; s <= seeds; s++) out.push(...modifiersFor(level, filled, mulberry32(s)));
  return out;
}

describe('unlock schedule boundaries', () => {
  it.each([
    [19, 'veiled'],
    [39, 'mystery'],
    [59, 'chained'],
  ] as [number, MechanicKind][])('level %i never produces the mechanic that unlocks next', (level, kind) => {
    expect(sample(level).some((m) => m.type === kind)).toBe(false);
  });

  it.each([
    [20, 'veiled'],
    [40, 'mystery'],
    [60, 'chained'],
  ] as [number, MechanicKind][])(
    'debut level %i ALWAYS features its newly unlocked mechanic (never a breather)',
    (level, kind) => {
      for (let s = 1; s <= 40; s++) {
        const mods = modifiersFor(level, FILLED, mulberry32(s));
        expect(mods).toHaveLength(1);
        expect(mods[0].type).toBe(kind);
      }
    },
  );

  it.each([21, 41, 61])('level %i still produces modifiers (no off-by-one gap)', (level) => {
    expect(sample(level).length).toBeGreaterThan(0);
  });

  it('levels below the first unlock never get modifiers', () => {
    for (const level of [1, 10, 19]) expect(sample(level)).toHaveLength(0);
  });
});

describe('modifiersFor invariants', () => {
  it('emits at most one mechanic per level', () => {
    for (const level of [20, 40, 60, 80]) {
      for (let s = 1; s <= 40; s++) {
        expect(modifiersFor(level, FILLED, mulberry32(s)).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('some non-debut levels are breathers (no modifier)', () => {
    const withNone = Array.from({ length: 60 }, (_, s) =>
      modifiersFor(61, FILLED, mulberry32(s + 1)),
    ).filter((m) => m.length === 0);
    expect(withNone.length).toBeGreaterThan(0);
  });

  it('targets only filled-bottle indices, distinct, leaving keepFree bottles untouched', () => {
    for (const m of sample(60, 60)) {
      const indices =
        m.type === 'chained' ? m.bottles.map((x) => x.index) : m.bottles;
      expect(indices.length).toBeLessThanOrEqual(FILLED - RAMP.keepFree);
      expect(new Set(indices).size).toBe(indices.length);
      for (const i of indices) {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(FILLED);
      }
      if (m.type === 'chained') {
        for (const { locks } of m.bottles) {
          expect(locks).toBeGreaterThanOrEqual(RAMP.chained.minLocks);
          expect(locks).toBeLessThanOrEqual(RAMP.chained.maxLocks);
        }
      }
    }
  });

  it('ramps: intro level uses the minimum count, band end reaches the maximum', () => {
    const unlock = MECHANIC_UNLOCKS.veiled;
    const atIntro = sample(unlock, 60).filter((m) => m.type === 'veiled');
    expect(atIntro.length).toBeGreaterThan(0);
    for (const m of atIntro) expect(m.bottles).toHaveLength(RAMP.veiled.minCount);
    // unlock+introBand is mystery's debut (always mystery) — sample one past it
    const late = sample(unlock + RAMP.introBand + 1, 60).filter((m) => m.type === 'veiled');
    expect(late.some((m) => m.bottles.length === RAMP.veiled.maxCount)).toBe(true);
  });

  it('is deterministic for the same (level, filled, rng seed)', () => {
    expect(modifiersFor(45, 8, mulberry32(7))).toEqual(modifiersFor(45, 8, mulberry32(7)));
  });
});

describe('pendingUnlock (interstitial predicate)', () => {
  it('is null below the first unlock', () => {
    expect(pendingUnlock(19, [])).toBeNull();
  });

  it('returns the newly reached mechanic once unseen', () => {
    expect(pendingUnlock(20, [])).toBe('veiled');
    expect(pendingUnlock(40, ['veiled'])).toBe('mystery');
    expect(pendingUnlock(60, ['veiled', 'mystery'])).toBe('chained');
  });

  it('is null once seen', () => {
    expect(pendingUnlock(25, ['veiled'])).toBeNull();
    expect(pendingUnlock(60, ['veiled', 'mystery', 'chained'])).toBeNull();
  });

  it('returns the OLDEST unseen mechanic when several are pending (late joiner)', () => {
    expect(pendingUnlock(45, [])).toBe('veiled');
    expect(pendingUnlock(65, ['veiled'])).toBe('mystery');
  });
});
