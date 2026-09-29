import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLogger, silentLogger, deviceOf, stamp } from '../server/logger.js';

const sink = () => {
  const lines = [];
  return { lines, stream: { write: (l) => lines.push(l) } };
};

test('formato: data e hora, nível e categoria; sem cores fora de terminal', () => {
  const { lines, stream } = sink();
  const log = createLogger({ level: 'debug', stream, color: false, now: () => new Date(2026, 8, 29, 12, 5, 9) });
  log.info('rede', 'olá');
  log.warn('jogador', 'atenção');
  assert.equal(lines[0], '2026-09-29 12:05:09 INFO  [rede] olá\n');
  assert.equal(lines[1], '2026-09-29 12:05:09 AVISO [jogador] atenção\n');
});

test('níveis: info esconde debug; silent não escreve nada', () => {
  const a = sink();
  const info = createLogger({ level: 'info', stream: a.stream, color: false });
  info.debug('combate', 'x');
  info.info('rede', 'y');
  assert.equal(a.lines.length, 1);
  const b = sink();
  const quiet = createLogger({ level: 'silent', stream: b.stream, color: false });
  quiet.error('rede', 'z');
  assert.equal(b.lines.length, 0);
  assert.doesNotThrow(() => silentLogger.info('a', 'b'));
});

test('com cores em terminal: mantém o texto e usa códigos ANSI', () => {
  const { lines, stream } = sink();
  createLogger({ level: 'debug', stream, color: true }).error('rede', 'falhou');
  assert.match(lines[0], /\x1b\[31m/);
  assert.match(lines[0], /falhou/);
});

test('grava em arquivo diário e cria a pasta sozinho', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'posigame-log-')), 'logs');
  const log = createLogger({ level: 'info', dir, stream: null, color: false, now: () => new Date(2026, 8, 29, 8, 0, 0) });
  log.info('servidor', 'iniciado');
  log.debug('combate', 'não vai para o arquivo');
  log.close();
  const file = path.join(dir, 'posigame-2026-09-29.log');
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /INFO {2}\[servidor\] iniciado/);
  assert.ok(!text.includes('combate'));
});

test('falha ao gravar o arquivo nunca derruba o jogo', () => {
  const dir = path.join(os.tmpdir(), 'posigame-x', '\0invalido');
  const log = createLogger({ level: 'info', dir, stream: null });
  assert.doesNotThrow(() => log.info('rede', 'ok'));
});

test('dispositivo a partir do user-agent e carimbo de data', () => {
  assert.equal(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'iOS');
  assert.equal(deviceOf('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'Android');
  assert.equal(deviceOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'Windows');
  assert.equal(deviceOf(''), 'desconhecido');
  assert.match(stamp(new Date(2026, 0, 2, 3, 4, 5)), /^2026-01-02 03:04:05$/);
});
