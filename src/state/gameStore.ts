import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createBottles, generateLevel, shuffleBottles } from '../engine/generator';
import { applyPour, isBottleComplete, isWin } from '../engine/rules';
import { Bottle, GameStatus, LevelDef, Move } from '../engine/types';
import { popMove, pushMove, revertMove } from '../engine/undo';
import { todayKey, useMetaStore } from './metaStore';

/** fixed difficulty tier for the daily challenge (past the hand-tuned range) */
const DAILY_LEVEL = 30;

export interface ActivePour {
  id: number;
  move: Move;
  /** pre-pour source snapshot — the flying clone's contents */
  srcBefore: Bottle;
  /** pre-pour target snapshot — board display + fill baseline */
  tgtBefore: Bottle;
  /** this pour corks the target; completion effects fire when it finishes */
  completes: boolean;
}

let pourSeq = 0;

interface GameState {
  level: LevelDef | null;
  bottles: Bottle[];
  selectedId: string | null;
  history: Move[];
  status: GameStatus;
  /** daily-challenge boards win differently and never advance the level counter */
  mode: 'normal' | 'daily';
  /** bumped on every illegal pour; UI reacts with shake + error haptic */
  invalidTapToken: number;
  invalidBottleId: string | null;
  /**
   * Pours currently being animated. Engine state is already committed;
   * these lock only their own two bottles and let the UI replay each move visually.
   */
  activePours: ActivePour[];
  /** bumped when a pour completes a bottle — completion effects key off this, exactly once */
  completionToken: number;
  completedBottleId: string | null;
  /** +Bottle booster is limited to once per level */
  extraBottleUsed: boolean;
  loadLevel: (levelNumber: number, seed?: number, mode?: 'normal' | 'daily') => void;
  /** resume the persisted in-progress board when it matches, else deal fresh */
  resumeOrLoad: (levelNumber: number) => void;
  /** deal (or resume) today's seeded daily-challenge board */
  loadDaily: () => void;
  tapBottle: (id: string) => void;
  finishPour: (pourId: number) => void;
  restart: () => void;
  undoMove: () => void;
  shuffleBoard: () => void;
  addExtraBottle: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      level: null,
  bottles: [],
  selectedId: null,
  history: [],
  status: 'playing',
  mode: 'normal',
  invalidTapToken: 0,
  invalidBottleId: null,
  activePours: [],
  completionToken: 0,
  completedBottleId: null,
  extraBottleUsed: false,

  loadLevel: (levelNumber, seed, mode = 'normal') => {
    const level = generateLevel(levelNumber, seed);
    set({
      level,
      bottles: createBottles(level),
      selectedId: null,
      history: [],
      status: 'playing',
      mode,
      invalidBottleId: null,
      activePours: [],
      completedBottleId: null,
      extraBottleUsed: false,
    });
  },

  // ponytail: assumes persist has rehydrated by the time the game screen mounts
  // (home screen comes first); if deep-linking to /game ever exists, gate on hydration.
  resumeOrLoad: (levelNumber) => {
    const { level, status, bottles, mode } = get();
    if (mode === 'normal' && level?.id === levelNumber && status === 'playing' && bottles.length > 0) {
      set({ selectedId: null, activePours: [], invalidBottleId: null });
      return;
    }
    get().loadLevel(levelNumber);
  },

  loadDaily: () => {
    const seed = Number(todayKey().replace(/-/g, ''));
    const { level, status, bottles, mode } = get();
    if (mode === 'daily' && level?.seed === seed && status === 'playing' && bottles.length > 0) {
      set({ selectedId: null, activePours: [], invalidBottleId: null });
      return;
    }
    get().loadLevel(DAILY_LEVEL, seed, 'daily');
  },

  tapBottle: (id) => {
    const { bottles, selectedId, history, status, level, activePours } = get();
    // only the bottles of an in-flight pour are locked; taps on them are
    // silently ignored (the player is being fast, not wrong — no shake)
    const busy = activePours.some((p) => p.move.from === id || p.move.to === id);
    if (status === 'won' || busy) return;
    const tapped = bottles.find((b) => b.id === id);
    if (!tapped) return;

    if (selectedId === null) {
      // corked (complete) bottles are done — they can't be picked up again
      if (tapped.segments.length > 0 && !isBottleComplete(tapped)) set({ selectedId: id });
      return;
    }
    if (selectedId === id) {
      set({ selectedId: null });
      return;
    }

    const result = applyPour(bottles, selectedId, id);
    if (result === null) {
      set((s) => ({ invalidTapToken: s.invalidTapToken + 1, invalidBottleId: id }));
      return;
    }
    const target = result.bottles.find((b) => b.id === id)!;
    const completed = isBottleComplete(target);
    const won = isWin(result.bottles);
    if (won) {
      console.log(`WIN: level ${level?.id} solved in ${history.length + 1} moves`);
    }
    const srcBefore = bottles.find((b) => b.id === selectedId)!;
    set((s) => ({
      bottles: result.bottles,
      activePours: [
        ...s.activePours,
        { id: ++pourSeq, move: result.move, srcBefore, tgtBefore: tapped, completes: completed },
      ],
      history: pushMove(history, result.move),
      selectedId: null,
      status: won ? 'won' : 'playing',
    }));
  },

  finishPour: (pourId) => {
    set((s) => {
      const done = s.activePours.find((p) => p.id === pourId);
      if (!done) return {}; // stale id after restart/exit: no-op
      return {
        activePours: s.activePours.filter((p) => p.id !== pourId),
        // completion effects fire now — when the corking animation lands
        ...(done.completes
          ? { completionToken: s.completionToken + 1, completedBottleId: done.move.to }
          : {}),
      };
    });
  },

  restart: () => {
    const { level, mode } = get();
    if (!level) return;
    if (!useMetaStore.getState().spendLife()) return;
    get().loadLevel(level.id, level.seed, mode);
  },

  undoMove: () => {
    const { bottles, history, activePours, status } = get();
    if (activePours.length > 0 || status === 'won' || history.length === 0) return;
    if (!useMetaStore.getState().consumeBooster('undo')) return;
    const { history: rest, move } = popMove(history);
    set({ bottles: revertMove(bottles, move!), history: rest, selectedId: null });
  },

  shuffleBoard: () => {
    const { bottles, level, history, activePours, status } = get();
    if (activePours.length > 0 || status === 'won') return;
    if (useMetaStore.getState().boosters.shuffle <= 0) return;
    const next = shuffleBottles(bottles, (level?.seed ?? 1) * 31 + history.length + 1);
    if (next === null) {
      // nothing to shuffle: error feedback (sound/haptic only — no bottle to shake), keep the charge
      set((s) => ({ invalidTapToken: s.invalidTapToken + 1, invalidBottleId: null }));
      return;
    }
    useMetaStore.getState().consumeBooster('shuffle');
    // history is cleared: pre-shuffle moves can't be replayed against re-dealt bottles
    set({ bottles: next, history: [], selectedId: null });
  },

  addExtraBottle: () => {
    const { bottles, activePours, status, extraBottleUsed } = get();
    if (activePours.length > 0 || status === 'won' || extraBottleUsed) return;
    if (!useMetaStore.getState().consumeBooster('extraBottle')) return;
    set({ bottles: [...bottles, { id: 'extra', segments: [] }], extraBottleUsed: true });
  },
    }),
    {
      name: 'potion-sort-game',
      storage: createJSONStorage(() => AsyncStorage),
      // only the board itself persists; selection/animation state is transient
      partialize: (s) => ({
        level: s.level,
        bottles: s.bottles,
        history: s.history,
        status: s.status,
        mode: s.mode,
        extraBottleUsed: s.extraBottleUsed,
      }),
    },
  ),
);
