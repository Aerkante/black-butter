import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES, ENEMY_IDS, PICKUP_TYPES, SECTORS, MAP } from '../shared/game.js';

test('todo inimigo tem descrição, números e a onda em que aparece (para o Guia)', () => {
  for (const id of ENEMY_IDS) {
    const e = ENEMIES[id];
    assert.ok(e.name && e.desc.length > 20, id);
    assert.ok(e.hp > 0 && e.speed > 0 && e.dmg > 0 && e.pts > 0 && e.from >= 1, id);
  }
  assert.equal(ENEMIES.boss.from, 5);
});

test('todo power-up tem raridade coerente com o peso do sorteio', () => {
  const total = PICKUP_TYPES.reduce((a, p) => a + p.w, 0);
  assert.equal(total, 103);
  for (const p of PICKUP_TYPES) assert.ok(p.name && p.desc && p.color.startsWith('#'));
});

test('cada mesa do salão pertence a um setor e todos os setores estão no mapa', () => {
  const used = new Set(MAP.props.filter((p) => p.sector).map((p) => p.sector));
  assert.deepEqual([...used].sort(), Object.keys(SECTORS).sort());
  // só a secretária tem mesa individual; todas as outras são baias em "+" com 4 lugares
  const desks = MAP.props.filter((p) => p.t === 'desk');
  assert.deepEqual(desks.map((d) => d.sector), ['secretaria']);
  const baias = MAP.props.filter((p) => p.t === 'baia');
  const count = (s) => baias.filter((b) => b.sector === s).length;
  assert.equal(baias.length, 8);
  assert.equal(count('fiscal'), 2);
  assert.equal(count('sesmt'), 2);
  for (const s of ['cadastro', 'projetos', 'desenvolvimento', 'financeiro']) assert.equal(count(s), 1, s);
  for (const b of baias) {
    assert.equal(b.rects.length, 2, 'formato de +');
    const seats = MAP.props.filter((p) => p.t === 'chair' && p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h);
    assert.equal(seats.length, 4, `4 lugares na baia ${b.sector}`);
  }
  const cad = baias.find((b) => b.sector === 'cadastro');
  assert.ok(cad.w > cad.h * 2, 'Cadastro é a baia larga');
  // coluna da direita, de cima para baixo: secretária, projetos, desenvolvimento, financeiro
  const col = [...desks, ...baias].filter((d) => d.x > 28).sort((a, b) => a.y - b.y).map((d) => d.sector);
  assert.deepEqual(col, ['secretaria', 'projetos', 'desenvolvimento', 'financeiro']);
  // nenhuma baia dentro de uma sala
  for (const b of baias) assert.equal(MAP.rooms.some((r) => b.x >= r.x && b.x < r.x + r.w && b.y >= r.y && b.y < r.y + r.h), false);
});

test('sala de componentes: U de mesas, mesa redonda com 3 cadeiras, sem armários; ponto é caixa na paredinha perto do Financeiro', () => {
  const inRoom = (id) => MAP.props.filter((p) => { const r = MAP.rooms.find((x) => x.id === id); return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h; });
  const copa = inRoom('copa');
  const longTable = copa.find((p) => p.t === 'tableLong');
  assert.ok(longTable && longTable.y > 52, 'mesa na parte de baixo da copa');
  const comp = inRoom('componentes');
  assert.equal(comp.filter((p) => p.t === 'workbench').length, 3, 'três mesas de componentes');
  assert.equal(comp.filter((p) => p.t === 'roundtable').length, 1);
  assert.equal(comp.filter((p) => p.t === 'chair').length, 3, 'só as cadeiras da mesa redonda');
  assert.ok(!comp.some((p) => /^rack|^locker/.test(p.t)), 'sem armários');
  const totem = MAP.props.find((p) => p.t === 'totem');
  const wall = MAP.walls.find((w) => w.h > w.w && Math.abs(totem.x - (w.x + w.w)) < 0.05 && totem.y >= w.y && totem.y <= w.y + w.h);
  assert.ok(wall, 'totem encostado numa parede');
  assert.ok(Math.max(totem.w, totem.h) < 1 && Math.min(totem.w, totem.h) < 0.5, 'só uma caixinha');
  const fin = MAP.props.find((p) => p.sector === 'financeiro');
  assert.ok(MAP.rooms.find((r) => r.id === 'copa').x + 13 >= totem.x - 0.3, 'na parede da copa');
});

test('sala do diretor é simples', () => {
  const r = MAP.rooms.find((x) => x.id === 'diretor');
  const inside = MAP.props.filter((p) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
  assert.ok(inside.length <= 5);
  assert.ok(inside.some((p) => p.t === 'bigdesk'));
});
