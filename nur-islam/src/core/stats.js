// Suivi des 5 prières, dhikr du jour, séries — tout est local.
import { store, dayKey } from './store.js';

export const prayersOn = (key) => store.get('prayers')[key] || [];
export function togglePrayer(id, key) {
  const all = { ...store.get('prayers') };
  const cur = new Set(all[key] || []);
  cur.has(id) ? cur.delete(id) : cur.add(id);
  all[key] = [...cur];
  // ne garde que les 400 derniers jours
  const keys = Object.keys(all).sort();
  while (keys.length > 400) delete all[keys.shift()];
  store.set('prayers', all);
  return cur.has(id);
}

// Série de jours consécutifs avec les 5 prières cochées (aujourd'hui compte s'il est complet, sinon on part d'hier).
export function streak(tz) {
  const all = store.get('prayers');
  const day = new Date();
  let n = 0, i = 0;
  const key = (d) => dayKey(d, tz);
  if ((all[key(day)] || []).length < 5) i = 1;
  for (; i < 400; i++) {
    const d = new Date(Date.now() - i * 86400000);
    if ((all[key(d)] || []).length >= 5) n++; else break;
  }
  return n;
}

export function addDhikr(n, tz) {
  const k = dayKey(new Date(), tz);
  const m = { ...store.get('dhikrDay') };
  m[k] = (m[k] || 0) + n;
  const keys = Object.keys(m).sort(); while (keys.length > 120) delete m[keys.shift()];
  store.set('dhikrDay', m);
}
export const dhikrToday = (tz) => store.get('dhikrDay')[dayKey(new Date(), tz)] || 0;
