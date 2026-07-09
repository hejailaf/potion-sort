import { pooledPlanes, stepSlosh, surfaceEdge, THETA_CLAMP } from '../liquid';

/** run the integrator n steps at a fixed dt against a constant glass tilt */
function run(tilt: number, n: number, dt = 0.016, mu = 0, vel = 0): { mu: number; vel: number; trace: number[] } {
  const trace: number[] = [];
  for (let i = 0; i < n; i++) {
    [mu, vel] = stepSlosh(mu, vel, tilt, dt);
    trace.push(mu);
  }
  return { mu, vel, trace };
}

describe('stepSlosh (flight liquid integrator)', () => {
  it('converges to -tilt (liquid settles level in the world frame)', () => {
    const { mu, vel } = run(1.75, 120); // ~2s at 60fps
    expect(mu).toBeCloseTo(-1.75, 2);
    expect(Math.abs(vel)).toBeLessThan(0.01);
  });

  it('is underdamped: the world-frame surface overshoots level at least once', () => {
    const { trace } = run(1.75, 120);
    // world deviation = tilt + mu; starts positive (liquid lags), must cross zero
    const dev = trace.map((m) => 1.75 + m);
    const crossed = dev.some((d, i) => i > 0 && Math.sign(d) !== Math.sign(dev[0]) && Math.sign(dev[0]) !== 0);
    expect(crossed).toBe(true);
  });

  it('loses energy: successive |deviation| peaks strictly decrease', () => {
    const { trace } = run(1.75, 240);
    const dev = trace.map((m) => Math.abs(1.75 + m));
    const peaks: number[] = [];
    for (let i = 1; i < dev.length - 1; i++) {
      if (dev[i] > dev[i - 1] && dev[i] > dev[i + 1]) peaks.push(dev[i]);
    }
    expect(peaks.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < peaks.length; i++) expect(peaks[i]).toBeLessThan(peaks[i - 1]);
  });

  it('stays stable at the clamped max frame gap (dt=32ms) for 600 steps', () => {
    const { trace } = run(1.75, 600, 0.032);
    expect(trace.every((m) => Math.abs(m) < 3)).toBe(true);
    expect(trace[trace.length - 1]).toBeCloseTo(-1.75, 1);
  });
});

describe('pooledPlanes (tilted-bottle liquid layers)', () => {
  // ~72pt bottle: interior x 4..68, y 25..221, mouth (36, 13)
  const GEO = { x0: 4, y0: 25, x1: 68, y1: 221, mx: 36, my: 13 };
  const segH = (GEO.y1 - GEO.y0) / 4;
  const wIn = GEO.x1 - GEO.x0;
  const areas = [segH * wIn, segH * wIn];

  it('at rest (phi=0) stacks exact segment heights from the interior bottom', () => {
    const p = pooledPlanes(0, GEO, areas, segH * wIn);
    const vBottom = GEO.y1 - GEO.my;
    expect(p[0]).toBeCloseTo(vBottom - segH, 6);
    expect(p[1]).toBeCloseTo(vBottom - 2 * segH, 6);
    expect(p[2]).toBeCloseTo(vBottom - 3 * segH, 6);
  });

  it('planes stack strictly upward at any tilt', () => {
    for (const phi of [0.4, 1.2, 1.9, -1.2]) {
      const p = pooledPlanes(phi, GEO, areas, segH * wIn * 0.5);
      for (let i = 1; i < p.length; i++) expect(p[i]).toBeLessThan(p[i - 1]);
    }
  });

  it('pouring area raises the surface plane continuously', () => {
    const empty = pooledPlanes(1.5, GEO, areas, 0);
    const half = pooledPlanes(1.5, GEO, areas, segH * wIn * 0.5);
    const full = pooledPlanes(1.5, GEO, areas, segH * wIn);
    expect(empty[2]).toBeCloseTo(empty[1], 6); // drained: zero-height stripe
    expect(half[2]).toBeLessThan(empty[2]);
    expect(full[2]).toBeLessThan(half[2]);
  });
});

describe('surfaceEdge (tilted-surface geometry)', () => {
  it('preserves the mean level: yL + yR = 2·ySurf', () => {
    const { yL, yR } = surfaceEdge(72, 100, 0.2);
    expect(yL + yR).toBeCloseTo(200, 6);
  });

  it('sign convention: theta > 0 lowers the left edge (yL > yR)', () => {
    const { yL, yR } = surfaceEdge(72, 100, 0.2);
    expect(yL).toBeGreaterThan(yR);
  });

  it('clamps extreme tilts to ±THETA_CLAMP', () => {
    const wild = surfaceEdge(72, 100, 5);
    const clamped = surfaceEdge(72, 100, THETA_CLAMP);
    expect(wild).toEqual(clamped);
  });

  it('level surface still has the static meniscus sag', () => {
    const { yL, yR, cpy } = surfaceEdge(72, 100, 0);
    expect(yL).toBe(100);
    expect(yR).toBe(100);
    expect(cpy).toBeGreaterThan(100); // bows downward (screen y grows down)
  });
});
