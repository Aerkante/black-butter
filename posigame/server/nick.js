// Validação de nicks: formato, filtro de palavrões e nomes reservados.
import { LIMITS } from '../shared/game.js';
import { config } from './config.js';

const FORMAT = /^[A-Za-z0-9_.-]+$/;

// Palavras longas e inequívocas: bloqueadas em qualquer parte do nick.
const SUBSTRING = [
  'caralho', 'porra', 'merda', 'buceta', 'arrombad', 'cuzao', 'viado', 'boquete',
  'punheta', 'foder', 'fodase', 'vagabund', 'racista', 'nazista', 'hitler', 'estupr',
  'cacete', 'piroca', 'xereca', 'otario', 'babaca', 'imbecil', 'retardad', 'macaco',
  'prostituta', 'desgraca', 'filhadaputa', 'filhodaputa',
];
// Palavras curtas: bloqueadas só quando são um "termo" inteiro do nick.
const TERMS = ['puta', 'puto', 'fdp', 'pqp', 'vsf', 'tnc', 'foda', 'cu', 'pau', 'rola', 'bosta', 'nazi'];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b' };

export function normalize(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0134578]/g, (d) => LEET[d]);
}

export function isOffensive(nick) {
  const flat = normalize(nick).replace(/[^a-z]/g, '');
  if (SUBSTRING.some((w) => flat.includes(w))) return true;
  const terms = normalize(nick).split(/[^a-z]+/).filter(Boolean);
  if (terms.some((t) => TERMS.includes(t))) return true;
  if (TERMS.includes(flat)) return true;
  return false;
}

export function nickKey(nick) {
  return nick.toLowerCase();
}

// Retorna { ok:true, nick } ou { ok:false, error }.
export function validateNick(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'Nick inválido.' };
  const nick = raw.trim();
  if (nick.length < LIMITS.nickMin || nick.length > LIMITS.nickMax) {
    return { ok: false, error: `O nick deve ter de ${LIMITS.nickMin} a ${LIMITS.nickMax} caracteres.` };
  }
  if (!FORMAT.test(nick)) {
    return { ok: false, error: 'Use só letras (sem acento), números, _ . -' };
  }
  const flat = normalize(nick).replace(/[^a-z0-9]/g, '');
  if (config.reservedNicks.includes(flat) || config.bannedNicks.includes(nickKey(nick))) {
    return { ok: false, error: 'Esse nick não está disponível.' };
  }
  if (isOffensive(nick)) return { ok: false, error: 'Esse nick não é permitido. Escolha outro.' };
  return { ok: true, nick };
}
