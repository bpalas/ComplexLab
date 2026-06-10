// ============================================================================
// Motor de coordinación emergente — 4 agentes autónomos que intentan converger
// en una misma opción SIN comunicación directa: solo observan el histórico
// público de elecciones y aciertos/fallos del grupo en rondas previas.
//
// Métricas inspiradas en la descomposición parcial de información (PID):
//   · Redundancia ≈ coordinación explicable por comportamientos marginales
//     idénticos (línea base independiente, estimada por Monte Carlo).
//   · Sinergia    ≈ coordinación observada POR ENCIMA de esa línea base
//     (estructura conjunta que ningún agente individual explica).
// ============================================================================

import { Rng } from '../../lib/rng';

export type AgentMode = 'homogeneo' | 'especializacion' | 'inferencia';

export const N_OPTIONS = 6;
export const N_AGENTS = 4;

export interface AgentProfile {
  name: string;
  role: string;
  color: string;
  glyph: 'circle' | 'triangle' | 'square' | 'diamond';
  desc: string;
}

export const AGENTS: AgentProfile[] = [
  {
    name: 'AGT·01', role: 'Analítico', color: '#45e6c8', glyph: 'circle',
    desc: 'Explota la opción con mejor historial de éxito grupal.',
  },
  {
    name: 'AGT·02', role: 'Explorador', color: '#ffb454', glyph: 'triangle',
    desc: 'Muestrea alternativas con alta probabilidad de exploración.',
  },
  {
    name: 'AGT·03', role: 'Conservador', color: '#4aa8ff', glyph: 'square',
    desc: 'Mantiene su decisión previa salvo fallo grupal sostenido.',
  },
  {
    name: 'AGT·04', role: 'Sintetizador', color: '#ff5d8f', glyph: 'diamond',
    desc: 'Agrega las mayorías recientes del colectivo.',
  },
];

export interface RoundRecord {
  index: number;
  choices: number[];
  majority: number; // -1 si no hay coincidencia válida
  score: number; // fracción de agentes alineados con la mayoría (0..1)
  perfect: boolean;
  /** Opción que quedó bloqueada (perturbación de contexto) tras esta ronda. */
  lockout: number;
}

export interface SystemMetrics {
  /** Desempeño de coordinación observado en la ventana. */
  actual: number;
  /** Sinergia: coordinación por encima de la línea base independiente. */
  synergy: number;
  /** Redundancia: coordinación explicable por marginales idénticos. */
  redundancy: number;
}

const METRIC_WINDOW = 14;
const LOCKOUT_ROUNDS = 10;
const MC_SAMPLES = 260;

function argmaxTie(scores: number[], allowed: boolean[], focal: boolean, rng: Rng = Math.random): number {
  let best = -Infinity;
  const ties: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    if (!allowed[i]) continue;
    if (scores[i] > best + 1e-9) {
      best = scores[i];
      ties.length = 0;
      ties.push(i);
    } else if (Math.abs(scores[i] - best) <= 1e-9) {
      ties.push(i);
    }
  }
  if (!ties.length) return -1;
  // Punto focal (convención compartida tipo Schelling): el índice más bajo.
  if (focal) return ties[0];
  return ties[Math.floor(rng() * ties.length)];
}

export class CoordinationEngine {
  mode: AgentMode = 'homogeneo';
  history: RoundRecord[] = [];
  round = 0;
  /** Ronda a partir de la cual cada opción vuelve a estar habilitada. */
  disabledUntil: number[] = new Array(N_OPTIONS).fill(0);
  /** Confianza de inferencia i→j (solo en modo inferencia, para las líneas). */
  inference: number[][] = Array.from({ length: N_AGENTS }, () => new Array(N_AGENTS).fill(0));

  private smooth = { synergy: 0, redundancy: 0, actual: 0 };
  private rng: Rng;

  constructor(rng: Rng = Math.random) {
    this.rng = rng;
  }

  reset(): void {
    this.history = [];
    this.round = 0;
    this.disabledUntil.fill(0);
    this.clearInference();
    this.smooth = { synergy: 0, redundancy: 0, actual: 0 };
  }

  private clearInference(): void {
    for (const row of this.inference) row.fill(0);
  }

  enabled(opt: number): boolean {
    return this.round >= this.disabledUntil[opt];
  }

  enabledMask(): boolean[] {
    return Array.from({ length: N_OPTIONS }, (_, o) => this.enabled(o));
  }

  lockRemaining(opt: number): number {
    return Math.max(0, this.disabledUntil[opt] - this.round);
  }

  private randomEnabled(): number {
    const opts: number[] = [];
    for (let o = 0; o < N_OPTIONS; o++) if (this.enabled(o)) opts.push(o);
    if (!opts.length) return Math.floor(this.rng() * N_OPTIONS);
    return opts[Math.floor(this.rng() * opts.length)];
  }

  private last(): RoundRecord | null {
    return this.history.length ? this.history[this.history.length - 1] : null;
  }

  /** Moda de un conjunto de elecciones, restringida a opciones habilitadas. */
  private modeOf(choices: number[]): number {
    const counts = new Array(N_OPTIONS).fill(0);
    for (const c of choices) if (c >= 0 && this.enabled(c)) counts[c]++;
    const pick = argmaxTie(counts, this.enabledMask(), false, this.rng);
    return pick >= 0 && counts[pick] > 0 ? pick : this.randomEnabled();
  }

  /** Distribución predicha del agente j: frecuencias ponderadas por recencia. */
  private predictAgent(j: number): number[] {
    const w = new Array(N_OPTIONS).fill(1e-4);
    let decay = 1;
    for (let k = this.history.length - 1; k >= Math.max(0, this.history.length - 8); k--) {
      const c = this.history[k].choices[j];
      if (this.enabled(c)) w[c] += decay;
      decay *= 0.72;
    }
    for (let o = 0; o < N_OPTIONS; o++) if (!this.enabled(o)) w[o] = 0;
    const total = w.reduce((a, b) => a + b, 0);
    if (total <= 0) {
      const mask = this.enabledMask();
      const n = mask.filter(Boolean).length || 1;
      return mask.map((m) => (m ? 1 / n : 0));
    }
    return w.map((x) => x / total);
  }

  // --------------------------------------------------------------------------
  // Políticas de decisión por paradigma
  // --------------------------------------------------------------------------

  /** Modo homogéneo: regla plana e idéntica para los 4 agentes. */
  private decideHomogeneo(): number {
    const last = this.last();
    if (!last || this.rng() < 0.28) return this.randomEnabled();
    return this.modeOf(last.choices);
  }

  /** Modo especialización: cada agente tiene una identidad analítica estable. */
  private decideEspecializado(i: number): number {
    const last = this.last();
    switch (i) {
      case 0: {
        // Analítico — frecuencia de cada opción ponderada por el éxito grupal
        if (!this.history.length || this.rng() < 0.06) return this.randomEnabled();
        const scores = new Array(N_OPTIONS).fill(0);
        for (const r of this.history.slice(-20)) {
          for (const c of r.choices) {
            if (this.enabled(c)) scores[c] += r.score + 0.05;
          }
        }
        const pick = argmaxTie(scores, this.enabledMask(), false, this.rng);
        return pick >= 0 ? pick : this.randomEnabled();
      }
      case 1: {
        // Explorador — alta probabilidad de muestreo aleatorio
        if (!last || this.rng() < 0.45) return this.randomEnabled();
        return this.modeOf(last.choices);
      }
      case 2: {
        // Conservador — persiste salvo fallo sostenido del grupo
        const mine = last ? last.choices[2] : -1;
        if (last && mine >= 0 && this.enabled(mine) && this.rng() > 0.04) {
          const recent = this.history.slice(-3);
          const failing = recent.length === 3 && recent.every((r) => r.score < 0.55);
          if (!failing) return mine;
        }
        if (last && last.majority >= 0 && this.enabled(last.majority)) return last.majority;
        return this.randomEnabled();
      }
      default: {
        // Sintetizador — moda de las mayorías recientes
        if (!this.history.length || this.rng() < 0.1) return this.randomEnabled();
        const majors = this.history
          .slice(-3)
          .map((r) => r.majority)
          .filter((m) => m >= 0 && this.enabled(m));
        if (!majors.length) return this.randomEnabled();
        return this.modeOf(majors);
      }
    }
  }

  /**
   * Modo inferencia (Teoría de la Mente): cada agente modela la distribución
   * de probabilidad de las decisiones de sus pares y elige el consenso
   * esperado. Los empates se resuelven por punto focal compartido.
   */
  private decideInferencia(i: number): number {
    const sums = new Array(N_OPTIONS).fill(0);
    for (let j = 0; j < N_AGENTS; j++) {
      if (j === i) continue;
      const pred = this.predictAgent(j);
      this.inference[i][j] = Math.max(...pred);
      for (let o = 0; o < N_OPTIONS; o++) sums[o] += pred[o];
    }
    if (this.rng() < 0.03) return this.randomEnabled();
    const pick = argmaxTie(sums, this.enabledMask(), true, this.rng);
    return pick >= 0 ? pick : this.randomEnabled();
  }

  // --------------------------------------------------------------------------

  playRound(): RoundRecord {
    if (this.mode !== 'inferencia') this.clearInference();

    const choices = AGENTS.map((_, i) => {
      switch (this.mode) {
        case 'homogeneo':
          return this.decideHomogeneo();
        case 'especializacion':
          return this.decideEspecializado(i);
        case 'inferencia':
          return this.decideInferencia(i);
      }
    });

    const counts = new Array(N_OPTIONS).fill(0);
    for (const c of choices) if (this.enabled(c)) counts[c]++;
    const majority = argmaxTie(counts, this.enabledMask(), true, this.rng);
    const top = majority >= 0 ? counts[majority] : 0;
    const score = top >= 2 ? top / N_AGENTS : 0;
    const perfect = top === N_AGENTS;

    const rec: RoundRecord = {
      index: this.round,
      choices,
      majority: top >= 2 ? majority : -1,
      score,
      perfect,
      lockout: -1,
    };
    this.history.push(rec);
    this.round++;

    // Perturbación de contexto: tres consensos perfectos consecutivos sobre la
    // misma opción la "agotan" — el colectivo debe re-coordinarse desde cero.
    const h = this.history;
    const n = h.length;
    if (
      n >= 3 &&
      h[n - 1].perfect && h[n - 2].perfect && h[n - 3].perfect &&
      h[n - 1].majority === h[n - 2].majority &&
      h[n - 2].majority === h[n - 3].majority &&
      this.enabled(h[n - 1].majority)
    ) {
      rec.lockout = h[n - 1].majority;
      this.disabledUntil[rec.lockout] = this.round + LOCKOUT_ROUNDS;
    }

    return rec;
  }

  /** Distribución marginal del agente i dentro de la ventana de métricas. */
  private marginal(i: number, window: number): number[] {
    const w = new Array(N_OPTIONS).fill(0.25); // suavizado
    for (const r of this.history.slice(-window)) w[r.choices[i]] += 1;
    const total = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / total);
  }

  /**
   * Sinergia dinámica vs redundancia, sobre una ventana móvil.
   * Línea base independiente estimada por Monte Carlo: ¿cuánta coordinación
   * lograrían los agentes si solo conserváramos sus marginales individuales?
   */
  metrics(): SystemMetrics {
    if (this.history.length < 2) return { actual: 0, synergy: 0, redundancy: 0 };

    const recent = this.history.slice(-METRIC_WINDOW);
    const actual = recent.reduce((a, r) => a + r.score, 0) / recent.length;

    const margs = AGENTS.map((_, i) => this.marginal(i, METRIC_WINDOW));
    const cdfs = margs.map((m) => {
      const cdf: number[] = [];
      let acc = 0;
      for (const p of m) {
        acc += p;
        cdf.push(acc);
      }
      return cdf;
    });

    let acc = 0;
    const draw = new Array(N_AGENTS).fill(0);
    for (let s = 0; s < MC_SAMPLES; s++) {
      for (let i = 0; i < N_AGENTS; i++) {
        const u = this.rng();
        const cdf = cdfs[i];
        let c = 0;
        while (c < N_OPTIONS - 1 && u > cdf[c]) c++;
        draw[i] = c;
      }
      const counts = new Array(N_OPTIONS).fill(0);
      let top = 0;
      for (const c of draw) {
        counts[c]++;
        if (counts[c] > top) top = counts[c];
      }
      acc += top >= 2 ? top / N_AGENTS : 0;
    }
    const indep = acc / MC_SAMPLES;

    const rawSyn = Math.max(0, Math.min(1, actual - indep));
    const rawRed = Math.max(0, Math.min(1, Math.min(actual, indep)));

    // Suavizado exponencial para una lectura estable en pantalla
    this.smooth.synergy = this.smooth.synergy * 0.65 + rawSyn * 0.35;
    this.smooth.redundancy = this.smooth.redundancy * 0.65 + rawRed * 0.35;
    this.smooth.actual = this.smooth.actual * 0.65 + actual * 0.35;

    return {
      actual: this.smooth.actual,
      synergy: this.smooth.synergy,
      redundancy: this.smooth.redundancy,
    };
  }

  /** Serie temporal del error de coordinación (1 − puntaje) por ronda. */
  errorSeries(): number[] {
    return this.history.map((r) => 1 - r.score);
  }
}
