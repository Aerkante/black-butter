// Primitivas de pixel art SEM suavização: polígonos, linhas e elipses desenhados pixel a pixel,
// mais contorno e sombreamento automáticos. O canvas nunca borra as bordas.

export function rect(g, color, x, y, w, h) {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
}

// Preenche um polígono amostrando o centro de cada pixel (bordas duras).
export function fillPoly(g, pts, color, ox = 0, oy = 0) {
  g.fillStyle = color;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  const n = pts.length;
  const xs = [];
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const yc = y + 0.5;
    xs.length = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
        xs.push(a[0] + ((yc - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.ceil(xs[i] - 0.5);
      const x1 = Math.ceil(xs[i + 1] - 0.5);
      if (x1 > x0) g.fillRect(ox + x0, oy + y, x1 - x0, 1);
    }
  }
}

// Linha de Bresenham. dash > 0 alterna traço/vazio com esse comprimento.
export function line(g, x0, y0, x1, y1, color, dash = 0, thick = 1) {
  g.fillStyle = color;
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let i = 0;
  for (;;) {
    if (!dash || Math.floor(i / dash) % 2 === 0) g.fillRect(x0, y0, thick, thick);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
    i++;
  }
}

// Elipse em pixels. fill preenche com fillColor (pode ter alpha); o contorno usa color.
export function ellipse(g, cx, cy, rx, ry, color, { fill = null, dash = 0, phase = 0 } = {}) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  rx = Math.max(1, Math.round(rx));
  ry = Math.max(1, Math.round(ry));
  if (fill) {
    g.fillStyle = fill;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.floor(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
      g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }
  if (!color) return;
  g.fillStyle = color;
  let i = Math.round(phase);
  const plot = (x, y) => {
    if (dash && Math.floor(i / dash) % 2 === 1) return;
    g.fillRect(cx + x, cy + y, 1, 1);
  };
  // percorre o contorno por ângulo com passo fino o bastante para não deixar buracos
  const steps = Math.max(24, Math.ceil(2 * Math.PI * Math.max(rx, ry) * 1.6));
  let px = null;
  let py = null;
  for (let s = 0; s < steps; s++) {
    const a = (s / steps) * Math.PI * 2;
    const x = Math.round(Math.cos(a) * rx);
    const y = Math.round(Math.sin(a) * ry);
    if (x === px && y === py) continue;
    plot(x, y);
    px = x;
    py = y;
    i++;
  }
}

// Preenchimento em listras horizontais (aspecto de monitor antigo), barato de desenhar.
export function stripes(g, cx, cy, rx, ry, color, step = 3, phase = 0) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  rx = Math.max(1, Math.round(rx));
  ry = Math.max(1, Math.round(ry));
  g.fillStyle = color;
  for (let y = -ry + (Math.round(phase) % step); y <= ry; y += step) {
    const w = Math.floor(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
    g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

// Losango isométrico (contorno) centrado em (cx, cy).
export function diamond(g, cx, cy, rx, ry, color, dash = 0) {
  line(g, cx, cy - ry, cx + rx, cy, color, dash);
  line(g, cx + rx, cy, cx, cy + ry, color, dash);
  line(g, cx, cy + ry, cx - rx, cy, color, dash);
  line(g, cx - rx, cy, cx, cy - ry, color, dash);
}

// ----- acabamento: contorno e sombreamento por região de cor -----

function same(d, i, j) {
  return d[i] === d[j] && d[i + 1] === d[j + 1] && d[i + 2] === d[j + 2] && d[i + 3] === d[j + 3];
}

const dark = (v) => Math.round(v * 0.74);
const light = (v) => Math.round(v + (255 - v) * 0.2);

// Realce no topo/esquerda e sombra na direita/base de cada região de cor com mais de 1 pixel.
export function shade(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const g = canvas.getContext('2d');
  const src = g.getImageData(0, 0, w, h);
  const out = g.getImageData(0, 0, w, h);
  const s = src.data;
  const o = out.data;
  const at = (x, y) => (y * w + x) * 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = at(x, y);
      if (s[i + 3] < 200) continue;
      const left = x > 0 && same(s, i, at(x - 1, y));
      const right = x < w - 1 && same(s, i, at(x + 1, y));
      const up = y > 0 && same(s, i, at(x, y - 1));
      const down = y < h - 1 && same(s, i, at(x, y + 1));
      let mode = 0;
      if (left && !right) mode = -1; // borda direita: sombra
      else if (up && !down) mode = -1; // base: sombra
      else if (right && !left) mode = 1; // borda esquerda: realce
      else if (down && !up) mode = 1; // topo: realce
      if (!mode) continue;
      const f = mode < 0 ? dark : light;
      o[i] = f(o[i]);
      o[i + 1] = f(o[i + 1]);
      o[i + 2] = f(o[i + 2]);
    }
  }
  g.putImageData(out, 0, 0);
}

// Contorno de 1 pixel fora da silhueta (precisa de 1 pixel de margem).
export function outline(canvas, color = [11, 14, 26]) {
  const w = canvas.width;
  const h = canvas.height;
  const g = canvas.getContext('2d');
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const src = new Uint8ClampedArray(d);
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] > 0) continue;
      if (a(x - 1, y) > 0 || a(x + 1, y) > 0 || a(x, y - 1) > 0 || a(x, y + 1) > 0) {
        d[i] = color[0];
        d[i + 1] = color[1];
        d[i + 2] = color[2];
        d[i + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
}

export function finish(canvas, { doShade = true, doOutline = true } = {}) {
  if (doShade) shade(canvas);
  if (doOutline) outline(canvas);
  return canvas;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  return [c, g];
}
