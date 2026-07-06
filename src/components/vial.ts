import { Skia, SkPath } from '@shopify/react-native-skia';

/** Shared vial geometry: lip → neck → shoulder → slim body with rounded bottom.
 *  All fractions of the bottle's full height h (h = 2.6 * w). */
export const LIP_H = 0.045;
export const NECK_BOTTOM = 0.15;
export const SHOULDER_BOTTOM = 0.25;
/** liquid lives below the shoulder */
export const FILL_TOP = 0.27;
const GLASS_INSET = 2;

export function segmentGeometry(w: number, h: number, capacity: number) {
  const fillTop = h * FILL_TOP;
  const fillBottom = h - GLASS_INSET - w * 0.06;
  return { fillTop, fillBottom, segH: (fillBottom - fillTop) / capacity };
}

/** local mouth point (stream origin / tilt pivot) */
export function mouthPoint(w: number, h: number) {
  return { x: w / 2, y: h * LIP_H * 0.5 };
}

function buildFlask(w: number, h: number, inset: number): SkPath {
  const p = Skia.Path.Make();
  const cx = w / 2;
  const nw = w * 0.42 - inset * 2; // neck width
  const lip = h * LIP_H;
  const nb = h * NECK_BOTTOM;
  const sb = h * SHOULDER_BOTTOM;
  const l = inset;
  const r = w - inset;
  const bot = h - inset;
  const br = w * 0.28; // bottom corner radius
  p.moveTo(cx - nw / 2, lip);
  p.lineTo(cx - nw / 2, nb);
  // shoulder flares from neck to full width
  p.quadTo(cx - nw / 2, sb, l, sb + h * 0.035);
  p.lineTo(l, bot - br);
  p.quadTo(l, bot, l + br, bot);
  p.lineTo(r - br, bot);
  p.quadTo(r, bot, r, bot - br);
  p.lineTo(r, sb + h * 0.035);
  p.quadTo(cx + nw / 2, sb, cx + nw / 2, nb);
  p.lineTo(cx + nw / 2, lip);
  p.close();
  return p;
}

const cache = new Map<string, { glass: SkPath; interior: SkPath }>();

export function vialPaths(w: number, h: number) {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = { glass: buildFlask(w, h, 0), interior: buildFlask(w, h, GLASS_INSET) };
    cache.set(key, hit);
  }
  return hit;
}

/** hex color mixed toward white (amt>0) or black (amt<0) */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = amt > 0 ? 255 : 0;
  const f = Math.abs(amt);
  const mix = (c: number) => Math.round(c + (to - c) * f);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

export const GLASS_RIM = 'rgba(99,169,236,0.95)';
export const GLASS_GLOW = 'rgba(99,169,236,0.25)';
export const GLASS_INSIDE = 'rgba(7,9,30,0.78)';
