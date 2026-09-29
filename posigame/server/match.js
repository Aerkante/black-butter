// Simulação autoritativa de uma partida: jogadores, bugs, ondas, pontuação, spawn seguro.
// O servidor decide tudo; o cliente só envia direção de movimento e pedidos de ação.
import {
  MAP,
  TICK_DT,
  SAFE_SPOTS,
  PLAYER_RADIUS,
  CLASSES,
  ENEMIES,
  ENEMY_IDS,
  LIMITS,
  PICKUP_TYPES,
  EGG,
  moveEntity,
  distToRect,
} from '../shared/game.js';
import { silentLogger } from './logger.js';
import { serverField, fieldTo, dirFrom, losClear, cellOf } from './nav.js';

const SAFE_ENEMY_SPAWN = 6.5; // distância mínima entre um portal e qualquer jogador
const TELEGRAPH = 1.0; // aviso visual antes de o bug nascer
const SPAWN_INVULN = 3; // invulnerabilidade ao entrar/renascer
const BREAK_TIME = 5;
const OVER_TIME = 10;
const COMBO_WINDOW = 3;
const REVIVE_TIME = 2.5;
const GHOST_GRACE_DEFAULT = 45;

const round1 = (v) => Math.round(v * 10) / 10;
const round2 = (v) => Math.round(v * 100) / 100;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Match {
  constructor(id, opts = {}) {
    this.id = id;
    this.logger = opts.log ?? silentLogger;
    this.capacity = opts.capacity ?? 4;
    this.rand = opts.rand ?? Math.random;
    this.hooks = opts.hooks ?? {};
    this.reconnectGraceMs = opts.reconnectGraceMs ?? GHOST_GRACE_DEFAULT * 1000;
    this.players = new Map();
    this.nextId = 1;
    this.emptySince = Date.now(); // relógio de parede: usado pela inatividade
    this.reset();
  }

  // log com o número da partida
  L(level, tag, msg) {
    this.logger[level](tag, `#${this.id} ${msg}`);
  }

  // ----- ciclo de vida -----

  reset() {
    this.t = 0;
    this.wave = 0;
    this.state = 'break'; // break | wave | over
    this.stateT = 2; // primeira onda começa em 2 s
    this.enemies = [];
    this.pickups = [];
    this.queue = [];
    this.spawnT = 0;
    this.nextEnemyId = 1;
    this.nextPickupId = 1;
    this.combo = 0;
    this.comboT = 0;
    this.teamScore = 0;
    this.server = { hp: 0, max: 0, inv: 0 };
    this.buffs = { dmgUntil: 0, freezeUntil: 0, hasteUntil: 0 };
    this.waveHurt = false;
    this.events = [];
    this.fire = null;
    this.overInfo = null;
    this.serverMax();
    this.server.hp = this.server.max;
    for (const p of this.players.values()) this.resetPlayerForRun(p);
  }

  serverMax() {
    const n = Math.max(1, this.connectedCount());
    this.server.max = Math.round(400 + 100 * (n - 1));
  }

  connectedPlayers() {
    return [...this.players.values()].filter((p) => !p.ghost);
  }
  connectedCount() {
    let n = 0;
    for (const p of this.players.values()) if (!p.ghost) n++;
    return n;
  }
  get size() {
    return this.players.size;
  }
  get isFull() {
    return this.players.size >= this.capacity;
  }
  get isEmpty() {
    return this.connectedCount() === 0;
  }

  resetPlayerForRun(p) {
    const cls = CLASSES[p.cls];
    p.hp = cls.hp;
    p.maxHp = cls.hp;
    p.downed = false;
    p.reviveProg = 0;
    p.score = 0;
    p.kills = 0;
    p.flushedScore = 0;
    p.flushedKills = 0;
    p.hurt = false;
    p.runDone = false;
    p.cheated = false;
    p.sleep = false;
    p.god = false;
    p.cd = { atk: 0, s1: 0, s2: 0, ult: 0 };
    p.fx = { speedUntil: 0, shieldUntil: 0, slowUntil: 0, overUntil: 0 };
    this.placeSafely(p);
  }

  // Escolhe o ponto seguro mais distante dos inimigos e dos outros jogadores.
  placeSafely(p) {
    let best = SAFE_SPOTS[0];
    let bestScore = -1;
    for (const s of SAFE_SPOTS) {
      let d = 99;
      for (const e of this.enemies) d = Math.min(d, Math.hypot(e.x - s.x, e.y - s.y));
      for (const o of this.players.values()) {
        if (o === p || o.ghost || o.downed) continue;
        d = Math.min(d, Math.hypot(o.x - s.x, o.y - s.y) * 0.7 + 0.5);
      }
      d += this.rand() * 0.4; // desempata sem sempre repetir o mesmo ponto
      if (d > bestScore) {
        bestScore = d;
        best = s;
      }
    }
    p.x = best.x;
    p.y = best.y;
    p.invuln = this.t + SPAWN_INVULN;
  }

  addPlayer({ nick, look, cls, conn }) {
    if (this.isFull) return null;
    const id = this.nextId++;
    const p = {
      id,
      nick,
      look,
      cls: CLASSES[cls] ? cls : 'dev',
      conn,
      x: MAP.safeCenter.x,
      y: MAP.safeCenter.y,
      dx: 0,
      dy: 0,
      atk: false,
      face: 1,
      ghost: false,
      ghostAt: 0,
      invuln: 0,
      lastHit: -99,
      lastAtk: -99,
    };
    const wasEmpty = this.isEmpty;
    this.players.set(id, p);
    this.serverMax();
    this.resetPlayerForRun(p);
    p.invuln = this.t + SPAWN_INVULN;
    if (wasEmpty) {
      this.emptySince = 0;
      this.resume();
    }
    this.events.push(['join', id]);
    this.L('info', 'jogador', `${nick} (${CLASSES[p.cls].name}) entrou: ${this.connectedCount()}/${this.capacity} na partida, onda ${this.wave}`);
    return p;
  }

  // Partida pausada que volta a ter jogadores: recomeça a onda em andamento com o servidor
  // recuperado, para ninguém entrar direto num jogo já perdido.
  resume() {
    if (this.state === 'over' || this.wave === 0) return;
    this.enemies = [];
    this.queue = [];
    this.pickups = [];
    this.combo = 0;
    this.buffs = { dmgUntil: 0, freezeUntil: 0, hasteUntil: 0 };
    this.wave = Math.max(0, this.wave - 1);
    this.state = 'break';
    this.stateT = 3;
    this.server.hp = Math.max(this.server.hp, this.server.max * 0.6);
    this.L('info', 'partida', `retomada: a onda ${this.wave + 1} recomeça, servidor em ${Math.round((this.server.hp / this.server.max) * 100)}%`);
  }

  // Reata a conexão de quem caiu da rede, recolocando no ponto seguro.
  reattach(p, conn) {
    const wasEmpty = this.isEmpty;
    p.conn = conn;
    p.ghost = false;
    this.placeSafely(p);
    p.dx = p.dy = 0;
    p.atk = false;
    this.emptySince = 0;
    if (wasEmpty) this.resume();
    this.L('info', 'jogador', `${p.nick} reconectou e voltou ao ponto seguro`);
  }

  // Marca como fantasma (caiu da rede) ou remove de vez.
  disconnect(p, { keep = true } = {}) {
    if (keep) {
      p.ghost = true;
      p.ghostAt = Date.now();
      p.conn = null;
      p.dx = p.dy = 0;
      p.atk = false;
      if (this.connectedCount() === 0) this.emptySince = Date.now();
      this.L('info', 'jogador', `${p.nick} caiu da rede; lugar reservado por ${Math.round(this.reconnectGraceMs / 1000)} s`);
    } else {
      this.removePlayer(p);
    }
  }

  removePlayer(p, reason = 'saiu da partida') {
    this.L('info', 'jogador', `${p.nick} ${reason}: ${p.score} pontos, ${p.kills} bugs, onda ${this.wave}`);
    this.finishRun(p);
    this.players.delete(p.id);
    this.events.push(['leave', p.id]);
    this.serverMax();
    this.server.hp = Math.min(this.server.hp, this.server.max);
    if (this.connectedCount() === 0) this.emptySince = Date.now();
  }

  // Vazia por tempo demais: quem chama decide destruir a partida.
  expired(now, inactivityMs) {
    return this.isEmpty && this.emptySince > 0 && now - this.emptySince >= inactivityMs;
  }

  // ----- entradas do jogador -----

  input(p, msg) {
    if (p.ghost) return;
    let dx = Number(msg.dx) || 0;
    let dy = Number(msg.dy) || 0;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    p.dx = dx;
    p.dy = dy;
    p.atk = !!msg.a;
    p.inAt = Date.now();
    if (dx > 0.2) p.face = 1;
    else if (dx < -0.2) p.face = -1;
  }

  // Cheats secretos. Só pelo servidor; quem usa perde o registro de pontos da rodada (nada vai ao ranking).
  cheat(p, code) {
    if (p.ghost) return null;
    const c = String(code || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    let msg;
    switch (c) {
      case 'sudo':
        p.god = !p.god;
        msg = p.god ? 'sudo: modo deus LIGADO' : 'sudo: modo deus desligado';
        break;
      case 'hotfix':
        for (const q of this.connectedPlayers()) {
          q.downed = false;
          q.hp = q.maxHp;
          q.invuln = this.t + 2;
        }
        this.server.hp = this.server.max;
        msg = 'hotfix: time curado, servidor 100%';
        break;
      case 'cafezao':
        p.fx.speedUntil = this.t + 45;
        msg = 'cafezão: velocidade turbo por 45 s';
        break;
      case 'turbo':
        p.cd = { atk: 0, s1: 0, s2: 0, ult: 0 };
        p.fx.overUntil = this.t + 45;
        msg = 'turbo: recargas zeradas e overclock por 45 s';
        break;
      case 'rmrf':
        this.enemies.length = 0;
        this.queue = [];
        msg = 'rm -rf: todos os bugs removidos';
        break;
      case 'deploy':
        this.queue = [];
        this.enemies.length = 0;
        if (this.state === 'break') this.stateT = 0;
        msg = 'deploy: pulando para a próxima onda';
        break;
      case 'segfault':
        this.makeEnemy('boss', MAP.portals[0].x, MAP.portals[0].y, 1);
        msg = 'segfault: o chefe foi invocado!';
        break;
      default:
        this.L('debug', 'cheat', `${p.nick} tentou um código inválido`);
        return { ok: false, msg: 'comando não encontrado' };
    }
    p.cheated = true;
    this.L('warn', 'cheat', `${p.nick} usou o cheat "${c}" (pontos desta rodada não vão para o ranking)`);
    return { ok: true, msg };
  }

  skill(p, n) {
    if (p.ghost || p.downed || this.state === 'over') return;
    p.sleep = false;
    const key = n === 1 ? 's1' : n === 2 ? 's2' : n === 3 ? 'ult' : null;
    if (!key || p.cd[key] > this.t) return;
    const def = CLASSES[p.cls].skills[n - 1];
    p.cd[key] = this.t + def.cd;
    const info = CAST[p.cls][n - 1](this, p);
    this.L('debug', 'combate', `${p.nick} usou ${def.name}`);
    this.events.push(['skill', p.id, n, round1(p.x), round1(p.y), info || 0]);
  }

  // ----- laço principal -----

  update(dt = TICK_DT) {
    const now = Date.now();
    // fantasmas expiram pelo relógio de parede, mesmo com a partida pausada
    for (const p of [...this.players.values()]) {
      if (p.ghost && now - p.ghostAt > this.reconnectGraceMs) this.removePlayer(p, 'não voltou a tempo');
    }
    if (this.isEmpty) return; // partida pausada, sem custo de simulação

    this.t += dt;
    if (this.state === 'over') {
      this.stateT -= dt;
      if (this.stateT <= 0) {
        this.reset();
        this.L('info', 'partida', `reiniciada com ${this.connectedCount()} jogador(es)`);
      }
      return;
    }

    this.updatePlayers(dt);
    this.updateFlow(dt);
    this.updateEnemies(dt);
    this.updatePickups();
    if (this.comboT > 0 && this.t > this.comboT) this.combo = 0;
    this.checkGameOver();
  }

  updatePlayers(dt) {
    const alive = [];
    for (const p of this.players.values()) {
      if (p.ghost) continue;
      if (p.downed) {
        this.updateRevive(p, dt);
        continue;
      }
      alive.push(p);
      // cliente parou de enviar (aba em segundo plano, rede ruim): solta os controles
      if (p.inAt && Date.now() - p.inAt > 700) {
        p.dx = p.dy = 0;
        p.atk = false;
      }
      const cls = CLASSES[p.cls];
      let speed = cls.speed;
      if (p.fx.speedUntil > this.t) speed *= 1.6;
      if (p.fx.slowUntil > this.t) speed *= 0.5;
      if (p.dx || p.dy) [p.x, p.y] = moveEntity(p.x, p.y, p.dx, p.dy, speed, dt, PLAYER_RADIUS);
      // easter egg: atacar no cantinho secreto da sala de componentes faz o personagem deitar e dormir
      if (p.sleep && (p.dx || p.dy)) p.sleep = false;
      if (!p.sleep && p.atk && p.x >= EGG.x && p.x <= EGG.x + EGG.w && p.y >= EGG.y && p.y <= EGG.y + EGG.h) {
        p.sleep = true;
        p.atk = false;
        this.L('info', 'jogador', `${p.nick} deitou para tirar um cochilo na sala de componentes`);
      }
      if (p.sleep) p.atk = false;
      if (p.atk && p.cd.atk <= this.t) this.attack(p);
      p.hurt = p.lastHit > this.t - 0.25;
    }
    return alive;
  }

  updateRevive(p, dt) {
    // DevOps e PO reavivem aliados que ficam perto
    const healer = [...this.players.values()].find(
      (o) => !o.ghost && !o.downed && (o.cls === 'ops' || o.cls === 'po') && dist(o, p) < 1.6,
    );
    if (healer) {
      p.reviveProg += dt;
      if (p.reviveProg >= REVIVE_TIME) this.revive(p, 0.4);
    } else {
      p.reviveProg = Math.max(0, p.reviveProg - dt);
    }
  }

  revive(p, frac) {
    p.downed = false;
    p.hp = Math.max(1, Math.round(p.maxHp * frac));
    p.reviveProg = 0;
    p.invuln = this.t + 2;
    this.events.push(['rev', p.id]);
    this.L('info', 'jogador', `${p.nick} foi revivido (vida ${p.hp}/${p.maxHp})`);
  }

  attack(p) {
    const cls = CLASSES[p.cls];
    const a = cls.atk;
    const over = p.fx.overUntil > this.t ? 0.4 : 0; // Energético: recarga 40% menor
    p.cd.atk = this.t + a.cd * (1 - over);
    if (a.aoe) {
      const hit = this.enemies.filter((e) => !e.spawning && dist(e, p) <= a.range + e.r);
      if (!hit.length) {
        p.cd.atk = this.t + 0.1;
        return;
      }
      for (const e of hit) this.damageEnemy(e, a.dmg, p);
      this.events.push(['sh', p.id, round1(p.x), round1(p.y), 1]);
      return;
    }
    const target = this.nearestEnemy(p, a.range);
    if (!target) {
      p.cd.atk = this.t + 0.1;
      return;
    }
    if (target.x !== p.x) p.face = target.x > p.x ? 1 : -1;
    if (p.cls === 'qa') target.mark = this.t + 6;
    if (p.cls === 'ops') this.healServer(2);
    this.damageEnemy(target, a.dmg, p);
    p.lastAtk = this.t;
    this.events.push(['sh', p.id, round1(target.x), round1(target.y), 0]);
  }

  nearestEnemy(from, range) {
    let best = null;
    let bd = range;
    for (const e of this.enemies) {
      if (e.spawning) continue;
      const d = dist(e, from) - e.r;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  // ----- ondas -----

  updateFlow(dt) {
    if (this.state === 'break') {
      this.stateT -= dt;
      if (this.stateT <= 0) this.startWave();
      return;
    }
    // state === 'wave'
    if (this.queue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.enemies.length < LIMITS.maxEnemies) {
        if (this.spawnFromQueue()) {
          const n = Math.max(1, this.connectedCount());
          this.spawnT = Math.max(0.35, 1.4 - this.wave * 0.04) / (0.7 + 0.3 * n);
        } else {
          this.spawnT = 0.25; // sem portal seguro agora: tenta de novo
        }
      }
    } else if (this.enemies.length === 0) {
      this.endWave();
    }
  }

  buildWave(n) {
    const np = Math.max(1, this.connectedCount());
    let count = Math.ceil((5 + n * 2.5) * (0.55 + 0.45 * np));
    const pool = ['bug', 'bug', 'bug'];
    if (n >= 2) pool.push('clock', 'clock');
    if (n >= 3) pool.push('leak');
    if (n >= 4) pool.push('mail', 'mail');
    if (n >= 6) pool.push('cal');
    const boss = n % 5 === 0;
    if (boss) count = Math.ceil(count * 0.6);
    const q = [];
    for (let i = 0; i < count; i++) q.push(pool[Math.floor(this.rand() * pool.length)]);
    if (boss) q.splice(Math.floor(q.length / 3), 0, 'boss');
    return q;
  }

  startWave() {
    this.wave += 1;
    this.state = 'wave';
    this.queue = this.buildWave(this.wave);
    this.spawnT = 0.8;
    this.waveHurt = false;
    this.events.push(['wave', this.wave, this.queue.includes('boss') ? 1 : 0]);
    this.L('info', 'onda', `onda ${this.wave} começou: ${this.queue.length} bugs${this.queue.includes('boss') ? ' + CHEFE Segfault' : ''}, ${this.connectedCount()} jogador(es), servidor ${Math.round(this.server.hp)}/${this.server.max}`);
  }

  endWave() {
    // bônus de equipe: todos vivos e ninguém tomou dano = onda perfeita
    const present = this.connectedPlayers();
    const allUp = present.length > 0 && present.every((p) => !p.downed);
    let bonus = 50 * this.wave;
    if (allUp) bonus = Math.round(bonus * 1.25);
    if (!this.waveHurt) bonus = Math.round(bonus * 1.5);
    const share = Math.round(bonus / Math.max(1, present.length));
    for (const p of present) {
      p.score += share;
      this.teamScore += share;
      if (p.downed) this.revive(p, 0.5);
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.3));
    }
    this.healServer(this.server.max * 0.08);
    this.events.push(['clear', this.wave, bonus, this.waveHurt ? 0 : 1]);
    this.L('info', 'onda', `onda ${this.wave} limpa: bônus ${bonus}${this.waveHurt ? '' : ' (perfeita)'}, placar do time ${this.teamScore}, servidor ${Math.round(this.server.hp)}/${this.server.max}`);
    for (const p of present) this.flush(p); // grava o progresso a cada onda
    this.state = 'break';
    this.stateT = BREAK_TIME;
  }

  // ----- inimigos -----

  pickPortal() {
    const alive = this.connectedPlayers().filter((p) => !p.downed);
    const ok = [];
    let far = null;
    let farD = -1;
    for (const pt of MAP.portals) {
      let d = 99;
      for (const p of alive) d = Math.min(d, Math.hypot(p.x - pt.x, p.y - pt.y));
      if (d >= SAFE_ENEMY_SPAWN) ok.push(pt);
      if (d > farD) {
        farD = d;
        far = pt;
      }
    }
    if (ok.length) return ok[Math.floor(this.rand() * ok.length)];
    return farD >= 3.5 ? far : null;
  }

  spawnFromQueue() {
    const portal = this.pickPortal();
    if (!portal) return false;
    const type = this.queue.shift();
    this.makeEnemy(type, portal.x + (this.rand() - 0.5) * 0.8, portal.y + (this.rand() - 0.5) * 0.8, TELEGRAPH);
    return true;
  }

  makeEnemy(type, x, y, telegraph = 0) {
    const def = ENEMIES[type];
    x = Math.min(MAP.w - def.r - 0.05, Math.max(def.r + 0.05, x));
    y = Math.min(MAP.h - def.r - 0.05, Math.max(def.r + 0.05, y));
    const np = Math.max(1, this.connectedCount());
    const mult = (1 + (this.wave - 1) * 0.07) * (1 + 0.1 * (np - 1));
    const e = {
      id: this.nextEnemyId++,
      type,
      def,
      x,
      y,
      r: def.r,
      hp: Math.round(def.hp * mult),
      maxHp: Math.round(def.hp * mult),
      dmg: def.dmg * (1 + (this.wave - 1) * 0.03),
      spawning: telegraph > 0,
      spawnLeft: telegraph,
      mark: 0,
      prio: 0,
      stun: 0,
      slow: 0,
      atkT: 0,
      growT: 5,
      grown: 0,
      chargeT: 4 + this.rand() * 3,
      charging: 0,
      target: null,
      tauntBy: 0,
      tauntUntil: 0,
      retargetT: 0,
      side: 0,
      stuck: 0,
    };
    this.enemies.push(e);
    return e;
  }

  updateEnemies(dt) {
    const frozen = this.buffs.freezeUntil > this.t;
    const haste = this.buffs.hasteUntil > this.t ? 1.3 : 1;
    const players = this.connectedPlayers().filter((p) => !p.downed);
    this.updateFire(dt);
    for (const e of [...this.enemies]) {
      if (e.dead) continue;
      if (e.spawning) {
        e.spawnLeft -= dt;
        if (e.spawnLeft <= 0) e.spawning = false;
        continue;
      }
      if (frozen || e.stun > this.t) continue;

      if (e.type === 'leak') {
        e.growT -= dt;
        if (e.growT <= 0 && e.grown < 3) {
          e.growT = 5;
          e.grown += 1;
          e.hp = Math.round(e.hp * 1.12 + 3);
          e.maxHp = Math.max(e.maxHp, e.hp);
          e.dmg *= 1.15;
          e.r = Math.min(0.7, e.r + 0.06);
        }
      }
      if (e.type === 'cal') {
        for (const p of players) if (dist(p, e) < 2) p.fx.slowUntil = this.t + 0.3;
      }

      // escolha de alvo: provocação > jogador perto > servidor
      e.retargetT -= dt;
      if (e.retargetT <= 0) {
        e.retargetT = 0.4;
        e.target = null;
        const taunter = e.tauntUntil > this.t ? this.players.get(e.tauntBy) : null;
        if (taunter && !taunter.ghost && !taunter.downed) e.target = taunter;
        else {
          let bd = e.def.aggro;
          for (const p of players) {
            const d = dist(p, e);
            // atrás de uma parede o jogador está a salvo: só persegue com linha de visão
            if (d < bd && (d < 1.2 || losClear(e.x, e.y, p.x, p.y, 0.2))) {
              bd = d;
              e.target = p;
            }
          }
        }
      }

      let tx;
      let ty;
      let reach;
      const t = e.target;
      if (t && !t.downed && !t.ghost) {
        tx = t.x;
        ty = t.y;
        reach = e.r + PLAYER_RADIUS + 0.1;
      } else {
        e.target = null;
        tx = MAP.server.x + MAP.server.w / 2;
        ty = MAP.server.y + MAP.server.h / 2;
        reach = 0; // usa a distância até a borda do servidor
      }
      const dToTarget = Math.hypot(tx - e.x, ty - e.y);
      const gap = e.target ? dToTarget - reach : distToRect(e.x, e.y, MAP.server) - e.r - 0.1;

      // sem linha reta livre até o jogador (parede no meio), o bug precisa dar a volta pelas portas
      const los = e.target ? losClear(e.x, e.y, tx, ty, 0.15) : true;
      if (gap > 0.02 || !los) {
        let speed = e.def.speed * haste * (e.slow > this.t ? 0.45 : 1);
        if (e.type === 'boss') {
          e.chargeT -= dt;
          if (e.chargeT <= 0 && e.charging <= 0) {
            e.charging = 1.0;
            e.chargeT = 6;
            this.events.push(['charge', e.id]);
            this.L('debug', 'combate', 'Segfault iniciou uma investida');
          }
          if (e.charging > 0) {
            e.charging -= dt;
            speed *= 3;
          }
        }
        const step = los ? Math.min(speed * dt, Math.max(0, gap)) : speed * dt;
        let ux = (tx - e.x) / (dToTarget || 1);
        let uy = (ty - e.y) / (dToTarget || 1);
        // colisão usa um raio menor para bugs grandes não ficarem presos entre móveis
        const cr = Math.min(e.r, 0.5);
        if (dToTarget > 1.2 && !losClear(e.x, e.y, tx, ty, cr, e.target ? 0.6 : 1.4)) {
          const dir = dirFrom(e.target ? this.playerField(e.target) : serverField(), e.x, e.y);
          if (dir) [ux, uy] = dir;
        }
        const [nx, ny] = moveEntity(e.x, e.y, ux, uy, step / dt, dt, cr);
        if (Math.hypot(nx - e.x, ny - e.y) < step * 0.3) {
          // travado num obstáculo: contorna sempre pelo mesmo lado
          if (!e.side) e.side = this.rand() < 0.5 ? 1 : -1;
          [e.x, e.y] = moveEntity(e.x, e.y, -uy * e.side, ux * e.side, speed, dt, cr);
          e.stuck += dt;
          if (e.stuck > 4) this.unstick(e);
        } else {
          e.x = nx;
          e.y = ny;
          e.side = 0;
          e.stuck = 0;
        }
        // separação simples para os bugs não virarem uma pilha
        for (const o of this.enemies) {
          if (o === e || o.spawning) continue;
          const dx = e.x - o.x;
          const dy = e.y - o.y;
          const d = Math.hypot(dx, dy);
          const min = (e.r + o.r) * 0.8;
          if (d > 0 && d < min) {
            const push = ((min - d) / min) * 0.5 * dt * 2;
            e.x += (dx / d) * push;
            e.y += (dy / d) * push;
          }
        }
      } else if (this.t >= e.atkT) {
        e.atkT = this.t + 1;
        if (e.target) this.hurtPlayer(e.target, e.dmg, e);
        else this.hurtServer(e.dmg);
      }
    }
  }

  // Firewall do DevOps: enquanto dura, os bugs colados no servidor queimam
  updateFire(dt) {
    if (!this.fire || this.t >= this.fire.until) return;
    this.fire.tick -= dt;
    if (this.fire.tick > 0) return;
    this.fire.tick = 0.5;
    const owner = this.players.get(this.fire.by) || null;
    const cx = MAP.server.x + MAP.server.w / 2;
    const cy = MAP.server.y + MAP.server.h / 2;
    for (const e of [...this.enemies]) {
      if (!e.spawning && Math.hypot(e.x - cx, e.y - cy) < 3.6) this.damageEnemy(e, 6, owner);
    }
  }

  // Último recurso: bug preso por mais de 4 s volta a nascer num portal, para a onda nunca travar.
  unstick(e) {
    const portal = this.pickPortal() || MAP.portals[Math.floor(this.rand() * MAP.portals.length)];
    this.L('warn', 'partida', `${e.def.name} ficou preso em (${e.x.toFixed(1)}, ${e.y.toFixed(1)}) e foi reposicionado num portal`);
    e.x = portal.x;
    e.y = portal.y;
    e.stuck = 0;
    e.side = 0;
    e.spawning = true;
    e.spawnLeft = TELEGRAPH;
  }

  // Campo de distâncias até o jogador (para contornar paredes); recalculado quando ele muda de célula
  playerField(p) {
    const c = cellOf(p.x, p.y);
    if (!p.nav || (p.nav.c !== c && this.t - p.nav.t > 0.35)) p.nav = { c, t: this.t, field: fieldTo(p.x, p.y) };
    return p.nav.field;
  }

  damageEnemy(e, dmg, by) {
    if (e.spawning || e.hp <= 0) return;
    let mult = 1;
    if (e.mark > this.t) mult *= 1.3;
    if (e.prio > this.t) mult *= 1.5;
    if (this.buffs.dmgUntil > this.t) mult *= 1.5;
    e.hp -= dmg * mult;
    e.hitAt = this.t;
    if (e.hp <= 0) this.killEnemy(e, by);
  }

  killEnemy(e, by) {
    const idx = this.enemies.indexOf(e);
    if (idx < 0) return;
    this.enemies.splice(idx, 1);
    e.dead = true;
    this.combo += 1;
    this.comboT = this.t + COMBO_WINDOW;
    let pts = e.def.pts * (1 + 0.05 * (this.wave - 1)) * (1 + Math.min(this.combo, 40) * 0.025);
    if (e.prio > this.t) pts *= 2;
    if (by) {
      // passiva do PO: aliados por perto ganham +10% de pontos
      const po = [...this.players.values()].find((o) => !o.ghost && !o.downed && o.cls === 'po' && dist(o, by) < 5);
      if (po) pts *= 1.1;
    }
    pts = Math.round(pts);
    if (by) {
      by.score += pts;
      by.kills += 1;
    }
    this.teamScore += pts;
    this.events.push(['kill', ENEMY_IDS.indexOf(e.type), round1(e.x), round1(e.y), pts, by ? by.id : 0]);
    this.L('debug', 'combate', `${by ? by.nick : '?'} derrotou ${e.def.name} +${pts} (combo ${this.combo})${e.prio > this.t ? ' [prioridade x2]' : ''}`);
    if (e.type === 'mail') {
      for (let i = 0; i < 2; i++) {
        this.makeEnemy('minimail', e.x + (i ? 0.3 : -0.3), e.y + 0.2, 0);
      }
    }
    const drops = e.type === 'boss' ? 3 : this.rand() < (e.type === 'minimail' ? 0.04 : 0.14) ? 1 : 0;
    for (let i = 0; i < drops; i++) this.dropPickup(e.x + (i - (drops - 1) / 2) * 0.7, e.y + (i % 2) * 0.3, e.type === 'boss');
  }

  // Power-ups de chefe (persist) não somem até alguém pegar; os demais duram 14 s.
  dropPickup(x, y, persist = false) {
    let roll = this.rand() * PICKUP_TYPES.reduce((a, p) => a + p.w, 0);
    let kind = 0;
    for (let i = 0; i < PICKUP_TYPES.length; i++) {
      roll -= PICKUP_TYPES[i].w;
      if (roll <= 0) {
        kind = i;
        break;
      }
    }
    const nx = Math.min(MAP.w - 0.5, Math.max(0.5, x));
    const ny = Math.min(MAP.h - 0.5, Math.max(0.5, y));
    this.pickups.push({ id: this.nextPickupId++, kind, x: nx, y: ny, exp: this.t + (persist ? 36000 : 14), persist });
  }

  // ----- dano e cura -----

  hurtPlayer(p, dmg, attacker = null) {
    if (p.downed || p.ghost || p.god || p.invuln > this.t) return;
    if (p.fx.shieldUntil > this.t) {
      dmg *= 0.4;
      // Escudo do Tank: quem bate leva dano de volta
      if (attacker && p.cls === 'tank' && this.enemies.includes(attacker)) this.damageEnemy(attacker, 12, p);
    }
    p.hp -= dmg;
    p.lastHit = this.t;
    p.sleep = false;
    this.waveHurt = true;
    this.events.push(['hurt', p.id]);
    this.L('debug', 'combate', `${p.nick} levou ${Math.round(dmg)} de dano (vida ${Math.max(0, Math.round(p.hp))}/${p.maxHp})`);
    if (p.hp <= 0) {
      p.hp = 0;
      p.downed = true;
      p.reviveProg = 0;
      p.dx = p.dy = 0;
      this.events.push(['down', p.id]);
      this.L('info', 'jogador', `${p.nick} foi derrubado na onda ${this.wave}`);
    }
  }

  hurtServer(dmg) {
    if (this.server.inv > this.t) return;
    this.server.hp -= dmg;
    this.waveHurt = true;
    this.events.push(['srv']);
    this.L('debug', 'combate', `servidor levou ${Math.round(dmg)} de dano (${Math.max(0, Math.round(this.server.hp))}/${this.server.max})`);
    if (this.server.hp < 0) this.server.hp = 0;
  }

  healServer(amount) {
    this.server.hp = Math.min(this.server.max, this.server.hp + amount);
  }

  // ----- itens -----

  updatePickups() {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i];
      if (k.exp < this.t) {
        this.pickups.splice(i, 1);
        continue;
      }
      for (const p of this.players.values()) {
        if (p.ghost || p.downed || dist(p, k) > 0.75) continue;
        this.applyPickup(p, k);
        this.pickups.splice(i, 1);
        break;
      }
    }
  }

  applyPickup(p, k) {
    const type = PICKUP_TYPES[k.kind];
    switch (type.id) {
      case 'pizza':
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3);
        break;
      case 'cafe':
        p.fx.speedUntil = this.t + 6;
        break;
      case 'shield':
        p.fx.shieldUntil = this.t + 8;
        break;
      case 'overclock':
        p.fx.overUntil = this.t + 8;
        break;
      case 'bomb':
        for (const e of enemiesIn(this, k, 4.5)) this.damageEnemy(e, 45, p);
        break;
      case 'freeze':
        this.buffs.freezeUntil = this.t + 3;
        break;
      case 'star':
        p.score += 150;
        this.teamScore += 150;
        break;
      case 'backup':
        this.healServer(this.server.max * 0.25);
        for (const a of this.connectedPlayers()) if (a.downed) this.revive(a, 0.4);
        break;
      default:
    }
    this.events.push(['pick', p.id, k.kind, round1(k.x), round1(k.y)]);
    this.L('debug', 'combate', `${p.nick} pegou ${type.name} (${type.desc})`);
  }

  // ----- fim de partida -----

  checkGameOver() {
    if (this.state === 'over') return;
    const present = this.connectedPlayers();
    if (!present.length) return;
    const serverDown = this.server.hp <= 0;
    const teamDown = present.every((p) => p.downed);
    if (!serverDown && !teamDown) return;
    this.state = 'over';
    this.stateT = OVER_TIME;
    const board = present
      .map((p) => ({ id: p.id, nick: p.nick, cls: p.cls, score: p.score, kills: p.kills }))
      .sort((a, b) => b.score - a.score);
    this.overInfo = { wave: this.wave, score: this.teamScore, reason: serverDown ? 'server' : 'team', board };
    this.events.push(['over', this.wave, this.teamScore, serverDown ? 1 : 0]);
    this.L('info', 'partida', `FIM DE JOGO (${serverDown ? 'o servidor caiu' : 'o time inteiro caiu'}): onda ${this.wave}, ${this.teamScore} pontos | ${board.map((b) => `${b.nick} ${b.score}`).join(', ')}`);
    for (const p of present) this.finishRun(p);
    if (!present.some((p) => p.cheated)) this.hooks.onTeamRecord?.({ score: this.teamScore, wave: this.wave, nicks: present.map((p) => p.nick) });
  }

  flush(p) {
    const ds = p.score - p.flushedScore;
    const dk = p.kills - p.flushedKills;
    if ((ds || dk) && !p.cheated) this.hooks.onProgress?.(p, { score: ds, kills: dk });
    p.flushedScore = p.score;
    p.flushedKills = p.kills;
  }

  finishRun(p) {
    if (p.runDone) {
      p.runDone = false; // já registrado no game over; libera para a próxima rodada
      return;
    }
    this.flush(p);
    // quem sai logo após um reinício (sem jogar) não conta como partida
    if (!p.cheated && (p.score > 0 || this.wave > 0)) this.hooks.onRun?.(p, { score: p.score, wave: this.wave, cls: p.cls });
    if (this.state === 'over') p.runDone = true;
  }

  // ----- snapshot -----

  roster() {
    return [...this.players.values()].map((p) => ({ id: p.id, nick: p.nick, cls: p.cls, look: p.look }));
  }

  snapshot(forPlayer) {
    const t = this.t;
    const s = {
      t: 's',
      tk: round2(t),
      w: this.wave,
      st: this.state === 'wave' ? 1 : this.state === 'break' ? 0 : 2,
      sl: Math.max(0, round1(this.stateT)),
      q: this.queue.length + this.enemies.length,
      srv: [Math.round(this.server.hp), this.server.max, this.server.inv > t ? 1 : 0],
      ts: this.teamScore,
      cb: this.combo,
      p: [],
      e: [],
      k: [],
      ev: this.events,
    };
    for (const p of this.players.values()) {
      const flags =
        (p.downed ? 1 : 0) |
        (p.invuln > t ? 2 : 0) |
        (p.ghost ? 4 : 0) |
        (p.hurt ? 8 : 0) |
        (p.lastAtk > t - 0.3 ? 16 : 0) |
        (p.fx.shieldUntil > t ? 32 : 0) |
        (p.fx.speedUntil > t ? 64 : 0) |
        (p.sleep ? 128 : 0);
      s.p.push([p.id, round2(p.x), round2(p.y), Math.round(p.hp), p.maxHp, flags, p.face, p.dx || p.dy ? 1 : 0, p.score, Math.round(p.reviveProg * 100)]);
    }
    for (const e of this.enemies) {
      const flags =
        (e.spawning ? 1 : 0) |
        (e.mark > t ? 2 : 0) |
        (e.prio > t ? 4 : 0) |
        (e.stun > t || this.buffs.freezeUntil > t ? 8 : 0) |
        (e.hitAt > t - 0.15 ? 16 : 0) |
        (e.charging > 0 ? 32 : 0);
      s.e.push([e.id, ENEMY_IDS.indexOf(e.type), round2(e.x), round2(e.y), Math.max(0, Math.round(e.hp)), e.maxHp, flags, e.grown]);
    }
    for (const k of this.pickups) s.k.push([k.id, k.kind, round1(k.x), round1(k.y), Math.max(0, Math.round(k.exp - t))]);
    if (forPlayer) {
      const cd = (key) => Math.max(0, round1(forPlayer.cd[key] - t));
      s.me = {
        id: forPlayer.id,
        cd: [cd('atk'), cd('s1'), cd('s2'), cd('ult')],
        sc: forPlayer.score,
        kl: forPlayer.kills,
        // power-ups ativos: [índice do power-up, segundos restantes]
        bf: [
          [1, forPlayer.fx.speedUntil],
          [2, forPlayer.fx.shieldUntil],
          [3, forPlayer.fx.overUntil],
        ]
          .filter(([, until]) => until > t)
          .map(([kind, until]) => [kind, round1(until - t)]),
      };
    }
    if (this.state === 'over') s.over = this.overInfo;
    return s;
  }

  flushEvents() {
    this.events = [];
  }
}

// ----- habilidades por classe (índice 0 = habilidade 1, 1 = habilidade 2, 2 = ultimate) -----

const enemiesIn = (m, from, r) => m.enemies.filter((e) => !e.spawning && dist(e, from) <= r + e.r);
const alliesIn = (m, from, r) =>
  [...m.players.values()].filter((p) => !p.ghost && !p.downed && dist(p, from) <= r);

const CAST = {
  dev: [
    (m, p) => {
      const targets = m.enemies
        .filter((e) => !e.spawning && dist(e, p) < 8)
        .sort((a, b) => dist(a, p) - dist(b, p))
        .slice(0, 3);
      for (const e of targets) {
        m.damageEnemy(e, 16, p);
        m.events.push(['sh', p.id, round1(e.x), round1(e.y), 0]);
      }
    },
    (m, p) => {
      p.fx.speedUntil = m.t + 1.5;
    },
    (m, p) => {
      for (const e of enemiesIn(m, p, 4)) m.damageEnemy(e, 60, p);
    },
  ],
  qa: [
    // Caso de teste: acha os bugs (marca) e já pune cada um
    (m, p) => {
      for (const e of enemiesIn(m, p, 7)) {
        e.mark = m.t + 8;
        m.damageEnemy(e, 18, p);
      }
    },
    // Regressão: dano em área e deixa tudo lento
    (m, p) => {
      for (const e of enemiesIn(m, p, 5)) {
        e.slow = m.t + 4;
        m.damageEnemy(e, 25, p);
      }
    },
    // Bug bash: varre o mapa inteiro
    (m, p) => {
      for (const e of [...m.enemies]) {
        if (e.spawning) continue;
        e.mark = m.t + 8;
        m.damageEnemy(e, 70, p);
      }
    },
  ],
  ops: [
    // Patch: cura o time e o pulso queima os bugs em volta
    (m, p) => {
      for (const a of alliesIn(m, p, 4.5)) a.hp = Math.min(a.maxHp, a.hp + 35);
      m.healServer(60);
      for (const e of enemiesIn(m, p, 4.5)) m.damageEnemy(e, 25, p);
    },
    // Firewall: servidor blindado e uma muralha de fogo em volta dele
    (m, p) => {
      m.server.inv = m.t + 4;
      m.fire = { until: m.t + 4, by: p.id, tick: 0 };
      const cx = MAP.server.x + MAP.server.w / 2;
      const cy = MAP.server.y + MAP.server.h / 2;
      for (const e of enemiesIn(m, { x: cx, y: cy }, 3.6)) m.damageEnemy(e, 35, p);
    },
    // Rollback: desfaz o estrago no time e nos bugs
    (m, p) => {
      for (const a of m.connectedPlayers()) {
        if (a.downed) m.revive(a, 0.5);
        a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.5);
      }
      for (const e of [...m.enemies]) if (!e.spawning) m.damageEnemy(e, 45, p);
    },
  ],
  tank: [
    // Grito: provoca e já machuca
    (m, p) => {
      for (const e of enemiesIn(m, p, 6)) {
        e.tauntBy = p.id;
        e.tauntUntil = m.t + 4;
        e.target = p;
        m.damageEnemy(e, 20, p);
      }
    },
    // Escudo: menos dano e devolve dano (ver hurtPlayer)
    (m, p) => {
      p.fx.shieldUntil = m.t + 4;
    },
    // Muralha: empurra, atordoa e esmaga
    (m, p) => {
      for (const e of enemiesIn(m, p, 5)) {
        const d = dist(e, p) || 1;
        [e.x, e.y] = moveEntity(e.x, e.y, (e.x - p.x) / d, (e.y - p.y) / d, 6, 0.5, Math.min(e.r, 0.5));
        e.stun = m.t + 3;
        m.damageEnemy(e, 60, p);
      }
    },
  ],
  po: [
    // Priorizar: marca o bug mais forte ao alcance e o atinge
    (m, p) => {
      let best = null;
      for (const e of m.enemies) {
        if (e.spawning || dist(e, p) > 9) continue;
        if (!best || e.hp > best.hp) best = e;
      }
      if (!best) return 0;
      best.prio = m.t + 8;
      m.damageEnemy(best, 30, p);
      return best.id;
    },
    // Mudança de escopo: sorteio entre dano geral, congelar, meteoros ou caos
    (m, p) => {
      const r = m.rand();
      let outcome;
      if (r < 0.4) {
        outcome = 0; // time causa mais dano e todos os bugs levam um golpe
        m.buffs.dmgUntil = m.t + 8;
        for (const e of [...m.enemies]) if (!e.spawning) m.damageEnemy(e, 20, p);
      } else if (r < 0.6) {
        outcome = 1; // congela
        m.buffs.freezeUntil = m.t + 2;
      } else if (r < 0.8) {
        outcome = 3; // meteoros: até 5 bugs levam um golpe pesado
        const targets = m.enemies.filter((e) => !e.spawning).sort(() => m.rand() - 0.5).slice(0, 5);
        for (const e of targets) m.damageEnemy(e, 60, p);
      } else {
        outcome = 2; // ruim: bugs mais rápidos
        m.buffs.hasteUntil = m.t + 5;
      }
      m.events.push(['scope', outcome]);
      m.L('debug', 'combate', `mudança de escopo de ${p.nick}: ${['dano do time +50% e golpe em todos', 'bugs congelados', 'bugs mais rápidos (ruim!)', 'meteoros nos bugs'][outcome]}`);
    },
    // Sprint Review: congela, fere todos e paga o combo
    (m, p) => {
      m.buffs.freezeUntil = m.t + 4;
      for (const e of [...m.enemies]) if (!e.spawning) m.damageEnemy(e, 35, p);
      const bonus = m.combo * 10;
      for (const a of m.connectedPlayers()) {
        a.score += bonus;
        m.teamScore += bonus;
      }
      m.events.push(['review', bonus]);
      m.L('debug', 'combate', `Sprint Review de ${p.nick}: +${bonus} pontos para cada jogador`);
    },
  ],
};
