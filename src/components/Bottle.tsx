import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { isBottleComplete } from '@/engine/rules';
import { Bottle as BottleData, BOTTLE_CAPACITY } from '@/engine/types';
import { bottleLayouts } from './bottleLayout';
import { Segment } from './Segment';

interface BottleProps {
  bottle: BottleData;
  width: number;
  selected: boolean;
  /** the pour overlay renders a flying clone instead of this bottle */
  hidden: boolean;
  /** changes whenever this bottle rejects a pour — triggers the shake */
  shakeToken: number;
  onTap: (id: string) => void;
}

export function Bottle({ bottle, width, selected, hidden, shakeToken, onTap }: BottleProps) {
  const height = width * 2.6;
  const ref = useRef<View>(null);
  const lift = useSharedValue(0);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    lift.value = withSpring(selected ? -height * 0.12 : 0, { damping: 14, stiffness: 220 });
  }, [selected, height, lift]);

  useEffect(() => {
    if (shakeToken === 0) return;
    shakeX.value = withSequence(
      withTiming(-6, { duration: 40 }),
      withTiming(6, { duration: 40 }),
      withTiming(-4, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
  }, [shakeToken, shakeX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { translateX: shakeX.value }],
  }));

  return (
    <Pressable
      ref={ref}
      onPress={() => onTap(bottle.id)}
      hitSlop={6}
      onLayout={() => {
        // window coords, measured unlifted at layout time (transforms don't relayout)
        ref.current?.measureInWindow((x, y, w, h) => {
          bottleLayouts.set(bottle.id, { x, y, w, h });
        });
      }}
      style={hidden ? styles.hidden : undefined}
    >
      <Animated.View style={animatedStyle}>
        {isBottleComplete(bottle) && <Cork width={width} />}
        <View style={[styles.glass, { width, height }]}>
          {bottle.segments.map((color, i) => (
            <Segment key={i} color={color} height={height / BOTTLE_CAPACITY} />
          ))}
        </View>
      </Animated.View>
    </Pressable>
  );
}

function Cork({ width }: { width: number }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 260 });
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        styles.cork,
        { width: width * 0.5, left: width * 0.25, height: width * 0.3, top: -width * 0.22 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  glass: {
    flexDirection: 'column-reverse', // segments[0] is the bottom of the bottle
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  hidden: {
    opacity: 0,
  },
  cork: {
    position: 'absolute',
    backgroundColor: '#C99A5B',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    zIndex: 1,
  },
});
