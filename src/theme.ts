/** Design tokens for the game chrome — "a folded piece of the night sky given a gold trim".
 *  Panels tune the reference's grape-purple toward our indigo; gold stays gold. */

export const color = {
  // panels
  panel: '#241B4E',
  panelDeep: '#1B1440',
  panelLight: '#332762',
  panelBorder: 'rgba(168,140,255,0.18)',
  // gold
  goldRimTop: '#FFE9A8',
  goldRimBottom: '#C9A227',
  gold: '#F2D43D',
  goldText: '#FFE9A8',
  // cream inset (modal illustration card)
  cream: '#FBF3DD',
  creamEdge: '#E9D9AE',
  brownText: '#5B3D22',
  // text
  text: '#E8E6FF',
  textDim: 'rgba(232,230,255,0.7)',
  textLocked: 'rgba(232,230,255,0.4)',
  // overlays
  dim: 'rgba(5,6,26,0.72)',
} as const;

export type ButtonVariant = 'green' | 'red' | 'violet';

/** fill = body, top = highlight band, rim = border + 3D bottom edge */
export const button: Record<ButtonVariant, { fill: string; top: string; rim: string }> = {
  green: { fill: '#4FB93F', top: '#7CE06C', rim: '#2A7A21' },
  red: { fill: '#E5533F', top: '#FF7A6B', rim: '#A32516' },
  violet: { fill: '#8A4AE6', top: '#A879F5', rim: '#5E2FA8' },
};

export const radius = {
  pill: 999,
  panel: 28,
  card: 18,
  chip: 16,
  small: 12,
} as const;

export const font = {
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
} as const;

export const shadow = {
  chip: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  panel: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
} as const;

/** heavy white label look on chunky buttons */
export const labelShadow = {
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1.5 },
  textShadowRadius: 2,
} as const;
