// Ponto de entrada do cliente: conecta, mostra as telas e roda o laço do jogo.
import { Net } from './net.js';
import { World } from './world.js';
import { Renderer, QUALITY } from './render.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { unlock } from './sfx.js';
import * as music from './music.js';
import { randomLook } from '/shared/look.js';

const $ = (id) => document.getElementById(id);
const touch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ----- identidade do aparelho (sem login: só um identificador aleatório) -----
const randomHex = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
let sessionToken = null;
function getToken() {
  try {
    let t = localStorage.getItem('pg_token');
    if (!/^[a-f0-9]{32}$/.test(t || '')) {
      t = randomHex();
      localStorage.setItem('pg_token', t);
    }
    return t;
  } catch {
    return (sessionToken ||= randomHex());
  }
}

// ----- sem zoom no celular -----
// O viewport já pede escala fixa, mas o iOS ignora isso: bloqueia pinça e duplo toque no mesmo lugar.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
let lastTap = { t: 0, x: 0, y: 0 };
document.addEventListener(
  'touchend',
  (e) => {
    const t = e.changedTouches[0];
    if (!t || e.target.closest('input, textarea, select')) return;
    const now = Date.now();
    const near = Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < 40;
    if (now - lastTap.t < 350 && near) e.preventDefault(); // 2º toque no mesmo lugar: não vira zoom
    lastTap = { t: now, x: t.clientX, y: t.clientY };
  },
  { passive: false },
);
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

// ----- tela ligada durante a partida e tela cheia -----
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null; // o navegador pode negar (economia de bateria): segue sem
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && phase === 'game') keepAwake(true);
});
async function toggleFullscreen() {
  const d = document;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      await (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    } else {
      const el = d.documentElement;
      await (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      if (touch && screen.orientation?.lock) await screen.orientation.lock('landscape').catch(() => {});
    }
  } catch {
    ui.toast('Este navegador não permite tela cheia.');
  }
}

const net = new Net();
const world = new World();
const renderer = new Renderer($('game'));
let phase = 'boot'; // boot | nick | home | game
let me = null; // { nick, look, stats }
let over = false;
let lookTimer = null;
let sentInput = { dx: 0, dy: 0, a: 0, at: 0 };

const input = new Input({
  onSkill: (n) => {
    unlock();
    if (phase === 'game') net.send({ t: 'sk', n });
  },
});

// ----- qualidade (LOD) adaptativa -----
let qualityMode = 'auto';
let autoMax = 2;
try {
  const saved = localStorage.getItem('pg_quality');
  if (saved !== null) qualityMode = saved;
} catch {
  /* ignora */
}
const perf = { t0: 0, n: 0, fps: 60, low: 0, high: 0 };

function applyQuality() {
  if (qualityMode === 'auto') {
    // celulares com toque começam na média; PCs na alta
    if (!perf.started) renderer.setQuality(touch ? 1 : 2);
    autoMax = 2;
  } else {
    renderer.setQuality(Number(qualityMode));
  }
  perf.started = true;
  $('opt-quality').value = qualityMode;
}

function adaptQuality(nowMs) {
  perf.n++;
  if (nowMs - perf.t0 < 2000) return;
  perf.fps = Math.round((perf.n * 1000) / (nowMs - perf.t0));
  perf.n = 0;
  perf.t0 = nowMs;
  if (qualityMode !== 'auto') return;
  const target = QUALITY[renderer.quality].fps;
  if (perf.fps < target * 0.8 && renderer.quality > 0) {
    if (++perf.low >= 2) {
      renderer.setQuality(renderer.quality - 1);
      perf.low = perf.high = 0;
    }
  } else {
    perf.low = 0;
    if (perf.fps >= target * 0.97 && renderer.quality < autoMax && ++perf.high >= 8) {
      renderer.setQuality(renderer.quality + 1);
      perf.high = 0;
    }
  }
}

// ----- interface -----
const ui = new UI({
  onNick: (nick) => {
    unlock();
    net.send({ t: 'hello', token: getToken(), nick, look: randomLook() });
  },
  onLook: (look) => {
    if (me) me.look = look;
    clearTimeout(lookTimer);
    lookTimer = setTimeout(() => net.send({ t: 'look', look }), 350);
  },
  onPlay: (cls) => {
    unlock();
    net.send({ t: 'join', cls });
  },
  onJoin: (match, cls) => {
    unlock();
    net.send({ t: 'join', match, cls });
  },
  onLeave: () => net.send({ t: 'leave' }),
  onFullscreen: toggleFullscreen,
  onQuality: (v) => {
    qualityMode = v;
    perf.started = false;
    try {
      localStorage.setItem('pg_quality', v);
    } catch {
      /* ignora */
    }
    applyQuality();
  },
  fetchRanking: (range) => fetch(`/api/ranking?range=${range}`).then((r) => r.json()),
  listMatches: () => net.send({ t: 'list' }),
});

function goHome() {
  music.play('menu');
  phase = 'home';
  over = false;
  input.enabled = false;
  input.reset();
  keepAwake(false);
  ui.showHome(me);
}

net.on('open', () => {
  $('toast').hidden = true;
  net.send({ t: 'hello', token: getToken() });
});
net.on('close', ({ wasConnected }) => {
  if (phase === 'boot' && !wasConnected) ui.toast('Procurando o servidor...', 60000);
  else if (phase !== 'boot') ui.toast('Conexão perdida. Reconectando...', 60000);
});
net.on('need_nick', () => {
  music.play('menu');
  phase = 'nick';
  ui.showNick();
});
net.on('welcome', (msg) => {
  me = { nick: msg.nick, look: msg.look, stats: msg.stats };
  if (phase !== 'game') goHome();
});
net.on('err', (msg) => {
  if (msg.code === 'nick') ui.nickError(msg.msg);
  else if (phase === 'home') document.getElementById('home-error').textContent = msg.msg;
  else ui.toast(msg.msg);
});
net.on('look', (msg) => {
  if (me) me.look = msg.look;
});
net.on('matches', (msg) => ui.renderMatches(msg.list));
net.on('joined', (msg) => {
  world.reset();
  world.youId = msg.you;
  world.youCls = msg.cls;
  ui.setPlayClass(msg.cls);
  phase = 'game';
  over = false;
  perf.t0 = performance.now();
  perf.n = 0;
  renderer.cam.init = false;
  input.reset();
  input.enabled = true;
  ui.showGame(touch);
  keepAwake(true);
  applyQuality();
  checkOrientation();
});
net.on('roster', (msg) => world.setRoster(msg.players));
net.on('s', (snap) => {
  if (phase !== 'game') return;
  world.pushSnap(snap, performance.now() / 1000);
  if (snap.st === 2) music.play(null);
  else music.play(snap.e.some((e) => e[1] === 5 && !(e[6] & 1)) ? 'boss' : 'battle', { calm: snap.st === 0, seed: snap.st === 0 ? snap.w : snap.w - 1 });
  ui.updateHud(world, snap, { rtt: net.rtt, fps: perf.fps, q: QUALITY[renderer.quality].name });
  if (snap.st === 2 && snap.over) {
    over = true;
    ui.showOver(snap.over, world.youId, snap.sl);
  } else if (over) {
    over = false;
    ui.hideOver(touch);
    world.fx.banners = [];
  }
});
net.on('left', (msg) => {
  if (msg.stats && me) me.stats = msg.stats;
  if (msg.reason) ui.toast(msg.reason);
  if (phase === 'game') goHome();
});
net.on('kicked', (msg) => {
  phase = 'boot';
  input.enabled = false;
  ui.fatal(msg.msg);
});

// ----- laço de entrada (20 Hz) -----
setInterval(() => {
  if (phase !== 'game') return;
  const inp = input.read();
  const now = performance.now();
  const changed = inp.dx !== sentInput.dx || inp.dy !== sentInput.dy || inp.a !== sentInput.a;
  const active = inp.dx || inp.dy || inp.a;
  if ((changed && now - sentInput.at > 45) || (active && now - sentInput.at > 150)) {
    net.send({ t: 'in', dx: inp.dx, dy: inp.dy, a: inp.a });
    sentInput = { ...inp, at: now };
  } else if (changed) {
    // não perde a mudança: reavalia no próximo ciclo
  }
}, 50);

// ----- laço de desenho -----
let last = performance.now();
function frame(nowMs) {
  requestAnimationFrame(frame);
  if (phase !== 'game') {
    last = nowMs;
    return;
  }
  const cfg = QUALITY[renderer.quality];
  if (nowMs - last < 1000 / cfg.fps - 3) return;
  const dt = Math.min(0.1, (nowMs - last) / 1000);
  last = nowMs;
  const now = nowMs / 1000;
  world.predict(dt, input.read());
  world.stepFx(dt, now, cfg.parts);
  renderer.draw(world, world.view(now), now, dt);
  world.prune(now);
  adaptQuality(nowMs);
}

function checkOrientation() {
  const portrait = window.innerHeight > window.innerWidth;
  $('rotate').classList.toggle('on', touch && portrait);
}
window.addEventListener('resize', () => {
  renderer.resize();
  checkOrientation();
});
window.addEventListener('orientationchange', () => setTimeout(() => {
  renderer.resize();
  checkOrientation();
}, 200));
// primeiro toque/tecla libera o áudio (exigência dos navegadores)
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

async function boot() {
  try {
    await Promise.all([document.fonts.load('12px "Press Start 2P"'), document.fonts.load('14px VT323')]);
  } catch {
    /* segue com a fonte padrão */
  }
  applyQuality();
  net.connect();
  requestAnimationFrame(frame);
}
boot();

// ganchos de depuração/teste (não afetam o jogo)
window.__pg = { world, renderer, net, input, ui, get phase() { return phase; } };
