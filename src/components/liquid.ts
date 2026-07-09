import type { SharedValue } from 'react-native-reanimated';

/** Liquid-slosh physics — pure math, no React/Skia imports (jest-tested).
 *
 *  Model: one state per bottle, theta = world-frame surface tilt in radians
 *  (0 = level, + = right edge lower). Board bottles run it as a Reanimated
 *  spring (withSpring IS the damped harmonic oscillator — self-terminating,
 *  zero idle cost); only the flying bottle in PourOverlay integrates it per
 *  frame, because there the spring target (-tilt) moves continuously.
 */

/** kill switch: false → flat surfaces + the old rigid counter-rotation */
export const SLOSH_ENABLED = true;

/** board-bottle slosh: heavy fluid (ζ≈0.67, ~0.7s damped period) — one soft swing */
export const SLOSH_SPRING = { mass: 1, stiffness: 80, damping: 12 } as const;

/** spring-velocity kicks (rad/s) — amplitude ≈ kick/ω, so these pair with the springs */
export const KICK_SELECT = 1.0;
export const KICK_DESELECT = -0.7;
export const KICK_SHAKE = 2.2;
/** the returning bottle sloshes from its own deceleration; the receiving one
 *  gets half — a central vertical stream impact splashes more than it tilts */
export const KICK_LAND = 0.7;

/** flight integrator: ζ≈0.78 — the surface lags the tilting glass smoothly, no jitter */
export const K_FLY = 60;
export const C_FLY = 12;

/** motion coupling: the flying liquid leans opposite the bottle's horizontal
 *  velocity (inertia), like a pendulum in an accelerating frame */
export const SWAY_GAIN = 0.0005; // rad per pt/s of horizontal velocity
export const SWAY_CLAMP = 0.35; // max lean from motion (~20°)

/** surfaces never tilt past this (draw-time clamp keeps the spring linear) */
export const THETA_CLAMP = 0.22;

/**
 * One semi-implicit Euler step of the flight slosh: mu (liquid rotation in the
 * glass's local frame) chases -tilt so the liquid stays roughly world-level,
 * lagging and overshooting like real fluid. Returns [mu, vel].
 */
export function stepSlosh(mu: number, vel: number, tilt: number, dt: number): [number, number] {
  'worklet';
  const a = -K_FLY * (mu + tilt) - C_FLY * vel;
  const v = vel + a * dt;
  return [mu + v * dt, v];
}

export interface SurfaceEdge {
  yL: number;
  yR: number;
  /** control-point y for the quad curve: midpoint + static meniscus sag */
  cpy: number;
}

/**
 * Tilted-surface geometry for a bottle of width w whose nominal (level)
 * surface sits at ySurf. Small-angle: edge offset = (w/2)·theta.
 * ponytail: static meniscus bow; add a bulge spring if lift still reads rigid.
 */
export function surfaceEdge(w: number, ySurf: number, theta: number): SurfaceEdge {
  'worklet';
  const th = Math.min(THETA_CLAMP, Math.max(-THETA_CLAMP, theta));
  const yL = ySurf + (w / 2) * th;
  const yR = ySurf - (w / 2) * th;
  return { yL, yR, cpy: (yL + yR) / 2 + w * 0.05 };
}

/** board bottles' surface-tilt shared values, keyed by bottle id — the pour
 *  overlay kicks these on landing so bottles reappear already sloshing */
export const liquidThetas = new Map<string, SharedValue<number>>();
