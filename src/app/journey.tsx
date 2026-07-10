import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeTabBar } from '@/components/hud/HomeTabBar';
import { MECHANIC_COPY, MiniVial, UnlockInterstitial } from '@/components/UnlockInterstitial';
import { WorkshopBackground } from '@/components/WorkshopBackground';
import { MECHANIC_UNLOCKS, MechanicKind } from '@/engine/progression';
import { useMetaStore } from '@/state/metaStore';
import { button, color, font, labelShadow, radius, shadow, timing } from '@/theme';

/** winding path: horizontal offset per node, cycled */
const WEAVE = [0, -62, -90, -62, 0, 62, 90, 62];

// Milestone map derives entirely from MECHANIC_UNLOCKS + MECHANIC_COPY — adding a 4th
// mechanic to those two lights it up here (node + recall) with zero changes to this file.
const MILESTONES = Object.entries(MECHANIC_UNLOCKS) as [MechanicKind, number][];
const milestoneAt = new Map(MILESTONES.map(([k, lvl]) => [lvl, k] as [number, MechanicKind]));
const lastUnlockLevel = Math.max(...MILESTONES.map(([, lvl]) => lvl));

/** fixed slot height (holds the 84px milestone node + its label); scroll offset is pure arithmetic */
const SLOT_H = 112;
/** vial thumbnail width for milestone discs — height (× HEIGHT_RATIO ≈ 3.12) ≈ 72, inside the 84px node */
const MILESTONE_VIAL_W = 23;
/** how far below the viewport top to park the current node on open (~a third of a phone screen) */
const CENTER_PAD = 240;

/** v2 Journey: the level map — brewed levels behind you, milestones and the next brew ahead. */
export default function JourneyScreen() {
  const router = useRouter();
  const currentLevel = useMetaStore((s) => s.currentLevel);
  const [recall, setRecall] = useState<MechanicKind | null>(null);

  // the "what's next" tease slot: the next 20-cadence boundary strictly ahead of both
  // the last real unlock and the player's current level.
  const teaseLevel = Math.max(lastUnlockLevel + 20, (Math.floor(currentLevel / 20) + 1) * 20);

  // top-to-bottom: the tease slot ahead, then the trail back to 1
  const nodes = [];
  for (let lvl = teaseLevel; lvl >= 1; lvl--) nodes.push(lvl);

  // iOS-native initial offset — parks the current node ~a third down the screen (no measure/refs)
  const y = Math.max(0, (teaseLevel - currentLevel) * SLOT_H - CENTER_PAD);

  return (
    <View style={styles.container}>
      <WorkshopBackground />
      <SafeAreaView style={styles.content} edges={['top', 'left', 'right']}>
        <Text style={styles.title}>Journey</Text>
        <Text style={styles.subtitle}>
          {currentLevel === 1 ? 'Your adventure begins!' : `${currentLevel - 1} potions mastered — onward!`}
        </Text>
        <ScrollView
          contentContainerStyle={styles.path}
          showsVerticalScrollIndicator={false}
          contentOffset={{ x: 0, y }}
        >
          {nodes.map((lvl, i) => {
            const kind = milestoneAt.get(lvl);
            return (
              <View key={lvl} style={[styles.step, { transform: [{ translateX: WEAVE[i % WEAVE.length] }] }]}>
                {lvl === currentLevel ? (
                  <Pressable onPress={() => router.push('/game')} style={({ pressed }) => [styles.node, styles.nodeCurrent, shadow.button, pressed && styles.nodePressed]}>
                    <Text style={styles.nodeCurrentText}>{lvl}</Text>
                    <Text style={styles.playHint}>PLAY</Text>
                  </Pressable>
                ) : kind ? (
                  currentLevel >= lvl ? (
                    <Pressable onPress={() => setRecall(kind)} style={({ pressed }) => [styles.milestoneCol, pressed && styles.nodePressed]}>
                      <View style={[styles.node, styles.nodeMilestone, shadow.button]}>
                        <MiniVial {...MECHANIC_COPY[kind].steps[0].art} width={MILESTONE_VIAL_W} />
                      </View>
                      <Text style={styles.milestoneLabel}>{MECHANIC_COPY[kind].title}</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.milestoneCol}>
                      <View style={[styles.node, styles.nodeMilestone, shadow.button]}>
                        <View style={styles.silhouette}>
                          <MiniVial {...MECHANIC_COPY[kind].steps[0].art} width={MILESTONE_VIAL_W} />
                        </View>
                      </View>
                      <Text style={styles.milestoneLabel}>Lv {lvl}</Text>
                    </View>
                  )
                ) : lvl === teaseLevel ? (
                  <View style={[styles.node, styles.nodeLocked]}>
                    <Text style={styles.teaseText}>???</Text>
                  </View>
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
            );
          })}
        </ScrollView>
      </SafeAreaView>
      <HomeTabBar active="journey" />
      {recall && <UnlockInterstitial kind={recall} recall onDone={() => setRecall(null)} />}
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
    paddingBottom: 60,
  },
  step: {
    height: SLOT_H,
    alignItems: 'center',
    justifyContent: 'center',
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
    transform: [{ scale: timing.pressScale }],
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
  nodeMilestone: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: color.gold,
    borderWidth: 3,
    borderColor: color.goldRimBottom,
  },
  milestoneCol: {
    alignItems: 'center',
  },
  milestoneLabel: {
    color: color.goldText,
    fontFamily: font.bold,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    ...labelShadow,
  },
  silhouette: {
    opacity: 0.35,
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
  teaseText: {
    color: color.textDim,
    fontFamily: font.bold,
    fontSize: 15,
    letterSpacing: 1,
  },
});
