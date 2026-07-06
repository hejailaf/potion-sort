import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GameButton } from '@/components/ui/GameButton';
import { GameModal } from '@/components/ui/GameModal';
import { LIFE_REGEN_MS, LIVES_REFILL_COST, MAX_LIVES, useMetaStore } from '@/state/metaStore';
import { color, font, radius, shadow } from '@/theme';

/** Hearts n/5 with a mm:ss countdown; "+" offers the coin refill when below max. */
export function LivesPill() {
  const lives = useMetaStore((s) => s.lives);
  const lastLifeAt = useMetaStore((s) => s.lastLifeAt);
  const coins = useMetaStore((s) => s.coins);
  const syncLives = useMetaStore((s) => s.syncLives);
  const refillLives = useMetaStore((s) => s.refillLives);
  const [now, setNow] = useState(Date.now());
  const [refillOpen, setRefillOpen] = useState(false);
  const acting = useRef(false);

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

  const refill = () => {
    if (acting.current) return;
    acting.current = true;
    refillLives();
    setRefillOpen(false);
  };

  return (
    <View style={styles.row}>
      <View style={[styles.pill, shadow.chip]}>
        <Text style={styles.heart}>❤️</Text>
        <Text style={styles.text}>
          {lives}/{MAX_LIVES}
        </Text>
        {timer !== null && <Text style={styles.timer}>{timer}</Text>}
      </View>
      {lives < MAX_LIVES && (
        <Pressable
          onPress={() => {
            acting.current = false;
            setRefillOpen(true);
          }}
          hitSlop={10}
          style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
        >
          <Text style={styles.addText}>＋</Text>
        </Pressable>
      )}

      <GameModal
        visible={refillOpen}
        title="Refill Lives"
        onClose={() => setRefillOpen(false)}
        icon="❤️"
        message={
          coins >= LIVES_REFILL_COST
            ? `Refill to ${MAX_LIVES} hearts for ${LIVES_REFILL_COST} coins?`
            : `Refilling costs ${LIVES_REFILL_COST} coins — you have ${coins}. Next heart in ${timer ?? '–'}.`
        }
      >
        {coins >= LIVES_REFILL_COST && (
          <GameButton label={`Refill (${LIVES_REFILL_COST} coins)`} variant="green" onPress={refill} />
        )}
      </GameModal>
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
    gap: 6,
    height: 38,
    backgroundColor: color.panelLight,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.panelBorder,
    paddingLeft: 8,
    paddingRight: 14,
  },
  heart: {
    fontSize: 15,
  },
  text: {
    color: color.text,
    fontFamily: font.semibold,
    fontSize: 15,
  },
  timer: {
    color: color.textDim,
    fontFamily: font.medium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  add: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4FB93F',
    borderWidth: 1.5,
    borderColor: '#2A7A21',
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
