import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SparkleBurst } from './SparkleBurst';

/** Staggered sparkle bursts across the upper screen for the win sequence. */
export function Fireworks() {
  const { width, height } = useWindowDimensions();
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    const timers = Array.from({ length: 6 }, (_, i) =>
      setTimeout(() => {
        setBursts((b) => [
          ...b,
          { id: i, x: 40 + Math.random() * (width - 80), y: 80 + Math.random() * (height * 0.45) },
        ]);
      }, i * 280),
    );
    return () => timers.forEach(clearTimeout);
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bursts.map((b) => (
        <SparkleBurst key={b.id} x={b.x} y={b.y} />
      ))}
    </View>
  );
}
