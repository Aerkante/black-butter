// Efeitos sonoros de 8 bits gerados com WebAudio (ondas quadradas). Sem arquivos de áudio.
let ctx = null;
let muted = false;
try {
  muted = localStorage.getItem('pg_mute') === '1';
} catch {
  /* sem armazenamento */
}

export function unlock() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) ctx = new AC();
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

export const sfx = {
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
