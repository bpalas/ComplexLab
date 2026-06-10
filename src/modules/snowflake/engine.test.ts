import { describe, expect, it } from 'vitest';
import { SnowflakeEngine, DEFAULT_SNOW } from './engine';

function grow(eng: SnowflakeEngine, steps: number): void {
  for (let s = 0; s < steps && !eng.done; s++) eng.step(DEFAULT_SNOW);
}

describe('SnowflakeEngine', () => {
  it('el cristal crece desde la semilla central', () => {
    const eng = new SnowflakeEngine(40, 1);
    const before = eng.stats().frozen;
    grow(eng, 150);
    const after = eng.stats().frozen;
    expect(before).toBe(1);
    expect(after).toBeGreaterThan(50);
  });

  it('mantiene la simetría hexagonal (rotación de 60°)', () => {
    const eng = new SnowflakeEngine(36, 5);
    grow(eng, 140);
    // Rotación axial de 60°: (q, r) → (-r, q + r)
    for (let q = -36; q <= 36; q++) {
      for (let r = -36; r <= 36; r++) {
        if (SnowflakeEngine.hexDist(q, r) > 36) continue;
        const rq = -r;
        const rr = q + r;
        const a = eng.s[eng.idx(q, r)] >= 1;
        const b = eng.s[eng.idx(rq, rr)] >= 1;
        expect(a).toBe(b);
      }
    }
  });

  it('viajes atmosféricos distintos producen copos distintos', () => {
    const a = new SnowflakeEngine(36, 11);
    const b = new SnowflakeEngine(36, 22);
    a.journey = true;
    b.journey = true;
    grow(a, 160);
    grow(b, 160);
    expect(a.fingerprint()).not.toBe(b.fingerprint());
  });

  it('el mismo viaje (semilla) reproduce exactamente el mismo copo', () => {
    const a = new SnowflakeEngine(36, 33);
    const b = new SnowflakeEngine(36, 33);
    a.journey = true;
    b.journey = true;
    grow(a, 160);
    grow(b, 160);
    expect(a.fingerprint()).toBe(b.fingerprint());
  });

  it('se detiene cuando el cristal alcanza el borde del mundo', () => {
    const eng = new SnowflakeEngine(18, 2);
    grow(eng, 5000);
    expect(eng.done).toBe(true);
    expect(eng.stats().radius).toBeGreaterThanOrEqual(15);
  });
});
