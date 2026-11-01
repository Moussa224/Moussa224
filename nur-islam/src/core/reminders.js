// Rappel à l'heure de la prière tant que l'application est ouverte (aucun serveur, aucun envoi).
import { store } from './store.js';
import { currentPlace, timesFor, PRAYERS, fmtTime } from './prayer.js';
import { notify, sfx } from './audio.js';
import { toast } from './dom.js';

let last = '';
export function startReminders() {
  setInterval(() => {
    if (!store.get('notif')) return;
    const place = currentPlace();
    const now = new Date();
    const t = timesFor(place, now, 0);
    for (const p of PRAYERS) {
      const d = now - t[p.id];
      const key = p.id + t.civil.d;
      if (d >= 0 && d < 60000 && last !== key) {
        last = key;
        notify(`C'est l'heure de ${p.fr}`, `${fmtTime(t[p.id], place.tz)} · ${place.name}`);
        toast(`C'est l'heure de ${p.fr} — ${p.ar}`, 6000);
        sfx.chime();
      }
    }
  }, 10000);
}
