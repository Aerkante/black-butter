// Servidor do PosiGame: arquivos estáticos + API de ranking + WebSocket do jogo.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { Store, validToken } from './store.js';
import { Matchmaker } from './matchmaker.js';
import { validateNick } from './nick.js';
import { validateLook } from '../shared/look.js';
import { CLASSES } from '../shared/game.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

// Cria o servidor completo; devolve { server, store, mm, close } (útil para testes).
export function createApp(overrides = {}) {
  const cfg = { ...config, ...overrides };
  const store = new Store({
    dir: cfg.dataDir,
    maxRuns: cfg.maxRuns,
    maxTeams: cfg.maxTeams,
    reserveMs: cfg.nickReserveMs,
  });
  const mm = new Matchmaker({ config: cfg, store });
  const sessions = new Set();
  const perIp = new Map();
  const started = Date.now();

  const send = (res, code, body, headers = {}) => {
    res.writeHead(code, { 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': CSP, ...headers });
    res.end(body);
  };
  const json = (res, obj) =>
    send(res, 200, JSON.stringify(obj), { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });

  const roots = { client: path.join(cfg.root, 'client'), shared: path.join(cfg.root, 'shared') };

  const server = http.createServer((req, res) => {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      return send(res, 400, 'Requisição inválida');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Método não permitido');

    if (url.pathname === '/api/ranking') {
      const range = ['day', 'week', 'all'].includes(url.searchParams.get('range')) ? url.searchParams.get('range') : 'all';
      return json(res, store.ranking(range));
    }
    if (url.pathname === '/api/status') {
      return json(res, {
        matches: mm.matches.size,
        players: mm.totalPlayers(),
        maxMatches: cfg.maxMatches,
        uptime: Math.round((Date.now() - started) / 1000),
      });
    }

    let rel = url.pathname === '/' ? '/client/index.html' : decodeURIComponent(url.pathname);
    const seg = rel.split('/')[1];
    if (!roots[seg]) return send(res, 404, 'Não encontrado');
    const file = path.normalize(path.join(cfg.root, rel));
    if (!file.startsWith(roots[seg] + path.sep)) return send(res, 403, 'Acesso negado');
    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, 'Não encontrado');
      send(res, 200, req.method === 'HEAD' ? '' : data, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
    });
  });

  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 2048 });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress || '?';
    const n = perIp.get(ip) || 0;
    if (sessions.size >= cfg.maxConnections || n >= cfg.maxConnectionsPerIp) {
      ws.close(1013, 'lotado');
      return;
    }
    perIp.set(ip, n + 1);
    const s = new Session(ws, ip);
    sessions.add(s);
    ws.on('message', (data) => s.onMessage(data));
    ws.on('close', () => {
      sessions.delete(s);
      perIp.set(ip, Math.max(0, (perIp.get(ip) || 1) - 1));
      s.onClose();
    });
    ws.on('error', () => {});
  });

  class Session {
    constructor(ws, ip) {
      this.ws = ws;
      this.ip = ip;
      this.nick = null;
      this.look = null;
      this.record = null;
      this.match = null;
      this.player = null;
      this.tokens = { in: 60, misc: 10, at: Date.now() };
    }

    send(obj) {
      if (this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
    }

    fail(code, msg) {
      this.send({ t: 'err', code, msg });
    }

    // balde de fichas simples: entradas de jogo (30/s) e mensagens raras (5/s)
    allow(kind) {
      const now = Date.now();
      const dt = (now - this.tokens.at) / 1000;
      this.tokens.at = now;
      this.tokens.in = Math.min(60, this.tokens.in + dt * 40);
      this.tokens.misc = Math.min(10, this.tokens.misc + dt * 5);
      if (this.tokens[kind] < 1) return false;
      this.tokens[kind] -= 1;
      return true;
    }

    onMessage(data) {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (!msg || typeof msg.t !== 'string') return;
      const hot = msg.t === 'in' || msg.t === 'sk';
      if (!this.allow(hot ? 'in' : 'misc')) return;
      try {
        this.handle(msg);
      } catch (err) {
        console.error('[sessão] erro ao tratar mensagem:', err);
      }
    }

    handle(msg) {
      switch (msg.t) {
        case 'hello':
          return this.hello(msg);
        case 'ping':
          return this.send({ t: 'pong', ts: msg.ts });
      }
      if (!this.nick) return this.fail('auth', 'Identifique-se primeiro.');
      switch (msg.t) {
        case 'in':
          if (this.player) this.match.input(this.player, msg);
          return;
        case 'sk':
          if (this.player && Number.isInteger(msg.n)) this.match.skill(this.player, msg.n);
          return;
        case 'look':
          return this.setLook(msg.look);
        case 'list':
          return this.send({ t: 'matches', list: mm.list() });
        case 'join':
          return this.join(msg);
        case 'leave':
          return this.leave();
      }
    }

    hello(msg) {
      if (!validToken(msg.token)) return this.fail('token', 'Identificador inválido.');
      let rec = store.byToken(msg.token);
      if (!rec) {
        if (msg.nick === undefined) return this.send({ t: 'need_nick' });
        const v = validateNick(msg.nick);
        if (!v.ok) return this.fail('nick', v.error);
        const r = store.register(v.nick, msg.token, msg.look);
        if (!r.ok) return this.fail('nick', r.error);
        rec = r.player;
      }
      // uma conexão por nick: a mais nova substitui a anterior
      for (const o of sessions) {
        if (o !== this && o.nick === rec.nick) {
          o.send({ t: 'kicked', msg: 'Você entrou em outro aparelho.' });
          o.detach();
          o.ws.close(4001, 'substituído');
        }
      }
      this.record = rec;
      this.nick = rec.nick;
      this.look = rec.look;
      store.touch(rec);
      this.send({
        t: 'welcome',
        nick: rec.nick,
        look: rec.look,
        stats: store.stats(rec.nick),
        playersPerMatch: cfg.playersPerMatch,
      });
      const ghost = mm.findGhost(rec.nick);
      if (ghost) {
        ghost.match.reattach(ghost.player, this);
        this.enter(ghost.match, ghost.player);
      }
    }

    setLook(look) {
      this.look = validateLook(look);
      store.setLook(this.record, this.look);
      if (this.player) {
        this.player.look = this.look;
        this.match.events.push(['join', this.player.id]); // força reenvio do elenco
      }
      this.send({ t: 'look', look: this.look });
    }

    join(msg) {
      if (this.player) return;
      const cls = CLASSES[msg.cls] ? msg.cls : 'dev';
      const r = mm.join(this, { matchId: Number.isInteger(msg.match) ? msg.match : 0, cls });
      if (r.error) return this.fail('join', r.error);
      this.enter(r.match, r.player);
    }

    enter(match, player) {
      this.match = match;
      this.player = player;
      this.send({ t: 'joined', match: match.id, you: player.id, cls: player.cls, capacity: match.capacity });
      this.send({ t: 'roster', players: match.roster() });
    }

    leave() {
      if (!this.player) return;
      this.match.removePlayer(this.player);
      this.detach();
      this.send({ t: 'left', stats: store.stats(this.nick) });
    }

    detach() {
      this.match = null;
      this.player = null;
    }

    matchDestroyed() {
      this.detach();
      this.send({ t: 'left', reason: 'A partida foi encerrada por inatividade.', stats: store.stats(this.nick) });
    }

    onClose() {
      if (this.player) {
        // mantém o lugar por alguns segundos para reconexão
        this.match.disconnect(this.player, { keep: true });
        this.detach();
      }
    }
  }

  mm.start();

  const close = () =>
    new Promise((resolve) => {
      mm.stop();
      store.saveNow();
      for (const s of sessions) s.ws.terminate();
      wss.close(() => server.close(() => resolve()));
    });

  return { server, store, mm, cfg, close, sessions };
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(i.address);
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const app = createApp();
  app.server.listen(config.port, config.host, () => {
    console.log('\n  PosiGame no ar!\n');
    console.log(`  Neste computador:  http://localhost:${config.port}`);
    for (const ip of lanAddresses()) console.log(`  Na rede (celulares): http://${ip}:${config.port}`);
    console.log(`\n  Partidas: até ${config.maxMatches} com ${config.playersPerMatch} jogadores. Ctrl+C para parar.\n`);
  });
  const stop = async () => {
    console.log('\nSalvando ranking e encerrando...');
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
