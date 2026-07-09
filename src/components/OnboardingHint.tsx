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
import { BOTTLE_CAPACITY } from '@/engine/types';
import { useGameStore } from '@/state/gameStore';
import { useMetaStore } from '@/state/metaStore';
import { timing } from '@/theme';
import { bottleLayouts } from './bottleLayout';

/** First-play tutorial: bouncing pointer over a pourable bottle, then over a target.
 *  On Level 1 it also explains *why* a pour was rejected the first few times (R5). */
export function OnboardingHint() {
  const level = useGameStore((s) => s.level);
  const historyLength = useGameStore((s) => s.history.length);
  const selectedId = useGameStore((s) => s.selectedId);
  const bottles = useGameStore((s) => s.bottles);
  const invalidTapToken = useGameStore((s) => s.invalidTapToken);
  const invalidBottleId = useGameStore((s) => s.invalidBottleId);
  const onboardingDone = useMetaStore((s) => s.onboardingDone);
  const setOnboardingDone = useMetaStore((s) => s.setOnboardingDone);
  // ponytail: layout registry fills asynchronously after first render; a short
  // poll re-checks until the hint position is known, then stops mattering.
  const [, setTick] = useState(0);
  const [rule, setRule] = useState<string | null>(null);

  useEffect(() => {
    if (onboardingDone || historyLength === 0) return;
    setOnboardingDone(); // first successful pour ends the tutorial forever
  }, [historyLength, onboardingDone, setOnboardingDone]);

  // rule pill after a rejected pour on Level 1: name the reason, then fade
  useEffect(() => {
    if (invalidTapToken === 0 || level?.id !== 1) return;
    const target = bottles.find((b) => b.id === invalidBottleId);
    setRule(
      target && target.segments.length >= BOTTLE_CAPACITY
        ? 'That bottle is full — pour into another!'
        : 'Colors must match on top to pour!',
    );
    const t = setTimeout(() => setRule(null), timing.hintAutoDismiss);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidTapToken]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 300);
    return () => clearInterval(timer);
  }, []);

  if (rule) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <HintBanner text={rule} />
      </View>
    );
  }

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
      <HintBanner text={message} />
    </View>
  );
}

function HintBanner({ text }: { text: string }) {
  return (
    <View style={styles.bannerWrap}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>{text}</Text>
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
    color: '#FFE3A6',
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
    backgroundColor: 'rgba(32,15,8,0.88)',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,200,120,0.28)',
  },
  bannerText: {
    color: '#FFEFD9',
    fontSize: 15,
    fontWeight: '600',
  },
});
