import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { showRewardedAd } from '@/ads';
import { track } from '@/analytics';
import { GameButton } from '@/components/ui/GameButton';
import { GameModal } from '@/components/ui/GameModal';
import { hintMove } from '@/engine/solver';
import { useGameStore } from '@/state/gameStore';
import { BOOSTER_COST, BoosterKind, HINT_COST, useMetaStore } from '@/state/metaStore';
import { hapticError, playSfx } from '@/sound';
import { color, font, radius, shadow } from '@/theme';

const BOOSTER_META: Record<BoosterKind, { glyph: string; label: string }> = {
  undo: { glyph: '↩', label: 'Undo' },
  shuffle: { glyph: '⇄', label: 'Shuffle' },
  extraBottle: { glyph: '＋', label: 'Bottle' },
};

async function watchAdForBooster(kind: BoosterKind, action: () => void) {
  if (await showRewardedAd('booster')) {
    useMetaStore.getState().grantBooster(kind);
    action();
  } else {
    Alert.alert('No ad available', 'Try again in a moment.');
  }
}

const noop = () => undefined;
/** sound + haptic when a dimmed booster is tapped, so a blocked tap is never silent (B3) */
const blockedFeedback = () => {
  hapticError();
  playSfx('error');
};

export function BoosterBar() {
  const boosters = useMetaStore((s) => s.boosters);
  const coins = useMetaStore((s) => s.coins);
  const undoMove = useGameStore((s) => s.undoMove);
  const shuffleBoard = useGameStore((s) => s.shuffleBoard);
  const addExtraBottle = useGameStore((s) => s.addExtraBottle);
  const historyLength = useGameStore((s) => s.history.length);
  const extraBottleUsed = useGameStore((s) => s.extraBottleUsed);
  const hintUsed = useGameStore((s) => s.hintUsed);
  const won = useGameStore((s) => s.status === 'won');
  const [buying, setBuying] = useState<null | { kind: BoosterKind; action: () => void }>(null);
  const acting = useRef(false);

  const press = (kind: BoosterKind, action: () => void) => () => {
    if (boosters[kind] === 0) {
      acting.current = false;
      setBuying({ kind, action });
    } else {
      track('booster_used', { kind });
      action();
    }
  };

  const doHint = () => {
    const g = useGameStore.getState();
    if (g.activePours.length > 0) return;
    const move = hintMove(g.bottles);
    if (!move) {
      blockedFeedback(); // no solution to point at (deadlock handles its own rescue)
      return;
    }
    const free = !g.hintUsed;
    if (!free && !useMetaStore.getState().spendCoins(HINT_COST)) {
      Alert.alert('Not enough coins', `A hint costs ${HINT_COST} coins.`);
      return;
    }
    track('hint_used', { free: free ? 1 : 0 });
    g.showHint(move);
    setTimeout(() => useGameStore.getState().clearHint(), 2600);
  };

  const buyWithCoins = () => {
    if (!buying || acting.current) return;
    acting.current = true;
    const { kind, action } = buying;
    setBuying(null);
    if (useMetaStore.getState().buyBooster(kind)) {
      track('booster_bought', { kind });
      action();
    }
  };

  const buyWithAd = () => {
    if (!buying) return;
    const { kind, action } = buying;
    setBuying(null);
    // let the modal dismiss before the fullscreen ad presents
    setTimeout(() => watchAdForBooster(kind, action), 400);
  };

  const undoDimmed = won || historyLength === 0;
  const extraDimmed = won || extraBottleUsed;

  return (
    <View style={styles.bar}>
      <BoosterButton
        glyph={BOOSTER_META.undo.glyph}
        label={BOOSTER_META.undo.label}
        badge={String(boosters.undo)}
        dimmed={undoDimmed}
        onPress={won ? noop : historyLength === 0 ? blockedFeedback : press('undo', undoMove)}
      />
      <BoosterButton
        glyph={BOOSTER_META.shuffle.glyph}
        label={BOOSTER_META.shuffle.label}
        badge={String(boosters.shuffle)}
        dimmed={won}
        onPress={won ? noop : press('shuffle', shuffleBoard)}
      />
      <BoosterButton
        glyph={BOOSTER_META.extraBottle.glyph}
        label={BOOSTER_META.extraBottle.label}
        badge={String(boosters.extraBottle)}
        dimmed={extraDimmed}
        onPress={won ? noop : extraBottleUsed ? blockedFeedback : press('extraBottle', addExtraBottle)}
      />
      <BoosterButton
        glyph="💡"
        label="Hint"
        badge={hintUsed ? String(HINT_COST) : 'Free'}
        dimmed={won}
        onPress={won ? noop : doHint}
      />

      <GameModal
        visible={buying !== null}
        title={buying ? `Get ${BOOSTER_META[buying.kind].label}` : ''}
        onClose={() => setBuying(null)}
        icon={buying ? BOOSTER_META[buying.kind].glyph : undefined}
        message={
          coins >= BOOSTER_COST
            ? `1 ${buying ? BOOSTER_META[buying.kind].label : ''} charge — ${BOOSTER_COST} coins, or watch an ad.`
            : `You have ${coins} coins (a charge costs ${BOOSTER_COST}) — watch an ad instead!`
        }
      >
        <GameButton label="Watch ad (free)" variant="green" onPress={buyWithAd} />
        {coins >= BOOSTER_COST && (
          <GameButton label={`Buy (${BOOSTER_COST} coins)`} variant="violet" onPress={buyWithCoins} />
        )}
      </GameModal>
    </View>
  );
}

interface BoosterButtonProps {
  glyph: string;
  label: string;
  badge: string;
  /** greyed out — but still fires onPress so a blocked tap can give feedback */
  dimmed: boolean;
  onPress: () => void;
}

function BoosterButton({ glyph, label, badge, dimmed, onPress }: BoosterButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        shadow.chip,
        pressed && styles.tilePressed,
        dimmed && styles.tileDisabled,
      ]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
      <Text style={styles.glyph}>{glyph}</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // v2: mahogany tray holding the violet booster tiles
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: color.panel,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.panelBorder,
  },
  tile: {
    width: 72,
    height: 72,
    borderRadius: radius.chip,
    backgroundColor: '#9C5CE8',
    borderWidth: 1.5,
    borderColor: '#6C35AC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tilePressed: {
    backgroundColor: '#6C35AC',
    transform: [{ scale: 0.95 }],
  },
  tileDisabled: {
    opacity: 0.35,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -6,
    backgroundColor: color.gold,
    borderRadius: radius.small,
    borderWidth: 1.5,
    borderColor: color.goldRimBottom,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    zIndex: 1,
  },
  badgeText: {
    color: color.panelDeep,
    fontFamily: font.semibold,
    fontSize: 12,
  },
  glyph: {
    color: color.text,
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: font.semibold,
    fontSize: 12,
  },
});
