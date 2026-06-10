import { describe, expect, it } from 'vitest';
import {
  BOARD,
  ChessRLEngine,
  DEFAULT_RL,
  KNIGHT_MOVES,
  MAX_MOVES,
  cellOf,
  mulberry32,
  xyOf,
} from './engine';

describe('geometría del tablero', () => {
  it('cellOf y xyOf son inversas', () => {
    for (let c = 0; c < BOARD * BOARD; c++) {
      const [x, y] = xyOf(c);
      expect(cellOf(x, y)).toBe(c);
    }
  });

  it('el caballo tiene 2 saltos legales en la esquina y 8 en el centro', () => {
    const eng = new ChessRLEngine(mulberry32(1));
    expect(eng.legalActions(cellOf(0, 0)).length).toBe(2);
    expect(eng.legalActions(cellOf(2, 2)).length).toBe(KNIGHT_MOVES.length);
  });
});

describe('dinámica de episodios', () => {
  it('cada episodio termina en captura, comido o agotado dentro del límite', () => {
    const eng = new ChessRLEngine(mulberry32(7));
    for (let e = 0; e < 50; e++) {
      const end = eng.runEpisode(DEFAULT_RL);
      expect(['captura', 'comido', 'agotado']).toContain(end);
      const stat = eng.stats[eng.stats.length - 1];
      expect(stat.length).toBeLessThanOrEqual(MAX_MOVES);
    }
    expect(eng.episode).toBe(50);
  });

  it('epsilon decae por episodio y respeta el suelo', () => {
    const eng = new ChessRLEngine(mulberry32(3));
    const e0 = eng.epsilon(DEFAULT_RL);
    for (let e = 0; e < 2000; e++) eng.runEpisode(DEFAULT_RL);
    expect(e0).toBe(DEFAULT_RL.epsilon0);
    expect(eng.epsilon(DEFAULT_RL)).toBeCloseTo(DEFAULT_RL.epsilonMin, 5);
  });

  it('reset borra la tabla Q y las estadísticas', () => {
    const eng = new ChessRLEngine(mulberry32(5));
    for (let e = 0; e < 20; e++) eng.runEpisode(DEFAULT_RL);
    eng.reset();
    expect(eng.episode).toBe(0);
    expect(eng.stats.length).toBe(0);
    expect(eng.q.every((v) => v === 0)).toBe(true);
  });
});

describe('aprendizaje', () => {
  it('la actualización Q sigue la ecuación de Bellman', () => {
    const eng = new ChessRLEngine(mulberry32(11));
    eng.stepMove(DEFAULT_RL);
    const u = eng.lastUpdate!;
    expect(u.delta).toBeCloseTo(u.reward + DEFAULT_RL.gamma * u.maxNext - u.qBefore, 5);
    expect(u.qAfter).toBeCloseTo(u.qBefore + DEFAULT_RL.alpha * u.delta, 5);
  });

  it('tras entrenar, el retorno medio mejora claramente', () => {
    const eng = new ChessRLEngine(mulberry32(42));
    for (let e = 0; e < 300; e++) eng.runEpisode(DEFAULT_RL);
    const early = eng.stats.slice(0, 100).reduce((a, s) => a + s.ret, 0) / 100;
    for (let e = 0; e < 3000; e++) eng.runEpisode(DEFAULT_RL);
    const late = eng.meanReturn(100);
    expect(late).toBeGreaterThan(early + 2);
    expect(eng.captureRate(100)).toBeGreaterThan(0.7);
  });
});
