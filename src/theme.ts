/** Design tokens for the game chrome — v2 "Candlelit Alchemy":
 *  a warm alchemist's workshop of mahogany wood, parchment insets, and brass trim.
 *  Values lifted from the design system's tokens/v2.css (--v2-*). */

export const color = {
  // panels (mahogany wood chrome)
  panel: '#57301F',
  panelDeep: '#43241A',
  panelLight: '#6E4128',
  panelBorder: 'rgba(255,200,120,0.28)',
  // brass (was gold)
  goldRimTop: '#FFE3A6',
  goldRimBottom: '#C07F1C',
  gold: '#F5B841',
  goldText: '#FFE3A6',
  // parchment inset (modal illustration card)
  cream: '#FFF1D6',
  creamEdge: '#E0BE85',
  brownText: '#57351A',
  // text on dark chrome
  text: '#FFEFD9',
  textDim: 'rgba(255,239,217,0.65)',
  textLocked: 'rgba(255,239,217,0.40)',
  // dark translucent HUD pills
  pillDark: 'rgba(32,15,8,0.55)',
  // overlays
  dim: 'rgba(20,8,4,0.72)',
} as const;

export type ButtonVariant = 'green' | 'red' | 'violet' | 'brass';

/** fill = body, top = highlight band, rim = border + 3D bottom edge, text = label */
export const button: Record<ButtonVariant, { fill: string; top: string; rim: string; text: string }> = {
  green: { fill: '#56BE3E', top: '#93E26E', rim: '#2F7D22', text: '#FFFFFF' },
  red: { fill: '#E85742', top: '#FF9C82', rim: '#A03325', text: '#FFFFFF' },
  violet: { fill: '#9C5CE8', top: '#C9A2F6', rim: '#6C35AC', text: '#FFFFFF' },
  brass: { fill: '#F5B841', top: '#FFE3A6', rim: '#C07F1C', text: '#57351A' },
};

export const radius = {
  pill: 999,
  panel: 30,
  card: 20,
  chip: 16,
  small: 12,
} as const;

export const font = {
  medium: 'Baloo2_500Medium',
  semibold: 'Baloo2_600SemiBold',
  bold: 'Baloo2_700Bold',
  display: 'Baloo2_800ExtraBold',
  body: 'Nunito_700Bold',
} as const;

export const shadow = {
  chip: {
    shadowColor: '#190803',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    shadowColor: '#190803',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 7,
    elevation: 6,
  },
  panel: {
    shadowColor: '#0F0502',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 22,
    elevation: 16,
  },
} as const;

/** heavy white label look on chunky buttons */
export const labelShadow = {
  textShadowColor: 'rgba(25,8,3,0.35)',
  textShadowOffset: { width: 0, height: 1.5 },
  textShadowRadius: 2,
} as const;
