import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { showRewardedAd } from '@/ads';
import { track } from '@/analytics';
import { useGameStore } from '@/state/gameStore';
import { BOOSTER_COST, BoosterKind, useMetaStore } from '@/state/metaStore';

async function watchAdForBooster(kind: BoosterKind, action: () => void) {
  if (await showRewardedAd('booster')) {
    useMetaStore.getState().grantBooster(kind);
    action();
  } else {
    Alert.alert('No ad available', 'Try again in a moment.');
  }
}

/** At 0 charges the button offers a coin purchase or a rewarded ad, then runs the action. */
function buyThenRun(kind: BoosterKind, label: string, action: () => void) {
  const { coins, buyBooster } = useMetaStore.getState();
  const adButton = { text: 'Watch ad (free)', onPress: () => watchAdForBooster(kind, action) };
  if (coins < BOOSTER_COST) {
    Alert.alert(
      'Not enough coins',
      `A ${label} charge costs ${BOOSTER_COST} coins — you have ${coins}.`,
      [{ text: 'Cancel', style: 'cancel' }, adButton],
    );
    return;
  }
  Alert.alert(`Buy ${label}`, `Spend ${BOOSTER_COST} coins for 1 ${label}?`, [
    { text: 'Cancel', style: 'cancel' },
    adButton,
    {
      text: `Buy (${BOOSTER_COST})`,
      onPress: () => {
        if (buyBooster(kind)) {
          track('booster_bought', { kind });
          action();
        }
      },
    },
  ]);
}

export function BoosterBar() {
  const boosters = useMetaStore((s) => s.boosters);
  const undoMove = useGameStore((s) => s.undoMove);
  const shuffleBoard = useGameStore((s) => s.shuffleBoard);
  const addExtraBottle = useGameStore((s) => s.addExtraBottle);
  const historyLength = useGameStore((s) => s.history.length);
  const extraBottleUsed = useGameStore((s) => s.extraBottleUsed);
  const won = useGameStore((s) => s.status === 'won');

  const press = (kind: BoosterKind, label: string, action: () => void) =>
    boosters[kind] === 0
      ? () => buyThenRun(kind, label, action)
      : () => {
          track('booster_used', { kind });
          action();
        };

  return (
    <View style={styles.bar}>
      <BoosterButton
        glyph="↩"
        label="Undo"
        count={boosters.undo}
        disabled={won || historyLength === 0}
        onPress={press('undo', 'Undo', undoMove)}
      />
      <BoosterButton
        glyph="⇄"
        label="Shuffle"
        count={boosters.shuffle}
        disabled={won}
        onPress={press('shuffle', 'Shuffle', shuffleBoard)}
      />
      <BoosterButton
        glyph="＋"
        label="Bottle"
        count={boosters.extraBottle}
        disabled={won || extraBottleUsed}
        onPress={press('extraBottle', 'Bottle', addExtraBottle)}
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
