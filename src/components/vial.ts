import { Skia, SkPath } from '@shopify/react-native-skia';
import { Color, COLOR_HEX } from '@/engine/types';

/** Capsule vial from the design mock (templates/mobile-app-v2/GameScreen.dc.html).
 *  Reference bottle: 58 wide × 181 tall = 8 cap + 9 neck + 164 body; every value
 *  below scales by w/58. Cool navy glass, stopper cap on every bottle. */

const REF = 58;
/** bottle box height = width * HEIGHT_RATIO (cap + neck + body) */
export const HEIGHT_RATIO = 181 / REF;

export const capH = (w: number) => (8 / REF) * w;
export const neckH = (w: number) => (9 / REF) * w;
/** y where the glass body starts (below cap + neck) */
export const bodyTop = (w: number) => (17 / REF) * w;

export function segmentGeometry(w: number, h: number, capacity: number) {
  const s = w / REF;
  const fillTop = bodyTop(w) + 3 * s;
  const fillBottom = h - 3 * s;
  return { fillTop, fillBottom, segH: (fillBottom - fillTop) / capacity };
}

/** local mouth point (stream origin / tilt pivot): the neck opening */
export function mouthPoint(w: number, h: number) {
  return { x: w / 2, y: capH(w) + neckH(w) * 0.3 };
}

/** rounded rect with distinct top/bottom corner radii, as a path */
export function roundedRect(x: number, y: number, w: number, h: number, rt: number, rb: number): SkPath {
  const p = Skia.Path.Make();
  const r = x + w;
  const b = y + h;
  p.moveTo(x + rt, y);
  p.lineTo(r - rt, y);
  p.quadTo(r, y, r, y + rt);
  p.lineTo(r, b - rb);
  p.quadTo(r, b, r - rb, b);
  p.lineTo(x + rb, b);
  p.quadTo(x, b, x, b - rb);
  p.lineTo(x, y + rt);
  p.quadTo(x, y, x + rt, y);
  p.close();
  return p;
}

const cache = new Map<string, { glass: SkPath; interior: SkPath }>();

/** glass = the body outline (stroke/glow); interior = liquid clip (body inset 3) */
export function vialPaths(w: number, h: number) {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  let hit = cache.get(key);
  if (!hit) {
    const s = w / REF;
    const y0 = bodyTop(w);
    hit = {
      glass: roundedRect(0, y0, w, h - y0, 24 * s, 17 * s),
      interior: roundedRect(3 * s, y0 + 3 * s, w - 6 * s, h - y0 - 6 * s, 21 * s, 14 * s),
    };
    cache.set(key, hit);
  }
  return hit;
}

/** hex color with alpha */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** halo margin around the bottle canvas so glows aren't clipped */
export const GLOW_PAD = 16;

/** the mock's glass chrome */
export const GLASS_STROKE = 'rgba(170,190,245,0.55)';
export const CAP_STROKE = 'rgba(165,185,240,0.55)';

/** per-liquid dark (edge) and light (sheen band) hexes — exact values from the mock */
export const LIQUID_DARK: Record<Color, string> = {
  ruby: '#D63545',
  amber: '#E07A1E',
  gold: '#E0B01E',
  emerald: '#2BAD50',
  teal: '#1FAE9F',
  sapphire: '#3560DB',
  violet: '#8A42E0',
  rose: '#DB459F',
};
export const LIQUID_LIGHT: Record<Color, string> = {
  ruby: '#FFA0A8',
  amber: '#FFC177',
  gold: '#FFE58F',
  emerald: '#7FE8A0',
  teal: '#7FE9DF',
  sapphire: '#8FAEFF',
  violet: '#C99CFF',
  rose: '#FF9FD8',
};

/** horizontal cylinder shading: dark edge → base → light sheen (40%) → base → dark edge */
export function cylinderGradient(c: Color): { colors: string[]; positions: number[] } {
  return {
    colors: [LIQUID_DARK[c], COLOR_HEX[c], LIQUID_LIGHT[c], COLOR_HEX[c], LIQUID_DARK[c]],
    positions: [0, 0.2, 0.4, 0.68, 1],
  };
}

/** mystery segments: liquid of unknown color — same 5-stop shading, navy instead of a hue
 *  (solid, unlike the translucent empty-glass rgba, so it still reads as liquid) */
export const MYSTERY_GRADIENT: { colors: string[]; positions: number[] } = {
  colors: ['#242E58', '#313A6B', '#4A5C96', '#313A6B', '#242E58'],
  positions: [0, 0.2, 0.4, 0.68, 1],
};

/** the veil: opaque dark fog drawn over the whole interior of a veiled bottle */
export const VEIL_GRADIENT: { colors: string[]; positions: number[] } = {
  colors: ['#2A2450', '#141031', '#0C0A24'],
  positions: [0, 0.55, 1],
};
