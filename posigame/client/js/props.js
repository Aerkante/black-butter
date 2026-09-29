// Móveis e objetos do escritório em pixel art isométrica. Cada peça é desenhada uma vez (cache).
import { SECTORS } from '/shared/game.js';
import { fillPoly, rect, makeCanvas } from './px.js';
import { HX, HY, K, box, decal, bake, tone, WOOD, DARK, WHITE, NAVY } from './iso.js';

const BOOK_COLORS = ['#ff3b4e', '#2bc8ff', '#ffd426', '#3dff8b', '#ff4fa3', '#ff8a1f', '#8b5cff', '#fff6e0'];

// ----- salão -----

function drawDesk(g, ox, oy, w, d, p) {
  const accent = SECTORS[p.sector]?.color || K.yellow;
  const top = { u: 0, v: 0, z: 0, w: 2, d: 1, h: 9, ...WOOD };
  box(g, ox, oy, top);
  decal(g, ox, oy, top, 'L', 0.06, 0.46, 1, 7, '#c0621f');
  decal(g, ox, oy, top, 'L', 0.06, 0.46, 3.6, 4.4, '#7c3a14');
  decal(g, ox, oy, top, 'L', 0.54, 0.94, 1, 7, '#c0621f');
  decal(g, ox, oy, top, 'L', 0.54, 0.94, 3.6, 4.4, '#7c3a14');
  decal(g, ox, oy, top, 'L', 0.2, 0.32, 4.6, 5.4, accent);
  decal(g, ox, oy, top, 'T', 0.42, 0.82, 0.45, 0.9, accent); // mouse pad na cor do setor
  box(g, ox, oy, { u: 0.7, v: 0.16, z: 9, w: 0.16, d: 0.1, h: 2, ...DARK });
  const mon = { u: 0.42, v: 0.12, z: 11, w: 0.7, d: 0.08, h: 11, ...DARK };
  box(g, ox, oy, mon);
  decal(g, ox, oy, mon, 'L', 0.08, 0.92, 1.5, 9.5, '#062a1a');
  decal(g, ox, oy, mon, 'L', 0.14, 0.86, 2.5, 8.5, K.green);
  decal(g, ox, oy, mon, 'L', 0.2, 0.55, 5.5, 8.5, '#12b855');
  decal(g, ox, oy, mon, 'L', 0.62, 0.8, 3, 5, '#c8ffe0');
  decal(g, ox, oy, mon, 'L', 0.0, 0.14, 8, 11, K.yellow);
  decal(g, ox, oy, mon, 'L', 0.86, 1.0, 5, 8, accent);
  const kb = { u: 0.45, v: 0.5, z: 9, w: 0.5, d: 0.24, h: 1, ...tone('#e7d9b0', '#a89a6a', '#c9bb8a') };
  box(g, ox, oy, kb);
  decal(g, ox, oy, kb, 'T', 0.08, 0.92, 0.2, 0.45, '#a89a6a');
  box(g, ox, oy, { u: 1.05, v: 0.56, z: 9, w: 0.1, d: 0.12, h: 1, ...DARK });
  const mug = { u: 1.42, v: 0.3, z: 9, w: 0.16, d: 0.16, h: 4, ...WHITE };
  box(g, ox, oy, mug);
  decal(g, ox, oy, mug, 'T', 0.15, 0.85, 0.15, 0.85, '#5b3a29');
  box(g, ox, oy, { u: 1.28, v: 0.62, z: 9, w: 0.34, d: 0.24, h: 1, ...WHITE });
}

function drawChair(g, ox, oy) {
  box(g, ox, oy, { u: -0.28, v: -0.05, z: 0, w: 0.56, d: 0.1, h: 1, ...DARK });
  box(g, ox, oy, { u: -0.05, v: -0.28, z: 0, w: 0.1, d: 0.56, h: 1, ...DARK });
  box(g, ox, oy, { u: -0.05, v: -0.05, z: 1, w: 0.1, d: 0.1, h: 4, ...DARK });
  box(g, ox, oy, { u: -0.3, v: -0.3, z: 5, w: 0.6, d: 0.6, h: 2, ...NAVY });
  box(g, ox, oy, { u: -0.3, v: 0.24, z: 7, w: 0.6, d: 0.08, h: 9, top: '#3b4dc4', left: '#232a78', right: '#3446b8' });
}

function drawPrinter(g, ox, oy) {
  const o = { u: 0.05, v: 0.1, z: 0, w: 0.9, d: 0.8, h: 11, ...WHITE };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'L', 0.1, 0.9, 3, 5, '#1b2170');
  decal(g, ox, oy, o, 'L', 0.66, 0.86, 7, 9, K.green);
  decal(g, ox, oy, o, 'R', 0.15, 0.85, 4, 6, '#1b2170');
  box(g, ox, oy, { u: 0.25, v: 0.25, z: 11, w: 0.5, d: 0.36, h: 1, ...tone('#ffffff', '#f2cb86', '#ffe9b8') });
  box(g, ox, oy, { u: 0.3, v: 0.82, z: 3, w: 0.4, d: 0.22, h: 1, ...tone('#ffffff', '#f2cb86', '#ffe9b8') });
}

function drawPlant(g, ox, oy) {
  const pot = { u: -0.18, v: -0.18, z: 0, w: 0.36, d: 0.36, h: 8, top: '#f2a25a', left: '#a8531f', right: '#d08a45' };
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
  const o = { u: -0.2, v: -0.2, z: 0, w: 0.4, d: 0.4, h: 10, top: '#8fa3ff', left: '#3446b8', right: '#4453d8' };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'T', 0.14, 0.86, 0.14, 0.86, '#0a0e40');
  decal(g, ox, oy, o, 'L', 0.2, 0.8, 2, 3, '#232a78');
  decal(g, ox, oy, o, 'L', 0.2, 0.8, 5, 6, '#232a78');
  box(g, ox, oy, { u: -0.06, v: -0.06, z: 9, w: 0.14, d: 0.14, h: 3, ...WHITE });
}

function drawCooler(g, ox, oy) {
  const base = { u: -0.24, v: -0.24, z: 0, w: 0.48, d: 0.48, h: 13, ...WHITE };
  box(g, ox, oy, base);
  decal(g, ox, oy, base, 'L', 0.2, 0.44, 7, 10, K.cyan);
  decal(g, ox, oy, base, 'L', 0.56, 0.8, 7, 10, K.red);
  decal(g, ox, oy, base, 'L', 0.3, 0.7, 2, 5, '#1b2170');
  const jug = { u: -0.2, v: -0.2, z: 13, w: 0.4, d: 0.4, h: 13, top: '#cff0ff', left: '#4fa3cc', right: '#67bee8' };
  box(g, ox, oy, jug);
  decal(g, ox, oy, jug, 'L', 0.15, 0.3, 2, 11, '#bfeaff');
  box(g, ox, oy, { u: -0.08, v: -0.08, z: 26, w: 0.16, d: 0.16, h: 2, ...WHITE });
}

function drawCoffee(g, ox, oy) {
  const o = { u: 0, v: 0, z: 0, w: 1, d: 1, h: 22, ...WHITE };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'L', 0.12, 0.88, 14, 19, '#1b2170');
  decal(g, ox, oy, o, 'L', 0.2, 0.5, 15.5, 17.5, K.green);
  decal(g, ox, oy, o, 'L', 0.62, 0.72, 15.5, 17.5, K.red);
  decal(g, ox, oy, o, 'L', 0.78, 0.86, 15.5, 17.5, K.yellow);
  decal(g, ox, oy, o, 'L', 0.3, 0.7, 3, 11, '#2a36b0');
  decal(g, ox, oy, o, 'L', 0.42, 0.58, 3, 7, K.paper);
  decal(g, ox, oy, o, 'R', 0.15, 0.85, 8, 15, K.red);
  decal(g, ox, oy, o, 'R', 0.28, 0.72, 10, 13, K.paper);
  box(g, ox, oy, { u: 0.3, v: 0.3, z: 22, w: 0.4, d: 0.4, h: 6, top: '#b8e8fb', left: '#4fa3cc', right: '#67bee8' });
}

function drawServerBase(g, ox, oy) {
  const o = { u: 0, v: 0, z: 0, w: 1, d: 1, h: 34, top: '#6c78ff', left: '#1b2170', right: '#2a36b0' };
  box(g, ox, oy, o);
  for (let i = 0; i < 5; i++) {
    const v = 4 + i * 6;
    decal(g, ox, oy, o, 'L', 0.1, 0.9, v, v + 4, '#2c3a9a');
    decal(g, ox, oy, o, 'L', 0.16, 0.5, v + 1.5, v + 2.5, '#0a0e40');
    decal(g, ox, oy, o, 'R', 0.1, 0.9, v, v + 4, '#3a48c8');
    decal(g, ox, oy, o, 'R', 0.16, 0.6, v + 1.5, v + 2.5, '#161b2c');
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

// ----- sala de reunião e do diretor -----

function drawLaptop(g, ox, oy, o, u, v, z) {
  box(g, ox, oy, { u: o.u + u, v: o.v + v, z, w: 0.5, d: 0.34, h: 1, ...tone('#e7e9ff', '#8fa3ff', '#b8c2ff') });
  const scr = { u: o.u + u, v: o.v + v - 0.02, z: z + 1, w: 0.5, d: 0.05, h: 8, ...DARK };
  box(g, ox, oy, scr);
  decal(g, ox, oy, scr, 'L', 0.1, 0.9, 1, 7, K.cyan);
}

function drawTable6(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 11, ...tone('#e0954e', '#8a4a1f', '#a85e2a') };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'T', 0.03, 0.97, 0.05, 0.95, '#c97a3a');
  for (const u of [0.8, 1.9, 3.0, 4.1, 5.1]) {
    drawLaptop(g, ox, oy, { u: 0, v: 0 }, u, 0.25, 11);
    box(g, ox, oy, { u: u + 0.1, v: 1.35, z: 11, w: 0.3, d: 0.22, h: 1, ...WHITE });
  }
  box(g, ox, oy, { u: 2.7, v: 0.85, z: 11, w: 0.4, d: 0.4, h: 3, ...tone('#3f49b8', '#1b2170', '#2a36b0') }); // viva-voz
  box(g, ox, oy, { u: 3.5, v: 0.95, z: 11, w: 0.2, d: 0.2, h: 5, top: '#b8e8fb', left: '#4fa3cc', right: '#67bee8' }); // jarra
  box(g, ox, oy, { u: 2.0, v: 0.95, z: 11, w: 0.16, d: 0.16, h: 3, ...WHITE });
  box(g, ox, oy, { u: 4.4, v: 0.95, z: 11, w: 0.16, d: 0.16, h: 3, ...WHITE });
}

function drawBigDesk(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 12, ...tone('#9a4a1c', '#55240b', '#733010') };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'T', 0.06, 0.94, 0.12, 0.9, '#3a1c0a');
  decal(g, ox, oy, o, 'L', 0.06, 0.3, 1, 9, '#6b2c0e');
  decal(g, ox, oy, o, 'L', 0.7, 0.94, 1, 9, '#6b2c0e');
  decal(g, ox, oy, o, 'L', 0.4, 0.6, 6, 9, K.yellow); // placa de ouro
  drawLaptop(g, ox, oy, { u: 0, v: 0 }, 1.0, 0.25, 12);
  const mon = { u: 1.7, v: 0.2, z: 12, w: 0.7, d: 0.08, h: 11, ...DARK };
  box(g, ox, oy, mon);
  decal(g, ox, oy, mon, 'L', 0.08, 0.92, 1.5, 9.5, '#062a1a');
  decal(g, ox, oy, mon, 'L', 0.14, 0.86, 2.5, 8.5, '#2bc8ff');
  box(g, ox, oy, { u: 0.25, v: 0.3, z: 12, w: 0.14, d: 0.14, h: 7, ...tone(K.yellow, '#c9a10f', '#e6b912') }); // abajur
  box(g, ox, oy, { u: 2.6, v: 0.7, z: 12, w: 0.3, d: 0.2, h: 2, ...DARK }); // telefone
  box(g, ox, oy, { u: 1.1, v: 0.85, z: 12, w: 0.4, d: 0.28, h: 1, ...WHITE });
}

function drawSofa(g, ox, oy, w, d) {
  const c = tone('#d8384c', '#8a1f2d', '#b02a3a');
  box(g, ox, oy, { u: 0, v: 0, z: 0, w, d, h: 8, ...c });
  box(g, ox, oy, { u: 0, v: 0, z: 8, w, d: 0.3, h: 12, ...c });
  box(g, ox, oy, { u: 0, v: 0.3, z: 8, w: 0.28, d: d - 0.3, h: 5, ...c });
  box(g, ox, oy, { u: w - 0.28, v: 0.3, z: 8, w: 0.28, d: d - 0.3, h: 5, ...c });
  box(g, ox, oy, { u: 0.5, v: 0.4, z: 8, w: 0.35, d: 0.3, h: 3, ...tone(K.yellow, '#c9a10f', '#e6b912') }); // almofada
}

function drawBookshelf(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 46, ...tone('#b8621f', '#5a2c10', '#743a17') };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'L', 0.03, 0.97, 2, 44, '#2a1204');
  for (let r = 0; r < 4; r++) {
    const z0 = 3 + r * 10.5;
    decal(g, ox, oy, o, 'L', 0.03, 0.97, z0 - 1, z0, '#e0954e');
    let u = 0.05;
    let i = r * 3;
    while (u < 0.93) {
      const bw = 0.035 + ((i * 7) % 4) * 0.012;
      decal(g, ox, oy, o, 'L', u, Math.min(0.95, u + bw), z0, z0 + 6 + ((i * 5) % 3) * 1.4, BOOK_COLORS[i % BOOK_COLORS.length]);
      u += bw + 0.008;
      i += 1;
    }
  }
}

// ----- sala de componentes -----

function drawRack(g, ox, oy, w, d, p, face) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 52, top: '#a3b1ff', left: '#4453d8', right: '#6c78ff' };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, face, 0.02, 0.98, 2, 50, '#232a78');
  const kinds = [['#d9a25c', '#f2d29a'], ['#3d50cf', '#8fa3ff'], ['#ff3b4e', '#ff9aa4'], ['#3dff8b', '#c8ffe0'], ['#ffd426', '#fff08a']];
  for (let r = 0; r < 4; r++) {
    const z0 = 3 + r * 12.5;
    decal(g, ox, oy, o, face, 0.02, 0.98, z0 - 1, z0, '#c4cdff'); // prateleira
    let u = 0.06;
    let i = r * 2 + 1;
    while (u < 0.92) {
      const bw = 0.13 + ((i * 3) % 3) * 0.03;
      const [c1, c2] = kinds[i % kinds.length];
      const hh = 6 + ((i * 5) % 4) * 1.3;
      decal(g, ox, oy, o, face, u, Math.min(0.95, u + bw), z0, z0 + hh, c1);
      decal(g, ox, oy, o, face, u + 0.01, Math.min(0.95, u + bw) - 0.01, z0 + hh - 2, z0 + hh - 1, c2);
      u += bw + 0.03;
      i += 1;
    }
  }
}

function pcb(g, ox, oy, u, v, z, c = 0) {
  const greens = [tone('#1fcb6a', '#0f7a3e', '#159a50'), tone('#2bc8ff', '#137aa8', '#1a9bd0'), tone('#ff4fa3', '#a81d63', '#d0327f')];
  const b = { u, v, z, w: 0.5, d: 0.36, h: 1, ...greens[c % 3] };
  box(g, ox, oy, b);
  decal(g, ox, oy, b, 'T', 0.1, 0.9, 0.12, 0.28, '#ffd426'); // trilhas douradas
  decal(g, ox, oy, b, 'T', 0.15, 0.45, 0.45, 0.85, '#0a0e40'); // chip
  decal(g, ox, oy, b, 'T', 0.55, 0.8, 0.45, 0.8, '#8fa3ff');
}

function chipBox(g, ox, oy, u, v, z) {
  const b = { u, v, z, w: 0.2, d: 0.2, h: 1.6, top: '#3f49b8', left: '#0a0e40', right: '#161b70' };
  box(g, ox, oy, b);
  decal(g, ox, oy, b, 'T', 0.25, 0.5, 0.25, 0.5, '#c8ffe0');
}

function componentsOn(g, ox, oy, w, d, z) {
  // placas, chips, carretéis, multímetro e fios espalhados pela bancada
  const n = Math.max(3, Math.floor(w / 0.75));
  for (let i = 0; i < n; i++) {
    const u = 0.18 + i * ((w - 0.85) / Math.max(1, n - 1));
    pcb(g, ox, oy, u, 0.14, z, i);
    chipBox(g, ox, oy, u + 0.1, 0.62, z);
    if (i % 2 === 0) box(g, ox, oy, { u: u + 0.32, v: 0.66, z, w: 0.2, d: 0.2, h: 3, ...tone(K.orange, '#a85512', '#d06f14') }); // carretel
  }
  const mm = { u: w - 0.5, v: d - 0.5, z, w: 0.3, d: 0.22, h: 3, ...tone(K.yellow, '#c9a10f', '#e6b912') };
  box(g, ox, oy, mm);
  decal(g, ox, oy, mm, 'L', 0.15, 0.85, 1.2, 2.6, '#0a0e40');
}

function drawWorkbench(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 13, ...tone('#e7ebf7', '#8592b8', '#aab5d4') };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'L', 0.03, 0.97, 2, 4, '#5f6b93'); // prateleira de baixo
  decal(g, ox, oy, o, 'L', 0.03, 0.97, 7, 8, '#c4cdff');
  decal(g, ox, oy, o, 'R', 0.05, 0.95, 2, 4, '#5f6b93');
  componentsOn(g, ox, oy, w, d, 13);
}

function drawRoundTable(g, ox, oy, w, d) {
  const cx = w / 2;
  const cy = d / 2;
  const r = Math.min(w, d) / 2 - 0.02;
  const h = 12;
  const P = (a, z) => [ox + HX * (cx + r * Math.cos(a) - (cy + r * Math.sin(a))), oy + HY * (cx + r * Math.cos(a) + cy + r * Math.sin(a)) - z];
  const n = 24;
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2;
    const a1 = ((k + 1) / n) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    if (Math.cos(am) + Math.sin(am) <= 0) continue; // lado de trás
    const shade = 0.5 + 0.5 * Math.sin(am - 0.6);
    const col = shade > 0.66 ? '#a3aec8' : shade > 0.33 ? '#8592b8' : '#6a769c';
    fillPoly(g, [P(a0, h), P(a1, h), P(a1, 0), P(a0, 0)], col);
  }
  const top = [];
  for (let k = 0; k < n; k++) top.push(P((k / n) * Math.PI * 2, h));
  fillPoly(g, top, '#e7ebf7');
  const inner = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    inner.push([ox + HX * (cx + (r - 0.12) * Math.cos(a) - (cy + (r - 0.12) * Math.sin(a))), oy + HY * (cx + (r - 0.12) * Math.cos(a) + cy + (r - 0.12) * Math.sin(a)) - h]);
  }
  fillPoly(g, inner, '#dfe4f5');
  pcb(g, ox, oy, cx - 0.55, cy - 0.35, h, 0);
  pcb(g, ox, oy, cx + 0.0, cy - 0.05, h, 1);
  chipBox(g, ox, oy, cx - 0.2, cy + 0.25, h);
  chipBox(g, ox, oy, cx - 0.45, cy + 0.2, h);
  box(g, ox, oy, { u: cx + 0.15, v: cy - 0.5, z: h, w: 0.2, d: 0.2, h: 3, ...tone(K.orange, '#a85512', '#d06f14') });
  box(g, ox, oy, { u: cx - 0.7, v: cy + 0.05, z: h, w: 0.16, d: 0.16, h: 3, ...WHITE });
}

function drawCrate(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 13, ...tone('#e8b46a', '#9a6a2c', '#c08a40') };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'L', 0.42, 0.58, 0, 13, '#f7dca0');
  decal(g, ox, oy, o, 'R', 0.42, 0.58, 0, 13, '#f7dca0');
  decal(g, ox, oy, o, 'T', 0.42, 0.58, 0, 1, '#f7dca0');
  decal(g, ox, oy, o, 'L', 0.1, 0.32, 4, 8, '#ffffff');
  box(g, ox, oy, { u: 0.25, v: 0.25, z: 13, w: 0.45, d: 0.4, h: 5, ...tone('#d0a05a', '#8a5a20', '#b07830') });
}

// ----- sala de segurança do trabalho -----

function drawSafetyTable(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 11, ...tone('#fff6e0', '#a89a6a', '#d6c08a') };
  box(g, ox, oy, o);
  const kit = { u: 0.3, v: 0.3, z: 11, w: 0.5, d: 0.4, h: 4, ...tone(K.red, '#a01b2c', '#c8283b') };
  box(g, ox, oy, kit);
  decal(g, ox, oy, kit, 'T', 0.4, 0.6, 0.15, 0.85, '#ffffff');
  decal(g, ox, oy, kit, 'T', 0.15, 0.85, 0.4, 0.6, '#ffffff');
  for (const u of [1.1, 1.5, 1.9]) {
    box(g, ox, oy, { u, v: 0.35, z: 11, w: 0.28, d: 0.28, h: 4, ...tone(K.yellow, '#c9a10f', '#e6b912') }); // capacetes
  }
  box(g, ox, oy, { u: 1.2, v: 0.85, z: 11, w: 0.6, d: 0.3, h: 1, ...tone('#e7e9ff', '#8fa3ff', '#b8c2ff') });
  box(g, ox, oy, { u: 2.1, v: 0.7, z: 11, w: 0.3, d: 0.3, h: 5, ...tone('#2ee87f', '#159a50', '#1fcb6a') });
}

function drawLockerY(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 40, top: '#5cf0a0', left: '#159a50', right: '#22c96a' };
  box(g, ox, oy, o);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const u0 = i / n + 0.02;
    const u1 = (i + 1) / n - 0.02;
    decal(g, ox, oy, o, 'R', u0, u1, 3, 37, '#1fb45f');
    decal(g, ox, oy, o, 'R', u0 + 0.03, u1 - 0.03, 30, 34, '#0e6b38');
    decal(g, ox, oy, o, 'R', u0 + 0.03, u1 - 0.03, 26, 27, '#0e6b38');
    decal(g, ox, oy, o, 'R', u1 - 0.07, u1 - 0.035, 15, 22, K.yellow);
  }
}

function drawSign(g, ox, oy) {
  box(g, ox, oy, { u: -0.12, v: -0.12, z: 0, w: 0.24, d: 0.24, h: 2, ...DARK });
  box(g, ox, oy, { u: -0.03, v: -0.03, z: 2, w: 0.06, d: 0.06, h: 16, ...tone('#d6ddff', '#8fa3ff', '#b8c2ff') });
  const P = (x, y) => [ox + x, oy + y];
  fillPoly(g, [P(0, -34), P(9, -20), P(-9, -20)], '#0b0e1a');
  fillPoly(g, [P(0, -32), P(7, -21), P(-7, -21)], K.yellow);
  rect(g, K.ink, ox - 1, oy - 29, 2, 5);
  rect(g, K.ink, ox - 1, oy - 23, 2, 2);
}

// ----- copa -----

function drawTable2(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 10, ...tone('#ffe9a0', '#c9a24a', '#e0b95c') };
  box(g, ox, oy, o);
  box(g, ox, oy, { u: 0.25, v: 0.3, z: 10, w: 0.5, d: 0.5, h: 1, ...WHITE });
  box(g, ox, oy, { u: 0.3, v: 0.35, z: 11, w: 0.4, d: 0.4, h: 1, ...tone('#ff8a1f', '#c96a2b', '#e0791f') });
  box(g, ox, oy, { u: 1.0, v: 0.9, z: 10, w: 0.16, d: 0.16, h: 3, ...WHITE });
  box(g, ox, oy, { u: 1.05, v: 0.3, z: 10, w: 0.16, d: 0.16, h: 4, ...tone('#ff3b4e', '#a01b2c', '#c8283b') });
}

function drawTableLong(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 10, ...tone('#ffe9a0', '#c9a24a', '#e0b95c') };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'T', 0.02, 0.98, 0.08, 0.92, '#ffd97a');
  for (let i = 0; i < 5; i++) {
    box(g, ox, oy, { u: 0.35 + i * 1.15, v: 0.25, z: 10, w: 0.42, d: 0.42, h: 1, ...WHITE }); // pratos
    box(g, ox, oy, { u: 0.5 + i * 1.15, v: 0.85, z: 10, w: 0.16, d: 0.16, h: 3, ...tone(i % 2 ? K.cyan : K.pink, '#0a0e40', '#161b70') }); // canecas
  }
  box(g, ox, oy, { u: 2.9, v: 0.45, z: 10, w: 0.5, d: 0.4, h: 3, ...tone('#ff8a1f', '#c96a2b', '#e0791f') }); // fruteira
  box(g, ox, oy, { u: 3.05, v: 0.5, z: 13, w: 0.14, d: 0.14, h: 2, ...tone(K.red, '#a01b2c', '#c8283b') });
  box(g, ox, oy, { u: 1.9, v: 0.55, z: 10, w: 0.3, d: 0.2, h: 3, ...tone('#e7e9ff', '#8fa3ff', '#b8c2ff') }); // porta-guardanapo
}

function drawCounterY(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 17, top: '#fff6e0', left: '#2a36b0', right: '#3446b8' };
  box(g, ox, oy, o);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const u0 = i / n + 0.015;
    const u1 = (i + 1) / n - 0.015;
    decal(g, ox, oy, o, 'R', u0, u1, 2, 15, '#4d61d8');
    decal(g, ox, oy, o, 'R', u0 + 0.02, u0 + 0.05, 8, 12, K.yellow);
  }
  decal(g, ox, oy, o, 'T', 0.15, 0.85, 0.06, 0.22, '#0a0e40'); // pia
  decal(g, ox, oy, o, 'T', 0.3, 0.7, 0.12, 0.16, '#8fa3ff');
  const mw = { u: 0.1, v: 2.6, z: 17, w: 0.7, d: 0.9, h: 9, ...tone('#ffffff', '#c9c2ae', '#e8e1cf') };
  box(g, ox, oy, mw);
  decal(g, ox, oy, mw, 'L', 0.1, 0.75, 1.5, 7, '#0a0e40'); // micro-ondas
  decal(g, ox, oy, mw, 'R', 0.2, 0.7, 1.5, 7, '#0a0e40');
  decal(g, ox, oy, mw, 'R', 0.75, 0.9, 2, 6, K.green);
  box(g, ox, oy, { u: 0.2, v: 3.9, z: 17, w: 0.5, d: 0.35, h: 5, ...tone('#dfe6ff', '#8fa3ff', '#b8c2ff') }); // torradeira
  box(g, ox, oy, { u: 0.25, v: 4.5, z: 17, w: 0.3, d: 0.3, h: 6, ...tone('#e8b46a', '#9a6a2c', '#c08a40') }); // pote
}

function drawFridge(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 48, top: '#f2f5ff', left: '#a9b2cc', right: '#d0d7ea' };
  box(g, ox, oy, o);
  for (const f of ['L', 'R']) {
    decal(g, ox, oy, o, f, 0.02, 0.98, 30, 31, '#7d88a8');
    decal(g, ox, oy, o, f, 0.78, 0.86, 34, 44, '#6a769c');
    decal(g, ox, oy, o, f, 0.78, 0.86, 14, 26, '#6a769c');
  }
  decal(g, ox, oy, o, 'R', 0.2, 0.34, 36, 42, K.red); // ímãs
  decal(g, ox, oy, o, 'R', 0.4, 0.5, 34, 40, K.cyan);
  decal(g, ox, oy, o, 'R', 0.55, 0.68, 38, 43, K.yellow);
}

function drawVending(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 46, top: '#ff6a78', left: '#a01b2c', right: '#d02a3d' };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'L', 0.08, 0.92, 14, 42, '#0f1450');
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      decal(g, ox, oy, o, 'L', 0.13 + c * 0.2, 0.13 + c * 0.2 + 0.13, 16 + r * 6.5, 20 + r * 6.5, BOOK_COLORS[(r * 4 + c) % BOOK_COLORS.length]);
    }
  }
  decal(g, ox, oy, o, 'L', 0.2, 0.8, 3, 9, '#0a0e40'); // gaveta
  decal(g, ox, oy, o, 'R', 0.15, 0.85, 30, 40, '#ffd426'); // painel iluminado
  decal(g, ox, oy, o, 'R', 0.3, 0.7, 12, 26, '#0a0e40');
  decal(g, ox, oy, o, 'R', 0.4, 0.6, 16, 18, K.green);
}

function drawTotem(g, ox, oy, w, d) {
  const o = { u: 0, v: 0, z: 0, w, d, h: 40, top: '#5a66ff', left: '#1b2170', right: '#2a36b0' };
  box(g, ox, oy, o);
  decal(g, ox, oy, o, 'L', 0.1, 0.9, 22, 36, '#0a0e40');
  decal(g, ox, oy, o, 'L', 0.16, 0.84, 24, 34, K.cyan);
  // relógio na tela
  decal(g, ox, oy, o, 'L', 0.48, 0.52, 25, 31, '#0a0e40');
  decal(g, ox, oy, o, 'L', 0.48, 0.66, 27, 28, '#0a0e40');
  decal(g, ox, oy, o, 'L', 0.2, 0.8, 12, 20, '#232a78'); // leitor
  decal(g, ox, oy, o, 'L', 0.36, 0.64, 13, 19, K.green);
  decal(g, ox, oy, o, 'R', 0.2, 0.8, 22, 34, '#232a78');
  decal(g, ox, oy, o, 'R', 0.35, 0.65, 26, 30, K.yellow);
  box(g, ox, oy, { u: 0.2, v: 0.2, z: 40, w: 0.4, d: 0.4, h: 3, ...tone(K.red, '#a01b2c', '#c8283b') });
}

// ----- tabela de tipos -----
// kind: 'box' = âncora no canto de trás da pegada; 'point' = âncora no ponto; 'center' = centro da pegada
const TYPES = {
  desk: { kind: 'box', draw: drawDesk, hpx: 36 },
  chair: { kind: 'point', draw: drawChair, hpx: 24, size: [36, 40, 18, 22] },
  printer: { kind: 'box', draw: drawPrinter, hpx: 30 },
  plant: { kind: 'point', draw: drawPlant, hpx: 50, size: [40, 56, 20, 46] },
  bin: { kind: 'point', draw: drawBin, hpx: 24, size: [28, 34, 14, 26] },
  cooler: { kind: 'center', draw: drawCooler, hpx: 46, size: [32, 60, 16, 48] },
  coffee: { kind: 'box', draw: drawCoffee, hpx: 44 },
  table6: { kind: 'box', draw: drawTable6, hpx: 32 },
  bigdesk: { kind: 'box', draw: drawBigDesk, hpx: 34 },
  sofa: { kind: 'box', draw: drawSofa, hpx: 30 },
  bookshelf: { kind: 'box', draw: drawBookshelf, hpx: 52 },
  rackX: { kind: 'box', draw: (g, ox, oy, w, d, p) => drawRack(g, ox, oy, w, d, p, 'L'), hpx: 58 },
  rackY: { kind: 'box', draw: (g, ox, oy, w, d, p) => drawRack(g, ox, oy, w, d, p, 'R'), hpx: 58 },
  workbench: { kind: 'box', draw: drawWorkbench, hpx: 32 },
  roundtable: { kind: 'box', draw: drawRoundTable, hpx: 30 },
  crate: { kind: 'box', draw: drawCrate, hpx: 30 },
  table: { kind: 'box', draw: drawSafetyTable, hpx: 28 },
  lockerY: { kind: 'box', draw: drawLockerY, hpx: 46 },
  sign: { kind: 'point', draw: drawSign, hpx: 40, size: [40, 56, 20, 46] },
  table2: { kind: 'box', draw: drawTable2, hpx: 24 },
  tableLong: { kind: 'box', draw: drawTableLong, hpx: 24 },
  counterY: { kind: 'box', draw: drawCounterY, hpx: 34 },
  fridge: { kind: 'box', draw: drawFridge, hpx: 54 },
  vending: { kind: 'box', draw: drawVending, hpx: 52 },
  totem: { kind: 'box', draw: drawTotem, hpx: 50 },
};

const sprites = new Map();

// Sprite de um móvel do mapa (com cache por tipo, tamanho e setor)
export function propSprite(p) {
  const def = TYPES[p.t];
  if (!def) return null;
  const key = `${p.t}|${p.w || 0}|${p.h || 0}|${p.sector || ''}`;
  let s = sprites.get(key);
  if (s) return s;
  if (def.kind === 'box') {
    const w = p.w;
    const d = p.h;
    const cw = Math.ceil((w + d) * HX) + 40;
    const ch = Math.ceil((w + d) * HY) + def.hpx + 24;
    const ax = Math.ceil(d * HX) + 20;
    const ay = def.hpx + 12;
    s = bake(cw, ch, ax, ay, (g, ox, oy) => def.draw(g, ox, oy, w, d, p));
  } else {
    const [cw, ch, ax, ay] = def.size;
    s = bake(cw, ch, ax, ay, (g, ox, oy) => def.draw(g, ox, oy, 0, 0, p));
  }
  s.kind = def.kind;
  sprites.set(key, s);
  return s;
}

export function buildProps() {
  return { serverA: serverVariant(0), serverB: serverVariant(1) };
}

// Plaquinha de setor (texto em fonte pixel, cor do setor)
export function labelSprite(text, color) {
  const key = `lb|${text}|${color}`;
  let s = sprites.get(key);
  if (s) return s;
  const w = text.length * 8 + 10;
  const [c, g] = makeCanvas(w, 14);
  rect(g, K.ink, 0, 0, w, 14);
  rect(g, color, 0, 0, w, 2);
  rect(g, '#1b2170', 1, 2, w - 2, 11);
  g.font = '8px "Press Start 2P", monospace';
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#fff6e0';
  g.fillText(text, 5, 11);
  s = { canvas: c, ax: Math.floor(w / 2), ay: 14 };
  sprites.set(key, s);
  return s;
}

// Divisórias de vidro em pedaços (para ordenar em profundidade com os personagens)
export function wallSprite(axis, len) {
  const key = `wall|${axis}|${len}`;
  let s = sprites.get(key);
  if (s) return s;
  const T = 0.4;
  const w = axis === 'x' ? len : T;
  const d = axis === 'x' ? T : len;
  const H = 36;
  const cw = Math.ceil((w + d) * HX) + 40;
  const ch = Math.ceil((w + d) * HY) + H + 24;
  const ax = Math.ceil(d * HX) + 20;
  const ay = H + 12;
  const face = axis === 'x' ? 'L' : 'R';
  const span = len;
  s = bake(cw, ch, ax, ay, (g, ox, oy) => {
    const o = { u: 0, v: 0, z: 0, w, d, h: H, top: '#fff6e0', left: '#f2cb86', right: '#e7bd75' };
    box(g, ox, oy, o);
    // parte de baixo sólida e vidro em cima, com montantes a cada tile
    decal(g, ox, oy, o, face, 0.0, 1.0, 12, 33, 'rgba(160,225,255,0.55)');
    decal(g, ox, oy, o, face, 0.0, 1.0, 31, 34, '#ffe9b8');
    for (let i = 0; i <= Math.floor(span); i++) {
      const u = Math.min(0.985, i / span);
      decal(g, ox, oy, o, face, u, Math.min(1, u + 0.02), 12, 33, '#ffe9b8');
    }
    decal(g, ox, oy, o, face, 0.06, 0.16, 20, 30, 'rgba(255,255,255,0.35)'); // reflexo
  }, { doShade: false });
  s.axis = axis;
  sprites.set(key, s);
  return s;
}

