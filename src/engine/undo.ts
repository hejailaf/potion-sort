import { Bottle, Color, Move } from './types';

/** Exact inverse of applyPour for the given recorded move. Inputs are never mutated. */
export function revertMove(bottles: Bottle[], move: Move): Bottle[] {
  return bottles.map((b) => {
    if (b.id === move.to) {
      return { ...b, segments: b.segments.slice(0, b.segments.length - move.count) };
    }
    if (b.id === move.from) {
      return { ...b, segments: [...b.segments, ...new Array<Color>(move.count).fill(move.color)] };
    }
    return b;
  });
}

export function pushMove(history: Move[], move: Move): Move[] {
  return [...history, move];
}

export function popMove(history: Move[]): { history: Move[]; move: Move | null } {
  if (history.length === 0) return { history, move: null };
  return { history: history.slice(0, -1), move: history[history.length - 1] };
}
