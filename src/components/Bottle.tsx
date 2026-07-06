import { Canvas, Group, Oval, Rect } from '@shopify/react-native-skia';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { isBottleComplete } from '@/engine/rules';
import { Bottle as BottleData, BOTTLE_CAPACITY, COLOR_HEX, COLOR_SYMBOL } from '@/engine/types';
import { useMetaStore } from '@/state/metaStore';
import { hapticSelect } from '@/sound';
import { bottleLayouts } from './bottleLayout';
import { segmentGeometry, shade, vialPaths } from './vial';
import { VialInside, VialShine } from './VialGlass';

interface BottleProps {
  bottle: BottleData;
  width: number;
  selected: boolean;
  /** the pour overlay renders a flying clone instead of this bottle */
  hidden: boolean;
  /** changes whenever this bottle rejects a pour — triggers the shake */
  shakeToken: number;
  onTap: (id: string) => void;
}

export function Bottle({ bottle, width, selected, hidden, shakeToken, onTap }: BottleProps) {
  const height = width * 2.6;
  const ref = useRef<View>(null);
  const lift = useSharedValue(0);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    // rigid glass: a clean lift with no overshoot or deformation
    lift.value = withTiming(selected ? -height * 0.12 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    if (selected) hapticSelect();
  }, [selected, height, lift]);

  useEffect(() => {
    if (shakeToken === 0) return;
    shakeX.value = withSequence(
      withTiming(-6, { duration: 40 }),
      withTiming(6, { duration: 40 }),
      withTiming(-4, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
  }, [shakeToken, shakeX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { translateX: shakeX.value }],
  }));

  const symbols = useMetaStore((s) => s.colorBlindSymbols);
  const { interior } = vialPaths(width, height);
  const { fillBottom, segH } = segmentGeometry(width, height, BOTTLE_CAPACITY);
  const surfaceRy = width * 0.14;

  return (
    <Pressable
      ref={ref}
      onPress={() => onTap(bottle.id)}
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
      <Animated.View style={animatedStyle} pointerEvents="none">
        {isBottleComplete(bottle) && <Cork width={width} />}
        <Canvas style={{ width, height }}>
          <VialInside w={width} h={height} />
          <Group clip={interior}>
            {bottle.segments.map((color, i) => (
              <Rect
                key={i}
                x={0}
                y={fillBottom - (i + 1) * segH}
                width={width}
                height={segH + 1}
                color={COLOR_HEX[color]}
              />
            ))}
            {bottle.segments.length > 0 && (
              <Oval
                x={width * 0.06}
                y={fillBottom - bottle.segments.length * segH - surfaceRy}
                width={width * 0.88}
                height={surfaceRy * 2}
                color={shade(COLOR_HEX[bottle.segments[bottle.segments.length - 1]], 0.35)}
              />
            )}
          </Group>
          <VialShine w={width} h={height} />
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

function Cork({ width }: { width: number }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 260 });
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        styles.cork,
        { width: width * 0.44, left: width * 0.28, height: width * 0.3, top: -width * 0.16 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
  symbol: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(0,0,0,0.55)',
    fontWeight: '900',
  },
  cork: {
    position: 'absolute',
    backgroundColor: '#C99A5B',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    zIndex: 1,
  },
});
