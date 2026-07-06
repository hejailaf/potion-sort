import { Canvas, Group, RoundedRect } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BOTTLE_CAPACITY, COLOR_HEX } from '@/engine/types';
import { ActivePour, useGameStore } from '@/state/gameStore';
import { playSfx } from '@/sound';
import { bottleLayouts } from './bottleLayout';
import { Segment } from './Segment';

/** Visual replay of already-committed pours: fly, tilt, stream, fill, return. */
export function PourOverlay() {
  const activePours = useGameStore((s) => s.activePours);
  return (
    <>
      {activePours.map((p) => (
        <PourAnimation key={p.id} pour={p} />
      ))}
    </>
  );
}

const FLY_MS = 220;
const POUR_MS = 360;
const RETURN_MS = 240;

function PourAnimation({ pour }: { pour: ActivePour }) {
  const { move } = pour;
  const finishPour = useGameStore((s) => s.finishPour);
  const progress = useSharedValue(0); // 0→1 fly, 1→2 pour, 2→3 return

  const setup = useMemo(() => {
    const s = bottleLayouts.get(move.from);
    const t = bottleLayouts.get(move.to);
    if (!s || !t) return null;
    const sign = s.x <= t.x ? 1 : -1; // approach side: hover before the target, tilt over it
    return {
      s,
      t,
      srcSegments: pour.srcBefore.segments,
      tgtPrevCount: pour.tgtBefore.segments.length,
      segH: t.h / BOTTLE_CAPACITY,
      srcSegH: s.h / BOTTLE_CAPACITY,
      startX: s.x,
      startY: s.y - s.h * 0.12, // source is lifted (selected) when the pour starts
      hoverX: t.x - sign * t.w * 0.9,
      hoverY: t.y - s.h * 0.6,
      rotation: sign * 62,
    };
  }, [pour, move]);

  useEffect(() => {
    if (!setup) {
      finishPour(pour.id); // layout not measured yet (first frame edge case): skip the visuals
      return;
    }
    const sfx = setTimeout(() => playSfx('pour'), FLY_MS - 40);
    const safety = setTimeout(() => finishPour(pour.id), FLY_MS + POUR_MS + RETURN_MS + 700);
    progress.value = withSequence(
      withTiming(1, { duration: FLY_MS, easing: Easing.out(Easing.cubic) }),
      withTiming(2, { duration: POUR_MS, easing: Easing.linear }),
      withTiming(3, { duration: RETURN_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(finishPour)(pour.id);
      }),
    );
    return () => {
      clearTimeout(sfx);
      clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cloneStyle = useAnimatedStyle(() => {
    if (!setup) return {};
    const x = interpolate(progress.value, [0, 1, 2, 3], [setup.startX, setup.hoverX, setup.hoverX, setup.startX]);
    const y = interpolate(progress.value, [0, 1, 2, 3], [setup.startY, setup.hoverY, setup.hoverY, setup.startY]);
    const rot = interpolate(progress.value, [0, 1, 2, 3], [0, setup.rotation, setup.rotation, 0]);
    return { transform: [{ translateX: x }, { translateY: y }, { rotate: `${rot}deg` }] };
  });

  const drainStyle = useAnimatedStyle(() => {
    if (!setup) return {};
    return {
      height: interpolate(
        progress.value,
        [1, 2],
        [move.count * setup.srcSegH, 0],
        Extrapolation.CLAMP,
      ),
    };
  });

  const fillStyle = useAnimatedStyle(() => {
    if (!setup) return {};
    const fillH = interpolate(progress.value, [1, 2], [0, move.count * setup.segH], Extrapolation.CLAMP);
    return {
      height: fillH,
      top: setup.t.y + setup.t.h - setup.tgtPrevCount * setup.segH - fillH - 1.5,
    };
  });

  const mouthX = setup ? setup.t.x + setup.t.w / 2 - 3 : 0;
  const mouthY = setup ? setup.hoverY + 10 : 0;

  const streamHeight = useDerivedValue(() => {
    if (!setup) return 0;
    const fillH = interpolate(progress.value, [1, 2], [0, move.count * setup.segH], Extrapolation.CLAMP);
    const surfaceY = setup.t.y + setup.t.h - setup.tgtPrevCount * setup.segH - fillH;
    return Math.max(0, surfaceY - mouthY);
  });
  const streamOpacity = useDerivedValue(() =>
    interpolate(progress.value, [1, 1.15, 1.85, 2], [0, 1, 1, 0], Extrapolation.CLAMP),
  );

  if (!setup) return null;
  const baseSegments = setup.srcSegments.slice(0, setup.srcSegments.length - move.count);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Group opacity={streamOpacity}>
          <RoundedRect x={mouthX} y={mouthY} width={6} height={streamHeight} r={3} color={COLOR_HEX[move.color]} />
        </Group>
      </Canvas>
      {/* growing liquid in the target */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: setup.t.x + 2,
            width: setup.t.w - 4,
            backgroundColor: COLOR_HEX[move.color],
            borderRadius: 3,
          },
          fillStyle,
        ]}
      />
      {/* the flying source bottle */}
      <Animated.View style={[styles.clone, cloneStyle]}>
        <View style={[styles.glass, { width: setup.s.w, height: setup.s.h }]}>
          {baseSegments.map((color, i) => (
            <Segment key={i} color={color} height={setup.srcSegH} />
          ))}
          {/* ponytail: draining/filling liquid is plain color; symbols land with the committed segments */}
          <Animated.View style={[{ backgroundColor: COLOR_HEX[move.color] }, drainStyle]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clone: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  glass: {
    flexDirection: 'column-reverse',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
});
