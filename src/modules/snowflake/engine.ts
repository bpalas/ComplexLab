/**
 * Crecimiento de copos de nieve — modelo de Reiter (1990) sobre red hexagonal.
 *
 * La química impone la geometría: cada molécula de H₂O forma 4 enlaces de
 * hidrógeno y, al congelarse, el empaquetamiento de mínima energía es una red
 * cristalina hexagonal (hielo Ih). Por eso TODO copo tiene simetría de orden 6.
 * Aquí cada celda es una "parcela" de esa red con una cantidad de agua s:
 * s ≥ 1 significa hielo.
 *
 * Por qué ningún copo es igual: la forma del crecimiento (placas vs dendritas)
 * depende de la temperatura y la sobresaturación de vapor (diagrama de Nakaya).
 * Mientras cae, el cristal atraviesa capas de aire distintas; ese "viaje
 * atmosférico" — aquí una deriva aleatoria de β y γ — es irrepetible, pero
 * afecta por igual a las seis ramas: único Y simétrico a la vez.
 */

export interface SnowParams {
  alpha: number; // difusión del vapor entre celdas (conductividad)
  beta: number; // humedad de fondo: agua inicial / del borde del mundo
  gamma: number; // deposición: vapor que se suma a celdas receptivas
}

export interface SnowStats {
  step: number;
  frozen: number;
  /** Radio del cristal en celdas, desde el centro. */
  radius: number;
  /** β y γ vigentes (con el viaje atmosférico activan su deriva). */
  beta: number;
  gamma: number;
  done: boolean;
}

export const DEFAULT_SNOW: SnowParams = {
  alpha: 1.0,
  beta: 0.55,
  gamma: 0.006,
};

/** Vecindario axial de la red hexagonal. */
const NEIGH: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
];

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SnowflakeEngine {
  readonly R: number; // radio del mundo hexagonal en celdas
  private readonly W: number; // ancho del array (2R+1)
  s: Float32Array; // agua por celda; s ≥ 1 = hielo
  private u: Float32Array; // partición no receptiva (difunde)
  private valid: Uint8Array; // 1 si la celda pertenece al hexágono
  private receptive: Uint8Array;
  private edge: Uint8Array; // borde del mundo: reservorio de vapor

  /** Viaje atmosférico: deriva aleatoria de β y γ mientras el copo "cae". */
  journey = true;
  seed: number;

  stepCount = 0;
  done = false;
  private curBeta: number;
  private curGamma: number;
  private rng: () => number;
  private iceRadius = 0;

  constructor(R = 90, seed = 1) {
    this.R = R;
    this.W = 2 * R + 1;
    const size = this.W * this.W;
    this.s = new Float32Array(size);
    this.u = new Float32Array(size);
    this.valid = new Uint8Array(size);
    this.receptive = new Uint8Array(size);
    this.edge = new Uint8Array(size);
    this.seed = seed;
    this.curBeta = DEFAULT_SNOW.beta;
    this.curGamma = DEFAULT_SNOW.gamma;
    this.rng = mulberry32(seed);

    for (let q = -R; q <= R; q++) {
      for (let r = -R; r <= R; r++) {
        const d = SnowflakeEngine.hexDist(q, r);
        if (d <= R) {
          const k = this.idx(q, r);
          this.valid[k] = 1;
          if (d >= R - 1) this.edge[k] = 1;
        }
      }
    }
    this.reset(DEFAULT_SNOW, seed);
  }

  idx(q: number, r: number): number {
    return (q + this.R) * this.W + (r + this.R);
  }

  static hexDist(q: number, r: number): number {
    return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
  }

  reset(p: SnowParams, seed: number): void {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.stepCount = 0;
    this.done = false;
    this.iceRadius = 0;
    this.curBeta = p.beta;
    this.curGamma = p.gamma;
    for (let k = 0; k < this.s.length; k++) {
      this.s[k] = this.valid[k] ? p.beta : 0;
    }
    // Semilla: una celda congelada en el centro de la red
    this.s[this.idx(0, 0)] = 1;
  }

  /** Un paso del modelo de Reiter. */
  step(p: SnowParams): void {
    if (this.done) return;
    const { s, u, valid, receptive, edge, W, R } = this;

    // Deriva del viaje: el copo atraviesa capas de aire distintas.
    // La deriva es GLOBAL: cambia la forma, no rompe la simetría.
    if (this.journey) {
      this.curBeta = clamp(this.curBeta + (this.rng() - 0.5) * 0.02, 0.3, 0.9);
      this.curGamma = clamp(this.curGamma + (this.rng() - 0.5) * 0.0012, 0.0001, 0.015);
    } else {
      this.curBeta = p.beta;
      this.curGamma = p.gamma;
    }
    const gamma = this.curGamma;

    // 1) Receptiva = congelada o vecina de congelada
    for (let q = -R; q <= R; q++) {
      for (let r = -R; r <= R; r++) {
        const k = q * W + r + R * W + R;
        if (!valid[k]) continue;
        let rec = s[k] >= 1 ? 1 : 0;
        if (!rec) {
          for (let n = 0; n < 6; n++) {
            const nq = q + NEIGH[n][0];
            const nr = r + NEIGH[n][1];
            if (SnowflakeEngine.hexDist(nq, nr) > R) continue;
            if (s[this.idx(nq, nr)] >= 1) {
              rec = 1;
              break;
            }
          }
        }
        receptive[k] = rec;
        u[k] = rec ? 0 : s[k]; // solo el agua no receptiva difunde
      }
    }

    // 2) Difusión de u + deposición γ en receptivas
    const half = p.alpha / 12; // α/2 · (media de 6 vecinos)
    for (let q = -R; q <= R; q++) {
      for (let r = -R; r <= R; r++) {
        const k = q * W + r + R * W + R;
        if (!valid[k]) continue;
        let sum = 0;
        for (let n = 0; n < 6; n++) {
          const nq = q + NEIGH[n][0];
          const nr = r + NEIGH[n][1];
          // Fuera del mundo: reservorio a humedad β (el aire circundante)
          sum += SnowflakeEngine.hexDist(nq, nr) > R ? this.curBeta : u[this.idx(nq, nr)];
        }
        let val = (receptive[k] ? s[k] + gamma : 0) + u[k] + half * (sum - 6 * u[k]);
        if (edge[k]) val = Math.max(val, this.curBeta);
        this.s[k] = val;
      }
    }

    this.stepCount++;

    // Radio del hielo; el cristal está completo cuando toca el borde
    if (this.stepCount % 10 === 0) {
      let maxD = 0;
      for (let q = -R; q <= R; q++) {
        for (let r = -R; r <= R; r++) {
          const k = q * W + r + R * W + R;
          if (valid[k] && s[k] >= 1) {
            const d = SnowflakeEngine.hexDist(q, r);
            if (d > maxD) maxD = d;
          }
        }
      }
      this.iceRadius = maxD;
      if (maxD >= R - 3) this.done = true;
    }
  }

  stats(): SnowStats {
    let frozen = 0;
    for (let k = 0; k < this.s.length; k++) {
      if (this.valid[k] && this.s[k] >= 1) frozen++;
    }
    return {
      step: this.stepCount,
      frozen,
      radius: this.iceRadius,
      beta: this.curBeta,
      gamma: this.curGamma,
      done: this.done,
    };
  }

  /**
   * Huella del cristal: lista de celdas congeladas. Dos copos con viajes
   * distintos producen huellas distintas — la base de "ninguno es igual".
   */
  fingerprint(): string {
    const out: number[] = [];
    for (let k = 0; k < this.s.length; k++) {
      if (this.valid[k] && this.s[k] >= 1) out.push(k);
    }
    return out.join(',');
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = '#0b1018';
    ctx.fillRect(0, 0, w, h);
    const { R, s, valid } = this;
    const SQ3 = Math.sqrt(3);
    // Tamaño de celda para que el hexágono completo quepa en el lienzo
    const size = Math.min(w, h) / 2 / (R * SQ3 + 2);
    const cx = w / 2;
    const cy = h / 2;
    const px = Math.max(1.2, size * SQ3 * 0.95);

    for (let q = -R; q <= R; q++) {
      for (let r = -R; r <= R; r++) {
        const k = this.idx(q, r);
        if (!valid[k]) continue;
        const v = s[k];
        if (v < 1) continue;
        const x = cx + size * (SQ3 * q + (SQ3 / 2) * r);
        const y = cy + size * 1.5 * r;
        // Hielo más grueso = más blanco; hielo nuevo = azul glaciar
        const t = Math.min(1, (v - 1) * 0.9);
        const ch = Math.round(170 + t * 85);
        ctx.fillStyle = `rgb(${Math.round(120 + t * 135)},${ch},255)`;
        ctx.fillRect(x - px / 2, y - px / 2, px, px);
      }
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
