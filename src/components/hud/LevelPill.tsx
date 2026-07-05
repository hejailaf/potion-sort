import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '@/state/gameStore';

interface LevelPillProps {
  onOpenSettings: () => void;
}

export function LevelPill({ onOpenSettings }: LevelPillProps) {
  const levelId = useGameStore((s) => s.level?.id);
  const restart = useGameStore((s) => s.restart);

  return (
    <View style={styles.bar}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>Level {levelId ?? '–'}</Text>
      </View>
      <Pressable onPress={restart} style={styles.round} hitSlop={8}>
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
