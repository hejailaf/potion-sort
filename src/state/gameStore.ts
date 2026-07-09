import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createBottles, generateLevel, shuffleBottles } from '../engine/generator';
import { applyPour, isBottleComplete, isWin, revealNextVeil } from '../engine/rules';
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

/** Mystery watermark: bottle id → how many bottom segments are still unrevealed.
 *  Monotone — lowering only. Display-only state; the engine stays omniscient. */
export function settleHidden(
  hidden: Record<string, number>,
  bottles: Bottle[],
): Record<string, number> {
  let changed = false;
  const next = { ...hidden };
  for (const b of bottles) {
    const prev = next[b.id];
    if (prev === undefined) continue;
    const cap = Math.max(0, b.segments.length - 1);
    if (cap < prev) {
      next[b.id] = cap;
      changed = true;
    }
  }
  return changed ? next : hidden;
}

/** initial watermark: every below-top segment of a mystery bottle starts hidden */
export function initialHidden(level: LevelDef): Record<string, number> {
  const hidden: Record<string, number> = {};
  for (const m of level.modifiers ?? []) {
    if (m.type !== 'mystery') continue;
    for (const i of m.bottles) hidden[`b${i}`] = Math.max(0, level.bottles[i].length - 1);
  }
  return hidden;
}

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
  /** solver move the hint booster is currently glowing (from→to), or null */
  hint: { from: string; to: string } | null;
  /** the once-per-level free hint has been spent */
  hintUsed: boolean;
  /** transient: when this board was dealt — feeds the level_win duration metric */
  startedAt: number;
  /** mystery watermark per bottle id (persisted; empty when the level has no mystery bottles) */
  hiddenCounts: Record<string, number>;
  loadLevel: (levelNumber: number, seed?: number, mode?: 'normal' | 'daily') => void;
  /** resume the persisted in-progress board when it matches, else deal fresh */
  resumeOrLoad: (levelNumber: number) => void;
  /** deal (or resume) today's seeded daily-challenge board */
  loadDaily: () => void;
  tapBottle: (id: string) => void;
  finishPour: (pourId: number) => void;
  restart: () => void;
  /** give up the current board: costs a life (no-op at 0 — never traps the player) and re-deals it */
  quitLevel: () => void;
  undoMove: () => void;
  shuffleBoard: () => void;
  addExtraBottle: () => void;
  /** glow the given solver move; marks the free hint spent */
  showHint: (move: { from: string; to: string }) => void;
  clearHint: () => void;
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
  hint: null,
  hintUsed: false,
  startedAt: 0,
  hiddenCounts: {},

  loadLevel: (levelNumber, seed, mode = 'normal') => {
    // modifiers stay off until the mechanics UI ships (Phase 3 flips this to withModifiers)
    const level = generateLevel(levelNumber, seed);
    set({
      level,
      bottles: createBottles(level),
      hiddenCounts: initialHidden(level),
      selectedId: null,
      history: [],
      status: 'playing',
      mode,
      invalidBottleId: null,
      activePours: [],
      completedBottleId: null,
      extraBottleUsed: false,
      hint: null,
      hintUsed: false,
      // ponytail: resumed boards reset the clock on re-entry; fine for a coarse metric
      startedAt: Date.now(),
    });
  },

  // ponytail: assumes persist has rehydrated by the time the game screen mounts
  // (home screen comes first); if deep-linking to /game ever exists, gate on hydration.
  resumeOrLoad: (levelNumber) => {
    const { level, status, bottles, mode } = get();
    if (mode === 'normal' && level?.id === levelNumber && status === 'playing' && bottles.length > 0) {
      set({ selectedId: null, activePours: [], invalidBottleId: null, hint: null });
      return;
    }
    get().loadLevel(levelNumber);
  },

  loadDaily: () => {
    const seed = Number(todayKey().replace(/-/g, ''));
    const { level, status, bottles, mode } = get();
    if (mode === 'daily' && level?.seed === seed && status === 'playing' && bottles.length > 0) {
      set({ selectedId: null, activePours: [], invalidBottleId: null, hint: null });
      return;
    }
    get().loadLevel(DAILY_LEVEL, seed, 'daily');
  },

  tapBottle: (id) => {
    const { bottles, selectedId, history, status, activePours } = get();
    if (status === 'won') return;
    // a bottle draining into another is off-limits until it lands; but a bottle
    // that is only *receiving* a pour can still take more (rapid consolidation) —
    // it just can't be picked up while its fill animates
    if (activePours.some((p) => p.move.from === id)) return;
    const tapped = bottles.find((b) => b.id === id);
    if (!tapped) return;

    if (selectedId === null) {
      if (activePours.some((p) => p.move.to === id)) return; // mid-fill: can't pick up
      // frozen bottles (veiled / still-chained) can't be picked up — shake, don't select
      if (tapped.veiled || tapped.locks) {
        set((s) => ({ invalidTapToken: s.invalidTapToken + 1, invalidBottleId: id }));
        return;
      }
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
    // a cork lifts one veil, at commit time like all engine state (UI animates it
    // off completionToken when the corking pour lands)
    const committed = completed ? revealNextVeil(result.bottles) : result.bottles;
    const won = isWin(committed);
    const srcBefore = bottles.find((b) => b.id === selectedId)!;
    set((s) => ({
      bottles: committed,
      hiddenCounts: settleHidden(s.hiddenCounts, committed),
      activePours: [
        ...s.activePours,
        { id: ++pourSeq, move: result.move, srcBefore, tgtBefore: tapped, completes: completed },
      ],
      history: pushMove(history, result.move),
      selectedId: null,
      hint: null, // any pour makes a glowing hint stale
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

  quitLevel: () => {
    const { level, mode } = get();
    if (!level) return;
    useMetaStore.getState().spendLife(); // false at 0 lives — quitting is still allowed
    get().loadLevel(level.id, level.seed, mode); // abandons the board (quit ≠ free resume)
  },

  undoMove: () => {
    const { bottles, history, activePours, status } = get();
    if (activePours.length > 0 || status === 'won' || history.length === 0) return;
    if (!useMetaStore.getState().consumeBooster('undo')) return;
    const { history: rest, move } = popMove(history);
    const reverted = revertMove(bottles, move!);
    // settleHidden is monotone: undo restores liquid but never re-hides a surfaced segment
    set((s) => ({
      bottles: reverted,
      history: rest,
      selectedId: null,
      hiddenCounts: settleHidden(s.hiddenCounts, reverted),
    }));
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
    // re-dealt mystery bottles hide their below-top segments again (fresh mystery)
    const rehidden = { ...get().hiddenCounts };
    for (const m of level?.modifiers ?? []) {
      if (m.type !== 'mystery') continue;
      for (const i of m.bottles) {
        const bid = `b${i}`;
        const len = next.find((x) => x.id === bid)?.segments.length ?? 0;
        rehidden[bid] = Math.max(0, len - 1);
      }
    }
    // history is cleared: pre-shuffle moves can't be replayed against re-dealt bottles
    set({ bottles: next, history: [], selectedId: null, hiddenCounts: rehidden });
  },

  addExtraBottle: () => {
    const { bottles, activePours, status, extraBottleUsed } = get();
    if (activePours.length > 0 || status === 'won' || extraBottleUsed) return;
    if (!useMetaStore.getState().consumeBooster('extraBottle')) return;
    set({ bottles: [...bottles, { id: 'extra', segments: [] }], extraBottleUsed: true, hint: null });
  },

  showHint: (move) => set({ hint: move, hintUsed: true }),
  clearHint: () => set({ hint: null }),
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
        hiddenCounts: s.hiddenCounts,
      }),
    },
  ),
);
