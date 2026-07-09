import { applyPour, canPour, hasAnyMove, isBottleComplete, isWin, pourAmount, revealNextVeil, topRun } from '../rules';
import { Bottle, Color, LevelDef } from '../types';

const b = (id: string, ...segments: Color[]): Bottle => ({ id, segments });
const veiled = (id: string, ...segments: Color[]): Bottle => ({ id, segments, veiled: true });
const chained = (id: string, locks: number, ...segments: Color[]): Bottle => ({ id, segments, locks });

describe('topRun', () => {
  it('returns null for an empty bottle', () => {
    expect(topRun(b('a'))).toBeNull();
  });

  it('counts consecutive same-color segments from the top', () => {
    expect(topRun(b('a', 'ruby', 'gold', 'gold', 'gold'))).toEqual({ color: 'gold', count: 3 });
    expect(topRun(b('a', 'ruby', 'gold'))).toEqual({ color: 'gold', count: 1 });
  });
});

describe('canPour', () => {
  it('allows pouring into an empty bottle', () => {
    expect(canPour(b('a', 'ruby'), b('c'))).toBe(true);
  });

  it('allows pouring onto a matching top color', () => {
    expect(canPour(b('a', 'ruby'), b('c', 'gold', 'ruby'))).toBe(true);
  });

  it('rejects pouring into a full bottle', () => {
    expect(canPour(b('a', 'ruby'), b('c', 'ruby', 'ruby', 'ruby', 'ruby'))).toBe(false);
  });

  it('rejects pouring onto a mismatched top color', () => {
    expect(canPour(b('a', 'ruby'), b('c', 'gold'))).toBe(false);
  });

  it('rejects pouring from an empty bottle', () => {
    expect(canPour(b('a'), b('c'))).toBe(false);
  });

  it('rejects pouring a bottle into itself', () => {
    expect(canPour(b('a', 'ruby'), b('a', 'ruby'))).toBe(false);
  });
});

describe('pourAmount', () => {
  it('is the full top run when the target has space', () => {
    expect(pourAmount(b('a', 'gold', 'ruby', 'ruby'), b('c', 'ruby'))).toBe(2);
  });

  it('is capped by the space left in the target', () => {
    expect(pourAmount(b('a', 'ruby', 'ruby', 'ruby'), b('c', 'gold', 'gold', 'ruby'))).toBe(1);
  });
});

describe('applyPour', () => {
  it('moves the whole top run into an empty bottle', () => {
    const result = applyPour([b('a', 'gold', 'ruby', 'ruby'), b('c')], 'a', 'c')!;
    expect(result.bottles).toEqual([b('a', 'gold'), b('c', 'ruby', 'ruby')]);
    expect(result.move).toEqual({ from: 'a', to: 'c', count: 2, color: 'ruby' });
  });

  it('pours partially when the target lacks space for the whole run', () => {
    const result = applyPour(
      [b('a', 'ruby', 'ruby', 'ruby'), b('c', 'gold', 'gold', 'ruby')],
      'a',
      'c',
    )!;
    expect(result.bottles).toEqual([
      b('a', 'ruby', 'ruby'),
      b('c', 'gold', 'gold', 'ruby', 'ruby'),
    ]);
    expect(result.move.count).toBe(1);
  });

  it('returns null for an illegal pour and mutates nothing', () => {
    const bottles = [b('a', 'ruby'), b('c', 'gold')];
    expect(applyPour(bottles, 'a', 'c')).toBeNull();
    expect(bottles).toEqual([b('a', 'ruby'), b('c', 'gold')]);
  });

  it('does not mutate its input state on a legal pour', () => {
    const bottles = [b('a', 'ruby', 'ruby'), b('c')];
    applyPour(bottles, 'a', 'c');
    expect(bottles).toEqual([b('a', 'ruby', 'ruby'), b('c')]);
  });
});

describe('isBottleComplete (win rule: full + uniform)', () => {
  it('is true only for a full single-color bottle', () => {
    expect(isBottleComplete(b('a', 'ruby', 'ruby', 'ruby', 'ruby'))).toBe(true);
  });

  it('is false for a uniform bottle that is not full', () => {
    expect(isBottleComplete(b('a', 'ruby', 'ruby', 'ruby'))).toBe(false);
  });

  it('is false for a full mixed bottle', () => {
    expect(isBottleComplete(b('a', 'ruby', 'ruby', 'ruby', 'gold'))).toBe(false);
  });
});

describe('isWin', () => {
  it('is true when every bottle is empty or complete', () => {
    expect(
      isWin([b('a', 'ruby', 'ruby', 'ruby', 'ruby'), b('c', 'gold', 'gold', 'gold', 'gold'), b('e')]),
    ).toBe(true);
  });

  it('is false while a uniform bottle is not yet full', () => {
    expect(isWin([b('a', 'ruby', 'ruby', 'ruby'), b('c', 'ruby'), b('e')])).toBe(false);
  });
});

describe('modifiers: veil/lock legality', () => {
  it('rejects pouring out of and into a veiled bottle', () => {
    expect(canPour(veiled('a', 'ruby'), b('c'))).toBe(false);
    expect(canPour(b('c', 'ruby'), veiled('a', 'ruby'))).toBe(false);
  });

  it('rejects pouring out of and into a still-chained bottle', () => {
    expect(canPour(chained('a', 1, 'ruby'), b('c'))).toBe(false);
    expect(canPour(b('c', 'ruby'), chained('a', 2, 'ruby'))).toBe(false);
  });

  it('treats a drained chain (locks 0) as a normal bottle', () => {
    expect(canPour(chained('a', 0, 'ruby'), b('c'))).toBe(true);
    expect(canPour(b('c', 'ruby'), chained('a', 0, 'ruby'))).toBe(true);
  });

  it('a frozen bottle cannot receive the segment that would complete it', () => {
    expect(canPour(b('c', 'ruby'), veiled('a', 'ruby', 'ruby', 'ruby'))).toBe(false);
    expect(canPour(b('c', 'ruby'), chained('a', 3, 'ruby', 'ruby', 'ruby'))).toBe(false);
  });

  it('hasAnyMove reports deadlock when the only would-be targets are frozen', () => {
    expect(hasAnyMove([b('a', 'ruby', 'ruby', 'ruby', 'gold'), veiled('v', 'gold', 'ruby')])).toBe(false);
  });
});

describe('modifiers: applyPour lock decrement', () => {
  it('decrements every still-locked bystander and records their ids', () => {
    const state = [b('a', 'ruby', 'ruby'), b('c'), chained('k', 2, 'gold'), chained('z', 1, 'teal')];
    const result = applyPour(state, 'a', 'c')!;
    expect(result.bottles.find((x) => x.id === 'k')!.locks).toBe(1);
    expect(result.bottles.find((x) => x.id === 'z')!.locks).toBe(0);
    expect(result.move.decremented).toEqual(['k', 'z']);
  });

  it('leaves drained chains alone and omits the field when nothing was locked', () => {
    const state = [b('a', 'ruby', 'ruby'), b('c'), chained('k', 0, 'gold')];
    const result = applyPour(state, 'a', 'c')!;
    expect(result.bottles.find((x) => x.id === 'k')!.locks).toBe(0);
    expect(result.move.decremented).toBeUndefined();
  });
});

describe('revealNextVeil', () => {
  it('lifts exactly one veil — the lexicographically smallest contents', () => {
    const state = [veiled('x', 'teal', 'gold'), veiled('y', 'gold', 'teal'), b('c', 'ruby')];
    const next = revealNextVeil(state);
    // 'gold,teal' < 'teal,gold' → y unveils first
    expect(next.find((x) => x.id === 'y')!.veiled).toBe(false);
    expect(next.find((x) => x.id === 'x')!.veiled).toBe(true);
  });

  it('is an identity when nothing is veiled', () => {
    const state = [b('a', 'ruby'), b('c')];
    expect(revealNextVeil(state)).toBe(state);
  });
});

describe('modifiers: serialization round-trip', () => {
  it('a LevelDef with each modifier type survives JSON round-trip', () => {
    const def: LevelDef = {
      id: 60,
      seed: 42,
      bottles: [['ruby', 'gold', 'ruby', 'gold'], ['gold', 'ruby', 'gold', 'ruby']],
      emptyBottles: 2,
      modifiers: [
        { type: 'veiled', bottles: [0] },
        { type: 'mystery', bottles: [1] },
        { type: 'chained', bottles: [{ index: 0, locks: 3 }] },
      ],
    };
    expect(JSON.parse(JSON.stringify(def))).toEqual(def);
  });

  it('modified bottles and moves survive JSON round-trip', () => {
    const state = [veiled('v', 'gold'), chained('k', 2, 'teal'), b('a', 'ruby', 'ruby'), b('c')];
    const { bottles, move } = applyPour(state, 'a', 'c')!;
    expect(JSON.parse(JSON.stringify(bottles))).toEqual(bottles);
    expect(JSON.parse(JSON.stringify(move))).toEqual(move);
  });
});

describe('hasAnyMove (deadlock check)', () => {
  it('is true when any legal pour exists', () => {
    expect(hasAnyMove([b('a', 'ruby'), b('c')])).toBe(true); // pour into the empty
  });

  it('is false when the board is stuck: no space, no matching tops', () => {
    expect(
      hasAnyMove([
        b('a', 'ruby', 'gold', 'ruby', 'gold'),
        b('c', 'gold', 'ruby', 'gold', 'ruby'),
      ]),
    ).toBe(false);
  });

  it('does not count a complete bottle as a source (the UI cannot pick it up)', () => {
    // 'a' is a corked ruby; 'c' has space but its only would-be source is the cork
    expect(hasAnyMove([b('a', 'ruby', 'ruby', 'ruby', 'ruby'), b('c', 'ruby', 'ruby')])).toBe(false);
  });
});
