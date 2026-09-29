// Cenário em pixel art: móveis, paredes e piso desenhados com polígonos de bordas duras.
// Tudo é gerado uma vez (cache) e depois só copiado para a tela.
import { MAP } from '/shared/game.js';
import { fillPoly, line, ellipse, rect, finish, makeCanvas } from './px.js';

export const HX = 16;
export const HY = 8;
export const WALL_H = 64;
export const OFF_X = 304;
export const OFF_Y = 76;
export const CACHE_W = 608;
export const CACHE_H = 380;

export const project = (x, y) => [(x - y) * HX, (x + y) * HY];

const K = {
  ink: '#0b0e1a',
  carpet: '#2b3a9e',
  carpet2: '#3d50cf',
  wall: '#ffe9b8',
  wallShade: '#f2cb86',
  paper: '#fff6e0',
  wood: '#e8873a',
  woodL: '#a8531f',
  woodR: '#c96a2b',
  green: '#3dff8b',
  red: '#ff3b4e',
  yellow: '#ffd426',
  pink: '#ff4fa3',
  cyan: '#2bc8ff',
  gray: '#d6c08a',
  metal: '#8fa3ff',
};

// ----- geometria de caixas isométricas -----
// o = { u, v, z, w, d, h, top, left, right }: (u,v) posição na base (em tiles) e z altura (px).

function origin(ox, oy, o) {
  return [ox + HX * ((o.u || 0) - (o.v || 0)), oy + HY * ((o.u || 0) + (o.v || 0)) - (o.z || 0)];
}

function corners(ox, oy, o) {
  const [x, y] = origin(ox, oy, o);
  const O = [x, y];
  const R = [x + HX * o.w, y + HY * o.w];
  const B = [x + HX * (o.w - o.d), y + HY * (o.w + o.d)];
  const L = [x - HX * o.d, y + HY * o.d];
  return { O, R, B, L };
}

function box(g, ox, oy, o) {
  const { O, R, B, L } = corners(ox, oy, o);
  const up = (p) => [p[0], p[1] - o.h];
  fillPoly(g, [up(L), up(B), B, L], o.left);
  fillPoly(g, [up(B), up(R), R, B], o.right);
  fillPoly(g, [up(O), up(R), up(B), up(L)], o.top);
}

// Decalque numa face da caixa: face 'L' (frente-esquerda), 'R' (frente-direita) ou 'T' (topo).
// u0..u1 na largura da face (0..1) e v0..v1 em pixels de altura (T: 0..1 na profundidade).
function decal(g, ox, oy, o, face, u0, u1, v0, v1, color) {
  const { O, R, B, L } = corners(ox, oy, o);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  if (face === 'T') {
    const A = [O[0], O[1] - o.h];
    const Rt = [R[0], R[1] - o.h];
    const Lt = [L[0], L[1] - o.h];
    const P = (u, v) => {
      const a = lerp(A, Rt, u);
      return [a[0] + (Lt[0] - A[0]) * v, a[1] + (Lt[1] - A[1]) * v];
    };
    fillPoly(g, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], color);
    return;
  }
  const [p, q] = face === 'L' ? [L, B] : [B, R];
  const P = (u, v) => {
    const a = lerp(p, q, u);
    return [a[0], a[1] - v];
  };
  fillPoly(g, [P(u0, v1), P(u1, v1), P(u1, v0), P(u0, v0)], color);
}

// pontos de uma face para posicionar itens dinâmicos (LEDs)
function facePoint(ox, oy, o, face, u, v) {
  const { R, B, L } = corners(ox, oy, o);
  const [p, q] = face === 'L' ? [L, B] : [B, R];
  return [Math.round(p[0] + (q[0] - p[0]) * u), Math.round(p[1] + (q[1] - p[1]) * u - v)];
}

function bake(w, h, ax, ay, draw, opts) {
  const [c, g] = makeCanvas(w, h);
  draw(g, ax, ay);
  finish(c, opts);
  return { canvas: c, ax, ay };
}

const tone = (top, left, right) => ({ top, left, right });
const WOOD = tone(K.wood, K.woodL, K.woodR);
const DARK = tone('#3f49b8', '#1b2170', '#2A3048');
const WHITE = tone(K.paper, '#d6c08a', K.wall);
const NAVY = tone('#3b4dc4', '#2b3a9e', '#3A4C73');

// ----- móveis -----

function drawDesk(g, ox, oy) {
  const top = { u: 0, v: 0, z: 0, w: 2, d: 1, h: 9, ...WOOD };
  box(g, ox, oy, top);
  // gavetas na frente
  decal(g, ox, oy, top, 'L', 0.06, 0.46, 1, 7, '#c0621f');
  decal(g, ox, oy, top, 'L', 0.06, 0.46, 3.6, 4.4, '#7c3a14');
  decal(g, ox, oy, top, 'L', 0.54, 0.94, 1, 7, '#c0621f');
  decal(g, ox, oy, top, 'L', 0.54, 0.94, 3.6, 4.4, '#7c3a14');
  decal(g, ox, oy, top, 'L', 0.2, 0.32, 4.6, 5.4, K.yellow);
  // monitor
  const stand = { u: 0.7, v: 0.16, z: 9, w: 0.16, d: 0.1, h: 2, ...DARK };
  box(g, ox, oy, stand);
  const mon = { u: 0.42, v: 0.12, z: 11, w: 0.7, d: 0.08, h: 11, ...DARK };
  box(g, ox, oy, mon);
  decal(g, ox, oy, mon, 'L', 0.08, 0.92, 1.5, 9.5, '#062a1a');
  decal(g, ox, oy, mon, 'L', 0.14, 0.86, 2.5, 8.5, K.green);
  decal(g, ox, oy, mon, 'L', 0.2, 0.55, 5.5, 8.5, '#12b855'); // linhas de código
  decal(g, ox, oy, mon, 'L', 0.62, 0.8, 3, 5, '#c8ffe0');
  // post-its na borda do monitor
  decal(g, ox, oy, mon, 'L', 0.0, 0.14, 8, 11, K.yellow);
  decal(g, ox, oy, mon, 'L', 0.86, 1.0, 5, 8, K.pink);
  // teclado, mouse, caneca, papéis
  const kb = { u: 0.45, v: 0.5, z: 9, w: 0.5, d: 0.24, h: 1, ...tone('#C9C2AE', '#8F8874', '#A8A18C') };
  box(g, ox, oy, kb);
  decal(g, ox, oy, kb, 'T', 0.08, 0.92, 0.2, 0.45, '#8F8874');
  box(g, ox, oy, { u: 1.05, v: 0.56, z: 9, w: 0.1, d: 0.12, h: 1, ...DARK });
  const mug = { u: 1.42, v: 0.3, z: 9, w: 0.16, d: 0.16, h: 4, ...WHITE };
  box(g, ox, oy, mug);
  decal(g, ox, oy, mug, 'T', 0.15, 0.85, 0.15, 0.85, '#5B3A29');
  box(g, ox, oy, { u: 1.28, v: 0.62, z: 9, w: 0.34, d: 0.24, h: 1, ...WHITE });
  box(g, ox, oy, { u: 1.3, v: 0.64, z: 10, w: 0.3, d: 0.2, h: 1, top: '#ffe9b8', left: '#d6c08a', right: '#f2cb86' });
}

function drawChair(g, ox, oy) {
  const baseH = 1;
  box(g, ox, oy, { u: -0.28, v: -0.05, z: 0, w: 0.56, d: 0.1, h: baseH, ...DARK });
  box(g, ox, oy, { u: -0.05, v: -0.28, z: 0, w: 0.1, d: 0.56, h: baseH, ...DARK });
  box(g, ox, oy, { u: -0.05, v: -0.05, z: baseH, w: 0.1, d: 0.1, h: 4, ...DARK });
  const seat = { u: -0.3, v: -0.3, z: 5, w: 0.6, d: 0.6, h: 2, ...NAVY };
  box(g, ox, oy, seat);
  box(g, ox, oy, { u: -0.3, v: 0.24, z: 7, w: 0.6, d: 0.08, h: 9, top: '#3b4dc4', left: '#232a78', right: '#3446b8' });
}

function drawServerBase(g, ox, oy) {
  const o = { u: 0, v: 0, z: 0, w: 1, d: 1, h: 34, top: '#6c78ff', left: '#1b2170', right: '#2a36b0' };
  box(g, ox, oy, o);
  // unidades do rack (frente esquerda) e (frente direita)
  for (let i = 0; i < 5; i++) {
    const v = 4 + i * 6;
    decal(g, ox, oy, o, 'L', 0.1, 0.9, v, v + 4, '#2c3a9a');
    decal(g, ox, oy, o, 'L', 0.16, 0.5, v + 1.5, v + 2.5, '#0a0e40');
    decal(g, ox, oy, o, 'R', 0.1, 0.9, v, v + 4, '#3a48c8');
    decal(g, ox, oy, o, 'R', 0.16, 0.6, v + 1.5, v + 2.5, '#10164a');
  }
  decal(g, ox, oy, o, 'T', 0.15, 0.85, 0.15, 0.85, '#4453d8');
  return o;
}

function serverVariant(phase) {
  return bake(56, 84, 24, 52, (g, ox, oy) => {
    const o = drawServerBase(g, ox, oy);
    const on = [K.green, K.green, K.red, K.yellow, K.green];
    for (let i = 0; i < 5; i++) {
      const v = 4 + i * 6;
      const lit = (i + phase) % 2 === 0;
      decal(g, ox, oy, o, 'L', 0.62, 0.8, v + 1.2, v + 2.8, lit ? on[i] : '#155d3a');
      decal(g, ox, oy, o, 'R', 0.7, 0.86, v + 1.2, v + 2.8, lit ? '#155d3a' : on[(i + 2) % 5]);
    }
  });
}

function drawCoffee(g, ox, oy) {
  const o = { u: 0, v: 0, z: 0, w: 1, d: 1, h: 22, ...WHITE };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'L', 0.12, 0.88, 14, 19, '#1b2170'); // painel
  decal(g, ox, oy, o, 'L', 0.2, 0.5, 15.5, 17.5, K.green);
  decal(g, ox, oy, o, 'L', 0.62, 0.72, 15.5, 17.5, K.red);
  decal(g, ox, oy, o, 'L', 0.78, 0.86, 15.5, 17.5, K.yellow);
  decal(g, ox, oy, o, 'L', 0.3, 0.7, 3, 11, '#2a36b0'); // bandeja
  decal(g, ox, oy, o, 'L', 0.42, 0.58, 3, 7, K.paper); // copo
  decal(g, ox, oy, o, 'R', 0.15, 0.85, 8, 15, K.red);
  decal(g, ox, oy, o, 'R', 0.28, 0.72, 10, 13, K.paper);
  const jar = { u: 0.3, v: 0.3, z: 22, w: 0.4, d: 0.4, h: 6, top: '#B8E8FB', left: '#4FA3CC', right: '#67BEE8' };
  box(g, ox, oy, jar);
}

function drawPrinter(g, ox, oy) {
  const o = { u: 0.05, v: 0.1, z: 0, w: 0.9, d: 0.8, h: 11, ...WHITE };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'L', 0.1, 0.9, 3, 5, '#2a36b0'); // bandeja
  decal(g, ox, oy, o, 'L', 0.66, 0.86, 7, 9, K.green);
  decal(g, ox, oy, o, 'R', 0.15, 0.85, 4, 6, '#2a36b0');
  box(g, ox, oy, { u: 0.25, v: 0.25, z: 11, w: 0.5, d: 0.36, h: 1, ...tone('#FFFFFF', '#f2cb86', '#ffe9b8') });
  box(g, ox, oy, { u: 0.3, v: 0.82, z: 3, w: 0.4, d: 0.22, h: 1, ...tone('#FFFFFF', '#f2cb86', '#ffe9b8') });
}

function drawPlant(g, ox, oy) {
  const pot = { u: -0.18, v: -0.18, z: 0, w: 0.36, d: 0.36, h: 8, top: '#f2a25a', left: '#c0621f', right: '#d08a45' };
  box(g, ox, oy, pot);
  decal(g, ox, oy, pot, 'T', 0.12, 0.88, 0.12, 0.88, '#6a3510');
  const leaf = (pts, c) => fillPoly(g, pts.map(([x, y]) => [ox + x, oy + y]), c);
  leaf([[0, -30], [-6, -8], [0, -10]], '#1fcb6a');
  leaf([[0, -32], [6, -8], [0, -10]], K.green);
  leaf([[-11, -20], [-1, -8], [-2, -12]], '#159a50');
  leaf([[11, -20], [1, -8], [2, -12]], '#2ee87f');
  leaf([[-7, -26], [-1, -12], [-1, -16]], '#2ee87f');
  leaf([[7, -26], [1, -12], [1, -16]], '#159a50');
}

function drawBin(g, ox, oy) {
  const o = { u: -0.2, v: -0.2, z: 0, w: 0.4, d: 0.4, h: 10, top: '#7C8FB2', left: '#3446b8', right: '#52668F' };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'T', 0.14, 0.86, 0.14, 0.86, '#14192A');
  decal(g, ox, oy, o, 'L', 0.2, 0.8, 2, 3, '#2B3A5C');
  decal(g, ox, oy, o, 'L', 0.2, 0.8, 5, 6, '#2B3A5C');
  box(g, ox, oy, { u: -0.06, v: -0.06, z: 9, w: 0.14, d: 0.14, h: 3, ...WHITE });
}

function drawCooler(g, ox, oy) {
  const base = { u: -0.24, v: -0.24, z: 0, w: 0.48, d: 0.48, h: 13, ...WHITE };
  box(g, ox, oy, base);
  decal(g, ox, oy, base, 'L', 0.2, 0.44, 7, 10, K.cyan);
  decal(g, ox, oy, base, 'L', 0.56, 0.8, 7, 10, K.red);
  decal(g, ox, oy, base, 'L', 0.3, 0.7, 2, 5, '#2a36b0');
  const jug = { u: -0.2, v: -0.2, z: 13, w: 0.4, d: 0.4, h: 13, top: '#CFF0FF', left: '#4FA3CC', right: '#67BEE8' };
  box(g, ox, oy, jug);
  decal(g, ox, oy, jug, 'L', 0.15, 0.3, 2, 11, '#BFEAFF');
  box(g, ox, oy, { u: -0.08, v: -0.08, z: 26, w: 0.16, d: 0.16, h: 2, ...WHITE });
}

export function buildProps() {
  return {
    desk: bake(84, 68, 22, 40, drawDesk),
    chair: bake(36, 40, 18, 22, drawChair),
    serverA: serverVariant(0),
    serverB: serverVariant(1),
    coffee: bake(48, 56, 20, 32, drawCoffee),
    printer: bake(48, 44, 20, 26, drawPrinter),
    plant: bake(40, 52, 20, 42, drawPlant),
    bin: bake(28, 32, 14, 24, drawBin),
    cooler: bake(32, 56, 16, 44, drawCooler),
  };
}

// pontos dos LEDs usados só para o brilho extra no servidor (não usado nos sprites)
export const serverFacePoint = facePoint;

// ----- piso, paredes, zona segura e portais (cache estático) -----

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wallPt(side, s, h) {
  return [(side === 'L' ? -1 : 1) * 288 * s, 144 * s - h];
}

export function buildStatic() {
  const [c, g] = makeCanvas(CACHE_W, CACHE_H);
  const P = (pts) => pts.map(([x, y]) => [x + OFF_X, y + OFF_Y]);
  const poly = (pts, color) => fillPoly(g, P(pts), color);
  const wl = (side, s, h) => {
    const [x, y] = wallPt(side, s, h);
    return [x + OFF_X, y + OFF_Y];
  };
  const quad = (side, s0, s1, h0, h1, color) => poly([wallPt(side, s0, h0), wallPt(side, s1, h0), wallPt(side, s1, h1), wallPt(side, s0, h1)], color);
  const wline = (side, s0, h0, s1, h1, color) => {
    const a = wl(side, s0, h0);
    const b = wl(side, s1, h1);
    line(g, a[0], a[1], b[0], b[1], color);
  };

  const T = project(0, 0);
  const R = project(MAP.w, 0);
  const B = project(MAP.w, MAP.h);
  const L = project(0, MAP.h);

  // paredes com painéis, rodapé e moldura
  poly([T, L, [L[0], L[1] - WALL_H], [T[0], T[1] - WALL_H]], '#f5d79a');
  poly([T, R, [R[0], R[1] - WALL_H], [T[0], T[1] - WALL_H]], K.wall);
  for (const side of ['L', 'R']) {
    for (let i = 1; i < 12; i++) wline(side, i / 12, 6, i / 12, WALL_H - 3, side === 'L' ? '#e7bd75' : '#f0d090');
    quad(side, 0, 1, 0, 6, side === 'L' ? '#3446b8' : '#1fb6a6');
    quad(side, 0, 1, 6, 8, side === 'L' ? '#2b3a9e' : '#3446b8');
    quad(side, 0, 1, WALL_H - 3, WALL_H, '#fff6e0');
    quad(side, 0, 1, WALL_H - 5, WALL_H - 3, side === 'L' ? '#d6c08a' : '#f2cb86');
  }
  // arestas do canto
  line(g, T[0] + OFF_X, T[1] + OFF_Y - WALL_H, T[0] + OFF_X, T[1] + OFF_Y, '#d6c08a');

  // janelas (noite) com caixilho, estrelas e prédios ao longe
  const stars = [[0.2, 36], [0.5, 42], [0.75, 33], [0.35, 30], [0.62, 44]];
  for (const side of ['L', 'R']) {
    for (const [a, b] of [[0.08, 0.2], [0.28, 0.4], [0.6, 0.72], [0.8, 0.92]]) {
      quad(side, a, b, 20, 52, K.paper);
      quad(side, a + 0.006, b - 0.006, 22, 50, '#171d6e');
      quad(side, a + 0.006, b - 0.006, 22, 30, '#0f1450');
      // silhueta de prédios
      const w = (b - a - 0.012) / 4;
      [26, 30, 24, 28].forEach((top, i) => quad(side, a + 0.006 + w * i, a + 0.006 + w * (i + 1) - 0.002, 22, top, '#2a2f98'));
      // luzes acesas nos prédios
      const ls = [[0.0, 25], [0.55, 27], [1.0, 24], [1.7, 26]];
      for (const [k, hh] of ls) {
        const [x, y] = wl(side, a + 0.006 + (w * k * 0.9 + 0.004), hh);
        rect(g, K.yellow, Math.round(x), Math.round(y), 1, 1);
      }
      // divisórias do caixilho
      wline(side, (a + b) / 2, 22, (a + b) / 2, 50, K.paper);
      wline(side, a, 36, b, 36, K.paper);
    }
    for (const [sx, h] of stars) {
      const s = 0.09 + sx * 0.1;
      const [x, y] = wl(side, s, h + 8);
      rect(g, K.paper, Math.round(x), Math.round(y), 1, 1);
    }
  }
  // lua numa janela da direita
  {
    const [mx, my] = wl('R', 0.66, 44);
    ellipse(g, mx, my, 3, 3, null, { fill: '#fff6e0' });
  }

  // quadro kanban de post-its (parede esquerda)
  quad('L', 0.44, 0.58, 16, 46, '#a8531f');
  quad('L', 0.447, 0.573, 18, 44, '#f2a25a');
  const notes = [[0.455, 36, K.yellow], [0.5, 36, K.pink], [0.545, 36, K.green], [0.455, 26, K.cyan], [0.5, 26, K.yellow], [0.545, 27, K.pink], [0.455, 20, K.pink], [0.5, 20, K.green]];
  for (const [s, h, col] of notes) quad('L', s, s + 0.028, h, h + 6, col);
  for (const [s, h] of notes) {
    const [x, y] = wl('L', s + 0.014, h + 5);
    rect(g, K.red, Math.round(x), Math.round(y), 1, 1);
  }
  // quadro branco (parede direita) com anotações
  quad('R', 0.42, 0.58, 16, 46, '#8fa3ff');
  quad('R', 0.426, 0.574, 18, 44, '#FFFFFF');
  wline('R', 0.44, 39, 0.53, 39, K.cyan);
  wline('R', 0.44, 34, 0.55, 34, K.red);
  wline('R', 0.44, 29, 0.5, 29, '#1fb6a6');
  wline('R', 0.5, 24, 0.55, 24, K.green);
  quad('R', 0.45, 0.53, 15, 17, '#d6c08a'); // bandeja
  // relógio
  {
    const [cx, cy] = wl('R', 0.5, 57);
    ellipse(g, cx, cy, 5, 5, K.ink, { fill: K.paper });
    line(g, cx, cy, cx, cy - 3, K.ink);
    line(g, cx, cy, cx + 2, cy + 1, K.red);
  }
  // pôster e extintor
  quad('R', 0.05, 0.16, 20, 52, '#3446b8');
  quad('R', 0.056, 0.154, 22, 50, K.yellow);
  quad('R', 0.07, 0.14, 38, 46, K.red);
  quad('R', 0.07, 0.11, 28, 34, '#0b0e1a');
  quad('R', 0.12, 0.14, 26, 30, '#0b0e1a');
  {
    const [ex, ey] = wl('R', 0.94, 0);
    rect(g, K.red, Math.round(ex) - 3, Math.round(ey) - 18, 6, 13);
    rect(g, '#c01b2c', Math.round(ex) + 1, Math.round(ey) - 18, 2, 13);
    rect(g, K.ink, Math.round(ex) - 2, Math.round(ey) - 22, 4, 4);
    rect(g, K.ink, Math.round(ex) + 1, Math.round(ey) - 21, 4, 1);
    rect(g, K.paper, Math.round(ex) - 2, Math.round(ey) - 13, 4, 4);
  }

  // laterais do piso
  poly([L, B, [B[0], B[1] + 8], [L[0], L[1] + 8]], '#10164a');
  poly([B, R, [R[0], R[1] + 8], [B[0], B[1] + 8]], '#161d5c');
  line(g, L[0] + OFF_X, L[1] + OFF_Y + 8, B[0] + OFF_X, B[1] + OFF_Y + 8, '#05061a');
  line(g, B[0] + OFF_X, B[1] + OFF_Y + 8, R[0] + OFF_X, R[1] + OFF_Y + 8, '#05061a');

  // piso de carpete com textura
  const rnd = rng(1234);
  for (let x = 0; x < MAP.w; x++) {
    for (let y = 0; y < MAP.h; y++) {
      const [tx, ty] = project(x, y);
      const cx = tx + OFF_X;
      const cy = ty + OFF_Y;
      const base = (x + y) % 2 ? K.carpet2 : K.carpet;
      fillPoly(g, [[cx, cy], [cx + HX, cy + HY], [cx, cy + 2 * HY], [cx - HX, cy + HY]], base);
      // fibras do carpete
      for (let i = 0; i < 9; i++) {
        const dx = Math.round((rnd() - 0.5) * 2 * (HX - 5));
        const maxDy = HY - 2 - Math.abs(dx) / 2;
        const dy = Math.round((rnd() - 0.5) * 2 * maxDy);
        rect(g, rnd() < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.09)', cx + dx, cy + HY + dy, 1, 1);
      }
    }
  }
  // emendas entre as placas de carpete
  for (let i = 0; i <= MAP.w; i++) {
    const a = project(i, 0);
    const b = project(i, MAP.h);
    line(g, a[0] + OFF_X, a[1] + OFF_Y, b[0] + OFF_X, b[1] + OFF_Y, 'rgba(10,14,26,0.22)');
    const a2 = project(0, i);
    const b2 = project(MAP.w, i);
    line(g, a2[0] + OFF_X, a2[1] + OFF_Y, b2[0] + OFF_X, b2[1] + OFF_Y, 'rgba(10,14,26,0.22)');
  }

  // zona segura (anel tracejado) e portais de bug
  const [zx, zy] = project(MAP.safeCenter.x, MAP.safeCenter.y);
  const rr = MAP.safeRadius * 1.41;
  ellipse(g, zx + OFF_X, zy + OFF_Y, rr * HX, rr * HY, K.green, { fill: 'rgba(61,255,139,0.10)', dash: 3 });
  for (const pt of MAP.portals) {
    const [px, py] = project(pt.x, pt.y);
    const cx = px + OFF_X;
    const cy = py + OFF_Y;
    fillPoly(g, [[cx, cy - 7], [cx + 15, cy], [cx, cy + 7], [cx - 15, cy]], '#3A1620');
    fillPoly(g, [[cx, cy - 5], [cx + 10, cy], [cx, cy + 5], [cx - 10, cy]], '#7A1F2B');
    fillPoly(g, [[cx, cy - 2], [cx + 5, cy], [cx, cy + 2], [cx - 5, cy]], K.red);
    line(g, cx, cy - 7, cx + 15, cy, K.red);
    line(g, cx + 15, cy, cx, cy + 7, K.red);
    line(g, cx, cy + 7, cx - 15, cy, K.red);
    line(g, cx - 15, cy, cx, cy - 7, K.red);
  }
  return c;
}
