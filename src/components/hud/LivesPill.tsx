import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LIFE_REGEN_MS, MAX_LIVES, useMetaStore } from '@/state/metaStore';

/** Hearts n/5 with a mm:ss countdown to the next life while below max. */
export function LivesPill() {
  const lives = useMetaStore((s) => s.lives);
  const lastLifeAt = useMetaStore((s) => s.lastLifeAt);
  const syncLives = useMetaStore((s) => s.syncLives);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    syncLives();
    if (lastLifeAt === null) return;
    const t = setInterval(() => {
      setNow(Date.now());
      syncLives();
    }, 1000);
    return () => clearInterval(t);
  }, [lastLifeAt, syncLives]);

  const remaining = lastLifeAt !== null ? Math.max(0, lastLifeAt + LIFE_REGEN_MS - now) : null;
  const timer =
    remaining !== null
      ? `${Math.floor(remaining / 60_000)}:${String(Math.floor((remaining % 60_000) / 1000)).padStart(2, '0')}`
      : null;

  return (
    <View style={styles.pill}>
      <Text style={styles.text}>
        ❤️ {lives}/{MAX_LIVES}
      </Text>
      {timer !== null && <Text style={styles.timer}>{timer}</Text>}
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
    paddingVertical: 6,
  },
  text: {
    color: '#E8E6FF',
    fontSize: 14,
    fontWeight: '700',
  },
  timer: {
    color: 'rgba(232,230,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
