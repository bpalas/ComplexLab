# Portada estilo Labs Science — renders reales + modo claro/oscuro

**Fecha:** 2026-06-10
**Estado:** Aprobado (diseño) — pendiente de plan de implementación
**Alcance:** Evolución de la cáscara "Complexity Labs" para acercarla a labs.google/science: cada tarjeta de experimento con una imagen ilustrativa (render real de su simulación), toggle de modo claro/oscuro, sin botones tipo "Express interest", y limpieza del look "hecho por IA". Las simulaciones canvas y su lógica NO se tocan.

---

## 1. Objetivo

La portada ya tiene el lenguaje "Google Labs oscuro". Esta iteración la acerca al referente concreto (labs.google/science):

1. **Imagen por tarjeta:** cada experimento muestra arriba un render real de su simulación, como las capturas estilizadas de Labs Science.
2. **Modo claro/oscuro:** toggle ☀/☾ en la topbar, por defecto según el sistema, con persistencia.
3. **Menos "IA":** se retiran efectos que delatan generación automática (gradientes animados de fondo, glows neón, wordmark degradado) en favor de superficies planas, sombras suaves y acentos sólidos.

Objetivo de presentación: routing, estado y las simulaciones siguen funcionando igual.

---

## 2. Sistema de temas

- Variables CSS en dos bloques:
  - `:root` — modo **oscuro** (paleta actual depurada: `--bg0 #04070d`, acentos `--cyan #45e6c8`, `--blue #4aa8ff`, `--magenta #ff5d8f`, `--amber #ffb454`).
  - `[data-theme="light"]` — modo **claro, blanco frío técnico**: fondo `~#f7f9fb`, tarjetas blancas, bordes `#dde5ec`, tinta `#16202a`, acentos en versión saturada para contraste suficiente.
- Hook `useTheme` en `App.tsx`:
  - Inicializa desde `localStorage`; si no hay valor guardado, usa `prefers-color-scheme`.
  - Aplica `data-theme` en `<html>` (o `document.documentElement`).
  - Persiste cada cambio en `localStorage`.
- **Toggle** ☀/☾ como botón en la topbar (junto a la navegación).
- Sin dependencias nuevas.

---

## 3. Limpieza del look "IA"

Se **eliminan** del CSS:
- mesh-gradients animados del `body`,
- glows de gradiente en hover de tarjetas,
- texto degradado del wordmark.

Reemplazos:
- Fondo **plano** por tema.
- Hover de tarjeta = **elevación con sombra suave** + borde que se acentúa (sin neón).
- Wordmark **"Complexity Labs"** en tinta sólida, con "Labs" en el color de acento (sólido, no degradado).
- Tipografía **Plus Jakarta Sans** (display) e **IBM Plex Mono** (códigos/badges) se mantienen.

Al no haber animación de fondo, `prefers-reduced-motion` deja de ser necesario para el fondo.

---

## 4. Tarjetas con render real

- Nuevo componente `CardPreview` que recibe el código/identificador del módulo y renderiza un `<canvas>` (~360×160) arriba de la tarjeta.
- **Módulos con motor** (`laboratorio` → NET·00, `red` → NET·01, `celular` → NET·03, `agentes` → AGI·01):
  - En un `useEffect` se importa y ejecuta el **motor existente** N pasos **una sola vez** (sin `requestAnimationFrame` continuo) y se dibuja un frame estático representativo.
  - Los motores **no se modifican**: solo se importan y se ejecutan para producir el frame.
- **Módulos "Próximamente"** (PSO/NET·02, Cascadas/AGI·02, Moltbook/AGI·03):
  - Motivo generativo **determinista** simple, del mismo estilo visual (sin motor real).
- Cuerpo de la tarjeta (debajo del render): código (`NET·03`) como kicker mono, título, descripción breve, estado **En vivo / Próximamente** y CTA **"Probar →"** en las activas.
- Estado data-driven según presencia de `view` en `ModuleDef` (igual que hoy).

---

## 5. Copy del hero

- Más directo y sobrio. Titular tipo **"Experimentos de sistemas complejos"**; subtítulo una frase simple, sin guiones largos ni frases tipo "observa cómo emerge el orden — o colapsa".
- Copy final lo propone Fable 5 dentro de estas pautas; el usuario lo revisa en el resultado.
- **Sin** botones "Express interest" ni equivalentes.

---

## 6. Restricciones (qué NO se toca)

- **Simulaciones canvas** (`SandboxSim`, `NetworkSim`, `AgentsSim`, `CellularSim`) y su lógica: **intactas**.
- **Motores** (`engine.ts` de cada módulo): solo se **importan/ejecutan** para los previews; no se editan.
- **Routing/estado** de `App.tsx` (conmutación de `view`): se mantiene; se añade solo el estado de tema.
- **Estructura de datos** `CATEGORIES`: intacta.
- **Sin dependencias pesadas nuevas.**
- **Accesibilidad:** contraste de texto suficiente en **ambos** temas.
- **Tests y build:** `npm test` y `npm run build` (`tsc --noEmit && vite build`) deben seguir pasando.

---

## 7. Archivos afectados

- `src/App.tsx` — hook `useTheme`, botón toggle ☀/☾ en topbar, wordmark sólido. Sin cambios de lógica de `view`.
- `src/styles.css` — bloque `[data-theme="light"]`, retirada de mesh-gradient/glows/wordmark degradado, hover de tarjeta con sombra, estilos de `CardPreview`.
- `src/dashboard/Dashboard.tsx` — copy del hero, integración de `CardPreview` en cada tarjeta. `CATEGORIES` intacta.
- `src/dashboard/CardPreview.tsx` (nuevo) — canvas + render de frame estático por módulo (motor real o motivo generativo).

---

## 8. Criterio de éxito

1. Cada tarjeta muestra una imagen ilustrativa (render real de la simulación en las activas).
2. Toggle de modo claro/oscuro funciona, arranca según el sistema y persiste en localStorage.
3. No hay botones tipo "Express interest".
4. El look es más sobrio: sin gradientes animados de fondo, sin glows neón, wordmark sólido.
5. Las 4 simulaciones abren y funcionan igual; `npm test` y `npm run build` pasan.
6. Contraste correcto en ambos temas.
