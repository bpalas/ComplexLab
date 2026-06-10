// ============================================================================
// Motor de Q-learning tabular — "La caza del rey".
// Un caballo (agente) aprende por ensayo y error a capturar a un rey que se
// mueve al azar en un tablero 5×5. Entorno estocástico, episódico.
//
//   estado  s  = (casilla del caballo, casilla del rey)  → 25 × 25 = 625
//   acción  a  = uno de los 8 saltos de caballo (se enmascaran los ilegales)
//   recompensa: +10 captura · −10 si el rey come al caballo · −0.1 por paso
//
//   Actualización (Bellman / Q-learning):
//     δ = r + γ·max_a' Q(s',a') − Q(s,a)        ← error de diferencia temporal
//     Q(s,a) ← Q(s,a) + α·δ                     ← descenso sobre L = ½δ²
//
// Puro y determinista con rng inyectable: la UI lo consume paso a paso.
// ============================================================================

export const BOARD = 5;
export const N_CELLS = BOARD * BOARD;
export const N_STATES = N_CELLS * N_CELLS;
export const MAX_MOVES = 40;

export const R_CAPTURE = 10;
export const R_CAUGHT = -10;
export const R_STEP = -0.1;

/** Los 8 saltos de caballo: (dx, dy). El índice es la acción. */
export const KNIGHT_MOVES: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];

/** Los 8 pasos de rey + quedarse quieto. */
const KING_MOVES: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];

export interface RLParams {
  alpha: number; // tasa de aprendizaje α
  gamma: number; // factor de descuento γ
  epsilon0: number; // exploración inicial ε₀
  epsilonDecay: number; // decaimiento multiplicativo de ε por episodio
  epsilonMin: number; // suelo de exploración
}

export const DEFAULT_RL: RLParams = {
  alpha: 0.3,
  gamma: 0.9,
  epsilon0: 1.0,
  epsilonDecay: 0.995,
  epsilonMin: 0.05,
};

/** Última actualización de Q, expuesta para el panel de matemáticas en vivo. */
export interface UpdateDetail {
  state: number;
  action: number;
  reward: number;
  qBefore: number;
  maxNext: number; // max_a' Q(s',a') — 0 si s' es terminal
  delta: number; // error TD δ
  qAfter: number;
  terminal: boolean;
  explored: boolean; // la acción salió del dado (exploración), no de la tabla
}

export type EpisodeEnd = 'captura' | 'comido' | 'agotado';

export interface EpisodeStat {
  ret: number; // retorno G₀ = Σ r (sin descontar, para la curva)
  length: number;
  meanAbsDelta: number; // |δ| medio del episodio — proxy de la pérdida
  epsilon: number;
  end: EpisodeEnd;
}

const MAX_STATS = 5000;

export function cellOf(x: number, y: number): number {
  return y * BOARD + x;
}

export function xyOf(cell: number): [number, number] {
  return [cell % BOARD, Math.floor(cell / BOARD)];
}

function stateOf(knight: number, king: number): number {
  return knight * N_CELLS + king;
}

/** PRNG determinista (mulberry32) para reproducibilidad en tests. */
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ChessRLEngine {
  q = new Float32Array(N_STATES * KNIGHT_MOVES.length);
  episode = 0;
  knight = 0;
  king = 0;
  moves = 0;
  trail: number[] = [];
  stats: EpisodeStat[] = [];
  lastUpdate: UpdateDetail | null = null;
  totalUpdates = 0;

  private rng: () => number;
  private epReturn = 0;
  private epAbsDelta = 0;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
    this.resetEpisode();
  }

  /** Borra todo lo aprendido y vuelve al episodio 0. */
  reset(): void {
    this.q.fill(0);
    this.stats = [];
    this.episode = 0;
    this.lastUpdate = null;
    this.totalUpdates = 0;
    this.resetEpisode();
  }

  /** ε del episodio actual: decaimiento exponencial con suelo. */
  epsilon(p: RLParams): number {
    return Math.max(p.epsilonMin, p.epsilon0 * Math.pow(p.epsilonDecay, this.episode));
  }

  /** Coloca caballo y rey en casillas aleatorias distintas y no adyacentes. */
  resetEpisode(): void {
    this.knight = Math.floor(this.rng() * N_CELLS);
    do {
      this.king = Math.floor(this.rng() * N_CELLS);
    } while (this.king === this.knight || this.adjacent(this.knight, this.king));
    this.moves = 0;
    this.epReturn = 0;
    this.epAbsDelta = 0;
    this.trail = [this.knight];
  }

  private adjacent(a: number, b: number): boolean {
    const [ax, ay] = xyOf(a);
    const [bx, by] = xyOf(b);
    return Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1;
  }

  /** Acciones legales del caballo desde una casilla (índices en KNIGHT_MOVES). */
  legalActions(cell: number): number[] {
    const [x, y] = xyOf(cell);
    const out: number[] = [];
    for (let a = 0; a < KNIGHT_MOVES.length; a++) {
      const nx = x + KNIGHT_MOVES[a][0];
      const ny = y + KNIGHT_MOVES[a][1];
      if (nx >= 0 && nx < BOARD && ny >= 0 && ny < BOARD) out.push(a);
    }
    return out;
  }

  qValue(knight: number, king: number, action: number): number {
    return this.q[stateOf(knight, king) * KNIGHT_MOVES.length + action];
  }

  /** V(s) = max_a Q(s,a) sobre acciones legales. */
  valueOf(knight: number, king: number): number {
    const legal = this.legalActions(knight);
    let best = -Infinity;
    for (const a of legal) best = Math.max(best, this.qValue(knight, king, a));
    return best;
  }

  /** Acción codiciosa (greedy) con desempate aleatorio. */
  bestAction(knight: number, king: number): number {
    const legal = this.legalActions(knight);
    let best = -Infinity;
    let ties: number[] = [];
    for (const a of legal) {
      const v = this.qValue(knight, king, a);
      if (v > best + 1e-9) {
        best = v;
        ties = [a];
      } else if (v > best - 1e-9) {
        ties.push(a);
      }
    }
    return ties[Math.floor(this.rng() * ties.length)];
  }

  /**
   * Un paso completo de interacción: el caballo elige (ε-greedy), el entorno
   * responde (el rey da un paso al azar) y se actualiza Q. Devuelve cómo
   * terminó el episodio, o null si sigue en curso.
   */
  stepMove(p: RLParams): EpisodeEnd | null {
    const s = stateOf(this.knight, this.king);
    const eps = this.epsilon(p);
    const explored = this.rng() < eps;
    const action = explored
      ? this.legalActions(this.knight)[
          Math.floor(this.rng() * this.legalActions(this.knight).length)
        ]
      : this.bestAction(this.knight, this.king);

    const [x, y] = xyOf(this.knight);
    const nextKnight = cellOf(x + KNIGHT_MOVES[action][0], y + KNIGHT_MOVES[action][1]);

    let reward = R_STEP;
    let end: EpisodeEnd | null = null;
    let nextKing = this.king;

    if (nextKnight === this.king) {
      // ¡Jaque al estilo cazador: el caballo cae sobre el rey!
      reward += R_CAPTURE;
      end = 'captura';
    } else {
      // Respuesta del entorno: el rey da un paso legal al azar (o se queda).
      const [kx, ky] = xyOf(this.king);
      const options: number[] = [];
      for (const [dx, dy] of KING_MOVES) {
        const nx = kx + dx;
        const ny = ky + dy;
        if (nx >= 0 && nx < BOARD && ny >= 0 && ny < BOARD) options.push(cellOf(nx, ny));
      }
      nextKing = options[Math.floor(this.rng() * options.length)];
      if (nextKing === nextKnight) {
        // El rey pisó al caballo: pieza perdida.
        reward += R_CAUGHT;
        end = 'comido';
      } else if (this.moves + 1 >= MAX_MOVES) {
        end = 'agotado';
      }
    }

    // ---- Actualización Q-learning -----------------------------------------
    const idx = s * KNIGHT_MOVES.length + action;
    const qBefore = this.q[idx];
    const maxNext = end ? 0 : this.valueOf(nextKnight, nextKing);
    const delta = reward + p.gamma * maxNext - qBefore;
    const qAfter = qBefore + p.alpha * delta;
    this.q[idx] = qAfter;
    this.totalUpdates++;
    this.lastUpdate = {
      state: s,
      action,
      reward,
      qBefore,
      maxNext,
      delta,
      qAfter,
      terminal: end !== null,
      explored,
    };

    // ---- Avance del mundo ---------------------------------------------------
    this.knight = nextKnight;
    this.king = nextKing;
    this.moves++;
    this.trail.push(nextKnight);
    if (this.trail.length > 14) this.trail.shift();
    this.epReturn += reward;
    this.epAbsDelta += Math.abs(delta);

    if (end) {
      this.stats.push({
        ret: this.epReturn,
        length: this.moves,
        meanAbsDelta: this.epAbsDelta / this.moves,
        epsilon: eps,
        end,
      });
      if (this.stats.length > MAX_STATS) this.stats.splice(0, this.stats.length - MAX_STATS);
      this.episode++;
      this.resetEpisode();
    }
    return end;
  }

  /** Ejecuta un episodio completo de principio a fin. */
  runEpisode(p: RLParams): EpisodeEnd {
    let end: EpisodeEnd | null = null;
    while (end === null) end = this.stepMove(p);
    return end;
  }

  /** Media del retorno en los últimos n episodios. */
  meanReturn(n: number): number {
    const slice = this.stats.slice(-n);
    if (!slice.length) return 0;
    return slice.reduce((acc, s) => acc + s.ret, 0) / slice.length;
  }

  /** Tasa de capturas en los últimos n episodios. */
  captureRate(n: number): number {
    const slice = this.stats.slice(-n);
    if (!slice.length) return 0;
    return slice.filter((s) => s.end === 'captura').length / slice.length;
  }
}
