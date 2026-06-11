import { describe, expect, it } from 'vitest';
import { GameOfLife, PATTERNS } from './engine';

/** Renderiza la rejilla como strings '·#' para asserts legibles. */
function rows(g: GameOfLife): string[] {
  const out: string[] = [];
  for (let y = 0; y < g.height; y++) {
    let s = '';
    for (let x = 0; x < g.width; x++) s += g.get(x, y) ? '#' : '·';
    out.push(s);
  }
  return out;
}

describe('GameOfLife', () => {
  it('soledad: una célula viva con <2 vecinos muere', () => {
    const g = new GameOfLife(5, 5);
    g.set(2, 2, 1);
    g.step();
    expect(g.population).toBe(0);
  });

  it('superpoblación: el centro de un cuadrado 3×3 lleno muere', () => {
    const g = new GameOfLife(7, 7);
    for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) g.set(x, y, 1);
    g.step();
    expect(g.get(3, 3)).toBe(0); // 8 vecinos → muere
  });

  it('supervivencia: el bloque 2×2 es una naturaleza muerta', () => {
    const g = new GameOfLife(6, 6);
    g.set(2, 2, 1);
    g.set(3, 2, 1);
    g.set(2, 3, 1);
    g.set(3, 3, 1);
    const before = rows(g);
    g.step();
    expect(rows(g)).toEqual(before);
    expect(g.population).toBe(4);
  });

  it('reproducción: el blinker oscila con periodo 2', () => {
    const g = new GameOfLife(5, 5);
    g.set(1, 2, 1);
    g.set(2, 2, 1);
    g.set(3, 2, 1);
    g.step();
    expect(rows(g)).toEqual(['·····', '··#··', '··#··', '··#··', '·····']);
    g.step();
    expect(rows(g)).toEqual(['·····', '·····', '·###·', '·····', '·····']);
    expect(g.generation).toBe(2);
  });

  it('el glider se desplaza (1,1) cada 4 generaciones', () => {
    const g = new GameOfLife(12, 12);
    const glider = PATTERNS.find((p) => p.name === 'Glider')!;
    g.stamp(glider, 2, 2);
    const before = rows(g);
    for (let i = 0; i < 4; i++) g.step();
    // El patrón desplazado en (+1, +1) debe coincidir con el original.
    const after = rows(g);
    const shifted = before.map((_, y) => {
      const src = before[(y - 1 + 12) % 12];
      return src[11] + src.slice(0, 11);
    });
    expect(after).toEqual(shifted);
    expect(g.population).toBe(5);
  });

  it('la frontera es toroidal: el glider envuelve los bordes', () => {
    const g = new GameOfLife(8, 8);
    const glider = PATTERNS.find((p) => p.name === 'Glider')!;
    g.stamp(glider, 5, 5);
    // 8×4 = 32 generaciones ⇒ desplazamiento (8, 8) ≡ vuelta completa al origen.
    const before = rows(g);
    for (let i = 0; i < 32; i++) g.step();
    expect(rows(g)).toEqual(before);
  });

  it('randomize respeta la densidad con rng inyectado y resetea la generación', () => {
    const g = new GameOfLife(2, 2);
    g.step();
    const seq = [0.1, 0.9, 0.2, 0.8];
    let k = 0;
    g.randomize(0.5, () => seq[k++]);
    expect(g.generation).toBe(0);
    expect(rows(g)).toEqual(['#·', '#·']);
    expect(g.population).toBe(2);
  });

  it('toggle y population se mantienen consistentes', () => {
    const g = new GameOfLife(4, 4);
    g.toggle(1, 1);
    expect(g.population).toBe(1);
    g.toggle(1, 1);
    expect(g.population).toBe(0);
  });

  it('stamp envuelve patrones que cruzan el borde', () => {
    const g = new GameOfLife(10, 10);
    const glider = PATTERNS.find((p) => p.name === 'Glider')!;
    g.stamp(glider, 9, 9);
    expect(g.population).toBe(5);
  });
});
