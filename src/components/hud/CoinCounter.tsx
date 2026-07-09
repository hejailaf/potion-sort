import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMetaStore } from '@/state/metaStore';
import { button, color, font, radius, shadow } from '@/theme';

/** Window-coordinate center of the coin pill — CoinFly's destination. */
export const coinCounterLayout: { current: { x: number; y: number } | null } = { current: null };

interface CoinCounterProps {
  /** shows the green "+" on the pill's edge (home: opens the Shop) */
  onAdd?: () => void;
}

export function CoinCounter({ onAdd }: CoinCounterProps) {
  const coins = useMetaStore((s) => s.coins);
  const ref = useRef<View>(null);

  return (
    <View style={styles.row}>
      <View
        ref={ref}
        style={[styles.pill, shadow.chip]}
        onLayout={() => {
          ref.current?.measureInWindow((x, y, w, h) => {
            coinCounterLayout.current = { x: x + w / 2, y: y + h / 2 };
          });
        }}
      >
        <View style={styles.coin} />
        <Text style={styles.count}>{coins}</Text>
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
    transform: [{ scale: 0.9 }],
  },
  addText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 17,
  },
});
