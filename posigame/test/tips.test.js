import test from 'node:test';
import assert from 'node:assert/strict';
import { TIPS, pickTip } from '../shared/tips.js';
import { CLASS_IDS } from '../shared/game.js';

test('há dicas gerais, de power-ups e de cada classe', () => {
  assert.ok(TIPS.geral.length >= 8 && TIPS.powerups.length >= 8);
  for (const c of CLASS_IDS) assert.ok(TIPS[c].length >= 3, c);
  for (const list of Object.values(TIPS)) for (const t of list) assert.ok(t.length > 20 && t.length < 130, t);
});

test('pickTip devolve texto e inclui dicas da classe', () => {
  let n = 0;
  const rand = () => ((n = (n + 0.137) % 1), n);
  const seen = new Set();
  for (let i = 0; i < 400; i++) seen.add(pickTip('po', rand));
  assert.ok([...seen].some((t) => t.startsWith('PO:')));
  assert.ok(seen.size > 10);
  assert.equal(typeof pickTip('qualquer'), 'string');
});
