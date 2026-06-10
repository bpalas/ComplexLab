# Portada estilo Labs Science Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Acercar la portada "Complexity Labs" a labs.google/science: cada tarjeta de experimento con una imagen ilustrativa (render real de su simulación), toggle de modo claro/oscuro persistente, y un look más sobrio (sin gradientes animados de fondo, sin glows neón, wordmark sólido).

**Architecture:** Dos piezas testeables como funciones puras (resolución de tema, mapeo de preview por módulo) + un hook `useTheme` fino en `App.tsx` que las orquesta y aplica `data-theme` en `<html>`. Un componente `CardPreview` monta un `<canvas>` y, una sola vez (sin `requestAnimationFrame`), pinta un frame estático mediante painters por módulo: los motores reales (`ElementaryCA`, `HebbianNetwork`) producen su propio render; `SandboxEngine` y `CoordinationEngine` alimentan motivos representativos con datos reales; los 3 módulos "Próximamente" usan motivos generativos deterministas. El CSS gana un bloque `[data-theme="light"]` y pierde mesh-gradient/glows/wordmark degradado.

**Tech Stack:** React 18 + TypeScript + Vite + Vitest. Canvas 2D. Sin dependencias nuevas.

---

## File Structure

- `src/theme.ts` (nuevo) — lógica de tema: `Theme` type, `resolveInitialTheme()` (puro), `applyTheme()`, hook `useTheme()`. Responsabilidad única: estado y aplicación del tema.
- `src/theme.test.ts` (nuevo) — tests de `resolveInitialTheme`.
- `src/dashboard/previews.ts` (nuevo) — `PreviewKind` type, `previewKindFor(code)` (puro) y los painters de canvas por módulo. Responsabilidad única: dibujar el frame estático de cada experimento.
- `src/dashboard/previews.test.ts` (nuevo) — tests de `previewKindFor`.
- `src/dashboard/CardPreview.tsx` (nuevo) — componente React que monta el canvas y llama al painter una vez.
- `src/dashboard/Dashboard.tsx` (modificar) — copy del hero, integrar `<CardPreview>` en cada tarjeta.
- `src/App.tsx` (modificar) — `useTheme`, botón toggle ☀/☾, wordmark sólido.
- `src/styles.css` (modificar) — bloque `[data-theme="light"]`, quitar mesh-gradient/glows/wordmark degradado, estilos de `.card-preview` y del toggle.
- `index.html` (sin cambios de fuentes; ya carga Plus Jakarta Sans + IBM Plex Mono).

**Nota de cobertura testeable:** los painters de canvas NO se testean por píxeles (jsdom no implementa Canvas 2D y no añadimos node-canvas). Se verifican por `npm run build` + inspección en navegador. Lo que SÍ se testea por unidad es la lógica pura: `resolveInitialTheme` y `previewKindFor`.

---

## Task 1: Lógica de tema (función pura + test)

**Files:**
- Create: `src/theme.ts`
- Test: `src/theme.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`src/theme.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolveInitialTheme } from './theme';

describe('resolveInitialTheme', () => {
  it('usa el valor guardado cuando es "light"', () => {
    expect(resolveInitialTheme('light', true)).toBe('light');
  });

  it('usa el valor guardado cuando es "dark"', () => {
    expect(resolveInitialTheme('dark', true)).toBe('dark');
  });

  it('ignora valores guardados no válidos y cae al sistema', () => {
    expect(resolveInitialTheme('banana', true)).toBe('dark');
    expect(resolveInitialTheme('banana', false)).toBe('light');
  });

  it('sin valor guardado, sigue prefers-color-scheme', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark');
    expect(resolveInitialTheme(null, false)).toBe('light');
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npm test -- theme`
Expected: FAIL — "Failed to resolve import './theme'" o "resolveInitialTheme is not a function".

- [ ] **Step 3: Implementación mínima**

`src/theme.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/**
 * Resuelve el tema inicial de forma pura:
 *  - si hay un valor guardado válido ('light'|'dark'), lo respeta;
 *  - si no, sigue prefers-color-scheme (prefersDark → 'dark').
 */
export function resolveInitialTheme(
  stored: string | null,
  prefersDark: boolean,
): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npm test -- theme`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/theme.ts src/theme.test.ts
git commit -m "feat: resolveInitialTheme puro para selección de tema"
```

---

## Task 2: applyTheme + hook useTheme

**Files:**
- Modify: `src/theme.ts`

- [ ] **Step 1: Añadir `applyTheme` y `useTheme` al final de `src/theme.ts`**

```typescript
const STORAGE_KEY = 'complexity-labs-theme';

/** Aplica el tema al documento (data-theme en <html>). 'dark' no marca atributo. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');
}

/** Hook de tema: inicializa desde localStorage o sistema, aplica y persiste. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return resolveInitialTheme(stored, prefersDark);
  });

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle };
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificar que los tests siguen pasando**

Run: `npm test`
Expected: PASS (todos, incluidos los 4 de theme y los previos del repo).

- [ ] **Step 4: Commit**

```bash
git add src/theme.ts
git commit -m "feat: hook useTheme con applyTheme y persistencia"
```

---

## Task 3: Mapeo de preview por módulo (función pura + test)

**Files:**
- Create: `src/dashboard/previews.ts`
- Test: `src/dashboard/previews.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`src/dashboard/previews.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { previewKindFor } from './previews';

describe('previewKindFor', () => {
  it('mapea los módulos con motor real a su painter', () => {
    expect(previewKindFor('NET·00')).toBe('synapse');
    expect(previewKindFor('NET·01')).toBe('network');
    expect(previewKindFor('NET·03')).toBe('cellular');
    expect(previewKindFor('AGI·01')).toBe('agents');
  });

  it('mapea los módulos "Próximamente" a motivos generativos', () => {
    expect(previewKindFor('NET·02')).toBe('swarm');
    expect(previewKindFor('AGI·02')).toBe('cascade');
    expect(previewKindFor('AGI·03')).toBe('attention');
  });

  it('cae a un motivo neutro para códigos desconocidos', () => {
    expect(previewKindFor('XXX·99')).toBe('generic');
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npm test -- previews`
Expected: FAIL — "Failed to resolve import './previews'".

- [ ] **Step 3: Implementación mínima**

`src/dashboard/previews.ts`:

```typescript
export type PreviewKind =
  | 'synapse'
  | 'network'
  | 'cellular'
  | 'agents'
  | 'swarm'
  | 'cascade'
  | 'attention'
  | 'generic';

const KIND_BY_CODE: Record<string, PreviewKind> = {
  'NET·00': 'synapse',
  'NET·01': 'network',
  'NET·02': 'swarm',
  'NET·03': 'cellular',
  'AGI·01': 'agents',
  'AGI·02': 'cascade',
  'AGI·03': 'attention',
};

export function previewKindFor(code: string): PreviewKind {
  return KIND_BY_CODE[code] ?? 'generic';
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npm test -- previews`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/previews.ts src/dashboard/previews.test.ts
git commit -m "feat: previewKindFor mapea cada módulo a su tipo de preview"
```

---

## Task 4: Painters de canvas (motores reales + motivos)

**Files:**
- Modify: `src/dashboard/previews.ts`

Cada painter recibe `(ctx, w, h)` y pinta un frame estático. Fondo siempre oscuro `#0a1018` (las previews son "ventanas" oscuras en ambos temas, como en labs.google). No usan `requestAnimationFrame`. Paleta: cian `#45e6c8`, azul `#4aa8ff`, magenta `#ff5d8f`, ámbar `#ffb454`.

- [ ] **Step 1: Añadir imports de motores reales al inicio de `src/dashboard/previews.ts`**

```typescript
import { ElementaryCA } from '../modules/cellular/engine';
import { HebbianNetwork } from '../modules/network/engine';
import { SandboxEngine, DEFAULT_PARAMS } from '../modules/sandbox/engine';
import { CoordinationEngine, AGENTS } from '../modules/agents/engine';
```

- [ ] **Step 2: Añadir el painter `cellular` (CA real, iconográfico)**

Añadir al final de `src/dashboard/previews.ts`:

```typescript
const BG = '#0a1018';

/** NET·03 — autómata celular real: regla 110 desde semilla central. */
function paintCellular(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  const cols = 120;
  const px = w / cols;
  const rows = Math.floor(h / px);
  const ca = new ElementaryCA(cols, 110);
  ctx.fillStyle = '#45e6c8';
  // fila 0 (semilla)
  for (let i = 0; i < cols; i++) {
    if (ca.cells[i]) ctx.fillRect(i * px, 0, px + 0.5, px + 0.5);
  }
  for (let y = 1; y < rows; y++) {
    const row = ca.step();
    for (let i = 0; i < cols; i++) {
      if (row[i]) ctx.fillRect(i * px, y * px, px + 0.5, px + 0.5);
    }
  }
}
```

- [ ] **Step 3: Añadir el painter `network` (HebbianNetwork real)**

```typescript
/** NET·01 — red hebbiana real: se evoluciona y se usa su propio render(). */
function paintNetwork(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  const net = new HebbianNetwork();
  const params = { threshold: 1.0, learningRate: 0.2, decayRate: 0.02, brushRadius: 60 };
  // Inyección sostenida cerca del centro para encender pulsos.
  net.brush = { x: w / 2, y: h / 2, active: true };
  for (let s = 0; s < 90; s++) net.update(1 / 60, params, w, h);
  net.brush.active = false;
  for (let s = 0; s < 60; s++) net.update(1 / 60, params, w, h);
  net.render(ctx, w, h, params);
}
```

- [ ] **Step 4: Añadir el painter `synapse` (NET·00, motivo + datos reales del motor)**

```typescript
/** NET·00 — laboratorio de 2 nodos: motivo A→B + curva de peso real (LTP). */
function paintSynapse(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  // Curva de peso real: coactivación repetida A antes que B.
  const eng = new SandboxEngine();
  eng.startDemo('coactivacion', DEFAULT_PARAMS.threshold);
  for (let s = 0; s < 900; s++) eng.update(1 / 60, DEFAULT_PARAMS);
  const hist = eng.histAB;

  // Sparkline de la curva de peso en la mitad inferior.
  const padY = h * 0.62;
  const plotH = h * 0.3;
  ctx.strokeStyle = 'rgba(255,180,84,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < hist.length; i++) {
    const x = (i / Math.max(1, hist.length - 1)) * w;
    const y = padY + plotH - hist[i] * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Dos nodos A→B en la mitad superior.
  const ay = h * 0.3;
  const ax = w * 0.3;
  const bx = w * 0.7;
  ctx.strokeStyle = 'rgba(120,200,220,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ax + 14, ay);
  ctx.lineTo(bx - 14, ay);
  ctx.stroke();
  const drawNode = (x: number, color: string, label: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, ay, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#04070d';
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, ay);
  };
  drawNode(ax, '#45e6c8', 'A');
  drawNode(bx, '#ffb454', 'B');
}
```

- [ ] **Step 5: Añadir el painter `agents` (CoordinationEngine real)**

```typescript
/** AGI·01 — coordinación: rejilla de elecciones reales por ronda y agente. */
function paintAgents(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  const eng = new CoordinationEngine();
  eng.mode = 'inferencia';
  const ROUNDS = 28;
  for (let r = 0; r < ROUNDS; r++) eng.playRound();
  const rows = AGENTS.length; // 4
  const cellW = w / ROUNDS;
  const cellH = h / rows;
  for (let r = 0; r < ROUNDS; r++) {
    const rec = eng.history[r];
    for (let a = 0; a < rows; a++) {
      const aligned = rec.majority >= 0 && rec.choices[a] === rec.majority;
      ctx.fillStyle = aligned ? AGENTS[a].color : 'rgba(107,130,146,0.22)';
      ctx.fillRect(r * cellW + 1, a * cellH + 1, cellW - 2, cellH - 2);
    }
  }
}
```

- [ ] **Step 6: Añadir painters de motivos generativos deterministas (módulos "Próximamente")**

```typescript
/** Motivo determinista para módulos sin motor: usa una PRNG con semilla fija. */
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** NET·02 — enjambre (PSO): nube de partículas con vectores hacia un mínimo. */
function paintSwarm(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  const rng = mulberry32(2);
  const gx = w * 0.62;
  const gy = h * 0.45;
  for (let i = 0; i < 70; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const dx = (gx - x) * 0.18;
    const dy = (gy - y) * 0.18;
    ctx.strokeStyle = 'rgba(74,168,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
    ctx.fillStyle = '#4aa8ff';
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffb454';
  ctx.beginPath();
  ctx.arc(gx, gy, 4, 0, Math.PI * 2);
  ctx.fill();
}

/** AGI·02 — cascada de conformismo: árbol de adopción que se propaga. */
function paintCascade(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  const rng = mulberry32(7);
  const layers = 5;
  const dotsByLayer = [1, 2, 4, 7, 11];
  let prev: { x: number; y: number }[] = [];
  for (let l = 0; l < layers; l++) {
    const n = dotsByLayer[l];
    const y = (h * (l + 0.7)) / (layers + 0.4);
    const cur: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const x = (w * (i + 1)) / (n + 1) + (rng() - 0.5) * 12;
      cur.push({ x, y });
      const adopted = l < layers - 1 || rng() > 0.4;
      if (prev.length) {
        const p = prev[Math.floor(rng() * prev.length)];
        ctx.strokeStyle = 'rgba(255,93,143,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.fillStyle = adopted ? '#ff5d8f' : 'rgba(107,130,146,0.4)';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    prev = cur;
  }
}

/** AGI·03 — atención (Moltbook): barras de atención que decaen por rango. */
function paintAttention(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  const n = 16;
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    const val = Math.pow(0.82, i) * (0.6 + 0.4 * Math.sin(i));
    const bh = Math.max(2, Math.abs(val) * h * 0.8);
    ctx.fillStyle = i < 3 ? '#45e6c8' : 'rgba(69,230,200,0.32)';
    ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh);
  }
}

function paintGeneric(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(120,200,220,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 8 + i * 9, 0, Math.PI * 2);
    ctx.stroke();
  }
}
```

- [ ] **Step 7: Añadir el dispatcher `paintPreview`**

```typescript
const PAINTERS: Record<PreviewKind, (ctx: CanvasRenderingContext2D, w: number, h: number) => void> = {
  synapse: paintSynapse,
  network: paintNetwork,
  cellular: paintCellular,
  agents: paintAgents,
  swarm: paintSwarm,
  cascade: paintCascade,
  attention: paintAttention,
  generic: paintGeneric,
};

/** Pinta el frame estático correspondiente al código de módulo dado. */
export function paintPreview(
  code: string,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  PAINTERS[previewKindFor(code)](ctx, w, h);
}
```

- [ ] **Step 8: Verificar tipos y tests**

Run: `npx tsc --noEmit && npm test`
Expected: tsc sin errores; tests PASS (previews + theme + engine previos).

- [ ] **Step 9: Commit**

```bash
git add src/dashboard/previews.ts
git commit -m "feat: painters de preview por módulo (motores reales + motivos)"
```

---

## Task 5: Componente CardPreview

**Files:**
- Create: `src/dashboard/CardPreview.tsx`

- [ ] **Step 1: Crear el componente**

`src/dashboard/CardPreview.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import { paintPreview } from './previews';

const W = 360;
const H = 150;

/** Lienzo estático con el render representativo de un experimento.
 *  Pinta una sola vez al montar; sin requestAnimationFrame. */
export function CardPreview({ code }: { code: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    paintPreview(code, ctx, W, H);
  }, [code]);

  return (
    <div className="card-preview" aria-hidden="true">
      <canvas ref={ref} style={{ width: '100%', height: `${H}px` }} />
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/dashboard/CardPreview.tsx
git commit -m "feat: componente CardPreview (canvas estático por módulo)"
```

---

## Task 6: Integrar CardPreview y reescribir el copy del hero en Dashboard

**Files:**
- Modify: `src/dashboard/Dashboard.tsx`

- [ ] **Step 1: Importar CardPreview**

En `src/dashboard/Dashboard.tsx`, añadir tras `import { View } from '../App';`:

```typescript
import { CardPreview } from './CardPreview';
```

- [ ] **Step 2: Reescribir el bloque `<header className="hero">` con copy sobrio**

Reemplazar el bloque actual (líneas del `<header className="hero">` … `</header>`) por:

```tsx
      <header className="hero">
        <p className="hero-kicker">Experimentos interactivos</p>
        <h1>Experimentos de sistemas complejos</h1>
        <p className="hero-sub">
          Ajusta parámetros y perturba modelos de redes, autómatas y agentes
          directamente en el navegador. Cada experimento corre en vivo.
        </p>
      </header>
```

- [ ] **Step 3: Insertar el render dentro de la tarjeta, antes de `.card-top`**

En el `return` del `.map((m) => ...)`, justo después de la apertura `<button ...>` y antes de `<div className="card-top">`, añadir:

```tsx
                  <CardPreview code={m.code} />
```

- [ ] **Step 4: Verificar tipos y tests**

Run: `npx tsc --noEmit && npm test`
Expected: sin errores; tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/Dashboard.tsx
git commit -m "feat: tarjetas con preview e hero sobrio en el dashboard"
```

---

## Task 7: Toggle de tema y wordmark sólido en App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Importar useTheme**

Cambiar la línea 1 `import { useState } from 'react';` para añadir el hook:

```typescript
import { useState } from 'react';
import { useTheme } from './theme';
```

- [ ] **Step 2: Usar el hook dentro de `App`**

Tras `const [view, setView] = useState<View>('dashboard');` añadir:

```typescript
  const { theme, toggle } = useTheme();
```

- [ ] **Step 3: Añadir el botón toggle al final de `<nav>`**

Dentro de `<nav>`, después del `{NAV.map(...)}`, añadir:

```tsx
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: toggle de modo claro/oscuro en la topbar"
```

---

## Task 8: CSS — bloque modo claro, limpieza del look "IA", estilos de preview/toggle

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Sustituir el comentario de cabecera y el bloque `body::before/after` + keract por fondo plano**

Reemplazar el bloque desde `body::before,` / `body::after {` (línea ~47) hasta el cierre del `@media (prefers-reduced-motion: reduce)` que contiene `body::before/after { animation: none; }` (línea ~91) por nada (eliminar el mesh-gradient completo). El `body` mantiene `background: var(--bg0);`.

- [ ] **Step 2: Añadir el bloque de variables de modo claro tras el `:root { … }` (después de la línea ~22)**

```css
/* Modo claro — blanco frío técnico, coherente con la paleta fría del oscuro. */
:root[data-theme='light'] {
  --bg0: #f7f9fb;
  --bg1: #eef2f6;
  --panel: #ffffff;
  --panel-2: #f4f7fa;
  --line: rgba(22, 32, 42, 0.1);
  --line-strong: rgba(22, 32, 42, 0.22);
  --ink: #16202a;
  --muted: #5c6b7a;
  --cyan: #0c9b80;
  --amber: #c9821a;
  --blue: #1769d6;
  --magenta: #d63b6e;
}
```

- [ ] **Step 3: Hacer la topbar dependiente del tema**

Reemplazar en `.topbar` la línea `background: rgba(4, 7, 13, 0.7);` por:

```css
  background: color-mix(in srgb, var(--bg0) 78%, transparent);
```

y la línea `border-bottom: 1px solid rgba(255, 255, 255, 0.07);` por:

```css
  border-bottom: 1px solid var(--line);
```

- [ ] **Step 4: Wordmark sólido — quitar el degradado de `.brand-name b`**

Reemplazar el bloque `.brand-name b { … }` (líneas ~147-154) por:

```css
.brand-name b {
  font-weight: 800;
  color: var(--cyan);
}
```

- [ ] **Step 5: Hero — quitar el degradado de `.hero h1 em` (por si el copy lo reintroduce) y dejar acento sólido**

Reemplazar el bloque `.hero h1 em { … }` (líneas ~313-320) por:

```css
.hero h1 em {
  font-style: normal;
  color: var(--cyan);
}
```

- [ ] **Step 6: Tarjeta — quitar el halo de gradiente y dejar hover con sombra suave**

Reemplazar el bloque `.card::before { … }` (líneas ~406-417) y la regla `.card.live:hover::before { opacity: 1; }` (líneas ~427-429) eliminándolos por completo.

Reemplazar `.card.live:hover { … }` (líneas ~419-425) por:

```css
.card.live:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--acc) 40%, var(--line-strong));
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.22);
}
```

Reemplazar el `background:` de `.card` (línea ~394) por una superficie por tema:

```css
  background: var(--panel);
```

y eliminar de `.card` las dos líneas `backdrop-filter: blur(10px);` y `-webkit-backdrop-filter: blur(10px);` (líneas ~395-396).

- [ ] **Step 7: Añadir estilos de `.card-preview` antes de `/* ── Tarjetas de experimento ── */` o justo después de la regla `.card`**

```css
.card-preview {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #0a1018;
  line-height: 0;
}

.card-preview canvas {
  display: block;
  width: 100%;
}
```

Y para que el render quede arriba con aire, asegurar que `.card` tenga `padding-top` normal (ya tiene `padding: 24px;` y `gap: 12px;` — el preview hereda el gap).

- [ ] **Step 8: Añadir estilos del `.theme-toggle` tras `.nav-btn.active { … }` (línea ~192)**

```css
.theme-toggle {
  font-size: 15px;
  line-height: 1;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid var(--line);
  color: var(--ink);
  transition: background-color 0.18s, border-color 0.18s;
}

.theme-toggle:hover {
  background: color-mix(in srgb, var(--ink) 8%, transparent);
  border-color: var(--line-strong);
}
```

- [ ] **Step 9: Quitar el glow del wordmark/nav activo si chirría en claro — verificar `.nav-btn.active`**

Dejar `.nav-btn.active` con su gradiente cian→azul (funciona en ambos temas porque el texto es `#04121c` oscuro). Sin cambios salvo que en revisión visual se vea mal.

- [ ] **Step 10: Verificar build**

Run: `npm run build`
Expected: `tsc --noEmit` sin errores y `vite build` exitoso.

- [ ] **Step 11: Commit**

```bash
git add src/styles.css
git commit -m "feat: modo claro, fondo plano y estilos de preview/toggle"
```

---

## Task 9: Verificación en navegador y ajustes

**Files:** ninguno (verificación); ajustes inline si hace falta.

- [ ] **Step 1: Arrancar el dev server y abrir la portada**

Usar las herramientas de preview (`preview_start`), recargar y tomar `preview_screenshot` del dashboard en modo oscuro.

- [ ] **Step 2: Verificar cada preview**

Confirmar que las 4 tarjetas activas muestran su render real (autómata NET·03, red NET·01, sinapsis NET·00, agentes AGI·01) y las 3 "Próximamente" su motivo. Revisar `preview_console_logs` sin errores.

- [ ] **Step 3: Probar el toggle de tema**

`preview_click` en `.theme-toggle`, `preview_screenshot` en modo claro. Verificar contraste de texto (hero, tarjetas, topbar) y que las previews oscuras se ven como "ventanas" sobre el fondo claro.

- [ ] **Step 4: Recargar y confirmar persistencia**

`window.location.reload()` vía `preview_eval`; confirmar que el tema elegido se mantiene (localStorage).

- [ ] **Step 5: Verificar que las 4 simulaciones siguen funcionando**

Navegar a cada vista (laboratorio, red, agentes, celular) y confirmar que abren y animan igual que antes.

- [ ] **Step 6: Corregir cualquier problema de contraste/layout inline en `styles.css`**, repetir build, y commitear si hubo cambios:

```bash
git add src/styles.css
git commit -m "fix: ajustes de contraste/layout tras verificación visual"
```

---

## Criterio de éxito (del spec)

1. Cada tarjeta muestra una imagen ilustrativa (render real en las activas). → Tasks 4-6
2. Toggle claro/oscuro funciona, arranca según el sistema y persiste. → Tasks 1-2, 7
3. Sin botones tipo "Express interest". → ya no existen; el hero (Task 6) no los añade.
4. Look sobrio: sin gradientes animados de fondo, sin glows neón, wordmark sólido. → Task 8
5. Las 4 simulaciones abren y funcionan; `npm test` y `npm run build` pasan. → Task 9, builds en cada task.
6. Contraste correcto en ambos temas. → Task 8-9.
