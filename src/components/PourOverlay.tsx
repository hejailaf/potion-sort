import { Canvas, Group, LinearGradient, Oval, Path, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  Easing,
  runOnJS,
  SharedValue,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BOTTLE_CAPACITY, Color, COLOR_HEX } from '@/engine/types';
import { ActivePour, useGameStore } from '@/state/gameStore';
import { hapticLight, playSfx } from '@/sound';
import { pour as pourTokens } from '@/theme';
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
import { cylinderGradient, LIQUID_LIGHT, mouthPoint, MYSTERY_GRADIENT, rgba, segmentGeometry, vialPaths } from './vial';
import { VialEdgeShading, VialInside, VialNeck, VialShine } from './VialGlass';

// geometry shaping — tuned in sim, verify visually (timings/angles/distances are tokens)
/** the mouth parks this far (× target width) off the target's centre, toward the source,
 *  so the tilted body overhangs the adjacent column and stream + fill stay fully visible */
const NEAR_RIM_FRAC = 0.45;
/** the parked mouth hovers this fraction of source height above the target opening (stream length) */
const HOVER_LIFT_FRAC = 0.1;
/** shallow travel-arc control-point lift (fraction of source height above the higher endpoint) */
const ARC_LIFT_FRAC = 0.12;

/** phase boundaries (ms) of a `count`-segment pour, entirely from the measured tokens */
function pourTimeline(count: number) {
  const riseEnd = pourTokens.riseMs;
  const holdEnd = riseEnd + pourTokens.anticipationMs;
  const travelEnd = holdEnd + pourTokens.travelTiltMs;
  const streamOn = travelEnd + pourTokens.streamOnsetMs;
  const pourTotal = count * pourTokens.msPerSegment;
  const fillEnd = streamOn + pourTotal;
  const total = fillEnd + pourTokens.returnMs;
  return { riseEnd, holdEnd, travelEnd, streamOn, pourTotal, fillEnd, total };
}

function easeOut3(u: number) {
  'worklet';
  const f = 1 - u;
  return 1 - f * f * f;
}
function easeInOut3(u: number) {
  'worklet';
  if (u < 0.5) return 4 * u * u * u;
  const f = -2 * u + 2;
  return 1 - (f * f * f) / 2;
}

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
  const markToppedOff = useGameStore((s) => s.markToppedOff);
  /** master clock in ms, 0 → total; drives the bottle's rise/hold/travel/tilt/return */
  const elapsed = useSharedValue(0);
  /** fill/drain 0 → 1 (conservation): drives target fill AND source drain, starts at stream onset */
  const fillT = useSharedValue(0);
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
    const tl = pourTimeline(move.count);
    // pour SFX + haptic land at stream onset (fill/stream begin together)
    const sfx = setTimeout(() => {
      playSfx('pour');
      hapticLight();
    }, tl.streamOn);
    const safety = setTimeout(() => finishPour(pour.id), tl.total + 700);

    // fill/drain: linear rise, then a short eased top-off; markToppedOff at the very end
    fillT.value = withDelay(
      tl.streamOn,
      withSequence(
        withTiming((tl.pourTotal - pourTokens.topOffEaseMs) / tl.pourTotal, {
          duration: tl.pourTotal - pourTokens.topOffEaseMs,
          easing: Easing.linear,
        }),
        withTiming(1, { duration: pourTokens.topOffEaseMs, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(markToppedOff)(pour.id);
        }),
      ),
    );

    // fixed-duration master clock: the hand-off fires exactly when the bottle parks
    // (a spring's invisible settle tail kept blocking taps ~0.5s after arrival)
    elapsed.value = withTiming(tl.total, { duration: tl.total, easing: Easing.linear }, (finished) => {
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
    });
    return () => {
      clearTimeout(sfx);
      clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup]);

  if (!setup) return null;
  return (
    <PourDrawing
      pour={pour}
      s={setup.s}
      t={setup.t}
      elapsed={elapsed}
      fillT={fillT}
      mu={mu}
      muVel={muVel}
    />
  );
}

function PourDrawing({
  pour,
  s,
  t,
  elapsed,
  fillT,
  mu,
  muVel,
}: {
  pour: ActivePour;
  s: Layout;
  t: Layout;
  elapsed: SharedValue<number>;
  fillT: SharedValue<number>;
  mu: SharedValue<number>;
  muVel: SharedValue<number>;
}) {
  const { move } = pour;
  const { width: screenW } = useWindowDimensions();
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

  const tl = pourTimeline(move.count);
  const maxTilt = (pourTokens.maxTiltDeg * Math.PI) / 180;
  const deepenTilt = (pourTokens.tiltDeepenDeg * Math.PI) / 180;
  const selectLift = pourTokens.selectLiftSeg * segS.segH;
  const riseHeight = pourTokens.riseSeg * segS.segH;

  const startX = s.x + m.x;
  const startY = s.y - selectLift + m.y; // mouth world-y at the lifted (selected) rest
  const risenY = startY - riseHeight; // mouth world-y at the top of the rise
  const restY = startY + selectLift; // the return lands at the UNLIFTED seat (not the lifted start)

  const tMouth = mouthPoint(t.w, t.h);
  const tCenterX = t.x + t.w / 2;
  // the mouth parks over the target's NEAR rim (toward the source); the body overhangs
  // the adjacent column, keeping the stream and rising fill fully visible
  const mouthAnchorX = tCenterX - sign * t.w * NEAR_RIM_FRAC;
  const mouthAnchorY = t.y + tMouth.y - s.h * HOVER_LIFT_FRAC;
  // shallow travel arc: control point lifted just above the higher of the two endpoints
  const ctrlX = (startX + mouthAnchorX) / 2;
  const ctrlY = Math.min(risenY, mouthAnchorY) - s.h * ARC_LIFT_FRAC;
  // world y of the target's liquid surface before this pour
  const tSurface0 = t.y + segT.fillBottom - pour.tgtBefore.segments.length * segT.segH;
  const addH = move.count * segT.segH;

  // ── bottle flight: rise → hold → travel+tilt → park (through pour) → return ──
  const anchorX = useDerivedValue(() => {
    const e = elapsed.value;
    if (e <= tl.holdEnd) return startX; // rise + hold: stay in the source's column
    if (e < tl.travelEnd) {
      const w = easeInOut3((e - tl.holdEnd) / pourTokens.travelTiltMs);
      const u = 1 - w;
      return u * u * startX + 2 * u * w * ctrlX + w * w * mouthAnchorX;
    }
    if (e <= tl.fillEnd) return mouthAnchorX; // parked over the near rim while pouring
    const r = easeInOut3(Math.min(1, (e - tl.fillEnd) / pourTokens.returnMs));
    return mouthAnchorX + (startX - mouthAnchorX) * r; // straight-line return
  });
  const anchorY = useDerivedValue(() => {
    const e = elapsed.value;
    if (e <= tl.riseEnd) return startY - riseHeight * easeOut3(e / tl.riseEnd); // rise, ease-out
    if (e <= tl.holdEnd) return risenY; // hold
    if (e < tl.travelEnd) {
      const w = easeInOut3((e - tl.holdEnd) / pourTokens.travelTiltMs);
      const u = 1 - w;
      return u * u * risenY + 2 * u * w * ctrlY + w * w * mouthAnchorY;
    }
    if (e <= tl.fillEnd) return mouthAnchorY; // parked
    const r = easeInOut3(Math.min(1, (e - tl.fillEnd) / pourTokens.returnMs));
    return mouthAnchorY + (restY - mouthAnchorY) * r; // straight-line descent to the seat
  });
  const tilt = useDerivedValue(() => {
    const e = elapsed.value;
    if (e <= tl.holdEnd) return 0; // upright through rise + hold (no dip, no counter-tilt)
    if (e < tl.travelEnd) return sign * maxTilt * easeInOut3((e - tl.holdEnd) / pourTokens.travelTiltMs);
    if (e <= tl.fillEnd) return sign * (maxTilt + deepenTilt * fillT.value); // deepen as it drains
    const r = easeInOut3(Math.min(1, (e - tl.fillEnd) / pourTokens.returnMs));
    return sign * (maxTilt + deepenTilt) * (1 - r); // untilt over the return
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
  // source drains in lock-step with the target fill (conservation): fillT 0→1 empties the pour layer
  const planes = useDerivedValue(() =>
    pooledPlanes(tilt.value, poolGeo, baseAreas, pourArea0 * (1 - fillT.value)),
  );
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
  // stream: fades in at onset, holds through the pour, thins/retracts up over the tail
  const streamGate = useDerivedValue(() => {
    const e = elapsed.value;
    if (e < tl.streamOn) return 0;
    if (e < tl.fillEnd) return Math.min(1, (e - tl.streamOn) / 40);
    return Math.max(0, 1 - (e - tl.fillEnd) / pourTokens.streamTailMs);
  });
  const streamRetract = useDerivedValue(() => {
    const e = elapsed.value;
    if (e <= tl.fillEnd) return 0;
    return Math.min(1, (e - tl.fillEnd) / pourTokens.streamTailMs);
  });
  const fillH = useDerivedValue(() => addH * fillT.value);
  const surfaceY = useDerivedValue(() => tSurface0 - fillH.value);
  const fillLocalY = useDerivedValue(() => surfaceY.value - t.y);
  // the fill overlaps a FULL segment below the poured liquid (the target's old top —
  // legally the same color as the pour) and keeps drawing until finishPour: together
  // these mask the covered-rect opacity lag when the board switches to the live bottle
  // at top-off (the 224188b dark-band race, restretched by celebration-mount JS jank)
  const fillLocalH = useDerivedValue(
    () => fillH.value + (pour.tgtBefore.segments.length > 0 ? segT.segH + 2 : 2),
  );
  const fillOpacity = useDerivedValue(() => Math.min(1, fillT.value * 12));
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
    if (streamGate.value <= 0) return path;
    const ex = exitX.value;
    const ey = exitY.value;
    // tail: the stream's foot lifts from the surface toward the lip (retracts upward)
    const by = surfaceY.value + (ey - surfaceY.value) * streamRetract.value;
    // gravity: the stream falls STRAIGHT DOWN and thins as it accelerates (rigid — steady edges)
    const halfTop = screenW * pourTokens.streamWidthFrac * 0.5;
    const halfBot = halfTop * 0.6;
    path.moveTo(ex - halfTop, ey);
    path.lineTo(ex - halfBot, by);
    path.lineTo(ex + halfBot, by);
    path.lineTo(ex + halfTop, ey);
    path.close();
    return path;
  });
  const streamStart = useDerivedValue(() => vec(exitX.value, exitY.value));
  const streamEnd = useDerivedValue(() => vec(exitX.value, surfaceY.value));

  const targetTransform = useMemo(() => [{ translateX: t.x }, { translateY: t.y }], [t]);
  const backToWorld = useMemo(() => [{ translateX: -t.x }, { translateY: -t.y }], [t]);
  // cylinder-shading across the target interior (mock: liquid inset 3 at 58-wide reference)
  const gx0t = (3 * t.w) / 58;

  return (
    <Group>
      {/* rising fill in the target (board bottle stays frozen at its pre-pour state until top-off) */}
      <Group transform={targetTransform} clip={interiorT} opacity={fillOpacity}>
        <Rect x={1} y={fillLocalY} width={t.w - 2} height={fillLocalH}>
          <LinearGradient start={vec(gx0t, 0)} end={vec(t.w - gx0t, 0)} {...cylinderGradient(move.color)} />
        </Rect>
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
            <Ripple index={0} fillT={fillT} surfaceY={surfaceY} cx={exitX} w={t.w} color={rgba(bright, 0.5)} />
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
                  // mystery: bands still under the watermark fly as unknown navy —
                  // the true color must not flash mid-flight
                  <PooledBand key={i} color={c} index={i} mystery={i < pour.srcHidden} planes={planes} mx={m.x} my={m.y} span={s.h * 1.4} w={s.w} />
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
  mystery = false,
}: {
  color: Color;
  index: number;
  planes: SharedValue<number[]>;
  mx: number;
  my: number;
  span: number;
  w: number;
  /** render as liquid of unknown color (mystery watermark) */
  mystery?: boolean;
}) {
  const y = useDerivedValue(() => my + planes.value[index]);
  const grad = mystery ? MYSTERY_GRADIENT : cylinderGradient(color);
  return (
    <Rect x={mx - span} y={y} width={2 * span} height={2 * span}>
      <LinearGradient start={vec(mx - w * 0.55, 0)} end={vec(mx + w * 0.55, 0)} {...grad} />
    </Rect>
  );
}

/** expanding ripple ring on the target surface around the stream's impact point */
function Ripple({
  index,
  fillT,
  surfaceY,
  cx,
  w,
  color,
}: {
  index: number;
  fillT: SharedValue<number>;
  surfaceY: SharedValue<number>;
  cx: SharedValue<number>;
  w: number;
  color: string;
}) {
  const f = useDerivedValue(() => (fillT.value * 1.6 + index * 0.5) % 1);
  const x = useDerivedValue(() => cx.value - w * (0.1 + 0.22 * f.value));
  const y = useDerivedValue(() => surfaceY.value - w * (0.1 + 0.22 * f.value) * 0.16);
  const width = useDerivedValue(() => 2 * w * (0.1 + 0.22 * f.value));
  const height = useDerivedValue(() => 2 * w * (0.1 + 0.22 * f.value) * 0.16);
  const opacity = useDerivedValue(() => (1 - f.value) * 0.35);
  return (
    <Oval x={x} y={y} width={width} height={height} style="stroke" strokeWidth={1.5} color={color} opacity={opacity} />
  );
}
