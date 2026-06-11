# PHY·02 — Reacción-Difusión: cómo se forman las manchas y las rayas

**Fecha:** 2026-06-10
**Módulo:** PHY·02 (categoría 03 — Física y Química de la Emergencia)
**Estado:** diseño aprobado, pendiente de plan de implementación

## Objetivo

Un módulo interactivo que explique, con simulación + matemática en vivo, la
**morfogénesis de Turing**: por qué la cebra tiene rayas, el leopardo manchas y
la jirafa parches. El usuario manipula dos químicos (modelo de Gray-Scott),
recorre el "zoo de Turing" y, sobre todo, **ve las ecuaciones cobrar vida**: los
símbolos se vuelven números reales, una sonda conecta la fórmula con un punto
concreto del patrón, y un mapa f–k muestra en qué régimen biológico está parado.

La meta no es solo "ver patrones bonitos", sino que el aprendiz cierre el lazo
**ecuación ↔ fenómeno**: entender que cada píxel del patrón es esas dos
ecuaciones evaluándose, y que cambiar dos números (f, k) basta para pasar de la
piel de un leopardo a la de una cebra.

## Punto de partida

Existe una base funcional en el worktree `stupefied-wilbur-afcf2f`
(`src/modules/reaction/`): motor Gray-Scott con laplaciano de 9 puntos, doble
buffer, RNG determinista (mulberry32), pincel de siembra, presets
(mitosis/coral/laberinto/lunares/gusanos) y un panel de fórmulas en **texto
plano**. Se **rescata y trae a `main`**, no se reescribe desde cero.

Limitaciones a resolver:
1. Las fórmulas son `<code>` estático — no usan el módulo KaTeX (`Math`/`FormulaPanel`) que ya existe en `src/components/math/`.
2. No hay nada "en vivo": los números de las ecuaciones no se actualizan con los sliders.
3. No está integrado en `App.tsx` ni en el Dashboard.
4. Arrastra un test frágil (`el patrón crece desde la semilla`) que falla de forma no determinista.

## Las matemáticas (modelo de Gray-Scott)

Dos concentraciones por celda, U y V, que difunden y reaccionan:

```
∂U/∂t = Dᵤ ∇²U − U·V² + f·(1 − U)
∂V/∂t = Dᵥ ∇²V + U·V² − (k + f)·V
```

- **U** = reactivo, se repone desde fuera a tasa `f` hacia su nivel lleno (1).
- **V** = autocatalizador, se reproduce comiendo U: reacción `U + 2V → 3V`.
- **Dᵤ > Dᵥ**: U difunde rápido (inhibidor de largo alcance), V difunde lento
  (activador local). Esa asimetría es la **inestabilidad de Turing** que esculpe
  el patrón: "activación local + inhibición lejana" → manchas/rayas espaciadas.

Integración: Euler explícito, frontera toroidal, varias iteraciones de química
por fotograma.

## Arquitectura

Seis piezas, cada una con una responsabilidad clara. Archivos bajo
`src/modules/reaction/`.

### 1. `engine.ts` — motor (rescatado + ampliado)

Se conserva la clase `ReactionDiffusion` existente. Se **añade**:

```ts
interface RDTermBreakdown {
  u: number;            // concentración U en la celda
  v: number;            // concentración V en la celda
  // términos instantáneos de ∂U/∂t
  uDiffusion: number;   // Dᵤ ∇²U
  uReaction: number;    // − U·V²
  uFeed: number;        // f·(1 − U)
  duDt: number;         // suma de los tres
  // términos instantáneos de ∂V/∂t
  vDiffusion: number;   // Dᵥ ∇²V
  vReaction: number;    // + U·V²
  vDecay: number;       // − (k + f)·V
  dvDt: number;         // suma de los tres
}

probe(x: number, y: number, p: RDParams): RDTermBreakdown
```

`probe` evalúa los términos en una celda **sin avanzar el estado** (lectura
pura), reutilizando el método `laplace` existente. Invariante verificable por
test: `uDiffusion + uReaction + uFeed === duDt` (y análogo para V), y `duDt`
coincide con el incremento real que aplica `update` en esa celda en un paso.

### 2. `LiveFormula.tsx` — ecuaciones que se vuelven números

Renderiza las dos EDPs con KaTeX (módulo `Math`). Dos modos conmutables:

- **Símbolos**: `∂U/∂t = Dᵤ∇²U − UV² + f(1−U)` (la forma general).
- **Con números**: sustituye `Dᵤ, Dᵥ, f, k` por los valores actuales de los
  sliders (ej. `0.16·∇²U − UV² + 0.0367(1−U)`). Se actualiza al mover sliders.

Debajo de cada ecuación, una línea "en simple" por término (difusión = "compárate
con tus vecinos"; reacción = "V recluta U y se copia"; etc.). Lee los parámetros
vía un callback/estado ligero a ~5 Hz para no re-renderizar en el camino caliente.

### 3. `Probe` (componente dentro de `ReactionSim.tsx`) — la sonda

- Clic en el lienzo fija una sonda en una celda; marcador visible (cruz/anillo)
  dibujado sobre el canvas.
- Mini-panel asociado muestra, leyendo `engine.probe()` a ~5 Hz:
  - U y V actuales de esa celda (numérico).
  - Mini-gráfico temporal (sparkline en canvas/SVG) de U y V en las últimas
    ~120 muestras — se ve oscilar/estabilizar.
  - Barras horizontales del aporte de cada término (difusión / reacción /
    feed-decay) con signo y magnitud: qué está "ganando" ahora en ese punto.
- Conecta el píxel concreto con la ecuación abstracta: "esto que ves aquí ES
  `∂V/∂t` evaluándose".

### 4. `PhaseMap.tsx` — el mapa f–k del zoo de Turing

SVG del plano (f en eje X, k en eje Y) acotado al rango de los sliders. Regiones
sombreadas y etiquetadas con su lectura **biológica**:

| Región (aprox. f,k)        | Patrón            | Lectura biológica            |
|----------------------------|-------------------|------------------------------|
| f≈0.037, k≈0.065           | mitosis           | células dividiéndose         |
| f≈0.055, k≈0.062           | coral / ramas     | coral, dendritas             |
| f≈0.029, k≈0.057           | laberinto / rayas | cebra, pez cirujano, huellas |
| f≈0.030, k≈0.062           | lunares           | manchas de leopardo          |
| f≈0.078, k≈0.061           | gusanos           | serpientes vivas             |
| (parches poligonales)      | jirafa            | parches de jirafa            |

- Un punto marca la posición (f,k) actual; se mueve al ajustar sliders o elegir
  preset.
- Clic en el mapa = saltar a esos (f,k) (atajo exploratorio).
- Las fronteras son aproximadas/ilustrativas (es un mapa didáctico, no una
  clasificación rigurosa); se indica con una nota.

### 5. `ReactionSim.tsx` — orquestador (rescatado + reorganizado)

Conserva: bucle `requestAnimationFrame`, sliders que mutan `paramsRef` sin
re-render (patrón del proyecto), pincel, presets, reset, play/pausa, velocidad.
Añade: la sonda, integra `LiveFormula` y `PhaseMap`, y reescribe los textos con
encuadre de morfogénesis. Añade preset **Jirafa**.

### 6. Encuadre biológico (contenido)

Reescritura de copys (presets, guía didáctica, pie de fórmulas) con la narrativa:
Turing 1952; activador/inhibidor; por qué animales grandes con cola fina muestran
**manchas en el cuerpo y rayas en la cola** (mismo sistema, geometría distinta);
por qué no hay "plano" — el patrón es lo que queda en equilibrio.

## Flujo de datos

```
sliders → paramsRef (mutación directa, sin re-render)
            │
            ├─► engine.update(dt, paramsRef, iters)  [hot loop, rAF]
            │        └─► engine.render(ctx, img)
            │
            ├─► LiveFormula  (lee paramsRef a ~5 Hz)  → números en la ecuación
            ├─► PhaseMap     (lee paramsRef a ~5 Hz)  → posición del punto
            └─► Probe        (lee engine.probe() a ~5 Hz) → U,V, sparkline, barras
```

El estado de React **nunca** entra en el camino caliente del render (igual que
los demás módulos). Las piezas vivas leen por polling a baja frecuencia.

## Integración

- `App.tsx`: nueva `View` `'reaccion'`, ruta hash `#/reaccion`, `ModuleHeader`
  con código `PHY·02`, título "Reacción-Difusión · Cómo se forman manchas y
  rayas", subtítulo morfogénesis/Turing.
- `src/router.ts`: añadir `'reaccion'` al conjunto de vistas válidas.
- `dashboard/Dashboard.tsx`: en categoría `03`, nuevo módulo `PHY·02` con
  `view: 'reaccion'` (queda "En vivo").
- `dashboard/CardPreview.tsx` + `dashboard/previews.ts`: preview para `PHY·02`
  (un patrón Gray-Scott miniatura o motivo de manchas/rayas).
- `styles.css`: estilos para sonda, mini-gráfico, barras de término y mapa f–k,
  siguiendo el sistema de diseño existente (instrumentación científica, oscuro).

## Manejo de errores / robustez

- `probe(x,y)` valida límites; fuera de rejilla devuelve `null` y la UI oculta el
  panel de sonda.
- Si no hay sonda colocada, el panel muestra una invitación ("toca el patrón").
- El esquema numérico ya está acotado (test existente lo verifica); se mantiene.
- KaTeX: si falla el render de una fórmula, el módulo `Math` ya degrada a texto.

## Estrategia de testing

Tests en `engine.test.ts` (Vitest), determinista por semilla:

1. **(arreglo)** El test frágil `el patrón crece desde la semilla` se hace
   robusto: medir cobertura tras estabilizar con un preset de crecimiento
   monótono, o comparar contra un umbral con margen — no exigir crecimiento
   estricto en un punto donde la cobertura puede caer antes de crecer.
2. **probe — conservación**: `uDiffusion+uReaction+uFeed ≈ duDt` y
   `vDiffusion+vReaction+vDecay ≈ dvDt` (tolerancia de punto flotante).
3. **probe — coherencia con update**: en una celda, `probe().duDt` coincide con
   `U_después − U_antes` tras un paso de `update` con los mismos parámetros.
4. **probe — fuera de rango** devuelve `null`.
5. **mapeo preset → región**: cada preset cae dentro de la región esperada del
   `PhaseMap` (test de la función pura que clasifica (f,k) → región).
6. Se conservan los tests existentes (arranque, acotación, determinismo, pincel).

Los componentes React se verifican manualmente vía el preview del navegador
(snapshot/screenshot) como el resto del proyecto; la lógica testeable vive en el
motor y en funciones puras (clasificador de región, formateo de fórmula).

## Fuera de alcance (YAGNI)

- WebGL / cómputo en GPU (Canvas 2D basta para 200×150).
- Otros modelos de RD (Gierer-Meinhardt, FitzHugh-Nagumo) — solo Gray-Scott.
- Exportar/guardar patrones.
- Animación de "crecimiento" de un animal real sobre el patrón.
- Ajuste fino riguroso de las fronteras del mapa f–k (son ilustrativas).

## Criterios de éxito

1. El módulo aparece en el Dashboard (PHY·02, "En vivo") y es accesible por
   `#/reaccion`.
2. Mover un slider cambia **en vivo** los números dentro de la ecuación KaTeX.
3. Tocar el patrón coloca una sonda que muestra U, V, su evolución temporal y el
   aporte de cada término en ese punto.
4. El mapa f–k muestra la posición actual y permite saltar entre regímenes
   biológicos (cebra ↔ leopardo ↔ jirafa…).
5. `npm run build` pasa sin errores de tipos; `npm test` pasa al 100%
   (incluido el test antes frágil).
