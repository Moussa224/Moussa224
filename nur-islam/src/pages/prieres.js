import { CITIES, METHODS, PRAYERS, SUNRISE, currentPlace, status, timesFor, fmtTime, fmtCountdown, hijriNow, civilInTZ } from '../core/prayer.js';
import { store, dayKey } from '../core/store.js';
import { prayersOn, togglePrayer, streak } from '../core/stats.js';
import { askNotifications } from '../core/audio.js';
import { icon } from '../core/icons.js';
import { esc, toast, pad } from '../core/dom.js';
import { sfx } from '../core/audio.js';

const WD = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

export default {
  title: 'Horaires de prière',
  mount(el) {
    let iv;
    const draw = () => {
      const place = currentPlace(), tz = place.tz;
      const now = new Date();
      const st = status(place, now);
      const T = st.today;
      const h = hijriNow(place, now);
      const key = dayKey(now, tz), done = new Set(prayersOn(key));
      const ramadan = h.m === 9;
      const method = METHODS.find((m) => m.id === store.get('method'));
      const minutes = (d) => { const c = civilInTZ(d, tz); return c.hh * 60 + c.mm; };
      const bar = [['fajr', 'sunrise', '#6b5fb8'], ['sunrise', 'dhuhr', '#f0b24a'], ['dhuhr', 'asr', '#5fb4f0'], ['asr', 'maghrib', '#f09a4a'], ['maghrib', 'isha', '#c25a7a']]
        .map(([a, b, c]) => `<i style="left:${(minutes(T[a]) / 14.4).toFixed(2)}%;width:${((minutes(T[b]) - minutes(T[a])) / 14.4).toFixed(2)}%;background:${c}" title="${a}"></i>`).join('');

      el.innerHTML = `
        <div class="page-head"><div class="eyebrow">${esc(place.name)} · ${esc(place.country)}</div><h1>Horaires de prière <span class="ar" lang="ar">مواقيت الصلاة</span></h1>
          <p>${new Intl.DateTimeFormat('fr-FR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(now)} · ${h.d} ${['Mouharram', 'Safar', "Rabi' al-awwal", "Rabi' ath-thani", 'Joumada al-oula', 'Joumada ath-thania', 'Rajab', "Cha'ban", 'Ramadan', 'Chawwal', "Dhou al-qi'da", 'Dhou al-hijja'][h.m - 1]} ${h.y}</p></div>

        <div class="card tilt" style="margin-top:8px">
          <div class="row spread"><div><div class="eyebrow">Prochaine prière</div><div class="bignum" id="pNext" style="color:var(--gold)">${PRAYERS.find((p) => p.id === st.next.id).fr}</div></div>
            <div style="text-align:right"><div class="bignum" id="pCount" style="font-variant-numeric:tabular-nums;font-weight:400">--:--:--</div><div class="muted" style="font-size:.85rem">à ${fmtTime(st.next.at, tz)}${st.next.day ? ' (demain)' : ''}</div></div></div>
          <div class="progress" style="margin:16px 0 4px"><i id="pProg" style="width:${(st.progress * 100).toFixed(1)}%"></i></div>
          <div class="daybar" aria-hidden="true">${bar}<b id="pNow"></b></div>
        </div>

        ${ramadan ? `<div class="grid g2" style="margin-top:14px"><div class="card tilt"><div class="eyebrow">Imsak · fin du repas (≈ Fajr − 10 min)</div><div class="bignum">${fmtTime(new Date(T.fajr.getTime() - 600000), tz)}</div></div><div class="card tilt"><div class="eyebrow">Iftar · rupture du jeûne (Maghrib)</div><div class="bignum" style="color:var(--gold)">${fmtTime(T.maghrib, tz)}</div></div></div>` : ''}

        <div class="section-title"><h2>Aujourd'hui</h2><span class="muted" style="font-size:.85rem">Série : ${streak(tz)} jour${streak(tz) > 1 ? 's' : ''}</span></div>
        <div class="grid" id="list">
          ${[PRAYERS[0], SUNRISE, ...PRAYERS.slice(1)].map((p) => {
            const isP = p.id !== 'sunrise';
            return `<div class="event-row ${st.next.id === p.id && !st.next.day ? 'tilt' : ''}" style="${st.next.id === p.id && !st.next.day ? 'border-color:var(--gold);background:var(--gold-soft)' : ''}">
              <div class="when" style="min-width:86px"><b style="font-size:1.6rem">${fmtTime(T[p.id], tz)}</b></div>
              <div style="flex:1"><div style="font-family:var(--serif);font-size:1.4rem;font-weight:600">${p.fr} <span class="ar" lang="ar" style="color:var(--gold);font-size:1.2rem;font-family:var(--ar-ui)">${p.ar}</span></div><div class="muted" style="font-size:.8rem">${p.sub}${isP ? ' · ' + p.rakaat + ' rak‘ât' : ''}</div></div>
              ${isP ? `<button class="btn sm ${done.has(p.id) ? 'em' : ''}" data-p="${p.id}" aria-pressed="${done.has(p.id)}">${icon('check')} ${done.has(p.id) ? 'Accomplie' : 'Marquer'}</button>` : ''}
            </div>`;
          }).join('')}
        </div>

        <div class="grid g3" style="margin-top:14px">
          <div class="stat"><b>${fmtTime(new Date(T.sunrise.getTime() + 15 * 60000), tz)}</b><span>Début de Doha (≈ lever + 15 min)</span></div>
          <div class="stat"><b>${fmtTime(T.middleOfNight, tz)}</b><span>Milieu de la nuit</span></div>
          <div class="stat"><b>${fmtTime(T.lastThird, tz)}</b><span>Dernier tiers de la nuit · tahajjud</span></div>
        </div>

        <div class="section-title"><h2>Cette semaine</h2></div>
        <div class="card flat" style="overflow-x:auto;padding:8px 12px">
          <table class="week"><thead><tr><th></th>${PRAYERS.map((p) => `<th>${p.fr}</th>`).join('')}</tr></thead><tbody>
          ${Array.from({ length: 7 }, (_, i) => { const t = timesFor(place, now, i); const d = new Date(t.civil.y, t.civil.m - 1, t.civil.d);
            return `<tr class="${i === 0 ? 'today' : ''}"><th>${WD[d.getDay()]} ${t.civil.d}/${pad(t.civil.m)}</th>${PRAYERS.map((p) => `<td>${fmtTime(t[p.id], tz)}</td>`).join('')}</tr>`; }).join('')}
          </tbody></table>
        </div>

        <div class="section-title"><h2>Réglages du calcul</h2></div>
        <div class="card">
          <div class="grid g2">
            <label class="field">Ville<select id="cSel">${CITIES.map((c) => `<option value="${c.id}" ${store.get('city') === c.id ? 'selected' : ''}>${esc(c.name)} — ${esc(c.country)}</option>`).join('')}${store.get('custom') ? `<option value="custom" ${store.get('city') === 'custom' ? 'selected' : ''}>${esc(store.get('custom').name)}</option>` : ''}</select></label>
            <label class="field">Méthode de calcul<select id="mSel">${METHODS.map((m) => `<option value="${m.id}" ${store.get('method') === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}</select></label>
            <label class="field">École (calcul de l'Asr)<select id="aSel"><option value="shafi" ${store.get('madhab') === 'shafi' ? 'selected' : ''}>Majorité (chafi'ite, malikite, hanbalite)</option><option value="hanafi" ${store.get('madhab') === 'hanafi' ? 'selected' : ''}>Hanafite</option></select></label>
            <label class="field">Ajustement de la date hégirienne<select id="hSel">${[-2, -1, 0, 1, 2].map((n) => `<option value="${n}" ${store.get('hijriAdjust') === n ? 'selected' : ''}>${n > 0 ? '+' : ''}${n} jour${Math.abs(n) > 1 ? 's' : ''}</option>`).join('')}</select></label>
          </div>
          <div class="row" style="margin-top:6px"><button class="btn" id="geo">${icon('pin')} Utiliser ma position</button>
            <label class="row" style="gap:10px"><span class="switch"><input type="checkbox" id="nSw" ${store.get('notif') ? 'checked' : ''}></span><span>Alerte sonore à l'heure de la prière <small class="muted">(application ouverte)</small></span></label></div>
          <p class="note">Méthode utilisée : ${esc(method.name)}. Les horaires sont calculés sur votre appareil, sans connexion. Ils peuvent différer de quelques minutes de ceux de votre mosquée : en cas de doute, suivez-les.</p>
        </div>`;
      bind();
      tick();
    };

    function tick() {
      const place = currentPlace(), now = new Date();
      const st = status(place, now);
      const c = el.querySelector('#pCount'); if (!c) return;
      c.textContent = fmtCountdown(st.next.at - now);
      el.querySelector('#pProg').style.width = (st.progress * 100).toFixed(1) + '%';
      const cv = civilInTZ(now, place.tz); const nowEl = el.querySelector('#pNow'); if (nowEl) nowEl.style.left = ((cv.hh * 60 + cv.mm) / 14.4).toFixed(2) + '%';
    }

    function bind() {
      const $ = (s) => el.querySelector(s);
      $('#cSel').onchange = (e) => { store.set('city', e.target.value); draw(); };
      $('#mSel').onchange = (e) => { store.set('method', e.target.value); draw(); };
      $('#aSel').onchange = (e) => { store.set('madhab', e.target.value); draw(); };
      $('#hSel').onchange = (e) => { store.set('hijriAdjust', +e.target.value); draw(); };
      $('#nSw').onchange = async (e) => {
        if (e.target.checked) { const r = await askNotifications(); if (r === 'denied') toast('Notifications refusées : seule l\'alerte sonore sera jouée.'); }
        store.set('notif', e.target.checked); if (e.target.checked) { sfx.chime(); toast('Alerte activée tant que Nûr est ouvert'); }
      };
      $('#geo').onclick = () => {
        if (!navigator.geolocation) return toast('Géolocalisation indisponible');
        toast('Recherche de votre position…');
        navigator.geolocation.getCurrentPosition((p) => {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          store.set('custom', { name: `Ma position (${p.coords.latitude.toFixed(2)}°, ${p.coords.longitude.toFixed(2)}°)`, lat: p.coords.latitude, lon: p.coords.longitude, tz });
          store.set('city', 'custom'); toast('Position enregistrée sur cet appareil'); draw();
        }, () => toast('Position refusée ou indisponible'), { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
      };
      el.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => {
        const on = togglePrayer(b.dataset.p, dayKey(new Date(), currentPlace().tz)); on && sfx.ok(); draw();
      }));
    }
    draw(); iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  },
};
