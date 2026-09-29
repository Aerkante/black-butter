import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, STEPS, ARP_PATTERNS, chordTones, bassNote, arpNote, midiToHz } from '../client/js/music-data.js';

test('afinação: lá 440 Hz e oitavas', () => {
  assert.equal(midiToHz(69), 440);
  assert.ok(Math.abs(midiToHz(81) - 880) < 1e-9);
});

test('acordes e padrões de arpejo são consistentes', () => {
  assert.deepEqual(chordTones(45, 'm'), [45, 48, 52, 57]);
  assert.deepEqual(chordTones(48, 'M'), [48, 52, 55, 60]);
  for (const [name, p] of Object.entries(ARP_PATTERNS)) {
    assert.equal(p.length, STEPS, name);
    assert.ok(p.every((i) => i >= 0 && i <= 3), name);
  }
});

test('trilhas: compassos completos, notas audíveis e dentro dos 16 passos', () => {
  for (const [name, t] of Object.entries(TRACKS)) {
    assert.ok(t.tempo >= 80 && t.tempo <= 200, name);
    assert.equal(t.bars.length, 8, `${name}: 8 compassos`);
    assert.ok(ARP_PATTERNS[t.arp], name);
    for (const b of t.bars) {
      assert.ok(b.root >= 30 && b.root <= 60, `${name}: baixo`);
      assert.ok(['m', 'M'].includes(b.q));
      let last = -1;
      for (const [s, note, len] of b.mel) {
        assert.ok(s >= 0 && s < STEPS && s > last, `${name}: passos crescentes`);
        assert.ok(s + len <= STEPS, `${name}: nota não passa do compasso`);
        assert.ok(note >= 60 && note <= 92, `${name}: nota ${note}`);
        last = s;
      }
      for (let s = 0; s < STEPS; s++) {
        const bn = bassNote(b.root, s);
        assert.ok(bn === 0 || (bn >= 30 && bn <= 75));
        assert.ok(arpNote(b, t.arp, s) > 60);
      }
    }
    for (const arr of Object.values(t.drums)) assert.ok(arr.every((s) => s >= 0 && s < STEPS));
  }
});

test('a trilha de chefe é mais rápida que a de combate, que é mais rápida que a do menu', () => {
  assert.ok(TRACKS.boss.tempo > TRACKS.battle.tempo && TRACKS.battle.tempo > TRACKS.menu.tempo);
});

import { TRACK_META, TRACK_ORDER, POOLS } from '../client/js/music-data.js';

test('há 7 faixas com nome e todas pertencem a um grupo do modo automático', () => {
  assert.equal(TRACK_ORDER.length, 7);
  assert.deepEqual([...TRACK_ORDER].sort(), Object.keys(TRACKS).sort());
  for (const id of TRACK_ORDER) assert.ok(TRACK_META[id].name.length > 3, id);
  const pooled = Object.values(POOLS).flat();
  assert.deepEqual([...pooled].sort(), [...TRACK_ORDER].sort(), 'nenhuma faixa fica de fora ou repetida');
  for (const [kind, ids] of Object.entries(POOLS)) {
    assert.ok(ids.length >= 2, kind);
    for (const id of ids) assert.equal(TRACK_META[id].kind, kind);
  }
});

test('faixas do mesmo grupo têm andamento coerente e sonoridade diferente', () => {
  for (const id of POOLS.battle) assert.ok(TRACKS[id].tempo >= 140 && TRACKS[id].tempo <= 170, id);
  for (const id of POOLS.boss) assert.ok(TRACKS[id].tempo >= 170, id);
  for (const id of POOLS.menu) assert.ok(TRACKS[id].tempo <= 105, id);
  const roots = new Set(POOLS.battle.map((id) => TRACKS[id].bars[0].root));
  assert.equal(roots.size, POOLS.battle.length, 'cada faixa começa em outra tonalidade');
});
