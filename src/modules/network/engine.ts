// ============================================================================
// Motor de simulación — Red topológica con aprendizaje asociativo (hebbiano)
// y propagación de pulsos. Diseñado para mutación directa desde la UI
// (los sliders escriben sobre el objeto NetParams sin pasar por React).
// ============================================================================

import { Rng } from '../../lib/rng';

export interface NetParams {
  /** Nivel de señal acumulada necesario para que un nodo dispare. */
  threshold: number;
  /** Refuerzo hebbiano aplicado a aristas con activación correlacionada. */
  learningRate: number;
  /** Decaimiento proporcional (por segundo) de pesos inactivos — "olvido". */
  decayRate: number;
  /** Radio del pincel de inyección de señal, en píxeles de pantalla. */
  brushRadius: number;
}

export interface NetStats {
  nodes: number;
  aliveEdges: number;
  totalEdges: number;
  meanWeight: number;
  strongEdges: number;
  firesPerSec: number;
  pulses: number;
  fps: number;
}

interface NNode {
  // Posición en el espacio 3D ficticio (esfera unitaria)
  x: number;
  y: number;
  z: number;
  /** Nivel de activación continuo (acumulación de señal). */
  a: number;
  refractoryUntil: number;
  /** Brillo visual residual tras un disparo. */
  flash: number;
  // Proyección 2D calculada por frame
  px: number;
  py: number;
  ps: number;
  /** Pulsos recibidos recientemente — traza para la regla hebbiana. */
  inbox: { e: number; t: number }[];
}

interface Edge {
  a: number;
  b: number;
  w: number;
  alive: boolean;
}

interface Pulse {
  e: number;
  from: number;
  t: number; // progreso 0..1
  s: number; // señal transportada
}

const NODE_COUNT = 420;
const CLUSTERS = 7;
const NEIGHBORS = 3; // k vecinos más cercanos por nodo
const LONG_RANGE = 50; // enlaces aleatorios de largo alcance (mundo pequeño)
const REFRACTORY = 0.22; // s — periodo refractario tras disparar
const CORRELATION_WINDOW = 0.45; // s — ventana de correlación temporal hebbiana
const PULSE_TIME = 0.34; // s — tiempo de viaje de un pulso por su arista
const MIN_W = 0.015;
const INITIAL_W = 0.16;
const MAX_PULSES = 3500;
const LEAK = 1.1; // fuga de activación de los nodos (1/s)

function gaussian(rng: Rng): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class HebbianNetwork {
  nodes: NNode[] = [];
  edges: Edge[] = [];
  pulses: Pulse[] = [];
  /** adyacencia: índices de aristas por nodo */
  private adj: number[][] = [];
  time = 0;
  fps = 60;
  brush = { x: 0, y: 0, active: false };
  private fireTimes: number[] = [];
  private rng: Rng;

  constructor(rng: Rng = Math.random) {
    this.rng = rng;
    this.reset();
  }

  /** Genera una nueva topología orgánica por agrupaciones (clusters) en 3D. */
  reset(): void {
    this.nodes = [];
    this.edges = [];
    this.pulses = [];
    this.time = 0;
    this.fireTimes = [];

    const centers = Array.from({ length: CLUSTERS }, () => {
      const r = 0.62 * Math.cbrt(this.rng());
      const theta = this.rng() * Math.PI * 2;
      const phi = Math.acos(2 * this.rng() - 1);
      return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
      };
    });

    for (let i = 0; i < NODE_COUNT; i++) {
      const c = centers[i % CLUSTERS];
      let x = c.x + gaussian(this.rng) * 0.27;
      let y = c.y + gaussian(this.rng) * 0.27;
      let z = c.z + gaussian(this.rng) * 0.27;
      const d = Math.hypot(x, y, z);
      if (d > 1) {
        x /= d;
        y /= d;
        z /= d;
      }
      this.nodes.push({
        x, y, z,
        a: 0,
        refractoryUntil: 0,
        flash: 0,
        px: 0, py: 0, ps: 1,
        inbox: [],
      });
    }

    // Aristas: k vecinos más cercanos en 3D + enlaces de largo alcance
    const seen = new Set<number>();
    const addEdge = (a: number, b: number) => {
      if (a === b) return;
      const key = Math.min(a, b) * NODE_COUNT + Math.max(a, b);
      if (seen.has(key)) return;
      seen.add(key);
      this.edges.push({ a, b, w: INITIAL_W * (0.6 + this.rng() * 0.8), alive: true });
    };

    for (let i = 0; i < NODE_COUNT; i++) {
      const ni = this.nodes[i];
      const dists: { j: number; d: number }[] = [];
      for (let j = 0; j < NODE_COUNT; j++) {
        if (i === j) continue;
        const nj = this.nodes[j];
        const d = (ni.x - nj.x) ** 2 + (ni.y - nj.y) ** 2 + (ni.z - nj.z) ** 2;
        dists.push({ j, d });
      }
      dists.sort((p, q) => p.d - q.d);
      for (let k = 0; k < NEIGHBORS; k++) addEdge(i, dists[k].j);
    }
    for (let k = 0; k < LONG_RANGE; k++) {
      addEdge(
        Math.floor(this.rng() * NODE_COUNT),
        Math.floor(this.rng() * NODE_COUNT),
      );
    }

    this.adj = Array.from({ length: NODE_COUNT }, () => []);
    this.edges.forEach((e, idx) => {
      this.adj[e.a].push(idx);
      this.adj[e.b].push(idx);
    });
  }

  /** Regularización masiva: destruye un porcentaje aleatorio de los enlaces vivos. */
  prune(fraction: number): number {
    let killed = 0;
    for (const e of this.edges) {
      if (e.alive && this.rng() < fraction) {
        e.alive = false;
        killed++;
      }
    }
    this.pulses = this.pulses.filter((p) => this.edges[p.e].alive);
    return killed;
  }

  private fire(i: number, params: NetParams): void {
    const n = this.nodes[i];
    n.a = 0;
    n.flash = 1;
    n.refractoryUntil = this.time + REFRACTORY;
    this.fireTimes.push(this.time);

    // Regla hebbiana: refuerza las aristas cuyos pulsos llegaron justo antes
    // de este disparo (alta correlación temporal entrada → disparo).
    for (const entry of n.inbox) {
      if (this.time - entry.t < CORRELATION_WINDOW) {
        const e = this.edges[entry.e];
        if (e.alive) e.w += params.learningRate * (1 - e.w);
      }
    }
    n.inbox.length = 0;

    // Transmite la información a los vecinos: un pulso de luz por arista viva
    for (const ei of this.adj[i]) {
      const e = this.edges[ei];
      if (!e.alive || this.pulses.length >= MAX_PULSES) continue;
      this.pulses.push({ e: ei, from: i, t: 0, s: 0.15 + 0.9 * e.w });
    }
  }

  update(dt: number, params: NetParams, width: number, height: number): void {
    this.time += dt;
    this.fps = this.fps * 0.95 + (1 / Math.max(dt, 1e-4)) * 0.05;

    // ----- Proyección 3D → 2D (rotación lenta + perspectiva) -----
    const rotY = this.time * 0.05;
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const tilt = -0.34;
    const cosX = Math.cos(tilt);
    const sinX = Math.sin(tilt);
    const cx = width / 2;
    const cy = height / 2;
    const R = Math.min(width, height) * 0.42;

    for (const n of this.nodes) {
      const x1 = cosY * n.x + sinY * n.z;
      const z1 = -sinY * n.x + cosY * n.z;
      const y2 = cosX * n.y - sinX * z1;
      const z2 = sinX * n.y + cosX * z1;
      const persp = 2.3 / (2.3 - z2);
      n.px = cx + x1 * persp * R;
      n.py = cy + y2 * persp * R * 0.94;
      n.ps = persp;
    }

    // ----- Ruido ambiental leve (mantiene la red viva sin dominarla) -----
    if (this.rng() < dt * 1.5) {
      this.nodes[Math.floor(this.rng() * NODE_COUNT)].a += 0.95;
    }

    // ----- Pincel de inyección de señal -----
    if (this.brush.active) {
      const r = params.brushRadius;
      const r2 = r * r;
      for (const n of this.nodes) {
        const dx = n.px - this.brush.x;
        const dy = n.py - this.brush.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const falloff = 1 - Math.sqrt(d2) / r;
          n.a += dt * 7.5 * falloff;
        }
      }
    }

    // ----- Avance de pulsos y entrega de señal -----
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.t += dt / PULSE_TIME;
      if (p.t >= 1) {
        const e = this.edges[p.e];
        if (e.alive) {
          const target = e.a === p.from ? e.b : e.a;
          const n = this.nodes[target];
          n.a += p.s * (0.35 + 0.85 * e.w);
          n.inbox.push({ e: p.e, t: this.time });
          if (n.inbox.length > 10) n.inbox.shift();
        }
        const lastP = this.pulses.pop()!;
        if (i < this.pulses.length) this.pulses[i] = lastP;
      }
    }

    // ----- Disparos por encima del umbral + fuga de activación -----
    for (let i = 0; i < NODE_COUNT; i++) {
      const n = this.nodes[i];
      if (n.a > params.threshold && this.time > n.refractoryUntil) {
        this.fire(i, params);
      }
      n.a *= Math.exp(-LEAK * dt);
      n.flash *= Math.exp(-3.6 * dt);
    }

    // ----- Olvido: decaimiento de pesos inactivos -----
    const k = Math.max(0, 1 - params.decayRate * dt);
    for (const e of this.edges) {
      if (e.alive && e.w > MIN_W) e.w = Math.max(MIN_W, e.w * k);
    }

    // Ventana de disparos para estadística (último segundo)
    const cutoff = this.time - 1;
    while (this.fireTimes.length && this.fireTimes[0] < cutoff) this.fireTimes.shift();
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, params: NetParams): void {
    ctx.clearRect(0, 0, width, height);

    // ----- Aristas: grosor y opacidad proporcionales al peso aprendido -----
    for (const e of this.edges) {
      if (!e.alive) continue;
      const na = this.nodes[e.a];
      const nb = this.nodes[e.b];
      const depth = (na.ps + nb.ps) * 0.5;
      const alpha = Math.min(0.85, 0.035 + e.w * 0.65) * Math.min(1, depth);
      ctx.strokeStyle = `rgba(86, 232, 213, ${alpha.toFixed(3)})`;
      ctx.lineWidth = (0.35 + e.w * 2.8) * depth * 0.75;
      ctx.beginPath();
      ctx.moveTo(na.px, na.py);
      ctx.lineTo(nb.px, nb.py);
      ctx.stroke();
      // Halo extra para rutas consolidadas (memoria de red)
      if (e.w > 0.55) {
        ctx.strokeStyle = `rgba(255, 196, 110, ${(e.w - 0.55) * 0.25})`;
        ctx.lineWidth = (1.5 + e.w * 4.5) * depth * 0.75;
        ctx.stroke();
      }
    }

    // ----- Pulsos: puntos de luz de alta intensidad viajando por las aristas -----
    for (const p of this.pulses) {
      const e = this.edges[p.e];
      const from = this.nodes[e.a === p.from ? e.a : e.b];
      const to = this.nodes[e.a === p.from ? e.b : e.a];
      const x = from.px + (to.px - from.px) * p.t;
      const y = from.py + (to.py - from.py) * p.t;
      ctx.fillStyle = 'rgba(255, 224, 160, 0.22)';
      ctx.beginPath();
      ctx.arc(x, y, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 248, 230, 0.95)';
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ----- Nodos: color según nivel de activación relativo al umbral -----
    for (const n of this.nodes) {
      const charge = Math.min(1, n.a / params.threshold);
      const r = (1.3 + n.ps * 1.5 + charge * 1.6) * 0.9;

      if (n.flash > 0.03) {
        ctx.fillStyle = `rgba(120, 240, 220, ${(n.flash * 0.4).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.px, n.py, r + 3 + n.flash * 9, 0, Math.PI * 2);
        ctx.fill();
      }

      const cr = Math.round(90 + charge * 150);
      const cg = Math.round(140 + charge * 110);
      const cb = Math.round(165 + charge * 75);
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${(0.45 + charge * 0.55).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(n.px, n.py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // ----- Pincel de inyección -----
    if (this.brush.active) {
      ctx.strokeStyle = 'rgba(255, 180, 84, 0.65)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(this.brush.x, this.brush.y, params.brushRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(this.brush.x - 7, this.brush.y);
      ctx.lineTo(this.brush.x + 7, this.brush.y);
      ctx.moveTo(this.brush.x, this.brush.y - 7);
      ctx.lineTo(this.brush.x, this.brush.y + 7);
      ctx.stroke();
    }
  }

  stats(): NetStats {
    let alive = 0;
    let sum = 0;
    let strong = 0;
    for (const e of this.edges) {
      if (!e.alive) continue;
      alive++;
      sum += e.w;
      if (e.w > 0.5) strong++;
    }
    return {
      nodes: this.nodes.length,
      aliveEdges: alive,
      totalEdges: this.edges.length,
      meanWeight: alive ? sum / alive : 0,
      strongEdges: strong,
      firesPerSec: this.fireTimes.length,
      pulses: this.pulses.length,
      fps: this.fps,
    };
  }
}
