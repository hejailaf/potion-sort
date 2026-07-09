export type Color =
  | 'ruby'
  | 'amber'
  | 'gold'
  | 'emerald'
  | 'teal'
  | 'sapphire'
  | 'violet'
  | 'rose'
  | 'ivory'
  | 'umber';

// v2 "Candlelit Alchemy" jewel set (design tokens --v2-liquid-*)
export const COLOR_HEX: Record<Color, string> = {
  ruby: '#FF4D5E',
  amber: '#FF9838',
  gold: '#FFD23F',
  emerald: '#3FD46A',
  teal: '#2FD3C4',
  sapphire: '#4A7DFF',
  violet: '#A85CFF',
  rose: '#FF63C1',
  ivory: '#F2E6C8',
  umber: '#A05A2C',
};

/** Distinct symbol per color for the color-blind accessibility mode. */
export const COLOR_SYMBOL: Record<Color, string> = {
  ruby: '●',
  amber: '▲',
  gold: '★',
  emerald: '■',
  teal: '◆',
  sapphire: '✚',
  violet: '♥',
  rose: '☾',
  ivory: '✿',
  umber: '⬢',
};

export const ALL_COLORS = Object.keys(COLOR_HEX) as Color[];

export const BOTTLE_CAPACITY = 4;

export interface Bottle {
  id: string;
  /** index 0 = bottom of the bottle */
  segments: Color[];
  /** veiled: contents hidden, can't pour in or out; a cork on any other bottle lifts one veil */
  veiled?: boolean;
  /** chained: can't pour in or out while > 0; every pour on the board decrements by 1 */
  locks?: number;
}

export interface Move {
  from: string;
  to: string;
  count: number;
  color: Color;
  /** ids of chained bottles whose locks this pour decremented (for exact undo) */
  decremented?: string[];
}

/** Level mechanics. `bottles` are indices into LevelDef.bottles (filled bottles only —
 *  never empties or the booster 'extra' bottle). At most one modifier per level in v1.3. */
export type Modifier =
  | { type: 'veiled'; bottles: number[] }
  | { type: 'mystery'; bottles: number[] }
  | { type: 'chained'; bottles: { index: number; locks: number }[] };

export interface LevelDef {
  id: number;
  seed: number;
  /** contents of the pre-filled bottles; empty bottles are appended after these */
  bottles: Color[][];
  emptyBottles: number;
  modifiers?: Modifier[];
}

export type GameStatus = 'playing' | 'won';
