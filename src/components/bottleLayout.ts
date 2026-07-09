import { RefObject } from 'react';
import { View } from 'react-native';

/** Window-coordinate slots of each bottle, written by Bottle on layout,
 *  read by the overlay/effect layers to position animations. */
export interface BottleLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const bottleLayouts = new Map<string, BottleLayout>();

/** live refs, so animations can measure at USE time — the layout-time measure
 *  goes stale when the screen settles after mount, and every overlay drawing
 *  inherited that offset (fills floating above the bottle bottom, etc.) */
export const bottleRefs = new Map<string, RefObject<View | null>>();

/** fresh window frame for a bottle; refreshes the cache, falls back to it */
export function measureBottle(id: string): Promise<BottleLayout | null> {
  return new Promise((resolve) => {
    const node = bottleRefs.get(id)?.current;
    if (!node) {
      resolve(bottleLayouts.get(id) ?? null);
      return;
    }
    node.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) {
        const layout = { x, y, w, h };
        bottleLayouts.set(id, layout);
        resolve(layout);
      } else {
        resolve(bottleLayouts.get(id) ?? null);
      }
    });
  });
}
