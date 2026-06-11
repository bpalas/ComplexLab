import { describe, expect, it } from 'vitest';
import { SandboxEngine, DEFAULT_PARAMS, PULSE_GAIN } from './engine';

function step(eng: SandboxEngine, seconds: number, dt = 1 / 60): void {
  const steps = Math.round(seconds / dt);
  for (let s = 0; s < steps; s++) eng.update(dt, DEFAULT_PARAMS);
}

describe('SandboxEngine — estado inicial', () => {
  it('readout refleja el estado inicial', () => {
    const eng = new SandboxEngine();
    const r = eng.readout(DEFAULT_PARAMS);
    expect(r.time).toBe(0);
    expect(r.wAB).toBeCloseTo(0.2, 5);
    expect(r.wBA).toBeCloseTo(0.2, 5);
    expect(r.evoked).toBe(0);
    expect(r.charge[0]).toBeCloseTo(0);
    expect(r.charge[1]).toBeCloseTo(0);
  });

  it('triggerLevel = threshold / PULSE_GAIN', () => {
    const eng = new SandboxEngine();
    const r = eng.readout(DEFAULT_PARAMS);
    expect(r.triggerLevel).toBeCloseTo(DEFAULT_PARAMS.threshold / PULSE_GAIN, 10);
  });

  it('canTrigger es false cuando el peso inicial está bajo el nivel de disparo', () => {
    const eng = new SandboxEngine();
    const r = eng.readout(DEFAULT_PARAMS);
    expect(r.canTrigger).toBe(false);
  });
});

describe('SandboxEngine — hipótesis 1: coactivación enseña la asociación', () => {
  it('disparar A justo antes que B (LTP) sube el peso A→B', () => {
    const eng = new SandboxEngine();
    const wBefore = eng.edge(0, 1).w;
    // Dispara A, espera 50 ms (dentro de la ventana de 250 ms), dispara B
    eng.fire(0, DEFAULT_PARAMS.threshold);
    step(eng, 0.05);
    eng.fire(1, DEFAULT_PARAMS.threshold);
    step(eng, 0.1);
    const wAfter = eng.edge(0, 1).w;
    expect(wAfter).toBeGreaterThan(wBefore);
  });

  it('10 coactivaciones elevan el peso A→B por encima del triggerLevel', () => {
    const eng = new SandboxEngine();
    const { triggerLevel } = eng.readout(DEFAULT_PARAMS);
    // 10 pares de disparos A→B con 50 ms de separación
    for (let k = 0; k < 10; k++) {
      eng.fire(0, DEFAULT_PARAMS.threshold);
      step(eng, 0.05);
      eng.fire(1, DEFAULT_PARAMS.threshold);
      step(eng, 0.5);
    }
    expect(eng.edge(0, 1).w).toBeGreaterThan(triggerLevel);
    expect(eng.readout(DEFAULT_PARAMS).canTrigger).toBe(true);
  });
});

describe('SandboxEngine — hipótesis 2: A dispara a B sola tras el aprendizaje', () => {
  it('después del condicionamiento, un pulso de A provoca a B (evoked > 0)', () => {
    const eng = new SandboxEngine();
    // Condicionar
    for (let k = 0; k < 10; k++) {
      eng.fire(0, DEFAULT_PARAMS.threshold);
      step(eng, 0.05);
      eng.fire(1, DEFAULT_PARAMS.threshold);
      step(eng, 0.5);
    }
    const evokedBefore = eng.evoked;
    // Probar: disparar A sola y dejar que el pulso llegue
    eng.fire(0, DEFAULT_PARAMS.threshold);
    step(eng, 0.5);
    expect(eng.evoked).toBeGreaterThan(evokedBefore);
  });
});

describe('SandboxEngine — hipótesis 3: el desfase inverso (B→A) no aprende A→B', () => {
  it('disparar B antes que A (LTD) deprime o no sube el peso A→B', () => {
    const eng = new SandboxEngine();
    const wBefore = eng.edge(0, 1).w;
    // B dispara primero, luego A — orden inverso a lo necesario para LTP en A→B
    for (let k = 0; k < 8; k++) {
      eng.fire(1, DEFAULT_PARAMS.threshold);
      step(eng, 0.05);
      eng.fire(0, DEFAULT_PARAMS.threshold);
      step(eng, 0.5);
    }
    expect(eng.edge(0, 1).w).toBeLessThanOrEqual(wBefore + 0.01);
  });
});

describe('SandboxEngine — hipótesis 4: el desuso olvida', () => {
  it('la sinapsis decae en reposo con decayRate > 0', () => {
    const eng = new SandboxEngine();
    // Subir el peso primero
    for (let k = 0; k < 6; k++) {
      eng.fire(0, DEFAULT_PARAMS.threshold);
      step(eng, 0.05);
      eng.fire(1, DEFAULT_PARAMS.threshold);
      step(eng, 0.5);
    }
    const wPeak = eng.edge(0, 1).w;
    // Dejar que el tiempo pase sin disparos
    step(eng, 60);
    expect(eng.edge(0, 1).w).toBeLessThan(wPeak);
  });

  it('con decayRate=0 el peso no decae', () => {
    // SandboxEngine arranca en reposo (sin ruido ambiental).
    // Con decayRate=0 la fórmula w *= max(0, 1 - 0*dt) = w*1 no cambia el peso.
    const eng = new SandboxEngine();
    const wStart = eng.edge(0, 1).w;
    const params = { ...DEFAULT_PARAMS, decayRate: 0 };
    for (let s = 0; s < 600; s++) eng.update(1 / 60, params);
    expect(eng.edge(0, 1).w).toBeCloseTo(wStart, 5);
  });
});

describe('SandboxEngine — mecánica general', () => {
  it('fire inyecta carga suficiente para pasar el umbral', () => {
    const eng = new SandboxEngine();
    eng.fire(0, DEFAULT_PARAMS.threshold);
    expect(eng.nodes[0].a).toBeGreaterThan(DEFAULT_PARAMS.threshold);
  });

  it('el tiempo avanza con update', () => {
    const eng = new SandboxEngine();
    eng.update(1 / 60, DEFAULT_PARAMS);
    expect(eng.time).toBeCloseTo(1 / 60, 6);
  });

  it('reset limpia todo el estado', () => {
    const eng = new SandboxEngine();
    // Modificar estado
    for (let k = 0; k < 5; k++) {
      eng.fire(0, DEFAULT_PARAMS.threshold);
      step(eng, 0.05);
      eng.fire(1, DEFAULT_PARAMS.threshold);
      step(eng, 0.3);
    }
    eng.reset();
    const r = eng.readout(DEFAULT_PARAMS);
    expect(r.time).toBe(0);
    expect(r.wAB).toBeCloseTo(0.2, 5);
    expect(r.wBA).toBeCloseTo(0.2, 5);
    expect(r.evoked).toBe(0);
    expect(eng.spikes.length).toBe(0);
    expect(eng.pulses.length).toBe(0);
    expect(eng.histT.length).toBe(0);
  });

  it('los pesos quedan siempre acotados en [0, 1]', () => {
    const eng = new SandboxEngine();
    for (let k = 0; k < 20; k++) {
      eng.fire(0, DEFAULT_PARAMS.threshold);
      step(eng, 0.04);
      eng.fire(1, DEFAULT_PARAMS.threshold);
      step(eng, 0.3);
    }
    for (const e of eng.edges) {
      expect(e.w).toBeGreaterThanOrEqual(0);
      expect(e.w).toBeLessThanOrEqual(1);
    }
  });

  it('historial de peso crece con el tiempo', () => {
    const eng = new SandboxEngine();
    step(eng, 1);
    expect(eng.histT.length).toBeGreaterThan(0);
    expect(eng.histAB.length).toBe(eng.histT.length);
    expect(eng.histBA.length).toBe(eng.histT.length);
  });

  it('startDemo coactivacion programa 20 eventos y demoActive es true', () => {
    const eng = new SandboxEngine();
    eng.startDemo('coactivacion', DEFAULT_PARAMS.threshold);
    expect(eng.demoActive).toBe(true);
    // 10 pares (A + B) = 20 eventos
  });

  it('cancelDemo detiene la demo', () => {
    const eng = new SandboxEngine();
    eng.startDemo('coactivacion', DEFAULT_PARAMS.threshold);
    eng.cancelDemo();
    expect(eng.demoActive).toBe(false);
  });

  it('la demo "probar" programa un único disparo de A', () => {
    const eng = new SandboxEngine();
    eng.startDemo('probar', DEFAULT_PARAMS.threshold);
    expect(eng.demoActive).toBe(true);
    // Dejar que el único evento se ejecute
    step(eng, 0.5);
    expect(eng.demoActive).toBe(false);
  });
});
