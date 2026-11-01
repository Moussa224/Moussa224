import { SURAHS, loadSurah, juzOf, BASMALA, hasBismillahHeader, toArabicDigits } from '../core/quran.js';
import { store } from '../core/store.js';
import { createPlayer, ayahUrl, RECITERS } from '../core/audio.js';
import { icon } from '../core/icons.js';
import { esc, toast, copyText, shareText } from '../core/dom.js';
import { go } from '../core/router.js';

export default {
  title: 'Coran',
  async mount(el, params, query) {
    const n = Math.min(114, Math.max(1, parseInt(params.n, 10) || 1));
    const meta = SURAHS[n - 1];
    const startV = Math.max(1, parseInt(query.v, 10) || 1);

    // couverture de livre qui s'ouvre
    const cover = document.createElement('div');
    cover.className = 'book-cover';
    cover.innerHTML = `<div class="cover"><div><div class="t" lang="ar">${meta.ar}</div><div class="s">${esc(meta.tr)}</div></div></div>`;
    document.body.append(cover); setTimeout(() => cover.remove(), 1250);

    el.innerHTML = '<div class="empty">Chargement de la sourate…</div>';
    let verses;
    try { verses = await loadSurah(n); } catch { el.innerHTML = '<div class="card empty"><h3>Sourate indisponible</h3><p>Le fichier de cette sourate n’a pas pu être chargé.</p><a class="btn" href="#/coran">Retour</a></div>'; return; }

    const s = store;
    const bookmarked = (v) => s.get('bookmarks').some((b) => b.s === n && b.v === v);
    el.innerHTML = `
      <a class="btn sm ghost" href="#/coran" style="margin-top:6px">${icon('back')} Sourates</a>
      <header class="reader-head">
        <div class="eyebrow">Sourate ${n}</div>
        <div class="arname" lang="ar">${meta.ar}</div>
        <div class="frname">${esc(meta.tr)}${meta.fr.toLowerCase() === meta.tr.toLowerCase() ? '' : ' · ' + esc(meta.fr)}</div>
        <div class="meta">${meta.type === 'M' ? 'Mecquoise' : 'Médinoise'} · ${meta.n} versets · Juz’ ${juzOf(n, 1)}</div>
      </header>

      <div class="reader-controls">
        <label><input type="checkbox" id="optFr" ${s.get('fr') ? 'checked' : ''}> Français</label>
        <label><input type="checkbox" id="optTr" ${s.get('tr') ? 'checked' : ''}> Phonétique</label>
        <label>Taille <input type="range" id="optSz" min="24" max="56" step="2" value="${s.get('arSize')}" aria-label="Taille du texte arabe"></label>
        <label style="margin-left:auto"><select id="optRec" aria-label="Récitateur" style="padding:8px 10px;border-radius:12px;width:auto">${RECITERS.map((r) => `<option value="${r.id}" ${s.get('reciter') === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
        <button class="btn sm gold" id="playAll">${icon('play')} Écouter</button>
      </div>

      ${hasBismillahHeader(n) ? `<div class="bismillah" lang="ar">${BASMALA}</div>` : ''}
      <div id="ayat">${verses.map(([ar, fr, tr], i) => {
        const v = i + 1;
        return `<article class="ayah" id="v${v}" data-v="${v}">
          <div class="ar" lang="ar">${esc(ar)}<span class="vnum">${toArabicDigits(v)}</span></div>
          <div class="tr" ${s.get('tr') ? '' : 'hidden'}>${esc(tr)}</div>
          <div class="fr" ${s.get('fr') ? '' : 'hidden'}>${esc(fr)}</div>
          <div class="tools">
            <button class="btn sm ghost" data-a="play" aria-label="Écouter le verset ${v}">${icon('play')}</button>
            <button class="btn sm ghost" data-a="bm" aria-label="Favori" aria-pressed="${bookmarked(v)}">${icon('bookmark')}</button>
            <button class="btn sm ghost" data-a="copy" aria-label="Copier">${icon('copy')}</button>
            <button class="btn sm ghost" data-a="share" aria-label="Partager">${icon('share')}</button>
            <span class="muted" style="font-size:.78rem;align-self:center">${n}:${v}</span>
          </div></article>`;
      }).join('')}</div>

      <div class="row spread" style="margin-top:30px">
        ${n > 1 ? `<a class="btn" href="#/coran/${n - 1}">${icon('back')} ${esc(SURAHS[n - 2].tr)}</a>` : '<span></span>'}
        ${n < 114 ? `<a class="btn gold" href="#/coran/${n + 1}">${esc(SURAHS[n].tr)} ${icon('next')}</a>` : '<span></span>'}
      </div>
      <div id="playerBar"></div>`;

    const $ = (q) => el.querySelector(q);
    const mark = (v) => el.querySelectorAll('[data-a=bm]').forEach((b) => { const k = +b.closest('.ayah').dataset.v; b.classList.toggle('em', bookmarked(k)); });
    mark();
    const fmtRef = (v) => `${verses[v - 1][0]}\n« ${verses[v - 1][1]} »\n— Coran ${n}:${v} (${meta.tr})`;

    // ── réglages ──
    $('#optFr').onchange = (e) => { s.set('fr', e.target.checked); el.querySelectorAll('.ayah .fr').forEach((x) => (x.hidden = !e.target.checked)); };
    $('#optTr').onchange = (e) => { s.set('tr', e.target.checked); el.querySelectorAll('.ayah .tr').forEach((x) => (x.hidden = !e.target.checked)); };
    $('#optSz').oninput = (e) => s.set('arSize', +e.target.value);
    $('#optRec').onchange = (e) => s.set('reciter', e.target.value);

    // ── audio ──
    let activeV = 0;
    const bar = $('#playerBar');
    const player = createPlayer({
      onChange: ({ item, playing }) => {
        el.querySelectorAll('.ayah.playing').forEach((x) => x.classList.remove('playing'));
        if (item) {
          activeV = item.v; const a = el.querySelector(`#v${item.v}`);
          a && a.classList.add('playing'); a && a.scrollIntoView({ block: 'center', behavior: 'smooth' });
          bar.innerHTML = `<div class="player"><button class="btn icon sm ghost" id="pPrev" aria-label="Précédent">${icon('skipb')}</button><button class="btn icon gold" id="pTog" aria-label="Lecture / pause">${icon(playing ? 'pause' : 'play')}</button><button class="btn icon sm ghost" id="pNext" aria-label="Suivant">${icon('skipf')}</button><div style="flex:1;min-width:0"><b style="display:block;font-size:.9rem">${esc(meta.tr)} · ${item.v}</b><small class="muted">${esc((RECITERS.find((r) => r.id === s.get('reciter')) || {}).name || '')}</small></div><button class="btn icon sm ghost" id="pStop" aria-label="Arrêter">${icon('x')}</button></div>`;
          bar.querySelector('#pTog').onclick = () => player.toggle(); bar.querySelector('#pNext').onclick = () => player.next(); bar.querySelector('#pPrev').onclick = () => player.prev(); bar.querySelector('#pStop').onclick = () => player.stop();
        } else bar.innerHTML = '';
      },
      onError: () => toast('Audio indisponible : une connexion Internet est nécessaire pour la récitation.', 3500),
    });
    const playFrom = (v) => player.load(verses.slice(v - 1).map((_, i) => ({ s: n, v: v + i, url: ayahUrl(n, v + i) })), 0);
    $('#playAll').onclick = () => playFrom(activeV || startV || 1);

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const v = +b.closest('.ayah').dataset.v, a = b.dataset.a;
      if (a === 'play') playFrom(v);
      if (a === 'copy') copyText(fmtRef(v));
      if (a === 'share') shareText(`Coran ${n}:${v}`, fmtRef(v));
      if (a === 'bm') {
        const list = s.get('bookmarks').slice(); const i = list.findIndex((x) => x.s === n && x.v === v);
        if (i >= 0) { list.splice(i, 1); toast('Favori retiré'); } else { list.unshift({ s: n, v }); toast('Ajouté aux favoris'); }
        s.set('bookmarks', list); mark();
      }
    });

    // ── repère de lecture ──
    const target = el.querySelector(`#v${startV}`);
    if (startV > 1 && target) { setTimeout(() => { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); target.classList.add('mark'); }, 900); }
    let saveT;
    const io = new IntersectionObserver((es) => {
      for (const en of es) if (en.isIntersecting && en.boundingClientRect.top < innerHeight * 0.55) {
        clearTimeout(saveT); const v = +en.target.dataset.v; saveT = setTimeout(() => s.set('lastRead', { s: n, v }), 700);
      }
    }, { threshold: [0.5] });
    el.querySelectorAll('.ayah').forEach((a) => io.observe(a));

    return () => { io.disconnect(); player.stop(); cover.remove(); };
  },
};
