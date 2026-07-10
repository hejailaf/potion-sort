import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { hapticLight } from '@/sound';
import { coinChunks, useMetaStore } from '@/state/metaStore';
import { timing } from '@/theme';
import { coinIconPulse, measureCoinIcon } from '../hud/CoinCounter';
import { SparkleBurst } from './SparkleBurst';

const COIN_COUNT = 8;
const COIN_SIZE = 24; // translate offsets by half of this so the coin CENTER hits the target
const STAGGER_MS = 60; // gap between successive arrivals — the haptic "strum"
// every coin flies the same span; last coin launches at 7·STAGGER and lands exactly at coinFlyMs
const TRAVEL_MS = timing.coinFlyMs - STAGGER_MS * (COIN_COUNT - 1);
// hold after the last landing (at coinFlyMs) so its splash reads — total ≤ 1.2× coinFlyMs.
// The icon pulse lives on the module-level coinIconPulse (owned by CoinCounter), so it
// finishes on its own after teardown; only the splash needs this window.
const TAIL_MS = 180;

interface CoinFlyProps {
  onDone: () => void;
}

/** Coins scatter from screen center and fly into the coin counter icon, ticking the counter up. */
export function CoinFly({ onDone }: CoinFlyProps) {
  const { width, height } = useWindowDimensions();
  const deliverCoins = useMetaStore((s) => s.deliverCoins);
  const reward = useRef(useMetaStore.getState().pendingCoinReward ?? 0).current;
  const chunks = useMemo(() => coinChunks(reward, COIN_COUNT), [reward]);
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const [splashes, setSplashes] = useState<number[]>([]);
  const tailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<View>(null);

  // Measure the icon at USE time — but temporally: CoinFly mounts mid route-transition,
  // while this screen is still INACTIVE under react-native-screens. SafeAreaView's top
  // inset is 0 then, so the pill genuinely LAYS OUT one inset higher and only reflows down
  // when the screen re-attaches. Frame-to-frame stability is NOT enough — the frozen
  // wrong layout is just as stable as the settled one — so the stability window must
  // OUTLAST the route transition: lock the target only after the same icon y (±0.5pt)
  // has held for STABLE_POLLS consecutive valid polls (~333ms > screenFadeMs + attach).
  // Mid-transition the frozen y holds ~11 polls, the reflow resets the run, the settled y
  // then holds the full window; on an already-active screen (e.g. shop purchase) the true
  // y holds from the start — an imperceptible ~333ms pre-launch either way. Deliberately
  // NOT tied to a navigation event: CoinFly also mounts on already-active screens where
  // transitionEnd never fires. Target stays relative (icon − containerOrigin) as free
  // belt-and-braces against coordinate-space offsets. If nothing settles within the poll
  // cap (~1.5s) or measurement keeps failing, deliver instantly instead of flying to a
  // fake spot (onDone = clearCoinCelebration → counter shows the full total).
  useEffect(() => {
    const STABLE_POLLS = 20;
    const MAX_POLLS = 90;
    let alive = true;
    let raf = 0;
    let polls = 0;
    let anchorY: number | null = null;
    let stable = 0;
    const tick = () => {
      const node = containerRef.current;
      if (!node) {
        onDone();
        return;
      }
      node.measureInWindow((cx, cy, cw, ch) => {
        if (!alive) return;
        measureCoinIcon().then((icon) => {
          if (!alive) return;
          if (icon && cw > 0 && ch > 0) {
            if (anchorY !== null && Math.abs(icon.y - anchorY) <= 0.5) {
              stable += 1;
              if (stable >= STABLE_POLLS) {
                setTarget({ x: icon.x - cx, y: icon.y - cy });
                return;
              }
            } else {
              anchorY = icon.y;
              stable = 1;
            }
          } else {
            anchorY = null;
            stable = 0;
          }
          polls += 1;
          if (polls >= MAX_POLLS) {
            onDone();
            return;
          }
          raf = requestAnimationFrame(tick);
        });
      });
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (tailTimer.current) clearTimeout(tailTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onArrive = (i: number) => {
    hapticLight();
    deliverCoins(chunks[i]);
    coinIconPulse.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 160 }));
    setSplashes((s) => [...s, i]);
    // final coin: let the strum + splash play, then clear the celebration (unmounts the fly)
    if (i === COIN_COUNT - 1) tailTimer.current = setTimeout(onDone, TAIL_MS);
  };

  const coins = useMemo(
    () =>
      Array.from({ length: COIN_COUNT }, (_, i) => ({
        startX: width / 2 + (Math.random() - 0.5) * 140,
        startY: height / 2 + (Math.random() - 0.5) * 120,
        launchDelay: i * STAGGER_MS,
      })),
    [width, height],
  );

  // the container renders even before the target resolves — it must be mounted to measure
  return (
    <View ref={containerRef} style={StyleSheet.absoluteFill} pointerEvents="none">
      {target &&
        coins.map((c, i) => (
          <Coin key={i} {...c} targetX={target.x} targetY={target.y} onArrive={() => onArrive(i)} />
        ))}
      {target &&
        splashes.map((id) => <SparkleBurst key={id} x={target.x} y={target.y} scale={0.55} />)}
    </View>
  );
}

interface CoinProps {
  startX: number;
  startY: number;
  launchDelay: number;
  targetX: number;
  targetY: number;
  onArrive: () => void;
}

function Coin({ startX, startY, launchDelay, targetX, targetY, onArrive }: CoinProps) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      launchDelay,
      withTiming(1, { duration: TRAVEL_MS, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onArrive)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 1 ? 1 : 0,
    transform: [
      { translateX: startX + (targetX - startX) * p.value - COIN_SIZE / 2 },
      { translateY: startY + (targetY - startY) * p.value - COIN_SIZE / 2 },
      { scale: 1 - 0.4 * p.value },
    ],
  }));
  return <Animated.View style={[styles.coin, style]} />;
}

const styles = StyleSheet.create({
  coin: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    backgroundColor: '#F5B841',
    borderWidth: 3,
    borderColor: '#C07F1C',
  },
});
