import { BlurMask, Canvas, Group, LinearGradient, Path, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { isBottleComplete } from '@/engine/rules';
import { Bottle as BottleData, BOTTLE_CAPACITY, COLOR_HEX, COLOR_SYMBOL } from '@/engine/types';
import { useMetaStore } from '@/state/metaStore';
import { hapticSelect } from '@/sound';
import { bottleLayouts, bottleRefs } from './bottleLayout';
import {
  KICK_DESELECT,
  KICK_SELECT,
  KICK_SHAKE,
  liquidThetas,
  SLOSH_ENABLED,
  SLOSH_SPRING,
  surfaceEdge,
} from './liquid';
import { cylinderGradient, GLOW_PAD, HEIGHT_RATIO, rgba, segmentGeometry, vialPaths } from './vial';
import { VialCap, VialInside, VialNeck, VialShine } from './VialGlass';

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
  onTap: (id: string) => void;
}

export function Bottle({ bottle, width, selected, hidden, shakeToken, hinted, onTap }: BottleProps) {
  const height = width * HEIGHT_RATIO;
  const ref = useRef<View>(null);
  const lift = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const flash = useSharedValue(0);
  const glow = useSharedValue(0);
  /** liquid-surface tilt (rad) — sloshes on lift/shake/pour landing, springs level */
  const theta = useSharedValue(0);
  const wasSelected = useRef(false);

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
    // rigid glass: a clean lift with no overshoot or deformation
    lift.value = withTiming(selected ? -height * 0.085 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    if (selected) hapticSelect();
    // liquid inertia: kick the surface on pick-up / put-down (skip the mount run)
    if (wasSelected.current !== selected && SLOSH_ENABLED) {
      theta.value = withSpring(0, { ...SLOSH_SPRING, velocity: selected ? KICK_SELECT : KICK_DESELECT });
    }
    wasSelected.current = selected;
  }, [selected, height, lift, theta]);

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

  const symbols = useMetaStore((s) => s.colorBlindSymbols);
  const { glass, interior } = vialPaths(width, height);
  const { fillBottom, segH } = segmentGeometry(width, height, BOTTLE_CAPACITY);
  const n = bottle.segments.length;
  const ySurf = fillBottom - n * segH;
  const complete = isBottleComplete(bottle);
  const liquidHex = n > 0 ? COLOR_HEX[bottle.segments[n - 1]] : '#000000';
  // liquid gradients span the interior (body inset 3, in mock units)
  const gx0 = (3 * width) / 58;
  const gx1 = width - gx0;

  // top segment: a tilting, meniscus-bowed surface instead of a flat rect
  const surfacePath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (n === 0) return p;
    const { yL, yR, cpy } = surfaceEdge(width, ySurf, theta.value);
    p.moveTo(0, yL);
    p.quadTo(width / 2, cpy, width, yR);
    p.lineTo(width, ySurf + segH + 2);
    p.lineTo(0, ySurf + segH + 2);
    p.close();
    return p;
  }, [n, width, ySurf, segH]);
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
            top: -GLOW_PAD,
            width: width + 2 * GLOW_PAD,
            height: height + 2 * GLOW_PAD,
          }}
        >
          <Group transform={[{ translateX: GLOW_PAD }, { translateY: GLOW_PAD }]}>
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
                return (
                  <Rect key={i} x={0} y={top} width={width} height={segH + 1} opacity={filled ? 1 : 0}>
                    <LinearGradient start={vec(gx0, 0)} end={vec(gx1, 0)} {...cylinderGradient(color)} />
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
            <VialShine w={width} h={height} />
            <VialNeck w={width} />
            {/* the cap IS the cork: it only appears once a bottle is complete */}
            {complete && <VialCap w={width} />}
          </Group>
        </Canvas>
        {symbols &&
          bottle.segments.map((color, i) => (
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
          ))}
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
});
