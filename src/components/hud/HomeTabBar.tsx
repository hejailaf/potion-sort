import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { presentLeaderboard } from '@/gamecenter';

// ponytail: Shop is a modal screen and Ranks is a native GC sheet — a real Tabs
// group waits until a second in-tab destination exists (Teams)
const TABS = ['home', 'shop', 'ranks', 'teams'] as const;
type Tab = (typeof TABS)[number];

const TAB_META: Record<Tab, { glyph: string; label: string; locked: boolean }> = {
  home: { glyph: '⌂', label: 'Home', locked: false },
  shop: { glyph: '🛒', label: 'Shop', locked: false },
  ranks: { glyph: '🏆', label: 'Ranks', locked: false },
  teams: { glyph: '👥', label: 'Teams', locked: true },
};

export function HomeTabBar() {
  const router = useRouter();

  const onPress = (tab: Tab) => {
    if (tab === 'shop') router.push('/shop');
    else if (tab === 'ranks') {
      if (!presentLeaderboard()) {
        Alert.alert('Game Center unavailable', 'Sign in to Game Center in Settings to see rankings.');
      }
    } else if (tab === 'teams') {
      Alert.alert('Coming soon', 'Teams unlocks in a future update.');
    }
  };

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const meta = TAB_META[tab];
        return (
          <Pressable key={tab} style={styles.tab} disabled={tab === 'home'} onPress={() => onPress(tab)}>
            <Text style={[styles.glyph, meta.locked && styles.lockedText]}>{meta.glyph}</Text>
            <Text style={[styles.label, meta.locked && styles.lockedText]}>
              {meta.locked ? `🔒 ${meta.label}` : meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingVertical: 10,
    marginBottom: 4,
  },
  tab: {
    alignItems: 'center',
    gap: 2,
    minWidth: 64,
  },
  glyph: {
    color: '#E8E6FF',
    fontSize: 20,
  },
  label: {
    color: '#E8E6FF',
    fontSize: 11,
    fontWeight: '700',
  },
  lockedText: {
    color: 'rgba(232,230,255,0.4)',
  },
});
