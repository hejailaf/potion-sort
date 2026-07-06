import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '@/state/gameStore';
import { LIFE_REGEN_MS, LIVES_REFILL_COST, useMetaStore } from '@/state/metaStore';

interface LevelPillProps {
  onOpenSettings: () => void;
}

function confirmRestart(restart: () => void) {
  const meta = useMetaStore.getState();
  meta.syncLives();
  const { lives, lastLifeAt, coins } = useMetaStore.getState();
  if (lives <= 0) {
    const mins = lastLifeAt !== null ? Math.ceil((lastLifeAt + LIFE_REGEN_MS - Date.now()) / 60_000) : 0;
    const body =
      coins >= LIVES_REFILL_COST
        ? `Next life in ${mins}m — or refill 5 lives for ${LIVES_REFILL_COST} coins.`
        : `Next life in ${mins}m. (Refill costs ${LIVES_REFILL_COST} coins — you have ${coins}.)`;
    Alert.alert('Out of lives', body, [
      { text: 'Wait', style: 'cancel' },
      ...(coins >= LIVES_REFILL_COST
        ? [
            {
              text: `Refill (${LIVES_REFILL_COST})`,
              onPress: () => {
                if (useMetaStore.getState().refillLives()) restart();
              },
            },
          ]
        : []),
    ]);
    return;
  }
  Alert.alert('Restart level?', 'Restarting costs 1 life.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Restart', style: 'destructive', onPress: restart },
  ]);
}

export function LevelPill({ onOpenSettings }: LevelPillProps) {
  const levelId = useGameStore((s) => s.level?.id);
  const daily = useGameStore((s) => s.mode === 'daily');
  const restart = useGameStore((s) => s.restart);

  return (
    <View style={styles.bar}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{daily ? 'Daily' : `Level ${levelId ?? '–'}`}</Text>
      </View>
      <Pressable onPress={() => confirmRestart(restart)} style={styles.round} hitSlop={8}>
        <Text style={styles.roundText}>↻</Text>
      </Pressable>
      <Pressable onPress={onOpenSettings} style={styles.round} hitSlop={8}>
        <Text style={styles.roundText}>⚙</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  pillText: {
    color: '#E8E6FF',
    fontSize: 16,
    fontWeight: '700',
  },
  round: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundText: {
    color: '#E8E6FF',
    fontSize: 18,
    fontWeight: '700',
  },
});
