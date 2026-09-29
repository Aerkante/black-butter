import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import WebSocket from 'ws';
import { createApp } from '../server/index.js';

const tok = (c) => c.repeat(32);

async function boot(overrides = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'posigame-srv-'));
  const app = createApp({ dataDir, port: 0, playersPerMatch: 2, ...overrides });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  app.port = app.server.address().port;
  return app;
}

class Client {
  constructor(port) {
    this.ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    this.msgs = [];
    this.waiters = [];
    this.ws.on('message', (d) => {
      const m = JSON.parse(d.toString());
      this.msgs.push(m);
      this.waiters = this.waiters.filter((w) => !w(m));
    });
    this.opened = new Promise((r) => this.ws.on('open', r));
    this.closed = new Promise((r) => this.ws.on('close', (code) => r(code)));
  }
  send(o) {
    this.ws.send(JSON.stringify(o));
  }
  next(pred, ms = 2000) {
    const found = this.msgs.find(pred);
    if (found) return Promise.resolve(found);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout esperando mensagem')), ms);
      this.waiters.push((m) => {
        if (!pred(m)) return false;
        clearTimeout(t);
        resolve(m);
        return true;
      });
    });
  }
  async hello(token, nick) {
    await this.opened;
    this.send({ t: 'hello', token, nick });
  }
  close() {
    this.ws.close();
  }
}

const get = (port, p) =>
  new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: p }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    }).on('error', reject);
  });

test('identificação: nick novo, inválido, repetido e reconhecido pelo aparelho', async () => {
  const app = await boot();
  try {
    const a = new Client(app.port);
    await a.hello(tok('a'));
    await a.next((m) => m.t === 'need_nick');
    a.send({ t: 'hello', token: tok('a'), nick: 'x' });
    assert.equal((await a.next((m) => m.t === 'err')).code, 'nick');
    a.send({ t: 'hello', token: tok('a'), nick: 'Duda' });
    const w = await a.next((m) => m.t === 'welcome');
    assert.equal(w.nick, 'Duda');

    const b = new Client(app.port);
    await b.hello(tok('b'), 'duda');
    assert.match((await b.next((m) => m.t === 'err')).msg, /em uso/);
    await b.hello(tok('b'), 'p0rr4');
    assert.match((await b.next((m) => m.t === 'err' && /permitido/.test(m.msg))).msg, /permitido/);

    // mesmo aparelho, outra conexão: reconhecido sem pedir nick e substitui a anterior
    const c = new Client(app.port);
    await c.hello(tok('a'));
    assert.equal((await c.next((m) => m.t === 'welcome')).nick, 'Duda');
    assert.equal(await a.closed, 4001);
    b.close();
    c.close();
  } finally {
    await app.close();
  }
});

test('entra na partida, recebe snapshots, anda e sai gravando estatísticas', async () => {
  const app = await boot();
  try {
    const a = new Client(app.port);
    await a.hello(tok('a'), 'Ana');
    await a.next((m) => m.t === 'welcome');
    a.send({ t: 'join', cls: 'po' });
    const j = await a.next((m) => m.t === 'joined');
    assert.equal(j.cls, 'po');
    const roster = await a.next((m) => m.t === 'roster');
    assert.equal(roster.players[0].nick, 'Ana');
    const s1 = await a.next((m) => m.t === 's');
    const me1 = s1.p.find((p) => p[0] === j.you);
    a.send({ t: 'in', dx: 1, dy: 0, a: 0 });
    await new Promise((r) => setTimeout(r, 600));
    const last = [...a.msgs].reverse().find((m) => m.t === 's');
    const me2 = last.p.find((p) => p[0] === j.you);
    assert.ok(me2[1] > me1[1] + 0.5, `andou de ${me1[1]} para ${me2[1]}`);
    a.send({ t: 'sk', n: 1 });
    a.send({ t: 'leave' });
    const left = await a.next((m) => m.t === 'left');
    assert.ok(left.stats);
    assert.equal(app.mm.matches.size, 1);
    a.close();
  } finally {
    await app.close();
  }
});

test('várias partidas: abre outra quando a primeira enche', async () => {
  const app = await boot({ playersPerMatch: 2 });
  try {
    const names = ['Ana', 'Beto', 'Caio'];
    const cs = [];
    for (const [i, n] of names.entries()) {
      const c = new Client(app.port);
      await c.hello(tok(String(i + 1)), n);
      await c.next((m) => m.t === 'welcome');
      c.send({ t: 'join', cls: 'dev' });
      cs.push([c, await c.next((m) => m.t === 'joined')]);
    }
    assert.equal(cs[0][1].match, cs[1][1].match, 'os dois primeiros juntos');
    assert.notEqual(cs[2][1].match, cs[0][1].match, 'terceiro em outra partida');
    assert.equal(app.mm.matches.size, 2);
    cs[0][0].send({ t: 'list' });
    const list = await cs[0][0].next((m) => m.t === 'matches');
    assert.equal(list.list.length, 2);
    assert.equal(list.list[0].capacity, 2);
    cs.forEach(([c]) => c.close());
  } finally {
    await app.close();
  }
});

test('servidor cheio recusa a entrada', async () => {
  const app = await boot({ playersPerMatch: 1, maxMatches: 1 });
  try {
    const a = new Client(app.port);
    await a.hello(tok('a'), 'Ana');
    await a.next((m) => m.t === 'welcome');
    a.send({ t: 'join', cls: 'dev' });
    await a.next((m) => m.t === 'joined');
    const b = new Client(app.port);
    await b.hello(tok('b'), 'Beto');
    await b.next((m) => m.t === 'welcome');
    b.send({ t: 'join', cls: 'dev' });
    assert.match((await b.next((m) => m.t === 'err' && m.code === 'join')).msg, /cheio/i);
    a.close();
    b.close();
  } finally {
    await app.close();
  }
});

test('queda de rede mantém o lugar e a reconexão volta para a mesma partida', async () => {
  const app = await boot();
  try {
    const a = new Client(app.port);
    await a.hello(tok('a'), 'Ana');
    await a.next((m) => m.t === 'welcome');
    a.send({ t: 'join', cls: 'dev' });
    const j = await a.next((m) => m.t === 'joined');
    a.ws.terminate(); // cai sem avisar
    await a.closed;
    await new Promise((r) => setTimeout(r, 100));
    const m = app.mm.matches.get(j.match);
    assert.equal(m.connectedCount(), 0);
    assert.equal(m.size, 1, 'lugar reservado');
    const b = new Client(app.port);
    await b.hello(tok('a'));
    await b.next((x) => x.t === 'welcome');
    const j2 = await b.next((x) => x.t === 'joined');
    assert.equal(j2.match, j.match);
    assert.equal(j2.you, j.you);
    assert.equal(m.connectedCount(), 1);
    b.close();
  } finally {
    await app.close();
  }
});

test('ranking recebe a pontuação de quem sai; API responde', async () => {
  const app = await boot();
  try {
    const a = new Client(app.port);
    await a.hello(tok('a'), 'Ana');
    await a.next((m) => m.t === 'welcome');
    a.send({ t: 'join', cls: 'dev' });
    const j = await a.next((m) => m.t === 'joined');
    app.mm.matches.get(j.match).players.get(j.you).score = 321;
    a.send({ t: 'leave' });
    await a.next((m) => m.t === 'left');
    const r = await get(app.port, '/api/ranking?range=all');
    const data = JSON.parse(r.body);
    assert.equal(data.best[0].nick, 'Ana');
    assert.equal(data.best[0].score, 321);
    const st = JSON.parse((await get(app.port, '/api/status')).body);
    assert.equal(st.players, 0);
    a.close();
  } finally {
    await app.close();
  }
});

test('arquivos estáticos: serve o cliente, bloqueia travessia de diretório', async () => {
  const app = await boot();
  try {
    const home = await get(app.port, '/');
    assert.equal(home.status, 200);
    assert.match(home.body, /PosiGame/);
    assert.match(home.headers['content-security-policy'], /default-src 'self'/);
    assert.equal((await get(app.port, '/shared/game.js')).status, 200);
    assert.equal((await get(app.port, '/client/fonts/vt323-latin-400-normal.woff2')).headers['content-type'], 'font/woff2');
    assert.equal((await get(app.port, '/server/config.js')).status, 404);
    assert.equal((await get(app.port, '/client/..%2fserver/config.js')).status, 403);
    const dots = await get(app.port, '/client/%2e%2e/package.json');
    assert.ok([403, 404].includes(dots.status) && !dots.body.includes('posigame'), 'nunca serve fora das pastas públicas');
    assert.equal((await get(app.port, '/package.json')).status, 404);
  } finally {
    await app.close();
  }
});

test('mensagem gigante ou lixo não derruba o servidor', async () => {
  const app = await boot();
  try {
    const a = new Client(app.port);
    await a.opened;
    a.ws.send('isto não é json');
    a.ws.send(JSON.stringify({ t: 'in', dx: 1 })); // sem identificar
    a.send({ t: 'hello', token: 'curto' });
    assert.equal((await a.next((m) => m.t === 'err' && m.code === 'token')).code, 'token');
    a.ws.send('x'.repeat(5000));
    assert.equal(await a.closed, 1009);
    const b = new Client(app.port);
    await b.hello(tok('b'), 'Beto');
    await b.next((m) => m.t === 'welcome');
    b.close();
  } finally {
    await app.close();
  }
});
