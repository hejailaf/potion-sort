import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, shadow } from '@/theme';

// ponytail: a visual bar, not a router Tabs group — v2 structure is 3 tabs:
// Shop (modal), Home, Journey (level map). Ranks lives on the home top bar.
export function HomeTabBar({ active = 'home' }: { active?: 'home' | 'journey' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goHome = () => {
    if (active !== 'home') router.replace('/');
  };
  const goJourney = () => {
    if (active !== 'journey') router.replace('/journey');
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 6 }]}>
      <Pressable style={styles.tab} onPress={() => router.push('/shop')} hitSlop={6}>
        <Text style={styles.glyph}>🛒</Text>
        <Text style={styles.label}>Shop</Text>
      </Pressable>

      {/* elevated brass Home button */}
      <Pressable style={styles.tab} onPress={goHome} hitSlop={6}>
        <View style={[styles.homeBadge, shadow.button, active !== 'home' && styles.homeBadgeIdle]}>
          <Text style={styles.homeGlyph}>⚗️</Text>
        </View>
        <Text style={[styles.homeLabel, active !== 'home' && styles.labelIdle]}>Home</Text>
      </Pressable>

      <Pressable style={styles.tab} onPress={goJourney} hitSlop={6}>
        <Text style={[styles.glyph, active === 'journey' && styles.glyphActive]}>🗺️</Text>
        <Text style={[styles.label, active === 'journey' && styles.labelActive]}>Journey</Text>
      </Pressable>
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
    minWidth: 72,
  },
  glyph: {
    color: color.text,
    fontSize: 22,
    opacity: 0.85,
  },
  glyphActive: {
    opacity: 1,
  },
  label: {
    color: color.textDim,
    fontFamily: font.semibold,
    fontSize: 11,
  },
  labelActive: {
    color: color.goldText,
  },
  labelIdle: {
    color: color.textDim,
  },
  homeBadge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    marginTop: -30,
    backgroundColor: color.gold,
    borderWidth: 3,
    borderColor: color.goldRimBottom,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBadgeIdle: {
    backgroundColor: color.panelLight,
    borderColor: color.panelBorder,
  },
  homeGlyph: {
    fontSize: 30,
  },
  homeLabel: {
    color: color.goldText,
    fontFamily: font.bold,
    fontSize: 11,
  },
});
