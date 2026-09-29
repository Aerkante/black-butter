// Renderizador isométrico 2:1 em canvas de baixa resolução, com escala inteira de pixels
// (cada pixel lógico vira NxN pixels reais: imagem sempre nítida) e LOD por qualidade.
import { MAP, CLASSES, ENEMIES, PICKUP_TYPES, SECTORS } from '/shared/game.js';
import { characterFrame, enemyFrame, tintedEnemy, pickupFrame, poseFor, classIcon } from './sprites.js';
import { ellipse, line, diamond, rect, makeCanvas } from './px.js';
import { buildProps, buildStatic, project, OFF_X, OFF_Y, BOUNDS, propSprite, labelSprite, wallSprite } from './scenery.js';
import { drawGround, drawAir, drawShot, drawDome, drawShield } from './skillfx.js';

export const QUALITY = [
  { name: 'Baixa', h: 216, fps: 30, shadows: false, bursts: false, rings: false, bars: false, leds: false, parts: 40 },
  { name: 'Média', h: 243, fps: 45, shadows: true, bursts: true, rings: true, bars: true, leds: true, parts: 120 },
  { name: 'Alta', h: 270, fps: 60, shadows: true, bursts: true, rings: true, bars: true, leds: true, parts: 240 },
];

const C = {
  ink: '#0b0e1a',
  paper: '#fff6e0',
  yellow: '#ffd426',
  pink: '#ff4fa3',
  red: '#ff3b4e',
  green: '#3dff8b',
  cyan: '#2bc8ff',
  hpBack: '#0b0e1a',
};

const PX = '"Press Start 2P", monospace';
const VT = 'VT323, monospace';

const sprites = new Map();
// sombra e anel de classe pré-desenhados (elipses de pixel exato)
function shadowSprite(rx, ry) {
  const key = `sh${rx}x${ry}`;
  let s = sprites.get(key);
  if (!s) {
    const [c, g] = makeCanvas(rx * 2 + 3, ry * 2 + 3);
    ellipse(g, rx + 1, ry + 1, rx, ry, null, { fill: 'rgba(0,0,0,0.38)' });
    s = { c, ax: rx + 1, ay: ry + 1 };
    sprites.set(key, s);
  }
  return s;
}
function ringSprite(color, rx = 10, ry = 5) {
  const key = `ring${color}${rx}`;
  let s = sprites.get(key);
  if (!s) {
    const [c, g] = makeCanvas(rx * 2 + 3, ry * 2 + 3);
    ellipse(g, rx + 1, ry + 1, rx, ry, color, { fill: `${color}33` });
    s = { c, ax: rx + 1, ay: ry + 1 };
    sprites.set(key, s);
  }
  return s;
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
    this.scale = 3;
    this.resize();
  }

  ready() {
    if (!this.props) {
      this.props = buildProps();
      this.staticCache = buildStatic();
      this.buildLists();
    }
  }

  // Listas de móveis e pedaços de parede com a profundidade já calculada (feito uma vez)
  buildLists() {
    this.propList = [];
    for (const p of MAP.props) {
      const spr = propSprite(p);
      if (!spr) continue;
      const box = spr.kind === 'box';
      const center = spr.kind === 'center';
      const ax = center ? p.x + p.w / 2 : p.x;
      const ay = center ? p.y + p.h / 2 : p.y;
      const depth = box ? p.x + p.w / 2 + p.y + p.h / 2 + (p.t === 'totem' ? 2.5 : 0.2) : ax + ay; // o totem fica colado na parede: desenha por cima dela
      this.propList.push({ p, spr, ax, ay, depth });
      const sec = SECTORS[p.sector];
      if (sec || p.label) {
        const lab = labelSprite(sec ? sec.short : p.label, sec ? sec.color : p.color || '#7FE3FF');
        this.propList.push({ label: lab, ax: p.x + p.w / 2, ay: p.y + p.h / 2, depth: 999, isLabel: true, lift: p.t === 'totem' ? 78 : 50 });
      }
    }
    this.wallChunks = [];
    for (const r of MAP.walls) {
      const axis = r.w > r.h ? 'x' : 'y';
      const total = axis === 'x' ? r.w : r.h;
      for (let i = 0; i < total - 0.01; i += 2) {
        const len = Math.min(2, total - i);
        const x = axis === 'x' ? r.x + i : r.x;
        const y = axis === 'x' ? r.y : r.y + i;
        const w = axis === 'x' ? len : r.w;
        const h = axis === 'x' ? r.h : len;
        this.wallChunks.push({ x, y, sprite: wallSprite(axis, len), depth: x + w / 2 + y + h / 2 });
      }
    }
  }

  setQuality(q) {
    this.quality = Math.max(0, Math.min(2, q));
    this.resize();
  }

  // Escolhe a resolução lógica de modo que cada pixel dela ocupe um número INTEIRO de pixels do aparelho.
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const vw = Math.max(1, Math.round(window.innerWidth * dpr));
    const vh = Math.max(1, Math.round(window.innerHeight * dpr));
    let S = Math.max(1, Math.round(vh / QUALITY[this.quality].h));
    let W = Math.floor(vw / S);
    while (W > 760) {
      S++;
      W = Math.floor(vw / S);
    }
    const H = Math.floor(vh / S);
    this.scale = S;
    this.W = W;
    this.H = H;
    const cv = this.canvas;
    cv.width = W;
    cv.height = H;
    const st = cv.style;
    st.inset = 'auto';
    st.width = `${(W * S) / dpr}px`;
    st.height = `${(H * S) / dpr}px`;
    st.left = `${Math.floor((vw - W * S) / 2) / dpr}px`;
    st.top = `${Math.floor((vh - H * S) / 2) / dpr}px`;
    this.g = cv.getContext('2d');
    this.g.imageSmoothingEnabled = false;
  }

  // ----- quadro -----

  draw(world, view, now, dt) {
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
    const minX = BOUNDS.minX + W / 2;
    const maxX = BOUNDS.maxX - W / 2;
    const minY = BOUNDS.minY + H / 2;
    const maxY = BOUNDS.maxY - H / 2;
    let cx = maxX < minX ? (BOUNDS.minX + BOUNDS.maxX) / 2 : Math.min(maxX, Math.max(minX, this.cam.x));
    let cy = maxY < minY ? (BOUNDS.minY + BOUNDS.maxY) / 2 : Math.min(maxY, Math.max(minY, this.cam.y));
    if (now - world.shake < world.shakeDur && q.bars) {
      const k2 = 1 - (now - world.shake) / world.shakeDur;
      cx += Math.round((Math.random() - 0.5) * world.shakeAmp * k2);
      cy += Math.round((Math.random() - 0.5) * world.shakeAmp * k2);
    }
    const ox = Math.round(W / 2) - Math.round(cx);
    const oy = Math.round(H / 2) - Math.round(cy);

    g.drawImage(this.staticCache, ox - OFF_X, oy - OFF_Y);

    // aviso de nascimento dos bugs nos portais
    for (const e of view.enemies) {
      if (!(e.flags & 1)) continue;
      const [sx, sy] = project(e.x, e.y);
      const r = 5 + Math.floor(Math.abs(Math.sin(now * 8)) * 6);
      ellipse(g, ox + sx, oy + sy, r * 2, r, C.red);
    }

    drawGround(this, world, view, ox, oy, now, q);

    const items = [];
    const vis = (sx, sy, pad) => sx > -pad && sx < W + pad && sy > -pad && sy < H + pad;
    // móveis fixos (só os que aparecem na tela entram na fila de desenho)
    // o que estiver na frente do jogador local e escondê-lo fica meio transparente
    const meP = view.players.find((p) => p.isYou);
    let mx0 = 0;
    let mx1 = 0;
    let my0 = 0;
    let my1 = 0;
    const meDepth = meP ? meP.x + meP.y : 0;
    if (meP) {
      const [mx, my] = project(meP.x, meP.y);
      mx0 = ox + mx - 14;
      mx1 = ox + mx + 14;
      my0 = oy + my - 50;
      my1 = oy + my + 4;
    }
    const hides = (spr, sx, sy, depth) => {
      if (!meP || depth <= meDepth + 0.05) return false;
      const x0 = sx - spr.ax;
      const y0 = sy - spr.ay;
      return x0 < mx1 && x0 + spr.canvas.width > mx0 && y0 < my1 && y0 + spr.canvas.height > my0;
    };
    for (const p of this.propList) {
      const [px, py] = project(p.ax, p.ay);
      if (!vis(ox + px, oy + py, 130)) continue;
      if (!p.isLabel && p.spr.canvas.height > 60 && hides(p.spr, ox + px, oy + py, p.depth)) {
        items.push({ d: p.depth, f: () => { this.g.globalAlpha = 0.4; this.blitProp(p, ox, oy); this.g.globalAlpha = 1; } });
        continue;
      }
      items.push({ d: p.depth, f: () => this.blitProp(p, ox, oy) });
    }
    for (const w of this.wallChunks) {
      const [px, py] = project(w.x, w.y);
      if (!vis(ox + px, oy + py, 90)) continue;
      const fade = hides(w.sprite, ox + px, oy + py, w.depth);
      items.push({ d: w.depth, f: () => { if (fade) this.g.globalAlpha = 0.4; this.g.drawImage(w.sprite.canvas, Math.round(ox + px - w.sprite.ax), Math.round(oy + py - w.sprite.ay)); this.g.globalAlpha = 1; } });
    }
    const S = MAP.server;
    items.push({ d: S.x + S.y + 1, f: () => this.drawServer(ox, oy, view, now, q) });
    for (const k2 of view.pickups) items.push({ d: k2.x + k2.y, f: () => this.drawPickup(k2, ox, oy, now) });
    for (const e of view.enemies) items.push({ d: e.x + e.y, f: () => this.drawEnemy(e, ox, oy, now, q) });
    for (const p of view.players) items.push({ d: p.x + p.y, f: () => this.drawPlayer(p, ox, oy, now, q) });
    items.sort((a, b) => a.d - b.d);
    for (const it of items) it.f();

    drawAir(this, world, view, ox, oy, now, q);
    this.drawFx(world, ox, oy, now, q);
    this.ox = ox;
    this.oy = oy;
    this.drawOverlays(world, view, now);
  }

  blitProp(e, ox, oy) {
    const [sx, sy] = project(e.ax, e.ay);
    if (e.isLabel) {
      this.g.drawImage(e.label.canvas, Math.round(ox + sx - e.label.ax), Math.round(oy + sy - e.lift));
      return;
    }
    this.g.drawImage(e.spr.canvas, Math.round(ox + sx - e.spr.ax), Math.round(oy + sy - e.spr.ay));
  }

  drawServer(ox, oy, view, now, q) {
    const g = this.g;
    const S = MAP.server;
    const [sx, sy] = project(S.x, S.y);
    const x = Math.round(ox + sx);
    const y = Math.round(oy + sy);
    const variant = q.leds && Math.floor(now * 2) % 2 ? this.props.serverB : this.props.serverA;
    g.drawImage(variant.canvas, x - variant.ax, y - variant.ay);
    const snap = view.snap;
    if (!snap) return;
    const [hp, max, inv] = snap.srv;
    if (max && hp / max < 0.3 && q.bars && Math.floor(now * 4) % 2) {
      g.fillStyle = 'rgba(255,59,78,0.28)';
      g.fillRect(x - 17, y - 36, 34, 52);
    }
    if (inv) drawDome(this, x, y + 8, now, q);
  }

  shadow(x, y, rx, ry, q) {
    if (!q.shadows) return;
    const s = shadowSprite(rx, ry);
    this.g.drawImage(s.c, Math.round(x - s.ax), Math.round(y - s.ay));
  }

  text(str, x, y, color, font, align = 'center') {
    const g = this.g;
    g.font = font;
    g.textAlign = align;
    g.textBaseline = 'alphabetic';
    g.fillStyle = C.ink;
    g.fillText(str, x + 1, y + 1);
    g.fillStyle = color;
    g.fillText(str, x, y);
  }

  drawPlayer(p, ox, oy, now, q) {
    const g = this.g;
    const [sx, sy] = project(p.x, p.y);
    const x = Math.round(ox + sx);
    const y = Math.round(oy + sy);
    const cls = CLASSES[p.cls] || CLASSES.dev;
    if (p.flags & 4) g.globalAlpha = 0.35; // fantasma (caiu da rede)
    const ring = ringSprite(cls.color);
    g.drawImage(ring.c, x - ring.ax, y - ring.ay);
    this.shadow(x, y + 1, 7, 3, q);
    if (p.flags & 32) drawShield(this, x, y, now);
    if (p.flags & 128) {
      // travesseirinho e coberta
      const fx = p.face < 0 ? -1 : 1;
      g.fillStyle = '#0b0e1a';
      g.fillRect(x + fx * 9 - 8, y - 9, 16, 11);
      g.fillStyle = '#fff6e0';
      g.fillRect(x + fx * 9 - 7, y - 8, 14, 9);
      g.fillStyle = '#d6c08a';
      g.fillRect(x + fx * 9 - 7, y - 1, 14, 2);
    }
    if (p.look) {
      const invBlink = p.flags & 2 && Math.floor(now * 8) % 2 === 0;
      if (!invBlink) {
        const pose = poseFor(p.flags, p.moving, now);
        const fr = characterFrame(p.look, pose);
        const S = 2;
        const dw = fr.w * S;
        const dh = fr.h * S;
        const dx = -fr.ax * S;
        const dy = -fr.ay * S + (pose === 'down' || pose === 'sleep' ? 8 : 0);
        if (p.flags & 64 && p.moving && q.bursts) {
          // velocidade: cópias esmaecidas ficam para trás
          for (let i = 3; i >= 1; i--) {
            g.globalAlpha = 0.14 * (4 - i);
            g.drawImage(fr.canvas, x + dx - p.face * i * 9, y + dy, dw, dh);
          }
          g.globalAlpha = p.flags & 4 ? 0.35 : 1;
        }
        if (p.face < 0) {
          g.save();
          g.translate(x, 0);
          g.scale(-1, 1);
          g.drawImage(fr.canvas, dx, y + dy, dw, dh);
          g.restore();
        } else {
          g.drawImage(fr.canvas, x + dx, y + dy, dw, dh);
        }
      }
    }
    if (p.flags & 128) {
      // easter egg: dormindo (travesseiro e Zzz subindo)
      for (let i = 0; i < 3; i++) {
        const ph = (now * 0.7 + i / 3) % 1;
        g.globalAlpha = 1 - ph;
        this.text('Z', x + 8 + ph * 10 + i * 3, y - 14 - ph * 26, C.paper, `${8 + i * 2}px ${PX}`);
      }
      g.globalAlpha = 1;
    }
    const top = y - 50;
    if (!(p.flags & 1)) {
      const ratio = p.maxHp ? Math.max(0, p.hp / p.maxHp) : 0;
      g.fillStyle = C.hpBack;
      g.fillRect(x - 11, top + 10, 22, 4);
      g.fillStyle = ratio > 0.5 ? C.green : ratio > 0.25 ? C.yellow : C.red;
      g.fillRect(x - 10, top + 11, Math.round(20 * ratio), 2);
    }
    this.text(p.nick, x, top + 8, p.isYou ? C.yellow : C.paper, `8px ${PX}`);
    if (p.isYou && !(p.flags & 1)) {
      const b = Math.floor(now * 3) % 2;
      g.fillStyle = C.pink;
      g.fillRect(x - 3, top - 4 + b, 7, 1);
      g.fillRect(x - 2, top - 3 + b, 5, 1);
      g.fillRect(x - 1, top - 2 + b, 3, 1);
      g.fillRect(x, top - 1 + b, 1, 1);
    }
    if (p.flags & 1) {
      g.fillStyle = C.hpBack;
      g.fillRect(x - 13, top + 16, 26, 5);
      g.fillStyle = C.green;
      g.fillRect(x - 12, top + 17, Math.round(24 * Math.min(1, p.rev / 250)), 3);
      const ic = classIcon(p.cls);
      g.drawImage(ic.canvas, x - 3, top + 24);
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
    if (frozen) fr = tintedEnemy(e.type, f, '#2bc8ff');
    else if (hit) fr = tintedEnemy(e.type, f, '#FFFFFF');
    else if (e.type === 'boss') fr = tintedEnemy(e.type, f, '#ff8a1f');
    const S = e.type === 'boss' ? 4 : e.type === 'minimail' ? 1 : e.type === 'leak' && e.grown >= 2 ? 3 : 2;
    if (spawning) g.globalAlpha = 0.35;
    this.shadow(x, y + 1, 6 * S, 2 * S, q);
    const bob = f && e.type === 'bug' ? -1 : 0;
    g.drawImage(fr.canvas, x - fr.ax * S, y - fr.ay * S + bob, fr.w * S, fr.h * S);
    const headY = y - fr.ay * S;
    if (e.type === 'boss' && !spawning) {
      g.fillStyle = C.yellow;
      g.fillRect(x - 12, headY, 24, 4);
      g.fillRect(x - 12, headY - 4, 4, 4);
      g.fillRect(x - 2, headY - 4, 4, 4);
      g.fillRect(x + 8, headY - 4, 4, 4);
    }
    g.globalAlpha = 1;
    if (spawning) return;
    const topY = headY - (e.type === 'boss' ? 10 : 2);
    if (e.flags & 2) {
      g.fillStyle = C.yellow;
      g.fillRect(x - 1, topY - 7, 3, 4);
      g.fillRect(x - 1, topY - 2, 3, 2);
    }
    if (e.flags & 4) {
      const w = 9 * S;
      diamond(g, x, y - 4 * S + 2, w, 4 * S + 4, C.pink, 3);
      g.fillStyle = C.pink;
      g.fillRect(x - 4, topY - 14, 9, 6);
    }
    if (e.flags & 32) {
      g.fillStyle = C.red;
      g.fillRect(x - 2, topY - 13, 4, 8);
    }
    if (q.bars && e.type !== 'boss' && e.hp < e.maxHp) {
      g.fillStyle = C.hpBack;
      g.fillRect(x - 9, topY - 3, 18, 4);
      g.fillStyle = C.red;
      g.fillRect(x - 8, topY - 2, Math.max(1, Math.round((16 * e.hp) / e.maxHp)), 2);
    }
  }

  drawPickup(k, ox, oy, now) {
    const [sx, sy] = project(k.x, k.y);
    const g = this.g;
    if (k.left <= 3 && Math.floor(now * 8) % 2) return; // pisca quando está acabando
    const fr = pickupFrame(k.kind);
    const color = PICKUP_TYPES[k.kind]?.color || C.yellow;
    const bob = Math.round(Math.sin(now * 5 + k.id) * 2);
    const x = Math.round(ox + sx);
    const y = Math.round(oy + sy);
    const pulse = Math.floor(now * 3 + k.id) % 2;
    const ring = ringSprite(color, 9 + pulse, 4 + pulse);
    g.drawImage(ring.c, x - ring.ax, y - ring.ay);
    g.drawImage(fr.canvas, x - fr.ax * 2, y - fr.ay * 2 - 8 + bob, fr.w * 2, fr.h * 2);
  }

  // ----- efeitos -----

  drawFx(world, ox, oy, now, q) {
    const g = this.g;
    const fx = world.fx;
    for (const s of fx.shots) drawShot(this, s, (now - s.t0) / s.dur, ox, oy, now, q);
    if (q.rings) {
      for (const r of fx.rings) {
        const t = (now - r.t0) / r.dur;
        const [x, y] = project(r.x, r.y);
        const rad = (r.big ? 7 : 4) * 16 * t;
        ellipse(g, ox + x, oy + y, rad * 1.4, rad * 0.7, r.color);
        if (t < 0.6) ellipse(g, ox + x, oy + y, rad * 1.4 - 2, rad * 0.7 - 1, r.color);
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
          g.fillRect(bx - 2, by - 2, 5, 5);
          g.fillStyle = C.paper;
          g.fillRect(bx - 1, by - 1, 3, 3);
        } else if (fr === 1) {
          for (const [dx, dy] of [[-7, -7], [5, -7], [-7, 5], [5, 5]]) g.fillRect(bx + dx, by + dy, 3, 3);
          g.fillStyle = C.paper;
          g.fillRect(bx - 1, by - 9, 3, 3);
          g.fillRect(bx - 1, by + 7, 3, 3);
          g.fillRect(bx - 9, by - 1, 3, 3);
          g.fillRect(bx + 7, by - 1, 3, 3);
        } else {
          g.fillStyle = C.paper;
          for (const [dx, dy] of [[-10, -10], [10, -10], [-10, 10], [10, 10], [0, -12], [0, 12], [-12, 0], [12, 0]]) g.fillRect(bx + dx, by + dy, 2, 2);
        }
      }
    }
    for (const t of fx.texts) {
      const p = (now - t.t0) / t.dur;
      const [x, y] = project(t.x, t.y);
      if (p > 0.75 && Math.floor(now * 20) % 2) continue; // pisca ao sumir (sem transparência)
      this.text(t.text, Math.round(ox + x), Math.round(oy + y - 16 - p * 22), t.color, `8px ${PX}`);
    }
  }

  // Minimapa (planta do escritório) e seta apontando para o servidor quando ele sai da tela
  drawMinimap(view, now) {
    const g = this.g;
    const s = 2;
    const mw = MAP.w * s;
    const mh = MAP.h * s;
    const x0 = 6;
    const y0 = this.H - mh - 6;
    g.fillStyle = 'rgba(11,14,26,0.72)';
    g.fillRect(x0 - 2, y0 - 2, mw + 4, mh + 4);
    for (const r of MAP.rooms) {
      g.fillStyle = `${r.plate}66`;
      g.fillRect(x0 + r.x * s, y0 + r.y * s, r.w * s, r.h * s);
    }
    g.fillStyle = '#fff6e0';
    for (const w of MAP.walls) g.fillRect(x0 + Math.round(w.x * s), y0 + Math.round(w.y * s), Math.max(1, Math.round(w.w * s)), Math.max(1, Math.round(w.h * s)));
    for (const p of MAP.props) {
      if (!p.solid || (p.t !== 'desk' && p.t !== 'baia' && p.t !== 'table6' && p.t !== 'bigdesk')) continue;
      g.fillStyle = SECTORS[p.sector]?.color || '#8fa3ff';
      for (const r of p.rects || [p]) g.fillRect(x0 + Math.round(r.x * s), y0 + Math.round(r.y * s), Math.max(1, Math.round(r.w * s)), Math.max(1, Math.round(r.h * s)));
    }
    g.fillStyle = '#ff3b4e';
    for (const p of MAP.portals) g.fillRect(x0 + Math.round(p.x * s), y0 + Math.round(p.y * s), 1, 1);
    const S = MAP.server;
    g.fillStyle = '#2bc8ff';
    g.fillRect(x0 + Math.round(S.x * s) - 1, y0 + Math.round(S.y * s) - 1, s + 2, s + 2);
    g.fillStyle = '#ffd426';
    for (const k of view.pickups) g.fillRect(x0 + Math.round(k.x * s), y0 + Math.round(k.y * s), 1, 1);
    g.fillStyle = '#ff5a6a';
    for (const e of view.enemies) {
      const big = e.type === 'boss' ? 3 : 1;
      g.fillRect(x0 + Math.round(e.x * s) - (big > 1 ? 1 : 0), y0 + Math.round(e.y * s) - (big > 1 ? 1 : 0), big, big);
    }
    for (const p of view.players) {
      if (p.isYou) {
        if (Math.floor(now * 3) % 2) continue;
        g.fillStyle = '#ffffff';
        g.fillRect(x0 + Math.round(p.x * s) - 1, y0 + Math.round(p.y * s) - 1, 3, 3);
      } else {
        g.fillStyle = (CLASSES[p.cls] || CLASSES.dev).color;
        g.fillRect(x0 + Math.round(p.x * s) - 1, y0 + Math.round(p.y * s) - 1, 2, 2);
      }
    }
    g.fillStyle = '#3d50cf';
    g.fillRect(x0 - 2, y0 - 2, mw + 4, 1);
    g.fillRect(x0 - 2, y0 + mh + 1, mw + 4, 1);
    g.fillRect(x0 - 2, y0 - 2, 1, mh + 4);
    g.fillRect(x0 + mw + 1, y0 - 2, 1, mh + 4);
  }

  drawServerPointer(now) {
    const g = this.g;
    const S = MAP.server;
    const [px, py] = project(S.x + S.w / 2, S.y + S.h / 2);
    const sx = this.ox + px;
    const sy = this.oy + py - 20;
    const m = 14;
    if (sx > m && sx < this.W - m && sy > 26 && sy < this.H - m) return;
    const cx = this.W / 2;
    const cy = this.H / 2;
    const dx = sx - cx;
    const dy = sy - cy;
    const k = Math.min((this.W / 2 - m) / Math.abs(dx || 1e-6), (this.H / 2 - m - 10) / Math.abs(dy || 1e-6));
    const ex = Math.round(cx + dx * k);
    const ey = Math.round(cy + dy * k);
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const pulse = Math.floor(now * 4) % 2;
    g.fillStyle = C.ink;
    g.fillRect(ex - 6, ey - 6, 13, 13);
    g.fillStyle = pulse ? C.cyan : '#7fe3ff';
    g.fillRect(ex - 4, ey - 4, 9, 9);
    // ponta da seta em pixels, apontando para o servidor
    for (let i = 0; i < 4; i++) {
      g.fillStyle = pulse ? C.cyan : '#7fe3ff';
      g.fillRect(Math.round(ex + ux * (8 + i * 2)) - 1, Math.round(ey + uy * (8 + i * 2)) - 1, 3 - Math.floor(i / 2), 3 - Math.floor(i / 2));
    }
    g.font = `8px ${PX}`;
    g.textAlign = 'center';
    g.fillStyle = C.ink;
    g.fillText('SERV', ex + 1, ey + 19);
    g.fillStyle = C.cyan;
    g.fillText('SERV', ex, ey + 18);
  }

  drawOverlays(world, view, now) {
    const g = this.g;
    this.drawServerPointer(now);
    this.drawMinimap(view, now);
    const W = this.W;
    const H = this.H;
    const fl = world.flashes[0];
    if (fl && this.quality > 0) {
      const t = (now - fl.t0) / fl.dur;
      if (t >= 0 && t < 1) {
        g.globalAlpha = fl.a * (1 - t);
        g.fillStyle = fl.color;
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }
    }
    const hurt = now - world.flash;
    if (hurt < 0.3) {
      g.fillStyle = C.red;
      const a = Math.ceil((1 - hurt / 0.3) * 4);
      g.fillRect(0, 0, W, a);
      g.fillRect(0, H - a, W, a);
      g.fillRect(0, 0, a, H);
      g.fillRect(W - a, 0, a, H);
    }
    const boss = view.enemies.find((e) => e.type === 'boss' && !(e.flags & 1));
    if (boss) {
      const bw = Math.min(220, W - 120);
      const bx = Math.round((W - bw) / 2);
      g.fillStyle = C.ink;
      g.fillRect(bx - 2, H - 24, bw + 4, 10);
      g.fillStyle = C.red;
      g.fillRect(bx, H - 22, Math.round((bw * boss.hp) / boss.maxHp), 6);
      this.text(ENEMIES.boss.name.toUpperCase(), Math.round(W / 2), H - 28, C.paper, `8px ${PX}`);
    }
    const b = world.fx.banners[0];
    if (b) {
      const t = (now - b.t0) / b.dur;
      const slide = Math.min(1, t * 8);
      if (t > 0.85 && Math.floor(now * 12) % 2) return;
      const h = b.sub ? 44 : 30;
      const top = Math.round(H * 0.3 - h / 2);
      g.fillStyle = 'rgba(11,14,26,0.85)';
      g.fillRect(0, top, W, Math.round(h * slide));
      if (slide > 0.9) {
        this.text(b.text, Math.round(W / 2), top + (b.sub ? 20 : 20), b.color, `16px ${PX}`);
        if (b.sub) this.text(b.sub, Math.round(W / 2), top + 38, C.paper, `16px ${VT}`);
      }
    }
  }
}
