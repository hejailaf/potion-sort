import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

// ponytail: purely visual placeholders — becomes a real expo-router Tabs group in v1.2 when Shop exists
const TABS = [
  { glyph: '⌂', label: 'Home', locked: false },
  { glyph: '🛒', label: 'Shop', locked: true },
  { glyph: '🏆', label: 'Ranks', locked: true },
  { glyph: '👥', label: 'Teams', locked: true },
];

export function HomeTabBar() {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => (
        <Pressable
          key={tab.label}
          style={styles.tab}
          disabled={!tab.locked}
          onPress={() => Alert.alert('Coming soon', `${tab.label} unlocks in a future update.`)}
        >
          <Text style={[styles.glyph, tab.locked && styles.lockedText]}>{tab.glyph}</Text>
          <Text style={[styles.label, tab.locked && styles.lockedText]}>
            {tab.locked ? `🔒 ${tab.label}` : tab.label}
          </Text>
        </Pressable>
      ))}
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
