import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CoinFly } from '@/components/effects/CoinFly';
import { CoinCounter } from '@/components/hud/CoinCounter';
import { SettingsSheet } from '@/components/hud/SettingsSheet';
import { StarryBackground } from '@/components/StarryBackground';
import { useMetaStore } from '@/state/metaStore';

export default function HomeScreen() {
  const router = useRouter();
  const currentLevel = useMetaStore((s) => s.currentLevel);
  const pendingCoinReward = useMetaStore((s) => s.pendingCoinReward);
  const clearCoinCelebration = useMetaStore((s) => s.clearCoinCelebration);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <StarryBackground />
      <SafeAreaView style={styles.content}>
        <View style={styles.topBar}>
          <CoinCounter />
          <Pressable onPress={() => setSettingsOpen(true)} style={styles.gear} hitSlop={8}>
            <Text style={styles.gearText}>⚙</Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={styles.title}>Potion Sort</Text>
          <Pressable style={styles.playButton} onPress={() => router.push('/game')}>
            <Text style={styles.playText}>Level {currentLevel}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      {pendingCoinReward !== null && <CoinFly onDone={clearCoinCelebration} />}
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
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  gear: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearText: {
    color: '#E8E6FF',
    fontSize: 18,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  title: {
    color: '#E8E6FF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  playButton: {
    backgroundColor: '#8A4AE6',
    borderRadius: 999,
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  playText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
});
