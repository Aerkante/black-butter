// Sequenciador de música chiptune com WebAudio: pulso 25%/50% (melodia e arpejo), triângulo (baixo),
// ruído (bateria). Toca em loop; o jogo troca de trilha conforme a situação.
import { TRACKS, STEPS, midiToHz, bassNote, arpNote } from './music-data.js';
import { getCtx, onReady } from './sfx.js';

let enabled = true;
try {
  enabled = localStorage.getItem('pg_music') !== '0';
} catch {
  /* sem armazenamento */
}

let ctx = null;
let master = null;
let noise = null;
let pulse25 = null;
let pulse50 = null;
let want = { name: null, calm: false };
let cur = null;
let timer = null;
let nextTime = 0;
let step = 0;
let barIdx = 0;

const LOOKAHEAD = 0.18;
const MASTER = 0.5;

export const isEnabled = () => enabled;

export function setEnabled(v) {
  enabled = v;
  try {
    localStorage.setItem('pg_music', v ? '1' : '0');
  } catch {
    /* ignora */
  }
  if (master) master.gain.setTargetAtTime(v ? MASTER : 0, ctx.currentTime, 0.05);
}

// Onda de pulso com o ciclo de trabalho (duty) dado: diferença entre duas serras deslocadas.
function pulseWave(duty) {
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  const phi = 2 * Math.PI * duty;
  for (let k = 1; k < n; k++) {
    real[k] = Math.sin(k * phi) / k;
    imag[k] = (1 - Math.cos(k * phi)) / k;
  }
  return ctx.createPeriodicWave(real, imag);
}

function init() {
  ctx = getCtx();
  if (!ctx || master) return !!master;
  master = ctx.createGain();
  master.gain.value = enabled ? MASTER : 0;
  master.connect(ctx.destination);
  pulse25 = pulseWave(0.25);
  pulse50 = pulseWave(0.5);
  const len = ctx.sampleRate;
  noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

function tone(freq, t, dur, vol, { wave = null, type = 'square' } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  if (wave) o.setPeriodicWave(wave);
  else o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.setValueAtTime(vol * 0.75, t + dur * 0.55);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function kick(t, vol) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
  g.gain.setValueAtTime(0.16 * vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + 0.2);
}

function noiseHit(t, dur, vol, filterType, freq) {
  const s = ctx.createBufferSource();
  s.buffer = noise;
  s.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(master);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

function scheduleStep(t) {
  const track = TRACKS[cur];
  const b = track.bars[barIdx];
  const stepDur = 60 / track.tempo / 4;
  const v = track.vol;
  const calm = want.calm;
  // baixo (triângulo)
  const bn = bassNote(b.root, step);
  if (bn) tone(midiToHz(bn), t, stepDur * 1.7, v.bass, { type: 'triangle' });
  // arpejo (pulso 25%)
  const an = arpNote(b, track.arp, step);
  if (an) tone(midiToHz(an), t, stepDur * 0.9, v.arp, { wave: pulse25 });
  if (!calm) {
    // melodia (pulso 50%)
    for (const [s, note, len] of b.mel) {
      if (s === step) tone(midiToHz(note), t, stepDur * len * 0.92, v.lead, { wave: pulse50 });
    }
    // bateria
    const dr = track.drums;
    if (dr.k.includes(step)) kick(t, v.drums);
    if (dr.s.includes(step)) noiseHit(t, 0.11, 0.05 * v.drums, 'bandpass', 1800);
    if (dr.h.includes(step)) noiseHit(t, 0.03, 0.02 * v.drums, 'highpass', 7000);
  } else if (track.drums.k.includes(step) && step % 8 === 0) {
    kick(t, 0.5 * v.drums);
  }
}

function tick() {
  if (!ctx || !cur) return;
  const track = TRACKS[cur];
  const stepDur = 60 / track.tempo / 4;
  if (nextTime < ctx.currentTime - 0.3) nextTime = ctx.currentTime + 0.05; // voltou de segundo plano
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    scheduleStep(nextTime);
    nextTime += stepDur;
    step++;
    if (step >= STEPS) {
      step = 0;
      barIdx = (barIdx + 1) % track.bars.length;
    }
  }
}

function apply() {
  if (!want.name) {
    cur = null;
    return;
  }
  if (!init()) return;
  if (cur !== want.name) {
    cur = want.name;
    step = 0;
    barIdx = 0;
    nextTime = ctx.currentTime + 0.08;
  }
  if (!timer) timer = setInterval(tick, 40);
}

// Pede uma trilha ('menu' | 'battle' | 'boss' | null). calm = só baixo e arpejo (entre ondas).
export function play(name, { calm = false } = {}) {
  want = { name, calm };
  if (!name && timer) {
    clearInterval(timer);
    timer = null;
  }
  if (getCtx()) apply();
}

onReady(() => apply());
