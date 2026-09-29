// Catálogo de personalização do boneco. Compartilhado: o editor do cliente usa
// as listas e o servidor usa validateLook para aceitar só combinações válidas.

export const BODY_NAMES = ['Corpo A', 'Corpo B'];

export const SKIN = ['#F6D5B8', '#E7B48F', '#C68642', '#A0673F', '#8D5A3B', '#5B3A29'];

export const HAIR_COLORS = [
  { name: 'Preto', hex: '#232a55' },
  { name: 'Castanho', hex: '#5B3A29' },
  { name: 'Loiro', hex: '#ffd84d' },
  { name: 'Ruivo', hex: '#e0501e' },
  { name: 'Grisalho', hex: '#c4c4d4' },
  { name: 'Branco', hex: '#fff6e0' },
  { name: 'Rosa', hex: '#ff4fa3' },
];

// Peças de cabelo e roupa são por corpo; óculos, mochila e crachá são unissex.
export const HAIR_STYLES = [
  ['Curto', 'Raspado', 'Cacheado', 'Topete'],
  ['Longo', 'Curto', 'Coque', 'Trança'],
];

export const GLASSES = ['Nenhum', 'Redondo', 'Sol'];

export const OUTFITS = [
  ['Camiseta', 'Social', 'Moletom', 'Jaleco'],
  ['Camiseta', 'Blusa social', 'Moletom', 'Jaleco'],
];
export const JALECO_INDEX = 3;

export const OUTFIT_COLORS = [
  '#2bc8ff',
  '#ffd426',
  '#ff4fa3',
  '#ff3b4e',
  '#3dff8b',
  '#fff6e0',
  '#ff8a1f',
  '#8fa3ff',
];

export const BOTTOMS = [
  ['Calça', 'Bermuda'],
  ['Calça', 'Saia'],
];

export const BOTTOM_COLORS = ['#2b3a9e', '#0b0e1a', '#a8531f', '#3b4dc4', '#8fa3ff', '#1fcb6a'];

export const JALECO_COLOR = '#1F2A5A';

const RANGES = {
  body: BODY_NAMES.length,
  hairStyle: 4,
  hairColor: HAIR_COLORS.length,
  skin: SKIN.length,
  glasses: GLASSES.length,
  outfit: 4,
  outfitColor: OUTFIT_COLORS.length,
  bottom: 2,
  bottomColor: BOTTOM_COLORS.length,
  backpack: 2,
  badge: 2,
};

export const LOOK_KEYS = Object.keys(RANGES);

export function defaultLook() {
  return {
    body: 0,
    hairStyle: 0,
    hairColor: 1,
    skin: 1,
    glasses: 0,
    outfit: 0,
    outfitColor: 0,
    bottom: 0,
    bottomColor: 0,
    backpack: 0,
    badge: 0,
  };
}

// Devolve sempre um look válido (valores fora da faixa viram o padrão).
export function validateLook(input) {
  const base = defaultLook();
  if (!input || typeof input !== 'object') return base;
  for (const k of LOOK_KEYS) {
    const v = input[k];
    if (Number.isInteger(v) && v >= 0 && v < RANGES[k]) base[k] = v;
  }
  return base;
}

export function randomLook(rand = Math.random) {
  const look = {};
  for (const k of LOOK_KEYS) look[k] = Math.floor(rand() * RANGES[k]);
  look.glasses = rand() < 0.4 ? look.glasses : 0;
  look.backpack = rand() < 0.3 ? 1 : 0;
  look.badge = rand() < 0.4 ? 1 : 0;
  return look;
}

export function lookKey(look) {
  return LOOK_KEYS.map((k) => look[k]).join('.');
}

export function ranges() {
  return { ...RANGES };
}
