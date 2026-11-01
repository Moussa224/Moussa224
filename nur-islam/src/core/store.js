// Stockage local : tout reste sur l'appareil (aucun compte, aucun envoi de données).
const KEY = 'nur:v1';

const DEFAULTS = {
  city: 'conakry',
  custom: null,            // { name, lat, lon, tz }
  method: 'MWL',
  madhab: 'shafi',
  hijriAdjust: 0,
  hijriAtMaghrib: true,
  theme: 'nuit',
  quality: 'auto',         // auto | high | low
  motion: 'auto',          // auto | on | off
  fr: true,
  tr: false,
  arSize: 34,
  notif: false,
  sound: true,
  haptics: true,
  reciter: 'Alafasy_128kbps',
  prayers: {},             // { 'YYYY-MM-DD': ['fajr', …] }
  dhikrDay: {},            // { 'YYYY-MM-DD': n }
  tasbih: { preset: 'subhanallah', count: 0, loops: 0, total: 0, target: 33, style: 'ambre' },
  bookmarks: [],           // [{ s, v }]
  lastRead: null,          // { s, v }
  learned: [],             // ids des Noms appris
  quiz: { best: 0, played: 0 },
  zakat: { currency: 'EUR', gold: 0, silver: 0, basis: 'gold' },
};

let state;
try { state = { ...structuredClone(DEFAULTS), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
catch { state = structuredClone(DEFAULTS); }

const subs = new Set();
let timer;
function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }, 150);
}

export const store = {
  get: (k) => state[k],
  all: () => state,
  set(k, v) { state[k] = v; persist(); subs.forEach((f) => f(k, v)); },
  patch(k, obj) { state[k] = { ...state[k], ...obj }; persist(); subs.forEach((f) => f(k, state[k])); },
  on(fn) { subs.add(fn); return () => subs.delete(fn); },
  reset() { state = structuredClone(DEFAULTS); persist(); subs.forEach((f) => f('*', null)); },
  export: () => JSON.stringify(state, null, 1),
  import(json) { const o = JSON.parse(json); state = { ...structuredClone(DEFAULTS), ...o }; persist(); subs.forEach((f) => f('*', null)); },
};

export const dayKey = (d = new Date(), tz) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return p; // YYYY-MM-DD
};
