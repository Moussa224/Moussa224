export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const pad = (n) => String(n).padStart(2, '0');
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

let toastTimer;
export function toast(msg, ms = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// Feuille modale (bottom sheet) — retourne une fonction de fermeture.
export function openSheet(html, { onClose } = {}) {
  const el = document.getElementById('sheet');
  el.innerHTML = `<div class="sheet-body" role="dialog" aria-modal="true">${html}</div>`;
  el.hidden = false;
  const close = () => { el.hidden = true; el.innerHTML = ''; document.removeEventListener('keydown', onKey); onClose && onClose(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  el.onclick = (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); };
  document.addEventListener('keydown', onKey);
  el.querySelector('button,[href],input,select')?.focus?.({ preventScroll: true });
  return close;
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copié'); }
  catch { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); try { document.execCommand('copy'); toast('Copié'); } catch { toast('Copie impossible'); } t.remove(); }
}

export async function shareText(title, text) {
  if (navigator.share) { try { await navigator.share({ title, text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  copyText(text);
}

// Charge un script (utilisé pour les sourates, compatible file://).
const loaded = new Map();
export function loadScript(src) {
  if (loaded.has(src)) return loaded.get(src);
  const p = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => res();
    s.onerror = () => { loaded.delete(src); rej(new Error('Chargement impossible : ' + src)); };
    document.head.append(s);
  });
  loaded.set(src, p);
  return p;
}

export const reducedMotion = () =>
  document.documentElement.dataset.motion === 'off' ||
  (document.documentElement.dataset.motion !== 'on' && matchMedia('(prefers-reduced-motion: reduce)').matches);

export const vibrate = (ms = 12) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

// Normalise l'arabe pour la recherche (retire voyelles, tatwil, variantes d'alif…).
export function normAr(s) {
  return s.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ|ئ/g, 'ء');
}
export const normLatin = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`ʿʾ]/g, '').replace(/\s+/g, ' ').trim();
