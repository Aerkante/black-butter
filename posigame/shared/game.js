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
  { id: 'reuniao', name: 'REUNIÃO', x: 0, y: 0, w: 12, h: 6, floor: 'wood', plate: '#3B4DC4' },
  { id: 'diretor', name: 'DIRETOR', x: 12, y: 0, w: 8, h: 6, floor: 'porcelain', plate: '#7A3BC4' },
  { id: 'componentes', name: 'COMPONENTES', x: 0, y: 12, w: 9, h: 6, floor: 'porcelain', plate: '#8A93A8' },
  { id: 'seguranca', name: 'SEGURANÇA', x: 0, y: 18, w: 9, h: 6, floor: 'porcelain', plate: '#1FB86A' },
  { id: 'copa', name: 'COPA', x: 0, y: 24, w: 12, h: 8, floor: 'porcelain', plate: '#FF8A1F' },
];

const WALLS = [
  // reunião e diretor (porta da reunião em x 5..7, do diretor em x 15..17)
  wallH(0, 6, 5), wallH(7, 6, 5), wallH(12, 6, 3), wallH(17, 6, 3), wallV(12, 0, 6), wallV(20, 0, 6),
  // componentes (porta em y 14.5..16.5) e segurança (porta em y 20.5..22.5)
  wallH(0, 12, 9), wallV(9, 12, 2.5), wallV(9, 16.5, 1.5), wallH(0, 18, 9), wallV(9, 18, 2.5), wallV(9, 22.5, 1.5),
  // copa (portas: topo em x 9.5..11.5 e lado em y 27..29.5)
  wallH(0, 24, 9.5), wallH(11.5, 24, 0.5), wallV(12, 24, 3), wallV(12, 29.5, 2.5),
];

// Móveis. solid = bloqueia a passagem (w/h = pegada no chão).
// Setores da empresa (cada mesa do salão pertence a um deles)
export const SECTORS = {
  secretaria: { name: 'Secretária executiva', short: 'SECRETARIA', color: '#B18CFF', where: 'perto da sala do diretor' },
  fiscal: { name: 'Fiscal', short: 'FISCAL', color: '#2BC8FF', where: 'baia do canto esquerdo, fileira de cima' },
  sesmt: { name: 'SESMT', short: 'SESMT', color: '#3DFF8B', where: 'baia ao lado da de Fiscal' },
  cadastro: { name: 'Cadastro', short: 'CADASTRO', color: '#7FE3FF', where: 'baia ao lado da de SESMT, em frente à porta do diretor' },
  projetos: { name: 'Projetos', short: 'PROJETOS', color: '#FF8A1F', where: 'logo abaixo da secretária' },
  desenvolvimento: { name: 'Desenvolvimento', short: 'DESENV.', color: '#FFD426', where: 'abaixo de Projetos' },
  financeiro: { name: 'Financeiro', short: 'FINANCEIRO', color: '#FF4FA3', where: 'no fim da coluna, perto da copa e do ponto' },
};

// Baias em "+": cada uma tem 4 lugares (um em cada canto do "+"). A mesa da secretária é a única individual.
const BAIA = 3.8; // lado do "+" (braços de 1 tile; cada canto tem 1,4 tile livre para a cadeira)
const BAIAS = [
  [0.6, 8, 'fiscal'], [6.2, 8, 'sesmt'], [12.4, 8, 'cadastro'],
  [18, 11, 'projetos'], [18, 16, 'desenvolvimento'], [18, 21, 'financeiro'],
];
const solid = (t, x, y, w, h, extra = {}) => ({ t, x, y, w, h, solid: true, ...extra });
const deco = (t, x, y) => ({ t, x, y, solid: false });
const baia = (x, y, sector) => {
  const a = (BAIA - 1) / 2;
  return [
    solid('baia', x, y, BAIA, BAIA, { sector, rects: [{ x: x + a, y, w: 1, h: BAIA }, { x, y: y + a, w: BAIA, h: 1 }] }),
    ...[[0.7, 0.7], [BAIA - 0.7, 0.7], [0.7, BAIA - 0.7], [BAIA - 0.7, BAIA - 0.7]].map(([dx, dy]) => deco('chair', x + dx, y + dy)),
  ];
};

const PROPS = [
  // salão
  ...BAIAS.flatMap(([x, y, sector]) => baia(x, y, sector)),
  solid('desk', 19.4, 8.6, 2, 1, { sector: 'secretaria' }), deco('chair', 20.4, 10.35),
    deco('plant', 0.7, 6.7), deco('plant', 9.5, 6.6), deco('plant', 23.3, 6.5), deco('plant', 23.3, 31), deco('plant', 10.2, 30.8), deco('plant', 12.7, 13), deco('plant', 12.7, 30.6),
  deco('bin', 17, 10.3), deco('bin', 22.8, 16.2), deco('bin', 12.6, 20.5),
  solid('cooler', 22.6, 7.4, 0.9, 0.9),
  // sala de reunião
  solid('table6', 3, 1.8, 6, 2),
  ...[4, 5.4, 6.8, 8.2].flatMap((x) => [deco('chair', x, 1.3), deco('chair', x, 4.5)]),
  deco('chair', 2.2, 2.8), deco('chair', 9.8, 2.8),
  deco('plant', 0.8, 5.2), deco('plant', 11.2, 5.2),
  // sala do diretor (simples: uma mesa, duas cadeiras e uma planta)
  solid('bigdesk', 14.4, 1.6, 3.2, 1.3), deco('chair', 16, 0.95), deco('chair', 16, 3.6),
  deco('plant', 12.9, 5.2),
  // sala de componentes: três mesas em U com componentes, mesa redonda com 3 cadeiras, lixeira, sem armários
  solid('workbench', 2.3, 12.5, 4.4, 1.1), solid('workbench', 0.5, 12.5, 1.1, 4), solid('workbench', 7.7, 12.5, 1.1, 2),
  solid('roundtable', 3.6, 15.2, 1.8, 1.8),
  deco('chair', 3.0, 16.1), deco('chair', 6.0, 16.1), deco('chair', 4.5, 17.55),
  deco('bin', 8.3, 14.7),
  // sala de segurança do trabalho
  solid('lockerY', 0.15, 18.5, 0.7, 3.6), solid('table', 4.2, 20.2, 2.6, 1.2),
  deco('chair', 4.8, 19.6), deco('chair', 6.2, 19.6), deco('chair', 5, 22.1), deco('chair', 6.4, 22.1),
  deco('sign', 7.3, 19.3), deco('sign', 7.7, 22.9), deco('sign', 2.5, 23),
  // copa
  solid('counterY', 0.15, 24.8, 0.9, 5.4), solid('fridge', 0.2, 30.8, 1, 1), solid('coffee', 1.3, 24.6, 1, 1), solid('vending', 10.8, 30.8, 1, 1),
  ...[[4.5, 26.5], [8, 26.5]].flatMap(([x, y]) => [solid('table2', x, y, 1.6, 1.6), deco('chair', x + 0.8, y - 0.5), deco('chair', x + 0.8, y + 2.2)]),
  // mesa comprida na parte de baixo da copa
  solid('tableLong', 2.6, 30.3, 6.2, 1.3), ...[3.4, 4.9, 6.4, 7.9].map((x) => deco('chair', x, 29.7)),
  solid('cooler', 10.9, 25.1, 0.9, 0.9),
  // ponto eletrônico: caixinha na parede da copa (lado de fora), do lado do Financeiro
  solid('totem', 12.2, 25.4, 0.22, 0.6, { label: 'PONTO', color: '#7FE3FF' }),
];

export const MAP = {
  w: 24,
  h: 32,
  server: { x: 14.5, y: 17.5, w: 1, h: 1 },
  rooms: ROOMS,
  walls: WALLS,
  props: PROPS,
  // pontos onde os bugs podem nascer (bordas do espaço aberto)
  portals: [
    { x: 22.2, y: 2.5 },
    { x: 23.2, y: 9 },
    { x: 23.2, y: 17 },
    { x: 23.2, y: 26 },
    { x: 21, y: 30.6 },
    { x: 14, y: 30.6 },
    { x: 10.6, y: 21 },
    { x: 14.5, y: 7 },
  ],
  // zona segura: onde jogadores nascem e renascem
  safeCenter: { x: 15, y: 18 },
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
