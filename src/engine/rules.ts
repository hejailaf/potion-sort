import { Bottle, BOTTLE_CAPACITY, Color, Move } from './types';

export interface TopRun {
  color: Color;
  count: number;
}

/** The color on top of the bottle and how many consecutive segments share it. */
export function topRun(bottle: Bottle): TopRun | null {
  const { segments } = bottle;
  if (segments.length === 0) return null;
  const color = segments[segments.length - 1];
  let count = 1;
  for (let i = segments.length - 2; i >= 0 && segments[i] === color; i--) {
    count++;
  }
  return { color, count };
}

export function isBottleComplete(bottle: Bottle): boolean {
  return (
    bottle.segments.length === BOTTLE_CAPACITY &&
    bottle.segments.every((c) => c === bottle.segments[0])
  );
}

export function canPour(from: Bottle, to: Bottle): boolean {
  if (from.id === to.id) return false;
  // veiled / still-chained bottles are frozen: nothing in, nothing out
  if (from.veiled || to.veiled || from.locks || to.locks) return false;
  const run = topRun(from);
  if (!run) return false;
  if (to.segments.length >= BOTTLE_CAPACITY) return false;
  const target = topRun(to);
  return target === null || target.color === run.color;
}

/** How many segments would actually transfer: the top run, capped by target space. */
export function pourAmount(from: Bottle, to: Bottle): number {
  if (!canPour(from, to)) return 0;
  const run = topRun(from)!;
  return Math.min(run.count, BOTTLE_CAPACITY - to.segments.length);
}

export interface PourResult {
  bottles: Bottle[];
  move: Move;
}

/**
 * The only mutation path for bottle state. Returns a new bottle array and the
 * Move that was applied, or null if the pour is illegal. Inputs are never mutated.
 */
export function applyPour(bottles: Bottle[], fromId: string, toId: string): PourResult | null {
  const from = bottles.find((b) => b.id === fromId);
  const to = bottles.find((b) => b.id === toId);
  if (!from || !to) return null;
  const count = pourAmount(from, to);
  if (count === 0) return null;
  const color = topRun(from)!.color;
  const decremented: string[] = [];
  const next = bottles.map((b) => {
    if (b.id === fromId) return { ...b, segments: b.segments.slice(0, b.segments.length - count) };
    if (b.id === toId) return { ...b, segments: [...b.segments, ...new Array<Color>(count).fill(color)] };
    if (b.locks) {
      decremented.push(b.id);
      return { ...b, locks: b.locks - 1 };
    }
    return b;
  });
  const move: Move = { from: fromId, to: toId, count, color };
  if (decremented.length > 0) move.decremented = decremented;
  return { bottles: next, move };
}

/**
 * Lift one veil: the veiled bottle with the lexicographically smallest contents.
 * (Not lowest index — the solver's canonical key treats bottles as interchangeable,
 * and contents-order keeps that sound. Contents are hidden, so players can't tell.)
 * Identity return when nothing is veiled.
 */
export function revealNextVeil(bottles: Bottle[]): Bottle[] {
  let pick: Bottle | null = null;
  let pickKey = '';
  for (const b of bottles) {
    if (!b.veiled) continue;
    const key = b.segments.join(',');
    if (pick === null || key < pickKey) {
      pick = b;
      pickKey = key;
    }
  }
  if (pick === null) return bottles;
  return bottles.map((b) => (b === pick ? { ...b, veiled: false } : b));
}

/** Win when every bottle is either empty or full of a single color. */
export function isWin(bottles: Bottle[]): boolean {
  return bottles.every((b) => b.segments.length === 0 || isBottleComplete(b));
}

/**
 * Any legal pour the player could actually make? Complete bottles are excluded as
 * sources — the UI never lets them be picked up — so `false` means a real deadlock,
 * not merely "the solver would stop here".
 */
export function hasAnyMove(bottles: Bottle[]): boolean {
  return bottles.some(
    (from) => !isBottleComplete(from) && bottles.some((to) => canPour(from, to)),
  );
}
