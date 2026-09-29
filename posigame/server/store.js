// Persistência simples em arquivo JSON: jogadores (por nick), execuções e recordes de time.
// A escrita é atômica (arquivo temporário + rename) e há backup diário.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateLook } from '../shared/look.js';
import { nickKey } from './nick.js';
import { silentLogger } from './logger.js';

const TOKEN_RE = /^[a-f0-9]{32}$/;
const DAY = 24 * 3600 * 1000;

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
export const validToken = (t) => typeof t === 'string' && TOKEN_RE.test(t);

function startOf(range, now) {
  if (range === 'day') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (range === 'week') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // segunda-feira
    return d.getTime();
  }
  return 0;
}

export class Store {
  constructor({ dir, maxRuns = 20000, maxTeams = 1000, reserveMs = 60 * DAY, now = () => Date.now(), log = silentLogger }) {
    this.log = log;
    this.dir = dir;
    this.file = path.join(dir, 'posigame.json');
    this.maxRuns = maxRuns;
    this.maxTeams = maxTeams;
    this.reserveMs = reserveMs;
    this.now = now;
    this.players = new Map(); // nickKey -> registro
    this.runs = []; // { n, s, w, c, t }
    this.teams = []; // { t, s, w, n: [nicks] }
    this.timer = null;
    this.backupDay = '';
    fs.mkdirSync(dir, { recursive: true });
    this.load();
  }

  load() {
    if (!fs.existsSync(this.file)) return;
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const p of data.players || []) this.players.set(nickKey(p.nick), p);
      this.runs = data.runs || [];
      this.teams = data.teams || [];
      this.log.info('dados', `carregado ${this.file}: ${this.players.size} jogadores, ${this.runs.length} partidas registradas`);
    } catch (err) {
      const bad = `${this.file}.corrompido-${this.now()}`;
      fs.renameSync(this.file, bad);
      this.log.error('dados', `arquivo corrompido, movido para ${bad}: ${err.message}`);
    }
  }

  save() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      try {
        this.saveNow();
      } catch (err) {
        this.log.error('dados', `falha ao salvar: ${err.message}`);
      }
    }, 2000);
    this.timer.unref?.();
  }

  saveNow() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const data = JSON.stringify({ v: 1, players: [...this.players.values()], runs: this.runs, teams: this.teams });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, this.file);
    this.backup();
  }

  backup() {
    const day = new Date(this.now()).toISOString().slice(0, 10);
    if (day === this.backupDay) return;
    this.backupDay = day;
    try {
      const dir = path.join(this.dir, 'backup');
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(this.file, path.join(dir, `posigame-${day}.json`));
      this.log.info('dados', `backup diário gravado (posigame-${day}.json)`);
      const files = fs.readdirSync(dir).filter((f) => f.startsWith('posigame-')).sort();
      for (const f of files.slice(0, Math.max(0, files.length - 14))) fs.unlinkSync(path.join(dir, f));
    } catch (err) {
      this.log.error('dados', `falha no backup: ${err.message}`);
    }
  }

  byNick(nick) {
    return this.players.get(nickKey(nick));
  }

  byToken(token) {
    const h = hashToken(token);
    for (const p of this.players.values()) if (p.tokenHash === h) return p;
    return null;
  }

  // Cria um registro para o nick. Retorna { ok, player } ou { ok:false, error }.
  register(nick, token, look) {
    const existing = this.byNick(nick);
    if (existing) {
      const stale = this.now() - existing.lastSeen > this.reserveMs;
      if (!stale) return { ok: false, error: 'Esse nick já está em uso. Escolha outro.' };
      this.remove(existing.nick); // reserva expirada por inatividade
      this.log.warn('jogador', `nick "${existing.nick}" estava inativo há mais de ${Math.round(this.reserveMs / DAY)} dias e foi liberado`);
    }
    if (this.byToken(token)) return { ok: false, error: 'Este aparelho já tem um nick.' };
    const player = {
      nick,
      tokenHash: hashToken(token),
      look: validateLook(look),
      created: this.now(),
      lastSeen: this.now(),
      total: { score: 0, kills: 0, games: 0 },
      best: { score: 0, wave: 0 },
      classes: {},
    };
    this.players.set(nickKey(nick), player);
    this.save();
    this.log.info('jogador', `novo nick registrado: ${nick} (${this.players.size} jogadores no total)`);
    return { ok: true, player };
  }

  touch(player) {
    player.lastSeen = this.now();
    this.save();
  }

  setLook(player, look) {
    player.look = validateLook(look);
    this.save();
  }

  // Soma parcial (chamada a cada onda) para não perder pontos numa queda do servidor.
  addProgress(nick, { score = 0, kills = 0 }) {
    const p = this.byNick(nick);
    if (!p) return;
    p.total.score += score;
    p.total.kills += kills;
    this.save();
  }

  // Registra o fim da participação de um jogador numa partida.
  recordRun(nick, { score, wave, cls }) {
    const p = this.byNick(nick);
    if (!p) return;
    p.total.games += 1;
    p.classes[cls] = (p.classes[cls] || 0) + 1;
    if (score > p.best.score) p.best = { score, wave };
    else if (wave > p.best.wave && score === p.best.score) p.best.wave = wave;
    this.log.info('ranking', `${p.nick} terminou: ${score} pontos, onda ${wave}, classe ${cls} (melhor pessoal ${p.best.score})`);
    if (score > 0) {
      this.runs.push({ n: p.nick, s: score, w: wave, c: cls, t: this.now() });
      if (this.runs.length > this.maxRuns) this.runs.splice(0, this.runs.length - this.maxRuns);
    }
    this.save();
  }

  recordTeam({ score, wave, nicks }) {
    if (score <= 0) return;
    this.log.info('ranking', `recorde de time: ${score} pontos, onda ${wave} (${nicks.join(', ')})`);
    this.teams.push({ t: this.now(), s: score, w: wave, n: nicks });
    if (this.teams.length > this.maxTeams) this.teams.splice(0, this.teams.length - this.maxTeams);
    this.save();
  }

  ranking(range = 'all', limit = 20) {
    const since = startOf(range, this.now());
    const best = new Map();
    const total = new Map();
    for (const r of this.runs) {
      if (r.t < since) continue;
      const k = nickKey(r.n);
      const cur = best.get(k);
      if (!cur || r.s > cur.score) best.set(k, { nick: r.n, score: r.s, wave: r.w, cls: r.c });
      total.set(k, { nick: r.n, score: (total.get(k)?.score || 0) + r.s });
    }
    const top = (m) => [...m.values()].sort((a, b) => b.score - a.score).slice(0, limit);
    const teams = this.teams
      .filter((t) => t.t >= since)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map((t) => ({ score: t.s, wave: t.w, nicks: t.n }));
    return { range, best: top(best), total: top(total), teams };
  }

  stats(nick) {
    const p = this.byNick(nick);
    return p ? { total: p.total, best: p.best } : null;
  }

  remove(nick) {
    const k = nickKey(nick);
    if (!this.players.delete(k)) return false;
    this.log.warn('dados', `jogador removido: ${nick}`);
    this.runs = this.runs.filter((r) => nickKey(r.n) !== k);
    this.save();
    return true;
  }

  resetRanking() {
    this.log.warn('dados', 'ranking zerado');
    this.runs = [];
    this.teams = [];
    for (const p of this.players.values()) {
      p.total = { score: 0, kills: 0, games: 0 };
      p.best = { score: 0, wave: 0 };
      p.classes = {};
    }
    this.saveNow();
  }
}
