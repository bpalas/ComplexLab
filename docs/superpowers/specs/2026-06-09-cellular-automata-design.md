# NET·03 — Autómatas Celulares Elementales (1D, Wolfram)

**Fecha:** 2026-06-09
**Estado:** aprobado en conversación; pendiente de plan de implementación
**Enfoque del proyecto:** educativo — el usuario debe poder *construir* la regla con sus manos y ver emerger las cuatro clases de comportamiento de Wolfram.

## Objetivo

Activar la tarjeta NET·03 del dashboard con un laboratorio interactivo de
autómatas celulares elementales (256 reglas, vecindario de 3 células,
frontera toroidal), siguiendo la pedagogía del Módulo 0: manipulación
directa, control de tiempo y reglas destacadas con narrativa.

## Arquitectura

Patrón existente del proyecto: motor puro sin React + componente de
simulación con `requestAnimationFrame` y parámetros mutados por `useRef`.

```
src/modules/cellular/
├── engine.ts          # ElementaryCA — lógica pura, testeable, determinista
└── CellularSim.tsx    # Lienzo de tapiz + panel de control
```

Cambios en archivos existentes:

- `src/App.tsx` — registrar la vista `'celular'`.
- `src/dashboard/Dashboard.tsx` — añadir `view: 'celular'` a la tarjeta NET·03.
- `src/styles.css` — estilos nuevos del módulo, reutilizando el sistema de diseño.

## Motor (`ElementaryCA`)

- Estado: `rule: number` (0–255), `cells: Uint8Array` (~300–400 células),
  `generation: number`. Frontera circular (toroidal).
- `step(): Uint8Array` — aplica la regla a cada vecindario de 3 células y
  avanza una generación. Pura y determinista.
- `setSeed(mode: 'single' | 'random', density?: number)` — célula central
  única, o siembra aleatoria con densidad ajustable.
- `toggleRuleBit(i: 0..7)` — invierte una transición; el número de regla se
  recalcula. `setRule(n)` para los presets.

### Verificación determinista (estilo Módulo 0)

- Regla 90 desde célula única ⇒ triángulo de Sierpiński (primeras filas
  verificables por igualdad exacta).
- Regla 0 ⇒ todo muere; regla 255 ⇒ todo vivo tras 1 paso.
- `toggleRuleBit` es involutivo y consistente con `setRule`.

## UI (`CellularSim`)

- **Tapiz**: canvas principal de render incremental — cada generación entra
  como una fila nueva por abajo; al llenarse, la imagen se desplaza una fila
  hacia arriba (scroll por `drawImage` sobre sí mismo o buffer `ImageData`).
  Coste O(ancho) por paso.
- **Editor de regla**: las 8 transiciones de vecindario (`111→x` … `000→x`)
  dibujadas como mini-celdas clicables. Tocar una invierte su bit. Se muestra
  el número de regla en decimal y binario.
- **Reglas destacadas** (chips con clase de Wolfram):
  - 250 — Clase I (orden homogéneo)
  - 90 — Clase II/fractal (Sierpiński)
  - 30 — Clase III (caos)
  - 110 — Clase IV (borde del caos, Turing-completa)
  - 184 — modelo de tráfico
- **Controles**: play/pausa, paso a paso, velocidad (0.25× / 1× / 2× / 8×),
  selector de semilla (única / aleatoria) + slider de densidad, reset.
  Reutiliza `components/Slider.tsx`.
- Estética: sistema de diseño existente (instrumentación científica, oscuro).

## Fuera de alcance (fase 2 potencial)

- Métricas de entropía / densidad en el tiempo.
- Vecindarios mayores, CA 2D (Game of Life).

## Sub-proyecto siguiente (spec separado)

Rediseño de la portada inspirado en labs.google/science y renombrado del
producto a **Complexity Labs**. Se diseñará tras completar este módulo.

## Continuidad de sesión

El repositorio queda bajo git con commits pequeños por paso verificado, de
modo que una interrupción por cuota permita retomar desde el último commit.
