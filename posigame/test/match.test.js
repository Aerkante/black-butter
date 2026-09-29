import test from 'node:test';
import assert from 'node:assert/strict';
import { Match } from '../server/match.js';
import { MAP, SAFE_SPOTS, TICK_DT, LIMITS } from '../shared/game.js';

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
  a.x = 3;
  a.y = 3;
  m.input(a, { dx: 100, dy: 0, a: 0 });
  run(m, 1);
  assert.ok(a.x - 3 <= 4.3, `andou ${a.x - 3}`);
  m.input(a, { dx: 'x', dy: NaN });
  assert.equal(a.dx, 0);
});

test('jogador não atravessa obstáculos nem sai do mapa', () => {
  const { m } = mk();
  const a = add(m, 'Ana');
  m.state = 'break';
  m.stateT = 999;
  a.x = 3;
  a.y = 4.5;
  m.input(a, { dx: 1, dy: 0 });
  run(m, 3);
  assert.ok(a.x < 4, 'parou na mesa');
  a.x = 1;
  a.y = 1;
  m.input(a, { dx: -1, dy: -1 });
  run(m, 3);
  assert.ok(a.x >= 0 && a.y >= 0 && a.x <= MAP.w && a.y <= MAP.h);
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

test('chefe grande não fica preso entre a impressora e a mesa', () => {
  const { m } = mk();
  const a = add(m, 'Ana', 'tank');
  m.state = 'wave';
  m.wave = 5;
  m.queue = ['bug']; // impede o fim da onda
  const boss = m.makeEnemy('boss', 3.1, 12.91, 0);
  boss.hp = boss.maxHp = 99999;
  run(m, 25, () => {
    a.hp = a.maxHp;
    m.server.hp = m.server.max;
  });
  const d = Math.hypot(boss.x - 9, boss.y - 9);
  assert.ok(d < 4, `chefe chegou perto do servidor (distância ${d.toFixed(1)})`);
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
