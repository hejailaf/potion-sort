import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '@/state/gameStore';
import { useMetaStore } from '@/state/metaStore';

export function BoosterBar() {
  const boosters = useMetaStore((s) => s.boosters);
  const undoMove = useGameStore((s) => s.undoMove);
  const shuffleBoard = useGameStore((s) => s.shuffleBoard);
  const addExtraBottle = useGameStore((s) => s.addExtraBottle);
  const historyLength = useGameStore((s) => s.history.length);
  const extraBottleUsed = useGameStore((s) => s.extraBottleUsed);
  const won = useGameStore((s) => s.status === 'won');

  return (
    <View style={styles.bar}>
      <BoosterButton
        glyph="↩"
        label="Undo"
        count={boosters.undo}
        disabled={won || boosters.undo === 0 || historyLength === 0}
        onPress={undoMove}
      />
      <BoosterButton
        glyph="⇄"
        label="Shuffle"
        count={boosters.shuffle}
        disabled={won || boosters.shuffle === 0}
        onPress={shuffleBoard}
      />
      <BoosterButton
        glyph="＋"
        label="Bottle"
        count={boosters.extraBottle}
        disabled={won || boosters.extraBottle === 0 || extraBottleUsed}
        onPress={addExtraBottle}
      />
    </View>
  );
}

interface BoosterButtonProps {
  glyph: string;
  label: string;
  count: number;
  disabled: boolean;
  onPress: () => void;
}

function BoosterButton({ glyph, label, count, disabled, onPress }: BoosterButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
      <Text style={styles.glyph}>{glyph}</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 16,
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    width: 72,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -6,
    backgroundColor: '#8A4AE6',
    borderRadius: 999,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    zIndex: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  glyph: {
    color: '#E8E6FF',
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    color: 'rgba(232,230,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
});
