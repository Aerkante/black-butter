import test from 'node:test';
import assert from 'node:assert/strict';
import { Match } from '../server/match.js';
import { MAP, EGG, SAFE_SPOTS, TICK_DT, LIMITS } from '../shared/game.js';

function lcg(seed = 7) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const conn = () => ({ sent: [], send(m) { this.sent.push(m); } });
function mk(opts = {}) {
  const log = { progress: [], runs: [], teams: [] };
  const m = new Match(1, {
    capacity: 4,
    rand: lcg(opts.seed),
    hooks: {
      onProgress: (p, d) => log.progress.push([p.nick, d]),
      onRun: (p, r) => log.runs.push([p.nick, r]),
      onTeamRecord: (t) => log.teams.push(t),
    },
    ...opts,
  });
  return { m, log };
}
const add = (m, nick, cls = 'dev') => m.addPlayer({ nick, look: {}, cls, conn: conn() });
const run = (m, secs, each) => {
  for (let i = 0; i < secs / TICK_DT; i++) {
    m.update(TICK_DT);
    each?.(m);
    m.flushEvents();
  }
};

test('jogador nasce na zona segura, invulnerável e longe de inimigos', () => {
  const { m } = mk();
  const a = add(m, 'Ana');
  run(m, 3);
  m.wave = 1;
  a.x = 0.5;
  a.y = 0.5;
  // põe inimigos ao lado de todos os pontos seguros exceto um
  const free = SAFE_SPOTS[3];
  for (const s of SAFE_SPOTS) if (s !== free) m.makeEnemy('bug', s.x + 0.3, s.y, 0);
  const b = add(m, 'Beto');
  assert.ok(Math.hypot(b.x - free.x, b.y - free.y) < 0.01, 'escolheu o ponto livre');
  assert.ok(b.invuln > m.t, 'invulnerável ao nascer');
  m.hurtPlayer(b, 50);
  assert.equal(b.hp, b.maxHp, 'dano ignorado durante a invulnerabilidade');
  assert.ok(a.hp > 0);
});

test('bugs nunca nascem perto de jogadores vivos', () => {
  const { m } = mk({ seed: 3 });
  const p = add(m, 'Ana', 'tank');
  let minDist = 99;
  m.update(TICK_DT);
  run(m, 40, () => {
    p.hp = p.maxHp; // deixa o jogador vivo
    for (const e of m.enemies) {
      if (e.spawning) minDist = Math.min(minDist, Math.hypot(e.x - p.x, e.y - p.y));
    }
  });
  assert.ok(m.wave >= 1);
  assert.ok(minDist >= 5.5, `menor distância de nascimento: ${minDist.toFixed(2)}`);
});

test('onda escala com o número de jogadores (solo é mais leve)', () => {
  const solo = mk().m;
  add(solo, 'Ana');
  const quad = mk().m;
  for (const n of ['A1', 'A2', 'A3', 'A4']) add(quad, n);
  assert.ok(solo.buildWave(6).length < quad.buildWave(6).length);
  assert.ok(solo.server.max < quad.server.max);
  assert.ok(quad.buildWave(5).includes('boss'), 'chefe a cada 5 ondas');
  assert.ok(!quad.buildWave(4).includes('boss'));
});

test('um jogador sozinho consegue limpar ondas e pontuar', () => {
  const { m, log } = mk();
  const p = add(m, 'Ana', 'dev');
  p.atk = true;
  run(m, 90, () => {
    p.hp = p.maxHp;
  });
  assert.ok(m.wave >= 2, `onda alcançada: ${m.wave}`);
  assert.ok(p.score > 0 && p.kills > 0);
  assert.ok(log.progress.length > 0, 'progresso gravado a cada onda');
  assert.ok(m.enemies.length <= LIMITS.maxEnemies);
});

test('fim de jogo do time reinicia todos de uma vez e grava execuções', () => {
  const { m, log } = mk();
  const a = add(m, 'Ana');
  const b = add(m, 'Beto', 'po');
  run(m, 3);
  a.score = 120;
  b.score = 80;
  m.teamScore = 200;
  m.wave = 4;
  a.invuln = b.invuln = 0;
  m.hurtPlayer(a, 9999);
  assert.equal(m.state, 'wave' === m.state ? 'wave' : m.state); // ainda com um vivo
  assert.notEqual(m.state, 'over');
  m.hurtPlayer(b, 9999);
  m.update(TICK_DT);
  assert.equal(m.state, 'over');
  assert.equal(log.runs.length, 2);
  assert.equal(log.teams[0].score, 200);
  assert.equal(m.snapshot(a).over.board[0].nick, 'Ana');
  run(m, 11);
  assert.equal(m.state, 'break');
  assert.equal(m.wave, 0, 'reiniciou na onda 1');
  assert.equal(a.score, 0);
  assert.equal(a.downed, false);
  assert.equal(b.hp, b.maxHp);
});

test('servidor derrubado encerra a partida', () => {
  const { m } = mk();
  add(m, 'Ana');
  run(m, 3);
  m.hurtServer(99999);
  m.update(TICK_DT);
  assert.equal(m.state, 'over');
  assert.equal(m.overInfo.reason, 'server');
});

test('sair no meio grava a execução uma única vez', () => {
  const { m, log } = mk();
  const a = add(m, 'Ana');
  a.score = 77;
  m.removePlayer(a);
  assert.equal(log.runs.length, 1);
  assert.equal(log.runs[0][1].score, 77);
  assert.ok(m.isEmpty);
});

test('partida vazia pausa e expira; fantasma segura o lugar e reata', () => {
  const { m } = mk({ reconnectGraceMs: 200 });
  const a = add(m, 'Ana');
  run(m, 3);
  const t0 = m.t;
  m.disconnect(a, { keep: true });
  run(m, 5);
  assert.equal(m.t, t0, 'simulação pausada sem jogadores conectados');
  assert.ok(m.players.has(a.id), 'lugar reservado');
  m.reattach(a, conn());
  assert.equal(a.ghost, false);
  assert.ok(a.invuln > m.t);
  m.disconnect(a, { keep: true });
  assert.equal(m.expired(Date.now() + 1000, 60_000), false);
  assert.equal(m.expired(Date.now() + 61_000, 60_000), true, 'expira após a inatividade');
});

test('fantasma some depois do prazo de reconexão', async () => {
  const { m } = mk({ reconnectGraceMs: 30 });
  const a = add(m, 'Ana');
  m.disconnect(a, { keep: true });
  await new Promise((r) => setTimeout(r, 60));
  m.update(TICK_DT);
  assert.equal(m.players.size, 0);
});

test('quem entra no meio da onda vai para a onda atual', () => {
  const { m } = mk();
  add(m, 'Ana');
  run(m, 20);
  const w = m.wave;
  assert.ok(w >= 1);
  const b = add(m, 'Beto');
  assert.equal(m.wave, w);
  assert.equal(b.score, 0);
  assert.equal(m.connectedCount(), 2);
});

test('partida cheia recusa novos jogadores', () => {
  const { m } = mk({ capacity: 2 });
  add(m, 'A');
  add(m, 'B');
  assert.equal(add(m, 'C'), null);
});

test('PO: prioridade dá +50% de dano e pontos em dobro', () => {
  const { m } = mk();
  const po = add(m, 'Duda', 'po');
  m.state = 'wave';
  m.wave = 1;
  m.queue = ['bug'];
  po.x = 5;
  po.y = 5;
  const e1 = m.makeEnemy('bug', 6, 5, 0);
  const e2 = m.makeEnemy('bug', 6, 6, 0);
  e1.hp = e2.hp = 1000;
  m.skill(po, 1);
  const prio = m.enemies.find((e) => e.prio > m.t);
  assert.ok(prio, 'um bug foi priorizado');
  const other = m.enemies.find((e) => e !== prio);
  const before = [prio.hp, other.hp];
  m.damageEnemy(prio, 10, po);
  m.damageEnemy(other, 10, po);
  assert.ok(before[0] - prio.hp > before[1] - other.hp, 'alvo prioritário sofre mais');
  prio.hp = 1;
  other.hp = 1;
  const s0 = po.score;
  m.combo = 0;
  m.damageEnemy(other, 5, po);
  const normal = po.score - s0;
  const s1 = po.score;
  m.combo = 0;
  m.damageEnemy(prio, 5, po);
  assert.ok(po.score - s1 >= normal * 1.8, 'pontos em dobro');
});

test('DevOps revive aliado derrubado por perto', () => {
  const { m } = mk();
  const ops = add(m, 'Ops', 'ops');
  const dev = add(m, 'Dev', 'dev');
  m.state = 'break';
  m.stateT = 999;
  dev.invuln = 0;
  m.hurtPlayer(dev, 9999);
  assert.equal(dev.downed, true);
  dev.x = ops.x + 0.5;
  dev.y = ops.y;
  run(m, 3);
  assert.equal(dev.downed, false);
  assert.ok(dev.hp > 0);
});

test('habilidades respeitam o tempo de recarga', () => {
  const { m } = mk();
  const q = add(m, 'Qa', 'qa');
  m.state = 'wave';
  const e = m.makeEnemy('bug', q.x + 1, q.y, 0);
  m.skill(q, 1);
  assert.ok(e.mark > m.t);
  e.mark = 0;
  m.skill(q, 1);
  assert.equal(e.mark, 0, 'ainda recarregando');
  assert.ok(q.cd.s1 > m.t);
});

test('entrada é normalizada: cliente não anda mais rápido', () => {
  const { m } = mk();
  const a = add(m, 'Ana');
  m.state = 'break';
  m.stateT = 999;
  a.x = 13;
  a.y = 12;
  m.input(a, { dx: 100, dy: 0, a: 0 });
  run(m, 1);
  assert.ok(a.x - 13 <= 4.3, `andou ${a.x - 13}`);
  m.input(a, { dx: 'x', dy: NaN });
  assert.equal(a.dx, 0);
});

test('jogador não atravessa obstáculos nem sai do mapa', () => {
  const { m } = mk();
  const a = add(m, 'Ana');
  m.state = 'break';
  m.stateT = 999;
  a.x = 2.5;
  a.y = 12.6; // canto da baia de Fiscal (braço vertical em x 2.9..3.9)
  m.input(a, { dx: 1, dy: 0 });
  run(m, 3);
  assert.ok(a.x < 2.7, 'parou no braço da baia');
  a.x = 1;
  a.y = 1;
  m.input(a, { dx: -1, dy: -1 });
  run(m, 3);
  assert.ok(a.x >= 0 && a.y >= 0 && a.x <= MAP.w && a.y <= MAP.h);
  a.x = 4;
  a.y = 6;
  m.input(a, { dx: 0, dy: 1 });
  run(m, 3);
  assert.ok(a.y < 6.8, 'não atravessa a divisória da sala (y = 7), só pela porta');
});

test('snapshot é compacto e traz o estado pessoal', () => {
  const { m } = mk();
  const a = add(m, 'Ana');
  run(m, 10);
  const snap = m.snapshot(a);
  assert.equal(snap.t, 's');
  assert.equal(snap.me.id, a.id);
  assert.equal(snap.p.length, 1);
  assert.ok(JSON.stringify(snap).length < 2000);
});

test('chefe atravessa a porta da copa e chega ao servidor (navegação por portas)', () => {
  const { m } = mk();
  const a = add(m, 'Ana', 'tank');
  m.state = 'wave';
  m.wave = 5;
  m.queue = ['bug']; // impede o fim da onda
  const boss = m.makeEnemy('boss', 6, 38, 0); // dentro da copa
  boss.hp = boss.maxHp = 99999;
  run(m, 60, () => {
    a.hp = a.maxHp;
    m.server.hp = m.server.max;
  });
  const d = Math.hypot(boss.x - 20, boss.y - 25);
  assert.ok(d < 4, `chefe saiu da copa e chegou perto do servidor (distância ${d.toFixed(1)})`);
});

test('bugs contornam a parede e entram pela porta atrás do jogador', () => {
  const { m } = mk();
  const a = add(m, 'Ana', 'dev');
  m.state = 'wave';
  m.wave = 2;
  m.queue = ['bug'];
  a.x = 4;
  a.y = 5.5; // dentro da sala de reunião (porta em x 5.5..7.5, y = 7)
  a.invuln = m.t + 999;
  const e = m.makeEnemy('bug', 4, 8.2, 0); // logo do outro lado da divisória
  e.hp = e.maxHp = 99999;
  e.tauntBy = a.id; // provocado (Grito do Tank): tem de ir até o jogador, dando a volta
  e.tauntUntil = m.t + 999;
  run(m, 25, () => {
    m.server.hp = m.server.max;
  });
  assert.ok(Math.hypot(e.x - a.x, e.y - a.y) < 2.5, `bug chegou ao jogador (${e.x.toFixed(1)}, ${e.y.toFixed(1)})`);
});

test('jogador atrás da parede não leva dano de bug do outro lado', () => {
  const { m } = mk();
  const a = add(m, 'Ana', 'dev');
  m.state = 'wave';
  m.wave = 2;
  m.queue = ['bug'];
  a.x = 4;
  a.y = 6.4;
  a.invuln = 0;
  a.hp = a.maxHp;
  const e = m.makeEnemy('bug', 4, 7.7, 0); // colado na divisória, do outro lado
  e.hp = e.maxHp = 99999;
  e.atkT = 0;
  for (let i = 0; i < 20; i++) {
    m.update(TICK_DT);
    a.x = 4;
    a.y = 6.4; // jogador parado
  }
  assert.equal(a.hp, a.maxHp, 'a parede protege enquanto o bug não chega pela porta');
});

test('todos os portais têm caminho até o servidor e nenhum móvel tranca as salas', async () => {
  const nav = await import('../server/nav.js');
  const field = nav.serverField();
  for (const p of MAP.portals) assert.ok(nav.reachable(field, p.x, p.y), `portal ${p.x},${p.y}`);
  for (const r of ['reuniao', 'seguranca', 'componentes', 'copa']) {
    const room = MAP.rooms.find((x) => x.id === r);
    // porta de cada sala: um ponto livre logo dentro da sala, ao lado da porta
    const probes = { reuniao: [6.5, 6.2], seguranca: [10.2, 31.5], componentes: [10.2, 24.5], copa: [12.5, 34.8] };
    const [x, y] = probes[r];
    assert.ok(nav.reachable(field, x, y), `sala ${room.name} acessível`);
  }
});

test('bug preso por muito tempo volta a nascer num portal', () => {
  const { m } = mk();
  add(m, 'Ana');
  m.state = 'wave';
  m.queue = ['bug'];
  const e = m.makeEnemy('bug', 5, 5, 0);
  e.x = 1;
  e.y = 1;
  e.stuck = 4.1;
  m.unstick(e);
  assert.equal(e.spawning, true);
  assert.equal(e.stuck, 0);
});

test('partida pausada retoma com a onda reiniciada e o servidor recuperado', () => {
  const { m } = mk();
  const a = add(m, 'Ana');
  a.atk = false;
  run(m, 12);
  assert.ok(m.wave >= 1);
  const w = m.wave;
  m.server.hp = 10;
  m.makeEnemy('bug', 3, 3, 0);
  m.disconnect(a, { keep: true });
  assert.ok(m.isEmpty);
  const b = add(m, 'Beto');
  assert.equal(m.enemies.length, 0, 'inimigos antigos removidos');
  assert.ok(m.server.hp >= m.server.max * 0.6, 'servidor recuperado');
  assert.equal(m.wave, w - 1, 'a onda em andamento recomeça');
  assert.equal(m.state, 'break');
  assert.ok(b.invuln > m.t);
});

test('fantasma que reconecta numa partida pausada também retoma', () => {
  const { m } = mk();
  const a = add(m, 'Ana');
  run(m, 12);
  m.server.hp = 5;
  m.disconnect(a, { keep: true });
  m.reattach(a, conn());
  assert.ok(m.server.hp >= m.server.max * 0.6);
});

// ----- power-ups -----
import { PICKUP_TYPES, PICKUP_IDS } from '../shared/game.js';
const kindOf = (id) => PICKUP_IDS.indexOf(id);
function give(m, p, id) {
  m.pickups.push({ id: 900 + m.pickups.length, kind: kindOf(id), x: p.x, y: p.y, exp: m.t + 10 });
  m.updatePickups();
}

test('há 8 power-ups com nome, descrição e peso; todos os ids são únicos', () => {
  assert.equal(PICKUP_TYPES.length, 8);
  assert.equal(new Set(PICKUP_IDS).size, 8);
  for (const p of PICKUP_TYPES) assert.ok(p.name && p.desc && p.w > 0 && /^#/.test(p.color));
});

test('pizza cura, café acelera, crachá reduz dano, energético acelera o ataque', () => {
  const { m } = mk();
  const p = add(m, 'Ana', 'dev');
  m.state = 'break';
  m.stateT = 999;
  p.invuln = 0;
  p.hp = 10;
  give(m, p, 'pizza');
  assert.equal(p.hp, 10 + p.maxHp * 0.3);
  give(m, p, 'cafe');
  assert.ok(p.fx.speedUntil > m.t);
  give(m, p, 'shield');
  p.hp = p.maxHp;
  m.hurtPlayer(p, 50);
  assert.ok(Math.abs(p.maxHp - p.hp - 20) < 1e-6, 'só 40% do dano');
  const cd0 = CLASSES_dev();
  give(m, p, 'overclock');
  const e = m.makeEnemy('bug', p.x + 1, p.y, 0);
  e.hp = e.maxHp = 9999;
  const before = m.t;
  m.attack(p);
  assert.ok(Math.abs(p.cd.atk - before - cd0 * 0.6) < 1e-6, 'recarga 40% menor');
  assert.equal(m.pickups.length, 0);
});
function CLASSES_dev() {
  return 0.45;
}

test('deploy fere bugs por perto, ar-condicionado congela, bônus dá pontos', () => {
  const { m } = mk();
  const p = add(m, 'Ana', 'dev');
  m.state = 'wave';
  m.queue = ['bug'];
  const near = m.makeEnemy('bug', p.x + 2, p.y, 0);
  const far = m.makeEnemy('bug', p.x + 9, p.y, 0);
  near.hp = near.maxHp = far.hp = far.maxHp = 1000;
  give(m, p, 'bomb');
  assert.ok(near.hp < 1000 && far.hp === 1000);
  give(m, p, 'freeze');
  assert.ok(m.buffs.freezeUntil > m.t);
  const s0 = p.score;
  give(m, p, 'star');
  assert.equal(p.score - s0, 150);
  assert.equal(m.teamScore >= 150, true);
});

test('backup cura o servidor e revive aliado caído', () => {
  const { m } = mk();
  const a = add(m, 'Ana');
  const b = add(m, 'Beto');
  m.state = 'break';
  m.stateT = 999;
  b.invuln = 0;
  m.hurtPlayer(b, 9999);
  m.server.hp = 100;
  give(m, a, 'backup');
  assert.equal(b.downed, false);
  assert.ok(m.server.hp >= 100 + m.server.max * 0.25 - 1e-6);
});

test('power-ups expiram e o chefe solta vários', () => {
  const { m } = mk();
  const a = add(m, 'Ana');
  m.pickups.push({ id: 1, kind: 0, x: a.x + 5, y: a.y, exp: m.t + 1 });
  run(m, 2);
  assert.equal(m.pickups.length, 0, 'sumiu depois de 1 s');
  m.state = 'wave';
  m.queue = ['bug'];
  const boss = m.makeEnemy('boss', 8, 3, 0);
  m.killEnemy(boss, a);
  assert.equal(m.pickups.length, 3);
});

test('snapshot traz power-ups (com tempo restante) e os ativos do jogador', () => {
  const { m } = mk();
  const a = add(m, 'Ana');
  m.dropPickup(a.x + 3, a.y);
  give(m, a, 'shield');
  const snap = m.snapshot(a);
  assert.equal(snap.k[0].length, 5);
  assert.deepEqual(snap.me.bf.map((b) => b[0]), [2]);
  assert.ok(snap.me.bf[0][1] > 7);
});

test('evento de habilidade traz o alvo do PO (Priorizar)', () => {
  const { m } = mk();
  const po = add(m, 'Duda', 'po');
  m.state = 'wave';
  m.queue = ['bug'];
  const e = m.makeEnemy('bug', po.x + 2, po.y, 0);
  e.hp = e.maxHp = 500;
  m.skill(po, 1);
  const ev = m.events.find((x) => x[0] === 'skill');
  assert.equal(ev[5], e.id);
});

// ----- todas as classes têm poder ofensivo -----
import { CLASS_IDS, CLASSES } from '../shared/game.js';

function arena(cls, opts = {}) {
  const { m } = mk(opts);
  const p = add(m, 'Ana', cls);
  m.state = 'wave';
  m.wave = 3;
  m.queue = ['bug']; // impede o fim da onda
  p.invuln = 0;
  const hpOf = (e) => e.hp;
  const foes = [0, 1, 2].map((i) => {
    const e = m.makeEnemy('bug', p.x + 1.2 + i * 0.4, p.y + 0.3 * i, 0);
    e.hp = e.maxHp = 5000;
    return e;
  });
  return { m, p, foes, hpOf };
}

test('QA, DevOps, Tank e PO: cada habilidade de dano fere bugs por perto', () => {
  const dmg = { qa: [1, 2, 3], ops: [1, 3], tank: [1, 3], po: [1, 3], dev: [1, 3] };
  for (const cls of CLASS_IDS) {
    for (const n of dmg[cls]) {
      const { m, p, foes } = arena(cls);
      m.skill(p, n);
      assert.ok(foes.some((e) => e.hp < 5000), `${cls} habilidade ${n} deveria causar dano`);
    }
  }
});

test('Firewall queima os bugs colados no servidor enquanto dura', () => {
  const { m, p } = arena('ops');
  const sc = { x: MAP.server.x + MAP.server.w / 2, y: MAP.server.y + MAP.server.h / 2 };
  const e = m.makeEnemy('bug', sc.x + 1.4, sc.y, 0);
  e.hp = e.maxHp = 5000;
  m.skill(p, 2);
  const afterPulse = e.hp;
  assert.ok(afterPulse < 5000, 'pulso inicial');
  for (let i = 0; i < 40; i++) m.update(TICK_DT);
  assert.ok(e.hp < afterPulse, 'queimadura contínua');
  const far = m.makeEnemy('bug', 32, 40, 0);
  far.hp = far.maxHp = 5000;
  const farHp = far.hp;
  for (let i = 0; i < 40; i++) m.update(TICK_DT);
  assert.equal(far.hp, farHp, 'longe do servidor não queima');
  assert.equal(m.fire.until > 0, true);
});

test('Escudo do Tank devolve dano a quem bate nele', () => {
  const { m, p, foes } = arena('tank');
  m.skill(p, 2);
  const e = foes[0];
  const before = e.hp;
  m.hurtPlayer(p, 10, e);
  assert.ok(e.hp < before, 'atacante levou dano de volta');
  const e2 = foes[1];
  p.fx.shieldUntil = 0;
  const b2 = e2.hp;
  m.hurtPlayer(p, 10, e2);
  assert.equal(e2.hp, b2, 'sem escudo não devolve');
});

test('Mudança de escopo: cada resultado tem efeito real', () => {
  const seeds = { 0.1: 'dano geral', 0.5: 'congelar', 0.7: 'meteoros', 0.9: 'bugs acelerados' };
  for (const [r, name] of Object.entries(seeds)) {
    const { m, p, foes } = arena('po', { rand: () => Number(r) });
    m.skill(p, 2);
    const ev = m.events.find((x) => x[0] === 'scope');
    assert.ok(ev, name);
    if (name === 'dano geral') assert.ok(foes.every((e) => e.hp < 5000) && m.buffs.dmgUntil > m.t);
    if (name === 'congelar') assert.ok(m.buffs.freezeUntil > m.t);
    if (name === 'meteoros') assert.ok(foes.some((e) => e.hp < 5000) && ev[1] === 3);
    if (name === 'bugs acelerados') assert.ok(m.buffs.hasteUntil > m.t);
  }
});

test('Rollback e Sprint Review também ferem todos os bugs do mapa', () => {
  for (const [cls, n] of [['ops', 3], ['po', 3], ['qa', 3]]) {
    const { m, p, foes } = arena(cls);
    const far = m.makeEnemy('bug', 16, 16, 0);
    far.hp = far.maxHp = 5000;
    m.skill(p, n);
    assert.ok(foes.every((e) => e.hp < 5000) && far.hp < 5000, `${cls} ult`);
  }
});

test('ataque básico: nenhuma classe é fraca a ponto de só o Dev servir', () => {
  const base = CLASSES.dev.atk.dmg / CLASSES.dev.atk.cd;
  for (const id of ['qa', 'ops', 'tank', 'po']) {
    const dps = CLASSES[id].atk.dmg / CLASSES[id].atk.cd;
    assert.ok(dps >= base * 0.45, `${id}: dps ${dps.toFixed(1)} vs dev ${base.toFixed(1)}`);
  }
});

test('cheats secretos: valem só no servidor e tiram a rodada do ranking', () => {
  const { m, log } = mk();
  const a = add(m, 'Ana');
  assert.equal(m.cheat(a, 'abracadabra').ok, false);
  assert.equal(a.cheated, false, 'código inválido não marca');
  a.invuln = 0;
  assert.equal(m.cheat(a, ' S-U-D-O ').ok, true);
  assert.equal(a.cheated, true);
  m.hurtPlayer(a, 999);
  assert.equal(a.hp, a.maxHp, 'sudo: modo deus');
  m.cheat(a, 'sudo');
  m.hurtPlayer(a, 999);
  assert.ok(a.downed);
  m.cheat(a, 'hotfix');
  assert.equal(a.downed, false);
  assert.equal(m.server.hp, m.server.max);
  m.wave = 1;
  m.makeEnemy('bug', 5, 5, 0);
  m.cheat(a, 'rmrf');
  assert.equal(m.enemies.length, 0);
  m.cheat(a, 'segfault');
  assert.ok(m.enemies.some((e) => e.type === 'boss' || e.def?.name));
  a.score = 500;
  m.flush(a);
  m.finishRun(a);
  assert.equal(log.progress.length, 0, 'sem pontos no ranking');
  assert.equal(log.runs.length, 0);
});

test('power-ups de chefe ficam até serem pegos; os comuns somem em 14 s', () => {
  const { m } = mk();
  const a = add(m, 'Ana');
  m.state = 'break';
  m.stateT = 9999;
  m.dropPickup(30, 40, true);
  m.dropPickup(31, 40, false);
  assert.equal(m.pickups.length, 2);
  a.x = 5;
  a.y = 5;
  run(m, 60);
  assert.equal(m.pickups.length, 1, 'só o de chefe sobrou');
  assert.ok(m.pickups[0].persist);
  a.x = m.pickups[0].x;
  a.y = m.pickups[0].y;
  run(m, 1);
  assert.equal(m.pickups.length, 0, 'foi consumido');
  const { m: m2 } = mk();
  const p2 = add(m2, 'Beto', 'tank');
  m2.state = 'wave';
  m2.wave = 5;
  m2.queue = ['bug'];
  const boss = m2.makeEnemy('boss', 30, 40, 0);
  m2.killEnemy(boss, p2);
  assert.equal(m2.pickups.filter((k) => k.persist).length, 3, 'o chefe deixa 3 power-ups fixos');
});

test('easter egg: atacar no cantinho da sala de componentes faz dormir até se mexer', () => {
  const { m } = mk();
  const a = add(m, 'Ana');
  m.state = 'break';
  m.stateT = 9999;
  a.x = EGG.x + 1;
  a.y = EGG.y + 1;
  m.input(a, { dx: 0, dy: 0, a: 1 });
  run(m, 1);
  assert.equal(a.sleep, true);
  assert.ok(m.snapshot(a).p[0][5] & 128, 'flag de dormindo no snapshot');
  m.input(a, { dx: 0, dy: 0, a: 1 });
  run(m, 1);
  assert.equal(a.sleep, true, 'continua dormindo');
  m.input(a, { dx: 1, dy: 0 });
  run(m, 0.2);
  assert.equal(a.sleep, false, 'acorda ao se mover');
  // fora do canto, atacar não faz nada
  const b = add(m, 'Beto');
  b.x = 20;
  b.y = 30;
  m.input(b, { dx: 0, dy: 0, a: 1 });
  run(m, 1);
  assert.equal(!!b.sleep, false);
});
