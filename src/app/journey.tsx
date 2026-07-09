import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeTabBar } from '@/components/hud/HomeTabBar';
import { WorkshopBackground } from '@/components/WorkshopBackground';
import { useMetaStore } from '@/state/metaStore';
import { button, color, font, labelShadow, radius, shadow } from '@/theme';

const LOCKED_AHEAD = 3;
/** winding path: horizontal offset per node, cycled */
const WEAVE = [0, -62, -90, -62, 0, 62, 90, 62];

/** v2 Journey: the level map — brewed levels behind you, the next brew glowing ahead. */
export default function JourneyScreen() {
  const router = useRouter();
  const currentLevel = useMetaStore((s) => s.currentLevel);

  // top-to-bottom: a few locked levels ahead, then current, then the trail back to 1
  const nodes = [];
  for (let lvl = currentLevel + LOCKED_AHEAD; lvl >= 1; lvl--) nodes.push(lvl);

  return (
    <View style={styles.container}>
      <WorkshopBackground />
      <SafeAreaView style={styles.content} edges={['top', 'left', 'right']}>
        <Text style={styles.title}>Journey</Text>
        <Text style={styles.subtitle}>
          {currentLevel === 1 ? 'Your adventure begins!' : `${currentLevel - 1} potions mastered — onward!`}
        </Text>
        <ScrollView contentContainerStyle={styles.path} showsVerticalScrollIndicator={false}>
          {nodes.map((lvl, i) => (
            <View key={lvl} style={[styles.step, { transform: [{ translateX: WEAVE[i % WEAVE.length] }] }]}>
              {lvl === currentLevel ? (
                <Pressable onPress={() => router.push('/game')} style={({ pressed }) => [styles.node, styles.nodeCurrent, shadow.button, pressed && styles.nodePressed]}>
                  <Text style={styles.nodeCurrentText}>{lvl}</Text>
                  <Text style={styles.playHint}>PLAY</Text>
                </Pressable>
              ) : lvl < currentLevel ? (
                <View style={[styles.node, styles.nodeDone, shadow.chip]}>
                  <Text style={styles.nodeDoneText}>{lvl}</Text>
                  <Text style={styles.check}>✓</Text>
                </View>
              ) : (
                <View style={[styles.node, styles.nodeLocked]}>
                  <Text style={styles.lock}>🔒</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
      <HomeTabBar active="journey" />
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
  title: {
    color: color.goldText,
    fontFamily: font.display,
    fontSize: 30,
    textAlign: 'center',
    marginTop: 10,
    ...labelShadow,
  },
  subtitle: {
    color: color.textDim,
    fontFamily: font.body,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  path: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 22,
    paddingBottom: 60,
  },
  step: {
    alignItems: 'center',
  },
  node: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCurrent: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: button.green.fill,
    borderWidth: 3,
    borderColor: button.green.rim,
  },
  nodePressed: {
    transform: [{ scale: 0.95 }],
  },
  nodeCurrentText: {
    color: '#FFFFFF',
    fontFamily: font.display,
    fontSize: 24,
    ...labelShadow,
  },
  playHint: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: font.bold,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: -3,
  },
  nodeDone: {
    backgroundColor: color.gold,
    borderWidth: 2.5,
    borderColor: color.goldRimBottom,
  },
  nodeDoneText: {
    color: color.brownText,
    fontFamily: font.bold,
    fontSize: 19,
  },
  check: {
    position: 'absolute',
    right: -2,
    top: -4,
    color: button.green.rim,
    fontSize: 15,
    fontWeight: '900',
    backgroundColor: color.cream,
    borderRadius: radius.pill,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 19,
    overflow: 'hidden',
  },
  nodeLocked: {
    backgroundColor: color.panelDeep,
    borderWidth: 1.5,
    borderColor: color.panelBorder,
    opacity: 0.75,
  },
  lock: {
    fontSize: 20,
    opacity: 0.8,
  },
});
