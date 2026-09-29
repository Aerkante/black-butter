// Sprites em pixel art desenhados por código (nenhuma imagem para baixar).
// Cada quadro é desenhado uma vez num canvas pequeno e reutilizado (cache).
import {
  SKIN,
  HAIR_COLORS,
  OUTFIT_COLORS,
  BOTTOM_COLORS,
  JALECO_COLOR,
  JALECO_INDEX,
  lookKey,
} from '/shared/look.js';

const PAD_X = 2;
const PAD_T = 4;
const CW = 12; // largura do canvas do personagem (8 + 2*2)
const CH = 22; // altura (16 + topo 4 + base 2)

const cache = new Map();

function make(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

const r = (g, color, x, y, w, h) => {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
};

// ----- personagem -----

const HAIR_A = [
  [[2, 0, 4, 1], [1, 1, 6, 1], [1, 2, 1, 1], [6, 2, 1, 1]],
  [[2, 0, 4, 1]],
  [[1, -1, 6, 1], [0, 0, 8, 2], [0, 2, 2, 1], [6, 2, 2, 1]],
  [[2, 0, 4, 1], [1, 1, 6, 1], [1, 2, 1, 1], [6, 2, 1, 1], [3, -1, 3, 1], [4, -2, 2, 1]],
];
const CURTO = [[2, 0, 4, 1], [1, 1, 6, 1], [1, 2, 1, 1], [6, 2, 1, 1]];
const HAIR_B = [
  [...CURTO, [0, 2, 1, 7], [7, 2, 1, 7]],
  CURTO,
  [...CURTO, [3, -2, 2, 2]],
  [...CURTO, [7, 2, 1, 9], [6, 11, 2, 1]],
];

// pose: { bob, lly, rly, lax, lay, rax, ray, ext, spark }
export const POSES = {
  i0: {},
  i1: { bob: 1 },
  w0: { lly: -1, ray: -1, lay: 1 },
  w1: { bob: -1 },
  w2: { rly: -1, lay: -1, ray: 1 },
  w3: { bob: -1 },
  a0: { bob: 1, rax: 1 },
  a1: { ext: 1 },
  a2: { ray: -1 },
  hit: { bob: 1, flash: true },
  down: { down: true },
};

function drawCharacter(g, look, pose) {
  const A = look.body === 0;
  const skin = SKIN[look.skin];
  const hair = HAIR_COLORS[look.hairColor].hex;
  const jaleco = look.outfit === JALECO_INDEX;
  const shirt = jaleco ? JALECO_COLOR : OUTFIT_COLORS[look.outfitColor];
  const pants = BOTTOM_COLORS[look.bottomColor];
  const bob = pose.bob || 0;
  const px = (x, y, w, h, c) => r(g, c, PAD_X + x, PAD_T + y, w, h);
  const long = look.outfit !== 0; // camiseta tem manga curta

  // mochila (atrás do corpo)
  if (look.backpack) px(-1, 7 + bob, 2, 4, '#E5484D');

  // pernas
  const lly = pose.lly || 0;
  const rly = pose.rly || 0;
  const skirt = !A && look.bottom === 1;
  const shorts = A && look.bottom === 1;
  const legTop = A ? 12 : 13;
  const legH = 3 - (A ? 0 : 1);
  for (const [lx, off] of [[2, lly], [4, rly]]) {
    if (skirt) {
      px(lx, 14 + off, 2, 1, skin);
    } else if (shorts) {
      px(lx, 12 + off, 2, 2, pants);
      px(lx, 14 + off, 2, 1, skin);
    } else {
      px(lx, legTop + off, 2, legH, pants);
    }
    px(lx, 15 + off, 2, 1, '#1B1F2B');
  }
  if (!A) {
    px(1, 11, 6, skirt ? 3 : 2, pants);
  }

  // cabeça
  px(2, 2 + bob, 4, 1, skin);
  px(1, 3 + bob, 6, 3, skin);
  px(3, 6 + bob, 2, 1, skin);
  const hairRects = (A ? HAIR_A : HAIR_B)[look.hairStyle];
  for (const [x, y, w, h] of hairRects) px(x, y + bob, w, h, hair);
  px(2, 3 + bob, 1, 1, '#1B1F2B');
  px(5, 3 + bob, 1, 1, '#1B1F2B');
  px(3, 5 + bob, 2, 1, '#B5654E');
  if (look.glasses === 1) {
    px(1, 3 + bob, 6, 1, '#1B1F2B');
    px(2, 3 + bob, 1, 1, '#CFE9FF');
    px(5, 3 + bob, 1, 1, '#CFE9FF');
  } else if (look.glasses === 2) {
    px(1, 3 + bob, 3, 2, '#0D0F16');
    px(4, 3 + bob, 3, 2, '#0D0F16');
    px(1, 3 + bob, 1, 1, '#4FC3F7');
  }

  // tronco
  if (look.outfit === 2) px(A ? 2 : 3, 6 + bob, A ? 4 : 2, 1, shirt); // capuz do moletom
  const tx = A ? 1 : 2;
  const tw = A ? 6 : 4;
  const th = A ? 5 : 4;
  px(tx, 7 + bob, tw, th, shirt);
  px(tx, 6 + th + bob, tw, 1, 'rgba(0,0,0,0.2)');
  if (look.outfit === 1) {
    px(3, 7 + bob, 2, 1, '#F7F3E8'); // colarinho
    px(4, 8 + bob, 1, th - 2, 'rgba(0,0,0,0.25)'); // botões
  } else if (look.outfit === 2) {
    px(tx + 1, 6 + th + bob - 1, tw - 2, 1, 'rgba(0,0,0,0.25)'); // bolso
  } else if (jaleco) {
    px(3, 7 + bob, 2, 2, '#F7F3E8');
    px(tx + tw - 2, 9 + bob, 1, 1, '#4C5BA8');
  }
  if (look.badge) {
    const bx = A ? 5 : 4;
    px(bx, 8 + bob, 1, 2, '#F7F3E8');
    px(bx, 8 + bob, 1, 1, '#FFD25A');
  }

  // braços
  const lx = A ? 0 : 1;
  const rx = A ? 7 : 6;
  const sleeve = long ? 3 : 2;
  const arm = (x, dx, dy) => {
    px(x + dx, 7 + dy + bob, 1, sleeve, shirt);
    px(x + dx, 7 + sleeve + dy + bob, 1, 4 - sleeve, skin);
  };
  arm(lx, pose.lax || 0, pose.lay || 0);
  if (pose.ext) {
    px(rx, 8 + bob, 1, 1, shirt);
    px(rx + 1, 8 + bob, A ? 2 : 3, 1, skin);
  } else {
    arm(rx, pose.rax || 0, pose.ray || 0);
  }
}

// Retorna { canvas, w, h } do quadro pedido (com cache).
export function characterFrame(look, poseName) {
  const key = `${lookKey(look)}|${poseName}`;
  let f = cache.get(key);
  if (f) return f;
  const pose = POSES[poseName] || POSES.i0;
  const [c, g] = make(CW, CH);
  drawCharacter(g, look, pose);
  if (pose.flash) {
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fillRect(0, 0, CW, CH);
    g.globalCompositeOperation = 'source-over';
  }
  let out = c;
  let w = CW;
  let h = CH;
  if (pose.down) {
    const [c2, g2] = make(CH, CW);
    g2.translate(CH, 0);
    g2.rotate(Math.PI / 2);
    g2.drawImage(c, 0, 0);
    out = c2;
    w = CH;
    h = CW;
  }
  f = { canvas: out, w, h, ax: PAD_X + 4, ay: PAD_T + 16 }; // âncora: pés
  cache.set(key, f);
  if (cache.size > 900) cache.delete(cache.keys().next().value);
  return f;
}

// ----- inimigos (2 quadros cada) -----

const ENEMY_DRAW = {
  bug(g, f) {
    const c = '#E5484D';
    const by = f ? -1 : 0;
    const gy = f ? 1 : 0;
    r(g, c, 3, 3 + by, 6, 4);
    r(g, '#F7F3E8', 4, 4 + by, 1, 1);
    r(g, '#F7F3E8', 7, 4 + by, 1, 1);
    r(g, '#1B1F2B', 5, 6 + by, 2, 1);
    r(g, c, 3 + f, 1 + by, 1, 1);
    r(g, c, 8 + f, 1 + by, 1, 1);
    r(g, c, 4 + f, 2 + by, 1, 1);
    r(g, c, 7 + f, 2 + by, 1, 1);
    for (const [x, y] of [[2, 4], [9, 4], [2, 6], [9, 6], [3, 7], [8, 7]]) r(g, c, x, y + gy, 1, 1);
  },
  leak(g, f) {
    const c = '#6BE38A';
    const by = f ? 1 : 0;
    r(g, c, 4, 2 + by, 4, 1);
    r(g, c, 3, 3 + by, 6, 4);
    r(g, c, 2, 4 + by, 1, 2);
    r(g, c, 9, 4 + by, 1, 2);
    r(g, c, 4, 7 + by, 4, 1);
    r(g, '#1B1F2B', 4, 4 + by, 1, 1);
    r(g, '#1B1F2B', 7, 4 + by, 1, 1);
    r(g, '#1B1F2B', 5, 6 + by, 2, 1);
    r(g, c, 8, 8 + f, 1, 1);
  },
  clock(g, f) {
    const sx = f ? 1 : -1;
    r(g, '#F7F3E8', 3 + sx, 2, 8, 7);
    r(g, '#E5484D', 7 + sx, 3, 1, 3);
    r(g, '#E5484D', 7 + sx, 5, 2, 1);
    r(g, '#1B1F2B', 4 + sx, 9, 1, 1);
    r(g, '#1B1F2B', 9 + sx, 9, 1, 1);
    r(g, '#E5484D', 4 + sx, 1, 2, 1);
    r(g, '#E5484D', 8 + sx, 1, 2, 1);
  },
  mail(g, f) {
    const by = f ? -1 : 0;
    r(g, '#F7F3E8', 3, 3 + by, 8, 6);
    if (f) {
      r(g, '#B8B09A', 4, 1 + by, 6, 1);
      r(g, '#B8B09A', 3, 2 + by, 1, 2);
      r(g, '#B8B09A', 10, 2 + by, 1, 2);
    } else {
      r(g, '#B8B09A', 3, 3, 8, 1);
      for (let i = 0; i < 3; i++) {
        r(g, '#B8B09A', 4 + i, 4 + i, 1, 1);
        r(g, '#B8B09A', 9 - i, 4 + i, 1, 1);
      }
    }
    r(g, '#E5484D', 10, 2 + by, 2, 2);
  },
  cal(g, f) {
    const by = f ? -1 : 0;
    r(g, '#F7F3E8', 3, 2 + by, 8, 8);
    r(g, '#E5484D', 3, 2 + by, 8, 2);
    for (const [x, y] of [[4, 5], [7, 5], [4, 7], [7, 7]]) r(g, '#1B1F2B', x, y + by, 2, 1);
  },
};

export function enemyFrame(type, f) {
  const name = type === 'boss' ? 'bug' : type === 'minimail' ? 'mail' : type;
  const key = `e|${name}|${f}`;
  let cached = cache.get(key);
  if (cached) return cached;
  const [c, g] = make(14, 12);
  ENEMY_DRAW[name](g, f ? 1 : 0);
  cached = { canvas: c, w: 14, h: 12, ax: 7, ay: 10 };
  cache.set(key, cached);
  return cached;
}

// Cor de uma silhueta, usada para o chefe (bug maior, roxo-avermelhado).
export function tintedEnemy(type, f, color) {
  const key = `t|${type}|${f}|${color}`;
  let cached = cache.get(key);
  if (cached) return cached;
  const base = enemyFrame(type, f);
  const [c, g] = make(base.w, base.h);
  g.drawImage(base.canvas, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color;
  g.globalAlpha = 0.35;
  g.fillRect(0, 0, base.w, base.h);
  cached = { ...base, canvas: c };
  cache.set(key, cached);
  return cached;
}

// ----- itens -----

export function pickupFrame(kind) {
  const key = `p|${kind}`;
  let f = cache.get(key);
  if (f) return f;
  const [c, g] = make(10, 10);
  if (kind === 0) {
    // pizza
    r(g, '#FFD25A', 2, 3, 6, 4);
    r(g, '#FF9E44', 3, 7, 4, 1);
    r(g, '#E5484D', 3, 4, 1, 1);
    r(g, '#E5484D', 6, 5, 1, 1);
    r(g, '#B57B4A', 2, 2, 6, 1);
  } else {
    // café
    r(g, '#F7F3E8', 2, 3, 5, 5);
    r(g, '#5B3A29', 2, 3, 5, 2);
    r(g, '#F7F3E8', 7, 4, 1, 3);
    r(g, '#8FA3C7', 1, 8, 7, 1);
  }
  f = { canvas: c, w: 10, h: 10, ax: 5, ay: 9 };
  cache.set(key, f);
  return f;
}

// Bolha de "?" do PO (usada em efeitos) e ícones pequenos
export function classIcon(cls) {
  const key = `ci|${cls}`;
  let f = cache.get(key);
  if (f) return f;
  const [c, g] = make(7, 7);
  const draws = {
    dev: () => {
      r(g, '#4FC3F7', 0, 1, 1, 1);
      r(g, '#4FC3F7', 1, 2, 1, 1);
      r(g, '#4FC3F7', 0, 3, 1, 1);
      r(g, '#4FC3F7', 4, 1, 1, 3);
      r(g, '#4FC3F7', 5, 2, 1, 1);
    },
    qa: () => {
      r(g, '#FFD25A', 1, 0, 3, 1);
      r(g, '#FFD25A', 0, 1, 1, 3);
      r(g, '#FFD25A', 4, 1, 1, 3);
      r(g, '#FFD25A', 1, 4, 3, 1);
      r(g, '#FFD25A', 4, 5, 2, 1);
    },
    ops: () => {
      r(g, '#6BE38A', 2, 0, 2, 5);
      r(g, '#6BE38A', 0, 2, 6, 1);
    },
    tank: () => {
      r(g, '#FF9E44', 0, 0, 6, 3);
      r(g, '#FF9E44', 1, 3, 4, 1);
      r(g, '#FF9E44', 2, 4, 2, 1);
    },
    po: () => {
      r(g, '#FF7EB6', 1, 0, 3, 1);
      r(g, '#FF7EB6', 0, 1, 1, 1);
      r(g, '#FF7EB6', 4, 1, 1, 1);
      r(g, '#FF7EB6', 4, 2, 1, 1);
      r(g, '#FF7EB6', 2, 3, 2, 1);
      r(g, '#FF7EB6', 2, 5, 1, 1);
    },
  };
  (draws[cls] || draws.dev)();
  f = { canvas: c, w: 7, h: 7, ax: 3, ay: 3 };
  cache.set(key, f);
  return f;
}

// Nome da pose para o estado atual do jogador (animações por quadros).
export function poseFor(flags, moving, t) {
  if (flags & 1) return 'down';
  if (flags & 8) return 'hit';
  if (flags & 16) {
    const ph = Math.floor((t * 10) % 3);
    return ph === 0 ? 'a0' : ph === 1 ? 'a1' : 'a2';
  }
  if (moving) return 'w' + (Math.floor(t * 8) % 4);
  return 'i' + (Math.floor(t * 2) % 2);
}
