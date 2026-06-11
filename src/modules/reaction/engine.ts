/**
 * Reacción-Difusión — modelo de Gray-Scott (patrones de Turing).
 *
 * Dos sustancias químicas conviven en una rejilla:
 *   U = "reactivo" (se alimenta desde fuera a tasa f)
 *   V = "autocatalizador" (se reproduce consumiendo U)
 * La reacción es U + 2V → 3V: una V convierte dos U en más V.
 *
 * Turing (1952) demostró que dos químicos que solo difunden y reaccionan
 * bastan para que aparezcan patrones estables — manchas, rayas, laberintos —
 * sin ningún plano previo. Es la hipótesis química de la morfogénesis: por qué
 * el leopardo tiene manchas y la cebra rayas. La clave es que V difunde más
 * lento que U (Du > Dv): la "inhibición de largo alcance" esculpe el patrón.
 */

export interface RDParams {
  feed: number; // f — tasa de alimentación de U
  kill: number; // k — tasa de eliminación de V
  du: number; // difusión de U (rápida)
  dv: number; // difusión de V (lenta)
}

export interface RDStats {
  fps: number;
  step: number;
  /** Fracción de la rejilla "activada" (V por encima de umbral). */
  coverage: number;
}

export interface RDPreset {
  key: string;
  name: string;
  hint: string;
  /** Lectura biológica del régimen: qué animal/estructura usa este (f,k). */
  bio: string;
  feed: number;
  kill: number;
}

/**
 * Desglose instantáneo de los términos de las EDPs en una celda concreta.
 * Es una lectura pura del estado actual — no avanza la simulación. Conecta
 * cada píxel del patrón con las dos ecuaciones evaluándose en ese punto.
 */
export interface RDTermBreakdown {
  u: number; // concentración U en la celda
  v: number; // concentración V en la celda
  // términos instantáneos de ∂U/∂t
  uDiffusion: number; // Dᵤ ∇²U
  uReaction: number; // − U·V²
  uFeed: number; // f·(1 − U)
  duDt: number; // suma de los tres
  // términos instantáneos de ∂V/∂t
  vDiffusion: number; // Dᵥ ∇²V
  vReaction: number; // + U·V²
  vDecay: number; // − (k + f)·V
  dvDt: number; // suma de los tres
}

/** Puntos célebres del espacio (f, k) de Gray-Scott. */
export const RD_PRESETS: RDPreset[] = [
  { key: 'mitosis', name: 'Mitosis', hint: 'células que se dividen', bio: 'células dividiéndose', feed: 0.0367, kill: 0.0649 },
  { key: 'coral', name: 'Coral', hint: 'ramas que crecen', bio: 'coral, dendritas', feed: 0.0545, kill: 0.062 },
  { key: 'laberinto', name: 'Laberinto', hint: 'rayas de cebra', bio: 'cebra, pez cirujano, huellas', feed: 0.029, kill: 0.057 },
  { key: 'lunares', name: 'Lunares', hint: 'manchas de leopardo', bio: 'manchas de leopardo', feed: 0.03, kill: 0.062 },
  { key: 'gusanos', name: 'Gusanos', hint: 'serpientes vivas', bio: 'serpientes vivas', feed: 0.078, kill: 0.061 },
  { key: 'jirafa', name: 'Jirafa', hint: 'parches poligonales', bio: 'parches de jirafa', feed: 0.039, kill: 0.058 },
];

/** Una región del mapa f–k del zoo de Turing. Fronteras ilustrativas. */
export interface RDRegion {
  key: string;
  name: string;
  bio: string;
  feed: number; // centro f
  kill: number; // centro k
}

/**
 * Regiones del plano (f,k) por las que viaja el patrón. Cada centro coincide
 * con un preset; la clasificación es por cercanía (Voronoi escalado), pensada
 * como mapa didáctico, no como una frontera rigurosa.
 */
export const RD_REGIONS: RDRegion[] = RD_PRESETS.map((p) => ({
  key: p.key,
  name: p.name,
  bio: p.bio,
  feed: p.feed,
  kill: p.kill,
}));

/**
 * Clasifica un punto (f,k) en la región del zoo de Turing más cercana.
 * Función pura: la usan el PhaseMap (para etiquetar) y los tests.
 * k se escala porque su rango útil es ~10× más estrecho que el de f.
 */
export function classifyRegion(feed: number, kill: number): RDRegion {
  const K_SCALE = 4; // pondera k para que pese parecido a f en la distancia
  let best = RD_REGIONS[0];
  let bestD = Infinity;
  for (const r of RD_REGIONS) {
    const df = feed - r.feed;
    const dk = (kill - r.kill) * K_SCALE;
    const d = df * df + dk * dk;
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

export const DEFAULT_RD: RDParams = {
  feed: RD_PRESETS[0].feed,
  kill: RD_PRESETS[0].kill,
  du: 0.16,
  dv: 0.08,
};

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ReactionDiffusion {
  readonly W: number;
  readonly H: number;
  u: Float32Array;
  v: Float32Array;
  private u2: Float32Array;
  private v2: Float32Array;
  private rng: () => number;

  brush = { x: -1, y: -1, active: false, radius: 6 };

  stepCount = 0;
  private fps = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;

  constructor(w = 200, h = 150, seed = 1) {
    this.W = w;
    this.H = h;
    const n = w * h;
    this.u = new Float32Array(n);
    this.v = new Float32Array(n);
    this.u2 = new Float32Array(n);
    this.v2 = new Float32Array(n);
    this.rng = mulberry32(seed);
    this.reset(seed);
  }

  /** Estado base: todo U=1, V=0, con unas semillas de V para arrancar. */
  reset(seed = 1): void {
    this.rng = mulberry32(seed);
    this.stepCount = 0;
    const { W, H, u, v } = this;
    u.fill(1);
    v.fill(0);
    // Tres parches de V en posiciones deterministas según la semilla
    const patches = 3;
    for (let p = 0; p < patches; p++) {
      const cx = Math.floor((0.25 + 0.5 * this.rng()) * W);
      const cy = Math.floor((0.25 + 0.5 * this.rng()) * H);
      this.seedAt(cx, cy, 6);
    }
  }

  /** Inyecta V (y baja U) en un disco — usado por la semilla y el pincel. */
  seedAt(cx: number, cy: number, radius: number): void {
    const { W, H, u, v } = this;
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const k = y * W + x;
        u[k] = 0.5;
        v[k] = 0.25;
      }
    }
  }

  /** Laplaciano de 9 puntos con frontera toroidal. */
  private laplace(arr: Float32Array, x: number, y: number): number {
    const { W, H } = this;
    const xm = (x - 1 + W) % W;
    const xp = (x + 1) % W;
    const ym = (y - 1 + H) % H;
    const yp = (y + 1) % H;
    const c = y * W + x;
    const ortho = arr[y * W + xm] + arr[y * W + xp] + arr[ym * W + x] + arr[yp * W + x];
    const diag = arr[ym * W + xm] + arr[ym * W + xp] + arr[yp * W + xm] + arr[yp * W + xp];
    return ortho * 0.2 + diag * 0.05 - arr[c];
  }

  /**
   * Lee los términos instantáneos de las dos EDPs en la celda (x,y) sin
   * avanzar el estado. Reutiliza el mismo cálculo que `update`, por lo que
   * `duDt` coincide con el incremento real de U en un paso (y análogo para V).
   * Fuera de la rejilla devuelve `null`.
   */
  probe(x: number, y: number, p: RDParams): RDTermBreakdown | null {
    const { W, H, u, v } = this;
    if (x < 0 || x >= W || y < 0 || y >= H) return null;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const k = yi * W + xi;
    const uu = u[k];
    const vv = v[k];
    const uvv = uu * vv * vv; // reacción U + 2V → 3V
    const uDiffusion = p.du * this.laplace(u, xi, yi);
    const uReaction = -uvv;
    const uFeed = p.feed * (1 - uu);
    const vDiffusion = p.dv * this.laplace(v, xi, yi);
    const vReaction = uvv;
    const vDecay = -(p.kill + p.feed) * vv;
    return {
      u: uu,
      v: vv,
      uDiffusion,
      uReaction,
      uFeed,
      duDt: uDiffusion + uReaction + uFeed,
      vDiffusion,
      vReaction,
      vDecay,
      dvDt: vDiffusion + vReaction + vDecay,
    };
  }

  /** Avanza `iters` iteraciones de Euler del sistema de Gray-Scott. */
  update(dt: number, p: RDParams, iters: number): void {
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fps = this.fpsFrames / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }

    const { W, H } = this;
    for (let it = 0; it < iters; it++) {
      let { u, v, u2, v2 } = this;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const k = y * W + x;
          const uu = u[k];
          const vv = v[k];
          const uvv = uu * vv * vv; // reacción U + 2V → 3V
          u2[k] = uu + (p.du * this.laplace(u, x, y) - uvv + p.feed * (1 - uu));
          v2[k] = vv + (p.dv * this.laplace(v, x, y) + uvv - (p.kill + p.feed) * vv);
        }
      }
      // Doble buffer: el nuevo estado pasa a ser el actual
      this.u = u2;
      this.v = v2;
      this.u2 = u;
      this.v2 = v;
      this.stepCount++;
    }

    if (this.brush.active && this.brush.x >= 0) {
      this.seedAt(Math.round(this.brush.x), Math.round(this.brush.y), this.brush.radius);
    }
  }

  stats(): RDStats {
    const { v } = this;
    let active = 0;
    for (let k = 0; k < v.length; k++) {
      if (v[k] > 0.2) active++;
    }
    return { fps: this.fps, step: this.stepCount, coverage: active / v.length };
  }

  /** Render a un ImageData: cada celda coloreada según la concentración de V. */
  render(ctx: CanvasRenderingContext2D, img: ImageData): void {
    const { v, u } = this;
    const data = img.data;
    for (let k = 0; k < v.length; k++) {
      // Paleta: fondo profundo → cian → blanco según V
      const c = Math.max(0, Math.min(1, (v[k] - u[k] + 1) * 0.5));
      const t = Math.max(0, Math.min(1, c));
      const p = k * 4;
      data[p] = Math.round(11 + t * t * 244); // R
      data[p + 1] = Math.round(16 + t * 214); // G
      data[p + 2] = Math.round(24 + t * 231); // B
      data[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
}
