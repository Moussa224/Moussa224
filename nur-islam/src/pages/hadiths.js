import { HADITHS } from '../content/hadith.js';
import { icon } from '../core/icons.js';
import { esc, copyText, shareText, normLatin } from '../core/dom.js';

const first = (s, n = 130) => (s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + '…' : s);
// retire l'introduction « D'après X (qu'Allah l'agrée) : » pour l'aperçu
const gist = (fr) => first(fr.replace(/^[^:]*:\s*/, '').replace(/^«\s*/, '« '), 150);

export default {
  title: 'Hadiths',
  mount(el, params) {
    const n = params.n ? Math.min(42, Math.max(1, +params.n)) : 0;
    if (n) return detail(el, n);
    el.innerHTML = `
      <div class="page-head"><div class="eyebrow">Arba‘ûn an-Nawawiyya</div><h1>Les 40 hadiths d'an-Nawawî <span class="ar" lang="ar">الأربعون النووية</span></h1>
        <p>Un recueil de référence de l'imam an-Nawawî (m. 676 H), que les musulmans apprennent par cœur : 42 hadiths fondamentaux, de la foi aux relations humaines.</p></div>
      <input type="search" id="q" placeholder="Chercher un mot (ex. intention, pardon, voisin…)" style="margin-bottom:14px">
      <div id="list" class="grid g2"></div>
      <p class="note">Texte arabe : jeu de données public « Nawawi 40 Hadith ». Traduction française du sens : Nûr. Les degrés d'authenticité sont ceux indiqués par an-Nawawî ; en cas de doute, référez-vous à un savant.</p>`;
    const list = el.querySelector('#list'), q = el.querySelector('#q');
    const draw = () => {
      const t = normLatin(q.value);
      const rows = HADITHS.filter((h) => !t || normLatin(h.fr).includes(t) || String(h.n) === t);
      list.innerHTML = rows.length ? rows.map((h) => `<a class="card tilt" href="#/hadiths/${h.n}" style="display:block"><div class="row spread"><span class="eyebrow">Hadith n°${h.n}</span><span class="muted" style="font-size:.74rem">${esc(h.src.split(' — ')[0])}</span></div><p style="font-family:var(--serif);font-size:1.22rem;margin:8px 0 0;color:var(--ink-2)">${esc(gist(h.fr))}</p></a>`).join('') : '<div class="empty">Aucun hadith ne correspond.</div>';
    };
    q.oninput = draw; draw();
  },
};

function detail(el, n) {
  const h = HADITHS[n - 1];
  el.innerHTML = `
    <a class="btn sm ghost" href="#/hadiths" style="margin-top:6px">${icon('back')} Les 40 hadiths</a>
    <div class="page-head"><div class="eyebrow">Hadith n°${n} sur 42</div></div>
    <article class="card verse-card" style="padding:26px 22px">
      <div class="ar" lang="ar" style="font-size:calc(var(--ar-size) * .85);line-height:2.15;text-align:right;color:var(--ink)">${esc(h.ar)}</div>
      <div class="divider"></div>
      <p style="font-family:var(--serif);font-size:1.4rem;line-height:1.5;margin:0">${esc(h.fr)}</p>
      ${h.note ? `<p class="note">${esc(h.note)}</p>` : ''}
      <p style="font-size:.84rem;color:var(--em);margin:14px 0 0">Rapporté par : ${esc(h.src)}</p>
      <div class="row" style="margin-top:14px"><button class="btn" id="cp">${icon('copy')} Copier</button><button class="btn" id="sh">${icon('share')} Partager</button></div>
    </article>
    <div class="row spread" style="margin-top:20px">
      ${n > 1 ? `<a class="btn" href="#/hadiths/${n - 1}">${icon('back')} N°${n - 1}</a>` : '<span></span>'}
      ${n < 42 ? `<a class="btn gold" href="#/hadiths/${n + 1}">N°${n + 1} ${icon('next')}</a>` : '<span></span>'}
    </div>`;
  const txt = `${h.ar}\n\n${h.fr}\n— ${h.src} (Hadith n°${n} d'an-Nawawî)`;
  el.querySelector('#cp').onclick = () => copyText(txt);
  el.querySelector('#sh').onclick = () => shareText(`Hadith n°${n}`, txt);
}
