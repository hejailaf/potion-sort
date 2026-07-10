import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { makeMutable, useAnimatedStyle } from 'react-native-reanimated';
import { useMetaStore } from '@/state/metaStore';
import { button, color, font, radius, shadow, timing } from '@/theme';

/** measurable handle on the coin icon — CoinFly's fly-in target, measured at USE time
 *  (mount-time frames go stale once the screen settles; see bottleLayout.measureBottle). */
type Measurable = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };
const iconNode: { current: Measurable | null } = { current: null };

/** module-level pulse channel: CoinFly bumps this to 1→0 as each coin lands, the icon springs. */
export const coinIconPulse = makeMutable(0);

/** fresh window-center of the coin icon; null if unmeasurable → CoinFly skips the fly. */
export function measureCoinIcon(): Promise<{ x: number; y: number } | null> {
  return new Promise((resolve) => {
    const node = iconNode.current;
    if (!node) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, w, h) => {
      resolve(w > 0 && h > 0 ? { x: x + w / 2, y: y + h / 2 } : null);
    });
  });
}

interface CoinCounterProps {
  /** shows the green "+" on the pill's edge (home: opens the Shop) */
  onAdd?: () => void;
}

export function CoinCounter({ onAdd }: CoinCounterProps) {
  const coins = useMetaStore((s) => s.coins);
  // hold the OLD total during a CoinFly; deliverCoins shrinks pending as coins land
  const pending = useMetaStore((s) => s.pendingCoinReward);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.4 * coinIconPulse.value }] }));

  return (
    <View style={styles.row}>
      <View style={[styles.pill, shadow.chip]}>
        <Animated.View
          ref={(n) => {
            iconNode.current = n as unknown as Measurable | null;
          }}
          style={[styles.coin, iconStyle]}
        />
        <Text style={styles.count}>{coins - (pending ?? 0)}</Text>
      </View>
      {onAdd && (
        <Pressable onPress={onAdd} hitSlop={10} style={({ pressed }) => [styles.add, pressed && styles.addPressed]}>
          <Text style={styles.addText}>＋</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    backgroundColor: color.pillDark,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.goldRimBottom,
    paddingLeft: 5,
    paddingRight: 14,
  },
  coin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.gold,
    borderWidth: 2.5,
    borderColor: color.goldRimBottom,
  },
  count: {
    color: color.text,
    fontFamily: font.semibold,
    fontSize: 15,
  },
  add: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: button.green.fill,
    borderWidth: 1.5,
    borderColor: button.green.rim,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    zIndex: 1,
    ...shadow.chip,
  },
  addPressed: {
    transform: [{ scale: timing.pressScale }],
  },
  addText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 17,
  },
});
