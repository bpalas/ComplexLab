import { describe, expect, it } from 'vitest';
import { ReactionDiffusion, DEFAULT_RD, RD_PRESETS, classifyRegion } from './engine';

function evolve(eng: ReactionDiffusion, iters: number, p = DEFAULT_RD): void {
  eng.update(1 / 60, p, iters);
}

describe('ReactionDiffusion', () => {
  it('arranca con U≈1 en casi todas las celdas y unas semillas de V', () => {
    const eng = new ReactionDiffusion(60, 40, 1);
    let vSeed = 0;
    let uFull = 0;
    for (let k = 0; k < eng.u.length; k++) {
      if (eng.v[k] > 0.1) vSeed++;
      if (eng.u[k] > 0.9) uFull++;
    }
    expect(vSeed).toBeGreaterThan(0);
    expect(uFull).toBeGreaterThan(eng.u.length * 0.5);
  });

  it('las concentraciones permanecen acotadas (no explota numéricamente)', () => {
    const eng = new ReactionDiffusion(64, 48, 2);
    const coral = RD_PRESETS[1];
    evolve(eng, 1500, { ...DEFAULT_RD, feed: coral.feed, kill: coral.kill });
    for (let k = 0; k < eng.u.length; k++) {
      expect(Number.isFinite(eng.u[k])).toBe(true);
      expect(Number.isFinite(eng.v[k])).toBe(true);
      expect(eng.u[k]).toBeGreaterThanOrEqual(-0.05);
      expect(eng.u[k]).toBeLessThanOrEqual(1.6);
      expect(eng.v[k]).toBeGreaterThanOrEqual(-0.05);
      expect(eng.v[k]).toBeLessThanOrEqual(1.1);
    }
  });

  it('el patrón se establece y persiste con un preset de crecimiento', () => {
    // El preset «coral» crece y se ramifica. La cobertura puede subir y bajar
    // en el transitorio, así que en lugar de exigir crecimiento estricto en un
    // instante medimos que, tras estabilizar, el patrón ni murió ni explotó:
    // queda una fracción de rejilla activada dentro de una banda razonable.
    const eng = new ReactionDiffusion(80, 60, 4);
    const coral = RD_PRESETS[1];
    const p = { ...DEFAULT_RD, feed: coral.feed, kill: coral.kill };
    evolve(eng, 1500, p);
    const cov = eng.stats().coverage;
    expect(cov).toBeGreaterThan(0.05);
    expect(cov).toBeLessThan(0.9);
  });

  it('probe — los tres términos suman la derivada (conservación)', () => {
    const eng = new ReactionDiffusion(60, 40, 3);
    evolve(eng, 200);
    const b = eng.probe(30, 20, DEFAULT_RD)!;
    expect(b).not.toBeNull();
    expect(b.uDiffusion + b.uReaction + b.uFeed).toBeCloseTo(b.duDt, 10);
    expect(b.vDiffusion + b.vReaction + b.vDecay).toBeCloseTo(b.dvDt, 10);
  });

  it('probe — duDt/dvDt coinciden con el cambio real tras un paso de update', () => {
    const eng = new ReactionDiffusion(60, 40, 5);
    evolve(eng, 150);
    const x = 25;
    const y = 18;
    const k = y * eng.W + x;
    const uBefore = eng.u[k];
    const vBefore = eng.v[k];
    const b = eng.probe(x, y, DEFAULT_RD)!;
    evolve(eng, 1, DEFAULT_RD); // mismo dt/params, una sola iteración
    expect(eng.u[k] - uBefore).toBeCloseTo(b.duDt, 6);
    expect(eng.v[k] - vBefore).toBeCloseTo(b.dvDt, 6);
  });

  it('probe — fuera de la rejilla devuelve null', () => {
    const eng = new ReactionDiffusion(60, 40, 1);
    expect(eng.probe(-1, 10, DEFAULT_RD)).toBeNull();
    expect(eng.probe(10, -1, DEFAULT_RD)).toBeNull();
    expect(eng.probe(60, 10, DEFAULT_RD)).toBeNull();
    expect(eng.probe(10, 40, DEFAULT_RD)).toBeNull();
  });

  it('classifyRegion — cada preset cae en su propia región del mapa f–k', () => {
    for (const preset of RD_PRESETS) {
      const region = classifyRegion(preset.feed, preset.kill);
      expect(region.key).toBe(preset.key);
    }
  });

  it('es determinista: la misma semilla produce el mismo estado', () => {
    const a = new ReactionDiffusion(48, 36, 7);
    const b = new ReactionDiffusion(48, 36, 7);
    evolve(a, 600);
    evolve(b, 600);
    for (let k = 0; k < a.v.length; k++) {
      expect(a.v[k]).toBe(b.v[k]);
    }
  });

  it('el pincel siembra V donde se le indica', () => {
    const eng = new ReactionDiffusion(60, 60, 1);
    eng.reset(1);
    eng.v.fill(0);
    eng.u.fill(1);
    const cx = 30;
    const cy = 30;
    const k = cy * eng.W + cx;
    expect(eng.v[k]).toBe(0);
    eng.brush = { x: cx, y: cy, active: true, radius: 5 };
    evolve(eng, 1);
    expect(eng.v[k]).toBeGreaterThan(0);
  });
});
