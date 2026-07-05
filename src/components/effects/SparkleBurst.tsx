import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#FFE9A8', '#FFFFFF', '#C9B7FF'];

interface SparkleBurstProps {
  /** burst origin in window coordinates (the bottle mouth) */
  x: number;
  y: number;
}

export function SparkleBurst({ x, y }: SparkleBurstProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        angle: (i / 12) * Math.PI * 2 + Math.random() * 0.4,
        dist: 28 + Math.random() * 30,
        size: 4 + Math.random() * 4,
        color: COLORS[i % COLORS.length],
      })),
    [],
  );
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) });
  }, [progress]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Particle key={i} {...p} cx={x} cy={y} progress={progress} />
      ))}
    </View>
  );
}

interface ParticleProps {
  angle: number;
  dist: number;
  size: number;
  color: string;
  cx: number;
  cy: number;
  progress: SharedValue<number>;
}

function Particle({ angle, dist, size, color, cx, cy, progress }: ParticleProps) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: cx + Math.cos(angle) * dist * progress.value },
      { translateY: cy + Math.sin(angle) * dist * progress.value - 12 * progress.value },
      { scale: 1 - 0.5 * progress.value },
    ],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}
