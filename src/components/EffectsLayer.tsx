import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useGameStore } from '@/state/gameStore';
import { hapticError, hapticSuccess, playSfx } from '@/sound';
import { bottleLayouts } from './bottleLayout';
import { SparkleBurst } from './effects/SparkleBurst';

/** Sound, haptics, and particle effects driven by store signals. */
export function EffectsLayer() {
  const invalidTapToken = useGameStore((s) => s.invalidTapToken);
  const completionToken = useGameStore((s) => s.completionToken);
  const completedBottleId = useGameStore((s) => s.completedBottleId);
  const pouring = useGameStore((s) => s.pouring);
  const status = useGameStore((s) => s.status);
  const [burst, setBurst] = useState<{ token: number; x: number; y: number } | null>(null);
  const firedToken = useRef(0);

  useEffect(() => {
    if (invalidTapToken === 0) return;
    playSfx('error');
    hapticError();
  }, [invalidTapToken]);

  // completion effects fire once, when the pour animation for the completing move ends
  useEffect(() => {
    if (pouring !== null || completionToken === 0 || completionToken === firedToken.current) return;
    firedToken.current = completionToken;
    playSfx('complete');
    hapticSuccess();
    const layout = completedBottleId ? bottleLayouts.get(completedBottleId) : undefined;
    if (!layout) return;
    setBurst({ token: completionToken, x: layout.x + layout.w / 2, y: layout.y });
    const clear = setTimeout(() => setBurst(null), 800);
    return () => clearTimeout(clear);
  }, [pouring, completionToken, completedBottleId]);

  useEffect(() => {
    if (status === 'won') playSfx('win');
  }, [status]);

  if (!burst) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <SparkleBurst key={burst.token} x={burst.x} y={burst.y} />
    </View>
  );
}
