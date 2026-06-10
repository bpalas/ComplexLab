# Complexity Labs — Rediseño de la cáscara (estilo Google Labs · oscuro)

**Fecha:** 2026-06-10
**Estado:** Aprobado (diseño) — pendiente de plan de implementación
**Alcance:** Rebranding + rediseño visual de toda la cáscara de la SPA (portada, topbar, footer, ModuleHeader). Las simulaciones canvas NO se tocan.

---

## 1. Objetivo

Transformar la cáscara de ChronosCortex en **Complexity Labs**, una portada y chrome con el lenguaje visual de **Google Labs** (labs.google) adaptado a **fondo oscuro**: tipografía grande y amable, mucho aire, tarjetas redondeadas con hover, y gradientes orgánicos vibrantes que fluyen con animación CSS sutil. El contenido se re-enmarca como **experimentos** que el usuario puede probar.

El objetivo es de presentación, no funcional: el routing, el estado y las cuatro simulaciones siguen funcionando exactamente igual.

---

## 2. Marca y lenguaje

- **Nombre:** `Complexity Labs` reemplaza a `ChronosCortex` en topbar, footer y `<title>` de `index.html`.
- **Wordmark:** "Complexity" en tinta normal + "Labs" teñido por el gradiente de marca (degradado de texto). Reemplaza el `brand-dot` + `CHRONOSCORTEX` actual.
- **Tono:** editorial, divulgativo, en **español** (la app es educativa en español). Hero con titular grande y subtítulo del tipo: *"Un laboratorio de sistemas complejos. Prueba experimentos interactivos y observa cómo emerge el orden — o colapsa."*
- **Copy de marca/tagline/hero:** lo propone Fable 5 dentro de estas pautas; el usuario lo revisa en el resultado.

---

## 3. Sistema visual (Google Labs, oscuro)

**Fondo y color**
- Se **retira** la retícula de "instrumentación" (`body::before` con grilla de 44px).
- Se sustituye por **mesh-gradients orgánicos** reutilizando la paleta existente (`--cyan #45e6c8`, `--blue #4aa8ff`, `--magenta #ff5d8f`, `--amber #ffb454`) sobre el fondo oscuro (`--bg0 #04070d`).
- **Animación:** los gradientes se desplazan/respiran lentamente con **animación CSS pura** (`@keyframes`, transform/background-position), **nunca** `requestAnimationFrame`.
- **Accesibilidad de movimiento:** envolver toda la animación en `@media (prefers-reduced-motion: reduce)` que la desactiva (gradiente estático).

**Tipografía**
- Display amable tipo Google Sans vía Google Fonts (preferencia: **Plus Jakarta Sans**; alternativa **Manrope**). Titulares grandes, peso medio/semibold, redondeada.
- El mono actual (**IBM Plex Mono**) se conserva **solo** para detalles técnicos: códigos de módulo (`NET·03`), badges, kickers.
- Chakra Petch puede retirarse del shell si Plus Jakarta Sans la sustituye por completo.

**Componentes**
- **Tarjetas:** esquinas muy redondeadas (~20–24px), superficie *glassy* sutil (fondo translúcido + borde fino), **hover con elevación + glow** de gradiente. Acento de color por categoría.
- Espaciado generoso (mucho aire entre secciones y dentro de tarjetas).

---

## 4. Estructura de la portada y chrome

Se mantiene la jerarquía de datos actual (no se inventan módulos ni categorías).

- **Topbar:** wordmark Complexity Labs a la izquierda; navegación a la derecha como *pills* limpias (mismas vistas: Panel, módulos). Estado activo con acento de gradiente.
- **Hero:** kicker corto + titular grande editorial + subtítulo, sobre el mesh-gradient animado. Opcionalmente un CTA suave hacia el primer experimento en vivo.
- **Secciones por categoría:** se conservan las **2 categorías** actuales (`01 Fundamentos de Aprendizaje en Redes`, `02 Agentes de IA y Sistemas Tecnosociales`) con su índice, nombre y blurb.
- **Tarjetas de experimento:** cada módulo se presenta como experimento con:
  - badge **Experiment** + estado **En vivo** / **Próximamente** (data-driven, según `view` presente o no),
  - código (`NET·00`, `AGI·01`, …),
  - título,
  - descripción,
  - CTA **"Probar →"** en las activas.
- **Footer:** minimal, una línea de marca + nota técnica.

---

## 5. ModuleHeader

Rediseño coherente con el lenguaje Labs: chip de código (`NET·03`) + título grande + subtítulo, sobre una franja con gradiente sutil. Misma API de props (`code`, `title`, `sub`) — solo cambia la presentación.

---

## 6. Restricciones (qué NO se toca)

- **Simulaciones canvas** (`SandboxSim`, `NetworkSim`, `AgentsSim`, `CellularSim`) y su lógica: **intactas**.
- **Routing/estado** de `App.tsx` (conmutación de `view`): se mantiene; solo cambia la presentación (markup/clases/textos de marca).
- **Estados En vivo/Próximamente:** siguen siendo data-driven (presencia de `view` en `ModuleDef`).
- **Sin dependencias pesadas nuevas:** gradientes y motion con **CSS puro**. Fuentes vía Google Fonts (mismo patrón que ya usa `index.html`).
- **Accesibilidad:** contraste de texto suficiente sobre el fondo oscuro; `prefers-reduced-motion` respetado.
- **Tests y build:** `npm test` (7 tests) y `npm run build` (`tsc --noEmit && vite build`) deben seguir pasando.

---

## 7. Archivos afectados

- `index.html` — `<title>` a "Complexity Labs …", enlaces de Google Fonts (añadir Plus Jakarta Sans).
- `src/styles.css` — reescritura de las secciones del shell: variables de fuente, `body`/fondo, `.topbar`/`.brand`/`.nav-btn`, `.dashboard`/`.hero`/`.category`/`.card`, `.footbar`, `.module-header`. Las clases `.ca-*` y de los módulos no se tocan salvo que hereden variables.
- `src/App.tsx` — wordmark Complexity Labs, textos de marca, labels de nav si aplica. Sin cambios de lógica de `view`.
- `src/dashboard/Dashboard.tsx` — hero/copy editorial, framing de "experimento" en las tarjetas (badge, CTA). Estructura de datos `CATEGORIES` intacta.

---

## 8. Construcción

- El músculo de diseño lo pone un sub-agente con el modelo **Fable 5**, que produce el nuevo CSS del shell y los ajustes de markup/copy en `index.html`, `App.tsx` y `Dashboard.tsx` dentro de estas pautas.
- El agente coordinador (Opus) integra el resultado, verifica `npx tsc --noEmit`, `npm test` y `npm run build`, y comprueba que las cuatro simulaciones siguen abriéndose y funcionando.
- Commits pequeños por hito verificado, siguiendo la convención del repo.

---

## 9. Criterio de éxito

1. La portada se ve claramente "Google Labs en oscuro": tipografía grande, aire, tarjetas redondeadas con hover, gradientes vibrantes animados.
2. La marca es **Complexity Labs** en topbar, footer y título de pestaña.
3. Las tarjetas se leen como experimentos con estado En vivo/Próximamente.
4. Las 4 simulaciones abren y funcionan igual que antes; `npm test` y `npm run build` pasan.
5. Se respeta `prefers-reduced-motion`.
