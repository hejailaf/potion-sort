import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useGameStore } from '@/state/gameStore';
import {
  BoosterKind,
  boosterDropForLevel,
  DAILY_REWARD_COINS,
  dailyBoosterKind,
  useMetaStore,
  WIN_REWARD_COINS,
} from '@/state/metaStore';
import { Fireworks } from './effects/Fireworks';

const DROP_LABELS: Record<BoosterKind, string> = {
  undo: 'Undo',
  shuffle: 'Shuffle',
  extraBottle: '+Bottle',
};

/** Dim → fireworks → reward card → Continue. Appears once every pour animation lands. */
export function WinOverlay() {
  const status = useGameStore((s) => s.status);
  const animating = useGameStore((s) => s.activePours.length > 0);
  if (status !== 'won' || animating) return null;
  return <WinContent />;
}

function WinContent() {
  const router = useRouter();
  const daily = useGameStore((s) => s.mode === 'daily');
  const advanceLevel = useMetaStore((s) => s.advanceLevel);
  const completeDaily = useMetaStore((s) => s.completeDaily);
  const currentLevel = useMetaStore((s) => s.currentLevel);
  // same tables advanceLevel/completeDaily apply
  const drop = daily ? dailyBoosterKind() : boosterDropForLevel(currentLevel);
  const continued = useRef(false);
  const dim = useSharedValue(0);
  const card = useSharedValue(0);

  useEffect(() => {
    dim.value = withTiming(0.7, { duration: 400 });
    card.value = withDelay(600, withSpring(1, { damping: 12, stiffness: 160 }));
  }, [dim, card]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(card.value, [0, 0.35, 1], [0, 1, 1]),
    transform: [{ scale: card.value }],
  }));

  const onContinue = () => {
    if (continued.current) return; // one-shot: no double-advance
    continued.current = true;
    if (daily) completeDaily();
    else advanceLevel();
    router.replace('/');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.dim, dimStyle]} />
      <Fireworks />
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.title}>{daily ? 'Daily Done!' : 'Perfect!'}</Text>
          <View style={styles.rewardRow}>
            <View style={styles.coin} />
            <Text style={styles.reward}>+{daily ? DAILY_REWARD_COINS : WIN_REWARD_COINS}</Text>
          </View>
          {drop !== null && <Text style={styles.drop}>Bonus: +1 {DROP_LABELS[drop]}</Text>}
          <Pressable style={styles.continueButton} onPress={onContinue}>
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05061A',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1B1E4B',
    borderRadius: 24,
    paddingHorizontal: 36,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  title: {
    color: '#FFE9A8',
    fontSize: 30,
    fontWeight: '800',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F2D43D',
    borderWidth: 2,
    borderColor: '#C9A227',
  },
  reward: {
    color: '#E8E6FF',
    fontSize: 22,
    fontWeight: '700',
  },
  drop: {
    color: '#B9F0C8',
    fontSize: 16,
    fontWeight: '700',
  },
  continueButton: {
    backgroundColor: '#8A4AE6',
    borderRadius: 999,
    paddingHorizontal: 40,
    paddingVertical: 12,
    marginTop: 6,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
