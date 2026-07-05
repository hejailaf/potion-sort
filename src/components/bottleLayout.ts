/** Window-coordinate slots of each bottle, written by Bottle on layout,
 *  read by the overlay/effect layers to position animations. */
export interface BottleLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const bottleLayouts = new Map<string, BottleLayout>();
