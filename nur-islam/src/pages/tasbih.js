import { createStage } from '../scene/engine.js';
import { beadsScene, BEAD_STYLES } from '../scene/beads.js';
import { DHIKR } from '../content/dhikr.js';
import { store } from '../core/store.js';
import { addDhikr, dhikrToday } from '../core/stats.js';
import { currentPlace } from '../core/prayer.js';
import { sfx } from '../core/audio.js';
import { icon } from '../core/icons.js';
import { esc, toast, vibrate } from '../core/dom.js';

export default {
  title: 'Tasbih',
  mount(el) {
    const tz = currentPlace().tz;
    const st = () => store.get('tasbih');
    const cur = () => DHIKR.find((d) => d.id === st().preset) || DHIKR[0];
    const TARGETS = [33, 99, 100, 0];

    el.innerHTML = `
      <div class="page-head"><div class="eyebrow">Dhikr · Souvenir d'Allah</div><h1>Tasbih 3D <span class="ar" lang="ar">تسبيح</span></h1>
        <p>« Souvenez-vous de Moi, Je Me souviendrai de vous » (2:152). Touchez le chapelet, la touche Espace ou le bouton : une perle avance à chaque pression.</p></div>
      <section class="stage tasbih-stage" id="stage" aria-label="Chapelet 3D">
        <div class="overlay">
          <div class="dhikr-name"><div class="ar" lang="ar" id="dAr"></div><div id="dTr" style="color:#fff;opacity:.85"></div></div>
          <div class="row spread"><span class="hint">Touchez le chapelet · Espace</span>
            <div class="chips" id="styles">${Object.keys(BEAD_STYLES).map((k) => `<button class="chip ${(st().style || 'ambre') === k ? 'on' : ''}" data-style="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></div>
        </div>
      </section>

      <div class="grid g2" style="margin-top:16px;align-items:start">
        <div class="card" style="text-align:center">
          <div class="count-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="var(--card-2)" stroke-width="5"/><circle id="arc" cx="50" cy="50" r="45" fill="none" stroke="url(#g)" stroke-width="5" stroke-linecap="round" stroke-dasharray="282.7" stroke-dashoffset="282.7" style="transition:stroke-dashoffset .35s"/><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#2dd4a7"/><stop offset="1" stop-color="#e9c46a"/></linearGradient></defs></svg>
            <div class="num"><div><span id="cnt">0</span><small id="tgt"></small></div></div><div class="burst" id="burst"></div></div>
          <div class="row" style="justify-content:center;margin-top:14px">
            <button class="btn gold" id="plus" style="min-width:140px;padding:14px 28px;font-size:1.1rem">${icon('plus')} Compter</button>
            <button class="btn icon" id="undo" aria-label="Retirer un">−</button>
            <button class="btn icon" id="reset" aria-label="Remettre à zéro">${icon('refresh')}</button>
          </div>
          <p class="muted" style="font-size:.82rem;margin:12px 0 0"><span id="loops"></span></p>
        </div>
        <div class="card">
          <div class="eyebrow">Formule</div>
          <div class="chips" id="presets" style="margin:10px 0">${DHIKR.map((d) => `<button class="chip ${d.id === cur().id ? 'on' : ''}" data-d="${d.id}">${esc(d.tr)}</button>`).join('')}</div>
          <div class="eyebrow" style="margin-top:12px">Objectif</div>
          <div class="chips" id="targets" style="margin:10px 0">${TARGETS.map((t) => `<button class="chip" data-t="${t}">${t ? t : '∞ libre'}</button>`).join('')}</div>
          <div class="divider"></div>
          <div id="meaning"></div>
          <div class="row" style="margin-top:12px;gap:18px">
            <label class="row" style="gap:8px"><span class="switch"><input type="checkbox" id="sSound" ${store.get('sound') ? 'checked' : ''}></span>Son</label>
            <label class="row" style="gap:8px"><span class="switch"><input type="checkbox" id="sHap" ${store.get('haptics') ? 'checked' : ''}></span>Vibration</label>
          </div>
          <p class="muted" style="font-size:.82rem;margin-top:10px">Aujourd'hui : <b id="today" style="color:var(--gold)"></b> dhikr · total : <b id="total" style="color:var(--gold)"></b></p>
        </div>
      </div>`;

    const $ = (s) => el.querySelector(s);
    const stageEl = $('#stage');
    let stage;
    const target = () => (st().target === undefined ? cur().target : st().target);

    function paint() {
      const d = cur(), s = st(), tg = target();
      $('#dAr').textContent = d.ar; $('#dTr').textContent = `${d.tr} — ${d.fr}`;
      $('#cnt').textContent = s.count; $('#tgt').textContent = tg ? `sur ${tg}` : 'compteur libre';
      $('#arc').style.strokeDashoffset = tg ? 282.7 * (1 - Math.min(1, s.count / tg)) : 282.7 * (1 - ((s.count % 33) / 33));
      $('#loops').textContent = s.loops ? `${s.loops} série${s.loops > 1 ? 's' : ''} terminée${s.loops > 1 ? 's' : ''} avec cette formule` : '';
      $('#meaning').innerHTML = `<p style="margin:0 0 6px;font-family:var(--serif);font-size:1.25rem">${esc(d.fr)}</p><p class="muted" style="font-size:.88rem;margin:0">${esc(d.virtue)}</p><p style="font-size:.78rem;color:var(--em);margin:8px 0 0">Source : ${esc(d.src)}</p>`;
      el.querySelectorAll('[data-d]').forEach((b) => b.classList.toggle('on', b.dataset.d === d.id));
      el.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', +b.dataset.t === tg));
      $('#today').textContent = dhikrToday(tz); $('#total').textContent = s.total;
    }

    function burst() {
      const box = $('#burst'); if (!box) return;
      for (let i = 0; i < 16; i++) { const p = document.createElement('i'); const a = (i / 16) * 6.283, r = 70 + Math.random() * 60; p.style.setProperty('--x', Math.cos(a) * r + 'px'); p.style.setProperty('--y', Math.sin(a) * r + 'px'); box.append(p); setTimeout(() => p.remove(), 1100); }
    }

    function tap() {
      const s = { ...st() }, tg = target();
      s.count += 1; s.total += 1;
      addDhikr(1, tz);
      stage && stage.mod.tap();
      sfx.bead(); store.get('haptics') && vibrate(10);
      if (tg && s.count >= tg) {
        s.count = 0; s.loops += 1; sfx.milestone(); store.get('haptics') && vibrate([30, 60, 30]); burst();
        toast('Objectif atteint — qu’Allah accepte votre dhikr ✨', 3200);
      } else if (!tg && s.count % 33 === 0) { sfx.milestone(); burst(); }
      store.set('tasbih', s); paint();
    }

    stage = createStage(stageEl, (ctx) => beadsScene(ctx, { style: st().style || 'ambre', offset: st().count }), { fov: 40 });
    if (stage) { stage.mod.onTap = tap; stage.mod.setStyle(st().style || 'ambre'); }
    else stageEl.addEventListener('click', tap);

    $('#plus').onclick = tap;
    $('#undo').onclick = () => { const s = { ...st() }; if (s.count > 0) { s.count--; s.total = Math.max(0, s.total - 1); store.set('tasbih', s); stage && stage.mod.snap(s.count); paint(); } };
    $('#reset').onclick = () => { store.set('tasbih', { ...st(), count: 0, loops: 0 }); stage && stage.mod.snap(0); paint(); toast('Compteur remis à zéro'); };
    $('#presets').onclick = (e) => { const b = e.target.closest('[data-d]'); if (!b) return; const d = DHIKR.find((x) => x.id === b.dataset.d); store.set('tasbih', { ...st(), preset: d.id, target: d.target, count: 0, loops: 0 }); stage && stage.mod.snap(0); paint(); };
    $('#targets').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; store.set('tasbih', { ...st(), target: +b.dataset.t, count: 0, loops: 0 }); stage && stage.mod.snap(0); paint(); };
    $('#styles').onclick = (e) => { const b = e.target.closest('[data-style]'); if (!b) return; store.set('tasbih', { ...st(), style: b.dataset.style }); stage && stage.mod.setStyle(b.dataset.style); el.querySelectorAll('[data-style]').forEach((x) => x.classList.toggle('on', x === b)); };
    $('#sSound').onchange = (e) => store.set('sound', e.target.checked);
    $('#sHap').onchange = (e) => store.set('haptics', e.target.checked);
    const key = (e) => { if ((e.code === 'Space' || e.code === 'Enter') && document.activeElement === document.body) { e.preventDefault(); tap(); } };
    document.addEventListener('keydown', key);
    paint();
    return () => { document.removeEventListener('keydown', key); stage && stage.dispose(); };
  },
};
