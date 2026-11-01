// Accès au Coran : métadonnées embarquées, versets chargés à la demande (data/quran/<n>.js).
import meta from '../content/surahs.json';
import { loadScript } from './dom.js';

export const SURAHS = meta.surahs;
export const JUZ_STARTS = meta.juz;

const cache = new Map();
export async function loadSurah(n) {
  if (cache.has(n)) return cache.get(n);
  await loadScript(`data/quran/${n}.js`);
  const v = self.NUR_Q[n];
  cache.set(n, v);
  return v;
}

export function juzOf(s, v) {
  let j = 1;
  for (let i = 0; i < JUZ_STARTS.length; i++) { const [js, jv] = JUZ_STARTS[i]; if (s > js || (s === js && v >= jv)) j = i + 1; }
  return j;
}

// Numéro absolu (1…6236) d'un verset, utile pour certaines API audio.
const cum = (() => { let t = 0; return SURAHS.map((s) => { const c = t; t += s.n; return c; }); })();
export const absAyah = (s, v) => cum[s - 1] + v;

// Retire le verset de bismillah répété en tête de sourate (déjà affiché à part) — sauf Al-Fatiha.
export const hasBismillahHeader = (s) => s !== 1 && s !== 9;

export const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
export const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

// Recherche plein texte (français, phonétique, arabe sans voyelles) — charge toutes les sourates au premier usage.
import { normAr, normLatin } from './dom.js';
let index = null, building = null;
export async function buildIndex(onProgress) {
  if (index) return index;
  if (building) return building;
  building = (async () => {
    const out = [];
    for (let i = 1; i <= 114; i += 8) {
      const batch = [];
      for (let n = i; n < Math.min(115, i + 8); n++) batch.push(loadSurah(n).then((v) => ({ n, v })));
      for (const { n, v } of await Promise.all(batch)) v.forEach(([ar, fr, tr], k) => out.push({ s: n, v: k + 1, ar, fr, tr, a: normAr(ar), f: normLatin(fr), t: normLatin(tr) }));
      onProgress && onProgress(Math.min(114, i + 7) / 114);
    }
    index = out; return out;
  })();
  return building;
}
export function searchIndex(q, limit = 60) {
  const isAr = /[\u0600-\u06FF]/.test(q);
  const toks = (isAr ? normAr(q) : normLatin(q)).split(' ').filter((t) => t.length > 1 || isAr);
  if (!toks.length || !index) return [];
  const res = [];
  for (const r of index) {
    const hay = isAr ? r.a : r.f + ' ' + r.t;
    if (toks.every((t) => hay.includes(t))) { res.push(r); if (res.length >= limit) break; }
  }
  return res;
}
