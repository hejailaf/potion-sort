export type Color =
  | 'ruby'
  | 'amber'
  | 'gold'
  | 'emerald'
  | 'teal'
  | 'sapphire'
  | 'violet'
  | 'rose';

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
};

export const ALL_COLORS = Object.keys(COLOR_HEX) as Color[];

export const BOTTLE_CAPACITY = 4;

export interface Bottle {
  id: string;
  /** index 0 = bottom of the bottle */
  segments: Color[];
}

export interface Move {
  from: string;
  to: string;
  count: number;
  color: Color;
}

export interface LevelDef {
  id: number;
  seed: number;
  /** contents of the pre-filled bottles; empty bottles are appended after these */
  bottles: Color[][];
  emptyBottles: number;
}

export type GameStatus = 'playing' | 'won';
