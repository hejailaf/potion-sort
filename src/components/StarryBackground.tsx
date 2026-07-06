import { Canvas, LinearGradient, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { mulberry32 } from '@/engine/generator';

const STAR_COUNT = 48;

interface StarSpec {
  id: number;
  left: number;
  top: number;
  size: number;
  base: number;
  period: number;
  delay: number;
  twinkles: boolean;
}

export function StarryBackground() {
  const { width, height } = useWindowDimensions();
  const stars = useMemo<StarSpec[]>(() => {
    const rng = mulberry32(7);
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      id: i,
      left: rng() * width,
      top: rng() * height,
      size: 1 + rng() * 2.2,
      base: 0.3 + rng() * 0.6,
      period: 1600 + rng() * 2600,
      delay: rng() * 2200,
      twinkles: rng() > 0.4,
    }));
  }, [width, height]);

  return (
    <View style={styles.sky} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {/* deep night sky */}
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={['#0A0B22', '#141634', '#0C0E2A']}
          />
        </Rect>
        {/* soft violet aurora, upper-centre */}
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width * 0.5, height * 0.26)}
            r={height * 0.45}
            colors={['rgba(138,74,230,0.30)', 'rgba(138,74,230,0)']}
          />
        </Rect>
        {/* teal wisp, upper-right */}
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width * 0.84, height * 0.12)}
            r={height * 0.3}
            colors={['rgba(47,189,179,0.20)', 'rgba(47,189,179,0)']}
          />
        </Rect>
      </Canvas>
      {stars.map((s) => (
        <Star key={s.id} {...s} />
      ))}
    </View>
  );
}

function Star({ left, top, size, base, period, delay, twinkles }: StarSpec) {
  const o = useSharedValue(base);
  useEffect(() => {
    if (!twinkles) return;
    o.value = withDelay(
      delay,
      withRepeat(withTiming(base * 0.3, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [o, base, period, delay, twinkles]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#fff',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0C0E2A',
  },
});
