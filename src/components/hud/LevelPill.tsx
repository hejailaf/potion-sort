import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { showRewardedAd } from '@/ads';
import { track } from '@/analytics';
import { GameButton } from '@/components/ui/GameButton';
import { GameModal } from '@/components/ui/GameModal';
import { IconButton } from '@/components/ui/IconButton';
import { useGameStore } from '@/state/gameStore';
import { LIFE_REGEN_MS, LIVES_REFILL_COST, useMetaStore } from '@/state/metaStore';
import { color, font, radius, shadow, timing } from '@/theme';

interface LevelPillProps {
  onOpenSettings: () => void;
}

async function watchAdForLife(restart: () => void) {
  if (await showRewardedAd('life')) {
    if (useMetaStore.getState().grantLife()) restart();
  } else {
    Alert.alert('No ad available', 'Try again in a moment.');
  }
}

export function LevelPill({ onOpenSettings }: LevelPillProps) {
  const levelId = useGameStore((s) => s.level?.id);
  const daily = useGameStore((s) => s.mode === 'daily');
  const restart = useGameStore((s) => s.restart);
  const [modal, setModal] = useState<null | 'restart' | 'noLives'>(null);
  const acting = useRef(false);

  const openRestart = () => {
    const meta = useMetaStore.getState();
    meta.syncLives();
    acting.current = false;
    if (useMetaStore.getState().lives <= 0) {
      track('out_of_lives', { coins: meta.coins });
      setModal('noLives');
    } else {
      setModal('restart');
    }
  };

  const confirmRestart = () => {
    if (acting.current) return;
    acting.current = true;
    track('level_restart', { level: useGameStore.getState().level?.id ?? 0 });
    setModal(null);
    restart();
  };

  const adForLife = () => {
    setModal(null);
    // let the modal dismiss before the fullscreen ad presents its own controller
    setTimeout(() => watchAdForLife(restart), timing.adWatchDelay);
  };

  const refill = () => {
    setModal(null);
    if (useMetaStore.getState().refillLives()) restart();
  };

  const { lastLifeAt, coins } = useMetaStore.getState();
  const mins = lastLifeAt !== null ? Math.max(1, Math.ceil((lastLifeAt + LIFE_REGEN_MS - Date.now()) / 60_000)) : 0;

  return (
    <View style={styles.bar}>
      <View style={[styles.pill, shadow.chip]}>
        <Text style={styles.pillText}>{daily ? 'Daily' : `Level ${levelId ?? '–'}`}</Text>
      </View>
      <IconButton glyph="↻" onPress={openRestart} />
      <IconButton glyph="⚙" onPress={onOpenSettings} />

      <GameModal
        visible={modal === 'restart'}
        title="Restart Level?"
        onClose={() => setModal(null)}
        icon="💔"
        message="Restarting costs 1 life!"
      >
        <GameButton label="Restart" variant="red" onPress={confirmRestart} />
      </GameModal>

      <GameModal
        visible={modal === 'noLives'}
        title="Out of Lives"
        onClose={() => setModal(null)}
        icon="💔"
        message={`Next life in ${mins}m — or get one now:`}
      >
        <GameButton label="Watch ad (+1 ❤️)" variant="green" onPress={adForLife} />
        {coins >= LIVES_REFILL_COST && (
          <GameButton label={`Refill 5 (${LIVES_REFILL_COST} coins)`} variant="violet" onPress={refill} />
        )}
      </GameModal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    backgroundColor: color.panelLight,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.goldRimBottom,
    paddingHorizontal: 16,
    height: 38,
    justifyContent: 'center',
  },
  pillText: {
    color: color.text,
    fontFamily: font.semibold,
    fontSize: 15,
  },
});
