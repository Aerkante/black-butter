// Cenário estático do escritório: paredes externas com janelas e placas, pisos de cada sala,
// tapetes de porta, zona segura e portais de bug. Desenhado uma vez (cache) e só copiado para a tela.
import { MAP, roomAt } from '/shared/game.js';
import { fillPoly, line, ellipse, rect, makeCanvas } from './px.js';
import { HX, HY, WALL_H, OFF_X, OFF_Y, CACHE_W, CACHE_H, BOUNDS, project, K, floorRect } from './iso.js';

export { HX, HY, WALL_H, OFF_X, OFF_Y, CACHE_W, CACHE_H, BOUNDS, project };
export { buildProps, propSprite, labelSprite, wallSprite } from './props.js';

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

// portas (para o tapete): [x0, y0, x1, y1] em tiles
const DOORS = [
  [5, 5.75, 7, 6.35], [15, 5.75, 17, 6.35],
  [8.65, 14.5, 9.35, 16.5], [8.65, 20.5, 9.35, 22.5],
  [9.5, 23.65, 11.5, 24.35], [11.65, 27, 12.35, 29.5],
];

// cores de piso por sala: [placa A, placa B]
const FLOORS = {
  office: [K.carpet, K.carpet2],
  wood: ['#c9782f', '#b96a25'],
  purple: ['#5b2a86', '#6a34a0'],
  concrete: ['#7c8497', '#8a93a8'],
  safety: ['#dff7e8', '#c2eed6'],
  kitchen: ['#ffe9a0', '#fff6e0'],
};

export function buildStatic() {
  const [c, g] = makeCanvas(CACHE_W, CACHE_H);
  const W = MAP.w;
  const H = MAP.h;
  const P = (pts) => pts.map(([x, y]) => [x + OFF_X, y + OFF_Y]);
  const poly = (pts, color) => fillPoly(g, P(pts), color);
  // ponto na parede: side 'R' = parede de trás à direita (ao longo de x), 'L' = à esquerda (ao longo de y); t em tiles
  const wp = (side, t, h) => [(side === 'R' ? 1 : -1) * t * HX, t * HY - h];
  const wl = (side, t, h) => {
    const [x, y] = wp(side, t, h);
    return [x + OFF_X, y + OFF_Y];
  };
  const quad = (side, t0, t1, h0, h1, color) => poly([wp(side, t0, h0), wp(side, t1, h0), wp(side, t1, h1), wp(side, t0, h1)], color);
  const wline = (side, t0, h0, t1, h1, color) => {
    const a = wl(side, t0, h0);
    const b = wl(side, t1, h1);
    line(g, a[0], a[1], b[0], b[1], color);
  };
  const wtext = (side, tc, h, text, color) => {
    // letras lidas da esquerda para a direita, acompanhando a inclinação da parede
    const dy = side === 'R' ? 4 : -4;
    const [cx, cy] = wl(side, tc, h);
    g.font = '8px "Press Start 2P", monospace';
    g.textBaseline = 'alphabetic';
    const n = text.length;
    for (let i = 0; i < n; i++) {
      const x = Math.round(cx + (i - (n - 1) / 2) * 8 - 4);
      const y = Math.round(cy + (i - (n - 1) / 2) * dy + 4);
      g.fillStyle = K.ink;
      g.fillText(text[i], x + 1, y + 1);
      g.fillStyle = color;
      g.fillText(text[i], x, y);
    }
  };

  const T = project(0, 0);
  const R = project(W, 0);
  const B = project(W, H);
  const L = project(0, H);

  // paredes de trás
  poly([T, L, [L[0], L[1] - WALL_H], [T[0], T[1] - WALL_H]], '#f5d79a');
  poly([T, R, [R[0], R[1] - WALL_H], [T[0], T[1] - WALL_H]], K.wall);
  for (const [side, len] of [['L', H], ['R', W]]) {
    for (let t = 1; t < len; t++) wline(side, t, 8, t, WALL_H - 5, side === 'L' ? '#e7bd75' : '#f0d090');
    quad(side, 0, len, 0, 6, side === 'L' ? '#1fb6a6' : '#25c9b8'); // rodapé turquesa
    quad(side, 0, len, 6, 8, side === 'L' ? '#0f8a80' : '#1fb6a6');
    quad(side, 0, len, WALL_H - 3, WALL_H, '#fff6e0'); // moldura
    quad(side, 0, len, WALL_H - 5, WALL_H - 3, side === 'L' ? '#d6c08a' : '#e7d3a0');
  }
  line(g, T[0] + OFF_X, T[1] + OFF_Y - WALL_H, T[0] + OFF_X, T[1] + OFF_Y, '#d6c08a');

  // janelas (noite): [lado, t0, t1]
  const windows = [
    ['R', 0.8, 2.8], ['R', 9.2, 11.2], ['R', 13, 15], ['R', 17.2, 19.2], ['R', 20.6, 23.4],
    ['L', 0.8, 2.6], ['L', 3.4, 5.2], ['L', 6.6, 8.4], ['L', 9.2, 11], ['L', 25, 27], ['L', 27.8, 29.8],
  ];
  for (const [side, t0, t1] of windows) {
    quad(side, t0, t1, 22, 56, K.paper);
    quad(side, t0 + 0.12, t1 - 0.12, 24, 54, '#171d6e');
    quad(side, t0 + 0.12, t1 - 0.12, 24, 33, '#0f1450');
    const n = 4;
    const seg = (t1 - t0 - 0.24) / n;
    [29, 34, 27, 31].forEach((top, i) => quad(side, t0 + 0.12 + seg * i, t0 + 0.12 + seg * (i + 1) - 0.06, 24, top, '#2a2f98'));
    for (const [k, hh] of [[0.3, 27], [1.6, 30], [2.8, 26], [3.6, 29]]) {
      const [x, y] = wl(side, t0 + 0.12 + seg * k * 0.9 + 0.1, hh);
      rect(g, K.yellow, Math.round(x), Math.round(y), 1, 1);
    }
    wline(side, (t0 + t1) / 2, 24, (t0 + t1) / 2, 54, K.paper);
    wline(side, t0 + 0.12, 39, t1 - 0.12, 39, K.paper);
    const [sx, sy] = wl(side, t0 + (t1 - t0) * 0.3, 48);
    rect(g, K.paper, Math.round(sx), Math.round(sy), 1, 1);
    rect(g, K.paper, Math.round(sx) + 5, Math.round(sy) + 2, 1, 1);
  }

  // placas com o nome de cada sala na parede de fora
  const plates = [['R', 'reuniao', 6], ['R', 'diretor', 16], ['L', 'componentes', 15], ['L', 'seguranca', 21], ['L', 'copa', 28]];
  for (const [side, id, tc] of plates) {
    const room = MAP.rooms.find((r) => r.id === id);
    const half = room.name.length / 4 + 0.35;
    quad(side, tc - half, tc + half, 57, 68, K.ink);
    quad(side, tc - half + 0.06, tc + half - 0.06, 58, 67, room.plate);
    wtext(side, tc, 63, room.name, '#fff6e0');
  }

  // sala de reunião: quadro branco grande; diretor: quadros na parede; corredor: cartaz e extintor
  quad('R', 3.4, 8.6, 20, 50, '#8fa3ff');
  quad('R', 3.55, 8.45, 22, 48, '#ffffff');
  wline('R', 3.9, 42, 6.6, 42, K.cyan);
  wline('R', 3.9, 37, 7.6, 37, K.red);
  wline('R', 3.9, 32, 5.8, 32, '#3d50cf');
  wline('R', 6.4, 27, 8.0, 27, K.green);
  quad('R', 4.2, 7.8, 19, 21, '#d6c08a');
  for (const [t0, t1] of [[13.2, 14.6], [17.4, 18.8]]) {
    quad('R', t0, t1, 26, 50, '#c9a10f');
    quad('R', t0 + 0.08, t1 - 0.08, 28, 48, K.pink);
    quad('R', t0 + 0.2, t1 - 0.2, 32, 44, K.yellow);
  }
  // pegboard de ferramentas (componentes)
  quad('L', 13, 17, 22, 52, '#7a4b2a');
  quad('L', 13.1, 16.9, 24, 50, '#c0621f');
  for (let i = 0; i < 6; i++) wline('L', 13.4 + i * 0.6, 30 + (i % 3) * 5, 13.4 + i * 0.6, 40 + (i % 2) * 6, i % 2 ? '#2bc8ff' : '#ffd426');
  // posters de segurança
  quad('L', 18.7, 20.3, 26, 52, '#0f8a5a');
  quad('L', 18.8, 20.2, 28, 50, '#3dff8b');
  quad('L', 19.15, 19.85, 34, 44, '#ffffff');
  quad('L', 19.4, 19.6, 30, 48, '#ffffff');
  quad('L', 21, 22.6, 26, 52, '#c9a10f');
  quad('L', 21.1, 22.5, 28, 50, K.yellow);
  quad('L', 21.55, 22.05, 36, 46, K.ink);
  // armários altos da copa
  quad('L', 24.7, 30.3, 40, 58, '#a8531f');
  for (let i = 0; i < 6; i++) {
    quad('L', 24.75 + i * 0.93, 24.75 + i * 0.93 + 0.86, 42, 56, '#e8873a');
    quad('L', 24.75 + i * 0.93 + 0.68, 24.75 + i * 0.93 + 0.74, 47, 52, K.yellow);
  }
  // relógio e extintores
  {
    const [cx, cy] = wl('R', 1.5, 62);
    ellipse(g, cx, cy, 5, 5, K.ink, { fill: K.paper });
    line(g, cx, cy, cx, cy - 3, K.ink);
    line(g, cx, cy, cx + 2, cy + 1, K.red);
  }
  for (const [side, t] of [['R', 23.6], ['L', 23.4], ['L', 11.9]]) {
    const [ex, ey] = wl(side, t, 0);
    rect(g, K.red, Math.round(ex) - 3, Math.round(ey) - 18, 6, 13);
    rect(g, '#c01b2c', Math.round(ex) + 1, Math.round(ey) - 18, 2, 13);
    rect(g, K.ink, Math.round(ex) - 2, Math.round(ey) - 22, 4, 4);
    rect(g, K.ink, Math.round(ex) + 1, Math.round(ey) - 21, 4, 1);
    rect(g, K.paper, Math.round(ex) - 2, Math.round(ey) - 13, 4, 4);
  }

  // laterais do piso (bordas abertas)
  poly([L, B, [B[0], B[1] + 8], [L[0], L[1] + 8]], '#10164a');
  poly([B, R, [R[0], R[1] + 8], [B[0], B[1] + 8]], '#161d5c');
  line(g, L[0] + OFF_X, L[1] + OFF_Y + 8, B[0] + OFF_X, B[1] + OFF_Y + 8, '#05061a');
  line(g, B[0] + OFF_X, B[1] + OFF_Y + 8, R[0] + OFF_X, R[1] + OFF_Y + 8, '#05061a');

  // pisos por sala, com textura
  const rnd = rng(1234);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const room = roomAt(x + 0.5, y + 0.5);
      const kind = room ? room.floor : 'office';
      const [c1, c2] = FLOORS[kind];
      const [tx, ty] = project(x, y);
      const cx = tx + OFF_X;
      const cy = ty + OFF_Y;
      const base = (x + y) % 2 ? c2 : c1;
      const top = [cx, cy];
      const right = [cx + HX, cy + HY];
      const bottom = [cx, cy + 2 * HY];
      const left = [cx - HX, cy + HY];
      fillPoly(g, [top, right, bottom, left], base);
      if (kind === 'wood') {
        // tábuas
        for (const t of [1 / 3, 2 / 3]) {
          const a = [top[0] + (left[0] - top[0]) * t, top[1] + (left[1] - top[1]) * t];
          const b = [right[0] + (bottom[0] - right[0]) * t, right[1] + (bottom[1] - right[1]) * t];
          line(g, a[0], a[1], b[0], b[1], 'rgba(90,40,10,0.35)');
        }
      } else if (kind === 'kitchen') {
        line(g, top[0], top[1], right[0], right[1], 'rgba(200,150,60,0.4)');
        line(g, top[0], top[1], left[0], left[1], 'rgba(200,150,60,0.4)');
      }
      const dots = kind === 'concrete' ? 14 : kind === 'safety' || kind === 'kitchen' ? 3 : 9;
      for (let i = 0; i < dots; i++) {
        const dx = Math.round((rnd() - 0.5) * 2 * (HX - 5));
        const maxDy = HY - 2 - Math.abs(dx) / 2;
        const dy = Math.round((rnd() - 0.5) * 2 * maxDy);
        rect(g, rnd() < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.10)', cx + dx, cy + HY + dy, 1, 1);
      }
    }
  }
  // emendas do carpete só no salão
  for (let i = 0; i <= W; i++) {
    const a = project(i, 0);
    const b = project(i, H);
    line(g, a[0] + OFF_X, a[1] + OFF_Y, b[0] + OFF_X, b[1] + OFF_Y, 'rgba(10,14,26,0.12)');
  }
  for (let i = 0; i <= H; i++) {
    const a = project(0, i);
    const b = project(W, i);
    line(g, a[0] + OFF_X, a[1] + OFF_Y, b[0] + OFF_X, b[1] + OFF_Y, 'rgba(10,14,26,0.12)');
  }

  // detalhes de piso por sala
  const fr = (x0, y0, x1, y1, color) => floorRect(g, OFF_X, OFF_Y, x0, y0, x1, y1, color);
  fr(13.2, 1.1, 18.8, 4.9, '#ffd426'); // tapete do diretor (moldura dourada)
  fr(13.4, 1.3, 18.6, 4.7, '#8b3bb8');
  fr(14, 1.9, 18, 4.1, '#a24ad4');
  fr(3.4, 4.7, 8.6, 5.2, '#e0954e'); // faixa clara na entrada da reunião
  for (let i = 0; i < 6; i++) {
    fr(8.15, 14.2 + i * 0.5, 8.6, 14.45 + i * 0.5, i % 2 ? '#0b0e1a' : '#ffd426'); // faixa de perigo na porta de componentes
  }
  fr(1.6, 20.2, 2.4, 22.6, '#3dff8b'); // cruz verde da segurança
  fr(1.0, 21.0, 3.0, 21.8, '#3dff8b');
  fr(8.4, 20.5, 8.6, 22.5, '#1fb86a');
  fr(3, 28.9, 10, 29.2, '#ffd97a'); // faixa da copa
  for (const [x0, y0, x1, y1] of DOORS) {
    fr(x0, y0, x1, y1, '#0b0e1a');
    fr(x0 + 0.05, y0 + 0.05, x1 - 0.05, y1 - 0.05, '#232a78');
  }

  // zona segura (anel tracejado) e portais de bug
  const [zx, zy] = project(MAP.safeCenter.x, MAP.safeCenter.y);
  const rr = MAP.safeRadius * 1.41;
  ellipse(g, zx + OFF_X, zy + OFF_Y, rr * HX, rr * HY, K.green, { fill: 'rgba(61,255,139,0.10)', dash: 3 });
  for (const pt of MAP.portals) {
    const [px, py] = project(pt.x, pt.y);
    const cx = px + OFF_X;
    const cy = py + OFF_Y;
    fillPoly(g, [[cx, cy - 7], [cx + 15, cy], [cx, cy + 7], [cx - 15, cy]], '#3a1620');
    fillPoly(g, [[cx, cy - 5], [cx + 10, cy], [cx, cy + 5], [cx - 10, cy]], '#7a1f2b');
    fillPoly(g, [[cx, cy - 2], [cx + 5, cy], [cx, cy + 2], [cx - 5, cy]], K.red);
    line(g, cx, cy - 7, cx + 15, cy, K.red);
    line(g, cx + 15, cy, cx, cy + 7, K.red);
    line(g, cx, cy + 7, cx - 15, cy, K.red);
    line(g, cx - 15, cy, cx, cy - 7, K.red);
  }
  return c;
}
