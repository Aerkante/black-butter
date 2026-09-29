import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLook, defaultLook, randomLook, lookKey, ranges } from '../shared/look.js';
import { screenToWorld } from '../client/js/input.js';
import { collides, moveEntity, MAP, SAFE_SPOTS, CLASSES, CLASS_IDS } from '../shared/game.js';

test('validateLook aceita só valores dentro da faixa', () => {
  assert.deepEqual(validateLook(null), defaultLook());
  const v = validateLook({ body: 1, hairColor: 6, skin: 99, glasses: -1, outfit: 'x', badge: 1.5 });
  assert.equal(v.body, 1);
  assert.equal(v.hairColor, 6);
  assert.equal(v.skin, defaultLook().skin);
  assert.equal(v.glasses, 0);
  assert.equal(v.outfit, defaultLook().outfit);
  assert.equal(v.badge, 0);
  for (let i = 0; i < 200; i++) {
    const r = randomLook();
    assert.deepEqual(validateLook(r), r, 'looks aleatórios são sempre válidos');
  }
  assert.equal(lookKey(defaultLook()).split('.').length, Object.keys(ranges()).length);
});

test('cabelo rosa é uma opção livre do catálogo', async () => {
  const { HAIR_COLORS } = await import('../shared/look.js');
  assert.ok(HAIR_COLORS.some((c) => c.name === 'Rosa'));
});

test('direção da tela vira direção do mundo (isométrico) e é normalizada', () => {
  const [ux, uy] = screenToWorld(0, -1); // para cima na tela
  assert.ok(ux < 0 && uy < 0);
  const [rx, ry] = screenToWorld(1, 0); // direita na tela
  assert.ok(rx > 0 && ry < 0);
  for (const [sx, sy] of [[1, 1], [-3, 2], [0.2, -0.9]]) {
    const [x, y] = screenToWorld(sx, sy);
    assert.ok(Math.abs(Math.hypot(x, y) - 1) < 1e-9);
  }
});

test('mapa: pontos seguros e portais livres de obstáculos', () => {
  for (const s of SAFE_SPOTS) assert.equal(collides(s.x, s.y, 0.3), false);
  for (const p of MAP.portals) assert.equal(collides(p.x, p.y, 0.4), false, `portal ${p.x},${p.y}`);
});

test('colisão: desliza pela parede em vez de atravessar', () => {
  const [x, y] = moveEntity(2.9, 14, 1, 1, 4, 0.1, 0.3); // contra o braço da baia de Fiscal (x 3.4..5.3, y 13.4..18.9)
  assert.ok(x <= 2.91);
  assert.ok(y > 14, 'continua deslizando no eixo livre');
});

test('todas as classes têm 3 habilidades com nome curto para o botão', () => {
  for (const id of CLASS_IDS) {
    const c = CLASSES[id];
    assert.equal(c.skills.length, 3);
    for (const s of c.skills) {
      assert.ok(s.cd > 0);
      assert.ok(s.short && s.short.length <= 6, `${id}:${s.name}`);
    }
  }
});
