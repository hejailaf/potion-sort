import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { coinCounterLayout } from '../hud/CoinCounter';

const COIN_COUNT = 8;

interface CoinFlyProps {
  onDone: () => void;
}

/** Coins scatter from screen center and fly into the coin counter. */
export function CoinFly({ onDone }: CoinFlyProps) {
  const { width, height } = useWindowDimensions();
  const target = coinCounterLayout.current ?? { x: 60, y: 60 };
  const progress = useSharedValue(0);

  const coins = useMemo(
    () =>
      Array.from({ length: COIN_COUNT }, (_, i) => ({
        startX: width / 2 + (Math.random() - 0.5) * 140,
        startY: height / 2 + (Math.random() - 0.5) * 120,
        delay: i * 0.05,
      })),
    [width, height],
  );

  useEffect(() => {
    progress.value = withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {coins.map((c, i) => (
        <Coin key={i} {...c} targetX={target.x} targetY={target.y} progress={progress} />
      ))}
    </View>
  );
}

interface CoinProps {
  startX: number;
  startY: number;
  delay: number;
  targetX: number;
  targetY: number;
  progress: SharedValue<number>;
}

function Coin({ startX, startY, delay, targetX, targetY, progress }: CoinProps) {
  const style = useAnimatedStyle(() => {
    const p = interpolate(progress.value, [delay, delay + 0.6], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: p < 1 ? 1 : 0,
      transform: [
        { translateX: startX + (targetX - startX) * p },
        { translateY: startY + (targetY - startY) * p },
        { scale: 1 - 0.4 * p },
      ],
    };
  });
  return <Animated.View style={[styles.coin, style]} />;
}

const styles = StyleSheet.create({
  coin: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F5B841',
    borderWidth: 2,
    borderColor: '#C07F1C',
  },
});
