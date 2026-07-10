import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ACH, reportAchievement } from '@/gamecenter';
import { useGameStore } from '@/state/gameStore';
import { hapticError, hapticSuccess, playSfx } from '@/sound';
import { celebration } from '@/theme';
import { bottleLayouts } from './bottleLayout';
import { Celebration } from './effects/Celebration';

/** Sound, haptics, and particle effects driven by store signals. */
export function EffectsLayer() {
  const invalidTapToken = useGameStore((s) => s.invalidTapToken);
  const completionToken = useGameStore((s) => s.completionToken);
  const completedBottleId = useGameStore((s) => s.completedBottleId);
  const [celebrate, setCelebrate] = useState<{ token: number; x: number; y: number; w: number; h: number } | null>(
    null,
  );
  const firedToken = useRef(0);

  useEffect(() => {
    if (invalidTapToken === 0) return;
    playSfx('error');
    hapticError();
  }, [invalidTapToken]);

  // completion effects fire once; the token bumps at top-off (mid-pour), while the
  // source vial is still returning to its seat — the celebration lands on the target
  // ponytail: two corks topping off in the same React batch render one celebration
  useEffect(() => {
    if (completionToken === 0 || completionToken === firedToken.current) return;
    firedToken.current = completionToken;
    playSfx('complete');
    hapticSuccess();
    reportAchievement(ACH.firstCork); // GameKit ignores re-reports once earned
    const layout = completedBottleId ? bottleLayouts.get(completedBottleId) : undefined;
    if (!layout) return;
    setCelebrate({ token: completionToken, x: layout.x + layout.w / 2, y: layout.y, w: layout.w, h: layout.h });
    const clear = setTimeout(() => setCelebrate(null), celebration.totalMs);
    return () => clearTimeout(clear);
  }, [completionToken, completedBottleId]);

  if (!celebrate) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Celebration key={celebrate.token} x={celebrate.x} y={celebrate.y} w={celebrate.w} h={celebrate.h} />
    </View>
  );
}
