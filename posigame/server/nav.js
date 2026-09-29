// Navegação dos bugs: campo de distâncias (Dijkstra) numa grade de meio tile.
// Os bugs descem o campo até o alvo, então contornam paredes e passam pelas portas das salas.
import { MAP, collides, obstacles } from '../shared/game.js';

export const CS = 0.5; // tamanho da célula em tiles
export const NX = Math.round(MAP.w / CS);
export const NY = Math.round(MAP.h / CS);
const INFLATE = 0.55; // folga para o corpo do bug (o chefe também passa pelas portas de 2 tiles)

const blocked = new Uint8Array(NX * NY);
for (let j = 0; j < NY; j++) {
  for (let i = 0; i < NX; i++) blocked[j * NX + i] = collides((i + 0.5) * CS, (j + 0.5) * CS, INFLATE) ? 1 : 0;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const cellOf = (x, y) => clamp(Math.floor(y / CS), 0, NY - 1) * NX + clamp(Math.floor(x / CS), 0, NX - 1);
export const isBlocked = (i) => blocked[i] === 1;

const DIRS = [
  [1, 0, 10], [-1, 0, 10], [0, 1, 10], [0, -1, 10],
  [1, 1, 14], [1, -1, 14], [-1, 1, 14], [-1, -1, 14],
];

// heap binário mínimo de [custo, célula]
class Heap {
  constructor() {
    this.a = [];
  }
  push(c, i) {
    const a = this.a;
    a.push([c, i]);
    let k = a.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (a[p][0] <= a[k][0]) break;
      [a[p], a[k]] = [a[k], a[p]];
      k = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === k) break;
        [a[m], a[k]] = [a[k], a[m]];
        k = m;
      }
    }
    return top;
  }
  get size() {
    return this.a.length;
  }
}

// Célula livre mais próxima de (x, y)
export function nearestFree(x, y) {
  const c = cellOf(x, y);
  if (!blocked[c]) return c;
  const cx = c % NX;
  const cy = Math.floor(c / NX);
  for (let r = 1; r < 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= NX || ny >= NY) continue;
        if (!blocked[ny * NX + nx]) return ny * NX + nx;
      }
    }
  }
  return c;
}

// Campo de distâncias a partir de várias células-fonte
export function buildField(sources) {
  const dist = new Float32Array(NX * NY).fill(Infinity);
  const heap = new Heap();
  for (const s of sources) {
    dist[s] = 0;
    heap.push(0, s);
  }
  while (heap.size) {
    const [d, i] = heap.pop();
    if (d > dist[i]) continue;
    const x = i % NX;
    const y = (i - x) / NX;
    for (const [dx, dy, cost] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= NX || ny >= NY) continue;
      const j = ny * NX + nx;
      if (blocked[j]) continue;
      if (dx && dy && (blocked[y * NX + nx] || blocked[ny * NX + x])) continue; // não corta quina
      const nd = d + cost;
      if (nd < dist[j]) {
        dist[j] = nd;
        heap.push(nd, j);
      }
    }
  }
  return dist;
}

export const fieldTo = (x, y) => buildField([nearestFree(x, y)]);

// Campo do servidor: todas as células livres coladas nele são o "destino"
let serverCache = null;
export function serverField() {
  if (serverCache) return serverCache;
  const s = MAP.server;
  const src = [];
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      if (blocked[j * NX + i]) continue;
      const cx = (i + 0.5) * CS;
      const cy = (j + 0.5) * CS;
      const dx = Math.max(s.x - cx, 0, cx - (s.x + s.w));
      const dy = Math.max(s.y - cy, 0, cy - (s.y + s.h));
      if (Math.hypot(dx, dy) < 1.3) src.push(j * NX + i);
    }
  }
  serverCache = buildField(src);
  return serverCache;
}

// Direção (vetor unitário) que leva ao alvo descendo o campo; null se estiver preso/sem caminho
export function dirFrom(field, x, y) {
  const c = nearestFree(x, y);
  const cx = c % NX;
  const cy = (c - cx) / NX;
  let best = field[c];
  let bx = 0;
  let by = 0;
  for (const [dx, dy] of DIRS) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (nx < 0 || ny < 0 || nx >= NX || ny >= NY) continue;
    const j = ny * NX + nx;
    if (blocked[j] || field[j] >= best) continue;
    if (dx && dy && (blocked[cy * NX + nx] || blocked[ny * NX + cx])) continue;
    best = field[j];
    bx = dx;
    by = dy;
  }
  if (!bx && !by) return null;
  // mira no centro da célula vizinha para andar reto e sem zigue-zague
  const tx = (cx + bx + 0.5) * CS;
  const ty = (cy + by + 0.5) * CS;
  const d = Math.hypot(tx - x, ty - y) || 1;
  return [(tx - x) / d, (ty - y) / d];
}

// Linha reta livre de obstáculos (até `margin` antes do destino)?
export function losClear(x0, y0, x1, y1, r = 0.5, margin = 0) {
  const len = Math.hypot(x1 - x0, y1 - y0) - margin;
  if (len <= 0) return true;
  const steps = Math.ceil(len / 0.3);
  for (let k = 1; k <= steps; k++) {
    const t = (k / steps) * (len / (len + margin));
    if (collides(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r)) return false;
  }
  return true;
}

export const reachable = (field, x, y) => Number.isFinite(field[nearestFree(x, y)]);
export const _obstacleCount = () => obstacles().length;
