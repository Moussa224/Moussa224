import { DUAS, DUA_CATS } from '../content/duas.js';
import { loadSurah, SURAHS } from '../core/quran.js';
import { icon } from '../core/icons.js';
import { esc, copyText, shareText } from '../core/dom.js';

const arDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

export default {
  title: 'Invocations',
  async mount(el, params) {
    let cat = DUA_CATS.some((c) => c.id === params.c) ? params.c : (() => { const h = new Date().getHours(); return h < 11 ? 'matin-soir' : h >= 17 ? 'matin-soir' : 'apres-priere'; })();
    let showTr = true;
    el.innerHTML = `
      <div class="page-head"><div class="eyebrow">Adhkâr · Du‘â'</div><h1>Invocations <span class="ar" lang="ar">أذكار</span></h1>
        <p>Les invocations prophétiques et coraniques du quotidien, avec leur source. Les textes coraniques viennent directement du Coran embarqué.</p></div>
      <div class="steps" id="cats" role="tablist">${DUA_CATS.map((c) => `<button class="step-pill ${c.id === cat ? 'on' : ''}" role="tab" data-c="${c.id}">${c.i} ${c.t}</button>`).join('')}</div>
      <div class="row spread" style="margin:6px 0 12px"><span class="muted" id="catAr" style="font-family:var(--ar-ui);font-size:1.3rem;color:var(--gold)"></span><label class="row" style="gap:8px;font-size:.85rem"><span class="switch"><input type="checkbox" id="tgTr" checked></span>Phonétique</label></div>
      <div id="list" class="grid"></div>
      <p class="note">Les références (Boukhari, Mouslim, Abou Dâwoud, at-Tirmidhî…) indiquent où chaque texte est rapporté. Pour toute question de jurisprudence, consultez un savant qualifié.</p>`;
    const list = el.querySelector('#list');

    // texte coranique pour les entrées « ref »
    const cache = {};
    async function quranPart([s, v1, v2 = v1]) {
      const key = `${s}:${v1}-${v2}`; if (cache[key]) return cache[key];
      const sv = await loadSurah(s); const rows = sv.slice(v1 - 1, v2);
      return (cache[key] = { ar: rows.map((r, i) => r[0] + ` ﴿${arDigits(v1 + i)}﴾`).join(' '), tr: rows.map((r) => r[2]).join(' '), fr: rows.map((r) => r[1]).join(' ') });
    }

    async function draw() {
      const c = DUA_CATS.find((x) => x.id === cat);
      el.querySelector('#catAr').textContent = c.ar;
      const items = DUAS.filter((d) => d.cat === cat);
      list.innerHTML = '<div class="empty">Chargement…</div>';
      const full = await Promise.all(items.map(async (d) => (d.ref ? { ...d, ...(await quranPart(d.ref)) } : d)));
      list.innerHTML = full.map((d, i) => `
        <article class="card tilt">
          <div class="row spread" style="margin-bottom:6px">
            <div class="eyebrow">${esc(d.title || (d.ref ? `${SURAHS[d.ref[0] - 1].tr} ${d.ref[0]}:${d.ref[1]}${d.ref[2] ? '-' + d.ref[2] : ''}` : ''))}</div>
            ${d.count ? `<span class="chip on">× ${d.count}</span>` : ''}
          </div>
          <div class="ar" lang="ar" style="font-size:calc(var(--ar-size) * .9);line-height:2.1;text-align:right;color:var(--ink)">${esc(d.ar)}</div>
          <div class="tr" style="color:var(--sky);font-style:italic;margin-top:6px;${showTr ? '' : 'display:none'}">${esc(d.tr)}</div>
          <div style="margin-top:6px;color:var(--ink-2)">${esc(d.fr)}</div>
          ${d.note ? `<p class="muted" style="font-size:.86rem;margin:8px 0 0">${esc(d.note)}</p>` : ''}
          <div class="row spread" style="margin-top:12px"><span style="font-size:.76rem;color:var(--em)">${d.src ? 'Source : ' + esc(d.src) : ''}</span>
            <span class="row" style="gap:6px">${d.tasbih ? `<a class="btn sm" href="#/tasbih">${icon('beads')} Tasbih</a>` : ''}<button class="btn sm ghost" data-copy="${i}" aria-label="Copier">${icon('copy')}</button><button class="btn sm ghost" data-share="${i}" aria-label="Partager">${icon('share')}</button></span></div>
        </article>`).join('');
      list.querySelectorAll('[data-copy]').forEach((b) => (b.onclick = () => { const d = full[+b.dataset.copy]; copyText(`${d.ar}\n${d.tr}\n« ${d.fr} »\n— ${d.src || ''}`); }));
      list.querySelectorAll('[data-share]').forEach((b) => (b.onclick = () => { const d = full[+b.dataset.share]; shareText('Invocation', `${d.ar}\n${d.tr}\n« ${d.fr} »\n— ${d.src || ''}`); }));
    }
    el.querySelector('#cats').onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; el.querySelectorAll('.step-pill').forEach((x) => x.classList.toggle('on', x === b)); draw(); };
    el.querySelector('#tgTr').onchange = (e) => { showTr = e.target.checked; list.querySelectorAll('.tr').forEach((x) => (x.style.display = showTr ? '' : 'none')); };
    draw();
  },
};
