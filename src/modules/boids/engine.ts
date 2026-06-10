/**
 * Boids / Flocking (Reynolds, 1987).
 * Tres reglas locales por agente — separación, alineación, cohesión —
 * sin líder ni plan global. La bandada es un fenómeno emergente.
 * Frontera toroidal (el mundo envuelve), igual que el autómata celular.
 */

export interface BoidsParams {
  separation: number; // peso de la regla de separación
  alignment: number; // peso de la regla de alineación
  cohesion: number; // peso de la regla de cohesión
  perception: number; // radio de percepción (px)
  maxSpeed: number; // rapidez máxima (px/s)
  fear: number; // peso de huida del depredador
}

export interface BoidsStats {
  fps: number;
  count: number;
  /** Polarización Φ ∈ [0,1]: |Σ v̂|/N. 1 = todos alineados, 0 = gas. */
  polarization: number;
  /** Momento angular medio respecto al centroide ∈ [0,1]. Alto = vórtice. */
  milling: number;
  /** Vecinos medios dentro del radio de percepción. */
  meanNeighbors: number;
}

export const DEFAULT_BOIDS: BoidsParams = {
  separation: 1.4,
  alignment: 1.0,
  cohesion: 0.9,
  perception: 70,
  maxSpeed: 160,
  fear: 2.5,
};

const SEP_FRACTION = 0.4; // radio de separación = fracción del de percepción
const PREDATOR_RADIUS = 130; // radio de pánico alrededor del depredador
const MIN_SPEED_FRACTION = 0.45; // los boids nunca se detienen del todo

export class BoidsEngine {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  count: number;

  predator = { x: 0, y: 0, active: false };

  private capacity: number;
  private rng: () => number;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private fps = 0;
  private lastNeighbors = 0;

  constructor(count = 180, rng: () => number = Math.random) {
    this.capacity = 600;
    this.rng = rng;
    this.x = new Float32Array(this.capacity);
    this.y = new Float32Array(this.capacity);
    this.vx = new Float32Array(this.capacity);
    this.vy = new Float32Array(this.capacity);
    this.count = 0;
    this.setCount(count, 900, 600);
  }

  /** Ajusta la población; los nuevos nacen en posiciones aleatorias. */
  setCount(n: number, w: number, h: number): void {
    n = Math.max(1, Math.min(this.capacity, Math.round(n)));
    for (let i = this.count; i < n; i++) {
      this.x[i] = this.rng() * w;
      this.y[i] = this.rng() * h;
      const a = this.rng() * Math.PI * 2;
      const s = 60 + this.rng() * 80;
      this.vx[i] = Math.cos(a) * s;
      this.vy[i] = Math.sin(a) * s;
    }
    this.count = n;
  }

  reset(w: number, h: number): void {
    const n = this.count;
    this.count = 0;
    this.setCount(n, w, h);
  }

  /** Distancia con envoltura toroidal en un eje. */
  private static wrapDelta(d: number, size: number): number {
    if (d > size / 2) return d - size;
    if (d < -size / 2) return d + size;
    return d;
  }

  update(dt: number, p: BoidsParams, w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fps = this.fpsFrames / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }

    const n = this.count;
    const R = p.perception;
    const R2 = R * R;
    const sepR2 = R * SEP_FRACTION * (R * SEP_FRACTION);
    const ax = new Float32Array(n);
    const ay = new Float32Array(n);
    let neighborTotal = 0;

    for (let i = 0; i < n; i++) {
      let cx = 0, cy = 0; // cohesión: centroide local
      let avx = 0, avy = 0; // alineación: velocidad media local
      let sx = 0, sy = 0; // separación: empuje de corto alcance
      let nb = 0;

      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const dx = BoidsEngine.wrapDelta(this.x[j] - this.x[i], w);
        const dy = BoidsEngine.wrapDelta(this.y[j] - this.y[i], h);
        const d2 = dx * dx + dy * dy;
        if (d2 > R2) continue;
        nb++;
        cx += dx;
        cy += dy;
        avx += this.vx[j];
        avy += this.vy[j];
        if (d2 < sepR2 && d2 > 1e-6) {
          const inv = 1 / d2;
          sx -= dx * inv;
          sy -= dy * inv;
        }
      }

      neighborTotal += nb;
      if (nb > 0) {
        const invN = 1 / nb;
        // Cohesión: acelera hacia el centroide local
        ax[i] += cx * invN * p.cohesion * 1.2;
        ay[i] += cy * invN * p.cohesion * 1.2;
        // Alineación: acelera hacia la velocidad media del vecindario
        ax[i] += (avx * invN - this.vx[i]) * p.alignment * 2.0;
        ay[i] += (avy * invN - this.vy[i]) * p.alignment * 2.0;
        // Separación: repulsión 1/d² de los muy cercanos
        ax[i] += sx * p.separation * 2200;
        ay[i] += sy * p.separation * 2200;
      }

      // Depredador: huida radial con caída lineal dentro del radio de pánico
      if (this.predator.active) {
        const dx = BoidsEngine.wrapDelta(this.x[i] - this.predator.x, w);
        const dy = BoidsEngine.wrapDelta(this.y[i] - this.predator.y, h);
        const d = Math.hypot(dx, dy);
        if (d < PREDATOR_RADIUS && d > 1e-3) {
          const k = (1 - d / PREDATOR_RADIUS) * p.fear * 1600;
          ax[i] += (dx / d) * k;
          ay[i] += (dy / d) * k;
        }
      }
    }
    this.lastNeighbors = n > 0 ? neighborTotal / n : 0;

    const maxV = p.maxSpeed;
    const minV = maxV * MIN_SPEED_FRACTION;
    for (let i = 0; i < n; i++) {
      this.vx[i] += ax[i] * dt;
      this.vy[i] += ay[i] * dt;
      const sp = Math.hypot(this.vx[i], this.vy[i]);
      if (sp > maxV) {
        this.vx[i] *= maxV / sp;
        this.vy[i] *= maxV / sp;
      } else if (sp < minV && sp > 1e-6) {
        this.vx[i] *= minV / sp;
        this.vy[i] *= minV / sp;
      }
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      // Frontera toroidal
      if (this.x[i] < 0) this.x[i] += w;
      else if (this.x[i] >= w) this.x[i] -= w;
      if (this.y[i] < 0) this.y[i] += h;
      else if (this.y[i] >= h) this.y[i] -= h;
    }
  }

  stats(w: number, h: number): BoidsStats {
    const n = this.count;
    let px = 0, py = 0;
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) {
      const sp = Math.hypot(this.vx[i], this.vy[i]) || 1;
      px += this.vx[i] / sp;
      py += this.vy[i] / sp;
      mx += this.x[i];
      my += this.y[i];
    }
    mx /= n;
    my /= n;
    let mill = 0;
    for (let i = 0; i < n; i++) {
      const rx = BoidsEngine.wrapDelta(this.x[i] - mx, w);
      const ry = BoidsEngine.wrapDelta(this.y[i] - my, h);
      const r = Math.hypot(rx, ry);
      const sp = Math.hypot(this.vx[i], this.vy[i]);
      if (r > 1e-3 && sp > 1e-3) {
        mill += (rx * this.vy[i] - ry * this.vx[i]) / (r * sp);
      }
    }
    return {
      fps: this.fps,
      count: n,
      polarization: Math.hypot(px, py) / Math.max(1, n),
      milling: Math.abs(mill) / Math.max(1, n),
      meanNeighbors: this.lastNeighbors,
    };
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = '#0b1018';
    ctx.fillRect(0, 0, w, h);

    // Boids como triángulos orientados por su velocidad
    ctx.fillStyle = '#45e6c8';
    for (let i = 0; i < this.count; i++) {
      const a = Math.atan2(this.vy[i], this.vx[i]);
      const x = this.x[i];
      const y = this.y[i];
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(x + ca * 7, y + sa * 7);
      ctx.lineTo(x - ca * 4 - sa * 3.2, y - sa * 4 + ca * 3.2);
      ctx.lineTo(x - ca * 4 + sa * 3.2, y - sa * 4 - ca * 3.2);
      ctx.closePath();
      ctx.fill();
    }

    // Depredador: punto con anillo de pánico
    if (this.predator.active) {
      ctx.strokeStyle = 'rgba(255,93,143,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.predator.x, this.predator.y, PREDATOR_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff5d8f';
      ctx.beginPath();
      ctx.arc(this.predator.x, this.predator.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
