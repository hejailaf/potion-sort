import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { presentLeaderboard } from '@/gamecenter';
import { CoinFly } from '@/components/effects/CoinFly';
import { CoinCounter } from '@/components/hud/CoinCounter';
import { HomeTabBar } from '@/components/hud/HomeTabBar';
import { LivesPill } from '@/components/hud/LivesPill';
import { SettingsSheet } from '@/components/hud/SettingsSheet';
import { WorkshopBackground } from '@/components/WorkshopBackground';
import { GameButton } from '@/components/ui/GameButton';
import { IconButton } from '@/components/ui/IconButton';
import { todayKey, useMetaStore } from '@/state/metaStore';
import { color, font, labelShadow } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const currentLevel = useMetaStore((s) => s.currentLevel);
  const dailyDone = useMetaStore((s) => s.lastDailyCompleted === todayKey());
  const dailyStreak = useMetaStore((s) => s.dailyStreak);
  const pendingCoinReward = useMetaStore((s) => s.pendingCoinReward);
  const clearCoinCelebration = useMetaStore((s) => s.clearCoinCelebration);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <WorkshopBackground />
      <SafeAreaView style={styles.content} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <CoinCounter onAdd={() => router.push('/shop')} />
            <LivesPill />
          </View>
          <View style={styles.topRight}>
            {/* Ranks moved here from the old 5-tab bar (v2 bar is Shop/Home/Journey) */}
            <IconButton
              glyph="🏆"
              onPress={() => {
                if (!presentLeaderboard()) {
                  Alert.alert('Game Center unavailable', 'Sign in to Game Center in Settings to see rankings.');
                }
              }}
            />
            <IconButton glyph="⚙" onPress={() => setSettingsOpen(true)} />
          </View>
        </View>
        <View style={styles.center}>
          <Text style={styles.title}>Potion Sort</Text>
          <GameButton
            label={`Level ${currentLevel}`}
            variant="violet"
            big
            onPress={() => router.push('/game')}
          />
          <GameButton
            label={
              dailyDone
                ? '✓ Daily Complete'
                : dailyStreak > 0
                  ? `✦ Daily Challenge  🔥${dailyStreak}`
                  : '✦ Daily Challenge'
            }
            variant="green"
            disabled={dailyDone}
            onPress={() => router.push('/game?daily=1')}
          />
        </View>
      </SafeAreaView>
      <HomeTabBar />
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
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  title: {
    color: color.goldText,
    fontFamily: font.display,
    fontSize: 38,
    marginBottom: 10,
    ...labelShadow,
  },
});
