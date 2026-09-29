// Constantes e regras compartilhadas entre servidor e cliente.
// Coordenadas do mundo em tiles (floats). Origem no canto de trás do mapa isométrico.

export const TICK_HZ = 20;
export const TICK_DT = 1 / TICK_HZ;
export const SNAP_EVERY = 2; // um snapshot a cada 2 ticks (10 Hz)

// Planta do escritório (em tiles). Salas com paredes de vidro e portas de 2 tiles,
// salão com as mesas ao redor e o servidor no meio do espaço aberto.
const T = 0.4; // espessura das divisórias
const wallH = (x, y, len) => ({ x, y: y - T / 2, w: len, h: T }); // divisória ao longo de x
const wallV = (x, y, len) => ({ x: x - T / 2, y, w: T, h: len }); // divisória ao longo de y

const ROOMS = [
  { id: 'reuniao', name: 'REUNIÃO', x: 0, y: 0, w: 11, h: 10, floor: 'wood', plate: '#3B4DC4' },
  { id: 'diretor', name: 'DIRETOR', x: 16, y: 0, w: 9, h: 10, floor: 'porcelain', plate: '#7A3BC4' },
  { id: 'componentes', name: 'COMPONENTES', x: 0, y: 34.5, w: 10.5, h: 7, floor: 'porcelain', plate: '#8A93A8' },
  { id: 'seguranca', name: 'SEGURANÇA', x: 0, y: 41.5, w: 10.5, h: 6, floor: 'porcelain', plate: '#1FB86A' },
  { id: 'copa', name: 'COPA', x: 0, y: 47.5, w: 13, h: 7.5, floor: 'porcelain', plate: '#FF8A1F' },
];

const WALLS = [
  // reunião (porta em x 4.5..6.5) e diretor (porta em x 19.5..21.5)
  wallH(0, 10, 4.5), wallH(6.5, 10, 4.5), wallV(11, 0, 10),
  wallH(16, 10, 3.5), wallH(21.5, 10, 3.5), wallV(16, 0, 10), wallV(25, 0, 10),
  // componentes (porta em y 36.5..38.5) e segurança (porta em y 43.5..45.5)
  wallH(0, 34.5, 10.5), wallV(10.5, 34.5, 2), wallV(10.5, 38.5, 3), wallH(0, 41.5, 10.5),
  wallV(10.5, 41.5, 2), wallV(10.5, 45.5, 2),
  // copa (portas: topo em x 10.5..12.5 e lado em y 50.5..53)
  wallH(0, 47.5, 10.5), wallH(12.5, 47.5, 0.5), wallV(13, 47.5, 3), wallV(13, 53, 2),
];

// Setores da empresa (cada mesa do salão pertence a um deles)
export const SECTORS = {
  secretaria: { name: 'Secretária executiva', short: 'SECRETARIA', color: '#B18CFF', where: 'mesa individual no canto direito, perto da sala do diretor' },
  fiscal: { name: 'Fiscal', short: 'FISCAL', color: '#2BC8FF', where: 'as duas baias de cima, à esquerda' },
  sesmt: { name: 'SESMT', short: 'SESMT', color: '#3DFF8B', where: 'as duas baias logo abaixo das de Fiscal' },
  cadastro: { name: 'Cadastro', short: 'CADASTRO', color: '#7FE3FF', where: 'baia larga abaixo das de SESMT, em frente às salas de baixo' },
  projetos: { name: 'Projetos', short: 'PROJETOS', color: '#FF8A1F', where: 'coluna da direita, abaixo da secretária' },
  desenvolvimento: { name: 'Desenvolvimento', short: 'DESENV.', color: '#FFD426', where: 'abaixo de Projetos' },
  financeiro: { name: 'Financeiro', short: 'FINANCEIRO', color: '#FF4FA3', where: 'fim da coluna da direita' },
};

// Baias em "+": 4 lugares (um em cada canto do "+"), com divisórias no meio.
// [x, y, largura, altura, setor]; os braços têm BAIA_ARM de espessura.
export const BAIA_ARM = 1.9;
const BAIAS = [
  [1.6, 13.4, 5.5, 5.5, 'fiscal'], [8.9, 13.4, 5.5, 5.5, 'fiscal'],
  [1.6, 20.8, 5.5, 5.5, 'sesmt'], [8.9, 20.8, 5.5, 5.5, 'sesmt'],
  [1.9, 27.3, 12.4, 5.5, 'cadastro'],
  [29.8, 16.9, 5.5, 5.5, 'projetos'], [29.8, 23.8, 5.5, 5.5, 'desenvolvimento'], [29.8, 30.7, 5.5, 5.5, 'financeiro'],
];
const solid = (t, x, y, w, h, extra = {}) => ({ t, x, y, w, h, solid: true, ...extra });
const deco = (t, x, y) => ({ t, x, y, solid: false });
const baia = (x, y, w, h, sector) => {
  const ax = (w - BAIA_ARM) / 2;
  const ay = (h - BAIA_ARM) / 2;
  const cx = ax / 2;
  const cy = ay / 2;
  return [
    solid('baia', x, y, w, h, { sector, rects: [{ x: x + ax, y, w: BAIA_ARM, h }, { x, y: y + ay, w, h: BAIA_ARM }] }),
    ...[[cx, cy], [w - cx, cy], [cx, h - cy], [w - cx, h - cy]].map(([dx, dy]) => deco('chair', x + dx, y + dy)),
  ];
};

// Canto secreto da sala de componentes: atacar aqui faz o personagem deitar e dormir
export const EGG = { x: 0.3, y: 38.9, w: 2.4, h: 2.1 };

const PROPS = [
  // salão
  ...BAIAS.flatMap(([x, y, w, h, sector]) => baia(x, y, w, h, sector)),
  solid('desk', 31.6, 12.9, 2, 1, { sector: 'secretaria' }), deco('chair', 32.6, 14.65), deco('bin', 34.4, 13.4),
  // impressora, bebedouro e lixeiras encostados na parede da esquerda
  solid('printer', 0.2, 10.6, 1, 1), deco('bin', 0.5, 12.1),
  solid('cooler', 0.2, 24.5, 0.9, 0.9), deco('bin', 0.5, 26),
  // plantas em cantos e junto às paredes
  deco('plant', 0.7, 33.2), deco('plant', 11.5, 9.4), deco('plant', 15.2, 9.4), deco('plant', 25.9, 9.4), deco('plant', 37.2, 0.9),
  deco('plant', 11.4, 35.2), deco('plant', 13.9, 46.8),
  // sala de reunião
  solid('table6', 2.5, 3.5, 6, 2),
  ...[3.5, 4.9, 6.3, 7.7].flatMap((x) => [deco('chair', x, 2.9), deco('chair', x, 6.1)]),
  deco('chair', 1.7, 4.5), deco('chair', 9.3, 4.5),
  deco('plant', 0.8, 9), deco('plant', 10.2, 9), solid('cooler', 9.9, 0.3, 0.9, 0.9), deco('bin', 9.2, 0.9),
  // sala do diretor (simples: uma mesa, duas cadeiras e uma planta)
  solid('bigdesk', 18.8, 3, 3.2, 1.3), deco('chair', 20.4, 2.3), deco('chair', 20.4, 5.1),
  deco('plant', 24, 9),
  // sala de componentes: três mesas em U, mesa redonda com 3 cadeiras, lixeira, sem armários
  solid('workbench', 2.4, 35, 5.6, 1.1), solid('workbench', 0.5, 35, 1.1, 3.7), solid('workbench', 8.9, 35, 1.1, 1.5),
  solid('roundtable', 4.4, 37.5, 1.8, 1.8),
  deco('chair', 3.8, 38.4), deco('chair', 6.8, 38.4), deco('chair', 5.3, 40),
  deco('bin', 9.6, 36.9),
  // sala de segurança do trabalho
  solid('lockerY', 0.15, 42, 0.7, 3.6), solid('table', 4, 43.2, 2.6, 1.2),
  deco('chair', 4.6, 42.6), deco('chair', 6, 42.6), deco('chair', 4.8, 45.1), deco('chair', 6.2, 45.1),
  deco('sign', 8.3, 42.3), deco('sign', 8.7, 46.5), deco('sign', 2.5, 46.5),
  // copa
  solid('counterY', 0.15, 48.3, 0.9, 5.4), solid('fridge', 0.2, 53.9, 1, 1), solid('coffee', 1.3, 48.1, 1, 1), solid('vending', 11.9, 53.9, 1, 1),
  ...[[4.6, 49.5], [8.6, 49.5]].flatMap(([x, y]) => [solid('table2', x, y, 1.6, 1.6), deco('chair', x + 0.8, y - 0.5), deco('chair', x + 0.8, y + 2.2)]),
  // mesa comprida na parte de baixo da copa
  solid('tableLong', 3, 53.3, 6.2, 1.3), ...[3.8, 5.3, 6.8, 8.3].map((x) => deco('chair', x, 52.7)),
  solid('cooler', 11.9, 48.1, 0.9, 0.9), deco('bin', 11.4, 49.6),
  // ponto eletrônico: caixinha na parede da copa (lado do salão), acima da porta lateral
  solid('totem', 13.2, 48.4, 0.22, 0.6, { label: 'PONTO', color: '#7FE3FF' }),
];

export const MAP = {
  w: 38,
  h: 55,
  server: { x: 21.8, y: 24.1, w: 1, h: 1 },
  rooms: ROOMS,
  walls: WALLS,
  props: PROPS,
  // pontos onde os bugs podem nascer (bordas do espaço aberto)
  portals: [
    { x: 36.8, y: 4 },
    { x: 36.8, y: 12 },
    { x: 36.8, y: 22 },
    { x: 36.8, y: 37 },
    { x: 30, y: 53.5 },
    { x: 20, y: 53.5 },
    { x: 14, y: 44.5 },
    { x: 27.5, y: 11.4 },
  ],
  // zona segura: onde jogadores nascem e renascem
  safeCenter: { x: 22.3, y: 28.4 },
  safeRadius: 2.6,
};

export function obstacles() {
  const rects = [MAP.server, ...MAP.walls];
  for (const p of MAP.props) if (p.solid) rects.push(...(p.rects || [{ x: p.x, y: p.y, w: p.w, h: p.h }]));
  return rects;
}
const OBS = obstacles();

export const SAFE_SPOTS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return {
    x: MAP.safeCenter.x + Math.cos(a) * MAP.safeRadius,
    y: MAP.safeCenter.y + Math.sin(a) * MAP.safeRadius,
  };
});

// Qual sala contém o ponto (ou null para o salão aberto)
export function roomAt(x, y) {
  return MAP.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) || null;
}

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
    color: '#2bc8ff',
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
    color: '#ffd426',
    desc: 'Marca bugs para todos causarem mais dano.',
    hp: 90,
    speed: 4.4,
    atk: { range: 6, dmg: 10, cd: 0.5 },
    skills: [
      { name: 'Caso de teste', short: 'TESTE', cd: 10, desc: 'Marca e fere todos os bugs por perto.' },
      { name: 'Regressão', short: 'LENTO', cd: 12, desc: 'Dano em área e deixa os bugs lentos.' },
      { name: 'Bug bash', short: 'ULT', cd: 50, desc: 'Muito dano e marca em todos os bugs.' },
    ],
  },
  ops: {
    name: 'DevOps',
    tag: 'OPS',
    color: '#3dff8b',
    desc: 'Cura o time, protege o servidor e queima bugs.',
    hp: 110,
    speed: 4.0,
    atk: { range: 5, dmg: 9, cd: 0.6 },
    skills: [
      { name: 'Patch', short: 'PATCH', cd: 10, desc: 'Cura aliados e fere os bugs por perto.' },
      { name: 'Firewall', short: 'FIRE', cd: 20, desc: 'Servidor invulnerável e queima os bugs ao redor.' },
      { name: 'Rollback', short: 'ULT', cd: 60, desc: 'Revive e cura todos, e fere todos os bugs.' },
    ],
  },
  tank: {
    name: 'Tank',
    tag: 'TANK',
    color: '#ff8a1f',
    desc: 'Linha de frente: atrai, segura e machuca os bugs.',
    hp: 180,
    speed: 3.8,
    atk: { range: 2, dmg: 18, cd: 0.6, aoe: true },
    skills: [
      { name: 'Grito', short: 'GRITO', cd: 10, desc: 'Bugs te perseguem e levam dano.' },
      { name: 'Escudo', short: 'ESC', cd: 12, desc: 'Menos dano recebido e devolve dano a quem te bate.' },
      { name: 'Muralha', short: 'ULT', cd: 45, desc: 'Empurra, atordoa e fere os bugs por perto.' },
    ],
  },
  po: {
    name: 'PO',
    tag: 'PO',
    color: '#ff4fa3',
    desc: 'Prioriza alvos: dano extra e pontos em dobro.',
    hp: 95,
    speed: 4.2,
    atk: { range: 6, dmg: 9, cd: 0.55 },
    skills: [
      { name: 'Priorizar', short: 'PRIO', cd: 6, desc: 'Marca 1 bug (+50% de dano, pontos x2) e o atinge com força.' },
      { name: 'Mudança de escopo', short: 'SCOPE', cd: 15, desc: 'Sorteio: dano em todos, congelar, meteoros... ou caos.' },
      { name: 'Sprint Review', short: 'ULT', cd: 60, desc: 'Congela e fere todos os bugs e paga o combo em pontos.' },
    ],
  },
};

export const ENEMY_IDS = ['bug', 'clock', 'leak', 'mail', 'cal', 'boss', 'minimail'];

// desc = como o inimigo se comporta; from = a partir de qual onda aparece (mostrado no Guia)
export const ENEMIES = {
  bug: { name: 'Bug', hp: 20, speed: 1.7, dmg: 8, r: 0.38, pts: 10, aggro: 3, from: 1, desc: 'O inseto básico: anda direto até o servidor e morde quando encosta. Persegue quem chega perto.' },
  clock: { name: 'Deadline', hp: 12, speed: 3.3, dmg: 6, r: 0.34, pts: 12, aggro: 4, from: 2, desc: 'Rápido e frágil, chega em bando. Derrube antes que alcance o servidor.' },
  leak: { name: 'Memory Leak', hp: 42, speed: 1.0, dmg: 10, r: 0.42, pts: 25, aggro: 2.5, from: 3, desc: 'Lento, mas cresce: a cada 5 s fica maior, mais resistente e mais forte. Não deixe ele viver.' },
  mail: { name: 'E-mail Urgente', hp: 24, speed: 1.9, dmg: 6, r: 0.38, pts: 15, aggro: 3, from: 4, desc: 'Ao ser derrotado se divide em 2 mini e-mails. Use ataques em área.' },
  minimail: { name: 'Mini e-mail', hp: 8, speed: 2.4, dmg: 4, r: 0.28, pts: 5, aggro: 3, from: 4, desc: 'Pequeno e ligeiro. Só aparece quando um E-mail Urgente é derrotado.' },
  cal: { name: 'Reunião', hp: 60, speed: 1.2, dmg: 4, r: 0.45, pts: 30, aggro: 3, from: 6, desc: 'Lento e resistente. Deixa os jogadores lentos numa área ao redor: mantenha distância.' },
  boss: { name: 'Segfault (chefe)', hp: 600, speed: 1.0, dmg: 25, r: 0.9, pts: 300, aggro: 5, from: 5, desc: 'Aparece a cada 5 ondas. Investe contra os jogadores e solta 3 power-ups ao cair.' },
};

// Power-ups que caem dos bugs. `w` é o peso do sorteio.
export const PICKUP_TYPES = [
  { id: 'pizza', name: 'Pizza', desc: 'Cura 30% da vida', color: '#FFB020', w: 26 },
  { id: 'cafe', name: 'Café', desc: 'Velocidade +60% por 6 s', color: '#B9793B', w: 20 },
  { id: 'shield', name: 'Crachá VIP', desc: 'Recebe 60% menos dano por 8 s', color: '#2BC8FF', w: 14 },
  { id: 'overclock', name: 'Energético', desc: 'Ataca 60% mais rápido por 8 s', color: '#FFD426', w: 14 },
  { id: 'bomb', name: 'Deploy', desc: 'Explosão que fere os bugs por perto', color: '#FF3B4E', w: 10 },
  { id: 'freeze', name: 'Ar-condicionado', desc: 'Congela todos os bugs por 3 s', color: '#7FE3FF', w: 7 },
  { id: 'star', name: 'Bônus', desc: '+150 pontos', color: '#FFE45C', w: 6 },
  { id: 'backup', name: 'Backup', desc: 'Cura o servidor e revive aliados', color: '#3DFF8B', w: 6 },
];
export const PICKUP_IDS = PICKUP_TYPES.map((p) => p.id);

export const LIMITS = {
  maxEnemies: 36, // teto fixo: vale para todos os aparelhos
  nickMin: 3,
  nickMax: 12,
};
