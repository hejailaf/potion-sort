import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Board } from '@/components/Board';
import { EffectsLayer } from '@/components/EffectsLayer';
import { BoosterBar } from '@/components/hud/BoosterBar';
import { CoinCounter } from '@/components/hud/CoinCounter';
import { LevelPill } from '@/components/hud/LevelPill';
import { SettingsSheet } from '@/components/hud/SettingsSheet';
import { OnboardingHint } from '@/components/OnboardingHint';
import { PourOverlay } from '@/components/PourOverlay';
import { StarryBackground } from '@/components/StarryBackground';
import { WinOverlay } from '@/components/WinOverlay';
import { useGameStore } from '@/state/gameStore';
import { useMetaStore } from '@/state/metaStore';

export default function GameScreen() {
  const resumeOrLoad = useGameStore((s) => s.resumeOrLoad);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    resumeOrLoad(useMetaStore.getState().currentLevel);
  }, [resumeOrLoad]);

  return (
    <View style={styles.container}>
      <StarryBackground />
      <SafeAreaView style={styles.content}>
        <View style={styles.topBar}>
          <CoinCounter />
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
