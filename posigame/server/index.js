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
import { createLogger, silentLogger, deviceOf } from './logger.js';
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
  const log =
    cfg.logLevel === 'silent'
      ? silentLogger
      : createLogger({
          level: cfg.logLevel,
          dir: cfg.logFile ? path.join(cfg.dataDir, 'logs') : null,
          stream: cfg.logStream ?? process.stdout,
        });
  const store = new Store({
    dir: cfg.dataDir,
    maxRuns: cfg.maxRuns,
    maxTeams: cfg.maxTeams,
    reserveMs: cfg.nickReserveMs,
    log,
  });
  const mm = new Matchmaker({ config: cfg, store, log });
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
    const ip = clientIp(req);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      log.warn('rede', `${ip} ${req.method} ${url.pathname}: método não permitido`);
      return send(res, 405, 'Método não permitido');
    }

    if (url.pathname.startsWith('/api/')) log.debug('rede', `${ip} GET ${url.pathname}${url.search}`);
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

    if (url.pathname === '/') log.info('rede', `página aberta por ${ip} (${deviceOf(req.headers['user-agent'])})`);
    let rel;
    try {
      rel = url.pathname === '/' ? '/client/index.html' : decodeURIComponent(url.pathname);
    } catch {
      return send(res, 400, 'Requisição inválida');
    }
    const seg = rel.split('/')[1];
    if (!roots[seg]) {
      log.warn('rede', `${ip} pediu ${url.pathname}: não encontrado`);
      return send(res, 404, 'Não encontrado');
    }
    const file = path.normalize(path.join(cfg.root, rel));
    if (!file.startsWith(roots[seg] + path.sep)) {
      log.warn('rede', `${ip} tentou acessar fora das pastas públicas: ${url.pathname}`);
      return send(res, 403, 'Acesso negado');
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        log.warn('rede', `${ip} pediu ${url.pathname}: arquivo não existe`);
        return send(res, 404, 'Não encontrado');
      }
      send(res, 200, req.method === 'HEAD' ? '' : data, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
    });
  });

  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 2048 });

  wss.on('connection', (ws, req) => {
    const ip = clientIp(req);
    const n = perIp.get(ip) || 0;
    if (sessions.size >= cfg.maxConnections || n >= cfg.maxConnectionsPerIp) {
      log.warn('rede', `conexão de ${ip} recusada (${sessions.size} online, ${n} deste endereço)`);
      ws.close(1013, 'lotado');
      return;
    }
    perIp.set(ip, n + 1);
    const s = new Session(ws, ip, deviceOf(req.headers['user-agent']));
    sessions.add(s);
    log.info('rede', `conexão aberta: ${ip} (${s.device}); ${sessions.size} online`);
    ws.on('message', (data) => s.onMessage(data));
    ws.on('close', (code) => {
      sessions.delete(s);
      perIp.set(ip, Math.max(0, (perIp.get(ip) || 1) - 1));
      log.info('rede', `conexão encerrada: ${s.nick || ip} (código ${code}) após ${Math.round((Date.now() - s.since) / 1000)} s; ${sessions.size} online`);
      s.onClose();
    });
    ws.on('error', (err) => log.warn('rede', `erro de socket de ${s.nick || ip}: ${err.message}`));
  });

  class Session {
    constructor(ws, ip, device = '?') {
      this.ws = ws;
      this.ip = ip;
      this.device = device;
      this.since = Date.now();
      this.lastLimitLog = 0;
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
      log.warn('jogador', `${this.nick || this.ip}: ${msg} (${code})`);
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
      if (!this.allow(hot ? 'in' : 'misc')) {
        if (Date.now() - this.lastLimitLog > 10000) {
          this.lastLimitLog = Date.now();
          log.warn('rede', `${this.nick || this.ip} está enviando mensagens rápido demais (limite de taxa)`);
        }
        return;
      }
      try {
        this.handle(msg);
      } catch (err) {
        log.error('rede', `erro ao tratar mensagem "${msg.t}" de ${this.nick || this.ip}: ${err.stack || err}`);
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
        if (msg.nick === undefined) {
          log.info('jogador', `aparelho novo em ${this.ip} (${this.device}): pedindo nick`);
          return this.send({ t: 'need_nick' });
        }
        const v = validateNick(msg.nick);
        if (!v.ok) {
          log.warn('jogador', `nick ${JSON.stringify(String(msg.nick).slice(0, 20))} recusado (${this.ip}): ${v.error}`);
          return this.send({ t: 'err', code: 'nick', msg: v.error });
        }
        const r = store.register(v.nick, msg.token, msg.look);
        if (!r.ok) return this.fail('nick', r.error);
        rec = r.player;
        log.info('jogador', `${rec.nick} entrou pela primeira vez (${this.ip}, ${this.device})`);
      } else {
        log.info('jogador', `${rec.nick} identificado pelo aparelho (${this.ip}, ${this.device})`);
      }
      // uma conexão por nick: a mais nova substitui a anterior
      for (const o of sessions) {
        if (o !== this && o.nick === rec.nick) {
          log.info('jogador', `${rec.nick} abriu o jogo em outro aparelho; a conexão anterior (${o.ip}) foi encerrada`);
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
      log.debug('jogador', `${this.nick} mudou o visual`);
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
      this.match.removePlayer(this.player, 'saiu da partida');
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
  log.debug('servidor', `configuração: ${cfg.maxMatches} partidas, ${cfg.playersPerMatch} jogadores por partida, inatividade ${Math.round(cfg.inactivityMs / 60000)} min, nível de log ${cfg.logLevel}`);

  const close = () =>
    new Promise((resolve) => {
      mm.stop();
      log.info('servidor', 'encerrando: salvando ranking e fechando conexões');
      store.saveNow();
      for (const s of sessions) s.ws.terminate();
      wss.close(() =>
        server.close(() => {
          log.close();
          resolve();
        }),
      );
    });

  return { server, store, mm, cfg, close, sessions, log };
}

function clientIp(req) {
  return (req.socket.remoteAddress || '?').replace(/^::ffff:/, '');
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
  app.server.on('error', (err) => {
    app.log.error('servidor', err.code === 'EADDRINUSE' ? `a porta ${config.port} já está em uso (use PORT=outra)` : `erro no servidor: ${err.message}`);
    process.exit(1);
  });
  app.server.listen(config.port, config.host, () => {
    console.log('\n  PosiGame no ar!\n');
    console.log(`  Neste computador:    http://localhost:${config.port}`);
    for (const ip of lanAddresses()) console.log(`  Na rede (celulares): http://${ip}:${config.port}`);
    console.log(`\n  Partidas: até ${config.maxMatches} com ${config.playersPerMatch} jogadores. Ctrl+C para parar.`);
    console.log(`  Log: tudo aparece aqui${config.logFile ? ` e em ${path.join(config.dataDir, 'logs')}` : ''} (LOG_LEVEL=info para reduzir).\n`);
    app.log.info('servidor', `iniciado na porta ${config.port} (${lanAddresses().join(', ') || 'sem rede'})`);
  });
  const stop = async (sig) => {
    app.log.info('servidor', `sinal ${sig} recebido`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('uncaughtException', (err) => {
    app.log.error('servidor', `erro fatal: ${err.stack || err}`);
    try {
      app.store.saveNow();
    } catch {
      /* já registrado acima */
    }
    process.exit(1);
  });
  process.on('unhandledRejection', (err) => app.log.error('servidor', `promessa rejeitada: ${err?.stack || err}`));
}
