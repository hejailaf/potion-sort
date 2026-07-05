import { Bottle } from './types';
import { applyPour, canPour, isBottleComplete, isWin, topRun } from './rules';

export interface SolveResult {
  solvable: boolean;
  /** Length of the first solution path found (depth-first, not necessarily minimal). */
  moveEstimate?: number;
}

// ponytail: hard cap on explored states; a cap hit reports "unsolvable" and the
// generator simply retries with the next deal. Raise if the property test flakes.
const VISITED_CAP = 200_000;

/** Bottles are interchangeable, so sorting their serialized contents dedupes symmetric states. */
function canonicalKey(bottles: Bottle[]): string {
  return bottles
    .map((b) => b.segments.join(','))
    .sort()
    .join('|');
}

/** Memoized DFS over canonical states: is this position winnable? */
export function solve(bottles: Bottle[]): SolveResult {
  const visited = new Set<string>();

  function dfs(state: Bottle[], depth: number): number | null {
    if (isWin(state)) return depth;
    const key = canonicalKey(state);
    if (visited.has(key) || visited.size >= VISITED_CAP) return null;
    visited.add(key);

    for (const from of state) {
      if (from.segments.length === 0 || isBottleComplete(from)) continue;
      const run = topRun(from)!;
      // matching-color targets first; a single empty target last (empties are interchangeable)
      const matching: Bottle[] = [];
      let empty: Bottle | null = null;
      for (const to of state) {
        if (!canPour(from, to)) continue;
        if (to.segments.length === 0) {
          if (!empty && run.count < from.segments.length) empty = to;
        } else {
          matching.push(to);
        }
      }
      if (empty) matching.push(empty);
      for (const to of matching) {
        const result = applyPour(state, from.id, to.id)!;
        const won = dfs(result.bottles, depth + 1);
        if (won !== null) return won;
      }
    }
    return null;
  }

  const moves = dfs(bottles, 0);
  return moves === null ? { solvable: false } : { solvable: true, moveEstimate: moves };
}
