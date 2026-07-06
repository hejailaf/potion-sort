import { Group, Oval, Path, RoundedRect } from '@shopify/react-native-skia';
import { GLASS_GLOW, GLASS_INSIDE, GLASS_RIM, LIP_H, vialPaths } from './vial';

/** The glass itself: dark interior, blue rim light, flanged lip, specular streak.
 *  Draw liquid between <VialInside> and <VialShine> so reflections sit on top. */
export function VialInside({ w, h }: { w: number; h: number }) {
  const { interior } = vialPaths(w, h);
  return <Path path={interior} color={GLASS_INSIDE} />;
}

export function VialShine({ w, h }: { w: number; h: number }) {
  const { glass } = vialPaths(w, h);
  const lipH = h * LIP_H;
  return (
    <Group>
      {/* soft outer glow + crisp rim light */}
      <Path path={glass} style="stroke" strokeWidth={4} color={GLASS_GLOW} />
      <Path path={glass} style="stroke" strokeWidth={1.6} color={GLASS_RIM} />
      {/* flanged lip */}
      <RoundedRect
        x={w / 2 - w * 0.28}
        y={0}
        width={w * 0.56}
        height={lipH * 1.6}
        r={lipH * 0.7}
        color="rgba(13,22,56,0.9)"
      />
      <RoundedRect
        x={w / 2 - w * 0.28}
        y={0}
        width={w * 0.56}
        height={lipH * 1.6}
        r={lipH * 0.7}
        style="stroke"
        strokeWidth={1.4}
        color={GLASS_RIM}
      />
      <Oval
        x={w / 2 - w * 0.17}
        y={lipH * 0.25}
        width={w * 0.34}
        height={lipH * 0.9}
        color="rgba(4,6,20,0.95)"
      />
      {/* specular streak down the left of the body */}
      <RoundedRect
        x={w * 0.12}
        y={h * 0.32}
        width={w * 0.075}
        height={h * 0.56}
        r={w * 0.04}
        color="rgba(255,255,255,0.13)"
      />
    </Group>
  );
}
