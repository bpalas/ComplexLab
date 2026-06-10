import { useEffect, useRef, useState } from 'react';
import { SnowflakeEngine, SnowParams, SnowStats, DEFAULT_SNOW } from './engine';
import { Slider } from '../../components/Slider';
import { FormulaPanel, FormulaCard } from '../../components/math/FormulaPanel';
import { MathInline } from '../../components/math/Math';

/** Pasos de simulación por segundo a velocidad 1× — lento a propósito:
 *  el copo debe verse CRECER rama a rama, no aparecer como una nube. */
const BASE_SPS = 30;

/** Telemetría aislada del bucle de render. */
function StatsOverlay({ engineRef }: { engineRef: React.RefObject<SnowflakeEngine | null> }) {
  const [s, setS] = useState<SnowStats | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (engineRef.current) setS(engineRef.current.stats());
    }, 500);
    return () => window.clearInterval(id);
  }, [engineRef]);

  if (!s) return null;
  return (
    <div className="stats-overlay">
      <div><span>PASO</span><b>{s.step}</b></div>
      <div><span>CELDAS DE HIELO</span><b>{s.frozen}</b></div>
      <div><span>RADIO</span><b>{s.radius}</b></div>
      <div><span>HUMEDAD β</span><b>{s.beta.toFixed(2)}</b></div>
      <div><span>DEPOSICIÓN γ</span><b>{(s.gamma * 1000).toFixed(2)}‰</b></div>
      <div><span>ESTADO</span><b>{s.done ? 'COMPLETO' : 'CRECIENDO'}</b></div>
    </div>
  );
}

export function SnowflakeSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnowflakeEngine | null>(null);
  const paramsRef = useRef<SnowParams>({ ...DEFAULT_SNOW });
  const speedRef = useRef(1);
  const playingRef = useRef(true);
  const [playing, setPlaying] = useState(true);
  const [journey, setJourney] = useState(true);
  const [seed, setSeed] = useState(1);

  if (!engineRef.current) engineRef.current = new SnowflakeEngine(90, 1);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const stage = canvas.parentElement!;
    const ctx = canvas.getContext('2d')!;
    const engine = engineRef.current!;
    let raf = 0;
    let cssW = 0;
    let cssH = 0;
    let last = performance.now();
    let acc = 0; // acumulador de pasos fraccionarios

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = stage.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playingRef.current && !engine.done) {
        acc += dt * BASE_SPS * speedRef.current;
        let n = Math.min(40, Math.floor(acc));
        acc -= Math.floor(acc);
        while (n-- > 0) engine.step(paramsRef.current);
      }
      engine.render(ctx, cssW, cssH);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  /** Nueva caída: otro viaje atmosférico → otro copo, siempre hexagonal. */
  const newFall = () => {
    const s = Math.floor(Math.random() * 1e9);
    setSeed(s);
    engineRef.current!.journey = journey;
    engineRef.current!.reset(paramsRef.current, s);
  };

  const replay = () => {
    engineRef.current!.journey = journey;
    engineRef.current!.reset(paramsRef.current, seed);
  };

  return (
    <>
    <div className="module-grid">
      <aside className="panel side-panel">
        <h2 className="panel-title">Atmósfera local</h2>
        <p className="panel-sub">
          La red hexagonal viene de la química: cada H₂O forma 4 enlaces de
          hidrógeno y el hielo Ih cristaliza en hexágonos. La FORMA del copo, en
          cambio, la decide la atmósfera que atraviesa al caer.
        </p>

        <Slider
          label="Difusión del vapor (α)"
          min={0.4}
          max={2}
          step={0.02}
          defaultValue={DEFAULT_SNOW.alpha}
          onInput={(v) => (paramsRef.current.alpha = v)}
          hint="Qué tan rápido viaja el vapor de agua hacia el cristal."
        />
        <Slider
          label="Humedad de fondo (β)"
          min={0.32}
          max={0.8}
          step={0.01}
          defaultValue={DEFAULT_SNOW.beta}
          onInput={(v) => (paramsRef.current.beta = v)}
          hint="Sobresaturación del aire. Alta → dendritas ramificadas; baja → placas."
        />
        <Slider
          label="Deposición (γ)"
          min={0.00005}
          max={0.0015}
          step={0.00005}
          defaultValue={DEFAULT_SNOW.gamma}
          format={(v) => `${(v * 1000).toFixed(2)}‰`}
          onInput={(v) => (paramsRef.current.gamma = v)}
          hint="Vapor que se adhiere al cristal. Pequeña → ramas finas; grande → placa maciza."
        />
        <Slider
          label="Velocidad"
          min={0.25}
          max={4}
          step={0.25}
          defaultValue={1}
          format={(v) => `${v.toFixed(2)}×`}
          onInput={(v) => (speedRef.current = v)}
          hint="A 1× el copo tarda ~1 minuto en crecer: míralo ramificarse."
        />

        <h2 className="panel-title">El viaje del copo</h2>
        <div className="btn-stack">
          <button
            className={`btn ${journey ? 'btn-warn' : ''}`}
            onClick={() => {
              const j = !journey;
              setJourney(j);
              engineRef.current!.journey = j;
            }}
          >
            {journey ? '❄ Viaje atmosférico: ACTIVO' : '— Viaje atmosférico: fijo'}
          </button>
          <button className="btn" onClick={newFall}>
            ❄ Nueva caída (otro copo)
          </button>
          <button className="btn" onClick={replay}>
            ↺ Repetir el mismo viaje (semilla {seed})
          </button>
          <button className="btn" onClick={() => { playingRef.current = !playing; setPlaying(!playing); }}>
            {playing ? '❚❚ Pausa' : '▶ Reproducir'}
          </button>
        </div>

        <div className="didactic-note">
          <h3>Guía didáctica</h3>
          <ol>
            <li>
              <b>¿Por qué hexagonal?</b> El ángulo H–O–H (104.5°) y los 4 enlaces
              de hidrógeno por molécula empaquetan el hielo en anillos de 6
              moléculas: la simetría del cristal hereda la simetría del enlace.
            </li>
            <li>
              <b>¿Por qué ninguno es igual?</b> Activa el viaje atmosférico: β y γ
              derivan al azar (capas de aire con distinta T y humedad). Pulsa
              «Nueva caída» varias veces — mismas leyes, copos distintos.
            </li>
            <li>
              <b>¿Por qué simétrico Y único?</b> El copo mide ~1 mm: las seis
              ramas viven la MISMA historia atmosférica. El viaje cambia la forma
              global sin romper la simetría local.
            </li>
            <li>
              Con viaje fijo: β alta → dendritas; β baja → placas compactas
              (diagrama de Nakaya). «Repetir el mismo viaje» reproduce el copo
              exacto: el azar está en el camino, no en las leyes.
            </li>
          </ol>
        </div>
      </aside>

      <section className="canvas-stage">
        <canvas ref={canvasRef} />
        <StatsOverlay engineRef={engineRef} />
        <div className="stage-hint">
          MODELO DE REITER · red hexagonal del hielo Ih · cada celda es vapor (s&lt;1) o hielo (s≥1)
        </div>
      </section>
    </div>

    <FormulaPanel
      title="Las matemáticas del copo"
      intro={
        <>
          Cada celda z de la red hexagonal guarda un número{' '}
          <MathInline tex="s_z \in [0,\infty)" />: cuánta agua hay ahí. Si{' '}
          <MathInline tex="s_z \ge 1" />, la celda es hielo. El modelo completo
          (Reiter, 2005) es UNA sola regla de actualización, aplicada a todas las
          celdas en cada paso de tiempo:
        </>
      }
      master={
        's_z^{\\,t+1} \\;=\\; \\underbrace{u_z^{\\,t} + \\frac{\\alpha}{12}\\sum_{n \\in N(z)} \\bigl(u_n^{\\,t} - u_z^{\\,t}\\bigr)}_{\\text{el vapor difunde (Fick)}} \\;+\\; \\underbrace{v_z^{\\,t} + \\gamma \\cdot \\mathbf{1}_{\\mathrm{rec}(z)}}_{\\text{el vapor se deposita}}'
      }
      masterCaption={
        <>
          El agua de cada celda se separa en dos partes:{' '}
          <MathInline tex="u_z" /> (vapor libre, que difunde) y{' '}
          <MathInline tex="v_z" /> (agua capturada por el cristal, que ya no se
          mueve). <MathInline tex="N(z)" /> son las 6 vecinas hexagonales y{' '}
          <MathInline tex="\mathbf{1}_{\mathrm{rec}(z)}" /> vale 1 solo si la
          celda es receptiva. Las cuatro piezas, una a una:
        </>
      }
      foot={
        <p>
          ¿Y por qué salen ramas y no un círculo? Una punta que sobresale «ve»
          más vapor a su alrededor que una cara plana, así que crece más rápido
          y sobresale aún más. La regla 2 la alimenta y la regla 3 la congela:
          amplificación de una fluctuación — emergencia pura.
        </p>
      }
    >
      <FormulaCard
        tex="\mathrm{rec}(z) \iff s_z \ge 1 \;\lor\; \exists\, n \in N(z) : s_n \ge 1"
        title="1 · ¿Quién puede congelarse?"
      >
        Solo las celdas que tocan el cristal son «receptivas»: el vapor que les
        llega ya no se escapa. Las 6 vecinas de la red hexagonal son las 6
        direcciones del hielo Ih — aquí nace la simetría.
      </FormulaCard>
      <FormulaCard
        tex="u_z' = u_z + \frac{\alpha}{12}\Bigl(\textstyle\sum_{n \in N(z)} u_n - 6\,u_z\Bigr)"
        title="2 · El vapor viaja (difusión)"
      >
        Es la ley de Fick discreta: el agua de las celdas NO receptivas fluye
        de donde hay más hacia donde hay menos. α dice qué tan rápido. Cada
        celda se compara con el promedio de sus 6 vecinas.
      </FormulaCard>
      <FormulaCard
        tex="v_z' = v_z + \gamma \qquad s_z' = u_z' + v_z'"
        title="3 · Lo que toca, se pega (deposición)"
      >
        Las celdas receptivas suman γ en cada paso: vapor que se deposita como
        hielo y ya no difunde. Cuando la suma s′ cruza 1, la celda se congela
        para siempre. γ pequeña → ramas finas; γ grande → placa.
      </FormulaCard>
      <FormulaCard
        tex="\beta_{t+1} = \beta_t + \eta_t \qquad \gamma_{t+1} = \gamma_t + \xi_t"
        title="4 · El viaje hace único al copo"
      >
        Mientras cae, el copo cruza capas de aire con otra temperatura y
        humedad: β y γ hacen un camino aleatorio (η y ξ son ruido). Como el
        copo mide ~1 mm, sus 6 ramas viven el MISMO viaje → único pero
        simétrico.
      </FormulaCard>
    </FormulaPanel>

    <section className="panel formula-panel">
      <h2 className="panel-title">¿Por qué ningún copo es igual? La ciencia</h2>
      <div className="uniq-grid">
        <div className="uniq-item">
          <h4>La forma depende del clima (Nakaya, 1954)</h4>
          <p>
            Ukichiro Nakaya cultivó copos en laboratorio y descubrió que la
            morfología del cristal queda determinada por solo dos variables:
            temperatura <MathInline tex="T" /> y sobresaturación de vapor{' '}
            <MathInline tex="\sigma" />. Su «diagrama de morfología» es un mapa:
            placas a −2 °C, agujas a −5 °C, dendritas estrelladas a −15 °C. En
            este modelo, β y γ juegan el papel de <MathInline tex="(T,\sigma)" />.
          </p>
        </div>
        <div className="uniq-item">
          <h4>El viaje es un camino aleatorio irrepetible</h4>
          <p>
            Un copo tarda ~30 minutos en caer y atraviesa kilómetros de
            atmósfera turbulenta: su historia es una trayectoria{' '}
            <MathInline tex="(T_t, \sigma_t)" /> que ningún otro copo repite.
            Como la forma final integra TODA la historia — cada rama, cada
            costilla quedó grabada por una capa de aire concreta — trayectorias
            distintas producen cristales distintos.
          </p>
        </div>
        <div className="uniq-item">
          <h4>La inestabilidad amplifica lo diminuto (Mullins–Sekerka, 1963)</h4>
          <p>
            El crecimiento limitado por difusión es inestable: una protuberancia
            de tamaño <MathInline tex="\delta_0" /> crece como{' '}
            <MathInline tex="\delta(t) \sim \delta_0\, e^{\omega t}" /> con{' '}
            <MathInline tex="\omega > 0" />. Diferencias microscópicas entre dos
            copos «casi iguales» se amplifican exponencialmente: el sistema es
            caótico en el sentido estricto — sensible a las condiciones
            iniciales.
          </p>
        </div>
        <div className="uniq-item">
          <h4>El argumento combinatorio (Libbrecht, 2005)</h4>
          <p>
            Un copo contiene ~<MathInline tex="10^{18}" /> moléculas de agua y
            un cristal complejo tiene ~100 rasgos distinguibles que pueden
            ordenarse de <MathInline tex="100! \approx 10^{158}" /> maneras —
            más que átomos hay en el universo (~
            <MathInline tex="10^{80}" />). La probabilidad de que dos copos
            complejos coincidan es, a efectos físicos, cero.
          </p>
        </div>
      </div>
      <p className="formula-foot">
        ¿Y por qué entonces son simétricos? Porque el cristal mide ~1 mm y las
        variaciones atmosféricas relevantes ocurren a escala de metros: en cada
        instante, las seis ramas sienten EXACTAMENTE las mismas condiciones. El
        azar está en el camino (tiempo), no en el espacio. Único y simétrico no
        se contradicen: son el mismo fenómeno visto en dos ejes distintos.
        <span className="refs">
          {' '}Referencias: Nakaya (1954) <i>Snow Crystals: Natural and
          Artificial</i>; Mullins &amp; Sekerka (1963) <i>J. Appl. Phys.</i> 34;
          Reiter (2005) <i>Chaos, Solitons &amp; Fractals</i> 23; Libbrecht
          (2005) <i>Rep. Prog. Phys.</i> 68.
        </span>
      </p>
    </section>
    </>
  );
}
