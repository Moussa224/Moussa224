import { PROPHETS, OTHER_STORIES } from '../content/prophets.js';
import { SURAHS } from '../core/quran.js';
import { icon } from '../core/icons.js';
import { esc, normLatin } from '../core/dom.js';

const refLink = (r) => { const m = /^(\d+):(\d+)/.exec(r); return m ? `#/coran/${m[1]}?v=${m[2]}` : '#/coran'; };
const card = (p, i, kind) => `<a class="prophet-card tilt" href="#/prophetes/${p.id}"><span class="no">${kind === 'p' ? i + 1 : ''}</span><span class="sym pop">${p.sym}</span><b class="pop2">${esc(p.n)}</b><span class="ar" lang="ar">${p.ar}</span><small>${esc(p.epithet)}</small></a>`;

export default {
  title: 'Les prophètes',
  mount(el, params) {
    const all = [...PROPHETS, ...OTHER_STORIES];
    if (params.id) return detail(el, params.id, all);
    el.innerHTML = `
      <div class="page-head"><div class="eyebrow">Qasas al-Anbiyâ'</div><h1>Les prophètes <span class="ar" lang="ar">قصص الأنبياء</span></h1>
        <p>Les récits des 25 prophètes cités nommément dans le Coran, ordonnés approximativement de la plus ancienne à la plus récente époque, puis d'autres récits coraniques. Chaque récit renvoie aux versets.</p></div>
      <input type="search" id="q" placeholder="Chercher un prophète ou un récit" style="margin-bottom:14px">
      <div id="out"></div>
      <p class="note">Que la paix et les bénédictions d'Allah soient sur tous Ses prophètes. Nous avons volontairement écarté les récits sans fondement authentique.</p>`;
    const out = el.querySelector('#out');
    const draw = () => {
      const t = normLatin(el.querySelector('#q').value);
      const f = (p) => !t || normLatin(p.n).includes(t) || normLatin(p.epithet).includes(t) || normLatin(p.id).includes(t);
      const a = PROPHETS.filter(f), b = OTHER_STORIES.filter(f);
      out.innerHTML = (a.length ? `<div class="grid g3">${a.map((p) => card(p, PROPHETS.indexOf(p), 'p')).join('')}</div>` : '') +
        (b.length ? `<div class="section-title"><h2>Autres récits du Coran</h2></div><div class="grid g3">${b.map((p) => card(p, 0, 'o')).join('')}</div>` : '') +
        (!a.length && !b.length ? '<div class="empty">Aucun résultat.</div>' : '');
    };
    el.querySelector('#q').oninput = draw; draw();
  },
};

function detail(el, id, all) {
  const i = all.findIndex((p) => p.id === id);
  const p = all[i];
  if (!p) { el.innerHTML = '<div class="card empty"><h3>Récit introuvable</h3><a class="btn" href="#/prophetes">Retour</a></div>'; return; }
  const prev = all[i - 1], next = all[i + 1];
  el.innerHTML = `
    <a class="btn sm ghost" href="#/prophetes" style="margin-top:6px">${icon('back')} Tous les récits</a>
    <header class="reader-head" style="perspective:900px">
      <div class="coin" aria-hidden="true">${p.sym}</div>
      <div class="arname" lang="ar" style="font-size:clamp(2.4rem,7vw,3.6rem)">${p.ar}</div>
      <div class="frname">${esc(p.n)}</div>
      <div class="meta">${esc(p.epithet)}${p.peuple ? ' · ' + esc(p.peuple) : ''}</div>
    </header>
    <article class="story card" style="margin-top:16px">
      ${p.story.map((s) => `<p>${esc(s)}</p>`).join('')}
      <h2>Ce que l'on retient</h2>
      <ul class="lessons">${p.lessons.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <h2>Dans le Coran</h2>
      <div class="refs">${p.refs.map((r) => `<a class="ref-chip" href="${refLink(r)}">${r}</a>`).join('')}</div>
    </article>
    <div class="row spread" style="margin-top:20px">
      ${prev ? `<a class="btn" href="#/prophetes/${prev.id}">${icon('back')} ${esc(prev.n)}</a>` : '<span></span>'}
      ${next ? `<a class="btn gold" href="#/prophetes/${next.id}">${esc(next.n)} ${icon('next')}</a>` : '<span></span>'}
    </div>`;
}
