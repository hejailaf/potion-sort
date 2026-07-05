import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { canPour } from '@/engine/rules';
import { useGameStore } from '@/state/gameStore';
import { useMetaStore } from '@/state/metaStore';
import { bottleLayouts } from './bottleLayout';

/** First-play tutorial: bouncing pointer over a pourable bottle, then over a target. */
export function OnboardingHint() {
  const level = useGameStore((s) => s.level);
  const historyLength = useGameStore((s) => s.history.length);
  const selectedId = useGameStore((s) => s.selectedId);
  const bottles = useGameStore((s) => s.bottles);
  const onboardingDone = useMetaStore((s) => s.onboardingDone);
  const setOnboardingDone = useMetaStore((s) => s.setOnboardingDone);
  // ponytail: layout registry fills asynchronously after first render; a short
  // poll re-checks until the hint position is known, then stops mattering.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (onboardingDone || historyLength === 0) return;
    setOnboardingDone(); // first successful pour ends the tutorial forever
  }, [historyLength, onboardingDone, setOnboardingDone]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 300);
    return () => clearInterval(timer);
  }, []);

  if (onboardingDone || level?.id !== 1 || historyLength > 0) return null;

  let hintId: string | null = null;
  let message: string;
  if (selectedId === null) {
    message = 'Tap a bottle to pick it up';
    const selectable = bottles.find((from) =>
      bottles.some((to) => canPour(from, to)),
    );
    hintId = selectable?.id ?? null;
  } else {
    message = 'Now tap a bottle to pour into';
    const from = bottles.find((b) => b.id === selectedId)!;
    hintId = bottles.find((to) => canPour(from, to))?.id ?? null;
  }
  const layout = hintId ? bottleLayouts.get(hintId) : undefined;
  if (!layout) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Pointer x={layout.x + layout.w / 2} y={layout.y} />
      <View style={styles.bannerWrap}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{message}</Text>
        </View>
      </View>
    </View>
  );
}

function Pointer({ x, y }: { x: number; y: number }) {
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(withTiming(10, { duration: 380 }), withTiming(0, { duration: 380 })),
      -1,
    );
  }, [bounce]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));
  return (
    <Animated.View style={[styles.pointer, { left: x - 12, top: y - 46 }, style]}>
      <Text style={styles.pointerText}>▼</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pointer: {
    position: 'absolute',
  },
  pointerText: {
    color: '#FFE9A8',
    fontSize: 24,
    fontWeight: '900',
  },
  bannerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 110,
    alignItems: 'center',
  },
  banner: {
    backgroundColor: 'rgba(27,30,75,0.92)',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bannerText: {
    color: '#E8E6FF',
    fontSize: 15,
    fontWeight: '600',
  },
});
