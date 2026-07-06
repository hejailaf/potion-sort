import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { presentLeaderboard } from '@/gamecenter';
import { todayKey, useMetaStore } from '@/state/metaStore';
import { color, font, shadow } from '@/theme';

// ponytail: a visual bar, not a router Tabs group — Home is the only in-tab screen;
// Shop is a modal, Ranks is the native GC sheet, Daily routes into the game.
const SIDE_TABS_LEFT = [
  { key: 'shop', glyph: '🛒', label: 'Shop' },
  { key: 'ranks', glyph: '🏆', label: 'Ranks' },
] as const;
const SIDE_TABS_RIGHT = [
  { key: 'daily', glyph: '✦', label: 'Daily' },
  { key: 'teams', glyph: '👥', label: 'Teams' },
] as const;

export function HomeTabBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dailyDone = useMetaStore((s) => s.lastDailyCompleted === todayKey());

  const onPress = (key: string) => {
    if (key === 'shop') router.push('/shop');
    else if (key === 'ranks') {
      if (!presentLeaderboard()) {
        Alert.alert('Game Center unavailable', 'Sign in to Game Center in Settings to see rankings.');
      }
    } else if (key === 'daily') {
      if (dailyDone) Alert.alert('Daily complete!', 'Come back tomorrow for a new potion puzzle.');
      else router.push('/game?daily=1');
    } else if (key === 'teams') {
      Alert.alert('Coming soon', 'Teams unlocks in a future update.');
    }
  };

  const renderTab = (tab: { key: string; glyph: string; label: string }) => {
    const locked = tab.key === 'teams';
    const dimmed = locked || (tab.key === 'daily' && dailyDone);
    return (
      <Pressable key={tab.key} style={styles.tab} onPress={() => onPress(tab.key)} hitSlop={6}>
        <Text style={[styles.glyph, dimmed && styles.lockedText]}>{tab.key === 'daily' && dailyDone ? '✓' : tab.glyph}</Text>
        <Text style={[styles.label, dimmed && styles.lockedText]}>{locked ? `🔒 ${tab.label}` : tab.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 6 }]}>
      {SIDE_TABS_LEFT.map(renderTab)}
      {/* elevated active Home slot */}
      <View style={styles.tab}>
        <View style={[styles.homeBadge, shadow.button]}>
          <Text style={styles.homeGlyph}>⌂</Text>
        </View>
        <Text style={styles.homeLabel}>Home</Text>
      </View>
      {SIDE_TABS_RIGHT.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: color.panelDeep,
    borderTopWidth: 1.5,
    borderTopColor: color.panelBorder,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tab: {
    alignItems: 'center',
    gap: 2,
    minWidth: 60,
  },
  glyph: {
    color: color.text,
    fontSize: 21,
  },
  label: {
    color: color.text,
    fontFamily: font.semibold,
    fontSize: 11,
  },
  lockedText: {
    color: color.textLocked,
  },
  homeBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -26,
    backgroundColor: color.gold,
    borderWidth: 3,
    borderColor: color.goldRimBottom,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeGlyph: {
    color: color.panelDeep,
    fontSize: 26,
    fontWeight: '800',
  },
  homeLabel: {
    color: color.goldText,
    fontFamily: font.bold,
    fontSize: 11,
  },
});
