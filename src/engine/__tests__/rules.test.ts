import { applyPour, canPour, isBottleComplete, isWin, pourAmount, topRun } from '../rules';
import { Bottle, Color } from '../types';

const b = (id: string, ...segments: Color[]): Bottle => ({ id, segments });

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
