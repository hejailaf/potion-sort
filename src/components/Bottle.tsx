import { BlurMask, Canvas, Group, LinearGradient, Path, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { isBottleComplete } from '@/engine/rules';
import { Bottle as BottleData, BOTTLE_CAPACITY, COLOR_HEX, COLOR_SYMBOL } from '@/engine/types';
import { useMetaStore } from '@/state/metaStore';
import { hapticLight, hapticSelect } from '@/sound';
import { button, celebration, font, pour } from '@/theme';
import { bottleLayouts, bottleRefs } from './bottleLayout';
import { KICK_SHAKE, liquidThetas, SLOSH_ENABLED, SLOSH_SPRING, surfaceEdge } from './liquid';
import {
  bodyTop,
  cylinderGradient,
  GLOW_PAD,
  HEIGHT_RATIO,
  MYSTERY_GRADIENT,
  rgba,
  segmentGeometry,
  VEIL_GRADIENT,
  vialPaths,
} from './vial';
import { VialCap, VialInside, VialNeck, VialShine } from './VialGlass';

// cork landing bounce: a small overshoot below the seat, then settle (spec's snappy landing)
const SETTLE_OVERSHOOT_PX = 3;
const SETTLE_OUT_MS = 60;
const SETTLE_BACK_MS = 90;

interface BottleProps {
  bottle: BottleData;
  width: number;
  selected: boolean;
  /** the pour overlay renders a flying clone instead of this bottle */
  hidden: boolean;
  /** changes whenever this bottle rejects a pour — triggers the shake */
  shakeToken: number;
  /** the hint booster is pointing at this bottle — pulse a gold ring */
  hinted: boolean;
  /** mystery watermark: this many bottom segments render as unknown ("?") */
  hiddenCount: number;
  onTap: (id: string) => void;
}

export function Bottle({ bottle, width, selected, hidden, shakeToken, hinted, hiddenCount, onTap }: BottleProps) {
  const height = width * HEIGHT_RATIO;
  // selected-idle elevation: the same one-segment-fraction lift the flying clone starts from
  const { fillBottom, segH } = segmentGeometry(width, height, BOTTLE_CAPACITY);
  const liftPx = pour.selectLiftSeg * segH;
  const ref = useRef<View>(null);
  const lift = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const flash = useSharedValue(0);
  const glow = useSharedValue(0);
  /** liquid-surface tilt (rad) — sloshes on shake/pour landing, springs level */
  const theta = useSharedValue(0);
  /** veil fog opacity — fades out when a cork lifts this bottle's veil */
  const veilOpacity = useSharedValue(bottle.veiled ? 1 : 0);
  const wasVeiled = useRef(!!bottle.veiled);
  /** wax seal (chained) — pops off when the locks tick down to 0 */
  const locks = bottle.locks ?? 0;
  const sealScale = useSharedValue(locks > 0 ? 1 : 0);
  const sealOpacity = useSharedValue(locks > 0 ? 1 : 0);
  const prevLocks = useRef(locks);
  const shownLocks = useRef(locks);
  /** cork (VialCap): permanent node, opacity-gated; drops onto the neck on completion */
  const complete = isBottleComplete(bottle);
  const corkFromPx = celebration.corkFromFrac * height;
  const corkOpacity = useSharedValue(complete ? 1 : 0); // resume mid-level: corked bottles seated on mount
  const corkY = useSharedValue(0);
  const wasComplete = useRef(complete);
  const corkTransform = useDerivedValue(() => [{ translateY: corkY.value }]);

  // registries: the pour overlay kicks this bottle's liquid when a pour lands
  // on it, and measures its ref fresh when a pour starts
  useEffect(() => {
    liquidThetas.set(bottle.id, theta);
    bottleRefs.set(bottle.id, ref);
    return () => {
      liquidThetas.delete(bottle.id);
      bottleRefs.delete(bottle.id);
    };
  }, [bottle.id, theta]);

  useEffect(() => {
    // rigid glass: a clean lift with no overshoot, no idle wobble (spec: no slosh on select)
    lift.value = withTiming(selected ? -liftPx : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    if (selected) hapticSelect();
  }, [selected, liftPx, lift]);

  useEffect(() => {
    if (shakeToken === 0) return;
    // wider, longer wobble than before — reads even with sound + haptics off
    shakeX.value = withSequence(
      withTiming(-10, { duration: 45 }),
      withTiming(9, { duration: 45 }),
      withTiming(-6, { duration: 45 }),
      withTiming(4, { duration: 45 }),
      withTiming(0, { duration: 45 }),
    );
    // red rim flash on rejection
    flash.value = withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 280 }));
    // the liquid piles toward the first excursion and keeps sloshing after the glass stops
    if (SLOSH_ENABLED) theta.value = withSpring(0, { ...SLOSH_SPRING, velocity: KICK_SHAKE });
  }, [shakeToken, shakeX, flash, theta]);

  useEffect(() => {
    const isVeiled = !!bottle.veiled;
    if (wasVeiled.current === isVeiled) return;
    if (isVeiled) {
      veilOpacity.value = 1; // restart re-deals the same ids — snap the veil back on
    } else {
      veilOpacity.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
      hapticLight();
    }
    wasVeiled.current = isVeiled;
  }, [bottle.veiled, veilOpacity]);

  useEffect(() => {
    const prev = prevLocks.current;
    if (locks > 0) {
      shownLocks.current = locks; // keep the last positive label legible during the pop
      sealScale.value = 1;
      sealOpacity.value = 1;
    } else if (prev > 0) {
      // unsealed: the wax disc pops off
      sealScale.value = withTiming(1.5, { duration: 320, easing: Easing.out(Easing.cubic) });
      sealOpacity.value = withTiming(0, { duration: 320 });
      hapticLight();
    }
    prevLocks.current = locks;
  }, [locks, sealScale, sealOpacity]);

  useEffect(() => {
    const prev = wasComplete.current;
    wasComplete.current = complete;
    if (prev === complete) return; // mount / no change: resting state already set by the initial SV values
    if (complete) {
      // cork drop: hold hidden above the neck through corkAtMs, then drop onto the neck
      // with a settle bounce; hapticLight at landing (top-off timing → aligns with the celebration)
      corkY.value = -corkFromPx;
      corkOpacity.value = withDelay(celebration.corkAtMs, withTiming(1, { duration: 0 }));
      corkY.value = withDelay(
        celebration.corkAtMs,
        withSequence(
          withTiming(0, { duration: celebration.corkDropMs, easing: Easing.in(Easing.quad) }),
          withTiming(SETTLE_OVERSHOOT_PX, { duration: SETTLE_OUT_MS }),
          withTiming(0, { duration: SETTLE_BACK_MS }),
        ),
      );
      const land = setTimeout(hapticLight, celebration.corkAtMs + celebration.corkDropMs);
      return () => clearTimeout(land);
    }
    // undo/restart re-deals the same ids: an already-corked bottle snaps back uncorked
    corkOpacity.value = 0;
    corkY.value = 0;
  }, [complete, corkFromPx, corkOpacity, corkY]);

  useEffect(() => {
    glow.value = hinted
      ? withRepeat(
          withSequence(withTiming(0.95, { duration: 500 }), withTiming(0.25, { duration: 500 })),
          -1,
          true,
        )
      : withTiming(0, { duration: 200 });
  }, [hinted, glow]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { translateX: shakeX.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const veilTextStyle = useAnimatedStyle(() => ({ opacity: veilOpacity.value }));
  const sealStyle = useAnimatedStyle(() => ({
    opacity: sealOpacity.value,
    transform: [{ scale: sealScale.value }],
  }));

  const symbols = useMetaStore((s) => s.colorBlindSymbols);
  const { glass, interior } = vialPaths(width, height);
  const n = bottle.segments.length;
  const ySurf = fillBottom - n * segH;
  const liquidHex = n > 0 ? COLOR_HEX[bottle.segments[n - 1]] : '#000000';
  // liquid gradients span the interior (body inset 3, in mock units)
  const gx0 = (3 * width) / 58;
  const gx1 = width - gx0;

  // top segment: a tilting, meniscus-bowed surface instead of a flat rect.
  // a COMPLETE bottle (uniform color) extends this path over the whole liquid
  // column: the covered-segment rects' opacity props lag the derived paths when
  // the board unfreezes at top-off (224188b race, stretched by celebration-mount
  // jank) — this path updates atomically, so the flips can't flash glass gaps
  const surfacePath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (n === 0) return p;
    const { yL, yR, cpy } = surfaceEdge(width, ySurf, theta.value);
    const bottom = complete ? fillBottom + 2 : ySurf + segH + 2;
    p.moveTo(0, yL);
    p.quadTo(width / 2, cpy, width, yR);
    p.lineTo(width, bottom);
    p.lineTo(0, bottom);
    p.close();
    return p;
  }, [n, width, ySurf, segH, complete, fillBottom]);
  const surfaceEdgePath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (n === 0) return p;
    const { yL, yR, cpy } = surfaceEdge(width, ySurf, theta.value);
    p.moveTo(0, yL);
    p.quadTo(width / 2, cpy, width, yR);
    return p;
  }, [n, width, ySurf]);

  return (
    <Pressable
      ref={ref}
      onPress={() => onTap(bottle.id)}
      // the hidden source of an in-flight pour must not take ghost selections
      disabled={hidden}
      hitSlop={6}
      onLayout={() => {
        // window coords, measured unlifted at layout time (transforms don't relayout)
        ref.current?.measureInWindow((x, y, w, h) => {
          bottleLayouts.set(bottle.id, { x, y, w, h });
        });
      }}
      style={hidden ? styles.hidden : undefined}
    >
      {/* pointerEvents=none: the Skia canvas consumes touches otherwise — the Pressable must get them */}
      {/* explicit size: the Canvas is absolute (oversized for the glow halo), so this View sizes the Pressable */}
      <Animated.View style={[{ width, height }, animatedStyle]} pointerEvents="none">
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { width, height, borderRadius: width * 0.32, borderColor: '#F5B841' }, glowStyle]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { width, height, borderRadius: width * 0.32, borderColor: '#FF5A47' }, flashStyle]}
        />
        <Canvas
          style={{
            position: 'absolute',
            left: -GLOW_PAD,
            // extra top headroom so the cork can materialize above the neck and drop in unclipped
            top: -(GLOW_PAD + corkFromPx),
            width: width + 2 * GLOW_PAD,
            height: height + 2 * GLOW_PAD + corkFromPx,
          }}
        >
          <Group transform={[{ translateX: GLOW_PAD }, { translateY: GLOW_PAD + corkFromPx }]}>
            {/* complete bottle: soft static halo of its own liquid color */}
            {complete && (
              <>
                <Path path={glass} style="stroke" strokeWidth={7} color={rgba(liquidHex, 0.45)}>
                  <BlurMask blur={9} style="normal" />
                </Path>
                <Path path={interior} color={rgba(liquidHex, 0.1)} />
              </>
            )}
            {/* selected bottle: warm candlelight glow (mock's focus drop-shadow) */}
            {selected && !complete && (
              <Path path={glass} style="stroke" strokeWidth={6} color="rgba(255,227,166,0.5)">
                <BlurMask blur={7} style="normal" />
              </Path>
            )}
            <VialInside w={width} h={height} />
            <Group clip={interior}>
              {/* covered segments stay rects; each gets the cylinder-shading gradient.
                  FIXED node count (capacity-1), hidden via opacity: newly-added Skia
                  children hit the screen a frame later than prop updates, which
                  flashed dark bands when a multi-segment pour landed */}
              {Array.from({ length: BOTTLE_CAPACITY - 1 }, (_, i) => {
                const filled = i < n - 1;
                const color = (filled ? bottle.segments[i] : bottle.segments[0]) ?? 'ruby';
                const top = fillBottom - (i + 1) * segH;
                // mystery: below-watermark segments read as liquid of unknown color
                const grad = i < hiddenCount ? MYSTERY_GRADIENT : cylinderGradient(color);
                return (
                  <Rect key={i} x={0} y={top} width={width} height={segH + 1} opacity={filled ? 1 : 0}>
                    <LinearGradient start={vec(gx0, 0)} end={vec(gx1, 0)} {...grad} />
                  </Rect>
                );
              })}
              {/* top segment: tilting surface path + bright top lip (paths go empty
                  when n=0, so these nodes are permanent too) */}
              <Path path={surfacePath}>
                <LinearGradient
                  start={vec(gx0, 0)}
                  end={vec(gx1, 0)}
                  {...cylinderGradient(bottle.segments[n - 1] ?? 'ruby')}
                />
              </Path>
              <Path
                path={surfaceEdgePath}
                style="stroke"
                strokeWidth={2.5}
                color="rgba(255,255,255,0.30)"
              />
            </Group>
            {/* veil fog: permanent node faded by opacity (never conditionally mounted —
                new Skia children render a frame late); sits under VialShine so the
                glass keeps its sheen while the contents are hidden */}
            <Group clip={interior} opacity={veilOpacity}>
              <Rect x={0} y={0} width={width} height={height}>
                <LinearGradient start={vec(0, bodyTop(width))} end={vec(0, height)} {...VEIL_GRADIENT} />
              </Rect>
            </Group>
            <VialShine w={width} h={height} />
            <VialNeck w={width} />
            {/* the cork: permanent node (never conditionally mount Skia children —
                new children render a frame late), gated by opacity + dropped in on completion */}
            <Group opacity={corkOpacity} transform={corkTransform}>
              <VialCap w={width} />
            </Group>
          </Group>
        </Canvas>
        {/* colorblind symbols: suppressed on veiled bottles and hidden mystery segments —
            RN Text draws above the Skia veil and would leak the colors */}
        {symbols &&
          !bottle.veiled &&
          bottle.segments.map((color, i) =>
            i < hiddenCount ? null : (
              <Text
                key={i}
                style={[
                  styles.symbol,
                  {
                    top: fillBottom - (i + 1) * segH + segH / 2 - 8,
                    fontSize: Math.min(13, segH * 0.4),
                  },
                ]}
              >
                {COLOR_SYMBOL[color]}
              </Text>
            ),
          )}
        {/* mystery "?" on each still-hidden segment */}
        {bottle.segments.slice(0, hiddenCount).map((_, i) => (
          <Text
            key={`m${i}`}
            style={[
              styles.symbol,
              styles.mystery,
              {
                top: fillBottom - (i + 1) * segH + segH / 2 - 8,
                fontSize: Math.min(14, segH * 0.45),
              },
            ]}
          >
            ?
          </Text>
        ))}
        {/* veil "?" — fades with the fog */}
        <Animated.Text
          pointerEvents="none"
          style={[styles.veilMark, { top: bodyTop(width) + (height - bodyTop(width)) * 0.32, fontSize: width * 0.42 }, veilTextStyle]}
        >
          ?
        </Animated.Text>
        {/* wax seal (chained): disc + remaining-pour count, pops off at 0 */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.seal,
            {
              width: width * 0.52,
              height: width * 0.52,
              borderRadius: width * 0.26,
              left: width * 0.24,
              top: bodyTop(width) + (height - bodyTop(width)) * 0.5 - width * 0.26,
            },
            sealStyle,
          ]}
        >
          <Text style={[styles.sealText, { fontSize: width * 0.24 }]}>
            {locks > 0 ? locks : shownLocks.current}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 3,
  },
  symbol: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(0,0,0,0.55)',
    fontWeight: '900',
  },
  mystery: {
    color: 'rgba(255,255,255,0.75)',
  },
  veilMark: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,227,166,0.65)',
    fontFamily: font.display,
  },
  seal: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: button.red.rim,
    borderWidth: 2.5,
    borderColor: '#C07F1C',
    shadowColor: '#190803',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  sealText: {
    color: '#FFE3A6',
    fontFamily: font.bold,
  },
});
