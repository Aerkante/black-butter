// Trilhas em chiptune, escritas como dados (notas MIDI). Sem áudio aqui: só partitura.
// Cada compasso tem 16 passos (semicolcheias). Melodia: [passo, nota, duração em passos].

export const STEPS = 16;

export const midiToHz = (m) => 440 * 2 ** ((m - 69) / 12);

export function chordTones(root, quality) {
  return [0, quality === 'm' ? 3 : 4, 7, 12].map((i) => root + i);
}

// Ordem em que o arpejo percorre as 4 notas do acorde, em 16 passos.
export const ARP_PATTERNS = {
  up: [0, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 2, 3, 2, 1, 2],
  fast: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3],
  slow: [0, 0, 1, 1, 2, 2, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3],
};

// Bateria por passo: k = bumbo, s = caixa, h = chimbal
const DRUMS = {
  battle: { k: [0, 8, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
  boss: { k: [0, 4, 8, 10, 12], s: [4, 12], h: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  menu: { k: [0, 8], s: [], h: [4, 12] },
};

const bar = (root, q, mel) => ({ root, q, mel });

export const TRACKS = {
  // Escritório à tarde: calmo, em Dó maior
  menu: {
    tempo: 100,
    arp: 'slow',
    drums: DRUMS.menu,
    vol: { lead: 0.03, arp: 0.014, bass: 0.07, drums: 0.5 },
    bars: [
      bar(48, 'M', [[0, 76, 4], [4, 79, 4], [8, 77, 4], [12, 76, 4]]),
      bar(45, 'm', [[0, 72, 4], [4, 76, 4], [8, 74, 4], [12, 72, 4]]),
      bar(41, 'M', [[0, 77, 4], [4, 81, 4], [8, 79, 4], [12, 77, 4]]),
      bar(43, 'M', [[0, 74, 4], [4, 79, 4], [8, 76, 4], [12, 74, 4]]),
      bar(48, 'M', [[0, 79, 4], [4, 76, 4], [8, 84, 4], [12, 79, 4]]),
      bar(45, 'm', [[0, 76, 4], [4, 72, 4], [8, 81, 4], [12, 76, 4]]),
      bar(41, 'M', [[0, 81, 4], [4, 79, 4], [8, 77, 4], [12, 72, 4]]),
      bar(43, 'M', [[0, 79, 6], [6, 77, 2], [8, 74, 4], [12, 71, 4]]),
    ],
  },
  // Combate: Lá menor, pulsante
  battle: {
    tempo: 148,
    arp: 'up',
    drums: DRUMS.battle,
    vol: { lead: 0.045, arp: 0.02, bass: 0.09, drums: 1 },
    bars: [
      bar(45, 'm', [[0, 76, 3], [4, 76, 1], [5, 74, 1], [6, 72, 2], [8, 74, 4], [12, 72, 2], [14, 69, 2]]),
      bar(41, 'M', [[0, 72, 3], [4, 69, 2], [6, 72, 2], [8, 74, 4], [12, 72, 2], [14, 69, 2]]),
      bar(48, 'M', [[0, 76, 3], [4, 79, 2], [6, 76, 2], [8, 72, 4], [12, 74, 2], [14, 76, 2]]),
      bar(43, 'M', [[0, 74, 3], [4, 71, 2], [6, 74, 2], [8, 79, 4], [12, 76, 2], [14, 74, 2]]),
      bar(45, 'm', [[0, 81, 3], [4, 79, 2], [6, 76, 2], [8, 79, 4], [12, 76, 2], [14, 72, 2]]),
      bar(41, 'M', [[0, 77, 3], [4, 76, 2], [6, 72, 2], [8, 77, 4], [12, 72, 2], [14, 69, 2]]),
      bar(43, 'M', [[0, 79, 2], [2, 74, 2], [4, 79, 2], [6, 74, 2], [8, 79, 2], [10, 83, 2], [12, 81, 2], [14, 79, 2]]),
      bar(40, 'M', [[0, 80, 4], [4, 76, 2], [6, 80, 2], [8, 83, 4], [12, 80, 2], [14, 76, 2]]),
    ],
  },
  // Chefe: Ré menor, mais rápida e agressiva
  boss: {
    tempo: 172,
    arp: 'fast',
    drums: DRUMS.boss,
    vol: { lead: 0.05, arp: 0.022, bass: 0.1, drums: 1.1 },
    bars: [
      bar(38, 'm', [[0, 81, 2], [2, 81, 2], [4, 84, 2], [6, 81, 2], [8, 79, 2], [10, 77, 2], [12, 74, 4]]),
      bar(38, 'm', [[0, 74, 2], [2, 77, 2], [4, 81, 2], [6, 77, 2], [8, 84, 4], [12, 81, 2], [14, 77, 2]]),
      bar(46, 'M', [[0, 82, 2], [2, 82, 2], [4, 86, 2], [6, 82, 2], [8, 79, 2], [10, 77, 2], [12, 74, 4]]),
      bar(48, 'M', [[0, 84, 2], [2, 79, 2], [4, 84, 2], [6, 79, 2], [8, 86, 2], [10, 84, 2], [12, 79, 4]]),
      bar(38, 'm', [[0, 81, 2], [2, 81, 2], [4, 84, 2], [6, 81, 2], [8, 79, 2], [10, 77, 2], [12, 74, 4]]),
      bar(38, 'm', [[0, 74, 2], [2, 77, 2], [4, 81, 2], [6, 77, 2], [8, 84, 4], [12, 81, 2], [14, 77, 2]]),
      bar(46, 'M', [[0, 82, 4], [4, 86, 4], [8, 84, 4], [12, 82, 4]]),
      bar(45, 'M', [[0, 85, 2], [2, 81, 2], [4, 85, 2], [6, 88, 2], [8, 85, 4], [12, 81, 4]]),
    ],
  },
};

// Notas de baixo por passo: oitavas alternadas nas colcheias (pulsação constante)
export function bassNote(root, step) {
  if (step % 2) return 0;
  return step % 4 === 0 ? root : root + 12;
}

// Nota do arpejo no passo (0 = pausa)
export function arpNote(barData, pattern, step) {
  const tones = chordTones(barData.root + 24, barData.q);
  return tones[ARP_PATTERNS[pattern][step]];
}
