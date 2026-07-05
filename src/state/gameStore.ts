import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createBottles, generateLevel, shuffleBottles } from '../engine/generator';
import { applyPour, isBottleComplete, isWin } from '../engine/rules';
import { Bottle, GameStatus, LevelDef, Move } from '../engine/types';
import { popMove, pushMove, revertMove } from '../engine/undo';
import { useMetaStore } from './metaStore';

interface GameState {
  level: LevelDef | null;
  bottles: Bottle[];
  selectedId: string | null;
  history: Move[];
  status: GameStatus;
  /** bumped on every illegal pour; UI reacts with shake + error haptic */
  invalidTapToken: number;
  invalidBottleId: string | null;
  /**
   * The move currently being animated. Engine state is already committed;
   * this only locks input and lets the UI replay the move visually.
   */
  pouring: Move | null;
  /** board state as it was just before the pouring move, for the animation layer */
  prevBottles: Bottle[] | null;
  /** bumped when a pour completes a bottle — completion effects key off this, exactly once */
  completionToken: number;
  completedBottleId: string | null;
  /** +Bottle booster is limited to once per level */
  extraBottleUsed: boolean;
  loadLevel: (levelNumber: number, seed?: number) => void;
  /** resume the persisted in-progress board when it matches, else deal fresh */
  resumeOrLoad: (levelNumber: number) => void;
  tapBottle: (id: string) => void;
  finishPour: () => void;
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
  invalidTapToken: 0,
  invalidBottleId: null,
  pouring: null,
  prevBottles: null,
  completionToken: 0,
  completedBottleId: null,
  extraBottleUsed: false,

  loadLevel: (levelNumber, seed) => {
    const level = generateLevel(levelNumber, seed);
    set({
      level,
      bottles: createBottles(level),
      selectedId: null,
      history: [],
      status: 'playing',
      invalidBottleId: null,
      pouring: null,
      prevBottles: null,
      completedBottleId: null,
      extraBottleUsed: false,
    });
  },

  // ponytail: assumes persist has rehydrated by the time the game screen mounts
  // (home screen comes first); if deep-linking to /game ever exists, gate on hydration.
  resumeOrLoad: (levelNumber) => {
    const { level, status, bottles } = get();
    if (level?.id === levelNumber && status === 'playing' && bottles.length > 0) {
      set({ selectedId: null, pouring: null, prevBottles: null, invalidBottleId: null });
      return;
    }
    get().loadLevel(levelNumber);
  },

  tapBottle: (id) => {
    const { bottles, selectedId, history, status, level, pouring } = get();
    if (status === 'won' || pouring !== null) return;
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
    set((s) => ({
      bottles: result.bottles,
      prevBottles: bottles,
      pouring: result.move,
      history: pushMove(history, result.move),
      selectedId: null,
      status: won ? 'won' : 'playing',
      completedBottleId: completed ? id : null,
      completionToken: completed ? s.completionToken + 1 : s.completionToken,
    }));
  },

  finishPour: () => {
    set({ pouring: null, prevBottles: null });
  },

  restart: () => {
    const { level } = get();
    if (level) get().loadLevel(level.id, level.seed);
  },

  undoMove: () => {
    const { bottles, history, pouring, status } = get();
    if (pouring !== null || status === 'won' || history.length === 0) return;
    if (!useMetaStore.getState().consumeBooster('undo')) return;
    const { history: rest, move } = popMove(history);
    set({ bottles: revertMove(bottles, move!), history: rest, selectedId: null });
  },

  shuffleBoard: () => {
    const { bottles, level, history, pouring, status } = get();
    if (pouring !== null || status === 'won') return;
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
    const { bottles, pouring, status, extraBottleUsed } = get();
    if (pouring !== null || status === 'won' || extraBottleUsed) return;
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
        extraBottleUsed: s.extraBottleUsed,
      }),
    },
  ),
);
