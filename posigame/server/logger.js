// Log do servidor: tudo o que acontece aparece no terminal do host (com cores quando é um terminal)
// e também é gravado em arquivos diários em data/logs/. Níveis: silent, error, warn, info, debug.
import fs from 'node:fs';
import path from 'node:path';

const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };
const LABEL = { error: 'ERRO ', warn: 'AVISO', info: 'INFO ', debug: 'DEBUG' };
const COLOR = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[0m', debug: '\x1b[90m' };
const TAG_COLOR = {
  servidor: '\x1b[35m',
  rede: '\x1b[36m',
  jogador: '\x1b[32m',
  partida: '\x1b[34m',
  onda: '\x1b[33m',
  combate: '\x1b[90m',
  ranking: '\x1b[95m',
  dados: '\x1b[96m',
};
const RESET = '\x1b[0m';

const pad = (n) => String(n).padStart(2, '0');
export function stamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const noop = () => {};
export const silentLogger = { error: noop, warn: noop, info: noop, debug: noop, level: 'silent', close: noop };

export function createLogger({ level = 'debug', dir = null, stream = process.stdout, color = !!stream?.isTTY, now = () => new Date() } = {}) {
  const max = LEVELS[level] ?? LEVELS.debug;
  let fileDay = '';
  let fd = null;

  function openFile(d) {
    const day = stamp(d).slice(0, 10);
    if (day === fileDay && fd !== null) return;
    if (fd !== null) fs.closeSync(fd);
    fileDay = day;
    try {
      fs.mkdirSync(dir, { recursive: true });
      fd = fs.openSync(path.join(dir, `posigame-${day}.log`), 'a');
    } catch {
      fd = null;
    }
  }

  function write(lvl, tag, msg) {
    if (LEVELS[lvl] > max) return;
    const d = now();
    const plain = `${stamp(d)} ${LABEL[lvl]} [${tag}] ${msg}`;
    if (stream) {
      if (color) {
        const c = COLOR[lvl];
        const tc = lvl === 'error' || lvl === 'warn' ? c : TAG_COLOR[tag] || c;
        stream.write(`\x1b[90m${stamp(d)}${RESET} ${c}${LABEL[lvl]}${RESET} ${tc}[${tag}]${RESET} ${c}${msg}${RESET}\n`);
      } else {
        stream.write(`${plain}\n`);
      }
    }
    if (dir) {
      try {
        openFile(d);
        if (fd !== null) fs.writeSync(fd, `${plain}\n`);
      } catch {
        /* log em arquivo é opcional: nunca derruba o jogo */
      }
    }
  }

  return {
    level,
    error: (tag, msg) => write('error', tag, msg),
    warn: (tag, msg) => write('warn', tag, msg),
    info: (tag, msg) => write('info', tag, msg),
    debug: (tag, msg) => write('debug', tag, msg),
    close() {
      if (fd !== null) {
        try {
          fs.closeSync(fd);
        } catch {
          /* ignora */
        }
        fd = null;
      }
    },
  };
}

// "iPhone", "Android", "Windows"... a partir do user-agent, só para o log ficar legível
export function deviceOf(ua = '') {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux';
  return 'desconhecido';
}
