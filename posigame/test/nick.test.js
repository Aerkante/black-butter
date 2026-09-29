import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNick, isOffensive } from '../server/nick.js';

test('aceita nicks válidos', () => {
  for (const n of ['Duda', 'byte_lu', 'PO-Ana.1', 'computador', 'Ana123']) {
    assert.equal(validateNick(n).ok, true, n);
  }
});

test('rejeita tamanho e caracteres inválidos', () => {
  assert.equal(validateNick('ab').ok, false);
  assert.equal(validateNick('a'.repeat(13)).ok, false);
  assert.equal(validateNick('joão').ok, false);
  assert.equal(validateNick('a b c').ok, false);
  assert.equal(validateNick('<script>').ok, false);
  assert.equal(validateNick(42).ok, false);
});

test('bloqueia palavrões, inclusive disfarçados, sem falso positivo', () => {
  assert.equal(isOffensive('p0rr4'), true);
  assert.equal(isOffensive('M3rd4_1'), true);
  assert.equal(isOffensive('fdp'), true);
  assert.equal(isOffensive('puta'), true);
  assert.equal(isOffensive('computador'), false);
  assert.equal(isOffensive('Analista'), false);
  assert.equal(isOffensive('culinaria'), false);
});

test('bloqueia nomes reservados', () => {
  assert.equal(validateNick('Admin').ok, false);
  assert.equal(validateNick('PosiGame').ok, false);
});
