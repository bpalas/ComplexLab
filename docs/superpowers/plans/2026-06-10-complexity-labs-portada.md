# Complexity Labs — Portada (Google Labs · oscuro) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebautizar la SPA a **Complexity Labs** y rediseñar toda su cáscara (portada, topbar, footer, ModuleHeader) con el lenguaje visual de Google Labs en oscuro, sin tocar las simulaciones.

**Architecture:** El músculo de diseño lo pone un sub-agente con el modelo **Fable 5**, en dos pasadas cohesivas: (Task 2) sistema de diseño + chrome global (tokens, fondo mesh-gradient animado, topbar, footer); (Task 3) portada (hero + tarjetas de experimento) + ModuleHeader, consumiendo los tokens de la pasada anterior. El coordinador (Opus) prepara lo determinista, integra cada pasada, verifica `tsc`/`test`/`build` y la regresión de los 4 módulos. Animación con **CSS puro** (no `requestAnimationFrame`), respetando `prefers-reduced-motion`.

**Tech Stack:** React 18 + TypeScript + Vite + CSS puro. Fuentes vía Google Fonts. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-06-10-complexity-labs-portada-design.md`

**Convenciones del repo:** commits pequeños tras cada hito verificado; `npm run build` (`tsc --noEmit && vite build`) y `npm test` (7 tests) deben pasar.

---

## Mapa de archivos

- `index.html` — `<title>` y enlace de Google Fonts (Plus Jakarta Sans). *(Task 1)*
- `src/styles.css` — reescritura de las secciones del shell: tokens de fuente, `body`/fondo, `.topbar`/`.brand`/`.nav-btn`/`.footbar` *(Task 2)*; `.dashboard`/`.hero`/`.category`/`.card`/`.module-header` *(Task 3)*. Las clases `.ca-*` y de módulos no se tocan.
- `src/App.tsx` — wordmark Complexity Labs, footer, markup de `ModuleHeader`. Sin cambios en la lógica de `view`.
- `src/dashboard/Dashboard.tsx` — hero/copy editorial + framing de "experimento" en tarjetas. `CATEGORIES` (datos) intacto.

---

### Task 1: Preparación — fuentes y título

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Añadir Plus Jakarta Sans y actualizar el título**

En `index.html`, reemplazar el bloque de fuentes y el `<title>` por:

```html
    <title>Complexity Labs — Laboratorio de Sistemas Complejos</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
```

(Se retira Chakra Petch; IBM Plex Mono se conserva para detalles técnicos.)

- [ ] **Step 2: Verificar que el build sigue pasando**

Run: `npm run build`
Expected: sin errores; bundle generado.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "chore: fuentes Plus Jakarta Sans y rebrand de title a Complexity Labs"
```

---

### Task 2: Sistema de diseño + chrome global (Fable 5)

**Files:**
- Modify: `src/styles.css` (secciones globales: tokens, `body`, `body::before`, `.app`, `.topbar`, `.brand*`, `.nav-btn`, `.main`, `.footbar`)
- Modify: `src/App.tsx` (wordmark de marca en `.brand`, footer)

- [ ] **Step 1: Despachar a Fable 5 el chrome global**

Lanzar un sub-agente con `model: 'fable'` con este brief (pasarle también el contenido actual de `src/styles.css` líneas 1–230 y de `src/App.tsx`):

> **Tarea:** Rediseña el *chrome global* de esta SPA React (Vite + CSS puro) al lenguaje visual de **Google Labs (labs.google) en oscuro**, y rebautiza la marca a **Complexity Labs**. NO toques las simulaciones ni las clases `.ca-*` ni la lógica de `view`. Idioma del producto: español.
>
> **Edita SOLO** estas secciones de `src/styles.css`: variables `:root`, `body`, `body::before`, `.app`, `.topbar`, `.brand` y derivadas, `.nav-btn`, `.main`, `.footbar`. Y en `src/App.tsx`: el contenido del botón `.brand` (wordmark) y el `<footer>`.
>
> **Requisitos:**
> - **Tokens de fuente:** display `'Plus Jakarta Sans'` (ya cargada), mono `'IBM Plex Mono'` solo para detalles técnicos. Define una variable `--display` y `--mono`.
> - **Fondo:** retira la retícula de instrumentación (`body::before`). Sustitúyela por **mesh-gradients orgánicos vibrantes** reutilizando la paleta (`--cyan #45e6c8`, `--blue #4aa8ff`, `--magenta #ff5d8f`, `--amber #ffb454`) sobre `--bg0 #04070d`. Anímalos con **CSS puro** (`@keyframes`, ~20–40s, lentos, "respiración"). **Prohibido** `requestAnimationFrame`/JS para la animación.
> - **Accesibilidad de movimiento:** envuelve toda animación en `@media (prefers-reduced-motion: reduce)` que la desactiva (gradiente estático).
> - **Topbar:** wordmark `Complexity` + `Labs` (con `Labs` teñido por un degradado de texto de la paleta). Reemplaza el `brand-dot`. Nav a la derecha como *pills* limpias; estado `.active` con acento de gradiente. Mismas labels y handlers (no cambies props ni `onClick`).
> - **Footer:** minimal, una línea de marca "Complexity Labs" + nota técnica.
> - **Contraste** de texto suficiente sobre el fondo oscuro.
>
> **Salida:** edita los archivos directamente. No añadas dependencias. No toques `Dashboard.tsx` (esa es otra pasada).

- [ ] **Step 2: Revisar el diff e integrar**

Leer el diff de `src/styles.css` y `src/App.tsx`. Confirmar: sin JS de animación, `prefers-reduced-motion` presente, labels/handlers de nav intactos, ninguna clase `.ca-*` ni de módulo modificada.

- [ ] **Step 3: Verificar tipos y build**

Run: `npx tsc --noEmit` → sin errores.
Run: `npm run build` → sin errores.

- [ ] **Step 4: Verificación visual del chrome**

Run: `npm run dev` y abrir el preview. Confirmar topbar con wordmark Complexity Labs, nav en pills, fondo con gradiente animado, footer de marca. Sin errores de consola.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/App.tsx
git commit -m "feat: chrome global Complexity Labs (Google Labs oscuro, fondo mesh-gradient)"
```

---

### Task 3: Portada (hero + tarjetas de experimento) + ModuleHeader (Fable 5)

**Files:**
- Modify: `src/dashboard/Dashboard.tsx` (hero/copy + framing de experimento)
- Modify: `src/styles.css` (`.dashboard`, `.hero*`, `.category*`, `.card*`, `.module-header*`)
- Modify: `src/App.tsx` (markup de `ModuleHeader` si hace falta para el restyle)

- [ ] **Step 1: Despachar a Fable 5 la portada**

Lanzar un sub-agente con `model: 'fable'` con este brief (pasarle el `src/dashboard/Dashboard.tsx` y `src/App.tsx` actuales, y las variables/tokens ya definidos por la Task 2 en `src/styles.css`):

> **Tarea:** Rediseña la **portada** (Dashboard) y el **ModuleHeader** al lenguaje **Google Labs en oscuro**, reusando los tokens y la paleta ya definidos en `src/styles.css` por la pasada anterior (no redefinas el fondo ni la topbar). Producto en español, marca **Complexity Labs**.
>
> **Edita:**
> - `src/styles.css`: SOLO `.dashboard`, `.hero` y derivadas, `.category` y derivadas, `.card` y derivadas, `.module-header` y derivadas.
> - `src/dashboard/Dashboard.tsx`: hero editorial + framing de "experimento" en las tarjetas. **No** cambies la estructura de datos `CATEGORIES` (códigos, títulos, descripciones, `view`). El estado En vivo/Próximamente se deriva de la presencia de `m.view` (igual que ahora). Mantén `onOpen(m.view)` y `disabled={!active}`.
> - `src/App.tsx`: el JSX de `ModuleHeader` (props `code`, `title`, `sub` sin cambios).
>
> **Requisitos visuales:**
> - **Hero:** kicker corto + titular grande editorial (Plus Jakarta Sans, peso 700/800) + subtítulo divulgativo. Propón el copy en español (sugerencia de subtítulo: *"Prueba experimentos interactivos de sistemas complejos y observa cómo emerge el orden — o colapsa."*). Opcional: CTA suave al primer experimento en vivo.
> - **Tarjetas de experimento:** esquinas muy redondeadas (~20–24px), superficie *glassy* (fondo translúcido + borde fino), **hover con elevación + glow** de gradiente, mucho aire. Cada tarjeta: badge **Experiment** + estado **En vivo** / **Próximamente**, código (`NET·03`) en mono, título, descripción, y CTA **"Probar →"** en las activas. Acento de color por categoría.
> - **ModuleHeader:** chip de código + título grande + subtítulo sobre una franja con gradiente sutil, coherente con el resto.
> - Respeta `prefers-reduced-motion` para cualquier transición no esencial.
>
> **Salida:** edita los archivos directamente. No añadas dependencias. No toques las simulaciones ni las clases `.ca-*`.

- [ ] **Step 2: Revisar el diff e integrar**

Leer el diff. Confirmar: `CATEGORIES` sin cambios de datos, `onOpen`/`disabled` intactos, props de `ModuleHeader` sin cambios, sin clases de módulo tocadas.

- [ ] **Step 3: Verificar tipos y build**

Run: `npx tsc --noEmit` → sin errores.
Run: `npm run build` → sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/Dashboard.tsx src/styles.css src/App.tsx
git commit -m "feat: portada Complexity Labs con tarjetas de experimento y ModuleHeader"
```

---

### Task 4: Verificación integral y regresión

**Files:** (ninguno nuevo; ajustes si la verificación lo exige)

- [ ] **Step 1: Tests y build**

Run: `npm test` → **7 tests PASS** (sin cambios respecto al motor).
Run: `npm run build` → sin errores.

- [ ] **Step 2: Regresión de los 4 módulos en el preview**

Run: `npm run dev`. Para cada vista (`laboratorio`, `red`, `agentes`, `celular`): abrir desde la portada y confirmar vía `preview_snapshot` que el `ModuleHeader` y el `<canvas>` del módulo renderizan. (La animación rAF de los canvas no se ejercita en el preview headless — limitación de entorno conocida; basta confirmar que montan sin errores de consola.)

- [ ] **Step 2b: Accesibilidad de movimiento**

Verificar con `preview_eval` que con `matchMedia('(prefers-reduced-motion: reduce)')` no hay animaciones de gradiente activas (o que el CSS las desactiva). Confirmar contraste de texto legible sobre el fondo.

- [ ] **Step 3: Ajustes finos (si procede)**

Si algo no cuadra (cohesión, contraste, copy), iterar con un sub-agente Fable 5 acotado al punto concreto, revisar e integrar.

- [ ] **Step 4: Commit final (si hubo ajustes)**

```bash
git add -A
git commit -m "fix: ajustes finos del rediseno Complexity Labs"
```

---

## Self-Review (cobertura del spec)

- Marca Complexity Labs (topbar/footer/title): Task 1 (title) + Task 2 (wordmark/footer). ✔
- Google Labs oscuro (fondo mesh-gradient animado CSS, sin grilla): Task 2. ✔
- Tipografía amable (Plus Jakarta Sans) + mono solo técnico: Task 1 + Task 2. ✔
- Tarjetas redondeadas glassy con hover/glow: Task 3. ✔
- Hero editorial + framing de experimentos (badge/estado/CTA): Task 3. ✔
- ModuleHeader coherente: Task 3. ✔
- `prefers-reduced-motion`: Task 2 (define) + Task 4 (verifica). ✔
- Simulaciones intactas + routing/datos sin cambios: restricciones explícitas en Tasks 2–3 + regresión Task 4. ✔
- `npm test` (7) y `npm run build` pasan: verificado en Tasks 1–4. ✔
- Sin dependencias nuevas: restricción explícita en los briefs. ✔
