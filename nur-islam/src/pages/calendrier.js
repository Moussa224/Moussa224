import { createStage, THREE } from '../scene/engine.js';
import { makeMoon } from '../scene/moon.js';
import { glowTexture } from '../scene/sky.js';
import { currentPlace, hijriNow, civilInTZ, timesFor } from '../core/prayer.js';
import { MONTHS, MONTHS_AR, DAYS_FR, EVENTS, hijriFromCivil, nextHijriOccurrence, moonPhase, civilToUTC } from '../core/hijri.js';
import { store } from '../core/store.js';
import { esc, pad } from '../core/dom.js';
import { icon } from '../core/icons.js';

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default {
  title: 'Calendrier hégirien',
  mount(el) {
    const place = currentPlace(), tz = place.tz;
    const now = new Date();
    const adj = store.get('hijriAdjust');
    const hn = hijriNow(place, now);
    let view = { y: hn.y, m: hn.m }; // mois hégirien affiché

    // premier jour civil d'un mois hégirien (recherche autour de la date actuelle)
    function firstOf(y, m) {
      const c = civilInTZ(now, tz);
      let t = Date.UTC(c.y, c.m - 1, c.d, 12);
      for (let i = 0; i < 800; i++) {
        const d = new Date(t); const h = hijriFromCivil(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), adj);
        const diff = (h.y - y) * 354 + (h.m - m) * 29.5 + (h.d - 1);
        if (h.y === y && h.m === m && h.d === 1) return d;
        t -= Math.sign(diff || 1) * Math.max(1, Math.min(20, Math.abs(Math.round(diff)))) * 86400000;
        if (Math.abs(diff) < 1 && !(h.y === y && h.m === m && h.d === 1)) t -= Math.sign(diff || 1) * 86400000;
      }
      return null;
    }

    const mp = moonPhase(now);
    el.innerHTML = `
      <div class="page-head"><div class="eyebrow">At-taqwîm al-hijrî</div><h1>Calendrier hégirien <span class="ar" lang="ar">التقويم الهجري</span></h1>
        <p>Calendrier lunaire de l'Hégire (Umm al-Qura), phases de la lune et grandes dates de l'année.</p></div>
      <div class="grid g2" style="align-items:stretch">
        <section class="stage moon-stage" id="ms"><div class="overlay"><div class="chips"><span class="chip">${esc(mp.name)} · ${Math.round(mp.illum * 100)} % éclairée</span></div><span class="hint">Âge de la lune : ${mp.age.toFixed(1).replace('.', ',')} jours</span></div></section>
        <div class="card"><div class="eyebrow">Aujourd'hui</div><div class="bignum" style="margin:6px 0 2px">${hn.d} ${MONTHS[hn.m - 1]} ${hn.y}</div><div style="font-family:var(--ar-ui);font-size:1.6rem;color:var(--gold)" lang="ar">${hn.d} ${MONTHS_AR[hn.m - 1]} ${hn.y}</div>
          <p class="muted" style="margin:10px 0 0">${new Intl.DateTimeFormat('fr-FR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)}</p>
          ${hn.afterMaghrib ? '<p class="note">Le jour hégirien commence au coucher du soleil : la date affichée est déjà celle de demain.</p>' : ''}
          <div id="next" style="margin-top:14px"></div></div>
      </div>

      <div class="section-title"><h2 id="mTitle"></h2><div class="row"><button class="btn icon sm" id="mp" aria-label="Mois précédent">${icon('back')}</button><button class="btn icon sm" id="mn" aria-label="Mois suivant">${icon('next')}</button></div></div>
      <div class="card"><div class="cal-grid" id="grid"></div>
        <p class="muted" style="font-size:.78rem;margin:12px 0 0"><span style="color:var(--sky)">■</span> jours blancs (13, 14, 15) : jeûne recommandé · <span style="color:var(--em)">●</span> date importante · Lundi et jeudi : jeûne recommandé</p></div>

      <div class="section-title"><h2>Prochaines dates importantes</h2></div>
      <div class="grid" id="events"></div>
      <p class="note">Les dates sont calculées (calendrier Umm al-Qura). Le début des mois dépend de l'observation du croissant : une différence d'un jour avec votre autorité locale est normale, et réglable dans « Horaires de prière → Ajustement de la date hégirienne ».</p>`;

    const $ = (s) => el.querySelector(s);

    // ── lune 3D ──
    const stage = createStage($('#ms'), ({ scene, camera, input }) => {
      scene.add(new THREE.AmbientLight(0xffffff, 0.4));
      const moon = makeMoon({ radius: 1.55, glow: 2.8 }); moon.setPhase(mp.frac); moon.setGain(1.1); scene.add(moon.group);
      const stars = new THREE.Points((() => { const g = new THREE.BufferGeometry(); const p = new Float32Array(300 * 3); for (let i = 0; i < 300; i++) { p[i * 3] = (Math.random() - 0.5) * 18; p[i * 3 + 1] = (Math.random() - 0.5) * 10; p[i * 3 + 2] = -4 - Math.random() * 6; } g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g; })(), new THREE.PointsMaterial({ size: 0.05, color: 0xdde6ff, transparent: true, opacity: 0.8, depthWrite: false }));
      scene.add(stars);
      camera.position.set(0, 0, 6); camera.fov = 40; camera.updateProjectionMatrix();
      return { update(dt, t) { moon.face(camera); moon.group.position.set(input.x * 0.4, input.y * 0.25 + Math.sin(t * 0.5) * 0.05, 0); stars.rotation.z = t * 0.004; } };
    });

    // ── prochaines dates ──
    const c = civilInTZ(now, tz);
    const nexts = EVENTS.map((e) => ({ e, occ: nextHijriOccurrence(e.m, e.d, { y: c.y, m: c.m, d: c.d }, adj) })).filter((x) => x.occ).sort((a, b) => a.occ.days - b.occ.days);
    const fmtG = (o) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(o.y, o.m - 1, o.d, 12)));
    $('#events').innerHTML = nexts.map(({ e, occ }) => `
      <article class="event-row tilt"><div class="when"><b>${occ.days}</b>jour${occ.days > 1 ? 's' : ''}</div>
        <div style="flex:1"><div style="font-family:var(--serif);font-size:1.35rem;font-weight:600">${e.sym} ${esc(e.fr)} <span class="ar" lang="ar" style="color:var(--gold);font-family:var(--ar-ui);font-size:1.15rem">${e.ar}</span></div>
          <div class="muted" style="font-size:.8rem">${e.d} ${MONTHS[e.m - 1]} · ${fmtG(occ)}</div><p style="margin:6px 0 0;color:var(--ink-2);font-size:.92rem">${esc(e.desc)}</p></div></article>`).join('');
    const n0 = nexts[0];
    $('#next').innerHTML = n0 ? `<div class="eyebrow">Prochaine date</div><div style="font-family:var(--serif);font-size:1.4rem">${n0.e.sym} ${esc(n0.e.fr)}</div><div class="muted" style="font-size:.85rem">dans ${n0.occ.days} jour${n0.occ.days > 1 ? 's' : ''} · ${fmtG(n0.occ)}</div>` : '';

    // ── grille du mois ──
    function drawMonth() {
      const first = firstOf(view.y, view.m);
      $('#mTitle').innerHTML = `${MONTHS[view.m - 1]} ${view.y} <span class="ar" lang="ar" style="color:var(--gold);font-size:.8em">${MONTHS_AR[view.m - 1]}</span>`;
      if (!first) { $('#grid').innerHTML = '<div class="empty">Mois hors de portée.</div>'; return; }
      const days = []; let t = first.getTime();
      for (;;) { const d = new Date(t); const h = hijriFromCivil(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), adj); if (h.m !== view.m || h.y !== view.y) break; days.push({ d, h }); t += 86400000; if (days.length > 31) break; }
      const lead = (first.getUTCDay() + 6) % 7;
      const evs = new Set(EVENTS.filter((e) => e.m === view.m).map((e) => e.d));
      const todayKey = `${c.y}-${c.m}-${c.d}`;
      $('#grid').innerHTML = DOW.map((d) => `<div class="cal-dow">${d}</div>`).join('') + '<div class="cal-day blank"></div>'.repeat(lead) +
        days.map(({ d, h }) => {
          const k = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
          const white = h.d >= 13 && h.d <= 15;
          return `<div class="cal-day ${k === todayKey ? 'today' : ''} ${evs.has(h.d) ? 'event' : ''} ${white ? 'white' : ''}" title="${esc(fmtG({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }))}">${h.d}<small>${d.getUTCDate()}/${pad(d.getUTCMonth() + 1)}</small></div>`;
        }).join('');
    }
    $('#mp').onclick = () => { view = view.m === 1 ? { y: view.y - 1, m: 12 } : { y: view.y, m: view.m - 1 }; drawMonth(); };
    $('#mn').onclick = () => { view = view.m === 12 ? { y: view.y + 1, m: 1 } : { y: view.y, m: view.m + 1 }; drawMonth(); };
    drawMonth();
    return () => stage && stage.dispose();
  },
};
