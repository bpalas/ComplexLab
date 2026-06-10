// ============================================================================
// Motor de autómata celular elemental (Wolfram) — 1D, vecindario de 3 células,
// frontera toroidal. Puro y determinista: la UI lo consume fila a fila.
// ============================================================================

export type SeedMode = 'single' | 'random';

export class ElementaryCA {
  rule: number;
  cells: Uint8Array;
  generation = 0;

  constructor(size: number, rule: number) {
    this.cells = new Uint8Array(size);
    this.rule = rule & 255;
    this.setSeed('single');
  }

  setRule(n: number): void {
    this.rule = n & 255;
  }

  /** Invierte la transición i (0..7), donde i = l·4 + c·2 + r. */
  toggleRuleBit(i: number): void {
    this.rule ^= 1 << i;
  }

  ruleBit(i: number): 0 | 1 {
    return ((this.rule >> i) & 1) as 0 | 1;
  }

  /** rng inyectable para reproducibilidad en tests. */
  setSeed(mode: SeedMode, density = 0.5, rng: () => number = Math.random): void {
    this.generation = 0;
    this.cells.fill(0);
    if (mode === 'single') {
      this.cells[this.cells.length >> 1] = 1;
    } else {
      for (let i = 0; i < this.cells.length; i++) {
        this.cells[i] = rng() < density ? 1 : 0;
      }
    }
  }

  /** Avanza una generación y devuelve la fila nueva. */
  step(): Uint8Array {
    const n = this.cells.length;
    const next = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const l = this.cells[(i - 1 + n) % n];
      const c = this.cells[i];
      const r = this.cells[(i + 1) % n];
      next[i] = ((this.rule >> ((l << 2) | (c << 1) | r)) & 1) as 0 | 1;
    }
    this.cells = next;
    this.generation++;
    return next;
  }
}
