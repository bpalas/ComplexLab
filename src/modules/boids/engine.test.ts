import { describe, expect, it } from 'vitest';
import { BoidsEngine, DEFAULT_BOIDS } from './engine';

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 800;
const H = 600;

function run(eng: BoidsEngine, steps: number, p = DEFAULT_BOIDS): void {
  for (let s = 0; s < steps; s++) eng.update(1 / 60, p, W, H);
}

describe('BoidsEngine', () => {
  it('mantiene a todos los boids dentro del mundo toroidal', () => {
    const eng = new BoidsEngine(80, mulberry32(1));
    eng.reset(W, H);
    run(eng, 300);
    for (let i = 0; i < eng.count; i++) {
      expect(eng.x[i]).toBeGreaterThanOrEqual(0);
      expect(eng.x[i]).toBeLessThan(W);
      expect(eng.y[i]).toBeGreaterThanOrEqual(0);
      expect(eng.y[i]).toBeLessThan(H);
    }
  });

  it('con alineación la polarización supera al régimen gas', () => {
    const flock = new BoidsEngine(80, mulberry32(2));
    flock.reset(W, H);
    run(flock, 600, { ...DEFAULT_BOIDS, alignment: 2.0, cohesion: 1.0 });

    const gas = new BoidsEngine(80, mulberry32(2));
    gas.reset(W, H);
    run(gas, 600, { ...DEFAULT_BOIDS, alignment: 0, cohesion: 0 });

    const phiFlock = flock.stats(W, H).polarization;
    const phiGas = gas.stats(W, H).polarization;
    expect(phiFlock).toBeGreaterThan(0.8);
    expect(phiFlock).toBeGreaterThan(phiGas + 0.3);
  });

  it('el depredador ahuyenta a los boids cercanos', () => {
    const eng = new BoidsEngine(40, mulberry32(3));
    eng.reset(W, H);
    eng.predator.x = W / 2;
    eng.predator.y = H / 2;
    eng.predator.active = true;
    const before = meanDistToPredator(eng);
    run(eng, 120);
    const after = meanDistToPredator(eng);
    expect(after).toBeGreaterThan(before);
  });

  it('setCount ajusta la población sin tocar a los supervivientes', () => {
    const eng = new BoidsEngine(50, mulberry32(4));
    const x0 = eng.x[0];
    eng.setCount(120, W, H);
    expect(eng.count).toBe(120);
    expect(eng.x[0]).toBe(x0);
    eng.setCount(30, W, H);
    expect(eng.count).toBe(30);
  });
});

function meanDistToPredator(eng: BoidsEngine): number {
  let sum = 0;
  for (let i = 0; i < eng.count; i++) {
    sum += Math.hypot(eng.x[i] - eng.predator.x, eng.y[i] - eng.predator.y);
  }
  return sum / eng.count;
}
