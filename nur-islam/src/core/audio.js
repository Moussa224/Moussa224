// Sons synthétisés (aucun fichier audio embarqué) + lecture de récitation en ligne.
import { store } from './store.js';

let ctx;
function ac() {
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ f = 440, t = 0.12, type = 'sine', vol = 0.12, slide = 0, delay = 0 }) {
  const a = ac(); if (!a || !store.get('sound')) return;
  const o = a.createOscillator(), g = a.createGain();
  const t0 = a.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + t);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  o.connect(g).connect(a.destination);
  o.start(t0); o.stop(t0 + t + 0.02);
}

export const sfx = {
  // petit « clac » boisé d'une perle qui tombe en place
  bead() { tone({ f: 720, t: 0.07, type: 'triangle', vol: 0.16, slide: -360 }); tone({ f: 190, t: 0.1, type: 'sine', vol: 0.12, slide: -60 }); },
  milestone() { [660, 880, 1100].forEach((f, i) => tone({ f, t: 0.22, vol: 0.1, delay: i * 0.09 })); },
  ok() { tone({ f: 660, t: 0.12, vol: 0.09 }); tone({ f: 990, t: 0.2, vol: 0.09, delay: 0.09 }); },
  ko() { tone({ f: 220, t: 0.25, type: 'sawtooth', vol: 0.05, slide: -60 }); },
  chime() { [523, 659, 784, 1046].forEach((f, i) => tone({ f, t: 0.9, vol: 0.07, delay: i * 0.18 })); },
};

// ─── Récitation ayah par ayah (nécessite une connexion) ───
export const RECITERS = [
  { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit (murattal)' },
  { id: 'Husary_128kbps', name: 'Mahmoud Khalil Al-Husary' },
  { id: 'Minshawy_Murattal_128kbps', name: 'Mohamed Siddiq Al-Minshawi' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'Abdurrahman As-Sudais' },
  { id: 'Maher_AlMuaiqly_64kbps', name: 'Maher Al-Muaiqly' },
];
export const ayahUrl = (s, v) => `https://everyayah.com/data/${store.get('reciter')}/${String(s).padStart(3, '0')}${String(v).padStart(3, '0')}.mp3`;

export function createPlayer({ onChange, onEnd, onError }) {
  const el = new Audio();
  el.preload = 'auto';
  let list = [], i = -1, playing = false;
  const emit = () => onChange && onChange({ index: i, item: list[i], playing });
  el.addEventListener('ended', () => { if (i < list.length - 1) play(i + 1); else { playing = false; emit(); onEnd && onEnd(); } });
  el.addEventListener('error', () => { playing = false; emit(); onError && onError(); });
  function play(n) {
    if (n < 0 || n >= list.length) return;
    i = n; el.src = list[i].url; playing = true; emit();
    el.play().catch(() => { playing = false; emit(); onError && onError(); });
    const nxt = list[i + 1]; if (nxt) { const pre = new Audio(); pre.preload = 'auto'; pre.src = nxt.url; }
  }
  return {
    load(items, start = 0) { list = items; play(start); },
    toggle() { if (!list.length) return; if (el.paused) { el.play(); playing = true; } else { el.pause(); playing = false; } emit(); },
    next() { play(i + 1); }, prev() { play(Math.max(0, i - 1)); },
    stop() { el.pause(); el.removeAttribute('src'); playing = false; list = []; i = -1; emit(); },
    get active() { return list.length > 0; },
  };
}

// ─── Notifications de prière (uniquement quand l'application est ouverte) ───
export async function askNotifications() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}
export function notify(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: 'icons/icon-192.png', tag: 'nur-prayer' });
  } catch {}
}
