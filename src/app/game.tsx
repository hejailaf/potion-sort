import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { track } from '@/analytics';
import { Board } from '@/components/Board';
import { EffectsLayer } from '@/components/EffectsLayer';
import { BoosterBar } from '@/components/hud/BoosterBar';
import { CoinCounter } from '@/components/hud/CoinCounter';
import { LevelPill } from '@/components/hud/LevelPill';
import { SettingsSheet } from '@/components/hud/SettingsSheet';
import { OnboardingHint } from '@/components/OnboardingHint';
import { PourOverlay } from '@/components/PourOverlay';
import { WorkshopBackground } from '@/components/WorkshopBackground';
import { GameButton } from '@/components/ui/GameButton';
import { GameModal } from '@/components/ui/GameModal';
import { IconButton } from '@/components/ui/IconButton';
import { WinOverlay } from '@/components/WinOverlay';
import { hasAnyMove } from '@/engine/rules';
import { useGameStore } from '@/state/gameStore';
import { useMetaStore } from '@/state/metaStore';

export default function GameScreen() {
  const router = useRouter();
  const { daily } = useLocalSearchParams<{ daily?: string }>();
  const resumeOrLoad = useGameStore((s) => s.resumeOrLoad);
  const loadDaily = useGameStore((s) => s.loadDaily);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [hasLives, setHasLives] = useState(true);
  const leaving = useRef(false);

  // deadlock detection: once the board settles with no legal pour left (R1)
  const bottles = useGameStore((s) => s.bottles);
  const animating = useGameStore((s) => s.activePours.length > 0);
  const status = useGameStore((s) => s.status);
  const historyLength = useGameStore((s) => s.history.length);
  const extraBottleUsed = useGameStore((s) => s.extraBottleUsed);
  const shuffleBoard = useGameStore((s) => s.shuffleBoard);
  const addExtraBottle = useGameStore((s) => s.addExtraBottle);
  const restart = useGameStore((s) => s.restart);
  const shuffleCharges = useMetaStore((s) => s.boosters.shuffle);
  const extraCharges = useMetaStore((s) => s.boosters.extraBottle);
  const lives = useMetaStore((s) => s.lives);
  const deadlocked =
    status === 'playing' && !animating && historyLength > 0 && !hasAnyMove(bottles);

  useEffect(() => {
    if (daily) loadDaily();
    else resumeOrLoad(useMetaStore.getState().currentLevel);
    const level = useGameStore.getState().level;
    if (level) track('level_start', { level: level.id, daily: daily ? 1 : 0 });
  }, [daily, loadDaily, resumeOrLoad]);

  const openQuit = () => {
    useMetaStore.getState().syncLives();
    setHasLives(useMetaStore.getState().lives > 0);
    leaving.current = false;
    setQuitOpen(true);
  };

  // free exit: the board is persisted, so leaving keeps it to resume later (R4)
  const leaveLevel = () => {
    if (leaving.current) return;
    leaving.current = true;
    track('level_leave', { level: useGameStore.getState().level?.id ?? 0 });
    setQuitOpen(false);
    router.replace('/');
  };

  // abandon: spend a life and re-deal the board on next entry
  const abandonLevel = () => {
    if (leaving.current) return;
    leaving.current = true;
    track('level_quit', { level: useGameStore.getState().level?.id ?? 0 });
    useGameStore.getState().quitLevel();
    setQuitOpen(false);
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <WorkshopBackground />
      <SafeAreaView style={styles.content}>
        <View style={styles.topBar}>
          <IconButton glyph="🚪" onPress={openQuit} />
          <CoinCounter />
          <View style={styles.spacer} />
          <LevelPill onOpenSettings={() => setSettingsOpen(true)} />
        </View>
        <Board />
        <BoosterBar />
      </SafeAreaView>
      <PourOverlay />
      <EffectsLayer />
      <OnboardingHint />
      <WinOverlay />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <GameModal
        visible={quitOpen}
        title="Leave Level?"
        onClose={() => setQuitOpen(false)}
        icon="🚪"
        message="Take a break and keep your progress — or abandon this board for a fresh deal."
      >
        {hasLives && (
          <View style={styles.lifeDrain}>
            <Text style={styles.lifeDrainText}>
              Abandoning costs a life: ❤️ {lives} → {Math.max(0, lives - 1)}
            </Text>
          </View>
        )}
        <GameButton label="Take a Break" variant="green" onPress={leaveLevel} />
        <GameButton
          label={hasLives ? 'Abandon (−1 ❤️)' : 'Abandon'}
          variant="red"
          onPress={abandonLevel}
        />
      </GameModal>

      <GameModal
        visible={deadlocked}
        title="No Moves Left!"
        onClose={leaveLevel}
        icon="🧪"
        message="The board is stuck — brew your way out:"
      >
        {shuffleCharges > 0 && (
          <GameButton label="Shuffle" variant="green" onPress={shuffleBoard} />
        )}
        {!extraBottleUsed && extraCharges > 0 && (
          <GameButton label="Add a Bottle" variant="violet" onPress={addExtraBottle} />
        )}
        {lives > 0 && (
          <GameButton label="Restart (−1 ❤️)" variant="red" onPress={restart} />
        )}
      </GameModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  spacer: {
    flex: 1,
  },
  // v2: explicit life-drain chip on the abandon path
  lifeDrain: {
    alignSelf: 'center',
    backgroundColor: 'rgba(232,87,66,0.18)',
    borderColor: 'rgba(232,87,66,0.55)',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  lifeDrainText: {
    color: '#FFEFD9',
    fontSize: 13,
    fontWeight: '700',
  },
});
