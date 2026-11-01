import { SURAHS, loadSurah, buildIndex, searchIndex, toArabicDigits } from '../core/quran.js';
import { store } from '../core/store.js';
import { icon, starNum } from '../core/icons.js';
import { esc, normLatin, normAr } from '../core/dom.js';

const surahItem = (s) => `
  <a class="surah-item tilt" href="#/coran/${s.id}" data-s="${s.id}">
    ${starNum(s.id)}
    <span class="names"><b>${esc(s.tr)}</b><small>${esc(s.fr)} · ${s.n} versets · ${s.type === 'M' ? 'Mecquoise' : 'Médinoise'}</small></span>
    <span class="arn ar" lang="ar">${s.ar}</span>
  </a>`;

export default {
  title: 'Coran',
  mount(el) {
    let tab = 'sourates';
    const last = store.get('lastRead');
    const lastS = last && SURAHS[last.s - 1];
    el.innerHTML = `
      <div class="page-head"><div class="eyebrow">القرآن الكريم</div><h1>Le Coran <span class="ar" lang="ar">القرآن</span></h1>
        <p>Texte ʿuthmānî en arabe, traduction française de Muhammad Hamidullah et phonétique. Hors-ligne, sans compte.</p></div>

      <div class="card resume tilt">
        <div class="book3d" aria-hidden="true"><div class="f front"><span>قرآن</span></div><div class="f back"></div><div class="f spine"></div><div class="f pages"></div><div class="f top"></div></div>
        <div class="info">
          <div class="eyebrow">${lastS ? 'Reprendre la lecture' : 'Commencer'}</div>
          <h3 style="font-size:1.7rem;margin:4px 0">${lastS ? `${esc(lastS.tr)} · verset ${last.v}` : 'Al-Fatiha — L’ouverture'}</h3>
          <p class="muted" style="margin:0 0 10px">${lastS ? esc(lastS.fr) : 'La sourate qui ouvre le Livre et que le musulman récite dans chaque prière.'}</p>
          <a class="btn gold" href="#/coran/${lastS ? last.s + '?v=' + last.v : 1}">${icon('book')} ${lastS ? 'Continuer' : 'Lire'}</a>
        </div>
      </div>

      <div class="row spread" style="margin:22px 0 12px">
        <div class="seg" role="tablist">
          <button role="tab" aria-pressed="true" data-t="sourates">Sourates</button>
          <button role="tab" aria-pressed="false" data-t="juz">Juz’</button>
          <button role="tab" aria-pressed="false" data-t="favoris">Favoris</button>
        </div>
      </div>
      <div class="row" style="gap:10px;margin-bottom:14px">
        <div style="flex:1;min-width:200px;position:relative"><input type="search" id="q" placeholder="Nom d’une sourate, numéro… ou mot à chercher dans le Coran" aria-label="Rechercher"></div>
        <button class="btn" id="deep">${icon('search')} Dans les versets</button>
      </div>
      <div id="out"></div>`;

    const out = el.querySelector('#out'), q = el.querySelector('#q');
    const draw = () => {
      const term = q.value.trim();
      if (tab === 'favoris') return drawFavs();
      if (tab === 'juz') return drawJuz();
      let list = SURAHS;
      if (term) {
        const t = normLatin(term), a = normAr(term);
        list = SURAHS.filter((s) => String(s.id) === term || normLatin(s.tr).includes(t) || normLatin(s.fr).includes(t) || normAr(s.ar).includes(a));
      }
      out.innerHTML = list.length ? `<div class="grid g-surah">${list.map(surahItem).join('')}</div>` : `<div class="empty">Aucune sourate ne correspond. Essayez « Dans les versets » pour chercher dans le texte.</div>`;
    };
    function drawJuz() {
      const starts = [[1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41], [9, 93], [11, 6], [12, 53], [15, 2], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56], [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1]];
      out.innerHTML = `<div class="grid g4">${starts.map(([s, v], i) => `<a class="shortcut tilt" style="min-height:96px" href="#/coran/${s}?v=${v}"><b>Juz’ ${i + 1}</b><small>${esc(SURAHS[s - 1].tr)} ${s}:${v}</small></a>`).join('')}</div>`;
    }
    async function drawFavs() {
      const bm = store.get('bookmarks');
      if (!bm.length) { out.innerHTML = `<div class="empty">${icon('bookmark')}<p>Aucun favori pour l’instant.<br>Touchez l’icône marque-page sous un verset pour le retrouver ici.</p></div>`; return; }
      out.innerHTML = '<div class="empty">Chargement…</div>';
      const rows = await Promise.all(bm.map(async ({ s, v }) => { const t = await loadSurah(s); return { s, v, ar: t[v - 1][0], fr: t[v - 1][1] }; }));
      out.innerHTML = rows.map((r) => `<a class="hit tilt" href="#/coran/${r.s}?v=${r.v}"><div class="ar" lang="ar">${esc(r.ar)}</div><div>${esc(r.fr)}</div><small>${esc(SURAHS[r.s - 1].tr)} · ${r.s}:${r.v}</small></a>`).join('');
    }
    el.querySelector('.seg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t;
      el.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', x === b)); draw();
    });
    q.addEventListener('input', () => { if (tab !== 'sourates') { tab = 'sourates'; el.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', x.dataset.t === 'sourates')); } draw(); });
    el.querySelector('#deep').onclick = async () => {
      const term = q.value.trim(); if (term.length < 2) { q.focus(); return; }
      out.innerHTML = `<div class="card"><div>Préparation de la recherche (première fois seulement)…</div><div class="progress" style="margin-top:10px"><i id="pg" style="width:0"></i></div></div>`;
      try { await buildIndex((p) => { const g = out.querySelector('#pg'); if (g) g.style.width = p * 100 + '%'; }); } catch { out.innerHTML = '<div class="empty">Impossible de charger le texte du Coran.</div>'; return; }
      const res = searchIndex(term);
      out.innerHTML = res.length
        ? `<p class="muted">${res.length >= 60 ? '60 premiers résultats' : res.length + ' résultat' + (res.length > 1 ? 's' : '')} pour « ${esc(term)} »</p>` + res.map((r) => `<a class="hit tilt" href="#/coran/${r.s}?v=${r.v}"><div class="ar" lang="ar">${esc(r.ar)}</div><div>${esc(r.fr)}</div><small>${esc(SURAHS[r.s - 1].tr)} · ${r.s}:${r.v}</small></a>`).join('')
        : `<div class="empty">Aucun verset trouvé pour « ${esc(term)} ».</div>`;
    };
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !/^\d+$/.test(q.value.trim()) && !out.querySelector('.surah-item')) el.querySelector('#deep').click(); });
    draw();
  },
};
