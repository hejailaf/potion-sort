import { Canvas, Circle, Group, Oval, Path, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Easing,
  runOnJS,
  SharedValue,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BOTTLE_CAPACITY, Color, COLOR_HEX } from '@/engine/types';
import { ActivePour, useGameStore } from '@/state/gameStore';
import { hapticLight, playSfx } from '@/sound';
import { bottleLayouts } from './bottleLayout';
import { mouthPoint, segmentGeometry, shade, vialPaths } from './vial';
import { VialInside, VialShine } from './VialGlass';

const FLY_MS = 200;
const RETURN_MS = 200;
/** draining scales with the amount poured: 1 segment is quick, 4 takes visibly longer */
const pourMs = (count: number) => 140 + 100 * count;
/** tilt at the start of the pour, and where it ends as the bottle keeps tipping to drain */
const TILT_START = (100 * Math.PI) / 180;
const TILT_END = (135 * Math.PI) / 180;

/** All in-flight pours drawn on one full-screen canvas. */
export function PourOverlay() {
  const activePours = useGameStore((s) => s.activePours);
  if (activePours.length === 0) return null;
  return (
    // plain View wrapper: pointerEvents="none" on Canvas itself is not reliably
    // forwarded to the native Skia view, and a full-screen canvas would eat taps
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {activePours.map((p) => (
          <PourFx key={p.id} pour={p} />
        ))}
      </Canvas>
    </View>
  );
}

interface Layout {
  x: number;
  y: number;
  w: number;
  h: number;
}

function PourFx({ pour }: { pour: ActivePour }) {
  const { move } = pour;
  const finishPour = useGameStore((s) => s.finishPour);
  const progress = useSharedValue(0); // 0→1 fly, 1→2 pour, 2→3 return

  const setup = useMemo(() => {
    const s = bottleLayouts.get(move.from);
    const t = bottleLayouts.get(move.to);
    if (!s || !t) return null;
    return { s, t };
  }, [move]);

  useEffect(() => {
    if (!setup) {
      finishPour(pour.id); // layout not measured yet (first frame edge case): skip the visuals
      return;
    }
    const drainMs = pourMs(move.count);
    const sfx = setTimeout(() => {
      playSfx('pour');
      hapticLight();
    }, FLY_MS - 40);
    const safety = setTimeout(() => finishPour(pour.id), FLY_MS + drainMs + RETURN_MS + 700);
    progress.value = withSequence(
      withTiming(1, { duration: FLY_MS, easing: Easing.out(Easing.cubic) }),
      // ease-in-out: the stream starts and stops gently instead of snapping
      withTiming(2, { duration: drainMs, easing: Easing.inOut(Easing.quad) }),
      // settle into the slot rather than slam
      withTiming(3, { duration: RETURN_MS, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(finishPour)(pour.id);
      }),
    );
    return () => {
      clearTimeout(sfx);
      clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!setup) return null;
  return <PourDrawing pour={pour} s={setup.s} t={setup.t} progress={progress} />;
}

function PourDrawing({
  pour,
  s,
  t,
  progress,
}: {
  pour: ActivePour;
  s: Layout;
  t: Layout;
  progress: SharedValue<number>;
}) {
  const { move } = pour;
  const color = COLOR_HEX[move.color];
  const bright = shade(color, 0.35);
  const m = mouthPoint(s.w, s.h);
  const segS = segmentGeometry(s.w, s.h, BOTTLE_CAPACITY);
  const segT = segmentGeometry(t.w, t.h, BOTTLE_CAPACITY);
  const sign = s.x <= t.x ? 1 : -1;
  const interiorS = vialPaths(s.w, s.h).interior;
  const interiorT = vialPaths(t.w, t.h).interior;
  // segments left in the source under the poured ones (bottom→top)
  const baseSegments = pour.srcBefore.segments.slice(0, pour.srcBefore.segments.length - move.count);
  const bandCount = baseSegments.length;

  const startX = s.x + m.x;
  const startY = s.y - s.h * 0.12 + m.y; // source is lifted (selected) when the pour starts
  const tMouthX = t.x + t.w / 2;
  const hoverX = tMouthX - sign * t.w * 0.28;
  const hoverY = t.y + mouthPoint(t.w, t.h).y - t.h * 0.035;
  // world y of the target's liquid surface before this pour
  const tSurface0 = t.y + segT.fillBottom - pour.tgtBefore.segments.length * segT.segH;
  const addH = move.count * segT.segH;

  const tilt = useDerivedValue(() => {
    const p = progress.value;
    const fly = Math.min(1, p);
    const drain = Math.min(1, Math.max(0, p - 1));
    const back = Math.min(1, Math.max(0, p - 2));
    return sign * (TILT_START * fly + (TILT_END - TILT_START) * drain) * (1 - back);
  });
  const anchorX = useDerivedValue(() => {
    const p = progress.value;
    const out = Math.min(1, p) * (1 - Math.min(1, Math.max(0, p - 2)));
    return startX + (hoverX - startX) * out;
  });
  const anchorY = useDerivedValue(() => {
    const p = progress.value;
    const out = Math.min(1, p) * (1 - Math.min(1, Math.max(0, p - 2)));
    // slight swoop: the bottle arcs up on the way over and again while settling back
    const arc = Math.sin(Math.PI * out) * s.h * 0.05;
    return startY + (hoverY - startY) * out - arc;
  });

  const outerTransform = useDerivedValue(() => [
    { translateX: anchorX.value - m.x },
    { translateY: anchorY.value - m.y },
  ]);
  const rotate = useDerivedValue(() => [{ rotate: tilt.value }]);
  const counterRotate = useDerivedValue(() => [{ rotate: -tilt.value }]);
  const origin = useMemo(() => vec(m.x, m.y), [m.x, m.y]);

  // ---- liquid inside the flying bottle: world-level bands pooling at the mouth ----
  // L: how far below the mouth the lowest interior point sits; k: band thickness.
  // ponytail: eyeballed geometry, not volume-conserving — reads right at game speed.
  const bandGeo = useDerivedValue(() => {
    const p = progress.value;
    const th = Math.abs(tilt.value);
    const sin = Math.sin(th);
    const L = (s.h * 0.97 - m.y) * Math.max(Math.cos(th), 0) + s.w * 0.45 * sin;
    const k = segS.segH + (s.w * 0.34 - segS.segH) * sin;
    const pourLeft = move.count * k * (p < 1 ? 1 : Math.max(0, 2 - p));
    return { L, k, pourLeft };
  });
  const pourBandY = useDerivedValue(() => m.y + bandGeo.value.L - bandGeo.value.pourLeft);
  const pourBandH = useDerivedValue(() => bandGeo.value.pourLeft + 1);
  const srcSurfaceY = useDerivedValue(
    () => m.y + bandGeo.value.L - bandGeo.value.pourLeft - bandCount * bandGeo.value.k - s.w * 0.13,
  );
  const srcSurfaceOpacity = useDerivedValue(() =>
    bandGeo.value.pourLeft > 0.5 || bandCount > 0 ? 1 : 0,
  );
  const surfaceColor = bandCount > 0 ? shade(COLOR_HEX[baseSegments[0]], 0.35) : bright;

  // ---- stream, fill, splash ----
  const streamGate = useDerivedValue(() => {
    const p = progress.value;
    if (p <= 1.02 || p >= 2) return 0;
    return Math.min(1, (p - 1.02) * 12, (2 - p) * 8);
  });
  const fillGate = useDerivedValue(() => Math.min(1, Math.max(0, progress.value - 1) * 10));
  const fillH = useDerivedValue(() => addH * Math.min(1, Math.max(0, progress.value - 1)));
  const surfaceY = useDerivedValue(() => tSurface0 - fillH.value);
  const fillLocalY = useDerivedValue(() => surfaceY.value - t.y);
  const fillLocalH = useDerivedValue(
    () => fillH.value + (pour.tgtBefore.segments.length > 0 ? segT.segH * 0.4 : 2),
  );
  const fillSurfaceLocalY = useDerivedValue(() => surfaceY.value - t.y - t.w * 0.14);

  const streamPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (streamGate.value === 0) return path;
    const ax = anchorX.value;
    const ay = anchorY.value + 3;
    const by = surfaceY.value;
    path.moveTo(ax - 2.6, ay);
    path.quadTo(ax - 2.4, (ay + by) / 2, tMouthX - 1.7, by);
    path.lineTo(tMouthX + 1.7, by);
    path.quadTo(ax + 2.4, (ay + by) / 2, ax + 2.6, ay);
    path.close();
    return path;
  });

  const splashW = useDerivedValue(() => t.w * (0.3 + 0.08 * Math.sin(progress.value * 26)));
  const splashX = useDerivedValue(() => tMouthX - splashW.value / 2);
  const splashY = useDerivedValue(() => surfaceY.value - splashW.value * 0.16);
  const splashH = useDerivedValue(() => splashW.value * 0.32);

  const targetTransform = useMemo(() => [{ translateX: t.x }, { translateY: t.y }], [t]);

  return (
    <Group>
      {/* rising fill in the target (board bottle stays frozen at its pre-pour state) */}
      <Group transform={targetTransform} clip={interiorT} opacity={fillGate}>
        <Rect x={1} y={fillLocalY} width={t.w - 2} height={fillLocalH} color={color} />
        <Oval x={t.w * 0.06} y={fillSurfaceLocalY} width={t.w * 0.88} height={t.w * 0.28} color={bright} />
      </Group>

      {/* stream + splash + droplets */}
      <Group opacity={streamGate}>
        <Path path={streamPath} color={color} />
        <Oval x={splashX} y={splashY} width={splashW} height={splashH} color={bright} />
        <Droplet index={0} progress={progress} surfaceY={surfaceY} cx={tMouthX} w={t.w} color={bright} />
        <Droplet index={1} progress={progress} surfaceY={surfaceY} cx={tMouthX} w={t.w} color={bright} />
        <Droplet index={2} progress={progress} surfaceY={surfaceY} cx={tMouthX} w={t.w} color={bright} />
      </Group>

      {/* the flying source vial */}
      <Group transform={outerTransform}>
        <Group origin={origin} transform={rotate}>
          <VialInside w={s.w} h={s.h} />
          <Group clip={interiorS}>
            <Group origin={origin} transform={counterRotate}>
              {/* the pouring color pools at the mouth and drains first */}
              <Rect x={m.x - s.h * 1.2} y={pourBandY} width={s.h * 2.4} height={pourBandH} color={color} />
              {baseSegments.map((c, i) => (
                <SourceBand
                  key={i}
                  color={c}
                  index={i}
                  bandCount={bandCount}
                  bandGeo={bandGeo}
                  mx={m.x}
                  my={m.y}
                  span={s.h}
                />
              ))}
              <Oval
                x={m.x - s.w * 0.44}
                y={srcSurfaceY}
                width={s.w * 0.88}
                height={s.w * 0.26}
                color={surfaceColor}
                opacity={srcSurfaceOpacity}
              />
            </Group>
          </Group>
          <VialShine w={s.w} h={s.h} />
        </Group>
      </Group>
    </Group>
  );
}

/** one remaining segment inside the tilted source, stacked away from the mouth */
function SourceBand({
  color,
  index,
  bandCount,
  bandGeo,
  mx,
  my,
  span,
}: {
  color: Color;
  index: number;
  bandCount: number;
  bandGeo: SharedValue<{ L: number; k: number; pourLeft: number }>;
  mx: number;
  my: number;
  span: number;
}) {
  const y = useDerivedValue(
    () => my + bandGeo.value.L - bandGeo.value.pourLeft - (bandCount - index) * bandGeo.value.k,
  );
  const h = useDerivedValue(() => bandGeo.value.k + 1);
  return <Rect x={mx - span * 1.2} y={y} width={span * 2.4} height={h} color={COLOR_HEX[color]} />;
}

/** small blobs ejected from the splash, arcing up and fading */
function Droplet({
  index,
  progress,
  surfaceY,
  cx,
  w,
  color,
}: {
  index: number;
  progress: SharedValue<number>;
  surfaceY: SharedValue<number>;
  cx: number;
  w: number;
  color: string;
}) {
  const dir = index === 0 ? -1 : index === 1 ? 1 : -0.4;
  const off = index * 0.37;
  const x = useDerivedValue(() => {
    const pp = Math.min(1, Math.max(0, progress.value - 1));
    const frac = (pp * 2.2 + off) % 1;
    return cx + dir * w * 0.32 * frac;
  });
  const y = useDerivedValue(() => {
    const pp = Math.min(1, Math.max(0, progress.value - 1));
    const frac = (pp * 2.2 + off) % 1;
    return surfaceY.value - w * 0.5 * frac * (1 - frac) * 2.4;
  });
  const opacity = useDerivedValue(() => {
    const pp = Math.min(1, Math.max(0, progress.value - 1));
    return 1 - ((pp * 2.2 + off) % 1);
  });
  return <Circle cx={x} cy={y} r={1.6 + index * 0.5} color={color} opacity={opacity} />;
}
