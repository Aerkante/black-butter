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
  const desks = MAP.props.filter((p) => p.t === 'desk');
  assert.equal(desks.length, 8);
  const count = (s) => desks.filter((d) => d.sector === s).length;
  assert.equal(count('fiscal'), 2);
  assert.equal(count('sesmt'), 2);
  for (const s of ['secretaria', 'projetos', 'desenvolvimento', 'financeiro']) assert.equal(count(s), 1, s);
  // coluna da direita, de cima para baixo: secretária, projetos, desenvolvimento, financeiro
  const col = desks.filter((d) => d.x > 15).sort((a, b) => a.y - b.y).map((d) => d.sector);
  assert.deepEqual(col, ['secretaria', 'projetos', 'desenvolvimento', 'financeiro']);
  const cadastro = MAP.props.find((p) => p.sector === 'cadastro');
  const room = MAP.rooms.find((r) => r.id === 'componentes');
  assert.ok(cadastro.x >= room.x && cadastro.x < room.x + room.w && cadastro.y >= room.y && cadastro.y < room.y + room.h);
  const others = MAP.props.filter((p) => p.t === 'workbench' && p !== cadastro);
  assert.ok(others.every((w) => w.x > cadastro.x || w.y > cadastro.y), 'Cadastro é a mesa de cima à esquerda');
});

test('mapa novo: mesa comprida na copa, mesa redonda e bancadas sem cadeira nos componentes, totem depois da copa', () => {
  const inRoom = (id) => MAP.props.filter((p) => { const r = MAP.rooms.find((x) => x.id === id); return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h; });
  const copa = inRoom('copa');
  const longTable = copa.find((p) => p.t === 'tableLong');
  assert.ok(longTable && longTable.y > 28, 'mesa na parte de baixo da copa');
  const comp = inRoom('componentes');
  assert.ok(comp.some((p) => p.t === 'roundtable'), 'mesa redonda');
  assert.ok(comp.filter((p) => p.t === 'workbench').length >= 2);
  assert.ok(!comp.some((p) => p.t === 'chair'), 'sem cadeiras na sala de componentes');
  const totem = MAP.props.find((p) => p.t === 'totem');
  const copaRoom = MAP.rooms.find((r) => r.id === 'copa');
  assert.ok(totem.x >= copaRoom.x + copaRoom.w && totem.y > 29.5, 'totem na parede da copa, do lado direito, depois da porta');
});
