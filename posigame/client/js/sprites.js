// Sprites em pixel art desenhados por código (nenhuma imagem para baixar).
// Cada quadro é desenhado uma vez num canvas pequeno e reutilizado (cache).
import { finish, makeCanvas as make, rect as r } from './px.js';
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
const CW = 14; // largura do canvas do personagem (8 + margem para braço estendido e contorno)
const CH = 22; // altura (16 + topo 4 + base 2)

const cache = new Map();

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
  sleep: { down: true, sleep: true },
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
  if (look.backpack) px(-1, 7 + bob, 2, 4, '#ff3b4e');

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
    px(lx, 15 + off, 2, 1, '#0b0e1a');
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
  if (pose.sleep) {
    px(2, 3 + bob, 1, 2, skin); // olhos fechados
    px(5, 3 + bob, 1, 2, skin);
    px(2, 4 + bob, 1, 1, '#0b0e1a');
    px(5, 4 + bob, 1, 1, '#0b0e1a');
  } else {
    px(2, 3 + bob, 1, 1, '#0b0e1a');
    px(5, 3 + bob, 1, 1, '#0b0e1a');
  }
  px(3, 5 + bob, 2, 1, '#B5654E');
  if (look.glasses === 1) {
    px(1, 3 + bob, 6, 1, '#0b0e1a');
    px(2, 3 + bob, 1, 1, '#CFE9FF');
    px(5, 3 + bob, 1, 1, '#CFE9FF');
  } else if (look.glasses === 2) {
    px(1, 3 + bob, 3, 2, '#0D0F16');
    px(4, 3 + bob, 3, 2, '#0D0F16');
    px(1, 3 + bob, 1, 1, '#2bc8ff');
  }

  // tronco
  if (look.outfit === 2) px(A ? 2 : 3, 6 + bob, A ? 4 : 2, 1, shirt); // capuz do moletom
  const tx = A ? 1 : 2;
  const tw = A ? 6 : 4;
  const th = A ? 5 : 4;
  px(tx, 7 + bob, tw, th, shirt);
  px(tx, 6 + th + bob, tw, 1, 'rgba(0,0,0,0.2)');
  if (look.outfit === 1) {
    px(3, 7 + bob, 2, 1, '#fff6e0'); // colarinho
    px(4, 8 + bob, 1, th - 2, 'rgba(0,0,0,0.25)'); // botões
  } else if (look.outfit === 2) {
    px(tx + 1, 6 + th + bob - 1, tw - 2, 1, 'rgba(0,0,0,0.25)'); // bolso
  } else if (jaleco) {
    px(3, 7 + bob, 2, 2, '#fff6e0');
    px(tx + tw - 2, 9 + bob, 1, 1, '#4C5BA8');
  }
  if (look.badge) {
    const bx = A ? 5 : 4;
    px(bx, 8 + bob, 1, 2, '#fff6e0');
    px(bx, 8 + bob, 1, 1, '#ffd426');
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
  finish(c);
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
    const c = '#ff3b4e';
    const by = f ? -1 : 0;
    const gy = f ? 1 : 0;
    r(g, c, 3, 3 + by, 6, 4);
    r(g, '#fff6e0', 4, 4 + by, 1, 1);
    r(g, '#fff6e0', 7, 4 + by, 1, 1);
    r(g, '#0b0e1a', 5, 6 + by, 2, 1);
    r(g, c, 3 + f, 1 + by, 1, 1);
    r(g, c, 8 + f, 1 + by, 1, 1);
    r(g, c, 4 + f, 2 + by, 1, 1);
    r(g, c, 7 + f, 2 + by, 1, 1);
    for (const [x, y] of [[2, 4], [9, 4], [2, 6], [9, 6], [3, 7], [8, 7]]) r(g, c, x, y + gy, 1, 1);
  },
  leak(g, f) {
    const c = '#3dff8b';
    const by = f ? 1 : 0;
    r(g, c, 4, 2 + by, 4, 1);
    r(g, c, 3, 3 + by, 6, 4);
    r(g, c, 2, 4 + by, 1, 2);
    r(g, c, 9, 4 + by, 1, 2);
    r(g, c, 4, 7 + by, 4, 1);
    r(g, '#0b0e1a', 4, 4 + by, 1, 1);
    r(g, '#0b0e1a', 7, 4 + by, 1, 1);
    r(g, '#0b0e1a', 5, 6 + by, 2, 1);
    r(g, c, 8, 8 + f, 1, 1);
  },
  clock(g, f) {
    const sx = f ? 1 : -1;
    r(g, '#fff6e0', 3 + sx, 2, 8, 7);
    r(g, '#ff3b4e', 7 + sx, 3, 1, 3);
    r(g, '#ff3b4e', 7 + sx, 5, 2, 1);
    r(g, '#0b0e1a', 4 + sx, 9, 1, 1);
    r(g, '#0b0e1a', 9 + sx, 9, 1, 1);
    r(g, '#ff3b4e', 4 + sx, 1, 2, 1);
    r(g, '#ff3b4e', 8 + sx, 1, 2, 1);
  },
  mail(g, f) {
    const by = f ? -1 : 0;
    r(g, '#fff6e0', 3, 3 + by, 8, 6);
    if (f) {
      r(g, '#d6c08a', 4, 1 + by, 6, 1);
      r(g, '#d6c08a', 3, 2 + by, 1, 2);
      r(g, '#d6c08a', 10, 2 + by, 1, 2);
    } else {
      r(g, '#d6c08a', 3, 3, 8, 1);
      for (let i = 0; i < 3; i++) {
        r(g, '#d6c08a', 4 + i, 4 + i, 1, 1);
        r(g, '#d6c08a', 9 - i, 4 + i, 1, 1);
      }
    }
    r(g, '#ff3b4e', 10, 2 + by, 2, 2);
  },
  cal(g, f) {
    const by = f ? -1 : 0;
    r(g, '#fff6e0', 3, 2 + by, 8, 8);
    r(g, '#ff3b4e', 3, 2 + by, 8, 2);
    for (const [x, y] of [[4, 5], [7, 5], [4, 7], [7, 7]]) r(g, '#0b0e1a', x, y + by, 2, 1);
  },
};

function enemyName(type) {
  return type === 'boss' ? 'bug' : type === 'minimail' ? 'mail' : type;
}

function enemyRaw(type, f, tint) {
  const [c, g] = make(16, 14);
  g.translate(1, 1);
  ENEMY_DRAW[enemyName(type)](g, f ? 1 : 0);
  g.translate(-1, -1);
  if (tint) {
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = 0.4;
    g.fillStyle = tint;
    g.fillRect(0, 0, 16, 14);
  }
  return c;
}

export function enemyFrame(type, f) {
  const name = enemyName(type);
  const key = `e|${name}|${f}`;
  let cached = cache.get(key);
  if (cached) return cached;
  cached = { canvas: finish(enemyRaw(type, f)), w: 16, h: 14, ax: 8, ay: 11 };
  cache.set(key, cached);
  return cached;
}

// Versão colorida (congelado = azul, dano = branco, chefe = laranja), com contorno próprio.
export function tintedEnemy(type, f, color) {
  const key = `t|${enemyName(type)}|${f}|${color}`;
  let cached = cache.get(key);
  if (cached) return cached;
  cached = { canvas: finish(enemyRaw(type, f, color)), w: 16, h: 14, ax: 8, ay: 11 };
  cache.set(key, cached);
  return cached;
}

// ----- itens -----

export function pickupFrame(kind) {
  const key = `p|${kind}`;
  let f = cache.get(key);
  if (f) return f;
  const [c, g] = make(12, 12);
  g.translate(1, 1);
  const art = [
    // 0 pizza
    () => {
      r(g, '#E8873A', 1, 1, 8, 2);
      for (const [x, y, w] of [[2, 3, 6], [2, 4, 5], [3, 5, 4], [3, 6, 3], [4, 7, 2], [4, 8, 1]]) r(g, '#FFD426', x, y, w, 1);
      for (const [x, y] of [[3, 3], [5, 4], [4, 6]]) r(g, '#FF3B4E', x, y, 1, 1);
    },
    // 1 café
    () => {
      r(g, '#FFF6E0', 2, 3, 5, 5);
      r(g, '#7A3B14', 2, 3, 5, 2);
      r(g, '#FFF6E0', 7, 4, 2, 1);
      r(g, '#FFF6E0', 8, 5, 1, 2);
      r(g, '#FFF6E0', 7, 6, 1, 1);
      r(g, '#D9C9A0', 3, 0, 1, 2);
      r(g, '#D9C9A0', 5, 1, 1, 2);
      r(g, '#3B4DC4', 1, 8, 8, 1);
    },
    // 2 crachá VIP (escudo)
    () => {
      r(g, '#2BC8FF', 2, 1, 6, 1);
      r(g, '#2BC8FF', 1, 2, 8, 4);
      r(g, '#2BC8FF', 2, 6, 6, 1);
      r(g, '#2BC8FF', 3, 7, 4, 1);
      r(g, '#2BC8FF', 4, 8, 2, 1);
      r(g, '#FFF6E0', 4, 3, 2, 3);
      r(g, '#FFF6E0', 3, 4, 4, 1);
    },
    // 3 energético (lata)
    () => {
      r(g, '#FFD426', 3, 1, 4, 8);
      r(g, '#D9C9A0', 3, 1, 4, 1);
      r(g, '#0B0E1A', 3, 4, 4, 3);
      r(g, '#FFD426', 5, 4, 1, 1);
      r(g, '#FFD426', 4, 5, 2, 1);
      r(g, '#FFD426', 4, 6, 1, 1);
    },
    // 4 deploy (bomba)
    () => {
      r(g, '#23297A', 3, 2, 4, 1);
      r(g, '#23297A', 2, 3, 6, 6);
      r(g, '#23297A', 3, 9, 4, 0);
      r(g, '#FF3B4E', 2, 6, 6, 1);
      r(g, '#FFF6E0', 3, 4, 1, 1);
      r(g, '#D9C9A0', 6, 1, 1, 1);
      r(g, '#FFD426', 7, 0, 2, 1);
    },
    // 5 ar-condicionado (floco de neve)
    () => {
      r(g, '#7FE3FF', 4, 0, 2, 10);
      r(g, '#7FE3FF', 0, 4, 10, 2);
      for (const [x, y] of [[1, 1], [2, 2], [7, 1], [6, 2], [1, 8], [2, 7], [7, 8], [6, 7]]) r(g, '#7FE3FF', x, y, 1, 1);
      r(g, '#FFF6E0', 4, 4, 2, 2);
    },
    // 6 bônus (estrela)
    () => {
      for (const [x, y, w] of [[4, 0, 2], [4, 1, 2], [3, 2, 4], [0, 3, 10], [1, 4, 8], [2, 5, 6], [3, 6, 4], [2, 7, 2], [6, 7, 2], [1, 8, 2], [7, 8, 2]]) r(g, '#FFE45C', x, y, w, 1);
      r(g, '#FFF6E0', 4, 3, 2, 2);
    },
    // 7 backup (disquete)
    () => {
      r(g, '#3DFF8B', 1, 1, 8, 8);
      r(g, '#FFF6E0', 2, 1, 6, 3);
      r(g, '#0B0E1A', 3, 6, 4, 3);
      r(g, '#3DFF8B', 5, 7, 1, 1);
      r(g, '#0B0E1A', 7, 1, 1, 2);
    },
  ];
  (art[kind] || art[0])();
  g.translate(-1, -1);
  f = { canvas: finish(c), w: 12, h: 12, ax: 6, ay: 11 };
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
      r(g, '#2bc8ff', 0, 1, 1, 1);
      r(g, '#2bc8ff', 1, 2, 1, 1);
      r(g, '#2bc8ff', 0, 3, 1, 1);
      r(g, '#2bc8ff', 4, 1, 1, 3);
      r(g, '#2bc8ff', 5, 2, 1, 1);
    },
    qa: () => {
      r(g, '#ffd426', 1, 0, 3, 1);
      r(g, '#ffd426', 0, 1, 1, 3);
      r(g, '#ffd426', 4, 1, 1, 3);
      r(g, '#ffd426', 1, 4, 3, 1);
      r(g, '#ffd426', 4, 5, 2, 1);
    },
    ops: () => {
      r(g, '#3dff8b', 2, 0, 2, 5);
      r(g, '#3dff8b', 0, 2, 6, 1);
    },
    tank: () => {
      r(g, '#ff8a1f', 0, 0, 6, 3);
      r(g, '#ff8a1f', 1, 3, 4, 1);
      r(g, '#ff8a1f', 2, 4, 2, 1);
    },
    po: () => {
      r(g, '#ff4fa3', 1, 0, 3, 1);
      r(g, '#ff4fa3', 0, 1, 1, 1);
      r(g, '#ff4fa3', 4, 1, 1, 1);
      r(g, '#ff4fa3', 4, 2, 1, 1);
      r(g, '#ff4fa3', 2, 3, 2, 1);
      r(g, '#ff4fa3', 2, 5, 1, 1);
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
  if (flags & 128) return 'sleep';
  if (flags & 8) return 'hit';
  if (flags & 16) {
    const ph = Math.floor((t * 10) % 3);
    return ph === 0 ? 'a0' : ph === 1 ? 'a1' : 'a2';
  }
  if (moving) return 'w' + (Math.floor(t * 8) % 4);
  return 'i' + (Math.floor(t * 2) % 2);
}
