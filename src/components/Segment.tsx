import { StyleSheet, Text, View } from 'react-native';
import { Color, COLOR_HEX, COLOR_SYMBOL } from '@/engine/types';
import { useMetaStore } from '@/state/metaStore';

interface SegmentProps {
  color: Color;
  height: number;
}

/** One liquid segment; shows the color's symbol when color-blind mode is on. */
export function Segment({ color, height }: SegmentProps) {
  const symbols = useMetaStore((s) => s.colorBlindSymbols);
  return (
    <View style={[styles.segment, { height, backgroundColor: COLOR_HEX[color] }]}>
      {symbols && (
        <Text style={[styles.symbol, { fontSize: Math.min(14, height * 0.45) }]}>
          {COLOR_SYMBOL[color]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    color: 'rgba(0,0,0,0.55)',
    fontWeight: '900',
  },
});
