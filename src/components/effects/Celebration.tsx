import { Canvas, Circle, Group, Path, Skia, SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import {
  Easing,
  SharedValue,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { celebration } from '@/theme';
import { mouthPoint } from '../vial';

/** Completion celebration (t=0 at target top-off): a white ribbon swirls on
 *  around the corked bottle while a warm-orange shell expands off its silhouette,
 *  then an ember lifts from the neck. One master `progress` drives everything in
 *  worklets; all timings come from theme.celebration. Purely visual — the layer
 *  is pointerEvents="none" so it never blocks the still-returning source vial. */

// timeline as fractions of the master progress (0..1 over celebration.totalMs)
const T = celebration.totalMs;
// the ribbon finishes sweeping on exactly as the ember launches (emberAtMs = 500)
const RIBBON_END_AT = celebration.emberAtMs / T;
const EMBER_START = celebration.emberAtMs / T;
const EMBER_END = (celebration.emberAtMs + celebration.emberRiseMs) / T;
const FADE_START = celebration.fadeStartMs / T;

// geometry-shaping fractions (named, not magic)
const SHELL_COUNT = 16;
const SHELL_DRIFT_FRAC = 0.25; // shell drifts out this fraction of w
const EMBER_RISE_FRAC = 0.3; // ember rises this fraction of h
const PAD_FRAC = 0.45; // canvas margin around the bottle, in w units
const RIBBON_TURNS = 2.5;
const RIBBON_HUG = 1.02; // ribbon radius vs glass half-width (just outside the glass)
const RIBBON_TOP_FRAC = 0.1; // helix spans this..bottom of the bottle box (h units)
const RIBBON_BOTTOM_FRAC = 0.95;
const RIBBON_SAMPLES = 96;

const SHELL_D = 5;
const EMBER_D = 3;
const SHELL_COLORS = ['#FFB347', '#FF9838', '#FFC46B'];
const EMBER_COLOR = '#FFC46B';
const RIBBON_COLOR = 'rgba(255,251,239,0.9)';

interface CelebrationProps {
  /** completed bottle, window coords: x=center, y=top of the bottle box */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** spiral hugging the bottle: front-projected helix, top shoulder → near bottom */
function buildHelix(cx: number, rx: number, padTop: number, h: number): SkPath {
  const p = Skia.Path.Make();
  const yTop = padTop + h * RIBBON_TOP_FRAC;
  const yBot = padTop + h * RIBBON_BOTTOM_FRAC;
  for (let k = 0; k <= RIBBON_SAMPLES; k++) {
    const t = k / RIBBON_SAMPLES;
    const angle = t * RIBBON_TURNS * Math.PI * 2;
    const px = cx + Math.cos(angle) * rx * RIBBON_HUG;
    const py = yTop + t * (yBot - yTop);
    if (k === 0) p.moveTo(px, py);
    else p.lineTo(px, py);
  }
  return p;
}

export function Celebration({ x, y, w, h }: CelebrationProps) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: celebration.totalMs, easing: Easing.linear });
  }, [progress]);

  // canvas box: extra headroom on top so the rising ember isn't clipped
  const padX = w * PAD_FRAC;
  const padTop = h * EMBER_RISE_FRAC + w * PAD_FRAC;
  const canvasW = w + 2 * padX;
  const canvasH = h + padTop + w * PAD_FRAC;
  const cx = padX + w / 2; // bottle-center x, local
  const cyBottle = padTop + h / 2; // silhouette-ellipse center y, local
  const rx = w / 2;
  const ry = h / 2;

  const shell = useMemo(
    () =>
      Array.from({ length: SHELL_COUNT }, (_, i) => {
        const a = (i / SHELL_COUNT) * Math.PI * 2;
        return {
          bx: cx + Math.cos(a) * rx,
          by: cyBottle + Math.sin(a) * ry,
          dx: Math.cos(a),
          dy: Math.sin(a),
          color: SHELL_COLORS[i % SHELL_COLORS.length],
        };
      }),
    [cx, cyBottle, rx, ry],
  );

  const ribbon = useMemo(() => buildHelix(cx, rx, padTop, h), [cx, rx, padTop, h]);
  const ribbonEnd = useDerivedValue(() => Math.min(1, progress.value / RIBBON_END_AT));
  const ribbonOpacity = useDerivedValue(
    () => 1 - Math.max(0, Math.min(1, (progress.value - FADE_START) / (1 - FADE_START))),
  );

  const mouth = mouthPoint(w, h);

  return (
    <Canvas
      style={{ position: 'absolute', left: x - w / 2 - padX, top: y - padTop, width: canvasW, height: canvasH }}
      pointerEvents="none"
    >
      <Path
        path={ribbon}
        start={0}
        end={ribbonEnd}
        style="stroke"
        strokeWidth={2.5}
        strokeJoin="round"
        strokeCap="round"
        color={RIBBON_COLOR}
        opacity={ribbonOpacity}
      />
      {shell.map((s, i) => (
        <ShellDot key={i} {...s} driftMax={SHELL_DRIFT_FRAC * w} progress={progress} />
      ))}
      <Ember cx={padX + mouth.x} cy={padTop + mouth.y} riseMax={EMBER_RISE_FRAC * h} progress={progress} />
    </Canvas>
  );
}

interface ShellDotProps {
  bx: number;
  by: number;
  dx: number;
  dy: number;
  color: string;
  driftMax: number;
  progress: SharedValue<number>;
}

function ShellDot({ bx, by, dx, dy, color, driftMax, progress }: ShellDotProps) {
  const transform = useDerivedValue(() => {
    const p = progress.value;
    const eased = 1 - (1 - p) * (1 - p); // ease-out: most drift front-loaded
    const d = eased * driftMax;
    return [{ translateX: dx * d }, { translateY: dy * d }];
  });
  const opacity = useDerivedValue(
    () => 1 - Math.max(0, Math.min(1, (progress.value - FADE_START) / (1 - FADE_START))),
  );
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={bx} cy={by} r={SHELL_D / 2} color={color} />
    </Group>
  );
}

interface EmberProps {
  cx: number;
  cy: number;
  riseMax: number;
  progress: SharedValue<number>;
}

function Ember({ cx, cy, riseMax, progress }: EmberProps) {
  const transform = useDerivedValue(() => {
    const p = Math.max(0, Math.min(1, (progress.value - EMBER_START) / (EMBER_END - EMBER_START)));
    const eased = 1 - (1 - p) * (1 - p); // ease-out: decelerates as it rises
    return [{ translateY: -eased * riseMax }];
  });
  const opacity = useDerivedValue(() => {
    if (progress.value < EMBER_START) return 0;
    const p = Math.min(1, (progress.value - EMBER_START) / (EMBER_END - EMBER_START));
    return 1 - p; // fades out as it reaches the top
  });
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={cx} cy={cy} r={EMBER_D / 2} color={EMBER_COLOR} />
    </Group>
  );
}
