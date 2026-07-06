import { createBottles } from '../../engine/generator';
import { LevelDef } from '../../engine/types';
import { useGameStore } from '../gameStore';
import { MAX_LIVES, useMetaStore } from '../metaStore';

const initialState = useGameStore.getState();
const initialMeta = useMetaStore.getState();

/** Two colors, two filled bottles, one empty — winnable in 3 pours. */
const tinyLevel: LevelDef = {
  id: 99,
  seed: 0,
  bottles: [
    ['ruby', 'ruby', 'gold', 'gold'],
    ['gold', 'gold', 'ruby', 'ruby'],
  ],
  emptyBottles: 1,
};

/** b1's top ruby completes b0 in one pour. */
const completionLevel: LevelDef = {
  id: 98,
  seed: 0,
  bottles: [
    ['ruby', 'ruby', 'ruby'],
    ['gold', 'gold', 'gold', 'ruby'],
  ],
  emptyBottles: 1,
};

/** Two filled + two empty bottles — room for two disjoint simultaneous pours. */
const quadLevel: LevelDef = {
  id: 97,
  seed: 0,
  bottles: [
    ['ruby', 'ruby', 'gold', 'gold'],
    ['gold', 'gold', 'ruby', 'ruby'],
  ],
  emptyBottles: 2,
};

/** b1→b0 corks b0 (ruby×4); b2→b3 is an unrelated non-completing pour. */
const comboLevel: LevelDef = {
  id: 96,
  seed: 0,
  bottles: [
    ['ruby', 'ruby', 'ruby'],
    ['gold', 'ruby'],
    ['gold', 'gold'],
  ],
  emptyBottles: 1,
};

/** Two ruby sources + two empties — both can pour into one target to consolidate. */
const stackLevel: LevelDef = {
  id: 95,
  seed: 0,
  bottles: [['ruby'], ['ruby']],
  emptyBottles: 2,
};

function load(def: LevelDef) {
  useGameStore.setState({ level: def, bottles: createBottles(def) });
}

const tap = (id: string) => useGameStore.getState().tapBottle(id);
const finishAllPours = () => {
  for (const p of useGameStore.getState().activePours) useGameStore.getState().finishPour(p.id);
};
const pour = (from: string, to: string) => {
  tap(from);
  tap(to);
  finishAllPours();
};

beforeEach(() => {
  useGameStore.setState(initialState, true);
  useMetaStore.setState(initialMeta, true);
});

describe('gameStore', () => {
  it('loadLevel deals a generated level and resets state', () => {
    useGameStore.getState().loadLevel(1, 7);
    const s = useGameStore.getState();
    expect(s.level?.id).toBe(1);
    expect(s.bottles).toHaveLength(5); // tier 1: 3 filled + 2 empty
    expect(s.selectedId).toBeNull();
    expect(s.history).toEqual([]);
    expect(s.status).toBe('playing');
    expect(s.activePours).toEqual([]);
  });

  it('selects a non-empty bottle and ignores taps on empty bottles', () => {
    load(tinyLevel);
    tap('b2');
    expect(useGameStore.getState().selectedId).toBeNull();
    tap('b0');
    expect(useGameStore.getState().selectedId).toBe('b0');
  });

  it('deselects when the selected bottle is tapped again', () => {
    load(tinyLevel);
    tap('b0');
    tap('b0');
    expect(useGameStore.getState().selectedId).toBeNull();
  });

  it('applies a legal pour, records it, and tracks the animation with its snapshots', () => {
    load(tinyLevel);
    tap('b0');
    tap('b2');
    const s = useGameStore.getState();
    expect(s.bottles.find((b) => b.id === 'b0')?.segments).toEqual(['ruby', 'ruby']);
    expect(s.bottles.find((b) => b.id === 'b2')?.segments).toEqual(['gold', 'gold']);
    expect(s.history).toEqual([{ from: 'b0', to: 'b2', count: 2, color: 'gold' }]);
    expect(s.selectedId).toBeNull();
    expect(s.activePours).toHaveLength(1);
    expect(s.activePours[0].move).toEqual(s.history[0]);
    expect(s.activePours[0].srcBefore.segments).toEqual(['ruby', 'ruby', 'gold', 'gold']);
    expect(s.activePours[0].tgtBefore.segments).toEqual([]);
  });

  it('locks only the bottles of an in-flight pour; others stay live', () => {
    load(quadLevel);
    tap('b0');
    tap('b2'); // pour 1 in flight: b0 and b2 busy
    tap('b0'); // busy source: ignored
    tap('b2'); // busy target: ignored
    expect(useGameStore.getState().selectedId).toBeNull();
    expect(useGameStore.getState().history).toHaveLength(1);
    tap('b1'); // uninvolved bottle selects immediately
    expect(useGameStore.getState().selectedId).toBe('b1');
    tap('b3'); // and pours while the first animation still flies
    const s = useGameStore.getState();
    expect(s.history).toHaveLength(2);
    expect(s.activePours).toHaveLength(2);
  });

  it('two disjoint pours apply to engine state and finish independently', () => {
    load(quadLevel);
    tap('b0');
    tap('b2');
    tap('b1');
    tap('b3');
    const s = useGameStore.getState();
    expect(s.bottles.find((b) => b.id === 'b0')?.segments).toEqual(['ruby', 'ruby']);
    expect(s.bottles.find((b) => b.id === 'b2')?.segments).toEqual(['gold', 'gold']);
    expect(s.bottles.find((b) => b.id === 'b1')?.segments).toEqual(['gold', 'gold']);
    expect(s.bottles.find((b) => b.id === 'b3')?.segments).toEqual(['ruby', 'ruby']);
    const [first, second] = s.activePours;
    useGameStore.getState().finishPour(first.id);
    expect(useGameStore.getState().activePours).toEqual([second]);
  });

  it('lets a second pour stack into a target that is still being filled', () => {
    load(stackLevel);
    tap('b0');
    tap('b2'); // pour 1: ruby -> empty b2, still animating
    tap('b2'); // b2 is mid-fill: can't be picked up
    expect(useGameStore.getState().selectedId).toBeNull();
    tap('b1'); // free source selects
    expect(useGameStore.getState().selectedId).toBe('b1');
    tap('b2'); // pour 2 stacks onto the still-filling b2
    const s = useGameStore.getState();
    expect(s.activePours).toHaveLength(2);
    expect(s.activePours.every((p) => p.move.to === 'b2')).toBe(true);
    // baselines stack: first pour from empty, second on top of the first
    expect(s.activePours[0].tgtBefore.segments).toEqual([]);
    expect(s.activePours[1].tgtBefore.segments).toEqual(['ruby']);
    expect(s.bottles.find((b) => b.id === 'b2')?.segments).toEqual(['ruby', 'ruby']);
  });

  it('restart mid-animation clears active pours and stale finishPour ids no-op', () => {
    useGameStore.getState().loadLevel(1, 7);
    const src = useGameStore.getState().bottles.find((b) => b.segments.length > 0)!.id;
    tap(src);
    tap('b3'); // tier 1: b3 is empty
    const staleId = useGameStore.getState().activePours[0].id;
    useGameStore.getState().restart();
    expect(useGameStore.getState().activePours).toEqual([]);
    useGameStore.getState().finishPour(staleId); // animation callback landing after restart
    expect(useGameStore.getState().activePours).toEqual([]);
    expect(useGameStore.getState().completionToken).toBe(0);
  });

  it('keeps state untouched on an illegal pour and signals the UI', () => {
    load(tinyLevel);
    const before = useGameStore.getState().bottles;
    tap('b0'); // top is gold
    tap('b1'); // top is ruby -> illegal
    const s = useGameStore.getState();
    expect(s.bottles).toEqual(before);
    expect(s.history).toEqual([]);
    expect(s.selectedId).toBe('b0');
    expect(s.invalidTapToken).toBe(1);
    expect(s.invalidBottleId).toBe('b1');
    expect(s.activePours).toEqual([]);
  });

  it('bumps the completion token once, when the corking pour finishes', () => {
    load(completionLevel);
    tap('b1');
    tap('b0'); // ruby onto ruby×3 -> corks b0 when the animation lands
    expect(useGameStore.getState().completionToken).toBe(0); // in flight: not yet
    finishAllPours();
    expect(useGameStore.getState().completionToken).toBe(1);
    expect(useGameStore.getState().completedBottleId).toBe('b0');
    pour('b1', 'b2'); // gold×3 into empty -> nothing completes
    expect(useGameStore.getState().completionToken).toBe(1);
  });

  it('completion effects wait for the corking pour, not other in-flight pours', () => {
    load(comboLevel);
    tap('b1');
    tap('b0'); // corking pour
    tap('b2');
    tap('b3'); // unrelated pour
    const [corking, plain] = useGameStore.getState().activePours;
    useGameStore.getState().finishPour(plain.id);
    expect(useGameStore.getState().completionToken).toBe(0);
    useGameStore.getState().finishPour(corking.id);
    expect(useGameStore.getState().completionToken).toBe(1);
    expect(useGameStore.getState().completedBottleId).toBe('b0');
  });

  it('does not let a corked (complete) bottle be selected', () => {
    load(completionLevel);
    pour('b1', 'b0'); // completes b0
    tap('b0');
    expect(useGameStore.getState().selectedId).toBeNull();
  });

  it('restart re-deals the identical level', () => {
    useGameStore.getState().loadLevel(1, 7);
    const fresh = useGameStore.getState().bottles;
    pour(fresh.find((b) => b.segments.length > 0)!.id, 'b3');
    useGameStore.getState().restart();
    const s = useGameStore.getState();
    expect(s.bottles).toEqual(fresh);
    expect(s.history).toEqual([]);
    expect(s.status).toBe('playing');
  });

  it('resumeOrLoad resumes a matching in-progress board and clears transient state', () => {
    useGameStore.getState().loadLevel(3);
    const fresh = useGameStore.getState().bottles;
    pour(fresh.find((b) => b.segments.length > 0)!.id, 'b3');
    const midGame = useGameStore.getState().bottles;
    useGameStore.setState({ selectedId: 'b0' }); // stale transient state
    useGameStore.getState().resumeOrLoad(3);
    const s = useGameStore.getState();
    expect(s.bottles).toEqual(midGame); // board kept
    expect(s.history).toHaveLength(1);
    expect(s.selectedId).toBeNull();
  });

  it('resumeOrLoad deals fresh when the level differs or the board was won', () => {
    useGameStore.getState().loadLevel(3);
    useGameStore.getState().resumeOrLoad(4);
    expect(useGameStore.getState().level?.id).toBe(4);
    expect(useGameStore.getState().history).toEqual([]);

    useGameStore.setState({ status: 'won' });
    useGameStore.getState().resumeOrLoad(4);
    expect(useGameStore.getState().status).toBe('playing');
  });

  it('undo reverses moves, consumes a charge each time, and chains back to the start', () => {
    load(tinyLevel);
    const start = useGameStore.getState().bottles;
    pour('b0', 'b2');
    pour('b1', 'b0');
    useGameStore.getState().undoMove();
    useGameStore.getState().undoMove();
    const s = useGameStore.getState();
    expect(s.bottles).toEqual(start);
    expect(s.history).toEqual([]);
    expect(useMetaStore.getState().boosters.undo).toBe(1);
  });

  it('undo is refused with no charges or no history — nothing changes, nothing is consumed', () => {
    load(tinyLevel);
    useGameStore.getState().undoMove(); // empty history
    expect(useMetaStore.getState().boosters.undo).toBe(3);
    pour('b0', 'b2');
    useMetaStore.setState({ boosters: { undo: 0, shuffle: 3, extraBottle: 3 } });
    const before = useGameStore.getState().bottles;
    useGameStore.getState().undoMove();
    expect(useGameStore.getState().bottles).toEqual(before);
    expect(useGameStore.getState().history).toHaveLength(1);
  });

  it('shuffle re-deals the board, clears history, and consumes a charge', () => {
    useGameStore.getState().loadLevel(5, 11); // 4 colors, richer board to shuffle
    const fresh = useGameStore.getState().bottles;
    pour(fresh.find((b) => b.segments.length > 0)!.id, 'b4');
    const afterPour = useGameStore.getState().bottles;
    useGameStore.getState().shuffleBoard();
    const s = useGameStore.getState();
    expect(s.bottles).not.toEqual(afterPour);
    expect(s.history).toEqual([]);
    expect(useMetaStore.getState().boosters.shuffle).toBe(2);
    // fill counts preserved bottle-by-bottle
    const counts = (bs: typeof s.bottles) => bs.map((b) => b.segments.length);
    expect(counts(s.bottles)).toEqual(counts(afterPour));
  });

  it('boosters are blocked while a pour is animating', () => {
    load(tinyLevel);
    tap('b0');
    tap('b2'); // pouring set, not finished
    useGameStore.getState().undoMove();
    useGameStore.getState().shuffleBoard();
    useGameStore.getState().addExtraBottle();
    expect(useMetaStore.getState().boosters).toEqual({ undo: 3, shuffle: 3, extraBottle: 3 });
    expect(useGameStore.getState().history).toHaveLength(1);
  });

  it('+Bottle appends one empty bottle, once per level, reset by loadLevel', () => {
    load(tinyLevel);
    useGameStore.getState().addExtraBottle();
    expect(useGameStore.getState().bottles.at(-1)).toEqual({ id: 'extra', segments: [] });
    expect(useMetaStore.getState().boosters.extraBottle).toBe(2);
    useGameStore.getState().addExtraBottle(); // second use refused
    expect(useGameStore.getState().bottles).toHaveLength(4);
    expect(useMetaStore.getState().boosters.extraBottle).toBe(2);
    useGameStore.getState().loadLevel(1, 7);
    expect(useGameStore.getState().extraBottleUsed).toBe(false);
  });

  it('loadDaily deals a deterministic daily board, resumes it, and restart keeps daily mode', () => {
    useGameStore.getState().loadDaily();
    const s1 = useGameStore.getState();
    expect(s1.mode).toBe('daily');
    const dealt = s1.bottles;
    const seed = s1.level!.seed;

    // same day -> resume the in-progress board, not a re-deal
    const src = dealt.find((b) => b.segments.length > 0)!.id;
    const empty = dealt.find((b) => b.segments.length === 0)!.id;
    pour(src, empty);
    const midGame = useGameStore.getState().bottles;
    useGameStore.getState().loadDaily();
    expect(useGameStore.getState().bottles).toEqual(midGame);

    // restart re-deals the identical daily (and stays in daily mode)
    useGameStore.getState().restart();
    const s2 = useGameStore.getState();
    expect(s2.mode).toBe('daily');
    expect(s2.level?.seed).toBe(seed);
    expect(s2.bottles).toEqual(dealt);

    // a persisted daily board never hijacks normal play
    useGameStore.getState().resumeOrLoad(useGameStore.getState().level!.id);
    expect(useGameStore.getState().mode).toBe('normal');
  });

  it('quitLevel costs one life, re-deals the board, and clears in-flight pours', () => {
    useGameStore.getState().loadLevel(1, 7);
    const fresh = useGameStore.getState().bottles;
    const src = fresh.find((b) => b.segments.length > 0)!.id;
    tap(src);
    tap('b3'); // pour still animating when the player quits
    useGameStore.getState().quitLevel();
    const s = useGameStore.getState();
    expect(useMetaStore.getState().lives).toBe(MAX_LIVES - 1);
    expect(s.bottles).toEqual(fresh);
    expect(s.history).toEqual([]);
    expect(s.activePours).toEqual([]);
  });

  it('quitLevel at 0 lives still quits, never goes negative, and keeps daily mode', () => {
    useMetaStore.setState({ lives: 0, lastLifeAt: Date.now() });
    useGameStore.getState().loadDaily();
    const dealt = useGameStore.getState().bottles;
    const src = dealt.find((b) => b.segments.length > 0)!.id;
    const empty = dealt.find((b) => b.segments.length === 0)!.id;
    pour(src, empty);
    useGameStore.getState().quitLevel();
    expect(useMetaStore.getState().lives).toBe(0);
    expect(useGameStore.getState().mode).toBe('daily');
    expect(useGameStore.getState().history).toEqual([]);
  });

  it('reaches won status after a full hand-played win path and logs it', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    load(tinyLevel);
    pour('b0', 'b2'); // gold,gold -> empty
    pour('b1', 'b0'); // ruby,ruby -> ruby stack (completes b0)
    pour('b1', 'b2'); // gold,gold -> gold stack (completes b2)
    expect(useGameStore.getState().status).toBe('won');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('WIN'));
    log.mockRestore();
    // further taps are ignored once won
    tap('b0');
    expect(useGameStore.getState().selectedId).toBeNull();
  });
});
