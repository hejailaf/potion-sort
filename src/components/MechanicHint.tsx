import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MechanicKind } from '@/engine/progression';
import { useGameStore } from '@/state/gameStore';
import { useMetaStore } from '@/state/metaStore';
import { timing } from '@/theme';
import { HintBanner } from './OnboardingHint';

const HINT_TEXT: Record<MechanicKind, string> = {
  veiled: 'Cork any bottle to lift a veil!',
  mystery: '“?” potions reveal themselves when they surface.',
  chained: 'Seals weaken with every pour you make.',
};

/** One-time contextual hint on the first level that actually features a mechanic. */
export function MechanicHint({ suppressed }: { suppressed: boolean }) {
  const level = useGameStore((s) => s.level);
  const mode = useGameStore((s) => s.mode);
  const seenHints = useMetaStore((s) => s.seenHints);
  const kind = mode === 'normal' ? level?.modifiers?.[0]?.type : undefined;
  const show = !!kind && !seenHints.includes(kind) && !suppressed;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show || !kind) return;
    setVisible(true);
    // latch only after the banner has had its full run — leaving early re-shows next time
    const t = setTimeout(() => {
      setVisible(false);
      useMetaStore.getState().markHintSeen(kind);
    }, timing.hintAutoDismiss);
    return () => clearTimeout(t);
  }, [show, kind]);

  if (!visible || !show || !kind) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <HintBanner text={HINT_TEXT[kind]} />
    </View>
  );
}
