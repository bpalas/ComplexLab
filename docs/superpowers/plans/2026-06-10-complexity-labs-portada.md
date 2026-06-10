# Complexity Labs â€” Portada (Google Labs Â· oscuro) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Rebautizar la SPA a **Complexity Labs** y rediseÃ±ar toda su cÃ¡scara (portada, topbar, footer, ModuleHeader) con el lenguaje visual de Google Labs en oscuro, sin tocar las simulaciones.

**Architecture:** El mÃºsculo de diseÃ±o lo pone un sub-agente con el modelo **Fable 5**, en dos pasadas cohesivas: (Task 2) sistema de diseÃ±o + chrome global (tokens, fondo mesh-gradient animado, topbar, footer); (Task 3) portada (hero + tarjetas de experimento) + ModuleHeader, consumiendo los tokens de la pasada anterior. El coordinador (Opus) prepara lo determinista, integra cada pasada, verifica `tsc`/`test`/`build` y la regresiÃ³n de los 4 mÃ³dulos. AnimaciÃ³n con **CSS puro** (no `requestAnimationFrame`), respetando `prefers-reduced-motion`.

**Tech Stack:** React 18 + TypeScript + Vite + CSS puro. Fuentes vÃ­a Google Fonts. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-06-10-complexity-labs-portada-design.md`

**Convenciones del repo:** commits pequeÃ±os tras cada hito verificado; `npm run build` (`tsc --noEmit && vite build`) y `npm test` (7 tests) deben pasar.

---

## Mapa de archivos

- `index.html` â€” `<title>` y enlace de Google Fonts (Plus Jakarta Sans). *(Task 1)*
- `src/styles.css` â€” reescritura de las secciones del shell: tokens de fuente, `body`/fondo, `.topbar`/`.brand`/`.nav-btn`/`.footbar` *(Task 2)*; `.dashboard`/`.hero`/`.category`/`.card`/`.module-header` *(Task 3)*. Las clases `.ca-*` y de mÃ³dulos no se tocan.
- `src/App.tsx` â€” wordmark Complexity Labs, footer, markup de `ModuleHeader`. Sin cambios en la lÃ³gica de `view`.
- `src/dashboard/Dashboard.tsx` â€” hero/copy editorial + framing de "experimento" en tarjetas. `CATEGORIES` (datos) intacto.

---

### Task 1: PreparaciÃ³n â€” fuentes y tÃ­tulo

**Files:**
- Modify: `index.html`

- [x] **Step 1: AÃ±adir Plus Jakarta Sans y actualizar el tÃ­tulo**

En `index.html`, reemplazar el bloque de fuentes y el `<title>` por:

```html
    <title>Complexity Labs â€” Laboratorio de Sistemas Complejos</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
```

(Se retira Chakra Petch; IBM Plex Mono se conserva para detalles tÃ©cnicos.)

- [x] **Step 2: Verificar que el build sigue pasando**

Run: `npm run build`
Expected: sin errores; bundle generado.

- [x] **Step 3: Commit**

```bash
git add index.html
git commit -m "chore: fuentes Plus Jakarta Sans y rebrand de title a Complexity Labs"
```

---

### Task 2: Sistema de diseÃ±o + chrome global (Fable 5)

**Files:**
- Modify: `src/styles.css` (secciones globales: tokens, `body`, `body::before`, `.app`, `.topbar`, `.brand*`, `.nav-btn`, `.main`, `.footbar`)
- Modify: `src/App.tsx` (wordmark de marca en `.brand`, footer)

- [x] **Step 1: Despachar a Fable 5 el chrome global**

Lanzar un sub-agente con `model: 'fable'` con este brief (pasarle tambiÃ©n el contenido actual de `src/styles.css` lÃ­neas 1â€“230 y de `src/App.tsx`):

> **Tarea:** RediseÃ±a el *chrome global* de esta SPA React (Vite + CSS puro) al lenguaje visual de **Google Labs (labs.google) en oscuro**, y rebautiza la marca a **Complexity Labs**. NO toques las simulaciones ni las clases `.ca-*` ni la lÃ³gica de `view`. Idioma del producto: espaÃ±ol.
>
> **Edita SOLO** estas secciones de `src/styles.css`: variables `:root`, `body`, `body::before`, `.app`, `.topbar`, `.brand` y derivadas, `.nav-btn`, `.main`, `.footbar`. Y en `src/App.tsx`: el contenido del botÃ³n `.brand` (wordmark) y el `<footer>`.
>
> **Requisitos:**
> - **Tokens de fuente:** display `'Plus Jakarta Sans'` (ya cargada), mono `'IBM Plex Mono'` solo para detalles tÃ©cnicos. Define una variable `--display` y `--mono`.
> - **Fondo:** retira la retÃ­cula de instrumentaciÃ³n (`body::before`). SustitÃºyela por **mesh-gradients orgÃ¡nicos vibrantes** reutilizando la paleta (`--cyan #45e6c8`, `--blue #4aa8ff`, `--magenta #ff5d8f`, `--amber #ffb454`) sobre `--bg0 #04070d`. AnÃ­malos con **CSS puro** (`@keyframes`, ~20â€“40s, lentos, "respiraciÃ³n"). **Prohibido** `requestAnimationFrame`/JS para la animaciÃ³n.
> - **Accesibilidad de movimiento:** envuelve toda animaciÃ³n en `@media (prefers-reduced-motion: reduce)` que la desactiva (gradiente estÃ¡tico).
> - **Topbar:** wordmark `Complexity` + `Labs` (con `Labs` teÃ±ido por un degradado de texto de la paleta). Reemplaza el `brand-dot`. Nav a la derecha como *pills* limpias; estado `.active` con acento de gradiente. Mismas labels y handlers (no cambies props ni `onClick`).
> - **Footer:** minimal, una lÃ­nea de marca "Complexity Labs" + nota tÃ©cnica.
> - **Contraste** de texto suficiente sobre el fondo oscuro.
>
> **Salida:** edita los archivos directamente. No aÃ±adas dependencias. No toques `Dashboard.tsx` (esa es otra pasada).

- [x] **Step 2: Revisar el diff e integrar**

Leer el diff de `src/styles.css` y `src/App.tsx`. Confirmar: sin JS de animaciÃ³n, `prefers-reduced-motion` presente, labels/handlers de nav intactos, ninguna clase `.ca-*` ni de mÃ³dulo modificada.

- [x] **Step 3: Verificar tipos y build**

Run: `npx tsc --noEmit` â†’ sin errores.
Run: `npm run build` â†’ sin errores.

- [x] **Step 4: VerificaciÃ³n visual del chrome**

Run: `npm run dev` y abrir el preview. Confirmar topbar con wordmark Complexity Labs, nav en pills, fondo con gradiente animado, footer de marca. Sin errores de consola.

- [x] **Step 5: Commit**

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

- [x] **Step 1: Despachar a Fable 5 la portada**

Lanzar un sub-agente con `model: 'fable'` con este brief (pasarle el `src/dashboard/Dashboard.tsx` y `src/App.tsx` actuales, y las variables/tokens ya definidos por la Task 2 en `src/styles.css`):

> **Tarea:** RediseÃ±a la **portada** (Dashboard) y el **ModuleHeader** al lenguaje **Google Labs en oscuro**, reusando los tokens y la paleta ya definidos en `src/styles.css` por la pasada anterior (no redefinas el fondo ni la topbar). Producto en espaÃ±ol, marca **Complexity Labs**.
>
> **Edita:**
> - `src/styles.css`: SOLO `.dashboard`, `.hero` y derivadas, `.category` y derivadas, `.card` y derivadas, `.module-header` y derivadas.
> - `src/dashboard/Dashboard.tsx`: hero editorial + framing de "experimento" en las tarjetas. **No** cambies la estructura de datos `CATEGORIES` (cÃ³digos, tÃ­tulos, descripciones, `view`). El estado En vivo/PrÃ³ximamente se deriva de la presencia de `m.view` (igual que ahora). MantÃ©n `onOpen(m.view)` y `disabled={!active}`.
> - `src/App.tsx`: el JSX de `ModuleHeader` (props `code`, `title`, `sub` sin cambios).
>
> **Requisitos visuales:**
> - **Hero:** kicker corto + titular grande editorial (Plus Jakarta Sans, peso 700/800) + subtÃ­tulo divulgativo. PropÃ³n el copy en espaÃ±ol (sugerencia de subtÃ­tulo: *"Prueba experimentos interactivos de sistemas complejos y observa cÃ³mo emerge el orden â€” o colapsa."*). Opcional: CTA suave al primer experimento en vivo.
> - **Tarjetas de experimento:** esquinas muy redondeadas (~20â€“24px), superficie *glassy* (fondo translÃºcido + borde fino), **hover con elevaciÃ³n + glow** de gradiente, mucho aire. Cada tarjeta: badge **Experiment** + estado **En vivo** / **PrÃ³ximamente**, cÃ³digo (`NETÂ·03`) en mono, tÃ­tulo, descripciÃ³n, y CTA **"Probar â†’"** en las activas. Acento de color por categorÃ­a.
> - **ModuleHeader:** chip de cÃ³digo + tÃ­tulo grande + subtÃ­tulo sobre una franja con gradiente sutil, coherente con el resto.
> - Respeta `prefers-reduced-motion` para cualquier transiciÃ³n no esencial.
>
> **Salida:** edita los archivos directamente. No aÃ±adas dependencias. No toques las simulaciones ni las clases `.ca-*`.

- [x] **Step 2: Revisar el diff e integrar**

Leer el diff. Confirmar: `CATEGORIES` sin cambios de datos, `onOpen`/`disabled` intactos, props de `ModuleHeader` sin cambios, sin clases de mÃ³dulo tocadas.

- [x] **Step 3: Verificar tipos y build**

Run: `npx tsc --noEmit` â†’ sin errores.
Run: `npm run build` â†’ sin errores.

- [x] **Step 4: Commit**

```bash
git add src/dashboard/Dashboard.tsx src/styles.css src/App.tsx
git commit -m "feat: portada Complexity Labs con tarjetas de experimento y ModuleHeader"
```

---

### Task 4: VerificaciÃ³n integral y regresiÃ³n

**Files:** (ninguno nuevo; ajustes si la verificaciÃ³n lo exige)

- [x] **Step 1: Tests y build**

Run: `npm test` â†’ **7 tests PASS** (sin cambios respecto al motor).
Run: `npm run build` â†’ sin errores.

- [x] **Step 2: RegresiÃ³n de los 4 mÃ³dulos en el preview**

Run: `npm run dev`. Para cada vista (`laboratorio`, `red`, `agentes`, `celular`): abrir desde la portada y confirmar vÃ­a `preview_snapshot` que el `ModuleHeader` y el `<canvas>` del mÃ³dulo renderizan. (La animaciÃ³n rAF de los canvas no se ejercita en el preview headless â€” limitaciÃ³n de entorno conocida; basta confirmar que montan sin errores de consola.)

- [x] **Step 2b: Accesibilidad de movimiento**

Verificar con `preview_eval` que con `matchMedia('(prefers-reduced-motion: reduce)')` no hay animaciones de gradiente activas (o que el CSS las desactiva). Confirmar contraste de texto legible sobre el fondo.

- [x] **Step 3: Ajustes finos (si procede)**

Si algo no cuadra (cohesiÃ³n, contraste, copy), iterar con un sub-agente Fable 5 acotado al punto concreto, revisar e integrar.

- [x] **Step 4: Commit final (si hubo ajustes)**

```bash
git add -A
git commit -m "fix: ajustes finos del rediseno Complexity Labs"
```

---

## Self-Review (cobertura del spec)

- Marca Complexity Labs (topbar/footer/title): Task 1 (title) + Task 2 (wordmark/footer). âœ”
- Google Labs oscuro (fondo mesh-gradient animado CSS, sin grilla): Task 2. âœ”
- TipografÃ­a amable (Plus Jakarta Sans) + mono solo tÃ©cnico: Task 1 + Task 2. âœ”
- Tarjetas redondeadas glassy con hover/glow: Task 3. âœ”
- Hero editorial + framing de experimentos (badge/estado/CTA): Task 3. âœ”
- ModuleHeader coherente: Task 3. âœ”
- `prefers-reduced-motion`: Task 2 (define) + Task 4 (verifica). âœ”
- Simulaciones intactas + routing/datos sin cambios: restricciones explÃ­citas en Tasks 2â€“3 + regresiÃ³n Task 4. âœ”
- `npm test` (7) y `npm run build` pasan: verificado en Tasks 1â€“4. âœ”
- Sin dependencias nuevas: restricciÃ³n explÃ­cita en los briefs. âœ”
