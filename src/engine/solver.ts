import { Bottle } from './types';
import { applyPour, canPour, isBottleComplete, isWin, revealNextVeil, topRun } from './rules';

export interface SolveResult {
  solvable: boolean;
  /** Length of the first solution path found (depth-first, not necessarily minimal). */
  moveEstimate?: number;
}

// ponytail: hard cap on explored states; a cap hit reports "unsolvable" and the
// generator simply retries with the next deal. Raise if the property test flakes.
const VISITED_CAP = 200_000;

/** Bottles are interchangeable, so sorting their serialized contents dedupes symmetric states.
 *  Veiled / still-chained bottles carry a state prefix so they never conflate with normal
 *  ones (truthy checks only: unmodified boards produce byte-identical keys, and a drained
 *  `locks: 0` bottle merges back with plain bottles). */
function canonicalKey(bottles: Bottle[]): string {
  return bottles
    .map((b) => (b.veiled ? 'V!' : '') + (b.locks ? `L${b.locks}!` : '') + b.segments.join(','))
    .sort()
    .join('|');
}

/** Post-pour transition shared by solve/hintMove: a cork on the pour target lifts one veil. */
function afterPour(bottles: Bottle[], toId: string): Bottle[] {
  const target = bottles.find((b) => b.id === toId)!;
  return isBottleComplete(target) ? revealNextVeil(bottles) : bottles;
}

/** Memoized DFS over canonical states: is this position winnable? */
export function solve(bottles: Bottle[]): SolveResult {
  const visited = new Set<string>();

  function dfs(state: Bottle[], depth: number): number | null {
    if (isWin(state)) return depth;
    const key = canonicalKey(state);
    if (visited.has(key) || visited.size >= VISITED_CAP) return null;
    visited.add(key);

    // while chains are ticking, "pointless" pours advance the lock clock, so the
    // whole-bottle-into-empty pruning below is unsound and must be suspended
    const clockTicking = state.some((x) => x.locks);

    for (const from of state) {
      if (from.segments.length === 0 || isBottleComplete(from)) continue;
      const run = topRun(from)!;
      // matching-color targets first; a single empty target last (empties are interchangeable)
      const matching: Bottle[] = [];
      let empty: Bottle | null = null;
      for (const to of state) {
        if (!canPour(from, to)) continue;
        if (to.segments.length === 0) {
          if (!empty && (clockTicking || run.count < from.segments.length)) empty = to;
        } else {
          matching.push(to);
        }
      }
      if (empty) matching.push(empty);
      for (const to of matching) {
        const result = applyPour(state, from.id, to.id)!;
        const won = dfs(afterPour(result.bottles, to.id), depth + 1);
        if (won !== null) return won;
      }
    }
    return null;
  }

  const moves = dfs(bottles, 0);
  return moves === null ? { solvable: false } : { solvable: true, moveEstimate: moves };
}

/**
 * The first move of a solution from this state — the hint booster's payload.
 * Same search order as `solve`, but records the path instead of only its depth
 * (kept separate so `solve`'s hot generator loop stays allocation-free). Returns
 * null when the position is unsolvable / a dead end.
 */
export function hintMove(bottles: Bottle[]): { from: string; to: string } | null {
  const visited = new Set<string>();

  function dfs(state: Bottle[]): { from: string; to: string } | null {
    if (isWin(state)) return null; // already solved: no move to hint
    const key = canonicalKey(state);
    if (visited.has(key) || visited.size >= VISITED_CAP) return null;
    visited.add(key);

    // see solve(): empty-pour pruning is suspended while chains are ticking
    const clockTicking = state.some((x) => x.locks);

    for (const from of state) {
      if (from.segments.length === 0 || isBottleComplete(from)) continue;
      const run = topRun(from)!;
      const matching: Bottle[] = [];
      let empty: Bottle | null = null;
      for (const to of state) {
        if (!canPour(from, to)) continue;
        if (to.segments.length === 0) {
          if (!empty && (clockTicking || run.count < from.segments.length)) empty = to;
        } else {
          matching.push(to);
        }
      }
      if (empty) matching.push(empty);
      for (const to of matching) {
        const result = applyPour(state, from.id, to.id)!;
        const next = afterPour(result.bottles, to.id);
        if (isWin(next) || dfs(next) !== null) {
          return { from: from.id, to: to.id };
        }
      }
    }
    return null;
  }

  return dfs(bottles);
}
