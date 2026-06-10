# ChronosCortex — Laboratorio Didáctico de Sistemas Complejos

SPA interactiva (React + TypeScript + HTML5 Canvas, Vite) para la enseñanza
visual de sistemas complejos, redes y fenómenos emergentes.

## Ejecución

```bash
npm install
npm run dev      # servidor de desarrollo → http://localhost:5173
npm run build    # type-check + bundle de producción en dist/
```

## Arquitectura

```
src/
├── App.tsx                          # Navegación entre vistas (panel / módulos)
├── styles.css                       # Sistema de diseño (instrumentación científica, modo oscuro)
├── dashboard/Dashboard.tsx          # Panel principal: 2 categorías, módulos activos + coming soon
├── components/Slider.tsx            # Slider que muta parámetros del motor sin re-renderizar el canvas
└── modules/
    ├── sandbox/
    │   ├── engine.ts                # Motor: 2 nodos, STDP, ventana de correlación, olvido
    │   └── SandboxSim.tsx           # Laboratorio con control de tiempo, curva de peso y raster
    ├── network/
    │   ├── engine.ts                # Motor: red hebbiana, pulsos, decaimiento, pruning
    │   └── NetworkSim.tsx           # Lienzo + panel de intervención pedagógica
    └── agents/
        ├── engine.ts                # Motor: 4 agentes, 3 paradigmas, métricas PID
        ├── AgentsSim.tsx            # Ecosistema, tablero, selector de arquitectura
        └── ConvergenceChart.tsx     # Gráfico de líneas (error de coordinación)
```

## Módulo 0 — Aprendizaje en una Sinapsis (Laboratorio de 2 nodos)

El punto de entrada didáctico: la regla de Hebb reducida a su núcleo causal, lo
bastante lenta para verse.

- **Dos neuronas A y B** renderizadas como "vasos" que se llenan de carga; al
  alcanzar el umbral, disparan (destello) y emiten un pulso por la sinapsis.
- **Disparo manual**: botones para activar A, B o ambas; el usuario controla la
  coincidencia temporal con sus propias manos.
- **STDP (plasticidad dependiente del tiempo de espícula)**: si A dispara dentro
  de la **ventana de correlación** antes que B, la sinapsis A→B se potencia
  (`Δw = η·coincidencia·(1−w)`, LTP); si el orden se invierte, se deprime (LTD).
  El **orden temporal — la causalidad — importa**.
- **Control de tiempo**: reproducir / pausar, **paso a paso** y **cámara lenta**
  (0.25× / 1× / 2×) para observar el evento de aprendizaje frame a frame.
- **Curva de fuerza sináptica** con una línea punteada que marca el peso a partir
  del cual A basta para disparar a B sola.
- **Raster temporal** que sombrea la ventana de correlación tras cada disparo de
  A, haciendo visible qué disparos de B "cuentan".
- **Demos guiadas**: coactivación (aprende) vs. disparo desfasado (no aprende),
  y una prueba "¿A dispara a B sola?".

**Narrativa central (condicionamiento asociativo)**: al principio disparar A no
basta para activar B. Co-actívalas repetidamente y la sinapsis A→B crece hasta
que, llegado un punto, *una señal de A sola dispara a B*. El nodo ha aprendido
una asociación — y si dejas de usarla, la olvida.

Las cuatro hipótesis (aprende por coincidencia, A llega a disparar a B sola, el
desfase no aprende, el desuso olvida) están verificadas de forma determinista
sobre el motor.

## Módulo 1 — Propagación de Señales y Ajuste de Pesos

- **420 nodos** distribuidos orgánicamente por clusters en un espacio 3D ficticio,
  proyectado en 2D con rotación lenta y perspectiva.
- Cada nodo acumula un **nivel de activación continuo**; al superar el **umbral de
  disparo** emite pulsos de luz a sus vecinos a través de las aristas.
- **Aprendizaje asociativo (hebbiano)**: las aristas cuyos pulsos preceden al
  disparo del nodo receptor dentro de una ventana de correlación temporal se
  refuerzan (`w += η · (1 − w)`) — ganan grosor y opacidad.
- **Decaimiento constante**: los enlaces que no transmiten se debilitan
  (`w ← w · (1 − λ·dt)`), disolviendo la memoria de red.
- **Pincel de inyección de señal**: clic/arrastre inyecta corriente a los nodos
  cercanos al puntero — permite forzar rutas preferenciales.
- **Regularización masiva (pruning)**: destruye el 30 % de los enlaces al azar
  para evaluar la resiliencia de las rutas consolidadas.

### Rendimiento

El bucle usa `requestAnimationFrame`; los sliders **mutan directamente** el
objeto de parámetros del motor (vía `useRef`), de modo que el estado de React
nunca interviene en el camino caliente del render. La telemetría (FPS, enlaces,
peso medio, disparos/s) se lee a 2 Hz en un componente aislado.

## Módulo 2 — Coordinación Emergente y Sinergia Informacional

4 agentes autónomos intentan converger en una opción numérica idéntica **sin
comunicación directa**: solo observan el histórico público de elecciones y
aciertos/fallos del grupo.

### Paradigmas (selector de arquitectura)

| Modo | Mecánica | Firma esperada |
|---|---|---|
| **Homogéneo** | Regla plana e idéntica para todos | Redundancia alta / caos, convergencia inestable |
| **Especialización** | Roles fijos: Analítico, Explorador, Conservador, Sintetizador | Diferenciación estable, sinergia media |
| **Inferencia (ToM)** | Cada agente modela probabilísticamente a sus pares y elige el consenso esperado (punto focal en empates) | Re-convergencia casi instantánea, sinergia alta |

### Regla del entorno

Tres consensos perfectos consecutivos **agotan** la opción elegida (queda
bloqueada 10 rondas), forzando ciclos de re-coordinación que revelan qué
arquitectura re-converge más rápido.

### Métricas (inspiración: descomposición parcial de información, PID)

- **Redundancia** ≈ coordinación explicable por marginales individuales casi
  idénticos. Se estima por **Monte Carlo**: se muestrean elecciones
  independientes desde la distribución marginal de cada agente (ventana móvil
  de 14 rondas) y se mide cuánta coincidencia produciría el azar estructurado.
- **Sinergia dinámica** ≈ coordinación observada **por encima** de esa línea
  base independiente: estructura conjunta que ningún agente explica por sí solo.
- **Convergencia colectiva**: gráfico de líneas del error (1 − consenso) por
  ronda, con media móvil exponencial.
