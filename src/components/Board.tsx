import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useGameStore } from '@/state/gameStore';
import { timing } from '@/theme';
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
  // bumped on every deal (loadLevel: new level / restart / quit) — keys the deal-in
  // wrapper so the entrance replays on a fresh board but not on in-play re-renders
  const startedAt = useGameStore((s) => s.startedAt);
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
          {row.map((bottle, i) => {
            // a target stays frozen at the earliest still-filling pour's baseline while
            // the overlay animates the growth on top; once every pour into it has topped
            // off, show the live (possibly corked) bottle so the cork/celebration appear
            // while the source vial is still returning. The switch races the covered-rect
            // opacity props (224188b family) — masked by the overlay's fill, which
            // overlaps one full segment below the poured liquid. The source gets the mirror
            // treatment: frozen at srcBefore and held lifted until the overlay's clone is on
            // screen, only then hidden — closing the wrong-color repaint flash and the
            // no-bottle gap at the hand-off. Landing hand-off is the reverse: the live bottle
            // unhides UNDER the parked clone (identical pixels mask the contents-swap prop
            // races), and the clone is dropped 2 frames later.
            const filling = activePours.filter((p) => p.move.to === bottle.id && !p.toppedOff);
            const pouringFrom = activePours.find((p) => p.move.from === bottle.id);
            // continuous stagger index across both rows
            const index = r === 0 ? i : rows[0].length + i;
            return (
              // layout-neutral wrapper: keying on startedAt remounts (replays the deal-in)
              // only on a fresh board, never on pour/select re-renders. Bottle keeps its own
              // ref for measureBottle — an outer transform settles to identity, no stale frame.
              <Animated.View
                key={`${startedAt}-${bottle.id}`}
                entering={FadeInDown.duration(timing.dealInMs)
                  .delay(index * timing.dealStaggerMs)
                  .withInitialValues({ transform: [{ translateY: 14 }] })}
              >
                <Bottle
                  bottle={filling.length > 0 ? filling[0].tgtBefore : pouringFrom && !pouringFrom.landed ? pouringFrom.srcBefore : bottle}
                  width={bottleWidth}
                  selected={bottle.id === selectedId || (!!pouringFrom && !pouringFrom.cloneReady)}
                  hidden={!!pouringFrom && pouringFrom.cloneReady && !pouringFrom.landed}
                  shakeToken={bottle.id === invalidBottleId ? invalidTapToken : 0}
                  hinted={bottle.id === hint?.from || bottle.id === hint?.to}
                  hiddenCount={hiddenCounts[bottle.id] ?? 0}
                  onTap={tapBottle}
                />
              </Animated.View>
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
