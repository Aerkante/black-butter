// Estado do jogo no cliente: snapshots com interpolação, predição do próprio jogador
// e efeitos visuais gerados a partir dos eventos do servidor.
import { CLASSES, ENEMY_IDS, MAP, PLAYER_RADIUS, moveEntity } from '/shared/game.js';
import { sfx } from './sfx.js';

export const INTERP_S = 0.12;

const lerp = (a, b, t) => a + (b - a) * t;

export class World {
  constructor() {
    this.hooks = {};
    this.reset();
  }

  reset() {
    this.roster = new Map();
    this.snaps = [];
    this.last = null;
    this.youId = 0;
    this.youCls = 'dev';
    this.pred = { x: MAP.safeCenter.x, y: MAP.safeCenter.y, init: false };
    this.fx = { shots: [], texts: [], bursts: [], rings: [], banners: [] };
    this.shake = 0;
    this.flash = 0;
    this.limits = { fx: 40 };
  }

  setRoster(list) {
    this.roster = new Map(list.map((p) => [p.id, p]));
  }

  youFrom(s) {
    return s ? s.p.find((p) => p[0] === this.youId) : null;
  }

  pushSnap(s, now) {
    s.at = now;
    this.snaps.push(s);
    if (this.snaps.length > 8) this.snaps.shift();
    this.last = s;
    const me = this.youFrom(s);
    if (me) {
      const flags = me[5];
      if (!this.pred.init || flags & 1 || flags & 4) {
        this.pred.x = me[1];
        this.pred.y = me[2];
        this.pred.init = true;
      } else if (Math.hypot(me[1] - this.pred.x, me[2] - this.pred.y) > 2.5) {
        this.pred.x = me[1];
        this.pred.y = me[2];
      }
    }
    this.applyEvents(s, now);
  }

  // Predição: move o próprio jogador na hora usando as mesmas regras do servidor.
  predict(dt, input) {
    const me = this.youFrom(this.last);
    if (!me || !this.pred.init) return;
    const flags = me[5];
    if (flags & 1) {
      this.pred.x = me[1];
      this.pred.y = me[2];
      return;
    }
    let speed = CLASSES[this.youCls].speed;
    if (flags & 64) speed *= 1.6;
    if (input.dx || input.dy) {
      [this.pred.x, this.pred.y] = moveEntity(this.pred.x, this.pred.y, input.dx, input.dy, speed, dt, PLAYER_RADIUS);
    }
    const ex = me[1] - this.pred.x;
    const ey = me[2] - this.pred.y;
    const k = Math.min(1, dt * ((input.dx || input.dy) ? 1.2 : 6));
    this.pred.x += ex * k;
    this.pred.y += ey * k;
  }

  // Posições interpoladas (renderiza ~120 ms no passado para suavizar).
  view(now) {
    const snaps = this.snaps;
    if (!snaps.length) return null;
    const rt = now - INTERP_S;
    let a = snaps[0];
    let b = snaps[snaps.length - 1];
    for (let i = snaps.length - 1; i > 0; i--) {
      if (snaps[i - 1].at <= rt) {
        a = snaps[i - 1];
        b = snaps[i];
        break;
      }
    }
    const span = b.at - a.at;
    const t = span > 0 ? Math.min(1, Math.max(0, (rt - a.at) / span)) : 1;
    const pa = new Map(a.p.map((p) => [p[0], p]));
    const ea = new Map(a.e.map((e) => [e[0], e]));
    const players = b.p.map((p) => {
      const q = pa.get(p[0]);
      const info = this.roster.get(p[0]);
      const isYou = p[0] === this.youId;
      let x = q ? lerp(q[1], p[1], t) : p[1];
      let y = q ? lerp(q[2], p[2], t) : p[2];
      if (isYou && this.pred.init) {
        x = this.pred.x;
        y = this.pred.y;
      }
      return {
        id: p[0], x, y, hp: p[3], maxHp: p[4], flags: p[5], face: p[6], moving: !!p[7], score: p[8], rev: p[9],
        nick: info?.nick || '?', cls: info?.cls || 'dev', look: info?.look, isYou,
      };
    });
    const enemies = b.e.map((e) => {
      const q = ea.get(e[0]);
      return {
        id: e[0], type: ENEMY_IDS[e[1]], x: q ? lerp(q[2], e[2], t) : e[2], y: q ? lerp(q[3], e[3], t) : e[3],
        hp: e[4], maxHp: e[5], flags: e[6], grown: e[7],
      };
    });
    const pickups = b.k.map((k) => ({ id: k[0], kind: k[1], x: k[2], y: k[3] }));
    return { players, enemies, pickups, snap: b };
  }

  // ----- efeitos a partir dos eventos -----

  playerPos(id) {
    const p = this.last?.p.find((q) => q[0] === id);
    if (!p) return null;
    if (id === this.youId && this.pred.init) return { x: this.pred.x, y: this.pred.y };
    return { x: p[1], y: p[2] };
  }

  push(list, item, cap = this.limits.fx) {
    list.push(item);
    if (list.length > cap) list.shift();
  }

  banner(text, sub, color, now, dur = 2) {
    this.fx.banners = [{ text, sub, color, t0: now, dur }];
  }

  applyEvents(s, now) {
    for (const ev of s.ev) {
      switch (ev[0]) {
        case 'sh': {
          const from = this.playerPos(ev[1]);
          const cls = this.roster.get(ev[1])?.cls || 'dev';
          if (from) {
            this.push(this.fx.shots, {
              x1: from.x, y1: from.y, x2: ev[2], y2: ev[3], color: CLASSES[cls].color, aoe: ev[4], t0: now, dur: ev[4] ? 0.18 : 0.12,
            });
          }
          if (ev[1] === this.youId) sfx.shot();
          break;
        }
        case 'kill': {
          const mine = ev[5] === this.youId;
          this.push(this.fx.texts, { x: ev[2], y: ev[3], text: `+${ev[4]}`, color: mine ? '#FFD25A' : '#E8E1CF', t0: now, dur: 0.9, small: !mine });
          this.push(this.fx.bursts, { x: ev[2], y: ev[3], t0: now, dur: 0.3 });
          if (mine || ev[5] === 0) sfx.kill();
          break;
        }
        case 'hurt':
          if (ev[1] === this.youId) {
            this.flash = now;
            sfx.hurt();
            navigator.vibrate?.(30);
          }
          break;
        case 'srv':
          this.shake = now;
          sfx.server();
          break;
        case 'down':
          sfx.down();
          if (ev[1] === this.youId) navigator.vibrate?.([80, 40, 120]);
          if (ev[1] === this.youId) this.banner('VOCÊ CAIU', 'Aguarde um DevOps ou PO te reviver', '#E5484D', now, 2.5);
          break;
        case 'rev':
          sfx.revive();
          break;
        case 'wave':
          this.banner(`ONDA ${ev[1]}`, ev[2] ? 'CHEFE: SEGFAULT!' : '', ev[2] ? '#E5484D' : '#FFD25A', now, 2.2);
          ev[2] ? sfx.boss() : sfx.wave();
          break;
        case 'clear':
          this.banner(`ONDA ${ev[1]} LIMPA`, `+${ev[2]} de bônus${ev[3] ? ' · ONDA PERFEITA!' : ''}`, '#6BE38A', now, 2.4);
          sfx.clear();
          break;
        case 'skill': {
          const cls = this.roster.get(ev[1])?.cls || 'dev';
          this.push(this.fx.rings, { x: ev[3], y: ev[4], color: CLASSES[cls].color, t0: now, dur: 0.5, big: ev[2] === 3 });
          sfx.skill();
          break;
        }
        case 'scope':
          this.banner('MUDANÇA DE ESCOPO', ['Time causa +50% de dano', 'Bugs congelados por 2 s', 'Bugs mais rápidos!'][ev[1]], ev[1] === 2 ? '#E5484D' : '#FF7EB6', now, 2);
          break;
        case 'review':
          this.banner('SPRINT REVIEW', `+${ev[1]} pontos para todos`, '#FF7EB6', now, 2);
          break;
        case 'pick':
          if (ev[1] === this.youId) sfx.pick();
          break;
        case 'over':
          sfx.over();
          break;
        default:
      }
    }
  }

  prune(now) {
    const f = this.fx;
    f.shots = f.shots.filter((x) => now - x.t0 < x.dur);
    f.texts = f.texts.filter((x) => now - x.t0 < x.dur);
    f.bursts = f.bursts.filter((x) => now - x.t0 < x.dur);
    f.rings = f.rings.filter((x) => now - x.t0 < x.dur);
    f.banners = f.banners.filter((x) => now - x.t0 < x.dur);
  }
}
