import { Canvas, Group, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Color } from '@/engine/types';
import { MechanicKind } from '@/engine/progression';
import { GameButton } from '@/components/ui/GameButton';
import { GameModal } from '@/components/ui/GameModal';
import { button, color, font } from '@/theme';
import {
  bodyTop,
  cylinderGradient,
  HEIGHT_RATIO,
  MYSTERY_GRADIENT,
  segmentGeometry,
  VEIL_GRADIENT,
  vialPaths,
} from './vial';
import { VialCap, VialInside, VialNeck, VialShine } from './VialGlass';

const MINI_W = 40;

interface MiniVialProps {
  segments?: Color[];
  veiled?: boolean;
  corked?: boolean;
  /** mystery: this many bottom segments render as "?" */
  mysteryBelow?: number;
  /** wax-seal count shown on the bottle */
  seal?: number;
}

/** A static, pixel-consistent thumbnail of a game vial for the explainer steps. */
function MiniVial({ segments = [], veiled, corked, mysteryBelow = 0, seal }: MiniVialProps) {
  const w = MINI_W;
  const h = w * HEIGHT_RATIO;
  const { interior } = vialPaths(w, h);
  const { fillBottom, segH } = segmentGeometry(w, h, 4);
  return (
    <View style={{ width: w, height: h }}>
      <Canvas style={{ width: w, height: h }}>
        <VialInside w={w} h={h} />
        <Group clip={interior}>
          {segments.map((c, i) => (
            <Rect key={i} x={0} y={fillBottom - (i + 1) * segH} width={w} height={segH + 1}>
              <LinearGradient
                start={vec(2, 0)}
                end={vec(w - 2, 0)}
                {...(i < mysteryBelow ? MYSTERY_GRADIENT : cylinderGradient(c))}
              />
            </Rect>
          ))}
        </Group>
        {veiled && (
          <Group clip={interior}>
            <Rect x={0} y={0} width={w} height={h}>
              <LinearGradient start={vec(0, bodyTop(w))} end={vec(0, h)} {...VEIL_GRADIENT} />
            </Rect>
          </Group>
        )}
        <VialShine w={w} h={h} />
        <VialNeck w={w} />
        {corked && <VialCap w={w} />}
      </Canvas>
      {veiled && <Text style={[styles.mark, { top: h * 0.38, fontSize: w * 0.42 }]}>?</Text>}
      {Array.from({ length: mysteryBelow }, (_, i) => (
        <Text
          key={i}
          style={[styles.qs, { top: fillBottom - (i + 1) * segH + segH / 2 - 8 }]}
        >
          ?
        </Text>
      ))}
      {seal !== undefined && seal > 0 && (
        <View style={[styles.seal, { top: h * 0.42 }]}>
          <Text style={styles.sealText}>{seal}</Text>
        </View>
      )}
    </View>
  );
}

interface Step {
  art: MiniVialProps;
  text: string;
}

const COPY: Record<MechanicKind, { title: string; steps: Step[] }> = {
  veiled: {
    title: 'Veiled Bottles',
    steps: [
      { art: { segments: ['gold', 'teal', 'ruby'], veiled: true }, text: 'A veil hides these potions — nothing pours in or out.' },
      { art: { segments: ['ruby', 'ruby', 'ruby', 'ruby'], corked: true }, text: 'Complete any bottle to cork it…' },
      { art: { segments: ['gold', 'teal', 'ruby'] }, text: '…and a veil lifts! Corks are the key.' },
    ],
  },
  mystery: {
    title: 'Mystery Potions',
    steps: [
      { art: { segments: ['ruby', 'gold', 'teal', 'emerald'], mysteryBelow: 3 }, text: 'Only the top potion is known — the rest are a mystery.' },
      { art: { segments: ['ruby', 'gold'], mysteryBelow: 1 }, text: 'Pour the top away to reveal what hides below.' },
    ],
  },
  chained: {
    title: 'Sealed Bottles',
    steps: [
      { art: { segments: ['teal', 'violet', 'gold'], seal: 3 }, text: 'A wax seal locks this bottle shut.' },
      { art: { segments: ['teal', 'violet', 'gold'], seal: 1 }, text: 'Every pour you make weakens the seal…' },
      { art: { segments: ['teal', 'violet', 'gold'] }, text: '…at zero it pops open. Plan your pours!' },
    ],
  },
};

interface UnlockInterstitialProps {
  kind: MechanicKind;
  /** latches seenUnlocks — fired on Got it, X, or backdrop */
  onDone: () => void;
}

/** One-time celebratory explainer shown the first time a mechanic's level loads. */
export function UnlockInterstitial({ kind, onDone }: UnlockInterstitialProps) {
  const [step, setStep] = useState(0);
  const { title, steps } = COPY[kind];
  const last = step === steps.length - 1;
  return (
    <GameModal visible title={`New: ${title}!`} onClose={onDone}>
      <View style={styles.card}>
        <MiniVial {...steps[step].art} />
        <Text style={styles.text}>{steps[step].text}</Text>
      </View>
      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>
      <GameButton
        label={last ? 'Got it!' : 'Next'}
        variant="green"
        onPress={() => (last ? onDone() : setStep(step + 1))}
      />
    </GameModal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.cream,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: color.creamEdge,
    padding: 14,
    alignItems: 'center',
    gap: 10,
    minHeight: 190,
    justifyContent: 'center',
  },
  text: {
    fontFamily: font.body,
    fontSize: 14,
    color: color.brownText,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,239,217,0.3)',
  },
  dotActive: {
    backgroundColor: color.gold,
  },
  mark: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,227,166,0.75)',
    fontFamily: font.display,
  },
  qs: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '900',
    fontSize: 12,
  },
  seal: {
    position: 'absolute',
    alignSelf: 'center',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: button.red.rim,
    borderWidth: 1.5,
    borderColor: '#C07F1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: {
    color: '#FFE3A6',
    fontFamily: font.bold,
    fontSize: 11,
  },
});
