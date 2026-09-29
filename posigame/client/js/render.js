// Renderizador isométrico 2:1 em canvas de baixa resolução (pixel art), com LOD por qualidade.
import { MAP, CLASSES, ENEMIES } from '/shared/game.js';
import { characterFrame, enemyFrame, tintedEnemy, pickupFrame, poseFor, classIcon } from './sprites.js';

const HX = 16; // meia largura do tile
const HY = 8; // meia altura do tile
const WALL_H = 64;
const OFF_X = 304; // origem do cache estático
const OFF_Y = 76;
const CACHE_W = 608;
const CACHE_H = 380;

export const QUALITY = [
  { name: 'Baixa', h: 216, fps: 30, shadows: false, bursts: false, rings: true, bars: false, leds: false, fxCap: 12 },
  { name: 'Média', h: 243, fps: 45, shadows: true, bursts: true, rings: true, bars: true, leds: true, fxCap: 24 },
  { name: 'Alta', h: 270, fps: 60, shadows: true, bursts: true, rings: true, bars: true, leds: true, fxCap: 40 },
];

const C = {
  ink: '#1B1F2B',
  carpet: '#2F3E5C',
  carpet2: '#46597F',
  wall: '#E8E1CF',
  wallShade: '#CFC7B1',
  paper: '#F7F3E8',
  wood: '#B57B4A',
  woodDark: '#7A4B2A',
  woodSide: '#966035',
  green: '#6BE38A',
  red: '#E5484D',
  yellow: '#FFD25A',
  pink: '#FF7EB6',
};

export const project = (x, y) => [(x - y) * HX, (x + y) * HY];

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

const poly = (g, pts, fill, stroke) => {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = 1;
    g.stroke();
  }
};

// Caixa isométrica com o vértice de cima da base em (0,0).
function box(g, w, d, h, top, left, right) {
  const R = [HX * w, HY * w];
  const B = [HX * w - HX * d, HY * w + HY * d];
  const L = [-HX * d, HY * d];
  const up = ([x, y]) => [x, y - h];
  poly(g, [L, B, up(B), up(L)], left);
  poly(g, [B, R, up(R), up(B)], right);
  poly(g, [[0, -h], up(R), up(B), up(L)], top);
}

function bake(w, h, ax, ay, fn) {
  const [c, g] = makeCanvas(w, h);
  g.translate(ax, ay);
  fn(g);
  return { canvas: c, ax, ay };
}

// ----- sprites de cenário -----

function buildProps() {
  const P = {};
  P.desk = bake(80, 56, 24, 30, (g) => {
    box(g, 2, 1, 7, C.wood, C.woodDark, C.woodSide);
    // monitor
    poly(g, [[3, -14], [13, -9], [13, 2], [3, -3]], C.ink);
    poly(g, [[4, -12], [12, -8], [12, 1], [4, -3]], C.green);
    poly(g, [[4, -12], [7, -10.5], [7, -8], [4, -9.5]], C.yellow);
    poly(g, [[8, -9.5], [11, -8], [11, -6], [8, -7.5]], C.pink);
    // teclado, mouse, caneca, papéis
    poly(g, [[7, -2], [16, 2], [14, 3], [5, -1]], '#B8B09A');
    poly(g, [[19, 1], [21, 2], [20, 3], [18, 2]], C.ink);
    g.fillStyle = C.paper;
    g.fillRect(23, -1, 3, 4);
    g.fillStyle = '#5B3A29';
    g.fillRect(23, -1, 3, 1);
    poly(g, [[19, -6], [25, -3], [23, -2], [17, -5]], C.paper);
  });
  P.chair = bake(24, 36, 12, 26, (g) => {
    poly(g, [[-7, -1], [0, -5], [0, -14], [-7, -10]], '#2A2F3E');
    poly(g, [[0, -5], [7, -1], [0, 2], [-7, -1]], C.carpet2);
    poly(g, [[-7, -1], [0, 2], [0, 5], [-7, 2]], C.ink);
    poly(g, [[7, -1], [0, 2], [0, 5], [7, 2]], '#232838');
    g.fillStyle = C.ink;
    g.fillRect(-1, 5, 2, 3);
    g.fillRect(-5, 8, 10, 1);
  });
  P.server = bake(48, 76, 16, 44, (g) => {
    box(g, 1, 1, 32, '#4A5470', '#232838', '#2E3448');
  });
  P.coffee = bake(48, 60, 16, 30, (g) => {
    box(g, 1, 1, 20, C.paper, '#B8B09A', C.wall);
    poly(g, [[-12, -6], [-4, -2], [-4, 4], [-12, 0]], C.red);
    poly(g, [[4, -1], [12, -5], [12, 1], [4, 5]], C.ink);
    g.fillStyle = C.yellow;
    g.fillRect(7, -1, 3, 3);
  });
  P.printer = bake(48, 44, 16, 26, (g) => {
    box(g, 1, 1, 11, C.paper, '#B8B09A', C.wall);
    poly(g, [[-4, -12], [3, -8.5], [2, -6], [-5, -9.5]], C.paper);
    poly(g, [[4, 5], [9, 2.5], [9, 5], [4, 7.5]], C.green);
  });
  P.plant = bake(32, 44, 16, 36, (g) => {
    poly(g, [[-5, -1], [5, -1], [4, 7], [-4, 7]], C.wood);
    poly(g, [[0, -21], [-7, -2], [0, -5]], '#2E9E5B');
    poly(g, [[0, -23], [7, -2], [0, -5]], C.green);
    poly(g, [[-9, -13], [-1, -3], [-2, -6]], '#2E9E5B');
    poly(g, [[9, -13], [1, -3], [2, -6]], '#2E9E5B');
  });
  P.bin = bake(24, 30, 12, 24, (g) => {
    poly(g, [[-5, -7], [5, -7], [4, 3], [-4, 3]], C.carpet2);
    poly(g, [[-5, -7], [0, -5], [0, 3], [-4, 3]], C.carpet);
    poly(g, [[0, -9], [5, -7], [0, -5], [-5, -7]], '#8FA3C7');
    poly(g, [[0, -8.5], [3, -7], [0, -5.5], [-3, -7]], C.ink);
    poly(g, [[-1.5, -10], [1, -9], [0, -7.5], [-2.5, -8.5]], C.paper);
  });
  P.cooler = bake(24, 40, 12, 32, (g) => {
    g.fillStyle = C.wall;
    g.fillRect(-5, -5, 10, 13);
    g.fillStyle = '#B8B09A';
    g.fillRect(-5, -5, 5, 13);
    g.fillStyle = '#4FC3F7';
    g.fillRect(-4, -18, 8, 13);
    g.fillStyle = 'rgba(255,255,255,0.4)';
    g.fillRect(-4, -18, 2, 13);
    g.fillStyle = C.paper;
    g.fillRect(-2, -20, 4, 2);
    g.fillStyle = C.red;
    g.fillRect(1, -1, 2, 2);
    g.fillStyle = '#4FC3F7';
    g.fillRect(-3, -1, 2, 2);
  });
  return P;
}

// ----- cache estático: paredes, piso, zona segura, portais -----

function wallPt(side, s, h) {
  const bx = (side === 'L' ? -1 : 1) * 288 * s;
  return [bx, 144 * s - h];
}
function wallQuad(g, side, s0, s1, h0, h1, fill, stroke) {
  poly(g, [wallPt(side, s0, h0), wallPt(side, s1, h0), wallPt(side, s1, h1), wallPt(side, s0, h1)], fill, stroke);
}

function buildStatic() {
  const [c, g] = makeCanvas(CACHE_W, CACHE_H);
  g.translate(OFF_X, OFF_Y);
  const T = project(0, 0);
  const R = project(MAP.w, 0);
  const B = project(MAP.w, MAP.h);
  const L = project(0, MAP.h);

  // paredes
  poly(g, [T, L, [L[0], L[1] - WALL_H], [T[0], T[1] - WALL_H]], C.wallShade);
  poly(g, [T, R, [R[0], R[1] - WALL_H], [T[0], T[1] - WALL_H]], C.wall);
  wallQuad(g, 'L', 0, 1, 0, 6, C.carpet2);
  wallQuad(g, 'R', 0, 1, 0, 6, '#5C6F96');
  const stars = [[0.12, 40], [0.34, 34], [0.66, 44], [0.86, 30], [0.5, 40]];
  for (const side of ['L', 'R']) {
    for (const [a, b] of [[0.08, 0.2], [0.28, 0.4], [0.6, 0.72], [0.8, 0.92]]) {
      wallQuad(g, side, a, b, 22, 50, '#0E1A33', C.paper);
    }
    for (const [s, h] of stars) {
      const [x, y] = wallPt(side, s, h);
      g.fillStyle = C.paper;
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
  // quadro kanban de post-its (parede esquerda)
  wallQuad(g, 'L', 0.44, 0.58, 16, 46, C.wood, C.woodDark);
  const notes = [[0.455, 38, C.yellow], [0.5, 38, C.pink], [0.545, 38, C.green], [0.455, 28, '#4FC3F7'], [0.5, 28, C.yellow], [0.455, 20, C.pink], [0.545, 24, C.yellow]];
  for (const [s, h, col] of notes) wallQuad(g, 'L', s, s + 0.03, h, h + 6, col);
  // quadro branco (parede direita)
  wallQuad(g, 'R', 0.42, 0.58, 16, 46, C.paper, '#8FA3C7');
  for (const [s0, h0, s1, h1, col] of [[0.44, 38, 0.52, 36, '#4FC3F7'], [0.44, 30, 0.55, 26, C.red], [0.45, 22, 0.5, 21, '#8FA3C7']]) {
    g.strokeStyle = col;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(...wallPt('R', s0, h0));
    g.lineTo(...wallPt('R', s1, h1));
    g.stroke();
  }
  // relógio, pôster e extintor
  const [cx, cy] = wallPt('R', 0.5, 56);
  g.fillStyle = C.paper;
  g.fillRect(Math.round(cx) - 4, Math.round(cy) - 4, 8, 8);
  g.fillStyle = C.ink;
  g.fillRect(Math.round(cx), Math.round(cy) - 3, 1, 4);
  g.fillStyle = C.red;
  g.fillRect(Math.round(cx), Math.round(cy), 3, 1);
  wallQuad(g, 'R', 0.05, 0.16, 22, 52, C.yellow);
  wallQuad(g, 'R', 0.07, 0.14, 30, 36, C.red);
  wallQuad(g, 'R', 0.07, 0.11, 40, 44, C.ink);
  const [ex, ey] = wallPt('R', 0.94, 0);
  g.fillStyle = C.red;
  g.fillRect(Math.round(ex) - 3, Math.round(ey) - 16, 5, 12);
  g.fillStyle = C.ink;
  g.fillRect(Math.round(ex) - 2, Math.round(ey) - 19, 3, 3);

  // laterais do piso
  poly(g, [L, B, [B[0], B[1] + 8], [L[0], L[1] + 8]], '#10131B');
  poly(g, [B, R, [R[0], R[1] + 8], [B[0], B[1] + 8]], '#161A26');

  // piso xadrez de carpete
  for (let x = 0; x < MAP.w; x++) {
    for (let y = 0; y < MAP.h; y++) {
      const [tx, ty] = project(x, y);
      poly(g, [[tx, ty], [tx + HX, ty + HY], [tx, ty + 2 * HY], [tx - HX, ty + HY]], (x + y) % 2 ? C.carpet2 : C.carpet);
    }
  }

  // zona segura (anel tracejado) e portais de bug
  const [zx, zy] = project(MAP.safeCenter.x, MAP.safeCenter.y);
  const rr = MAP.safeRadius * 1.41;
  g.save();
  g.fillStyle = 'rgba(107,227,138,0.12)';
  g.strokeStyle = C.green;
  g.setLineDash([4, 3]);
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(zx, zy, rr * HX, rr * HY, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();
  for (const pt of MAP.portals) {
    const [px, py] = project(pt.x, pt.y);
    poly(g, [[px, py - 6], [px + 14, py], [px, py + 6], [px - 14, py]], 'rgba(229,72,77,0.35)', C.red);
    poly(g, [[px, py - 3], [px + 7, py], [px, py + 3], [px - 7, py]], 'rgba(229,72,77,0.6)');
  }
  return c;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.props = null;
    this.staticCache = null;
    this.quality = 2;
    this.cam = { x: 0, y: 0, init: false };
    this.W = 480;
    this.H = 270;
    this.resize();
  }

  ready() {
    if (!this.props) {
      this.props = buildProps();
      this.staticCache = buildStatic();
    }
  }

  setQuality(q) {
    this.quality = Math.max(0, Math.min(2, q));
    this.resize();
  }

  resize() {
    const q = QUALITY[this.quality];
    const aspect = Math.max(1.2, Math.min(2.4, window.innerWidth / Math.max(1, window.innerHeight)));
    this.H = q.h;
    this.W = Math.round(this.H * aspect);
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.g = this.canvas.getContext('2d');
    this.g.imageSmoothingEnabled = false;
  }

  // ----- quadro -----

  draw(world, view, now, dt, input) {
    this.ready();
    const g = this.g;
    const q = QUALITY[this.quality];
    const W = this.W;
    const H = this.H;
    g.fillStyle = C.ink;
    g.fillRect(0, 0, W, H);
    if (!view) return;

    // câmera segue o jogador local
    const me = view.players.find((p) => p.isYou);
    const focus = me ? project(me.x, me.y) : [0, 144];
    if (!this.cam.init) {
      this.cam.x = focus[0];
      this.cam.y = focus[1] - 20;
      this.cam.init = true;
    }
    const k = 1 - Math.exp(-dt * 7);
    this.cam.x += (focus[0] - this.cam.x) * k;
    this.cam.y += (focus[1] - 20 - this.cam.y) * k;
    const minX = -296 + W / 2;
    const maxX = 296 - W / 2;
    const minY = -66 + H / 2;
    const maxY = 300 - H / 2;
    let cx = maxX < minX ? 0 : Math.min(maxX, Math.max(minX, this.cam.x));
    let cy = maxY < minY ? 117 : Math.min(maxY, Math.max(minY, this.cam.y));
    if (now - world.shake < 0.25 && q.bars) {
      cx += (Math.random() - 0.5) * 4;
      cy += (Math.random() - 0.5) * 4;
    }
    cx = Math.round(cx);
    cy = Math.round(cy);
    const ox = Math.round(W / 2) - cx;
    const oy = Math.round(H / 2) - cy;

    g.drawImage(this.staticCache, ox - OFF_X, oy - OFF_Y);

    // portais em aviso (bug prestes a nascer)
    for (const e of view.enemies) {
      if (!(e.flags & 1)) continue;
      const [sx, sy] = project(e.x, e.y);
      const pulse = 4 + Math.abs(Math.sin(now * 8)) * 5;
      g.strokeStyle = C.red;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(ox + sx, oy + sy, pulse * 1.6, pulse * 0.8, 0, 0, Math.PI * 2);
      g.stroke();
    }

    // itens com profundidade
    const items = [];
    const P = this.props;
    for (const d of MAP.desks) {
      items.push({ d: d.x + d.w / 2 + d.y + d.h / 2 + 0.2, f: () => this.blit(P.desk, ox, oy, d.x, d.y) });
      items.push({ d: d.x + 1.1 + d.y + 1.9, f: () => this.blit(P.chair, ox, oy, d.x + 1, d.y + 1.7, 0) });
    }
    const S = MAP.server;
    items.push({ d: S.x + S.y + 1, f: () => this.drawServer(ox, oy, view, now, q) });
    items.push({ d: MAP.coffee.x + MAP.coffee.y + 1, f: () => this.blit(P.coffee, ox, oy, MAP.coffee.x, MAP.coffee.y) });
    items.push({ d: MAP.printer.x + MAP.printer.y + 1, f: () => this.blit(P.printer, ox, oy, MAP.printer.x, MAP.printer.y) });
    for (const pl of MAP.plants) items.push({ d: pl.x + pl.y, f: () => this.blit(P.plant, ox, oy, pl.x, pl.y, 0) });
    for (const b of MAP.bins) items.push({ d: b.x + b.y, f: () => this.blit(P.bin, ox, oy, b.x, b.y, 0) });
    items.push({ d: MAP.cooler.x + MAP.cooler.y, f: () => this.blit(P.cooler, ox, oy, MAP.cooler.x, MAP.cooler.y, 0) });

    for (const k2 of view.pickups) items.push({ d: k2.x + k2.y, f: () => this.drawPickup(k2, ox, oy, now) });
    for (const e of view.enemies) items.push({ d: e.x + e.y, f: () => this.drawEnemy(e, ox, oy, now, q) });
    for (const p of view.players) items.push({ d: p.x + p.y, f: () => this.drawPlayer(p, ox, oy, now, q) });

    items.sort((a, b) => a.d - b.d);
    for (const it of items) it.f();

    this.drawFx(world, ox, oy, now, q);
    this.drawOverlays(world, view, now, q);
  }

  // props de cenário: âncora em (x,y) do mundo. mode 0 = âncora no ponto (sem deslocar meio tile)
  blit(prop, ox, oy, x, y, mode = 1) {
    let [sx, sy] = project(x, y);
    if (mode === 1) {
      // caixas: o sprite usa o vértice de cima da base como origem
    }
    this.g.drawImage(prop.canvas, Math.round(ox + sx - prop.ax), Math.round(oy + sy - prop.ay));
  }

  drawServer(ox, oy, view, now, q) {
    const g = this.g;
    const S = MAP.server;
    const [sx, sy] = project(S.x, S.y);
    const x = ox + sx;
    const y = oy + sy;
    g.drawImage(this.props.server.canvas, Math.round(x - 16), Math.round(y - 44));
    // LEDs (piscam conforme a qualidade)
    const blink = q.leds ? Math.floor(now * 2) % 2 : 0;
    const leds = [
      [4, -12, C.green, 0], [4, -4, C.green, 1], [4, 4, C.red, 0],
      [-12, -16, C.green, 1], [-12, -8, C.yellow, 0], [-12, 0, C.green, 1],
    ];
    for (const [lx, ly, col, ph] of leds) {
      if (q.leds && (blink + ph) % 2 === 0) g.globalAlpha = 0.35;
      g.fillStyle = col;
      g.fillRect(Math.round(x + lx), Math.round(y + ly), 3, 2);
      g.globalAlpha = 1;
    }
    const snap = view.snap;
    if (snap) {
      const [hp, max, inv] = snap.srv;
      const ratio = max ? hp / max : 0;
      if (ratio < 0.3 && q.bars && Math.floor(now * 4) % 2) {
        g.fillStyle = 'rgba(229,72,77,0.25)';
        g.fillRect(Math.round(x - 14), Math.round(y - 44), 28, 40);
      }
      if (inv) {
        g.strokeStyle = '#4FC3F7';
        g.lineWidth = 1;
        g.strokeRect(Math.round(x - 17), Math.round(y - 46), 34, 50);
      }
    }
  }

  shadow(x, y, rx, ry, q) {
    if (!q.shadows) return;
    const g = this.g;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }

  drawPlayer(p, ox, oy, now, q) {
    const g = this.g;
    const [sx, sy] = project(p.x, p.y);
    const x = Math.round(ox + sx);
    const y = Math.round(oy + sy);
    const cls = CLASSES[p.cls] || CLASSES.dev;
    if (p.flags & 4) g.globalAlpha = 0.35; // fantasma (caiu da rede)
    // marcador de classe no chão
    g.strokeStyle = cls.color;
    g.fillStyle = `${cls.color}33`;
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    this.shadow(x, y + 1, 7, 3, q);
    if (p.flags & 32) {
      g.strokeStyle = '#4FC3F7';
      g.beginPath();
      g.ellipse(x, y - 8, 12, 15, 0, 0, Math.PI * 2);
      g.stroke();
    }
    const look = p.look;
    if (look) {
      const invBlink = p.flags & 2 && Math.floor(now * 8) % 2 === 0;
      if (!invBlink) {
        const pose = poseFor(p.flags, p.moving, now);
        const fr = characterFrame(look, pose);
        const S = 2;
        g.save();
        g.translate(x, y);
        if (p.face < 0) g.scale(-1, 1);
        g.drawImage(fr.canvas, -fr.ax * S, -fr.ay * S + (pose === 'down' ? 6 : 0), fr.w * S, fr.h * S);
        g.restore();
      }
    }
    // nick, barra de vida e revive
    const top = y - 46;
    if (!(p.flags & 1) && (!p.isYou || q.bars)) {
      const ratio = p.maxHp ? Math.max(0, p.hp / p.maxHp) : 0;
      g.fillStyle = C.ink;
      g.fillRect(x - 10, top + 9, 20, 3);
      g.fillStyle = ratio > 0.5 ? C.green : ratio > 0.25 ? C.yellow : C.red;
      g.fillRect(x - 9, top + 10, Math.round(18 * ratio), 1);
    }
    g.font = '13px VT323, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillStyle = C.ink;
    g.fillText(p.nick, x + 1, top + 7);
    g.fillStyle = p.isYou ? C.yellow : C.paper;
    g.fillText(p.nick, x, top + 6);
    if (p.isYou && !(p.flags & 1)) {
      const bob = Math.floor(now * 3) % 2;
      g.fillStyle = C.pink;
      g.fillRect(x - 2, top - 3 + bob, 5, 1);
      g.fillRect(x - 1, top - 2 + bob, 3, 1);
      g.fillRect(x, top - 1 + bob, 1, 1);
    }
    if (p.flags & 1) {
      // derrubado: barra de revive
      g.fillStyle = C.ink;
      g.fillRect(x - 12, top + 14, 24, 4);
      g.fillStyle = C.green;
      g.fillRect(x - 11, top + 15, Math.round(22 * Math.min(1, p.rev / 250)), 2);
      const ic = classIcon(p.cls);
      g.drawImage(ic.canvas, x - 3, top + 20);
    }
    g.globalAlpha = 1;
  }

  drawEnemy(e, ox, oy, now, q) {
    const g = this.g;
    const [sx, sy] = project(e.x, e.y);
    const x = Math.round(ox + sx);
    const y = Math.round(oy + sy);
    const spawning = e.flags & 1;
    const frozen = e.flags & 8;
    const hit = e.flags & 16;
    const rate = e.type === 'clock' ? 12 : e.type === 'leak' ? 3 : 5;
    const f = frozen || spawning ? 0 : Math.floor(now * rate) % 2;
    let fr = enemyFrame(e.type, f);
    if (frozen) fr = tintedEnemy(e.type, f, '#4FC3F7');
    else if (hit) fr = tintedEnemy(e.type, f, '#FFFFFF');
    else if (e.type === 'boss') fr = tintedEnemy(e.type, f, '#FF9E44');
    const S = e.type === 'boss' ? 4 : e.type === 'minimail' ? 1 : e.type === 'leak' && e.grown >= 2 ? 3 : 2;
    if (spawning) g.globalAlpha = 0.35;
    this.shadow(x, y + 1, 6 * S, 2 * S, q);
    const bob = f && e.type === 'bug' ? -1 : 0;
    g.drawImage(fr.canvas, Math.round(x - fr.ax * S), Math.round(y - fr.ay * S + bob), fr.w * S, fr.h * S);
    if (e.type === 'boss' && !spawning) {
      g.fillStyle = C.yellow;
      const bx = x - 12;
      const by = y - fr.ay * S - 4;
      g.fillRect(bx, by + 4, 24, 4);
      g.fillRect(bx, by, 4, 4);
      g.fillRect(bx + 10, by, 4, 4);
      g.fillRect(bx + 20, by, 4, 4);
    }
    g.globalAlpha = 1;
    if (spawning) return;
    // marcas de QA (amarelo) e prioridade do PO (rosa)
    const topY = y - fr.ay * S - (e.type === 'boss' ? 10 : 2);
    if (e.flags & 2) {
      g.fillStyle = C.yellow;
      g.fillRect(x - 1, topY - 6, 3, 4);
      g.fillRect(x - 1, topY - 1, 3, 2);
    }
    if (e.flags & 4) {
      g.strokeStyle = C.pink;
      g.setLineDash([3, 2]);
      g.lineWidth = 1;
      const w = 9 * S;
      g.beginPath();
      g.moveTo(x, y - fr.ay * S - 2);
      g.lineTo(x + w, y - 4 * S + 2);
      g.lineTo(x, y + 6);
      g.lineTo(x - w, y - 4 * S + 2);
      g.closePath();
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = C.pink;
      g.fillRect(x - 4, topY - 13, 8, 5);
    }
    if (e.flags & 32) {
      g.fillStyle = C.red;
      g.fillRect(x - 2, topY - 12, 4, 8);
    }
    if (q.bars && e.type !== 'boss' && e.hp < e.maxHp) {
      g.fillStyle = C.ink;
      g.fillRect(x - 8, topY - 2, 16, 3);
      g.fillStyle = C.red;
      g.fillRect(x - 7, topY - 1, Math.max(1, Math.round((14 * e.hp) / e.maxHp)), 1);
    }
  }

  drawPickup(k, ox, oy, now) {
    const [sx, sy] = project(k.x, k.y);
    const fr = pickupFrame(k.kind);
    const bob = Math.round(Math.sin(now * 5 + k.id) * 2);
    const x = Math.round(ox + sx);
    const y = Math.round(oy + sy);
    this.g.fillStyle = 'rgba(0,0,0,0.3)';
    this.g.fillRect(x - 5, y, 10, 2);
    this.g.drawImage(fr.canvas, x - fr.ax * 2, y - fr.ay * 2 - 6 + bob, fr.w * 2, fr.h * 2);
  }

  // ----- efeitos -----

  drawFx(world, ox, oy, now, q) {
    const g = this.g;
    const fx = world.fx;
    for (const s of fx.shots) {
      const a = 1 - (now - s.t0) / s.dur;
      const [x1, y1] = project(s.x1, s.y1);
      const [x2, y2] = project(s.x2, s.y2);
      g.globalAlpha = Math.max(0, a);
      g.strokeStyle = s.color;
      g.lineWidth = s.aoe ? 3 : 2;
      if (s.aoe) {
        g.beginPath();
        g.ellipse(ox + x1, oy + y1 - 4, 24, 12, 0, 0, Math.PI * 2);
        g.stroke();
      } else {
        g.beginPath();
        g.moveTo(Math.round(ox + x1), Math.round(oy + y1 - 16));
        g.lineTo(Math.round(ox + x2), Math.round(oy + y2 - 8));
        g.stroke();
        g.fillStyle = C.paper;
        g.fillRect(Math.round(ox + x2) - 1, Math.round(oy + y2 - 8) - 1, 3, 3);
      }
      g.globalAlpha = 1;
    }
    if (q.rings) {
      for (const r of fx.rings) {
        const t = (now - r.t0) / r.dur;
        const [x, y] = project(r.x, r.y);
        const rad = (r.big ? 7 : 4) * 16 * t;
        g.globalAlpha = 1 - t;
        g.strokeStyle = r.color;
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(Math.round(ox + x), Math.round(oy + y), rad * 1.4, rad * 0.7, 0, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
      }
    }
    if (q.bursts) {
      for (const b of fx.bursts) {
        const t = (now - b.t0) / b.dur;
        const [x, y] = project(b.x, b.y);
        const bx = Math.round(ox + x);
        const by = Math.round(oy + y) - 8;
        const fr = Math.min(2, Math.floor(t * 3));
        g.fillStyle = C.yellow;
        if (fr === 0) {
          g.fillRect(bx - 1, by - 1, 3, 3);
          g.fillStyle = C.paper;
          g.fillRect(bx, by, 1, 1);
        } else if (fr === 1) {
          for (const [dx, dy] of [[-6, -6], [4, -6], [-6, 4], [4, 4]]) g.fillRect(bx + dx, by + dy, 3, 3);
          g.fillStyle = C.paper;
          g.fillRect(bx - 1, by - 8, 3, 2);
          g.fillRect(bx - 1, by + 7, 3, 2);
        } else {
          g.fillStyle = C.paper;
          for (const [dx, dy] of [[-9, -9], [9, -9], [-9, 9], [9, 9], [0, -11], [0, 11]]) g.fillRect(bx + dx, by + dy, 1, 1);
        }
      }
    }
    g.font = '10px "Press Start 2P", monospace';
    g.textAlign = 'center';
    for (const t of fx.texts) {
      const p = (now - t.t0) / t.dur;
      const [x, y] = project(t.x, t.y);
      g.globalAlpha = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
      g.font = t.small ? '8px "Press Start 2P", monospace' : '10px "Press Start 2P", monospace';
      const tx = Math.round(ox + x);
      const ty = Math.round(oy + y - 14 - p * 22);
      g.fillStyle = C.ink;
      g.fillText(t.text, tx + 1, ty + 1);
      g.fillStyle = t.color;
      g.fillText(t.text, tx, ty);
      g.globalAlpha = 1;
    }
  }

  drawOverlays(world, view, now, q) {
    const g = this.g;
    const W = this.W;
    const H = this.H;
    // clarão vermelho ao levar dano
    const hurt = now - world.flash;
    if (hurt < 0.3) {
      g.globalAlpha = (1 - hurt / 0.3) * 0.35;
      g.fillStyle = C.red;
      g.fillRect(0, 0, W, 6);
      g.fillRect(0, H - 6, W, 6);
      g.fillRect(0, 0, 6, H);
      g.fillRect(W - 6, 0, 6, H);
      g.globalAlpha = 1;
    }
    // aviso de vida baixa do servidor
    // faixa do chefe
    const boss = view.enemies.find((e) => e.type === 'boss' && !(e.flags & 1));
    if (boss) {
      const bw = Math.min(220, W - 120);
      const bx = Math.round((W - bw) / 2);
      g.fillStyle = C.ink;
      g.fillRect(bx - 2, H - 22, bw + 4, 10);
      g.fillStyle = C.red;
      g.fillRect(bx, H - 20, Math.round((bw * boss.hp) / boss.maxHp), 6);
      g.font = '8px "Press Start 2P", monospace';
      g.textAlign = 'center';
      g.fillStyle = C.paper;
      g.fillText(ENEMIES.boss.name.toUpperCase(), W / 2, H - 26);
    }
    // faixa de aviso (onda, chefe, escopo...)
    const b = world.fx.banners[0];
    if (b) {
      const t = (now - b.t0) / b.dur;
      const slide = Math.min(1, t * 8);
      const a = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
      g.globalAlpha = a;
      g.fillStyle = 'rgba(27,31,43,0.8)';
      const h = b.sub ? 40 : 28;
      g.fillRect(0, Math.round(H * 0.28 - h / 2), W, Math.round(h * slide));
      if (slide > 0.9) {
        g.textAlign = 'center';
        g.font = '14px "Press Start 2P", monospace';
        g.fillStyle = b.color;
        g.fillText(b.text, W / 2, Math.round(H * 0.28 - (b.sub ? 4 : -5)));
        if (b.sub) {
          g.font = '12px VT323, monospace';
          g.fillStyle = C.paper;
          g.fillText(b.sub, W / 2, Math.round(H * 0.28 + 14));
        }
      }
      g.globalAlpha = 1;
    }
  }
}
