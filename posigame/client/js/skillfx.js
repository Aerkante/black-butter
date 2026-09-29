// Efeitos visuais das habilidades, ataques básicos e power-ups.
// Cada classe e cada poder tem um visual próprio, em pixel art (sem transparência borrada).
import { CLASSES, ENEMY_IDS, PICKUP_TYPES, MAP } from '/shared/game.js';
import { ellipse, stripes, line, rect } from './px.js';
import { project } from './scenery.js';

// ----- glifos em bitmap (# = pixel aceso) -----
export const GLYPHS = {
  plus: ['..#..', '..#..', '#####', '..#..', '..#..'],
  check: ['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....'],
  excl: ['.#.', '.#.', '.#.', '.#.', '...', '.#.'],
  star: ['...#...', '..###..', '#######', '.#####.', '.##.##.', '.#...#.', '#.....#'],
  clock: ['..###..', '.#...#.', '#..#..#', '#..##.#', '#.....#', '.#...#.', '..###..'],
  quest: ['.###.', '#...#', '....#', '..##.', '.#...', '.....', '.#...'],
  dice: ['#######', '#.....#', '#.#.#.#', '#..#..#', '#.#.#.#', '#.....#', '#######'],
  cal: ['#######', '#######', '#.....#', '#.#.#.#', '#.....#', '#.#.#.#', '#######'],
  flake: ['#.#.#', '.###.', '#####', '.###.', '#.#.#'],
  bug: ['#.....#', '.#...#.', '..###..', '.#####.', '#.###.#', '..###..', '.#...#.'],
  bolt: ['...##', '..##.', '.###.', '..##.', '.##..', '##...'],
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
};

export function glyph(g, name, x, y, color, s = 1) {
  const rows = GLYPHS[name];
  g.fillStyle = color;
  for (let j = 0; j < rows.length; j++) {
    for (let i = 0; i < rows[j].length; i++) {
      if (rows[j][i] === '#') g.fillRect(Math.round(x) + i * s, Math.round(y) + j * s, s, s);
    }
  }
}
const glyphW = (name, s = 1) => GLYPHS[name][0].length * s;
const glyphH = (name, s = 1) => GLYPHS[name].length * s;

const SRV = { x: MAP.server.x + MAP.server.w / 2, y: MAP.server.y + MAP.server.h / 2 }; // centro do servidor

const K = {
  paper: '#FFF6E0',
  ink: '#0B0E1A',
  cyan: '#2BC8FF',
  yellow: '#FFD426',
  green: '#3DFF8B',
  red: '#FF3B4E',
  orange: '#FF8A1F',
  pink: '#FF4FA3',
  violet: '#8B5CFF',
  ice: '#7FE3FF',
  dust: '#C9B48A',
};

// ----- criação de efeitos -----

function ring(world, x, y, color, maxR, dur, now, opts = {}) {
  world.push(world.effects, { kind: 'ring', x, y, color, maxR, dur, t0: now + (opts.delay || 0), fill: opts.fill || null, double: !!opts.double }, 40);
}

function burst(world, x, y, color, n, speed, now, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = (opts.arc ? opts.arc[0] + Math.random() * (opts.arc[1] - opts.arc[0]) : Math.random() * Math.PI * 2);
    const sp = speed * (0.4 + Math.random() * 0.6);
    world.parts.push({
      x, y, z: opts.z ?? 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: opts.vz ?? 30 + Math.random() * 40,
      g: opts.g ?? -120, life: (opts.life ?? 0.6) * (0.7 + Math.random() * 0.5), t0: now, color: Array.isArray(color) ? color[i % color.length] : color,
      size: opts.size ?? 2, glyph: opts.glyph || null, gs: opts.gs || 1,
    });
  }
}

function pop(world, x, y, name, color, now, opts = {}) {
  world.parts.push({
    x, y, z: opts.z ?? 22, vx: opts.vx ?? 0, vy: opts.vy ?? 0, vz: opts.vz ?? 26, g: 0, life: opts.life ?? 0.9, t0: now + (opts.delay || 0),
    color, size: 0, glyph: name, gs: opts.gs || 1, still: !!opts.still,
  });
}

function flash(world, color, now, dur = 0.15, a = 0.35) {
  world.flashes = [{ color, t0: now, dur, a }];
}

function quake(world, now, amp = 5, dur = 0.3) {
  world.shake = now;
  world.shakeAmp = amp;
  world.shakeDur = dur;
}

function label(world, x, y, text, color, now) {
  world.push(world.fx.texts, { x, y, text, color, t0: now, dur: 1.1, small: true });
}

function enemiesNear(world, x, y, r) {
  const list = world.last?.e || [];
  return list.filter((e) => !(e[6] & 1) && Math.hypot(e[2] - x, e[3] - y) <= r).map((e) => ({ id: e[0], type: ENEMY_IDS[e[1]], x: e[2], y: e[3] }));
}

function playersNear(world, x, y, r) {
  return (world.last?.p || []).filter((p) => Math.hypot(p[1] - x, p[2] - y) <= r).map((p) => ({ id: p[0], x: p[1], y: p[2] }));
}

// Evento de habilidade: ['skill', pid, n, x, y, info]
export function spawnSkill(world, ev, now) {
  const [, pid, n, x, y, info] = ev;
  const cls = world.roster.get(pid)?.cls || 'dev';
  const c = CLASSES[cls];
  label(world, x, y - 1.2, c.skills[n - 1].name.toUpperCase(), c.color, now);
  const key = `${cls}${n}`;
  switch (key) {
    case 'dev1':
      ring(world, x, y, K.cyan, 1.2, 0.25, now);
      burst(world, x, y, [K.cyan, K.paper], 10, 3.5, now, { size: 2, life: 0.35 });
      break;
    case 'dev2': {
      world.push(world.effects, { kind: 'dash', pid, x, y, t0: now, dur: 1.5 }, 40);
      burst(world, x, y, [K.paper, K.cyan], 8, 2.5, now, { z: 3, vz: 12, life: 0.4 });
      break;
    }
    case 'dev3':
      ring(world, x, y, K.cyan, 4.4, 0.55, now, { double: true, fill: 'rgba(43,200,255,0.25)' });
      ring(world, x, y, K.paper, 3, 0.4, now, { delay: 0.05 });
      burst(world, x, y, [K.cyan, K.paper, K.yellow], 28, 7, now, { size: 3, life: 0.6, vz: 55 });
      for (const e of enemiesNear(world, x, y, 4.4)) burst(world, e.x, e.y, [K.yellow, K.orange, K.paper], 8, 3, now, { size: 2, life: 0.5, vz: 45 });
      flash(world, K.cyan, now, 0.16, 0.4);
      quake(world, now, 6, 0.35);
      break;
    case 'qa1': {
      ring(world, x, y, K.yellow, 7, 0.7, now, { double: true });
      for (const e of enemiesNear(world, x, y, 7)) pop(world, e.x, e.y, 'excl', K.yellow, now, { z: 26, gs: 2, life: 1.1, delay: 0.1 });
      burst(world, x, y, [K.yellow, K.paper], 14, 5, now, { size: 2, life: 0.5, z: 4, vz: 10 });
      break;
    }
    case 'qa2': {
      world.push(world.effects, { kind: 'field', x, y, t0: now, dur: 4, color: K.violet, r: 5 }, 40);
      ring(world, x, y, K.violet, 5, 0.5, now, { double: true });
      for (const e of enemiesNear(world, x, y, 5)) pop(world, e.x, e.y, 'clock', K.ice, now, { z: 24, gs: 2, life: 1.4, vz: 14 });
      break;
    }
    case 'qa3':
      world.push(world.effects, { kind: 'sweep', color: K.yellow, t0: now, dur: 0.8 }, 40);
      for (const e of enemiesNear(world, x, y, 99)) pop(world, e.x, e.y, 'bug', K.yellow, now, { z: 26, gs: 2, life: 1.2, delay: 0.3 });
      flash(world, K.yellow, now, 0.2, 0.3);
      quake(world, now, 3, 0.25);
      break;
    case 'ops1':
      ring(world, x, y, K.green, 4.5, 0.6, now, { double: true, fill: 'rgba(61,255,139,0.2)' });
      for (const p of playersNear(world, x, y, 4.5)) {
        for (let i = 0; i < 3; i++) pop(world, p.x + (i - 1) * 0.35, p.y, 'plus', K.green, now, { z: 14 + i * 5, vz: 30, life: 0.9, delay: i * 0.12, gs: 2 });
      }
      burst(world, x, y, [K.green, K.paper], 10, 3, now, { life: 0.5 });
      break;
    case 'ops2':
      ring(world, SRV.x, SRV.y, K.cyan, 3, 0.7, now, { double: true, fill: 'rgba(43,200,255,0.22)' });
      pop(world, SRV.x, SRV.y, 'star', K.cyan, now, { z: 44, gs: 2, life: 1.2, still: true });
      burst(world, SRV.x, SRV.y, [K.cyan, K.paper], 16, 4, now, { life: 0.6, vz: 60 });
      flash(world, K.cyan, now, 0.12, 0.25);
      break;
    case 'ops3': {
      ring(world, x, y, K.green, 9, 0.9, now, { double: true, fill: 'rgba(61,255,139,0.18)' });
      ring(world, x, y, K.paper, 6, 0.7, now, { delay: 0.12 });
      for (const p of playersNear(world, SRV.x, SRV.y, 99)) {
        for (let i = 0; i < 4; i++) pop(world, p.x + (i - 1.5) * 0.3, p.y, 'plus', i % 2 ? K.green : K.paper, now, { z: 50 - i * 4, vz: -20, life: 1.1, delay: i * 0.1, gs: 2 });
        pop(world, p.x, p.y, 'clock', K.green, now, { z: 34, vz: 8, life: 1.2, gs: 2 });
      }
      flash(world, K.green, now, 0.22, 0.32);
      quake(world, now, 3, 0.25);
      break;
    }
    case 'tank1':
      ring(world, x, y, K.orange, 6, 0.55, now, { double: true });
      ring(world, x, y, K.orange, 6, 0.55, now, { delay: 0.15 });
      ring(world, x, y, K.yellow, 6, 0.55, now, { delay: 0.3 });
      pop(world, x, y, 'excl', K.orange, now, { z: 44, gs: 3, life: 1, still: true });
      for (const e of enemiesNear(world, x, y, 6)) pop(world, e.x, e.y, 'excl', K.red, now, { z: 24, gs: 2, life: 0.9, delay: 0.2 });
      break;
    case 'tank2':
      ring(world, x, y, K.cyan, 1.6, 0.45, now, { double: true });
      burst(world, x, y, [K.cyan, K.paper], 12, 3, now, { life: 0.5, z: 10 });
      break;
    case 'tank3':
      world.push(world.effects, { kind: 'cracks', x, y, t0: now, dur: 1.1, seed: Math.random() * 100 }, 40);
      ring(world, x, y, K.orange, 5, 0.5, now, { double: true, fill: 'rgba(255,138,31,0.28)' });
      ring(world, x, y, K.dust, 4, 0.6, now, { delay: 0.1 });
      burst(world, x, y, [K.dust, '#A88F62', K.paper], 26, 5, now, { size: 3, life: 0.9, vz: 40, g: -70 });
      for (const e of enemiesNear(world, x, y, 5)) burst(world, e.x, e.y, [K.dust, K.orange], 8, 3, now, { life: 0.6 });
      flash(world, K.orange, now, 0.14, 0.3);
      quake(world, now, 7, 0.45);
      break;
    case 'po1':
      world.push(world.effects, { kind: 'lock', target: info, x, y, t0: now, dur: 0.9 }, 40);
      pop(world, x, y, 'quest', K.pink, now, { z: 44, gs: 2, life: 0.8, still: true });
      break;
    case 'po2':
      ring(world, x, y, K.pink, 3, 0.5, now, { double: true });
      pop(world, x, y, 'dice', K.paper, now, { z: 40, vz: 40, life: 1.0, gs: 2 });
      break;
    case 'po3':
      world.push(world.effects, { kind: 'rays', x, y, t0: now, dur: 0.9 }, 40);
      world.push(world.effects, { kind: 'snow', t0: now, dur: 4 }, 40);
      ring(world, x, y, K.pink, 8, 0.8, now, { double: true, fill: 'rgba(255,79,163,0.18)' });
      ring(world, x, y, K.paper, 5, 0.6, now, { delay: 0.1 });
      pop(world, x, y, 'cal', K.paper, now, { z: 40, gs: 3, life: 1.3, vz: 16 });
      burst(world, x, y, [K.pink, K.paper, K.yellow], 24, 6, now, { size: 3, life: 0.7, vz: 50 });
      flash(world, K.paper, now, 0.2, 0.4);
      break;
    default:
  }
}

// Resultado da Mudança de escopo: ['scope', 0 bom | 1 congela | 2 ruim]
export function spawnScope(world, ev, now) {
  const pid = world.youId;
  const pos = world.playerPos(pid) || { x: 9, y: 9 };
  const colors = [[K.yellow, K.green, K.cyan, K.pink], [K.ice, K.paper, K.cyan], [K.red, K.orange, K.violet], [K.orange, K.red, K.yellow, K.paper]][ev[1]] || [K.pink];
  burst(world, pos.x, pos.y, colors, 40, 6, now, { size: 3, life: 1.0, vz: 60, g: -90 });
  const name = ['star', 'flake', 'bug', 'bolt'][ev[1]] || 'star';
  if (ev[1] === 3) {
    // meteoros caem sobre bugs sorteados
    const list = (world.last?.e || []).filter((e) => !(e[6] & 1)).sort(() => Math.random() - 0.5).slice(0, 5);
    list.forEach((e, i) => {
      burst(world, e[2], e[3], [K.red, K.orange, K.yellow, K.paper], 18, 5, now + i * 0.06, { size: 3, life: 0.6, vz: 60 });
      pop(world, e[2], e[3], 'star', K.orange, now, { z: 50, vz: -60, life: 0.5, gs: 2, delay: i * 0.06 });
      ring(world, e[2], e[3], K.orange, 1.6, 0.4, now, { delay: 0.15 + i * 0.06 });
    });
  }
  for (let i = 0; i < 5; i++) pop(world, pos.x + (i - 2) * 0.5, pos.y, name, colors[i % colors.length], now, { z: 30 + i * 3, vz: 30, life: 1.2, gs: 2, delay: i * 0.06 });
  flash(world, colors[0], now, 0.15, 0.25);
}

// Power-up coletado: ['pick', pid, kind, x, y]
export function spawnPickup(world, ev, now) {
  const [, pid, kind, x, y] = ev;
  const t = PICKUP_TYPES[kind];
  if (!t) return;
  const mine = pid === world.youId;
  const pos = world.playerPos(pid) || { x, y };
  world.push(world.fx.texts, { x: pos.x, y: pos.y - 1, text: t.name.toUpperCase(), color: t.color, t0: now, dur: 1.4, small: !mine });
  burst(world, pos.x, pos.y, [t.color, K.paper], 12, 3.5, now, { life: 0.6 });
  switch (t.id) {
    case 'pizza':
      pop(world, pos.x, pos.y, 'heart', K.pink, now, { z: 30, gs: 2, life: 0.9 });
      break;
    case 'cafe':
      world.push(world.effects, { kind: 'dash', pid, x: pos.x, y: pos.y, t0: now, dur: 6 }, 40);
      break;
    case 'shield':
      ring(world, pos.x, pos.y, K.cyan, 1.8, 0.5, now, { double: true });
      break;
    case 'overclock':
      for (let i = 0; i < 4; i++) pop(world, pos.x + (i - 1.5) * 0.3, pos.y, 'bolt', K.yellow, now, { z: 20 + i * 4, gs: 2, life: 0.7, delay: i * 0.05 });
      break;
    case 'bomb':
      ring(world, x, y, K.orange, 4.5, 0.5, now, { double: true, fill: 'rgba(255,138,31,0.3)' });
      burst(world, x, y, [K.red, K.orange, K.yellow, K.paper], 30, 6.5, now, { size: 3, life: 0.6, vz: 55 });
      quake(world, now, 5, 0.3);
      flash(world, K.orange, now, 0.12, 0.3);
      break;
    case 'freeze':
      world.push(world.effects, { kind: 'snow', t0: now, dur: 3 }, 40);
      flash(world, K.ice, now, 0.2, 0.35);
      break;
    case 'star':
      for (let i = 0; i < 5; i++) pop(world, pos.x + (i - 2) * 0.4, pos.y, 'star', K.yellow, now, { z: 26 + i * 3, gs: 2, life: 0.9, delay: i * 0.05 });
      break;
    case 'backup':
      ring(world, SRV.x, SRV.y, K.green, 6, 0.8, now, { double: true, fill: 'rgba(61,255,139,0.18)' });
      for (const p of playersNear(world, SRV.x, SRV.y, 99)) pop(world, p.x, p.y, 'plus', K.green, now, { z: 30, gs: 2, life: 1 });
      break;
    default:
  }
}

// ----- atualização (partículas e efeitos contínuos) -----

export function step(world, dt, now) {
  const ps = world.parts;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    if (now < p.t0) continue;
    if (now - p.t0 > p.life) {
      ps.splice(i, 1);
      continue;
    }
    if (p.screen) {
      p.sx += p.vx * dt; // partículas em tela cheia (neve): posição em fração da tela
      p.sy += p.vy * dt;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vz += (p.g || 0) * dt;
    if (p.z < 0 && p.g) {
      p.z = 0;
      p.vz *= -0.3;
    }
  }
  for (const e of world.effects) {
    if (e.kind === 'snow' && now - e.t0 < e.dur && Math.random() < dt * 40) {
      world.parts.push({ screen: true, sx: Math.random(), sy: -0.05, x: 0, y: 0, z: 0, vx: (Math.random() - 0.5) * 0.05, vy: 0.35 + Math.random() * 0.2, vz: 0, life: 2.2, t0: now, color: Math.random() < 0.5 ? K.ice : K.paper, size: 0, glyph: 'flake', gs: 1 });
    }
  }
}

// ----- desenho -----

const iso = (r, x, y, ox, oy) => {
  const [sx, sy] = project(x, y);
  return [Math.round(ox + sx), Math.round(oy + sy)];
};

// Efeitos no chão (desenhados antes dos personagens)
export function drawGround(r, world, view, ox, oy, now, q) {
  const g = r.g;
  for (const e of world.effects) {
    const t = (now - e.t0) / e.dur;
    if (t < 0 || t >= 1) continue;
    if (e.kind === 'ring') {
      const [cx, cy] = iso(r, e.x, e.y, ox, oy);
      const rad = e.maxR * 16 * (1 - (1 - t) ** 2);
      const rx = rad * 1.41;
      const ry = rad * 0.705;
      if (e.fill && q.rings) stripes(g, cx, cy, rx, ry, e.fill, 3, Math.floor(now * 12));
      ellipse(g, cx, cy, rx, ry, e.color);
      if (e.double) ellipse(g, cx, cy, Math.max(1, rx - 3), Math.max(1, ry - 1.5), e.color);
    } else if (e.kind === 'field') {
      const [cx, cy] = iso(r, e.x, e.y, ox, oy);
      const fade = t > 0.75 ? (1 - t) / 0.25 : 1;
      const rx = e.r * 16 * 1.41 * fade;
      const ry = e.r * 16 * 0.705 * fade;
      stripes(g, cx, cy, rx, ry, 'rgba(139,92,255,0.28)', 4, Math.floor(now * 8));
      ellipse(g, cx, cy, rx, ry, e.color, { dash: 4, phase: Math.floor(now * 10) });
    } else if (e.kind === 'cracks') {
      const [cx, cy] = iso(r, e.x, e.y, ox, oy);
      const grow = Math.min(1, t * 4);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + e.seed;
        let px = cx;
        let py = cy;
        for (let s = 0; s < 4; s++) {
          const len = (10 + ((i * 7 + s * 5) % 9)) * grow;
          const na = a + Math.sin(i * 2 + s * 3) * 0.5;
          const nx = px + Math.cos(na) * len * 1.41;
          const ny = py + Math.sin(na) * len * 0.705;
          line(g, px, py, nx, ny, s < 2 ? K.ink : '#5A3A18');
          px = nx;
          py = ny;
        }
      }
    }
  }
}

// Efeitos no ar: partículas, mira do PO, raios, neve, varredura
export function drawAir(r, world, view, ox, oy, now, q) {
  const g = r.g;
  const W = r.W;
  const H = r.H;
  for (const e of world.effects) {
    const t = (now - e.t0) / e.dur;
    if (t < 0 || t >= 1) continue;
    if (e.kind === 'dash') {
      // rastro de velocidade atrás de quem correu
      const p = view.players.find((pl) => pl.id === e.pid);
      if (!p) continue;
      const [sx, sy] = iso(r, p.x, p.y, ox, oy);
      if (!(p.flags & 64)) continue;
      for (let i = 0; i < 5; i++) {
        const oyy = -6 - i * 6;
        const len = 8 + ((i * 5 + Math.floor(now * 30)) % 10);
        const dir = -p.face;
        line(g, sx + dir * (8 + i), sy + oyy, sx + dir * (8 + i + len), sy + oyy, i % 2 ? K.paper : K.cyan);
      }
    } else if (e.kind === 'lock') {
      // mira do PO fecha no alvo
      const en = view.enemies.find((x) => x.id === e.target);
      const [cx, cy] = en ? iso(r, en.x, en.y, ox, oy) : iso(r, e.x, e.y, ox, oy);
      const s = Math.max(0, 1 - t / 0.4);
      const d = 8 + Math.round(26 * s * s);
      const yy = cy - 12;
      const col = t < 0.4 ? K.pink : Math.floor(now * 12) % 2 ? K.paper : K.pink;
      for (const [sx2, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        rect(g, col, cx + sx2 * d - (sx2 > 0 ? 0 : 5), cy + sy2 * d * 0.7 - 12 - (sy2 > 0 ? 0 : 1), 6, 2);
        rect(g, col, cx + sx2 * d - (sx2 > 0 ? 1 : 0), cy + sy2 * d * 0.7 - 12 - (sy2 > 0 ? 5 : 0), 2, 6);
      }
      if (t >= 0.4) glyph(g, 'star', cx - 7, yy - 26, K.pink, 2);
    } else if (e.kind === 'rays') {
      const [cx, cy] = iso(r, e.x, e.y, ox, oy);
      const len = 140 * (1 - (1 - t) ** 2);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + t * 0.6;
        const l0 = len * 0.25;
        line(g, cx + Math.cos(a) * l0 * 1.41, cy - 10 + Math.sin(a) * l0 * 0.7, cx + Math.cos(a) * len * 1.41, cy - 10 + Math.sin(a) * len * 0.7, i % 2 ? K.pink : K.paper);
      }
    } else if (e.kind === 'sweep') {
      const y = Math.round(t * (H + 20)) - 10;
      rect(g, e.color, 0, y, W, 3);
      rect(g, K.paper, 0, y + 1, W, 1);
      for (let i = 1; i < 5; i++) rect(g, 'rgba(255,212,38,0.25)', 0, y - i * 5, W, 2);
    }
  }
  // partículas
  for (const p of world.parts) {
    if (now < p.t0) continue;
    const age = (now - p.t0) / p.life;
    if (age > 0.72 && Math.floor(now * 24) % 2) continue; // pisca ao sumir
    let sx;
    let sy;
    if (p.screen) {
      sx = Math.round(p.sx * W);
      sy = Math.round(p.sy * H);
    } else {
      [sx, sy] = iso(r, p.x, p.y, ox, oy);
      sy -= Math.round(p.z);
    }
    if (p.glyph) glyph(g, p.glyph, sx - Math.floor(glyphW(p.glyph, p.gs) / 2), sy - glyphH(p.glyph, p.gs), p.color, p.gs);
    else rect(g, p.color, sx, sy, p.size, p.size);
  }
}

// Tiro/ataque básico com visual por classe. s = { x1,y1,x2,y2,color,aoe,cls,t0,dur }
export function drawShot(r, s, t, ox, oy, now, q) {
  const g = r.g;
  const [x1, y1] = project(s.x1, s.y1);
  const [x2, y2] = project(s.x2, s.y2);
  const ax = Math.round(ox + x1);
  const ay = Math.round(oy + y1) - 16;
  const bx = Math.round(ox + x2);
  const by = Math.round(oy + y2) - 8;
  if (s.aoe) {
    // Tank: onda de choque dupla com poeira
    ellipse(g, ax, ay + 12, 10 + 38 * t, 5 + 19 * t, K.orange);
    ellipse(g, ax, ay + 12, 6 + 30 * t, 3 + 15 * t, K.yellow);
    if (q.bursts) for (let i = 0; i < 6; i++) rect(g, K.dust, ax + Math.round(Math.cos(i * 1.05) * (14 + 36 * t)), ay + 12 + Math.round(Math.sin(i * 1.05) * (7 + 18 * t)) - Math.round(t * 8), 2, 2);
    return;
  }
  switch (s.cls) {
    case 'qa': {
      // feixe pontilhado amarelo + lupa que fecha no alvo
      line(g, ax, ay, bx, by, K.yellow, 3);
      ellipse(g, bx, by, Math.round(9 * (1 - t) + 3), Math.round(5 * (1 - t) + 2), K.paper);
      break;
    }
    case 'ops': {
      // feixe verde ondulado com "+" no alvo
      const n = 10;
      let px = ax;
      let py = ay;
      for (let i = 1; i <= n; i++) {
        const f = i / n;
        const nx = ax + (bx - ax) * f;
        const ny = ay + (by - ay) * f + Math.round(Math.sin(f * 9 + now * 30) * 3);
        line(g, px, py, nx, ny, K.green);
        px = nx;
        py = ny;
      }
      glyph(g, 'plus', bx - 2, by - 6 - Math.round(t * 6), K.green, 1);
      break;
    }
    case 'po': {
      // bolha "?" voando até o alvo
      const f = Math.min(1, t * 1.4);
      const px = Math.round(ax + (bx - ax) * f);
      const py = Math.round(ay + (by - ay) * f) - Math.round(Math.sin(f * Math.PI) * 8);
      glyph(g, 'quest', px - 5, py - 12, K.pink, 2);
      rect(g, K.paper, px - 4, py - 12, 2, 2);
      for (let i = 1; i < 4; i++) rect(g, K.pink, Math.round(ax + (bx - ax) * Math.max(0, f - i * 0.08)), Math.round(ay + (by - ay) * Math.max(0, f - i * 0.08)) - 2, 2, 2);
      break;
    }
    default: {
      // Dev: projétil ciano com miolo branco e faíscas
      line(g, ax, ay, bx, by, K.cyan, 0, 3);
      line(g, ax, ay, bx, by, K.paper, 0, 1);
      rect(g, K.paper, bx - 2, by - 2, 5, 5);
      rect(g, K.cyan, bx - 4 - Math.round(t * 4), by - 1, 2, 2);
      rect(g, K.cyan, bx + 3 + Math.round(t * 4), by - 1, 2, 2);
      rect(g, K.cyan, bx - 1, by - 4 - Math.round(t * 4), 2, 2);
    }
  }
}

// Cúpula do Firewall em volta do servidor (enquanto ele está invulnerável)
export function drawDome(r, x, y, now, q) {
  const g = r.g;
  stripes(g, x, y - 12, 34, 26, 'rgba(43,200,255,0.16)', 3, Math.floor(now * 10));
  ellipse(g, x, y - 12, 34, 26, K.cyan, { dash: 5, phase: Math.floor(now * 14) });
  ellipse(g, x, y - 12, 30, 22, K.ice, { dash: 3, phase: -Math.floor(now * 9) });
  if (q.bursts) for (let i = 0; i < 6; i++) {
    const a = now * 1.5 + i * 1.05;
    glyph(g, 'flake', Math.round(x + Math.cos(a) * 34) - 2, Math.round(y - 12 + Math.sin(a) * 26) - 2, K.paper, 1);
  }
}

// Escudo do Tank / Crachá VIP em volta do jogador
export function drawShield(r, x, y, now) {
  const g = r.g;
  ellipse(g, x, y - 14, 13, 19, K.cyan, { dash: 4, phase: Math.floor(now * 12) });
  ellipse(g, x, y - 14, 11, 16, K.ice, { dash: 3, phase: -Math.floor(now * 8) });
  for (let i = 0; i < 4; i++) {
    const a = now * 3 + i * 1.57;
    rect(g, K.paper, Math.round(x + Math.cos(a) * 13) - 1, Math.round(y - 14 + Math.sin(a) * 19) - 1, 2, 2);
  }
}
