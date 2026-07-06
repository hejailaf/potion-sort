import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { StarryBackground } from '@/components/StarryBackground';
import { GameButton } from '@/components/ui/GameButton';
import { GameModal } from '@/components/ui/GameModal';
import { IconButton } from '@/components/ui/IconButton';
import { WinOverlay } from '@/components/WinOverlay';
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
  const quitting = useRef(false);

  useEffect(() => {
    if (daily) loadDaily();
    else resumeOrLoad(useMetaStore.getState().currentLevel);
    const level = useGameStore.getState().level;
    if (level) track('level_start', { level: level.id, daily: daily ? 1 : 0 });
  }, [daily, loadDaily, resumeOrLoad]);

  const openQuit = () => {
    useMetaStore.getState().syncLives();
    setHasLives(useMetaStore.getState().lives > 0);
    quitting.current = false;
    setQuitOpen(true);
  };

  const confirmQuit = () => {
    if (quitting.current) return; // one-shot: no double life drain
    quitting.current = true;
    track('level_quit', { level: useGameStore.getState().level?.id ?? 0 });
    useGameStore.getState().quitLevel();
    setQuitOpen(false);
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <StarryBackground />
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
        title="Are You Sure?"
        onClose={() => setQuitOpen(false)}
        icon={hasLives ? '💔' : '🚪'}
        message={hasLives ? 'You will lose 1 life!' : 'Leave this level? You have no lives to lose.'}
      >
        <GameButton label="Quit" variant="red" onPress={confirmQuit} />
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
});
