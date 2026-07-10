import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useGameStore } from '@/state/gameStore';
import { Bottle } from './Bottle';

export function Board() {
  const bottles = useGameStore((s) => s.bottles);
  const activePours = useGameStore((s) => s.activePours);
  const selectedId = useGameStore((s) => s.selectedId);
  const invalidTapToken = useGameStore((s) => s.invalidTapToken);
  const invalidBottleId = useGameStore((s) => s.invalidBottleId);
  const hint = useGameStore((s) => s.hint);
  const hiddenCounts = useGameStore((s) => s.hiddenCounts);
  const tapBottle = useGameStore((s) => s.tapBottle);
  const { width: screenWidth } = useWindowDimensions();

  const half = Math.ceil(bottles.length / 2);
  const rows =
    bottles.length <= 6 ? [bottles] : [bottles.slice(0, half), bottles.slice(half)];
  const perRow = Math.max(...rows.map((r) => r.length));
  // cap keeps small boards from ballooning; 72 lets large screens (Pro Max) breathe
  const bottleWidth = Math.min(72, Math.floor((screenWidth - 32 - (perRow - 1) * 10) / perRow));

  return (
    <View style={styles.board}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((bottle) => {
            // a target stays frozen at the earliest still-filling pour's baseline while
            // the overlay animates the growth on top; once every pour into it has topped
            // off, show the live (possibly corked) bottle so the cork/celebration appear
            // while the source vial is still returning. Its source is hidden behind the clone.
            const filling = activePours.filter((p) => p.move.to === bottle.id && !p.toppedOff);
            return (
              <Bottle
                key={bottle.id}
                bottle={filling.length > 0 ? filling[0].tgtBefore : bottle}
                width={bottleWidth}
                selected={bottle.id === selectedId}
                hidden={activePours.some((p) => p.move.from === bottle.id)}
                shakeToken={bottle.id === invalidBottleId ? invalidTapToken : 0}
                hinted={bottle.id === hint?.from || bottle.id === hint?.to}
                hiddenCount={hiddenCounts[bottle.id] ?? 0}
                onTap={tapBottle}
              />
            );
          })}
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
