// Gerencia várias partidas em paralelo: entrada automática, criação sob demanda,
// tick de simulação, envio de snapshots e encerramento de partidas vazias.
import { TICK_DT, SNAP_EVERY, CLASSES } from '../shared/game.js';
import { Match } from './match.js';

export class Matchmaker {
  constructor({ config, store, now = () => Date.now() }) {
    this.config = config;
    this.store = store;
    this.now = now;
    this.matches = new Map();
    this.nextId = 1;
    this.timer = null;
    this.acc = 0;
    this.last = 0;
    this.tickCount = 0;
  }

  hooks() {
    const store = this.store;
    return {
      onProgress: (p, d) => store.addProgress(p.nick, d),
      onRun: (p, run) => store.recordRun(p.nick, run),
      onTeamRecord: (t) => store.recordTeam(t),
    };
  }

  createMatch() {
    // reaproveita o menor id livre para a lista não crescer sem limite
    let id = 1;
    while (this.matches.has(id)) id++;
    const m = new Match(id, {
      capacity: this.config.playersPerMatch,
      hooks: this.hooks(),
      reconnectGraceMs: this.config.reconnectGraceMs,
    });
    this.matches.set(id, m);
    return m;
  }

  list() {
    return [...this.matches.values()]
      .sort((a, b) => a.id - b.id)
      .map((m) => ({
        id: m.id,
        players: m.connectedCount(),
        capacity: m.capacity,
        wave: m.wave,
        state: m.state,
        nicks: m.connectedPlayers().map((p) => p.nick),
      }));
  }

  // Escolhe a partida: a indicada (se houver vaga) ou a mais cheia com vaga; senão cria outra.
  pick(matchId) {
    if (matchId) {
      const m = this.matches.get(matchId);
      if (m && !m.isFull) return m;
      if (m) return null;
    }
    let best = null;
    for (const m of this.matches.values()) {
      if (m.isFull || m.state === 'over') continue;
      if (!best || m.connectedCount() > best.connectedCount()) best = m;
    }
    if (best) return best;
    for (const m of this.matches.values()) if (!m.isFull) return m;
    if (this.matches.size >= this.config.maxMatches) return null;
    return this.createMatch();
  }

  join(session, { matchId, cls }) {
    const m = this.pick(matchId);
    if (!m) {
      const chosen = matchId && this.matches.get(matchId);
      return { error: chosen ? 'Essa partida está cheia.' : 'Servidor cheio. Tente de novo em instantes.' };
    }
    const p = m.addPlayer({
      nick: session.nick,
      look: session.look,
      cls: CLASSES[cls] ? cls : 'dev',
      conn: session,
    });
    if (!p) return { error: 'Partida cheia.' };
    return { match: m, player: p };
  }

  findGhost(nick) {
    for (const m of this.matches.values()) {
      for (const p of m.players.values()) if (p.ghost && p.nick === nick) return { match: m, player: p };
    }
    return null;
  }

  start() {
    this.last = performance.now();
    this.timer = setInterval(() => this.loop(), 25);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  loop() {
    const t = performance.now();
    this.acc += Math.min(0.25, (t - this.last) / 1000);
    this.last = t;
    let steps = 0;
    while (this.acc >= TICK_DT && steps < 4) {
      this.acc -= TICK_DT;
      steps++;
      this.tick();
    }
  }

  tick() {
    this.tickCount++;
    const now = this.now();
    for (const m of [...this.matches.values()]) {
      try {
        m.update(TICK_DT);
      } catch (err) {
        console.error(`[partida ${m.id}] erro na simulação:`, err);
        this.destroy(m);
        continue;
      }
      if (m.expired(now, this.config.inactivityMs)) {
        this.destroy(m);
        continue;
      }
      if (this.tickCount % SNAP_EVERY === 0) {
        if (!m.isEmpty) this.broadcast(m);
        m.flushEvents(); // eventos acumulam até o próximo snapshot
      } else if (m.isEmpty) {
        m.flushEvents();
      }
    }
  }

  broadcast(m) {
    const changed = m.events.some((e) => e[0] === 'join' || e[0] === 'leave');
    for (const p of m.players.values()) {
      if (p.ghost || !p.conn) continue;
      if (changed) p.conn.send({ t: 'roster', players: m.roster() });
      p.conn.send(m.snapshot(p));
    }
  }

  destroy(m) {
    for (const p of [...m.players.values()]) {
      m.finishRun(p);
      p.conn?.matchDestroyed?.();
    }
    this.matches.delete(m.id);
  }

  totalPlayers() {
    let n = 0;
    for (const m of this.matches.values()) n += m.connectedCount();
    return n;
  }
}
