import { createStage } from '../scene/engine.js';
import { mosqueScene } from '../scene/mosque.js';
import { currentPlace, status, timesFor, fmtTime, fmtCountdown, hijriNow, civilInTZ, PRAYERS } from '../core/prayer.js';
import { MONTHS, MONTHS_AR, DAYS_FR, moonPhase, nextHijriOccurrence, EVENTS } from '../core/hijri.js';
import { store, dayKey } from '../core/store.js';
import { prayersOn, togglePrayer, streak, dhikrToday } from '../core/stats.js';
import { loadSurah, SURAHS } from '../core/quran.js';
import { verseOfDay } from '../content/verses.js';
import { icon } from '../core/icons.js';
import { esc, pad, toast, copyText } from '../core/dom.js';
import { sfx } from '../core/audio.js';
import { HADITHS } from '../content/hadith.js';

const minutesOf = (date, tz) => { const c = civilInTZ(date, tz); return c.hh * 60 + c.mm + c.ss / 60; };

export function timesToMinutes(t, tz) {
  const m = (d) => minutesOf(d, tz);
  return { fajr: m(t.fajr), sunrise: m(t.sunrise), dhuhr: m(t.dhuhr), asr: m(t.asr), sunset: m(t.sunset), maghrib: m(t.maghrib), isha: m(t.isha) };
}

const SHORTCUTS = [
  { to: 'qibla', t: 'Qibla', d: 'Boussole 3D vers la Kaaba', i: 'compass', ar: 'قبلة' },
  { to: 'coran', t: 'Coran', d: '114 sourates, arabe · français · phonétique', i: 'book', ar: 'قرآن' },
  { to: 'tasbih', t: 'Tasbih 3D', d: 'Chapelet interactif avec compteur', i: 'beads', ar: 'تسبيح' },
  { to: 'noms', t: '99 Noms', d: "Les plus beaux Noms d'Allah", i: 'star', ar: 'الأسماء' },
  { to: 'prophetes', t: 'Les prophètes', d: 'Récits des 25 prophètes du Coran', i: 'scroll', ar: 'أنبياء' },
  { to: 'guide', t: 'Guide de la prière', d: 'Ablutions et salât pas à pas en 3D', i: 'pray', ar: 'صلاة' },
  { to: 'invocations', t: 'Invocations', d: 'Adhkar du matin, du soir et du quotidien', i: 'heart', ar: 'دعاء' },
  { to: 'calendrier', t: 'Calendrier', d: 'Hégire, fêtes et phases de la lune', i: 'cal', ar: 'تقويم' },
];

export default {
  title: 'Accueil',
  async mount(el) {
    const place = currentPlace();
    const tz = place.tz;
    const now0 = new Date();
    const st0 = status(place, now0);
    const mp = moonPhase(now0);
    const dayIdx = Math.floor(Date.UTC(civilInTZ(now0, tz).y, civilInTZ(now0, tz).m - 1, civilInTZ(now0, tz).d) / 86400000);
    const [vs, vv] = verseOfDay(dayIdx);
    const h = HADITHS[dayIdx % HADITHS.length];

    el.innerHTML = `
      <section class="stage hero" id="hero" aria-label="Mosquée en 3D, le ciel suit l'heure réelle des prières">
        <div class="overlay">
          <div class="hero-top">
            <div class="hero-date"><div class="hijri" id="hDate">…</div><div class="greg" id="gDate"></div></div>
            <div class="hero-next"><div class="lbl">Prochaine prière</div><div class="name"><span id="nName"></span><span class="ar" id="nAr" lang="ar"></span></div><div class="count" id="nCount">--:--:--</div></div>
          </div>
          <div class="hero-bottom">
            <div class="scrub">
              <div class="top"><span id="scrubLbl">Le ciel suit l'heure réelle</span><button class="btn sm ghost" id="scrubNow" hidden>Maintenant</button></div>
              <input type="range" id="scrub" min="0" max="1439" step="1" aria-label="Parcourir la journée">
            </div>
            <a class="chip" href="#/prieres">${icon('pin')} ${esc(place.name)}</a>
          </div>
        </div>
      </section>

      <div class="prayer-strip" id="strip"></div>
      <p class="muted" style="text-align:center;font-size:.78rem;margin:8px 0 0">Touchez une prière pour la marquer comme accomplie · <a href="#/prieres" style="color:var(--gold)">tous les horaires</a></p>

      <div class="grid g4" style="margin-top:22px" id="stats"></div>

      <div class="section-title"><h2>Verset du jour</h2><a href="#/coran/${vs}?v=${vv}">Lire en contexte →</a></div>
      <article class="card verse-card tilt" id="verse"><div class="empty">…</div></article>

      <div class="section-title"><h2>Explorer</h2><a href="#/explorer">Tout voir →</a></div>
      <div class="grid g3" id="shortcuts">${SHORTCUTS.map((s) => `
        <a class="shortcut tilt" href="#/${s.to}"><span class="big-ar ar" lang="ar">${s.ar}</span><span class="ic pop">${icon(s.i)}</span><b class="pop2">${s.t}</b><small>${s.d}</small></a>`).join('')}
      </div>

      <div class="section-title"><h2>Hadith du jour</h2><a href="#/hadiths/${h.n}">Voir le hadith →</a></div>
      <article class="card tilt" id="hadith"><p class="ar" lang="ar" style="font-size:1.45rem;line-height:2.1;text-align:right;margin:0 0 10px;color:var(--gold)">${esc(h.ar.length > 260 ? h.ar.slice(0, 260).replace(/\s\S*$/, '') + ' …' : h.ar)}</p><p style="font-family:var(--serif);font-size:1.2rem;color:var(--ink-2);margin:0">${esc(h.fr.length > 300 ? h.fr.slice(0, 300).replace(/\s\S*$/, '') + ' …' : h.fr)}</p><p class="muted" style="font-size:.78rem;margin:8px 0 0">Hadith n°${h.n} d'an-Nawawî · ${esc(h.src)}</p></article>
    `;

    // ── scène 3D ──
    const hero = el.querySelector('#hero');
    const T0 = timesToMinutes(st0.today, tz);
    const stage = createStage(hero, (ctx) => mosqueScene(ctx, { times: T0, moonFrac: mp.frac, minutes: minutesOf(now0, tz) }), { fov: 42, exposure: 1 });

    // ── horloge ──
    const $ = (s) => el.querySelector(s);
    const scrub = $('#scrub'), scrubLbl = $('#scrubLbl'), scrubNow = $('#scrubNow');
    let scrubbing = false, lastDay = '';
    scrub.value = Math.floor(minutesOf(now0, tz));
    scrub.addEventListener('input', () => {
      scrubbing = true; scrubNow.hidden = false;
      const m = +scrub.value; stage && stage.mod.setMinutes(m);
      scrubLbl.textContent = `Heure simulée · ${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    });
    scrubNow.addEventListener('click', () => { scrubbing = false; scrubNow.hidden = true; scrubLbl.textContent = "Le ciel suit l'heure réelle"; });

    function renderStrip(st) {
      const key = dayKey(new Date(), tz), done = new Set(prayersOn(key));
      $('#strip').innerHTML = PRAYERS.map((p) => `
        <button class="pcard tilt ${st.next.id === p.id && st.next.day === 0 ? 'next' : ''} ${done.has(p.id) ? 'done' : ''}" data-p="${p.id}" aria-pressed="${done.has(p.id)}">
          <div class="pa ar" lang="ar">${p.ar}</div><div class="pn">${p.fr}</div><div class="pt">${fmtTime(st.today[p.id], tz)}</div>
        </button>`).join('');
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.pcard'); if (!b) return;
      const on = togglePrayer(b.dataset.p, dayKey(new Date(), tz));
      on && sfx.ok(); b.classList.toggle('done', on); b.setAttribute('aria-pressed', on); renderStats();
      if (on) toast(`${PRAYERS.find((p) => p.id === b.dataset.p).fr} accomplie — qu'Allah l'accepte`);
    });

    function renderStats() {
      const key = dayKey(new Date(), tz);
      const n = prayersOn(key).length;
      $('#stats').innerHTML = `
        <div class="stat"><b>${n}/5</b><span>prières aujourd'hui</span></div>
        <div class="stat"><b>${streak(tz)}</b><span>jours de série complète</span></div>
        <div class="stat"><b>${dhikrToday(tz)}</b><span>dhikr aujourd'hui</span></div>
        <div class="stat"><b>${store.get('learned').length}/99</b><span>Noms appris</span></div>`;
    }

    function tick() {
      const now = new Date();
      const st = status(place, now);
      const day = dayKey(now, tz);
      if (day !== lastDay) { lastDay = day; renderStrip(st); renderStats(); stage && stage.mod.setTimes(timesToMinutes(st.today, tz), moonPhase(now).frac); }
      const p = PRAYERS.find((x) => x.id === st.next.id);
      $('#nName').textContent = p.fr; $('#nAr').textContent = p.ar;
      $('#nCount').textContent = '− ' + fmtCountdown(st.next.at - now);
      const h = hijriNow(place, now);
      $('#hDate').textContent = `${h.d} ${MONTHS[h.m - 1]} ${h.y}`;
      const c = civilInTZ(now, tz);
      $('#gDate').textContent = new Intl.DateTimeFormat('fr-FR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now) + ' · ' + mp.name;
      if (!scrubbing) { const m = minutesOf(now, tz); stage && stage.mod.setMinutes(m); scrub.value = Math.floor(m); }
      // met à jour le surlignage « prochaine » sans tout redessiner
      el.querySelectorAll('.pcard').forEach((b) => b.classList.toggle('next', b.dataset.p === st.next.id && st.next.day === 0));
    }
    tick(); const iv = setInterval(tick, 1000);

    // ── verset du jour ──
    loadSurah(vs).then((sv) => {
      const [ar, fr] = sv[vv - 1];
      const box = $('#verse');
      box.innerHTML = `<div class="ar" lang="ar">${esc(ar)}</div><div class="fr">« ${esc(fr)} »</div><div class="ref">${esc(SURAHS[vs - 1].tr.toUpperCase())} · ${vs}:${vv}</div>
        <div class="row" style="justify-content:center;margin-top:12px"><button class="btn sm" data-copy>${icon('copy')} Copier</button><a class="btn sm" href="#/coran/${vs}?v=${vv}">${icon('book')} Lire la sourate</a></div>`;
      box.querySelector('[data-copy]').onclick = () => copyText(`${ar}\n« ${fr} »\n— Coran ${vs}:${vv} (${SURAHS[vs - 1].tr})`);
    }).catch(() => { $('#verse').innerHTML = '<div class="empty">Verset indisponible.</div>'; });

    return () => { clearInterval(iv); stage && stage.dispose(); };
  },
};
