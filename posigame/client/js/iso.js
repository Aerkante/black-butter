// Geometria isométrica 2:1 e desenho de caixas com detalhes nas faces (tudo em pixels exatos).
import { MAP } from '/shared/game.js';
import { fillPoly, finish, makeCanvas } from './px.js';

export const HX = 16; // meia largura do tile
export const HY = 8; // meia altura do tile
export const WALL_H = 72;

// Tamanho do cache estático e origem (vértice de trás do mapa) para o mapa atual
export const OFF_X = MAP.h * HX + 24;
export const OFF_Y = WALL_H + 16;
export const CACHE_W = (MAP.w + MAP.h) * HX + 48;
export const CACHE_H = (MAP.w + MAP.h) * HY + WALL_H + 48;
// limites da câmera (em coordenadas projetadas)
export const BOUNDS = { minX: -MAP.h * HX - 8, maxX: MAP.w * HX + 8, minY: -WALL_H - 4, maxY: (MAP.w + MAP.h) * HY + 20 };

export const project = (x, y) => [(x - y) * HX, (x + y) * HY];

export const K = {
  ink: '#0b0e1a',
  carpet: '#2b3a9e',
  carpet2: '#3d50cf',
  wall: '#ffe9b8',
  paper: '#fff6e0',
  wood: '#e8873a',
  woodL: '#a8531f',
  woodR: '#c96a2b',
  green: '#3dff8b',
  red: '#ff3b4e',
  yellow: '#ffd426',
  pink: '#ff4fa3',
  cyan: '#2bc8ff',
  orange: '#ff8a1f',
  gray: '#d6c08a',
  metal: '#8fa3ff',
};

// ----- caixas isométricas -----
// o = { u, v, z, w, d, h, top, left, right }: (u,v) posição na base (em tiles), z altura (px).

function origin(ox, oy, o) {
  return [ox + HX * ((o.u || 0) - (o.v || 0)), oy + HY * ((o.u || 0) + (o.v || 0)) - (o.z || 0)];
}

export function corners(ox, oy, o) {
  const [x, y] = origin(ox, oy, o);
  return {
    O: [x, y],
    R: [x + HX * o.w, y + HY * o.w],
    B: [x + HX * (o.w - o.d), y + HY * (o.w + o.d)],
    L: [x - HX * o.d, y + HY * o.d],
  };
}

export function box(g, ox, oy, o) {
  const { O, R, B, L } = corners(ox, oy, o);
  const up = (p) => [p[0], p[1] - o.h];
  fillPoly(g, [up(L), up(B), B, L], o.left);
  fillPoly(g, [up(B), up(R), R, B], o.right);
  fillPoly(g, [up(O), up(R), up(B), up(L)], o.top);
}

// Decalque numa face: 'L' (frente-esquerda, larga em x), 'R' (frente-direita, larga em y) ou 'T' (topo).
// u0..u1 ao longo da face (0..1); v0..v1 em pixels de altura (T: 0..1 na profundidade).
export function decal(g, ox, oy, o, face, u0, u1, v0, v1, color) {
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

export function bake(w, h, ax, ay, draw, opts) {
  const [c, g] = makeCanvas(w, h);
  draw(g, ax, ay);
  finish(c, opts);
  return { canvas: c, ax, ay };
}

export const tone = (top, left, right) => ({ top, left, right });
export const WOOD = tone(K.wood, K.woodL, K.woodR);
export const DARK = tone('#3f49b8', '#1b2170', '#2a36b0');
export const WHITE = tone(K.paper, '#d6c08a', '#ffe9b8');
export const NAVY = tone('#3b4dc4', '#232a78', '#3446b8');

// polígono no chão entre dois cantos (em tiles)
export function floorRect(g, ox, oy, x0, y0, x1, y1, color) {
  const P = (x, y) => [ox + (x - y) * HX, oy + (x + y) * HY];
  fillPoly(g, [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], color);
}
