import { createBottles } from '../../engine/generator';
import { LevelDef } from '../../engine/types';
import { useGameStore } from '../gameStore';
import { useMetaStore } from '../metaStore';

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

function load(def: LevelDef) {
  useGameStore.setState({ level: def, bottles: createBottles(def) });
}

const tap = (id: string) => useGameStore.getState().tapBottle(id);
const finishPour = () => useGameStore.getState().finishPour();
const pour = (from: string, to: string) => {
  tap(from);
  tap(to);
  finishPour();
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
    expect(s.pouring).toBeNull();
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

  it('applies a legal pour, records it, and starts the pour animation lock', () => {
    load(tinyLevel);
    tap('b0');
    tap('b2');
    const s = useGameStore.getState();
    expect(s.bottles.find((b) => b.id === 'b0')?.segments).toEqual(['ruby', 'ruby']);
    expect(s.bottles.find((b) => b.id === 'b2')?.segments).toEqual(['gold', 'gold']);
    expect(s.history).toEqual([{ from: 'b0', to: 'b2', count: 2, color: 'gold' }]);
    expect(s.selectedId).toBeNull();
    expect(s.pouring).toEqual(s.history[0]);
    expect(s.prevBottles).toEqual(createBottles(tinyLevel));
  });

  it('locks input while a pour is animating and unlocks on finishPour', () => {
    load(tinyLevel);
    tap('b0');
    tap('b2'); // pour starts, input locked
    const during = useGameStore.getState().bottles;
    tap('b1');
    tap('b0');
    expect(useGameStore.getState().selectedId).toBeNull();
    expect(useGameStore.getState().bottles).toEqual(during);
    expect(useGameStore.getState().history).toHaveLength(1);
    finishPour();
    tap('b1');
    expect(useGameStore.getState().selectedId).toBe('b1');
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
    expect(s.pouring).toBeNull();
  });

  it('bumps the completion token exactly once when a pour completes a bottle', () => {
    load(completionLevel);
    pour('b1', 'b0'); // ruby onto ruby×3 -> b0 complete
    expect(useGameStore.getState().completionToken).toBe(1);
    expect(useGameStore.getState().completedBottleId).toBe('b0');
    pour('b1', 'b2'); // gold×3 into empty -> nothing completes
    expect(useGameStore.getState().completionToken).toBe(1);
    expect(useGameStore.getState().completedBottleId).toBeNull();
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
