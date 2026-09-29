// Telas em DOM: nick, menu inicial (editor, classe, partidas, ranking), HUD e fim de jogo.
import { CLASSES, CLASS_IDS, PICKUP_TYPES, ENEMIES, ENEMY_IDS, SECTORS, MAP } from '/shared/game.js';
import { pickTip } from '/shared/tips.js';
import {
  BODY_NAMES,
  SKIN,
  HAIR_COLORS,
  HAIR_STYLES,
  GLASSES,
  OUTFITS,
  JALECO_INDEX,
  OUTFIT_COLORS,
  BOTTOMS,
  BOTTOM_COLORS,
  JALECO_COLOR,
  defaultLook,
  randomLook,
} from '/shared/look.js';
import { characterFrame, enemyFrame, pickupFrame } from './sprites.js';
import { sfx, isMuted, setMuted } from './sfx.js';
import * as music from './music.js';

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of kids) n.append(c);
  return n;
}

const fmt = (n) => Math.round(n).toLocaleString('pt-BR');

export class UI {
  constructor({ onNick, onLook, onPlay, onJoin, onLeave, onQuality, onFullscreen, fetchRanking, listMatches }) {
    this.cb = { onNick, onLook, onPlay, onJoin, onLeave, onQuality, onFullscreen, fetchRanking, listMatches };
    this.look = defaultLook();
    this.cls = 'dev';
    this.tab = 'corpo';
    this.rankRange = 'day';
    this.nick = '';
    this.matchTimer = null;
    this.toastTimer = null;
    this.hudCache = {};
    this.buildNick();
    this.buildHome();
    this.buildHud();
    this.buildGuide();
    this.previewLoop();
  }

  // ----- controle de telas -----

  hideAll() {
    for (const id of ['screen-nick', 'screen-home', 'screen-over', 'hud', 'touch', 'joyzone']) $(id).hidden = true;
    document.body.classList.remove('playing');
    clearInterval(this.matchTimer);
    clearInterval(this.tipTimer);
  }

  showNick() {
    this.hideAll();
    $('screen-nick').hidden = false;
    $('nick-input').focus();
  }

  nickError(msg) {
    $('nick-error').textContent = msg;
  }

  showHome({ nick, look, stats }) {
    this.hideAll();
    this.nick = nick;
    this.look = look;
    $('home-nick').textContent = nick;
    this.setStats(stats);
    $('screen-home').hidden = false;
    $('home-error').textContent = '';
    this.renderEditor();
    this.loadRanking();
    this.refreshMatches();
    this.homeTip();
    this.matchTimer = setInterval(() => {
      this.refreshMatches();
      this.loadRanking();
    }, 5000);
    this.tipTimer = setInterval(() => this.homeTip(), 9000);
  }

  homeTip() {
    $('home-tip').textContent = pickTip(this.cls);
  }

  setStats(stats) {
    $('home-stats').textContent = stats
      ? `melhor ${fmt(stats.best.score)} · onda ${stats.best.wave} · ${fmt(stats.total.games)} partidas`
      : '';
  }

  showGame(touch) {
    this.hideAll();
    $('hud').hidden = false;
    $('touch').hidden = false; // botões de poder também no computador (com a tecla de cada um)
    $('joyzone').hidden = !touch;
    document.body.classList.add('playing');
    $('hud-hint').textContent = touch ? '' : 'WASD mover · botões ou teclas 1 2 3 para os poderes';
    $('hud-tip').hidden = true;
    this.hudCache = {};
    this.setupSkills();
    $('btn-leave').textContent = 'SAIR';
  }

  toast(msg, ms = 2600) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (t.hidden = true), ms);
  }

  fatal(msg) {
    this.hideAll();
    const s = $('screen-over');
    s.hidden = false;
    $('over-title').textContent = 'DESCONECTADO';
    $('over-sub').textContent = msg;
    $('over-board').textContent = '';
    $('over-restart').textContent = 'Recarregue a página para voltar.';
  }

  // ----- nick -----

  buildNick() {
    $('nick-form').addEventListener('submit', (e) => {
      e.preventDefault();
      $('nick-error').textContent = '';
      sfx.click();
      this.cb.onNick($('nick-input').value.trim());
    });
  }

  // ----- menu inicial -----

  buildHome() {
    // qualidade e som
    $('opt-quality').addEventListener('change', (e) => this.cb.onQuality(e.target.value));
    const snd = $('opt-sound');
    const paint = () => (snd.textContent = isMuted() ? 'SOM: OFF' : 'SOM: ON');
    snd.addEventListener('click', () => {
      setMuted(!isMuted());
      paint();
      sfx.click();
    });
    paint();
    const mus = $('opt-music');
    const paintMus = () => (mus.textContent = music.isEnabled() ? 'MÚSICA: ON' : 'MÚSICA: OFF');
    mus.addEventListener('click', () => {
      music.setEnabled(!music.isEnabled());
      paintMus();
      sfx.click();
    });
    paintMus();
    // faixa de música: Automática ou uma faixa fixa
    const trackBtn = $('opt-track');
    const paintTrack = () => (trackBtn.textContent = `FAIXA: ${music.current().name.toUpperCase()}`);
    trackBtn.addEventListener('click', () => {
      sfx.click();
      music.next();
      paintTrack();
    });
    paintTrack();
    this.paintTrack = paintTrack;
    music.onTrack((id, name) => {
      paintTrack();
      this.toast(`Tocando: ${name}`, 1800);
    });
    // classes
    const list = $('class-list');
    for (const id of CLASS_IDS) {
      const c = CLASSES[id];
      const b = el('button', { type: 'button', 'data-cls': id }, el('b', { style: `background:${c.color}` }, c.tag));
      b.addEventListener('click', () => this.pickClass(id));
      list.append(b);
    }
    try {
      const saved = localStorage.getItem('pg_class');
      if (CLASSES[saved]) this.cls = saved;
    } catch {
      /* sem armazenamento */
    }
    this.pickClass(this.cls);
    for (const id of ['btn-play', 'btn-play2']) {
      $(id).addEventListener('click', () => {
        sfx.click();
        this.cb.onPlay(this.cls);
      });
    }
    // abas do menu no celular (uma seção por vez)
    this.homeTab = 'play';
    const nav = $('home-nav');
    for (const b of nav.querySelectorAll('[data-tab]')) {
      b.addEventListener('click', () => {
        sfx.click();
        this.setHomeTab(b.dataset.tab);
      });
    }
    this.setHomeTab(this.homeTab);
    // tela cheia (não existe no iPhone: o botão fica escondido)
    const full = $('opt-full');
    const canFull = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    full.hidden = !canFull;
    full.addEventListener('click', () => {
      sfx.click();
      this.cb.onFullscreen();
    });
    // abas do ranking
    const tabs = $('rank-tabs');
    for (const [id, label] of [['day', 'Hoje'], ['week', 'Semana'], ['all', 'Geral']]) {
      const b = el('button', { type: 'button', 'data-r': id }, label);
      b.addEventListener('click', () => {
        this.rankRange = id;
        this.loadRanking();
      });
      tabs.append(b);
    }
  }

  // Guia: inimigos, power-ups e setores, com os mesmos sprites do jogo
  buildGuide() {
    const sprite = (fr, scale = 3) => {
      const c = el('canvas', { width: 54, height: 48 });
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(fr.canvas, Math.round(27 - (fr.w * scale) / 2), Math.round(46 - fr.ay * scale), fr.w * scale, fr.h * scale);
      return c;
    };
    const enemies = $('guide-enemies');
    for (const id of ENEMY_IDS) {
      const e = ENEMIES[id];
      enemies.append(
        el(
          'div',
          { class: 'guide-row' },
          sprite(enemyFrame(id, 0), id === 'boss' ? 3 : id === 'minimail' ? 3 : 3),
          el(
            'div',
            { class: 'txt' },
            el('b', {}, e.name),
            el('br'),
            e.desc,
            el('span', { class: 'st' }, `Vida ${e.hp} · Velocidade ${e.speed} · Dano ${e.dmg} · ${e.pts} pontos · ${id === 'minimail' ? 'nasce do E-mail' : `desde a onda ${e.from}`}`),
          ),
        ),
      );
    }
    const pk = $('guide-pickups');
    PICKUP_TYPES.forEach((t, i) => {
      const rarity = t.w >= 20 ? 'comum' : t.w >= 10 ? 'incomum' : 'raro';
      pk.append(
        el(
          'div',
          { class: 'guide-row' },
          sprite(pickupFrame(i), 3),
          el('div', { class: 'txt' }, el('b', {}, t.name), el('span', { class: `tag ${rarity}` }, rarity.toUpperCase()), el('br'), t.desc),
        ),
      );
    });
    pk.append(el('p', { class: 'tip' }, 'Os bugs soltam power-ups ao cair (o chefe solta 3). Passe por cima para pegar; eles piscam quando estão acabando.'));
    const sec = $('guide-sectors');
    for (const s of Object.values(SECTORS)) {
      sec.append(el('div', { class: 'guide-row' }, el('div', { class: 'sw', style: `background:${s.color}` }, s.short), el('div', { class: 'txt' }, el('b', {}, s.name), el('br'), s.where)));
    }
    for (const r of MAP.rooms) {
      sec.append(el('div', { class: 'guide-row' }, el('div', { class: 'sw', style: `background:${r.plate}` }, r.name.slice(0, 9)), el('div', { class: 'txt' }, el('b', {}, `Sala: ${r.name.charAt(0)}${r.name.slice(1).toLowerCase()}`), el('br'), 'Divisórias de vidro e portas: os bugs também dão a volta pelas portas.')));
    }
    sec.append(el('div', { class: 'guide-row' }, el('div', { class: 'sw', style: 'background:#7FE3FF' }, 'PONTO'), el('div', { class: 'txt' }, el('b', {}, 'Ponto eletrônico'), el('br'), 'Uma caixinha na parede da copa, perto do Financeiro.')));
  }

  setHomeTab(tab) {
    this.homeTab = tab;
    $('screen-home').dataset.tab = tab;
    for (const b of $('home-nav').querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
  }

  pickClass(id) {
    this.cls = id;
    try {
      localStorage.setItem('pg_class', id);
    } catch {
      /* ignora */
    }
    for (const b of $('class-list').children) b.classList.toggle('on', b.dataset.cls === id);
    const c = CLASSES[id];
    const info = $('class-info');
    info.textContent = '';
    info.append(el('em', {}, `${c.name}: `), c.desc);
    for (const [i, s] of c.skills.entries()) {
      info.append(el('br'), el('em', {}, `${i === 2 ? 'ULT' : i + 1} ${s.name}: `), s.desc);
    }
  }

  refreshMatches() {
    this.cb.listMatches();
  }

  renderMatches(list) {
    const box = $('match-list');
    box.textContent = '';
    if (!list.length) {
      box.append(el('div', { class: 'row' }, 'Nenhuma partida aberta. Seja o primeiro!'));
      return;
    }
    for (const m of list) {
      const full = m.players >= m.capacity;
      const row = el(
        'div',
        { class: 'row' },
        el('span', {}, `Partida ${m.id} · ${m.players}/${m.capacity} · ${m.wave ? `onda ${m.wave}` : 'começando'}`),
      );
      const b = el('button', { type: 'button' }, full ? 'CHEIA' : 'ENTRAR');
      b.disabled = full;
      b.addEventListener('click', () => this.cb.onJoin(m.id, this.cls));
      row.append(b);
      box.append(row);
    }
  }

  async loadRanking() {
    for (const b of $('rank-tabs').children) b.classList.toggle('on', b.dataset.r === this.rankRange);
    const box = $('rank-body');
    let data;
    try {
      data = await this.cb.fetchRanking(this.rankRange);
    } catch {
      box.textContent = 'Ranking indisponível.';
      return;
    }
    box.textContent = '';
    const section = (title, rows, render) => {
      box.append(el('h3', {}, title));
      if (!rows.length) return box.append(el('div', { class: 'empty' }, 'Ninguém ainda.'));
      const ol = el('ol');
      rows.forEach((r, i) => {
        const li = el('li', { class: r.nick === this.nick ? 'me' : '' }, el('span', {}, `${i + 1}. ${render.name(r)}`), el('b', {}, fmt(r.score)));
        ol.append(li);
      });
      box.append(ol);
    };
    section('MELHOR PARTIDA', data.best.slice(0, 8), { name: (r) => `${r.nick} (onda ${r.wave})` });
    section('TOTAL DE PONTOS', data.total.slice(0, 5), { name: (r) => r.nick });
    section('MELHOR TIME', data.teams.slice(0, 3), { name: (r) => `${r.nicks.join(', ')} (onda ${r.wave})` });
  }

  // ----- editor de personagem -----

  renderEditor() {
    const tabs = $('ed-tabs');
    tabs.textContent = '';
    for (const [id, label] of [['corpo', 'Corpo'], ['cabelo', 'Cabelo'], ['roupa', 'Roupa'], ['extras', 'Extras']]) {
      const b = el('button', { type: 'button', class: this.tab === id ? 'on' : '' }, label);
      b.addEventListener('click', () => {
        this.tab = id;
        this.renderEditor();
      });
      tabs.append(b);
    }
    const body = $('ed-body');
    body.textContent = '';
    const L = this.look;
    const set = (k, v) => {
      L[k] = v;
      this.cb.onLook(L);
      this.renderEditor();
    };
    const chips = (label, key, names) =>
      el(
        'div',
        { class: 'ed-row' },
        el('span', {}, label),
        el(
          'div',
          { class: 'chips' },
          ...names.map((n, i) => {
            const b = el('button', { type: 'button', class: L[key] === i ? 'on' : '', 'aria-pressed': L[key] === i }, n);
            b.addEventListener('click', () => set(key, i));
            return b;
          }),
        ),
      );
    const swatches = (label, key, colors, names) =>
      el(
        'div',
        { class: 'ed-row' },
        el('span', {}, label),
        el(
          'div',
          { class: 'swatches' },
          ...colors.map((c, i) => {
            const b = el('button', { type: 'button', style: `background:${c}`, class: L[key] === i ? 'on' : '', 'aria-label': names?.[i] || `Cor ${i + 1}`, 'aria-pressed': L[key] === i });
            b.addEventListener('click', () => set(key, i));
            return b;
          }),
        ),
      );
    if (this.tab === 'corpo') {
      body.append(
        chips('Corpo', 'body', BODY_NAMES),
        swatches('Tom de pele', 'skin', SKIN),
      );
    } else if (this.tab === 'cabelo') {
      body.append(
        chips('Estilo', 'hairStyle', HAIR_STYLES[L.body]),
        swatches('Cor', 'hairColor', HAIR_COLORS.map((c) => c.hex), HAIR_COLORS.map((c) => c.name)),
      );
    } else if (this.tab === 'roupa') {
      body.append(chips('Parte de cima', 'outfit', OUTFITS[L.body]));
      if (L.outfit !== JALECO_INDEX) body.append(swatches('Cor', 'outfitColor', OUTFIT_COLORS));
      else body.append(el('div', { class: 'ed-row' }, el('span', {}, `Jaleco azul-marinho (cor fixa)`)));
      body.append(chips('Parte de baixo', 'bottom', BOTTOMS[L.body]), swatches('Cor', 'bottomColor', BOTTOM_COLORS));
    } else {
      body.append(
        chips('Óculos', 'glasses', GLASSES),
        chips('Mochila', 'backpack', ['Não', 'Sim']),
        chips('Crachá', 'badge', ['Não', 'Sim']),
      );
      const rnd = el('button', { type: 'button' }, 'ALEATÓRIO');
      rnd.addEventListener('click', () => {
        Object.assign(L, randomLook());
        this.cb.onLook(L);
        this.renderEditor();
      });
      body.append(el('div', { class: 'ed-row' }, rnd));
    }
    void JALECO_COLOR;
  }

  previewLoop() {
    const c = $('preview');
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const draw = () => {
      if (!$('screen-home').hidden) {
        g.clearRect(0, 0, c.width, c.height);
        g.fillStyle = '#2b3a9e';
        g.beginPath();
        g.ellipse(48, 118, 30, 10, 0, 0, Math.PI * 2);
        g.fill();
        const f = characterFrame(this.look, `i${Math.floor(performance.now() / 500) % 2}`);
        g.drawImage(f.canvas, 48 - f.ax * 6, 118 - f.ay * 6, f.w * 6, f.h * 6);
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  // ----- HUD -----

  buildHud() {
    // "SAIR" pede confirmação num segundo toque, para ninguém sair sem querer no meio do jogo
    const leave = $('btn-leave');
    let armed = null;
    leave.addEventListener('click', () => {
      sfx.click();
      if (armed) {
        clearTimeout(armed);
        armed = null;
        leave.textContent = 'SAIR';
        this.cb.onLeave();
        return;
      }
      leave.textContent = 'CONFIRMA?';
      armed = setTimeout(() => {
        armed = null;
        leave.textContent = 'SAIR';
      }, 2500);
    });
    $('rotate-leave').addEventListener('click', () => {
      sfx.click();
      this.cb.onLeave();
    });
    $('btn-track').addEventListener('click', () => {
      sfx.click();
      const c = music.next();
      this.paintTrack?.();
      this.toast(`Música: ${c.name}${c.choice === 'auto' ? ' (troca sozinha a cada onda)' : ''}`, 2200);
    });
    const mb = $('btn-music');
    const paint = () => (mb.textContent = music.isEnabled() ? 'MÚS: ON' : 'MÚS: OFF');
    mb.addEventListener('click', () => {
      music.setEnabled(!music.isEnabled());
      paint();
    });
    paint();
  }

  setupSkills() {
    const c = CLASSES[this.playCls || this.cls];
    const ids = ['btn-s1', 'btn-s2', 'btn-ult'];
    ids.forEach((id, i) => {
      const b = $(id);
      b.querySelector('b').textContent = c.skills[i].short;
      b.title = `${c.skills[i].name}: ${c.skills[i].desc}`;
      b.querySelector('i').style.height = '0';
    });
  }

  setPlayClass(cls) {
    this.playCls = cls;
    this.setupSkills();
  }

  bar(elm, ratio, n = 10) {
    if (elm.children.length !== n) {
      elm.textContent = '';
      for (let i = 0; i < n; i++) elm.append(el('s'));
    }
    const on = Math.round(ratio * n);
    for (let i = 0; i < n; i++) elm.children[i].classList.toggle('off', i >= on);
    elm.classList.toggle('low', ratio < 0.3);
  }

  updateHud(world, snap, netInfo) {
    const me = world.youFrom(snap);
    const roster = world.roster;
    const cls = CLASSES[world.youCls];
    const setText = (id, txt) => {
      if (this.hudCache[id] !== txt) {
        this.hudCache[id] = txt;
        $(id).textContent = txt;
      }
    };
    if (me) {
      const chip = $('hud-nick');
      if (this.hudCache.nick !== me[0]) {
        this.hudCache.nick = me[0];
        chip.textContent = '';
        chip.append(el('i', { style: `background:${cls.color}` }), `${roster.get(me[0])?.nick || ''} · ${cls.name}`);
      }
      this.bar($('hud-hp'), me[4] ? Math.max(0, me[3]) / me[4] : 0, 10);
      setText('hud-score', fmt(me[8]).padStart(6, '0'));
      $('hud-spawn').hidden = !(me[5] & 2);
    }
    setText('hud-wave', snap.st === 2 ? 'FIM DE JOGO' : snap.w === 0 ? 'PREPARE-SE' : `ONDA ${snap.w}`);
    this.bar($('hud-srv'), snap.srv[1] ? snap.srv[0] / snap.srv[1] : 0, 10);
    setText('hud-combo', snap.cb >= 2 ? `COMBO x${(1 + Math.min(snap.cb, 40) * 0.025).toFixed(2)}` : '');
    setText('hud-net', `${netInfo.rtt} ms · ${netInfo.fps} fps · ${netInfo.q}`);
    // time
    const team = $('hud-team');
    if (snap.p.length > 1) {
      const key = snap.p.map((p) => `${p[0]}:${Math.round((p[3] / p[4]) * 10)}:${p[5] & 1}`).join('|');
      if (this.hudCache.team !== key) {
        this.hudCache.team = key;
        team.textContent = '';
        for (const p of snap.p) {
          if (p[0] === world.youId) continue;
          const info = roster.get(p[0]);
          team.append(
            el('div', {}, el('i', { style: `background:${CLASSES[info?.cls || 'dev'].color}` }), info?.nick || '?', el('em', {}, p[5] & 1 ? 'caiu' : `${Math.round((p[3] / p[4]) * 100)}%`)),
          );
        }
      }
    } else {
      team.textContent = '';
      this.hudCache.team = '';
    }
    // power-ups ativos
    if (snap.me) {
      const key = snap.me.bf.map((b) => `${b[0]}:${Math.ceil(b[1])}`).join('|');
      if (this.hudCache.buffs !== key) {
        this.hudCache.buffs = key;
        const box = $('hud-buffs');
        box.textContent = '';
        for (const [kind, rem] of snap.me.bf) {
          const t = PICKUP_TYPES[kind];
          box.append(el('span', {}, el('i', { style: `background:${t.color}` }), `${t.name} ${Math.ceil(rem)}s`));
        }
      }
    }
    // dica entre as ondas
    const tip = $('hud-tip');
    const between = snap.st === 0 && snap.w > 0;
    if (between) {
      if (this.hudCache.tipWave !== snap.w) {
        this.hudCache.tipWave = snap.w;
        tip.textContent = '';
        tip.append(el('b', {}, 'DICA'), pickTip(world.youCls));
      }
      tip.hidden = false;
    } else {
      tip.hidden = true;
    }
    // recargas das habilidades
    if (snap.me) {
      const ids = ['btn-s1', 'btn-s2', 'btn-ult'];
      ids.forEach((id, i) => {
        const rem = snap.me.cd[i + 1];
        const max = cls.skills[i].cd;
        const b = $(id);
        b.querySelector('i').style.height = `${Math.min(100, (rem / max) * 100)}%`;
        b.classList.toggle('cool', rem > 0);
      });
    }
  }

  showOver(info, youId, restartIn) {
    const s = $('screen-over');
    if (s.hidden) {
      s.hidden = false;
      $('over-title').textContent = 'FIM DE JOGO';
      $('over-tip').textContent = pickTip(this.playCls || this.cls);
      $('touch').hidden = true;
    }
    $('over-sub').textContent = `${info.reason === 'server' ? 'O servidor caiu!' : 'O time inteiro caiu!'} Onda ${info.wave} · ${fmt(info.score)} pontos`;
    const board = $('over-board');
    board.textContent = '';
    for (const r of info.board) {
      const c = CLASSES[r.cls];
      board.append(
        el('div', { class: `row${r.id === youId ? ' me' : ''}` }, el('span', {}, `${r.nick} (${c.name}) · ${r.kills} bugs`), el('b', {}, fmt(r.score))),
      );
    }
    $('over-restart').textContent = `Nova partida em ${Math.ceil(restartIn)} s...`;
  }

  hideOver(touch) {
    const s = $('screen-over');
    if (!s.hidden) {
      s.hidden = true;
      $('touch').hidden = false;
    }
  }
}
