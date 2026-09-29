// Constantes e regras compartilhadas entre servidor e cliente.
// Coordenadas do mundo em tiles (floats). Origem no canto de trás do mapa isométrico.

export const TICK_HZ = 20;
export const TICK_DT = 1 / TICK_HZ;
export const SNAP_EVERY = 2; // um snapshot a cada 2 ticks (10 Hz)

export const MAP = {
  w: 18,
  h: 18,
  server: { x: 8.5, y: 8.5, w: 1, h: 1 },
  desks: [
    { x: 4, y: 4, w: 2, h: 1 },
    { x: 12, y: 4, w: 2, h: 1 },
    { x: 4, y: 13, w: 2, h: 1 },
    { x: 12, y: 13, w: 2, h: 1 },
  ],
  coffee: { x: 15, y: 5, w: 1, h: 1 },
  printer: { x: 2, y: 11, w: 1, h: 1 },
  // decoração sem colisão
  plants: [
    { x: 0.6, y: 0.6 },
    { x: 17.4, y: 0.6 },
    { x: 0.6, y: 17.4 },
    { x: 17.4, y: 17.4 },
  ],
  bins: [
    { x: 7, y: 4.6 },
    { x: 11, y: 13.4 },
    { x: 3, y: 12.6 },
  ],
  cooler: { x: 9, y: 0.7 },
  // pontos onde os bugs podem nascer (bordas do mapa)
  portals: [
    { x: 9, y: 0.6 },
    { x: 9, y: 17.4 },
    { x: 0.6, y: 9 },
    { x: 17.4, y: 9 },
    { x: 1.4, y: 1.4 },
    { x: 16.6, y: 1.4 },
    { x: 1.4, y: 16.6 },
    { x: 16.6, y: 16.6 },
  ],
  // zona segura: onde jogadores nascem e renascem
  safeCenter: { x: 9, y: 9 },
  safeRadius: 2.6,
};

export function obstacles() {
  return [MAP.server, ...MAP.desks, MAP.coffee, MAP.printer];
}
const OBS = obstacles();

export const SAFE_SPOTS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return {
    x: MAP.safeCenter.x + Math.cos(a) * MAP.safeRadius,
    y: MAP.safeCenter.y + Math.sin(a) * MAP.safeRadius,
  };
});

export const PLAYER_RADIUS = 0.3;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function collides(x, y, r) {
  if (x < r || y < r || x > MAP.w - r || y > MAP.h - r) return true;
  for (const o of OBS) {
    const nx = clamp(x, o.x, o.x + o.w);
    const ny = clamp(y, o.y, o.y + o.h);
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

// Move com deslizamento por eixo. Retorna [x, y].
export function moveEntity(x, y, dx, dy, speed, dt, r) {
  let nx = x + dx * speed * dt;
  if (!collides(nx, y, r)) x = nx;
  const ny = y + dy * speed * dt;
  if (!collides(x, ny, r)) y = ny;
  return [x, y];
}

export function distToRect(x, y, o) {
  const nx = clamp(x, o.x, o.x + o.w);
  const ny = clamp(y, o.y, o.y + o.h);
  return Math.hypot(x - nx, y - ny);
}

export const CLASS_IDS = ['dev', 'qa', 'ops', 'tank', 'po'];

export const CLASSES = {
  dev: {
    name: 'Dev',
    tag: 'DEV',
    color: '#4FC3F7',
    desc: 'Dano à distância constante.',
    hp: 100,
    speed: 4.2,
    atk: { range: 7, dmg: 12, cd: 0.45 },
    skills: [
      { name: 'Rajada', short: 'RAJ', cd: 6, desc: 'Atinge os 3 bugs mais próximos.' },
      { name: 'Refactor', short: 'DASH', cd: 8, desc: 'Corrida rápida por 1,5 s.' },
      { name: 'Hotfix', short: 'ULT', cd: 45, desc: 'Explosão em área ao redor.' },
    ],
  },
  qa: {
    name: 'QA',
    tag: 'QA',
    color: '#FFD25A',
    desc: 'Marca bugs para todos causarem mais dano.',
    hp: 90,
    speed: 4.4,
    atk: { range: 6, dmg: 8, cd: 0.5 },
    skills: [
      { name: 'Caso de teste', short: 'TESTE', cd: 10, desc: 'Marca todos os bugs por perto.' },
      { name: 'Regressão', short: 'LENTO', cd: 12, desc: 'Deixa os bugs lentos.' },
      { name: 'Bug bash', short: 'ULT', cd: 50, desc: 'Dano e marca em todos os bugs.' },
    ],
  },
  ops: {
    name: 'DevOps',
    tag: 'OPS',
    color: '#6BE38A',
    desc: 'Cura o time, protege o servidor e revive aliados.',
    hp: 110,
    speed: 4.0,
    atk: { range: 5, dmg: 6, cd: 0.6 },
    skills: [
      { name: 'Patch', short: 'PATCH', cd: 10, desc: 'Cura aliados por perto.' },
      { name: 'Firewall', short: 'FIRE', cd: 20, desc: 'Servidor invulnerável por 4 s.' },
      { name: 'Rollback', short: 'ULT', cd: 60, desc: 'Revive todos e cura o time.' },
    ],
  },
  tank: {
    name: 'Tank',
    tag: 'TANK',
    color: '#FF9E44',
    desc: 'Linha de frente: atrai e segura os bugs.',
    hp: 180,
    speed: 3.8,
    atk: { range: 1.8, dmg: 14, cd: 0.6, aoe: true },
    skills: [
      { name: 'Grito', short: 'GRITO', cd: 10, desc: 'Bugs passam a te perseguir.' },
      { name: 'Escudo', short: 'ESC', cd: 12, desc: 'Reduz o dano recebido.' },
      { name: 'Muralha', short: 'ULT', cd: 45, desc: 'Empurra e atordoa os bugs.' },
    ],
  },
  po: {
    name: 'PO',
    tag: 'PO',
    color: '#FF7EB6',
    desc: 'Prioriza alvos: dano extra e pontos em dobro.',
    hp: 95,
    speed: 4.2,
    atk: { range: 6, dmg: 5, cd: 0.6 },
    skills: [
      { name: 'Priorizar', short: 'PRIO', cd: 6, desc: 'Marca 1 bug: +50% de dano e pontos x2.' },
      { name: 'Mudança de escopo', short: 'SCOPE', cd: 15, desc: 'Efeito aleatório: bom, ruim ou caos.' },
      { name: 'Sprint Review', short: 'ULT', cd: 60, desc: 'Congela os bugs e paga o combo em pontos.' },
    ],
  },
};

export const ENEMY_IDS = ['bug', 'clock', 'leak', 'mail', 'cal', 'boss', 'minimail'];

export const ENEMIES = {
  bug: { name: 'Bug', hp: 20, speed: 1.7, dmg: 8, r: 0.38, pts: 10, aggro: 3 },
  clock: { name: 'Deadline', hp: 12, speed: 3.3, dmg: 6, r: 0.34, pts: 12, aggro: 4 },
  leak: { name: 'Memory Leak', hp: 42, speed: 1.0, dmg: 10, r: 0.42, pts: 25, aggro: 2.5 },
  mail: { name: 'E-mail Urgente', hp: 24, speed: 1.9, dmg: 6, r: 0.38, pts: 15, aggro: 3 },
  minimail: { name: 'E-mail', hp: 8, speed: 2.4, dmg: 4, r: 0.28, pts: 5, aggro: 3 },
  cal: { name: 'Reunião', hp: 60, speed: 1.2, dmg: 4, r: 0.45, pts: 30, aggro: 3 },
  boss: { name: 'Segfault', hp: 600, speed: 1.0, dmg: 25, r: 0.9, pts: 300, aggro: 5 },
};

export const PICKUPS = ['pizza', 'cafe'];

export const LIMITS = {
  maxEnemies: 36, // teto fixo: vale para todos os aparelhos
  nickMin: 3,
  nickMax: 12,
};
