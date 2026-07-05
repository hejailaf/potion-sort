export type Color =
  | 'ruby'
  | 'amber'
  | 'gold'
  | 'emerald'
  | 'teal'
  | 'sapphire'
  | 'violet'
  | 'rose';

export const COLOR_HEX: Record<Color, string> = {
  ruby: '#E64A4A',
  amber: '#F2913D',
  gold: '#F2D43D',
  emerald: '#3DCC5E',
  teal: '#2FBDB3',
  sapphire: '#3D6EF2',
  violet: '#8A4AE6',
  rose: '#E64A9E',
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
