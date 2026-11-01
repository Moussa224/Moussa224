import { NAMES } from '../content/names.js';
import { store } from '../core/store.js';
import { icon } from '../core/icons.js';
import { esc, copyText, normLatin, toast, clamp, reducedMotion } from '../core/dom.js';
import { civilInTZ, currentPlace } from '../core/prayer.js';
import { sfx } from '../core/audio.js';

export default {
  title: '99 Noms',
  mount(el, params) {
    const c = civilInTZ(new Date(), currentPlace().tz);
    let idx = params.n ? clamp((+params.n || 1) - 1, 0, 98) : Math.floor(Date.UTC(c.y, c.m - 1, c.d) / 86400000) % 99;
    let mode = 'flow';

    el.innerHTML = `
      <div class="page-head"><div class="eyebrow">Asma' Allah al-Husna</div><h1>Les 99 Noms d'Allah <span class="ar" lang="ar">الأسماء الحسنى</span></h1>
        <p>« À Allah appartiennent les plus beaux noms : invoquez-Le par ceux-ci. » (7:180)</p></div>
      <div class="row spread" style="margin-bottom:12px">
        <div class="seg"><button data-m="flow" aria-pressed="true">Carrousel 3D</button><button data-m="grid" aria-pressed="false">Tous les Noms</button></div>
        <div style="flex:1;min-width:180px;max-width:380px"><div class="row" style="gap:10px"><div class="progress" style="flex:1"><i id="prog"></i></div><span class="muted" style="font-size:.82rem;white-space:nowrap" id="progTxt"></span></div></div>
      </div>
      <div id="body"></div>`;
    const body = el.querySelector('#body');

    const learnedSet = () => new Set(store.get('learned'));
    function progress() { const n = store.get('learned').length; el.querySelector('#prog').style.width = (n / 99) * 100 + '%'; el.querySelector('#progTxt').textContent = `${n}/99 appris`; }

    function drawFlow() {
      body.innerHTML = `
        <div class="coverflow" id="cf" tabindex="0" aria-label="Carrousel des 99 Noms, flèches gauche et droite pour naviguer">
          ${NAMES.map((n, i) => `<div class="cf-card" data-i="${i}"><span class="no">${n.n}/99</span><div class="big" lang="ar">${n.ar}</div><div class="tl">${esc(n.tr)}</div><div class="mn">${esc(n.fr)}</div></div>`).join('')}
        </div>
        <div class="row" style="justify-content:center;gap:12px;margin:6px 0 14px"><button class="btn icon" id="prev" aria-label="Précédent">${icon('back')}</button><span class="muted" id="pos" style="min-width:70px;text-align:center"></span><button class="btn icon" id="next" aria-label="Suivant">${icon('next')}</button></div>
        <div class="card tilt" id="info"></div>`;
      const cards = [...body.querySelectorAll('.cf-card')];
      const place = () => {
        cards.forEach((cd, i) => {
          const d = i - idx, a = Math.abs(d), s = Math.sign(d);
          const x = a === 0 ? 0 : s * (150 + (a - 1) * 58);
          cd.style.transform = `translate3d(${x}px,0,${a === 0 ? 60 : -a * 110}px) rotateY(${-s * Math.min(58, a * 52)}deg) scale(${a === 0 ? 1 : 0.9})`;
          cd.style.opacity = a > 3 ? 0 : 1 - a * 0.22; cd.style.zIndex = 100 - a; cd.style.pointerEvents = a > 3 ? 'none' : 'auto';
          cd.style.filter = a === 0 ? 'none' : `brightness(${1 - a * 0.14})`;
        });
        const n = NAMES[idx], L = learnedSet().has(n.n);
        body.querySelector('#pos').textContent = `${n.n} / 99`;
        body.querySelector('#info').innerHTML = `
          <div class="row spread"><div><div class="eyebrow">Nom n°${n.n}</div><h3 style="font-size:2rem;margin:2px 0">${esc(n.tr)} <span class="ar" lang="ar" style="color:var(--gold);font-family:var(--ar-ui);font-size:1.7rem">${n.ar}</span></h3><div style="font-family:var(--serif);font-size:1.3rem;color:var(--ink-2)">${esc(n.fr)}</div></div>
            <div class="row"><button class="btn ${L ? 'em' : ''}" id="learn">${icon('check')} ${L ? 'Appris' : 'Marquer comme appris'}</button><button class="btn icon" id="cp" aria-label="Copier">${icon('copy')}</button></div></div>
          <p style="margin:12px 0 0;color:var(--ink-2)">${esc(n.ex)}</p>`;
        body.querySelector('#learn').onclick = () => {
          const set = learnedSet(); set.has(n.n) ? set.delete(n.n) : (set.add(n.n), sfx.ok());
          store.set('learned', [...set]); progress(); place();
          if (set.size === 99) toast('Mâ châ Allah ! Vous avez marqué les 99 Noms comme appris.', 4000);
        };
        body.querySelector('#cp').onclick = () => copyText(`${n.ar} — ${n.tr} : ${n.fr}\n${n.ex}`);
      };
      const go = (d) => { idx = clamp(idx + d, 0, 98); place(); };
      body.querySelector('#prev').onclick = () => go(-1); body.querySelector('#next').onclick = () => go(1);
      const cf = body.querySelector('#cf');
      cf.addEventListener('click', (e) => { const cd = e.target.closest('.cf-card'); if (cd && +cd.dataset.i !== idx) { idx = +cd.dataset.i; place(); } });
      cf.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); });
      cf.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20) { e.preventDefault(); go(Math.sign(e.deltaX)); } }, { passive: false });
      let sx = null, moved = 0;
      cf.addEventListener('pointerdown', (e) => { sx = e.clientX; moved = 0; });
      cf.addEventListener('pointermove', (e) => { if (sx == null) return; const d = e.clientX - sx; if (Math.abs(d) > 60) { go(d < 0 ? 1 : -1); sx = e.clientX; moved = 1; } });
      addEventListener('pointerup', () => (sx = null), { once: true });
      place();
    }

    function drawGrid(term = '') {
      const L = learnedSet(), t = normLatin(term);
      const list = NAMES.filter((n) => !t || normLatin(n.tr).includes(t) || normLatin(n.fr).includes(t) || String(n.n) === t);
      body.innerHTML = `<input type="search" id="gs" placeholder="Chercher un Nom (nom, sens ou numéro)" value="${esc(term)}" style="margin-bottom:14px"><div class="grid g4">${list.map((n) => `<div class="name-tile tilt ${L.has(n.n) ? 'learned' : ''}" data-n="${n.n}"><div class="a" lang="ar">${n.ar}</div><div class="t">${esc(n.tr)}</div><div class="m">${esc(n.fr)}</div></div>`).join('')}</div>`;
      const gs = body.querySelector('#gs'); gs.oninput = () => { drawGrid(gs.value); const g2 = body.querySelector('#gs'); g2.focus(); g2.setSelectionRange(g2.value.length, g2.value.length); };
      body.querySelectorAll('.name-tile').forEach((tl) => (tl.onclick = () => { idx = +tl.dataset.n - 1; setMode('flow'); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
    }
    function setMode(m) { mode = m; el.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.m === m)); m === 'flow' ? drawFlow() : drawGrid(); }
    el.querySelector('.seg').onclick = (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); };
    progress(); setMode('flow');
  },
};
