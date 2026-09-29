// Renderizador isométrico 2:1 em canvas de baixa resolução, com escala inteira de pixels
// (cada pixel lógico vira NxN pixels reais: imagem sempre nítida) e LOD por qualidade.
import { MAP, CLASSES, ENEMIES } from '/shared/game.js';
import { characterFrame, enemyFrame, tintedEnemy, pickupFrame, poseFor, classIcon } from './sprites.js';
import { ellipse, line, diamond, rect, makeCanvas } from './px.js';
import { buildProps, buildStatic, project, OFF_X, OFF_Y } from './scenery.js';

export const QUALITY = [
  { name: 'Baixa', h: 216, fps: 30, shadows: false, bursts: false, rings: true, bars: false, leds: false },
  { name: 'Média', h: 243, fps: 45, shadows: true, bursts: true, rings: true, bars: true, leds: true },
  { name: 'Alta', h: 270, fps: 60, shadows: true, bursts: true, rings: true, bars: true, leds: true },
];

const C = {
  ink: '#10131B',
  paper: '#F7F3E8',
  yellow: '#FFD25A',
  pink: '#FF7EB6',
  red: '#E5484D',
  green: '#6BE38A',
  cyan: '#4FC3F7',
  hpBack: '#10131B',
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
    const minX = -296 + W / 2;
    const maxX = 296 - W / 2;
    const minY = -66 + H / 2;
    const maxY = 304 - H / 2;
    let cx = maxX < minX ? 0 : Math.min(maxX, Math.max(minX, this.cam.x));
    let cy = maxY < minY ? 119 : Math.min(maxY, Math.max(minY, this.cam.y));
    if (now - world.shake < 0.25 && q.bars) {
      cx += Math.round((Math.random() - 0.5) * 4);
      cy += Math.round((Math.random() - 0.5) * 4);
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

    const items = [];
    const P = this.props;
    for (const d of MAP.desks) {
      items.push({ d: d.x + d.w / 2 + d.y + d.h / 2 + 0.2, f: () => this.blit(P.desk, ox, oy, d.x, d.y) });
      items.push({ d: d.x + 1.1 + d.y + 1.9, f: () => this.blit(P.chair, ox, oy, d.x + 1, d.y + 1.75) });
    }
    const S = MAP.server;
    items.push({ d: S.x + S.y + 1, f: () => this.drawServer(ox, oy, view, now, q) });
    items.push({ d: MAP.coffee.x + MAP.coffee.y + 1, f: () => this.blit(P.coffee, ox, oy, MAP.coffee.x, MAP.coffee.y) });
    items.push({ d: MAP.printer.x + MAP.printer.y + 1, f: () => this.blit(P.printer, ox, oy, MAP.printer.x, MAP.printer.y) });
    for (const pl of MAP.plants) items.push({ d: pl.x + pl.y, f: () => this.blit(P.plant, ox, oy, pl.x, pl.y) });
    for (const b of MAP.bins) items.push({ d: b.x + b.y, f: () => this.blit(P.bin, ox, oy, b.x, b.y) });
    items.push({ d: MAP.cooler.x + MAP.cooler.y, f: () => this.blit(P.cooler, ox, oy, MAP.cooler.x, MAP.cooler.y) });
    for (const k2 of view.pickups) items.push({ d: k2.x + k2.y, f: () => this.drawPickup(k2, ox, oy, now) });
    for (const e of view.enemies) items.push({ d: e.x + e.y, f: () => this.drawEnemy(e, ox, oy, now, q) });
    for (const p of view.players) items.push({ d: p.x + p.y, f: () => this.drawPlayer(p, ox, oy, now, q) });
    items.sort((a, b) => a.d - b.d);
    for (const it of items) it.f();

    this.drawFx(world, ox, oy, now, q);
    this.drawOverlays(world, view, now);
  }

  blit(prop, ox, oy, x, y) {
    const [sx, sy] = project(x, y);
    this.g.drawImage(prop.canvas, Math.round(ox + sx - prop.ax), Math.round(oy + sy - prop.ay));
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
      g.fillStyle = 'rgba(229,72,77,0.28)';
      g.fillRect(x - 17, y - 36, 34, 52);
    }
    if (inv) {
      g.fillStyle = C.cyan;
      g.fillRect(x - 19, y - 40, 38, 1);
      g.fillRect(x - 19, y + 18, 38, 1);
      g.fillRect(x - 19, y - 40, 1, 59);
      g.fillRect(x + 18, y - 40, 1, 59);
    }
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
    if (p.flags & 32) ellipse(g, x, y - 12, 12, 16, C.cyan);
    if (p.look) {
      const invBlink = p.flags & 2 && Math.floor(now * 8) % 2 === 0;
      if (!invBlink) {
        const pose = poseFor(p.flags, p.moving, now);
        const fr = characterFrame(p.look, pose);
        const S = 2;
        const dw = fr.w * S;
        const dh = fr.h * S;
        const dx = -fr.ax * S;
        const dy = -fr.ay * S + (pose === 'down' ? 8 : 0);
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
    if (frozen) fr = tintedEnemy(e.type, f, '#4FC3F7');
    else if (hit) fr = tintedEnemy(e.type, f, '#FFFFFF');
    else if (e.type === 'boss') fr = tintedEnemy(e.type, f, '#FF9E44');
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
    const fr = pickupFrame(k.kind);
    const bob = Math.round(Math.sin(now * 5 + k.id) * 2);
    const x = Math.round(ox + sx);
    const y = Math.round(oy + sy);
    const sh = shadowSprite(5, 2);
    this.g.drawImage(sh.c, x - sh.ax, y - sh.ay);
    this.g.drawImage(fr.canvas, x - fr.ax * 2, y - fr.ay * 2 - 6 + bob, fr.w * 2, fr.h * 2);
  }

  // ----- efeitos -----

  drawFx(world, ox, oy, now, q) {
    const g = this.g;
    const fx = world.fx;
    for (const s of fx.shots) {
      const t = (now - s.t0) / s.dur;
      const [x1, y1] = project(s.x1, s.y1);
      const [x2, y2] = project(s.x2, s.y2);
      if (s.aoe) {
        ellipse(g, ox + x1, oy + y1 - 4, Math.round(10 + 34 * t), Math.round(5 + 17 * t), s.color);
        ellipse(g, ox + x1, oy + y1 - 4, Math.round(8 + 30 * t), Math.round(4 + 15 * t), s.color);
      } else {
        line(g, ox + x1, oy + y1 - 16, ox + x2, oy + y2 - 8, s.color, 0, 2);
        rect(g, C.paper, Math.round(ox + x2) - 1, Math.round(oy + y2 - 8) - 1, 3, 3);
      }
    }
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

  drawOverlays(world, view, now) {
    const g = this.g;
    const W = this.W;
    const H = this.H;
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
      g.fillStyle = 'rgba(16,19,27,0.85)';
      g.fillRect(0, top, W, Math.round(h * slide));
      if (slide > 0.9) {
        this.text(b.text, Math.round(W / 2), top + (b.sub ? 20 : 20), b.color, `16px ${PX}`);
        if (b.sub) this.text(b.sub, Math.round(W / 2), top + 38, C.paper, `16px ${VT}`);
      }
    }
  }
}
