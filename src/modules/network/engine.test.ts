import { describe, expect, it } from 'vitest';
import { HebbianNetwork } from './engine';

const DEFAULT_PARAMS = {
  threshold: 1.0,
  learningRate: 0.08,
  decayRate: 0.03,
  brushRadius: 60,
};

describe('HebbianNetwork — topología inicial', () => {
  it('contiene 420 nodos tras reset', () => {
    const net = new HebbianNetwork();
    expect(net.nodes.length).toBe(420);
  });

  it('las aristas están dentro del rango de índices válidos', () => {
    const net = new HebbianNetwork();
    for (const e of net.edges) {
      expect(e.a).toBeGreaterThanOrEqual(0);
      expect(e.a).toBeLessThan(net.nodes.length);
      expect(e.b).toBeGreaterThanOrEqual(0);
      expect(e.b).toBeLessThan(net.nodes.length);
      expect(e.a).not.toBe(e.b);
    }
  });

  it('no hay aristas duplicadas (cada par a–b aparece una sola vez)', () => {
    const net = new HebbianNetwork();
    const seen = new Set<number>();
    for (const e of net.edges) {
      const key = Math.min(e.a, e.b) * 420 + Math.max(e.a, e.b);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('todos los pesos iniciales están dentro de (0, 1]', () => {
    const net = new HebbianNetwork();
    for (const e of net.edges) {
      expect(e.w).toBeGreaterThan(0);
      expect(e.w).toBeLessThanOrEqual(1);
    }
  });

  it('todas las aristas empiezan vivas', () => {
    const net = new HebbianNetwork();
    expect(net.edges.every((e) => e.alive)).toBe(true);
  });

  it('stats() refleja correctamente el estado inicial', () => {
    const net = new HebbianNetwork();
    const s = net.stats();
    expect(s.nodes).toBe(420);
    expect(s.aliveEdges).toBe(net.edges.length);
    expect(s.totalEdges).toBe(net.edges.length);
    expect(s.meanWeight).toBeGreaterThan(0);
    expect(s.meanWeight).toBeLessThanOrEqual(1);
  });
});

describe('HebbianNetwork — prune', () => {
  it('prune(0) no mata ninguna arista', () => {
    const net = new HebbianNetwork();
    const killed = net.prune(0);
    expect(killed).toBe(0);
    expect(net.edges.every((e) => e.alive)).toBe(true);
  });

  it('prune(1) mata todas las aristas', () => {
    const net = new HebbianNetwork();
    const total = net.edges.length;
    const killed = net.prune(1);
    expect(killed).toBe(total);
    expect(net.edges.every((e) => !e.alive)).toBe(true);
  });

  it('prune(0.3) mata aproximadamente el 30% de las aristas (±15%)', () => {
    const net = new HebbianNetwork();
    const total = net.edges.length;
    const killed = net.prune(0.3);
    expect(killed).toBeGreaterThan(total * 0.15);
    expect(killed).toBeLessThan(total * 0.45);
  });

  it('prune elimina los pulsos en vuelo sobre aristas muertas', () => {
    const net = new HebbianNetwork();
    // Correr un poco para generar pulsos
    for (let s = 0; s < 30; s++) net.update(1 / 60, DEFAULT_PARAMS, 800, 600);
    net.prune(1); // mata todo
    // No debe quedar ningún pulso sobre aristas muertas
    for (const p of net.pulses) {
      expect(net.edges[p.e].alive).toBe(true);
    }
    expect(net.pulses.length).toBe(0);
  });

  it('después de prune, stats() reporta las aristas muertas correctamente', () => {
    const net = new HebbianNetwork();
    const total = net.edges.length;
    const killed = net.prune(0.5);
    const s = net.stats();
    expect(s.totalEdges).toBe(total);
    expect(s.aliveEdges).toBe(total - killed);
  });
});

describe('HebbianNetwork — dinámica temporal', () => {
  it('el tiempo avanza con update', () => {
    const net = new HebbianNetwork();
    net.update(1 / 60, DEFAULT_PARAMS, 800, 600);
    expect(net.time).toBeCloseTo(1 / 60, 6);
  });

  it('los pesos nunca salen de [MIN_W, 1] durante la simulación', () => {
    const net = new HebbianNetwork();
    for (let s = 0; s < 180; s++) net.update(1 / 60, DEFAULT_PARAMS, 800, 600);
    for (const e of net.edges) {
      if (!e.alive) continue;
      expect(e.w).toBeGreaterThan(0);
      expect(e.w).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('reset regenera la red desde cero (nuevo set de aristas)', () => {
    const net = new HebbianNetwork();
    const oldEdgeCount = net.edges.length;
    // Modificar estado
    for (let s = 0; s < 60; s++) net.update(1 / 60, DEFAULT_PARAMS, 800, 600);
    net.prune(0.1);
    net.reset();
    expect(net.time).toBe(0);
    expect(net.pulses.length).toBe(0);
    expect(net.edges.every((e) => e.alive)).toBe(true);
    expect(net.edges.length).toBeGreaterThan(oldEdgeCount * 0.5);
  });

  it('el aprendizaje hebbiano sube el peso medio con estimulación continuada', () => {
    const net = new HebbianNetwork();
    // Inyectar señal continuamente
    net.brush = { x: 400, y: 300, active: true };
    const wBefore = net.stats().meanWeight;
    for (let s = 0; s < 300; s++) net.update(1 / 60, DEFAULT_PARAMS, 800, 600);
    const wAfter = net.stats().meanWeight;
    expect(wAfter).toBeGreaterThan(wBefore);
  });

  it('firesPerSec es >= 0 y razonable', () => {
    const net = new HebbianNetwork();
    for (let s = 0; s < 120; s++) net.update(1 / 60, DEFAULT_PARAMS, 800, 600);
    const s = net.stats();
    expect(s.firesPerSec).toBeGreaterThanOrEqual(0);
    expect(s.firesPerSec).toBeLessThan(5000);
  });
});

describe('HebbianNetwork — proyección 3D→2D', () => {
  it('todos los nodos tienen coordenadas 2D finitas tras un update', () => {
    const net = new HebbianNetwork();
    net.update(1 / 60, DEFAULT_PARAMS, 800, 600);
    for (const n of net.nodes) {
      expect(Number.isFinite(n.px)).toBe(true);
      expect(Number.isFinite(n.py)).toBe(true);
    }
  });
});
