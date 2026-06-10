import { describe, it, expect } from 'vitest';
import { mulberry32 } from './rng';
import { CoordinationEngine } from '../modules/agents/engine';
import { HebbianNetwork } from '../modules/network/engine';

describe('mulberry32', () => {
  it('produces the same sequence from the same seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces different sequences from different seeds', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });
});

describe('CoordinationEngine determinism', () => {
  it('produces identical state after N steps with same seed', () => {
    const N = 15;
    const engine1 = new CoordinationEngine(mulberry32(42));
    const engine2 = new CoordinationEngine(mulberry32(42));
    for (let i = 0; i < N; i++) {
      engine1.playRound();
      engine2.playRound();
    }
    // histories should be identical
    expect(engine1.history.length).toBe(N);
    for (let i = 0; i < N; i++) {
      expect(engine1.history[i].choices).toEqual(engine2.history[i].choices);
      expect(engine1.history[i].score).toBe(engine2.history[i].score);
    }
  });
});

describe('HebbianNetwork determinism', () => {
  it('produces the same topology from the same seed', () => {
    const net1 = new HebbianNetwork(mulberry32(7));
    const net2 = new HebbianNetwork(mulberry32(7));
    // Same number of edges means same topology was generated
    expect(net1.edges.length).toBe(net2.edges.length);
    // First few edge weights should match
    for (let i = 0; i < Math.min(10, net1.edges.length); i++) {
      expect(net1.edges[i].w).toBeCloseTo(net2.edges[i].w, 10);
    }
  });
});
