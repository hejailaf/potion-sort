import { Canvas, Circle, Group, LinearGradient, Oval, Path, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Easing,
  runOnJS,
  SharedValue,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BOTTLE_CAPACITY, Color, COLOR_HEX } from '@/engine/types';
import { ActivePour, useGameStore } from '@/state/gameStore';
import { hapticLight, playSfx } from '@/sound';
import { measureBottle } from './bottleLayout';
import {
  KICK_LAND,
  liquidThetas,
  pooledPlanes,
  SLOSH_ENABLED,
  SLOSH_SPRING,
  stepSlosh,
  SWAY_CLAMP,
  SWAY_GAIN,
} from './liquid';
import { cylinderGradient, LIQUID_LIGHT, mouthPoint, rgba, segmentGeometry, vialPaths } from './vial';
import { VialEdgeShading, VialInside, VialNeck, VialShine } from './VialGlass';

const FLY_MS = 420;
/** first quarter of the fly phase is anticipation: a dip + wind-up, no travel */
const ANT = 0.25;
/** fixed-duration return: the hand-off fires exactly when the bottle parks —
 *  a spring's invisible settle tail kept blocking taps ~0.5s after arrival */
const RETURN_MS = 360;
/** draining scales with the amount poured: 1 segment is quick, 4 takes visibly longer */
const pourMs = (count: number) => 240 + 160 * count;
/** tilt at the start of the pour, and where it ends as the bottle keeps tipping to drain */
const TILT_START = (100 * Math.PI) / 180;
const TILT_END = (135 * Math.PI) / 180;
const ANT_TILT = (8 * Math.PI) / 180;

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
  const progress = useSharedValue(0); // 0→1 fly (incl. anticipation), 1→2 pour, 2→3 spring return
  /** liquid rotation in the glass's local frame + its angular velocity —
   *  integrated per frame so the liquid lags and sloshes against the glass */
  const mu = useSharedValue(0);
  const muVel = useSharedValue(0);

  const [setup, setSetup] = useState<{ s: Layout; t: Layout } | null>(null);

  // measure BOTH bottles fresh at pour time — the layout-time cache goes stale
  // once the screen settles after mount, which floated every fill/landing by
  // the same offset (liquid hovering above the bottle bottom, overflow on top)
  useEffect(() => {
    let live = true;
    Promise.all([measureBottle(move.from), measureBottle(move.to)]).then(([s, t]) => {
      if (!live) return;
      if (!s || !t) {
        finishPour(pour.id); // bottle unmounted and never measured: skip the visuals
        return;
      }
      setSetup({ s, t });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // board bottles to kick when the flying bottle lands (may be absent — skip)
  const srcTheta = liquidThetas.get(move.from) ?? null;
  const tgtTheta = liquidThetas.get(move.to) ?? null;
  const sign = setup && setup.s.x <= setup.t.x ? 1 : -1;

  useEffect(() => {
    if (!setup) return;
    const drainMs = pourMs(move.count);
    const sfx = setTimeout(() => {
      playSfx('pour');
      hapticLight();
    }, FLY_MS - 40);
    const safety = setTimeout(() => finishPour(pour.id), FLY_MS + drainMs + RETURN_MS + 700);
    progress.value = withSequence(
      // linear: the anticipation/flight shaping lives in the derived curves
      withTiming(1, { duration: FLY_MS, easing: Easing.linear }),
      // ease-in-out: the stream starts and stops gently instead of snapping
      withTiming(2, { duration: drainMs, easing: Easing.inOut(Easing.quad) }),
      withTiming(3, { duration: RETURN_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) {
          // landing hand-off: both board bottles reappear already sloshing
          if (SLOSH_ENABLED) {
            if (srcTheta) {
              const residual = Math.max(-4, Math.min(4, muVel.value));
              srcTheta.value = withSpring(0, { ...SLOSH_SPRING, velocity: residual - KICK_LAND * sign });
            }
            if (tgtTheta) {
              tgtTheta.value = withSpring(0, { ...SLOSH_SPRING, velocity: KICK_LAND * 0.5 * sign });
            }
          }
          runOnJS(finishPour)(pour.id);
        }
      }),
    );
    return () => {
      clearTimeout(sfx);
      clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup]);

  if (!setup) return null;
  return <PourDrawing pour={pour} s={setup.s} t={setup.t} progress={progress} mu={mu} muVel={muVel} />;
}

function PourDrawing({
  pour,
  s,
  t,
  progress,
  mu,
  muVel,
}: {
  pour: ActivePour;
  s: Layout;
  t: Layout;
  progress: SharedValue<number>;
  mu: SharedValue<number>;
  muVel: SharedValue<number>;
}) {
  const { move } = pour;
  const color = COLOR_HEX[move.color];
  const bright = LIQUID_LIGHT[move.color];
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
  const startY = s.y - s.h * 0.085 + m.y; // source is lifted (selected) when the pour starts
  const tMouthX = t.x + t.w / 2;
  // the mouth parks directly OVER the opening — real streams fall vertically,
  // so the lateral hover offset made every pour visibly slant sideways
  const hoverX = tMouthX;
  // hover high enough that a visible stream falls into the (uncorked) neck
  const hoverY = t.y + mouthPoint(t.w, t.h).y - t.h * 0.1;
  // quadratic-bezier flight arc: control point lifted above the midpoint
  const ctrlX = (startX + hoverX) / 2;
  const ctrlY = Math.min(startY, hoverY) - s.h * 0.35;
  // world y of the target's liquid surface before this pour
  const tSurface0 = t.y + segT.fillBottom - pour.tgtBefore.segments.length * segT.segH;
  const addH = move.count * segT.segH;

  /** flight completion 0→1: 0 through anticipation, eased out over the flight,
   *  held at 1 while draining, retraced by the return spring */
  const q = useDerivedValue(() => {
    const p = progress.value;
    if (p <= ANT) return 0;
    if (p <= 1) {
      const x = (p - ANT) / (1 - ANT);
      return 1 - (1 - x) ** 3; // ease-out cubic
    }
    if (p <= 2) return 1;
    return Math.min(1, Math.max(0, 1 - (p - 2)));
  });
  /** anticipation envelope: rises and falls within p ∈ [0, ANT] */
  const ant = useDerivedValue(() => {
    const p = progress.value;
    return p > 0 && p < ANT ? Math.sin((Math.PI * p) / ANT) : 0;
  });

  const tilt = useDerivedValue(() => {
    const p = progress.value;
    const drain = Math.min(1, Math.max(0, p - 1));
    const qq = q.value;
    // glass tips late in the flight (q^1.4), keeps tipping while draining,
    // unwinds through the same curve on the way home; wind-up counter-tilt first
    return sign * (TILT_START * qq ** 1.4 + (TILT_END - TILT_START) * drain * qq - ANT_TILT * ant.value);
  });
  // the return leg glides STRAIGHT home instead of retracing the high arc —
  // retracing swung the bottle above its slot and read as "lands too high".
  // home = the unlifted resting slot (the flight started from the lifted position)
  const restY = startY + s.h * 0.085;
  const anchorX = useDerivedValue(() => {
    const p = progress.value;
    if (p > 2) {
      const r = Math.min(1, p - 2);
      return hoverX + (startX - hoverX) * r;
    }
    const qq = q.value;
    const u = 1 - qq;
    return u * u * startX + 2 * u * qq * ctrlX + qq * qq * hoverX;
  });
  const anchorY = useDerivedValue(() => {
    const p = progress.value;
    if (p > 2) {
      const r = Math.min(1, p - 2);
      return hoverY + (restY - hoverY) * r;
    }
    const qq = q.value;
    const u = 1 - qq;
    return u * u * startY + 2 * u * qq * ctrlY + qq * qq * hoverY + s.h * 0.03 * ant.value;
  });

  // liquid slosh: mu chases -tilt each frame (semi-implicit Euler, dt-clamped);
  // dies with this component — no frame callbacks exist when nothing pours.
  // motion coupling: the surface also leans opposite the bottle's horizontal
  // velocity (inertia in the moving frame), so the liquid visibly reacts to
  // the flight itself — swinging back on launch, forward as it brakes
  const prevAx = useSharedValue<number | null>(null);
  useFrameCallback((frame) => {
    if (!SLOSH_ENABLED) return;
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.032);
    const ax = anchorX.value;
    const vx = prevAx.value === null ? 0 : (ax - prevAx.value) / Math.max(dt, 0.001);
    prevAx.value = ax;
    const sway = Math.max(-SWAY_CLAMP, Math.min(SWAY_CLAMP, SWAY_GAIN * vx));
    const [nm, nv] = stepSlosh(mu.value, muVel.value, tilt.value + sway, dt);
    mu.value = nm;
    muVel.value = nv;
  });

  const outerTransform = useDerivedValue(() => [
    { translateX: anchorX.value - m.x },
    { translateY: anchorY.value - m.y },
  ]);
  const rotate = useDerivedValue(() => [{ rotate: tilt.value }]);
  /** the liquid body's rotation: lags the glass instead of rigidly counter-rotating */
  const liquidRotate = useDerivedValue(() => [{ rotate: SLOSH_ENABLED ? mu.value : -tilt.value }]);
  const origin = useMemo(() => vec(m.x, m.y), [m.x, m.y]);

  // ---- liquid inside the flying bottle: pooled half-planes ----
  // each color is "everything below my surface plane"; the top color paints
  // first and lower colors cover it below their planes, so the bottom color
  // floods the belly — no slab edges at any angle, area roughly conserved
  const sIn = (3 * s.w) / 58;
  const wIn = s.w - 2 * sIn;
  const poolGeo = useMemo(
    () => ({ x0: sIn, y0: segS.fillTop, x1: s.w - sIn, y1: segS.fillBottom, mx: m.x, my: m.y }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const baseAreas = useMemo(
    () => baseSegments.map(() => segS.segH * wIn),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const pourArea0 = move.count * segS.segH * wIn;
  const planes = useDerivedValue(() => {
    const p = progress.value;
    const pourLeft = p < 1 ? 1 : Math.max(0, 2 - p);
    return pooledPlanes(tilt.value, poolGeo, baseAreas, pourArea0 * pourLeft);
  });
  // meniscus lip riding the topmost surface plane
  const srcLipPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const v = planes.value[planes.value.length - 1];
    const y = m.y + v;
    path.moveTo(m.x - s.w * 0.8, y);
    path.quadTo(m.x, y + s.w * 0.03, m.x + s.w * 0.8, y);
    return path;
  });

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
  // the filled region, for re-drawing the glass gloss over just the new liquid
  const fillClipPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addRect(Skia.XYWHRect(0, fillLocalY.value, t.w, fillLocalH.value + 2));
    return p;
  });
  // meniscus lip on the rising surface (target-local coords)
  const fillLipPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const y = fillLocalY.value;
    p.moveTo(0, y);
    p.quadTo(t.w / 2, y + t.w * 0.03, t.w, y);
    return p;
  });

  // the pouring lip corner: the mouth edge (±9·s in mock units, the neck
  // half-opening) rotated by the glass tilt — the stream hangs from the lip
  const lipR = (9 * s.w) / 58;
  const exitX = useDerivedValue(() => anchorX.value + sign * lipR * Math.cos(tilt.value));
  const exitY = useDerivedValue(() => anchorY.value + lipR * Math.abs(Math.sin(tilt.value)));

  const streamPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (streamGate.value === 0) return path;
    const ex = exitX.value;
    const ey = exitY.value;
    const by = surfaceY.value;
    // gravity: the stream falls STRAIGHT DOWN and thins as it accelerates
    // (continuity: A·v is constant); width still breathes slightly
    const wob = 0.5 * Math.sin(progress.value * 40);
    path.moveTo(ex - 2.8 - wob, ey);
    path.lineTo(ex - 1.6, by);
    path.lineTo(ex + 1.6, by);
    path.lineTo(ex + 2.8 + wob, ey);
    path.close();
    return path;
  });
  const streamStart = useDerivedValue(() => vec(exitX.value, exitY.value));
  const streamEnd = useDerivedValue(() => vec(exitX.value, surfaceY.value));

  const splashW = useDerivedValue(() => t.w * (0.26 + 0.06 * Math.sin(progress.value * 26)));
  const splashX = useDerivedValue(() => tMouthX - splashW.value / 2);
  const splashY = useDerivedValue(() => surfaceY.value - splashW.value * 0.16);
  const splashH = useDerivedValue(() => splashW.value * 0.32);

  // rising fill surface: a slight wave radiating from the impact point
  const wavePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (fillGate.value === 0) return path;
    const cxL = tMouthX - t.x;
    const amp = 2.5 * streamGate.value * (0.7 + 0.3 * Math.sin(progress.value * 30));
    const yS = surfaceY.value - t.y - t.w * 0.1;
    const band = t.w * 0.24;
    path.moveTo(0, yS + amp * Math.cos((-cxL * 6 * Math.PI) / t.w));
    for (let i = 1; i <= 4; i++) {
      const x = (t.w * i) / 4;
      path.lineTo(x, yS + amp * Math.cos(((x - cxL) * 6 * Math.PI) / t.w));
    }
    path.lineTo(t.w, yS + band);
    path.lineTo(0, yS + band);
    path.close();
    return path;
  });

  const targetTransform = useMemo(() => [{ translateX: t.x }, { translateY: t.y }], [t]);
  const backToWorld = useMemo(() => [{ translateX: -t.x }, { translateY: -t.y }], [t]);
  // cylinder-shading across the target interior (mock: liquid inset 3 at 58-wide reference)
  const gx0t = (3 * t.w) / 58;

  return (
    <Group>
      {/* rising fill in the target (board bottle stays frozen at its pre-pour state) */}
      <Group transform={targetTransform} clip={interiorT} opacity={fillGate}>
        <Rect x={1} y={fillLocalY} width={t.w - 2} height={fillLocalH}>
          <LinearGradient start={vec(gx0t, 0)} end={vec(t.w - gx0t, 0)} {...cylinderGradient(move.color)} />
        </Rect>
        <Path path={wavePath} color={rgba(bright, 0.5)} />
        <Path path={fillLipPath} style="stroke" strokeWidth={2.5} color="rgba(255,255,255,0.30)" />
        {/* the new liquid gets the same glass gloss as resting liquid — without
            this the fill reads as a flat sticker until the pour lands */}
        <Group clip={fillClipPath}>
          <VialEdgeShading w={t.w} h={t.h} />
          <VialShine w={t.w} h={t.h} />
        </Group>
      </Group>

      {/* stream falls free through the open neck; the splash garnish stays inside the glass */}
      <Group opacity={streamGate}>
        <Path path={streamPath}>
          <LinearGradient start={streamStart} end={streamEnd} colors={[bright, color]} />
        </Path>
        <Group transform={targetTransform} clip={interiorT}>
          {/* clip is target-local; undo the translate so the world-coord math below still holds.
              soft alphas: the garnish tints the surface instead of painting over it */}
          <Group transform={backToWorld}>
            <Oval x={splashX} y={splashY} width={splashW} height={splashH} color={rgba(bright, 0.55)} />
            <Ripple index={0} progress={progress} surfaceY={surfaceY} cx={tMouthX} w={t.w} color={rgba(bright, 0.5)} />
            <Ripple index={1} progress={progress} surfaceY={surfaceY} cx={tMouthX} w={t.w} color={rgba(bright, 0.5)} />
            <Droplet index={0} progress={progress} surfaceY={surfaceY} cx={tMouthX} w={t.w} color={color} />
            <Droplet index={1} progress={progress} surfaceY={surfaceY} cx={tMouthX} w={t.w} color={color} />
            <Droplet index={2} progress={progress} surfaceY={surfaceY} cx={tMouthX} w={t.w} color={color} />
          </Group>
        </Group>
      </Group>

      {/* the flying source vial */}
      <Group transform={outerTransform}>
        <Group origin={origin} transform={rotate}>
          <VialInside w={s.w} h={s.h} />
          <Group clip={interiorS}>
            <Group origin={origin} transform={liquidRotate}>
              {/* painter's algorithm: top (pouring) color first, each lower color
                  covers everything below its own plane — the bottom color floods
                  the belly, so there are no slab edges at any angle */}
              <PooledBand color={move.color} index={bandCount} planes={planes} mx={m.x} my={m.y} span={s.h * 1.4} w={s.w} />
              {baseSegments
                .map((c, i) => (
                  <PooledBand key={i} color={c} index={i} planes={planes} mx={m.x} my={m.y} span={s.h * 1.4} w={s.w} />
                ))
                .reverse()}
              <Path path={srcLipPath} style="stroke" strokeWidth={2.5} color="rgba(255,255,255,0.30)" />
            </Group>
          </Group>
          <VialShine w={s.w} h={s.h} />
          {/* the neck is glass — it flies with the bottle; only the stopper stays behind */}
          <VialNeck w={s.w} />
        </Group>
      </Group>
    </Group>
  );
}

/** one liquid layer in the flying bottle: everything below its surface plane */
function PooledBand({
  color,
  index,
  planes,
  mx,
  my,
  span,
  w,
}: {
  color: Color;
  index: number;
  planes: SharedValue<number[]>;
  mx: number;
  my: number;
  span: number;
  w: number;
}) {
  const y = useDerivedValue(() => my + planes.value[index]);
  return (
    <Rect x={mx - span} y={y} width={2 * span} height={2 * span}>
      <LinearGradient start={vec(mx - w * 0.55, 0)} end={vec(mx + w * 0.55, 0)} {...cylinderGradient(color)} />
    </Rect>
  );
}

/** expanding ripple ring on the target surface around the stream's impact point */
function Ripple({
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
  const f = useDerivedValue(() => {
    const drain = Math.min(1, Math.max(0, progress.value - 1));
    return (drain * 1.6 + index * 0.5) % 1;
  });
  const x = useDerivedValue(() => cx - w * (0.1 + 0.22 * f.value));
  const y = useDerivedValue(() => surfaceY.value - w * (0.1 + 0.22 * f.value) * 0.16);
  const width = useDerivedValue(() => 2 * w * (0.1 + 0.22 * f.value));
  const height = useDerivedValue(() => 2 * w * (0.1 + 0.22 * f.value) * 0.16);
  const opacity = useDerivedValue(() => (1 - f.value) * 0.7);
  return (
    <Oval x={x} y={y} width={width} height={height} style="stroke" strokeWidth={1.5} color={color} opacity={opacity} />
  );
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
