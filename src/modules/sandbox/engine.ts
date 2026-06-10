// ============================================================================
// Laboratorio de 2 nodos — la regla de Hebb reducida a su núcleo causal.
//
// Dos neuronas A y B conectadas por sinapsis dirigidas (A→B, B→A). El usuario
// las dispara a mano. Si A dispara JUSTO ANTES que B (dentro de la ventana de
// correlación), la sinapsis A→B se potencia (LTP). Si el orden se invierte, se
// deprime levemente (LTD): el orden temporal — la causalidad — importa.
//
// Narrativa didáctica: al principio disparar A no basta para activar B. Si los
// co-activas repetidamente, A→B crece; llega un punto en que disparar A SOLO
// ya dispara a B. El nodo ha "aprendido" una asociación (condicionamiento).
// ============================================================================

export interface SandboxParams {
  /** Carga necesaria para que una neurona dispare. */
  threshold: number;
  /** Refuerzo hebbiano por coincidencia (LTP). */
  learningRate: number;
  /** Olvido: decaimiento de la sinapsis por segundo si no se usa. */
  decayRate: number;
  /** Ventana de correlación temporal (s) — el "juntas" de Hebb. */
  window: number;
}

export interface SandboxReadout {
  time: number;
  /** Carga actual de cada neurona, normalizada al umbral (0..≥1). */
  charge: [number, number];
  wAB: number;
  wBA: number;
  /** Nivel de peso a partir del cual A basta para disparar a B. */
  triggerLevel: number;
  /** ¿A puede disparar a B por sí solo ahora mismo? */
  canTrigger: boolean;
  /** Disparos provocados en B por un pulso de A (aprendizaje verificado). */
  evoked: number;
  fps: number;
}

export interface Spike {
  node: number;
  t: number;
  /** true si fue provocado por la llegada de un pulso (no por mano/ruido). */
  evoked: boolean;
}

interface SNode {
  a: number;
  lastSpike: number;
  flash: number;
  refractoryUntil: number;
}

interface SEdge {
  from: number;
  to: number;
  w: number;
}

interface SPulse {
  from: number;
  to: number;
  /** progreso 0..1 a lo largo de su arco */
  p: number;
  /** activación que entregará al llegar */
  gain: number;
}

export const PULSE_GAIN = 1.7; // carga entregada por un pulso con w=1
const PULSE_DELAY = 0.18; // s — tiempo de viaje de un pulso
const LEAK = 2.6; // 1/s — fuga de carga (hace que el tiempo importe)
const REFRACTORY = 0.14; // s
const LTD_FACTOR = 0.4; // depresión relativa al aprendizaje
const HISTORY_DT = 0.04; // s — muestreo de la curva de peso
const HISTORY_MAX = 600;
const SPIKE_KEEP = 8; // s de raster a conservar
const INITIAL_W = 0.2;

export const DEFAULT_PARAMS: SandboxParams = {
  threshold: 1.0,
  learningRate: 0.15,
  decayRate: 0.04,
  window: 0.25,
};

export class SandboxEngine {
  nodes: SNode[] = [
    { a: 0, lastSpike: -99, flash: 0, refractoryUntil: 0 },
    { a: 0, lastSpike: -99, flash: 0, refractoryUntil: 0 },
  ];
  edges: SEdge[] = [
    { from: 0, to: 1, w: INITIAL_W },
    { from: 1, to: 0, w: INITIAL_W },
  ];
  pulses: SPulse[] = [];
  spikes: Spike[] = [];
  time = 0;
  fps = 60;
  evoked = 0;

  // Curva de peso en el tiempo (para el gráfico)
  histT: number[] = [];
  histAB: number[] = [];
  histBA: number[] = [];
  private histAcc = 0;

  // Demo programada: eventos de disparo con tiempo absoluto
  private schedule: { t: number; node: number }[] = [];

  reset(): void {
    for (const n of this.nodes) {
      n.a = 0;
      n.lastSpike = -99;
      n.flash = 0;
      n.refractoryUntil = 0;
    }
    for (const e of this.edges) e.w = INITIAL_W;
    this.pulses = [];
    this.spikes = [];
    this.schedule = [];
    this.time = 0;
    this.evoked = 0;
    this.histT = [];
    this.histAB = [];
    this.histBA = [];
    this.histAcc = 0;
  }

  edge(from: number, to: number): SEdge {
    return this.edges.find((e) => e.from === from && e.to === to)!;
  }

  /** Inyecta carga suficiente para garantizar un disparo manual. */
  fire(node: number, threshold: number): void {
    this.nodes[node].a += threshold * 1.4;
  }

  /** Programa una demostración automática a partir del instante actual. */
  startDemo(kind: 'coactivacion' | 'desfasado' | 'probar', threshold: number): void {
    void threshold;
    this.schedule = [];
    const now = this.time;
    if (kind === 'probar') {
      // Disparar A sola, una vez: ¿basta para activar B?
      this.schedule.push({ t: now + 0.05, node: 0 });
      return;
    }
    const gap = kind === 'coactivacion' ? 0.05 : 0.5;
    for (let k = 0; k < 10; k++) {
      const base = now + 0.1 + k * 0.75;
      this.schedule.push({ t: base, node: 0 });
      this.schedule.push({ t: base + gap, node: 1 });
    }
  }

  cancelDemo(): void {
    this.schedule = [];
  }

  get demoActive(): boolean {
    return this.schedule.length > 0;
  }

  private spike(i: number, params: SandboxParams, evoked: boolean): void {
    const n = this.nodes[i];
    const t = this.time;

    // --- STDP: aplica plasticidad usando el último disparo del vecino ---
    for (const e of this.edges) {
      if (e.to === i) {
        // vecino e.from es PRESINÁPTICO: ¿disparó justo antes? → LTP
        const pre = this.nodes[e.from].lastSpike;
        const dt = t - pre;
        if (pre > -90 && dt >= 0 && dt <= params.window) {
          const coincidence = 1 - dt / params.window;
          e.w += params.learningRate * coincidence * (1 - e.w);
        }
      } else if (e.from === i) {
        // este nodo es presináptico pero el destino disparó ANTES → LTD
        const post = this.nodes[e.to].lastSpike;
        const dt = t - post;
        if (post > -90 && dt >= 0 && dt <= params.window) {
          const coincidence = 1 - dt / params.window;
          e.w -= params.learningRate * LTD_FACTOR * coincidence * e.w;
        }
      }
    }
    for (const e of this.edges) e.w = Math.max(0, Math.min(1, e.w));

    n.a = 0;
    n.flash = 1;
    n.refractoryUntil = t + REFRACTORY;
    n.lastSpike = t;
    this.spikes.push({ node: i, t, evoked });
    if (evoked) this.evoked++;

    // Emite un pulso por cada sinapsis saliente
    for (const e of this.edges) {
      if (e.from !== i) continue;
      this.pulses.push({ from: i, to: e.to, p: 0, gain: PULSE_GAIN * e.w });
    }
  }

  update(dt: number, params: SandboxParams): void {
    this.time += dt;
    this.fps = this.fps * 0.92 + (1 / Math.max(dt, 1e-4)) * 0.08;
    const t = this.time;

    // --- Demo programada ---
    if (this.schedule.length) {
      this.schedule = this.schedule.filter((ev) => {
        if (ev.t <= t) {
          this.fire(ev.node, params.threshold);
          return false;
        }
        return true;
      });
    }

    // --- Avance de pulsos; al llegar, entregan carga ---
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pl = this.pulses[i];
      pl.p += dt / PULSE_DELAY;
      if (pl.p >= 1) {
        this.nodes[pl.to].a += pl.gain;
        this.pulses.splice(i, 1);
      }
    }

    // --- Disparos por umbral (un pulso de A puede provocar a B) ---
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.a >= params.threshold && t > n.refractoryUntil) {
        // ¿provocado? Sí si hubo un pulso entrante reciente y no fue manual.
        const evoked = this.nodes[1 - i].lastSpike > t - params.window - PULSE_DELAY - 0.05;
        this.spike(i, params, evoked);
      }
    }

    // --- Fuga de carga y desvanecimiento del destello ---
    for (const n of this.nodes) {
      n.a *= Math.exp(-LEAK * dt);
      n.flash *= Math.exp(-4 * dt);
    }

    // --- Olvido: las sinapsis inactivas decaen ---
    const k = Math.max(0, 1 - params.decayRate * dt);
    for (const e of this.edges) e.w *= k;

    // --- Muestreo de la curva de peso ---
    this.histAcc += dt;
    if (this.histAcc >= HISTORY_DT) {
      this.histAcc = 0;
      this.histT.push(t);
      this.histAB.push(this.edge(0, 1).w);
      this.histBA.push(this.edge(1, 0).w);
      if (this.histT.length > HISTORY_MAX) {
        this.histT.shift();
        this.histAB.shift();
        this.histBA.shift();
      }
    }

    // --- Poda del raster antiguo ---
    const cutoff = t - SPIKE_KEEP;
    while (this.spikes.length && this.spikes[0].t < cutoff) this.spikes.shift();
  }

  readout(params: SandboxParams): SandboxReadout {
    const wAB = this.edge(0, 1).w;
    const triggerLevel = params.threshold / PULSE_GAIN;
    return {
      time: this.time,
      charge: [this.nodes[0].a / params.threshold, this.nodes[1].a / params.threshold],
      wAB,
      wBA: this.edge(1, 0).w,
      triggerLevel,
      canTrigger: wAB >= triggerLevel,
      evoked: this.evoked,
      fps: this.fps,
    };
  }
}
