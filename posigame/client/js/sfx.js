// Efeitos sonoros de 8 bits gerados com WebAudio (ondas quadradas). Sem arquivos de áudio.
let ctx = null;
let muted = false;
try {
  muted = localStorage.getItem('pg_mute') === '1';
} catch {
  /* sem armazenamento */
}

const readyCallbacks = [];
export const getCtx = () => ctx;
export const onReady = (fn) => readyCallbacks.push(fn);

export function unlock() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    ctx = new AC();
    for (const fn of readyCallbacks) fn();
  }
}

export const isMuted = () => muted;
export function setMuted(v) {
  muted = v;
  try {
    localStorage.setItem('pg_mute', v ? '1' : '0');
  } catch {
    /* ignora */
  }
}

let last = 0;
function beep(freq, dur, { type = 'square', vol = 0.05, slide = 0, delay = 0 } = {}) {
  if (!ctx || muted || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseHit(dur, vol, freq = 1500, delay = 0, type = 'bandpass') {
  if (!ctx || muted || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(ctx.destination);
  s.start(t0);
}

// Som próprio de cada poder: 'classe+número' (1, 2 = habilidades, 3 = ultimate)
const SKILL_SFX = {
  dev1: () => [0, 1, 2].forEach((i) => beep(900 - i * 90, 0.05, { delay: i * 0.05, vol: 0.05 })),
  dev2: () => {
    noiseHit(0.3, 0.05, 2500, 0, 'highpass');
    beep(300, 0.25, { slide: 900, vol: 0.04, type: 'sawtooth' });
  },
  dev3: () => {
    noiseHit(0.5, 0.12, 400, 0, 'lowpass');
    beep(160, 0.5, { type: 'sawtooth', slide: -120, vol: 0.09 });
    beep(900, 0.08, { vol: 0.05 });
  },
  qa1: () => [0, 1, 2, 3].forEach((i) => beep(520 * 2 ** (i / 3), 0.07, { delay: i * 0.06, vol: 0.045, type: 'triangle' })),
  qa2: () => {
    beep(700, 0.5, { slide: -520, vol: 0.05, type: 'triangle' });
    beep(350, 0.4, { slide: -200, vol: 0.04, delay: 0.1 });
  },
  qa3: () => {
    beep(200, 0.7, { slide: 1300, vol: 0.05, type: 'sawtooth' });
    noiseHit(0.5, 0.05, 3000, 0.1, 'highpass');
  },
  ops1: () => [0, 1, 2].forEach((i) => beep(660 * 2 ** (i * 0.25), 0.12, { delay: i * 0.08, vol: 0.05, type: 'triangle' })),
  ops2: () => {
    beep(180, 0.5, { vol: 0.06, type: 'triangle' });
    beep(360, 0.5, { vol: 0.04, delay: 0.05, type: 'triangle' });
    beep(720, 0.3, { vol: 0.03, delay: 0.1 });
  },
  ops3: () => [0, 1, 2, 3, 4].forEach((i) => beep(330 * 2 ** (i / 4), 0.16, { delay: i * 0.09, vol: 0.055, type: 'triangle' })),
  tank1: () => {
    beep(110, 0.45, { type: 'sawtooth', slide: -40, vol: 0.09 });
    beep(150, 0.35, { type: 'square', slide: -60, vol: 0.05, delay: 0.05 });
  },
  tank2: () => {
    beep(1200, 0.06, { vol: 0.05 });
    beep(800, 0.18, { vol: 0.04, delay: 0.04, type: 'triangle' });
    noiseHit(0.1, 0.04, 5000, 0, 'highpass');
  },
  tank3: () => {
    noiseHit(0.6, 0.14, 250, 0, 'lowpass');
    beep(70, 0.6, { type: 'sawtooth', slide: -30, vol: 0.12 });
  },
  po1: () => {
    beep(1000, 0.05, { vol: 0.05 });
    beep(1000, 0.05, { vol: 0.05, delay: 0.09 });
    beep(1500, 0.14, { vol: 0.05, delay: 0.18 });
  },
  po2: () => [0, 1, 2, 3, 4].forEach((i) => beep(400 + Math.floor(Math.random() * 700), 0.06, { delay: i * 0.055, vol: 0.045 })),
  po3: () => {
    [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, { delay: i * 0.1, vol: 0.055 }));
    beep(1047, 0.5, { delay: 0.42, vol: 0.05, type: 'triangle' });
    noiseHit(0.4, 0.05, 6000, 0.4, 'highpass');
  },
};

// Som de cada power-up (índice em PICKUP_TYPES)
const PICK_SFX = [
  () => beep(520, 0.15, { slide: 300, vol: 0.05, type: 'triangle' }), // pizza
  () => beep(700, 0.06, { vol: 0.05 }) || beep(900, 0.08, { vol: 0.05, delay: 0.06 }), // café
  () => beep(400, 0.25, { vol: 0.05, slide: 500, type: 'triangle' }), // crachá
  () => [0, 1, 2].forEach((i) => beep(600 + i * 250, 0.05, { delay: i * 0.04, vol: 0.05 })), // energético
  () => {
    noiseHit(0.35, 0.1, 500, 0, 'lowpass');
    beep(120, 0.3, { type: 'sawtooth', slide: -60, vol: 0.08 });
  }, // deploy
  () => [0, 1, 2, 3].forEach((i) => beep(1400 - i * 150, 0.09, { delay: i * 0.05, vol: 0.04, type: 'triangle' })), // ar-condicionado
  () => [0, 1, 2].forEach((i) => beep(880 * 2 ** (i / 3), 0.09, { delay: i * 0.07, vol: 0.05 })), // bônus
  () => [0, 1, 2, 3].forEach((i) => beep(330 * 2 ** (i / 4), 0.14, { delay: i * 0.08, vol: 0.05, type: 'triangle' })), // backup
];

export const sfx = {
  skillFx: (cls, n) => (SKILL_SFX[`${cls}${n}`] || SKILL_SFX.dev1)(),
  pickFx: (kind) => (PICK_SFX[kind] || PICK_SFX[0])(),
  shot: () => {
    const now = performance.now();
    if (now - last < 60) return; // evita chiado quando muita gente atira
    last = now;
    beep(660, 0.07, { slide: -260, vol: 0.03 });
  },
  kill: () => beep(300, 0.09, { type: 'square', slide: 380, vol: 0.04 }),
  hurt: () => beep(140, 0.15, { type: 'sawtooth', slide: -80, vol: 0.06 }),
  server: () => beep(90, 0.25, { type: 'sawtooth', slide: -40, vol: 0.07 }),
  skill: () => {
    beep(400, 0.1, { slide: 300, vol: 0.05 });
    beep(800, 0.12, { delay: 0.09, vol: 0.04 });
  },
  wave: () => {
    beep(330, 0.12, { vol: 0.05 });
    beep(440, 0.12, { delay: 0.12, vol: 0.05 });
    beep(660, 0.2, { delay: 0.24, vol: 0.05 });
  },
  boss: () => {
    beep(110, 0.3, { type: 'sawtooth', vol: 0.07 });
    beep(82, 0.4, { type: 'sawtooth', delay: 0.25, vol: 0.07 });
  },
  clear: () => {
    for (let i = 0; i < 4; i++) beep(440 * 2 ** (i / 4), 0.1, { delay: i * 0.08, vol: 0.05 });
  },
  down: () => beep(300, 0.4, { type: 'triangle', slide: -250, vol: 0.07 }),
  revive: () => beep(300, 0.25, { type: 'triangle', slide: 400, vol: 0.06 }),
  pick: () => beep(900, 0.08, { vol: 0.04, slide: 300 }),
  over: () => {
    for (let i = 0; i < 4; i++) beep(330 - i * 50, 0.28, { type: 'triangle', delay: i * 0.22, vol: 0.07 });
  },
  click: () => beep(520, 0.05, { vol: 0.03 }),
};
