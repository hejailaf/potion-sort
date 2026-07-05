import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMetaStore } from '@/state/metaStore';

/** Window-coordinate center of the coin pill — CoinFly's destination. */
export const coinCounterLayout: { current: { x: number; y: number } | null } = { current: null };

export function CoinCounter() {
  const coins = useMetaStore((s) => s.coins);
  const ref = useRef<View>(null);

  return (
    <View
      ref={ref}
      style={styles.pill}
      onLayout={() => {
        ref.current?.measureInWindow((x, y, w, h) => {
          coinCounterLayout.current = { x: x + w / 2, y: y + h / 2 };
        });
      }}
    >
      <View style={styles.coin} />
      <Text style={styles.count}>{coins}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  coin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F2D43D',
    borderWidth: 2,
    borderColor: '#C9A227',
  },
  count: {
    color: '#E8E6FF',
    fontSize: 15,
    fontWeight: '700',
  },
});
