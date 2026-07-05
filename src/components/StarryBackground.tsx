import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { mulberry32 } from '@/engine/generator';

const STAR_COUNT = 40;

export function StarryBackground() {
  const stars = useMemo(() => {
    const rng = mulberry32(7);
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      key: i,
      left: `${rng() * 100}%` as const,
      top: `${rng() * 100}%` as const,
      size: 1 + rng() * 2,
      opacity: 0.25 + rng() * 0.6,
    }));
  }, []);

  return (
    <View style={styles.sky} pointerEvents="none">
      {stars.map((s) => (
        <View
          key={s.key}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: '#fff',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0E1030',
  },
});
