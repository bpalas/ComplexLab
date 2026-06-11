// ============================================================================
// Motor del Juego de la Vida de Conway — 2D, vecindario de Moore (8 vecinos),
// frontera toroidal. Puro y determinista: la UI lo consume rejilla a rejilla.
//
// Reglas (B3/S23):
//   Soledad:        viva con <2 vecinos vivos → muere.
//   Superpoblación: viva con >3 vecinos vivos → muere.
//   Supervivencia:  viva con 2 o 3 vecinos vivos → sigue viva.
//   Reproducción:   muerta con exactamente 3 vecinos vivos → nace.
// ============================================================================

export interface Pattern {
  name: string;
  /** Pista corta para la UI. */
  hint: string;
  /** Coordenadas (x, y) de las células vivas, relativas a la esquina superior izquierda. */
  cells: ReadonlyArray<readonly [number, number]>;
}

/** Patrones canónicos del bestiario de Conway. */
export const PATTERNS: readonly Pattern[] = [
  {
    name: 'Glider',
    hint: 'el «monstruo» que camina en diagonal',
    cells: [
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ],
  },
  {
    name: 'Pulsar',
    hint: 'oscilador de periodo 3',
    cells: pulsarCells(),
  },
  {
    name: 'R-pentominó',
    hint: '5 células → 1103 generaciones de caos',
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  },
  {
    name: 'Cañón de Gosper',
    hint: 'fábrica infinita de gliders',
    cells: [
      [24, 0],
      [22, 1], [24, 1],
      [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2],
      [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3],
      [0, 4], [1, 4], [10, 4], [16, 4], [20, 4], [21, 4],
      [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5], [22, 5], [24, 5],
      [10, 6], [16, 6], [24, 6],
      [11, 7], [15, 7],
      [12, 8], [13, 8],
    ],
  },
];

function pulsarCells(): ReadonlyArray<readonly [number, number]> {
  // El pulsar es simétrico en los 4 cuadrantes: se genera desde un cuadrante.
  const quad: Array<[number, number]> = [
    [2, 0], [3, 0], [4, 0],
    [0, 2], [5, 2],
    [0, 3], [5, 3],
    [0, 4], [5, 4],
    [2, 5], [3, 5], [4, 5],
  ];
  const cells: Array<[number, number]> = [];
  for (const [x, y] of quad) {
    cells.push([x, y], [12 - x, y], [x, 12 - y], [12 - x, 12 - y]);
  }
  // Dedup de las células en los ejes de simetría
  const seen = new Set<string>();
  return cells.filter(([x, y]) => {
    const k = `${x},${y}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export class GameOfLife {
  readonly width: number;
  readonly height: number;
  cells: Uint8Array;
  generation = 0;
  population = 0;

  private next: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = new Uint8Array(width * height);
    this.next = new Uint8Array(width * height);
  }

  /** Borra todo el universo. */
  clear(): void {
    this.cells.fill(0);
    this.generation = 0;
    this.population = 0;
  }

  /** Siembra aleatoria; rng inyectable para reproducibilidad en tests. */
  randomize(density = 0.3, rng: () => number = Math.random): void {
    this.generation = 0;
    let pop = 0;
    for (let i = 0; i < this.cells.length; i++) {
      const alive = rng() < density ? 1 : 0;
      this.cells[i] = alive;
      pop += alive;
    }
    this.population = pop;
  }

  get(x: number, y: number): 0 | 1 {
    return this.cells[y * this.width + x] as 0 | 1;
  }

  set(x: number, y: number, alive: 0 | 1): void {
    const i = y * this.width + x;
    if (this.cells[i] !== alive) {
      this.population += alive ? 1 : -1;
      this.cells[i] = alive;
    }
  }

  toggle(x: number, y: number): void {
    this.set(x, y, this.get(x, y) ? 0 : 1);
  }

  /** Estampa un patrón con su esquina superior izquierda en (ox, oy), con envoltura toroidal. */
  stamp(pattern: Pattern, ox: number, oy: number): void {
    for (const [px, py] of pattern.cells) {
      const x = (((ox + px) % this.width) + this.width) % this.width;
      const y = (((oy + py) % this.height) + this.height) % this.height;
      this.set(x, y, 1);
    }
  }

  /** Avanza una generación aplicando B3/S23 con frontera toroidal. */
  step(): void {
    const w = this.width;
    const h = this.height;
    const cur = this.cells;
    const nxt = this.next;
    let pop = 0;
    for (let y = 0; y < h; y++) {
      const yu = ((y - 1 + h) % h) * w;
      const yc = y * w;
      const yd = ((y + 1) % h) * w;
      for (let x = 0; x < w; x++) {
        const xl = (x - 1 + w) % w;
        const xr = (x + 1) % w;
        const n =
          cur[yu + xl] + cur[yu + x] + cur[yu + xr] +
          cur[yc + xl] + cur[yc + xr] +
          cur[yd + xl] + cur[yd + x] + cur[yd + xr];
        // B3/S23: nace con 3, sobrevive con 2 o 3.
        const alive = n === 3 || (n === 2 && cur[yc + x] === 1) ? 1 : 0;
        nxt[yc + x] = alive;
        pop += alive;
      }
    }
    this.next = cur;
    this.cells = nxt;
    this.population = pop;
    this.generation++;
  }
}
