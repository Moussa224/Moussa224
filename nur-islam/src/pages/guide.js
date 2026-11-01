import { createStage } from '../scene/engine.js';
import { figureScene } from '../scene/figure.js';
import { icon } from '../core/icons.js';
import { esc } from '../core/dom.js';

// Ablutions (wudû') — ordre sunnite habituel. Références : Boukhari 159, Mouslim 226 (description du wudû' du Prophète ﷺ), Coran 5:6.
const WUDU = [
  { t: 'Intention et basmala', d: "Avoir l'intention de se purifier pour la prière, puis dire « Bismillah ».", ar: 'بِسْمِ اللَّهِ' },
  { t: 'Les mains', d: 'Laver les deux mains jusqu\'aux poignets, trois fois.' },
  { t: 'La bouche', d: "Se rincer la bouche, trois fois." },
  { t: 'Le nez', d: "Aspirer de l'eau par le nez puis la rejeter, trois fois." },
  { t: 'Le visage', d: "Laver tout le visage, de la racine des cheveux au menton, d'une oreille à l'autre, trois fois." },
  { t: 'Les bras', d: "Laver le bras droit puis le gauche, des doigts jusqu'aux coudes inclus, trois fois chacun." },
  { t: 'La tête et les oreilles', d: "Passer les mains mouillées sur la tête, de l'avant vers l'arrière puis de l'arrière vers l'avant, puis essuyer les oreilles, une fois." },
  { t: 'Les pieds', d: "Laver le pied droit puis le gauche, jusqu'aux chevilles incluses, trois fois chacun." },
  { t: "Invocation finale", d: "Après le wudû' : « J'atteste qu'il n'y a de divinité digne d'adoration qu'Allah, Seul, sans associé, et j'atteste que Muhammad est Son serviteur et Son messager. » (Mouslim 234)", ar: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ' },
];

// Étapes de la salât, avec la posture 3D correspondante.
const STEPS = [
  { pose: 'stand', t: 'Intention et orientation', d: "Se tenir debout face à la qibla, sur un endroit pur, et avoir l'intention dans le cœur d'accomplir la prière précise (Fajr, Dhouhr…). L'intention ne se prononce pas obligatoirement à voix haute." },
  { pose: 'takbir', t: 'Takbîrat al-ihrâm', d: "Lever les mains à hauteur des épaules ou des oreilles et dire « Allahou akbar ». La prière est alors commencée.", ar: 'اللَّهُ أَكْبَرُ', tr: 'Allahou akbar', fr: 'Allah est le plus grand' },
  { pose: 'qiyam', t: 'Qiyâm : debout, lecture', d: "Placer la main droite sur la gauche, sur la poitrine, le regard vers le lieu de la prosternation. Réciter la Fâtiha (obligatoire dans chaque rak‘a), puis, dans les deux premières rak‘a, une autre sourate ou quelques versets.", ar: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', tr: "Al-hamdou li-Llahi rabbi l-'âlamîn", fr: "Louange à Allah, Seigneur des mondes (1:2)", link: '#/coran/1' },
  { pose: 'ruku', t: "Rouk‘ : l'inclinaison", d: "Dire « Allahou akbar » et s'incliner, le dos droit et les mains sur les genoux. Dire trois fois :", ar: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ', tr: "Soubhâna Rabbiya l-'Adhîm", fr: 'Gloire à mon Seigneur, l\'Immense' },
  { pose: 'itidal', t: "I‘tidâl : le redressement", d: "Se relever en disant :", ar: 'سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ ... رَبَّنَا وَلَكَ الْحَمْدُ', tr: "Sami'a Llahou liman hamidah ... Rabbanâ wa laka l-hamd", fr: "Allah entend celui qui Le loue ... Notre Seigneur, à Toi la louange" },
  { pose: 'sujud', t: 'Sujûd : la prosternation', d: "Dire « Allahou akbar » et se prosterner sur sept points : front (avec le nez), paumes, genoux, orteils. Dire trois fois :", ar: 'سُبْحَانَ رَبِّيَ الْأَعْلَى', tr: "Soubhâna Rabbiya l-A'lâ", fr: 'Gloire à mon Seigneur, le Très-Haut' },
  { pose: 'jalsa', t: 'Jalsa : assis entre les deux prosternations', d: "Se relever en disant « Allahou akbar », s'asseoir sur le pied gauche, le pied droit dressé, et dire :", ar: 'رَبِّ اغْفِرْ لِي', tr: "Rabbi ghfir lî", fr: 'Seigneur, pardonne-moi' },
  { pose: 'sujud', t: 'Deuxième prosternation', d: "Redire « Allahou akbar », se prosterner à nouveau et répéter la formule. Voilà une rak‘a complète ; on se relève pour la suivante (Fajr : 2 rak‘a · Dhouhr, Asr, Ichaa : 4 · Maghrib : 3)." },
  { pose: 'tashahhud', t: 'Tashahhud : la position assise finale', d: "À la fin de la 2e rak‘a (et à la dernière), s'asseoir et réciter. L'index droit est levé pendant l'attestation de foi.", ar: 'التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ', tr: "At-tahiyyâtou li-Llahi wa s-salawâtou wa t-tayyibât, as-salâmou 'alayka ayyouha n-nabiyyou wa rahmatou Llahi wa barakâtouh, as-salâmou 'alaynâ wa 'alâ 'ibâdi Llahi s-sâlihîn, ach-hadou an la ilaha illa Llah wa ach-hadou anna Mouhammadan 'abdouhou wa rasoûlouh", fr: "Les salutations, les prières et les bonnes œuvres sont pour Allah. Que la paix soit sur toi, ô Prophète, ainsi que la miséricorde d'Allah et Ses bénédictions. Que la paix soit sur nous et sur les pieux serviteurs d'Allah. J'atteste qu'il n'y a de divinité qu'Allah et j'atteste que Muhammad est Son serviteur et Son messager." },
  { pose: 'tashahhud', t: 'Prière sur le Prophète ﷺ', d: "À la dernière rak‘a, on ajoute la prière sur le Prophète ﷺ (as-salât al-ibrâhîmiyya) :", ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ', tr: "Allahoumma salli 'alâ Mouhammad wa 'alâ âli Mouhammad kamâ sallayta 'alâ Ibrâhîm wa 'alâ âli Ibrâhîm innaka hamîdoun majîd. Allahoumma bârik 'alâ Mouhammad wa 'alâ âli Mouhammad kamâ bârakta 'alâ Ibrâhîm wa 'alâ âli Ibrâhîm innaka hamîdoun majîd", fr: "Ô Allah, prie sur Muhammad et sur la famille de Muhammad comme Tu as prié sur Ibrahim et sur la famille d'Ibrahim ; Tu es digne de louange et de gloire. Ô Allah, bénis Muhammad et la famille de Muhammad comme Tu as béni Ibrahim et la famille d'Ibrahim ; Tu es digne de louange et de gloire." },
  { pose: 'taslimR', t: 'Taslîm : la salutation finale', d: "Tourner la tête à droite puis à gauche en disant à chaque fois :", ar: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ', tr: "As-salâmou 'alaykoum wa rahmatou Llah", fr: "Que la paix et la miséricorde d'Allah soient sur vous" },
];

export default {
  title: 'Guide de la prière',
  mount(el, params, query) {
    let tab = query.t === 'wudu' ? 'wudu' : 'salat', idx = Math.max(0, Math.min(STEPS.length - 1, (parseInt(query.s, 10) || 1) - 1));
    el.innerHTML = `
      <div class="page-head"><div class="eyebrow">Wudû' · Salât</div><h1>Guide de la prière <span class="ar" lang="ar">الصلاة</span></h1>
        <p>Les ablutions et la prière pas à pas, avec une figure 3D abstraite pour visualiser chaque posture. Faites glisser pour tourner autour.</p></div>
      <div class="seg" style="margin-bottom:12px"><button data-t="salat" aria-pressed="${tab === 'salat'}">La prière</button><button data-t="wudu" aria-pressed="${tab === 'wudu'}">Les ablutions</button></div>
      <div id="pane"></div>
      <p class="note">Ce guide présente la manière la plus répandue ; les écoles juridiques diffèrent sur certains détails (position des mains, du pied, etc.). Pour apprendre, rien ne remplace un enseignant qualifié.</p>`;
    const pane = el.querySelector('#pane');
    let stage = null;

    function drawSalat() {
      pane.innerHTML = `
        <section class="stage guide-stage" id="gs"><div class="overlay"><div class="chips"><span class="chip" id="stepNo"></span></div>
          <div class="row spread"><span class="hint">Glissez pour tourner · la Kaaba est devant le priant</span></div></div></section>
        <div class="steps" id="steps" style="margin-top:12px">${STEPS.map((s, i) => `<button class="step-pill" data-i="${i}">${i + 1}. ${esc(s.t.split(' : ')[0].split(' ')[0] === 'Deuxième' ? '2e sujûd' : s.t.split(' : ')[0])}</button>`).join('')}</div>
        <div class="card step-body" id="body"></div>
        <div class="row spread" style="margin-top:12px"><button class="btn" id="prev">${icon('back')} Précédent</button><button class="btn gold" id="next">Suivant ${icon('next')}</button></div>`;
      stage = createStage(pane.querySelector('#gs'), (ctx) => figureScene(ctx, { pose: STEPS[idx].pose }), { fov: 38 });
      pane.querySelector('#prev').onclick = () => go(idx - 1);
      pane.querySelector('#next').onclick = () => go(idx + 1);
      pane.querySelector('#steps').onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) go(+b.dataset.i); };
      let tm; let ti = 0;
      function go(i) {
        idx = Math.max(0, Math.min(STEPS.length - 1, i));
        const s = STEPS[idx];
        clearTimeout(tm);
        stage && stage.mod.setPose(s.pose);
        if (s.pose === 'taslimR') tm = setTimeout(() => stage && stage.mod.setPose('taslimL', 1.0), 1800);
        pane.querySelector('#stepNo').textContent = `Étape ${idx + 1} / ${STEPS.length}`;
        pane.querySelectorAll('.step-pill').forEach((b, k) => b.classList.toggle('on', k === idx));
        pane.querySelector('.step-pill.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
        pane.querySelector('#body').innerHTML = `
          <h3>${esc(s.t)}</h3><p style="color:var(--ink-2)">${esc(s.d)}</p>
          ${s.ar ? `<div class="ar" lang="ar" style="margin:6px 0">${esc(s.ar)}</div><div class="tr" style="margin:4px 0">${esc(s.tr)}</div><div class="fr">${esc(s.fr)}</div>` : ''}
          ${s.link ? `<p style="text-align:center;margin-top:10px"><a class="btn sm" href="${s.link}">${icon('book')} Lire la Fâtiha</a></p>` : ''}`;
        pane.querySelector('#prev').disabled = idx === 0; pane.querySelector('#next').disabled = idx === STEPS.length - 1;
        pane.querySelector('#prev').style.opacity = idx === 0 ? 0.4 : 1; pane.querySelector('#next').style.opacity = idx === STEPS.length - 1 ? 0.4 : 1;
      }
      go(idx);
    }

    function drawWudu() {
      pane.innerHTML = `<div class="grid g2">${WUDU.map((s, i) => `
        <article class="card tilt"><div class="row" style="gap:14px;align-items:flex-start"><span class="star-num" style="flex:none"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4"><use href="#i-star8"/></svg><span>${i + 1}</span></span>
          <div><h3>${esc(s.t)}</h3><p style="color:var(--ink-2);margin:4px 0 0">${esc(s.d)}</p>${s.ar ? `<div class="ar" lang="ar" style="font-size:1.5rem;color:var(--gold);margin-top:8px;text-align:right">${esc(s.ar)}</div>` : ''}</div></div></article>`).join('')}</div>
        <div class="card" style="margin-top:14px"><h3>Ce qui annule les ablutions</h3><ul class="lessons" style="margin:6px 0 0 18px;padding:0"><li>Ce qui sort des deux voies (urine, selles, vent), le sommeil profond, la perte de conscience.</li><li>Selon l'école, le contact direct avec les parties intimes ou d'autres cas : consultez votre école de référence.</li></ul></div>
        <div class="note">Source : description du wudû' du Prophète ﷺ (Boukhari 159, Mouslim 226) et Coran 5:6.</div>`;
    }

    function setTab(t) {
      tab = t; stage && stage.dispose(); stage = null;
      el.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.t === t));
      t === 'salat' ? drawSalat() : drawWudu();
    }
    el.querySelector('.seg').onclick = (e) => { const b = e.target.closest('button'); if (b) setTab(b.dataset.t); };
    setTab(tab);
    return () => stage && stage.dispose();
  },
};
