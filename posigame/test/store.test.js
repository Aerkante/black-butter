import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../server/store.js';

const tok = (c) => c.repeat(32);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'posigame-'));

test('registra nick único e persiste em disco', () => {
  const dir = tmp();
  const s = new Store({ dir });
  assert.equal(s.register('Duda', tok('a')).ok, true);
  assert.equal(s.register('duda', tok('b')).ok, false, 'nick repetido (sem diferenciar maiúsculas)');
  assert.equal(s.register('Outro', tok('a')).ok, false, 'mesmo aparelho já tem nick');
  s.recordRun('Duda', { score: 500, wave: 7, cls: 'po' });
  s.saveNow();
  const s2 = new Store({ dir });
  assert.equal(s2.byNick('Duda').best.score, 500);
  assert.equal(s2.byToken(tok('a')).nick, 'Duda');
  assert.equal(s2.byToken(tok('c')), null);
});

test('ranking soma e escolhe o melhor por nick e filtra por período', () => {
  let now = new Date('2026-09-30T12:00:00').getTime(); // quarta-feira
  const s = new Store({ dir: tmp(), now: () => now });
  s.register('Ana', tok('a'));
  s.register('Beto', tok('b'));
  now = new Date('2026-09-28T12:00:00').getTime(); // segunda
  s.recordRun('Ana', { score: 900, wave: 9, cls: 'dev' });
  now = new Date('2026-09-30T12:00:00').getTime();
  s.recordRun('Ana', { score: 300, wave: 4, cls: 'dev' });
  s.recordRun('Beto', { score: 400, wave: 5, cls: 'qa' });
  s.recordTeam({ score: 1300, wave: 9, nicks: ['Ana', 'Beto'] });
  const all = s.ranking('all');
  assert.deepEqual(all.best.map((r) => [r.nick, r.score]), [['Ana', 900], ['Beto', 400]]);
  assert.equal(all.total[0].score, 1200);
  const day = s.ranking('day');
  assert.deepEqual(day.best.map((r) => [r.nick, r.score]), [['Beto', 400], ['Ana', 300]]);
  assert.equal(s.ranking('week').best[0].nick, 'Ana', 'semana começa na segunda');
  assert.equal(all.teams[0].score, 1300);
});

test('nick inativo por muito tempo pode ser reivindicado', () => {
  let now = 1_000_000;
  const s = new Store({ dir: tmp(), now: () => now, reserveMs: 1000 });
  s.register('Velho', tok('a'));
  s.recordRun('Velho', { score: 50, wave: 1, cls: 'dev' });
  now += 500;
  assert.equal(s.register('Velho', tok('b')).ok, false);
  now += 2000;
  assert.equal(s.register('Velho', tok('b')).ok, true);
  assert.equal(s.ranking('all').best.length, 0, 'pontos do dono anterior somem');
});

test('reset do ranking mantém nicks e visuais', () => {
  const s = new Store({ dir: tmp() });
  s.register('Ana', tok('a'), { body: 1, hairColor: 6 });
  s.recordRun('Ana', { score: 100, wave: 2, cls: 'dev' });
  s.resetRanking();
  assert.equal(s.ranking('all').best.length, 0);
  assert.equal(s.byNick('Ana').look.hairColor, 6);
  assert.equal(s.byNick('Ana').total.score, 0);
});

test('arquivo corrompido é preservado e o servidor sobe vazio', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'posigame.json'), '{ isto não é json');
  const s = new Store({ dir });
  assert.equal(s.players.size, 0);
  assert.ok(fs.readdirSync(dir).some((f) => f.includes('corrompido')));
});
