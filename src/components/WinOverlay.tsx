import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import { track } from '@/analytics';
import { ACH, reportAchievement, submitHighestLevel } from '@/gamecenter';
import { syncNotifications } from '@/notifications';
import { GameButton } from '@/components/ui/GameButton';
import { isBottleComplete } from '@/engine/rules';
import { useGameStore } from '@/state/gameStore';
import {
  BoosterKind,
  boosterDropForLevel,
  DAILY_REWARD_COINS,
  dailyBoosterKind,
  useMetaStore,
  WIN_REWARD_COINS,
} from '@/state/metaStore';
import { color, font, radius, shadow } from '@/theme';
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
  const potions = useGameStore((s) => s.bottles.filter(isBottleComplete).length);
  const advanceLevel = useMetaStore((s) => s.advanceLevel);
  const completeDaily = useMetaStore((s) => s.completeDaily);
  const currentLevel = useMetaStore((s) => s.currentLevel);
  // same tables advanceLevel/completeDaily apply
  const drop = daily ? dailyBoosterKind() : boosterDropForLevel(currentLevel);
  const reward = daily ? DAILY_REWARD_COINS : WIN_REWARD_COINS;
  const [shownReward, setShownReward] = useState(0);
  const continued = useRef(false);
  const dim = useSharedValue(0);
  const card = useSharedValue(0);

  useEffect(() => {
    dim.value = withTiming(0.7, { duration: 400 });
    card.value = withDelay(500, withSpring(1, { damping: 12, stiffness: 160 }));
  }, [dim, card]);

  // count the reward up once the card has sprung in
  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | undefined;
    const t0 = setTimeout(() => {
      let i = 0;
      iv = setInterval(() => {
        i++;
        setShownReward(Math.min(reward, Math.round((reward * i) / 18)));
        if (i >= 18) clearInterval(iv);
      }, 26);
    }, 700);
    return () => {
      clearTimeout(t0);
      clearInterval(iv);
    };
  }, [reward]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(card.value, [0, 0.35, 1], [0, 1, 1]),
    transform: [{ scale: card.value }],
  }));

  const onContinue = () => {
    if (continued.current) return; // one-shot: no double-advance
    continued.current = true;
    const { history, startedAt } = useGameStore.getState();
    const meta = useMetaStore.getState();

    if (daily) {
      completeDaily();
      reportAchievement(ACH.firstDaily);
      track('daily_completed', { moves: history.length });
    } else {
      const wonLevel = currentLevel; // currentLevel is the level just won (pre-advance)
      advanceLevel();
      submitHighestLevel(wonLevel);
      reportAchievement(ACH.firstWin);
      if (wonLevel >= 10) reportAchievement(ACH.level10);
      if (wonLevel >= 25) reportAchievement(ACH.level25);
      if ((wonLevel === 10 || wonLevel === 25) && meta.reviewPromptedFor < wonLevel) {
        meta.markReviewPrompted(wonLevel);
        StoreReview.requestReview().catch(() => undefined); // TestFlight suppresses this — fine
      }
      track('level_win', {
        level: wonLevel,
        moves: history.length,
        duration_s: Math.round((Date.now() - startedAt) / 1000),
      });
    }

    // one polite permission ask, after the player's first win — never at launch
    if (!meta.notifPromptDone) {
      meta.setNotifPromptDone();
      Notifications.requestPermissionsAsync()
        .then(() => syncNotifications())
        .catch(() => undefined);
    }
    router.replace('/');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.dim, dimStyle]} />
      <Fireworks />
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View style={[styles.card, shadow.panel, cardStyle]}>
          <View style={styles.plate}>
            <Text style={styles.plateText}>{daily ? 'Daily Done!' : 'Perfect!'}</Text>
          </View>
          <View style={styles.cream}>
            <Text style={styles.brewed}>🧪 {potions} {potions === 1 ? 'potion' : 'potions'} brewed</Text>
            <View style={styles.rewardRow}>
              <View style={styles.coin} />
              <Text style={styles.reward}>+{shownReward}</Text>
            </View>
            {drop !== null && <Text style={styles.drop}>Bonus: +1 {DROP_LABELS[drop]}</Text>}
          </View>
          <GameButton label="Continue" variant="green" onPress={onContinue} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#140804',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 300,
    backgroundColor: color.panel,
    borderRadius: radius.panel,
    borderWidth: 3,
    borderColor: color.goldRimBottom,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 22,
    alignItems: 'stretch',
    gap: 16,
  },
  plate: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    backgroundColor: color.gold,
    borderRadius: radius.chip,
    borderWidth: 2.5,
    borderColor: color.goldRimBottom,
    paddingHorizontal: 22,
    paddingVertical: 7,
    ...shadow.chip,
  },
  plateText: {
    fontFamily: font.bold,
    fontSize: 19,
    color: color.panelDeep,
  },
  cream: {
    backgroundColor: color.cream,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.creamEdge,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  brewed: {
    color: '#8A6B45',
    fontFamily: font.body,
    fontSize: 14,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.gold,
    borderWidth: 2.5,
    borderColor: color.goldRimBottom,
  },
  reward: {
    color: color.brownText,
    fontFamily: font.bold,
    fontSize: 24,
  },
  drop: {
    color: '#3F7A4B',
    fontFamily: font.semibold,
    fontSize: 15,
  },
});
