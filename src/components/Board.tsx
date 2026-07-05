import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useGameStore } from '@/state/gameStore';
import { Bottle } from './Bottle';

export function Board() {
  const bottles = useGameStore((s) => s.bottles);
  const prevBottles = useGameStore((s) => s.prevBottles);
  const pouring = useGameStore((s) => s.pouring);
  const selectedId = useGameStore((s) => s.selectedId);
  const invalidTapToken = useGameStore((s) => s.invalidTapToken);
  const invalidBottleId = useGameStore((s) => s.invalidBottleId);
  const tapBottle = useGameStore((s) => s.tapBottle);
  const { width: screenWidth } = useWindowDimensions();

  // while a pour animates, the board shows the pre-pour state; the overlay adds the motion
  const displayBottles = pouring && prevBottles ? prevBottles : bottles;

  const half = Math.ceil(displayBottles.length / 2);
  const rows =
    displayBottles.length <= 6
      ? [displayBottles]
      : [displayBottles.slice(0, half), displayBottles.slice(half)];
  const perRow = Math.max(...rows.map((r) => r.length));
  const bottleWidth = Math.min(56, Math.floor((screenWidth - 32 - (perRow - 1) * 10) / perRow));

  return (
    <View style={styles.board}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((bottle) => (
            <Bottle
              key={bottle.id}
              bottle={bottle}
              width={bottleWidth}
              selected={bottle.id === selectedId}
              hidden={pouring?.from === bottle.id}
              shakeToken={bottle.id === invalidBottleId ? invalidTapToken : 0}
              onTap={tapBottle}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    justifyContent: 'center',
    gap: 36,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
});
