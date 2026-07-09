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

const MOTE_COUNT = 36;

interface MoteSpec {
  id: number;
  left: number;
  top: number;
  size: number;
  base: number;
  period: number;
  delay: number;
  twinkles: boolean;
}

/** v2 "Candlelit Alchemy" backdrop: warm cocoa lab, amber candle glow above,
 *  a wisp of violet magic, vignette below, drifting dust motes. */
export function WorkshopBackground() {
  const { width, height } = useWindowDimensions();
  const motes = useMemo<MoteSpec[]>(() => {
    const rng = mulberry32(7);
    return Array.from({ length: MOTE_COUNT }, (_, i) => ({
      id: i,
      left: rng() * width,
      top: rng() * height,
      size: 1 + rng() * 2.4,
      base: 0.2 + rng() * 0.5,
      period: 1600 + rng() * 2600,
      delay: rng() * 2200,
      twinkles: rng() > 0.4,
    }));
  }, [width, height]);

  return (
    <View style={styles.lab} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {/* cocoa base, warmest in the upper middle */}
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={['#341B0F', '#4A2A16', '#200F08']}
          />
        </Rect>
        {/* amber candle glow, upper-centre */}
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width * 0.5, height * 0.2)}
            r={height * 0.5}
            colors={['rgba(255,166,63,0.20)', 'rgba(255,166,63,0)']}
          />
        </Rect>
        {/* faint violet magic wisp, upper-right */}
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width * 0.84, height * 0.12)}
            r={height * 0.3}
            colors={['rgba(214,92,255,0.12)', 'rgba(214,92,255,0)']}
          />
        </Rect>
        {/* vignette pooling at the bottom */}
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, height * 0.55)}
            end={vec(0, height)}
            colors={['rgba(32,15,8,0)', 'rgba(20,8,4,0.55)']}
          />
        </Rect>
      </Canvas>
      {motes.map((m) => (
        <Mote key={m.id} {...m} />
      ))}
    </View>
  );
}

function Mote({ left, top, size, base, period, delay, twinkles }: MoteSpec) {
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
          backgroundColor: '#FFD9A0',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  lab: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#200F08',
  },
});
