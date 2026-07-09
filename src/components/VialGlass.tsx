import { Group, LinearGradient, Oval, Path, RadialGradient, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import { bodyTop, capH, CAP_STROKE, GLASS_STROKE, neckH, roundedRect, vialPaths } from './vial';

/** The glass body: dark navy fill, inner edge shading, faint inner glow.
 *  Draw liquid between <VialInside> and <VialShine> so reflections sit on top. */
export function VialInside({ w, h }: { w: number; h: number }) {
  const s = w / 58;
  const { glass, interior } = vialPaths(w, h);
  const y0 = bodyTop(w);
  return (
    <Group>
      <Path path={glass}>
        <LinearGradient
          start={vec(0, y0)}
          end={vec(0, h)}
          colors={['rgba(28,26,66,0.6)', 'rgba(12,10,36,0.72)']}
        />
      </Path>
      <Group clip={interior}>
        {/* cylindrical glass shading: cool light on the left, deep shadow on the right */}
        <Rect x={3 * s} y={y0} width={12 * s} height={h - y0}>
          <LinearGradient
            start={vec(3 * s, 0)}
            end={vec(15 * s, 0)}
            colors={['rgba(120,150,255,0.10)', 'rgba(120,150,255,0)']}
          />
        </Rect>
        <Rect x={w - 15 * s} y={y0} width={12 * s} height={h - y0}>
          <LinearGradient
            start={vec(w - 15 * s, 0)}
            end={vec(w - 3 * s, 0)}
            colors={['rgba(0,0,12,0)', 'rgba(0,0,12,0.45)']}
          />
        </Rect>
      </Group>
      <Path path={interior} style="stroke" strokeWidth={3} color="rgba(110,140,255,0.14)" />
    </Group>
  );
}

/** Specular streaks + top dome highlight + the crisp glass outline. */
export function VialShine({ w, h }: { w: number; h: number }) {
  const s = w / 58;
  const { glass } = vialPaths(w, h);
  const y0 = bodyTop(w);
  const bodyH = h - y0;
  return (
    <Group>
      {/* tall gloss streak, left */}
      <RoundedRect x={6 * s} y={y0 + 12 * s} width={7 * s} height={bodyH * 0.68} r={4 * s}>
        <LinearGradient
          start={vec(0, y0 + 12 * s)}
          end={vec(0, y0 + 12 * s + bodyH * 0.68)}
          colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.04)']}
        />
      </RoundedRect>
      {/* thin streak, right */}
      <RoundedRect x={w - 10 * s} y={y0 + 20 * s} width={3 * s} height={bodyH * 0.42} r={2 * s}>
        <LinearGradient
          start={vec(0, y0 + 20 * s)}
          end={vec(0, y0 + 20 * s + bodyH * 0.42)}
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.02)']}
        />
      </RoundedRect>
      {/* soft dome highlight across the shoulder */}
      <Oval x={w * 0.08} y={y0 + 2 * s} width={w * 0.84} height={18 * s}>
        <RadialGradient
          c={vec(w / 2, y0 + 11 * s)}
          r={w * 0.42}
          colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0)']}
        />
      </Oval>
      <Path path={glass} style="stroke" strokeWidth={2} color={GLASS_STROKE} />
    </Group>
  );
}

/** The glass neck: part of the bottle itself — drawn even when uncorked/flying. */
export function VialNeck({ w }: { w: number }) {
  const s = w / 58;
  const cH = capH(w);
  const nH = neckH(w);
  const nx = (w - 18 * s) / 2;
  // mouth lip: a wider glass flange crowning the neck (cap 26 > lip 22 > neck 18);
  // it frames the opening when uncorked and the cap rests on it when corked
  const lipW = 22 * s;
  const lx = (w - lipW) / 2;
  return (
    <Group>
      <Rect x={nx} y={cH} width={18 * s} height={nH}>
        <LinearGradient
          start={vec(nx, 0)}
          end={vec(nx + 18 * s, 0)}
          colors={[
            'rgba(150,170,230,0.45)',
            'rgba(25,25,60,0.35)',
            'rgba(130,160,235,0.22)',
            'rgba(18,18,48,0.4)',
            'rgba(150,170,230,0.45)',
          ]}
          positions={[0, 0.22, 0.48, 0.78, 1]}
        />
      </Rect>
      <Rect x={nx} y={cH} width={1.5 * s} height={nH} color={CAP_STROKE} />
      <Rect x={nx + 18 * s - 1.5 * s} y={cH} width={1.5 * s} height={nH} color={CAP_STROKE} />
      <RoundedRect x={lx} y={cH} width={lipW} height={3 * s} r={1.5 * s}>
        <LinearGradient
          start={vec(lx, 0)}
          end={vec(lx + lipW, 0)}
          colors={[
            'rgba(190,205,250,0.75)',
            'rgba(70,80,140,0.55)',
            'rgba(170,190,245,0.5)',
            'rgba(60,68,125,0.6)',
            'rgba(190,205,250,0.75)',
          ]}
          positions={[0, 0.22, 0.48, 0.78, 1]}
        />
      </RoundedRect>
      <RoundedRect
        x={lx}
        y={cH}
        width={lipW}
        height={3 * s}
        r={1.5 * s}
        style="stroke"
        strokeWidth={1}
        color={CAP_STROKE}
      />
      <Rect x={lx + 2 * s} y={cH + 0.7 * s} width={lipW - 4 * s} height={s} color="rgba(255,255,255,0.3)" />
    </Group>
  );
}

/** The blue-glass stopper cap. Hidden while a bottle is uncorked (pouring or receiving). */
export function VialCap({ w }: { w: number }) {
  const s = w / 58;
  const cH = capH(w);
  const cap = roundedRect((w - 26 * s) / 2, 0, 26 * s, cH, 4 * s, 2 * s);
  return (
    <Group>
      <Path path={cap}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, cH)}
          colors={['#4A5C96', '#242E58', '#10152E']}
          positions={[0, 0.45, 1]}
        />
      </Path>
      <Path path={cap} style="stroke" strokeWidth={1} color={CAP_STROKE} />
      <Rect
        x={(w - 26 * s) / 2 + 2 * s}
        y={1}
        width={22 * s}
        height={1.5 * s}
        color="rgba(255,255,255,0.35)"
      />
    </Group>
  );
}
