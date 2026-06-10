import { ElementaryCA } from '../modules/cellular/engine';
import { HebbianNetwork } from '../modules/network/engine';
import { SandboxEngine, DEFAULT_PARAMS } from '../modules/sandbox/engine';
import { CoordinationEngine, AGENTS } from '../modules/agents/engine';

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

/** NET·01 — red hebbiana real: se evoluciona y se usa su propio render(). */
function paintNetwork(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  const net = new HebbianNetwork();
  const params = { threshold: 1.0, learningRate: 0.2, decayRate: 0.02, brushRadius: 60 };
  net.brush = { x: w / 2, y: h / 2, active: true };
  for (let s = 0; s < 90; s++) net.update(1 / 60, params, w, h);
  net.brush.active = false;
  for (let s = 0; s < 60; s++) net.update(1 / 60, params, w, h);
  net.render(ctx, w, h, params);
}

/** NET·00 — laboratorio de 2 nodos: motivo A→B + curva de peso real (LTP). */
function paintSynapse(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const eng = new SandboxEngine();
  eng.startDemo('coactivacion', DEFAULT_PARAMS.threshold);
  for (let s = 0; s < 900; s++) eng.update(1 / 60, DEFAULT_PARAMS);
  const hist = eng.histAB;

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

/** AGI·01 — coordinación: rejilla de elecciones reales por ronda y agente. */
function paintAgents(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  const eng = new CoordinationEngine();
  eng.mode = 'inferencia';
  const ROUNDS = 28;
  for (let r = 0; r < ROUNDS; r++) eng.playRound();
  const rows = AGENTS.length;
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

/** Motivo determinista para módulos sin motor: PRNG con semilla fija. */
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
