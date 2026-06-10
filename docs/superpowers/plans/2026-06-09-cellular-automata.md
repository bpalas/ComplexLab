# NET·03 Autómatas Celulares — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activar la tarjeta NET·03 con un laboratorio de autómatas celulares elementales 1D (reglas de Wolfram 0–255), con editor de regla bit a bit, reglas destacadas por clase, control de tiempo y tapiz de render incremental.

**Architecture:** Patrón del proyecto: motor puro y determinista en `engine.ts` (sin React) + componente `CellularSim.tsx` con bucle `requestAnimationFrame` y parámetros mutados vía `useRef`. El tapiz se pinta de forma incremental (una fila por generación) sobre un canvas de resolución interna fija con `image-rendering: pixelated`; al llenarse hace scroll copiándose sobre sí mismo.

**Tech Stack:** React 18 + TypeScript + Vite + HTML5 Canvas. Tests con Vitest (se añade como devDependency).

**Spec:** `docs/superpowers/specs/2026-06-09-cellular-automata-design.md`

**Convenciones del repo:** commits pequeños tras cada paso verificado. Identidad git ya configurada localmente. `npm run build` ejecuta `tsc --noEmit && vite build` y debe pasar antes del commit final.

---

### Task 1: Instalar Vitest y script de test

**Files:**
- Modify: `package.json` (scripts)

- [x] **Step 1: Instalar vitest**

Run: `npm install -D vitest`
Expected: añade `vitest` a devDependencies sin errores.

- [x] **Step 2: Añadir script de test a `package.json`**

En el bloque `"scripts"` añadir:

```json
"test": "vitest run"
```

- [x] **Step 3: Verificar que vitest corre (sin tests aún)**

Run: `npm test`
Expected: exit code 1 con "No test files found" — correcto en este punto.

- [x] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest"
```

---

### Task 2: Motor `ElementaryCA` (TDD)

**Files:**
- Create: `src/modules/cellular/engine.test.ts`
- Create: `src/modules/cellular/engine.ts`

- [x] **Step 1: Escribir los tests (fallarán)**

Crear `src/modules/cellular/engine.test.ts` con este contenido exacto:

```ts
import { describe, expect, it } from 'vitest';
import { ElementaryCA } from './engine';

/** Renderiza el array de células como string '·#' para asserts legibles. */
function row(ca: ElementaryCA): string {
  return Array.from(ca.cells, (c) => (c ? '#' : '·')).join('');
}

describe('ElementaryCA', () => {
  it('regla 90 desde célula única genera el triángulo de Sierpiński', () => {
    const ca = new ElementaryCA(11, 90);
    ca.setSeed('single');
    expect(row(ca)).toBe('·····#·····');
    ca.step();
    expect(row(ca)).toBe('····#·#····');
    ca.step();
    expect(row(ca)).toBe('···#···#···');
    ca.step();
    expect(row(ca)).toBe('··#·#·#·#··');
    ca.step();
    expect(row(ca)).toBe('·#·······#·');
    expect(ca.generation).toBe(4);
  });

  it('regla 0 mata todo en un paso', () => {
    const ca = new ElementaryCA(16, 0);
    ca.setSeed('random', 0.5, () => 0.3); // rng constante < densidad ⇒ todo vivo
    ca.step();
    expect(Array.from(ca.cells).every((c) => c === 0)).toBe(true);
  });

  it('regla 255 enciende todo en un paso desde cualquier estado', () => {
    const ca = new ElementaryCA(16, 255);
    ca.setSeed('single');
    ca.step();
    expect(Array.from(ca.cells).every((c) => c === 1)).toBe(true);
  });

  it('la frontera es toroidal (la señal cruza el borde)', () => {
    // Regla 2 (00000010): solo '001' produce 1 ⇒ la célula viva "viaja" a la izquierda.
    const ca = new ElementaryCA(5, 2);
    ca.setSeed('single'); // ··#··
    ca.step(); // ·#···
    ca.step(); // #····
    ca.step(); // debe envolver: ····#
    expect(row(ca)).toBe('····#');
  });

  it('toggleRuleBit es involutivo y consistente con setRule', () => {
    const ca = new ElementaryCA(8, 110);
    ca.toggleRuleBit(7);
    expect(ca.rule).toBe(110 ^ 128);
    ca.toggleRuleBit(7);
    expect(ca.rule).toBe(110);
    ca.setRule(300); // se trunca a 8 bits
    expect(ca.rule).toBe(300 & 255);
  });

  it('setSeed single resetea la generación y centra la célula', () => {
    const ca = new ElementaryCA(9, 30);
    ca.step();
    ca.step();
    ca.setSeed('single');
    expect(ca.generation).toBe(0);
    expect(row(ca)).toBe('····#····');
  });

  it('setSeed random respeta la densidad con rng inyectado', () => {
    const ca = new ElementaryCA(4, 30);
    const seq = [0.1, 0.9, 0.2, 0.8];
    let k = 0;
    ca.setSeed('random', 0.5, () => seq[k++]);
    expect(row(ca)).toBe('#·#·');
  });
});
```

- [x] **Step 2: Verificar que fallan**

Run: `npm test`
Expected: FAIL — `Cannot find module './engine'` (o equivalente).

- [x] **Step 3: Implementar el motor**

Crear `src/modules/cellular/engine.ts` con este contenido exacto:

```ts
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
```

- [x] **Step 4: Verificar que pasan**

Run: `npm test`
Expected: PASS — 7 tests.

- [x] **Step 5: Commit**

```bash
git add src/modules/cellular/engine.ts src/modules/cellular/engine.test.ts
git commit -m "feat: motor ElementaryCA con verificacion determinista"
```

---

### Task 3: Componente `CellularSim`

**Files:**
- Create: `src/modules/cellular/CellularSim.tsx`
- Modify: `src/styles.css` (añadir estilos al final)

- [x] **Step 1: Crear el componente**

Crear `src/modules/cellular/CellularSim.tsx` con este contenido exacto:

```tsx
import { useEffect, useRef, useState } from 'react';
import { ElementaryCA, SeedMode } from './engine';
import { Slider } from '../../components/Slider';

const CELLS = 360; // células por fila
const SCALE = 3; // px internos por célula
const ROWS = 240; // filas visibles del tapiz
const BASE_GPS = 24; // generaciones por segundo a velocidad 1×

const FEATURED: { rule: number; name: string; klass: string }[] = [
  { rule: 250, name: '250', klass: 'Clase I · orden' },
  { rule: 90, name: '90', klass: 'Clase II · fractal' },
  { rule: 30, name: '30', klass: 'Clase III · caos' },
  { rule: 110, name: '110', klass: 'Clase IV · borde del caos' },
  { rule: 184, name: '184', klass: 'tráfico' },
];

const SPEEDS = [0.25, 1, 2, 8];

/** Las 8 transiciones, de 111 (bit 7) a 000 (bit 0). */
const TRANSITIONS = [7, 6, 5, 4, 3, 2, 1, 0];

export function CellularSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ElementaryCA | null>(null);
  const yRef = useRef(0); // fila de pintado actual (px internos / SCALE)
  const accRef = useRef(0); // acumulador de generaciones fraccionarias
  const speedRef = useRef(1);
  const densityRef = useRef(0.5);
  const seedModeRef = useRef<SeedMode>('single');
  const playingRef = useRef(true);
  const stepOnceRef = useRef(false);

  const [rule, setRuleUI] = useState(110);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [seedMode, setSeedMode] = useState<SeedMode>('single');

  if (!engineRef.current) engineRef.current = new ElementaryCA(CELLS, 110);

  /** Pinta una fila nueva al fondo del tapiz; hace scroll si está lleno. */
  const paintRow = (ctx: CanvasRenderingContext2D, cells: Uint8Array) => {
    const canvas = ctx.canvas;
    if (yRef.current >= ROWS) {
      ctx.drawImage(canvas, 0, -SCALE);
      yRef.current = ROWS - 1;
    }
    const y = yRef.current * SCALE;
    ctx.fillStyle = '#0b1018';
    ctx.fillRect(0, y, canvas.width, SCALE);
    ctx.fillStyle = '#56e8d5';
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]) ctx.fillRect(i * SCALE, y, SCALE, SCALE);
    }
    yRef.current++;
  };

  const clearTapestry = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0b1018';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    yRef.current = 0;
    accRef.current = 0;
    // Pinta la semilla actual como fila 0
    paintRow(ctx, engineRef.current!.cells);
  };

  const reseed = () => {
    engineRef.current!.setSeed(seedModeRef.current, densityRef.current);
    clearTapestry();
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const engine = engineRef.current!;
    let raf = 0;
    let last = performance.now();

    clearTapestry();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        accRef.current += dt * BASE_GPS * speedRef.current;
        // Tope de generaciones por frame para no congelar la UI a 8×
        let n = Math.min(64, Math.floor(accRef.current));
        accRef.current -= Math.floor(accRef.current);
        while (n-- > 0) paintRow(ctx, engine.step());
      } else if (stepOnceRef.current) {
        stepOnceRef.current = false;
        paintRow(ctx, engine.step());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyRule = (n: number) => {
    engineRef.current!.setRule(n);
    setRuleUI(engineRef.current!.rule);
  };

  const toggleBit = (i: number) => {
    engineRef.current!.toggleRuleBit(i);
    setRuleUI(engineRef.current!.rule);
  };

  const setPlay = (p: boolean) => {
    playingRef.current = p;
    setPlaying(p);
  };

  return (
    <div className="module-grid">
      <aside className="panel side-panel">
        <h2 className="panel-title">Constructor de reglas</h2>
        <p className="panel-sub">
          8 transiciones locales definen todo el universo. Toca la celda de
          salida de cada transición para construir tu propia regla.
        </p>

        <div className="ca-rule-editor">
          {TRANSITIONS.map((i) => (
            <button key={i} className="ca-transition" onClick={() => toggleBit(i)}>
              <span className="ca-neigh">
                <i className={i & 4 ? 'on' : ''} />
                <i className={i & 2 ? 'on' : ''} />
                <i className={i & 1 ? 'on' : ''} />
              </span>
              <span className={`ca-out ${engineRef.current!.ruleBit(i) ? 'on' : ''}`} />
            </button>
          ))}
        </div>
        <p className="ca-rule-readout">
          REGLA <b>{rule}</b> · {rule.toString(2).padStart(8, '0')}
        </p>

        <div className="ca-featured">
          {FEATURED.map((f) => (
            <button
              key={f.rule}
              className={`btn ca-chip ${rule === f.rule ? 'active' : ''}`}
              onClick={() => applyRule(f.rule)}
              title={f.klass}
            >
              R{f.name} <small>{f.klass}</small>
            </button>
          ))}
        </div>

        <h2 className="panel-title">Condición inicial</h2>
        <div className="btn-stack">
          <button
            className={`btn ${seedMode === 'single' ? 'btn-warn' : ''}`}
            onClick={() => {
              seedModeRef.current = 'single';
              setSeedMode('single');
              reseed();
            }}
          >
            · Célula única central
          </button>
          <button
            className={`btn ${seedMode === 'random' ? 'btn-warn' : ''}`}
            onClick={() => {
              seedModeRef.current = 'random';
              setSeedMode('random');
              reseed();
            }}
          >
            ⁂ Siembra aleatoria
          </button>
        </div>
        <Slider
          label="Densidad de siembra"
          min={0.02}
          max={0.98}
          step={0.01}
          defaultValue={0.5}
          format={(v) => `${(v * 100).toFixed(0)} %`}
          onInput={(v) => (densityRef.current = v)}
          hint="Fracción de células vivas al sembrar aleatoriamente."
        />

        <h2 className="panel-title">Control de tiempo</h2>
        <div className="btn-stack">
          <button className="btn" onClick={() => setPlay(!playing)}>
            {playing ? '❚❚ Pausa' : '▶ Reproducir'}
          </button>
          <button
            className="btn"
            onClick={() => {
              setPlay(false);
              stepOnceRef.current = true;
            }}
          >
            ⇥ Paso a paso (+1 generación)
          </button>
          <button className="btn" onClick={reseed}>
            ↺ Reiniciar tapiz
          </button>
        </div>
        <div className="ca-speeds">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={`btn ca-chip ${speed === s ? 'active' : ''}`}
              onClick={() => {
                speedRef.current = s;
                setSpeed(s);
              }}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="didactic-note">
          <h3>Guía didáctica</h3>
          <ol>
            <li>R250: todo converge — orden homogéneo (Clase I).</li>
            <li>R90 con célula única: el triángulo de Sierpiński (Clase II).</li>
            <li>R30: caos determinista — ¿puedes predecir la columna central? (Clase III).</li>
            <li>R110: estructuras que viajan e interactúan — el borde del caos es computación (Clase IV).</li>
          </ol>
        </div>
      </aside>

      <section className="canvas-stage ca-stage">
        <canvas ref={canvasRef} width={CELLS * SCALE} height={ROWS * SCALE} className="ca-canvas" />
        <div className="stage-hint">
          TAPIZ DE EVOLUCIÓN · cada fila es una generación · frontera toroidal
        </div>
      </section>
    </div>
  );
}
```

- [x] **Step 2: Añadir estilos al final de `src/styles.css`**

```css
/* ===== NET·03 — Autómatas celulares ===== */
.ca-canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  background: #0b1018;
}
.ca-rule-editor {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 10px 0 6px;
}
.ca-transition {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 7px 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 6px;
  cursor: pointer;
}
.ca-transition:hover {
  border-color: rgba(86, 232, 213, 0.5);
}
.ca-neigh {
  display: flex;
  gap: 2px;
}
.ca-neigh i,
.ca-out {
  width: 11px;
  height: 11px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 2px;
  background: transparent;
}
.ca-neigh i.on,
.ca-out.on {
  background: #56e8d5;
  border-color: #56e8d5;
}
.ca-out {
  width: 13px;
  height: 13px;
}
.ca-rule-readout {
  font-size: 12px;
  letter-spacing: 0.08em;
  opacity: 0.8;
  margin: 4px 0 12px;
}
.ca-featured,
.ca-speeds {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}
.ca-chip {
  padding: 5px 9px;
  font-size: 11px;
}
.ca-chip small {
  display: block;
  opacity: 0.6;
  font-size: 9px;
}
.ca-chip.active {
  border-color: #56e8d5;
  color: #56e8d5;
}
```

Nota: si alguna clase (`btn`, `panel`, `module-grid`, etc.) tiene otro nombre en `styles.css`, seguir el patrón real del archivo — `NetworkSim.tsx` es la referencia.

- [x] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [x] **Step 4: Commit**

```bash
git add src/modules/cellular/CellularSim.tsx src/styles.css
git commit -m "feat: laboratorio CellularSim con editor de regla y tapiz incremental"
```

---

### Task 4: Cablear vista y dashboard

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/dashboard/Dashboard.tsx:42-45`

- [x] **Step 1: Registrar la vista en `src/App.tsx`**

1. Añadir import: `import { CellularSim } from './modules/cellular/CellularSim';`
2. Ampliar el tipo: `export type View = 'dashboard' | 'laboratorio' | 'red' | 'agentes' | 'celular';`
3. Añadir a `NAV`: `{ view: 'celular', label: 'MÓDULO · AUTÓMATAS' },`
4. Añadir el bloque de render en `<main>`, tras el bloque de `'red'`:

```tsx
{view === 'celular' && (
  <>
    <ModuleHeader
      code="NET·03"
      title="Autómatas Celulares Elementales"
      sub="256 reglas de Wolfram · 4 clases de complejidad · frontera toroidal"
    />
    <CellularSim />
  </>
)}
```

- [x] **Step 2: Activar la tarjeta NET·03 en `src/dashboard/Dashboard.tsx`**

Al módulo `code: 'NET·03'` añadir la propiedad `view: 'celular'` y actualizar la descripción:

```ts
{
  code: 'NET·03',
  title: 'Autómatas Celulares',
  desc: 'Construye una regla local de 8 bits y observa las cuatro clases de Wolfram: orden, fractales, caos y computación al borde del caos.',
  view: 'celular',
},
```

- [x] **Step 3: Verificación completa**

Run: `npm test` → PASS (7 tests)
Run: `npm run build` → sin errores de tipos y bundle generado.

- [x] **Step 4: Commit**

```bash
git add src/App.tsx src/dashboard/Dashboard.tsx
git commit -m "feat: activar modulo NET-03 automatas celulares en la app"
```

---

### Task 5: Verificación visual en navegador

- [x] **Step 1: Levantar el dev server y verificar en el preview**

Run: `npm run dev` (o herramienta de preview disponible). Verificar:
1. La tarjeta NET·03 aparece ACTIVA y abre el módulo.
2. R90 + célula única dibuja el triángulo de Sierpiński.
3. Tocar transiciones del editor cambia el número de regla y el tapiz.
4. Pausa + paso a paso avanza una fila exacta.
5. A 8× el tapiz hace scroll fluido sin congelar la UI.
6. Sin errores en consola.

- [x] **Step 2: Commit final si hubo ajustes**

```bash
git add -A
git commit -m "fix: ajustes visuales del modulo de automatas celulares"
```
