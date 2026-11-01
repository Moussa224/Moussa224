import { SIRA, CALIPHS } from '../content/sira.js';
import { esc } from '../core/dom.js';
import { revealOnScroll } from '../core/tilt.js';

export default {
  title: 'Sîra',
  mount(el) {
    el.innerHTML = `
      <div class="page-head"><div class="eyebrow">As-Sîra an-Nabawiyya</div><h1>La vie du Prophète ﷺ <span class="ar" lang="ar">السيرة النبوية</span></h1>
        <p>Les grandes étapes de la vie de Muhammad ﷺ, de sa naissance à La Mecque à son décès à Médine. Les dates sont approximatives.</p></div>
      <div class="timeline">${SIRA.map((e) => `
        <article class="tl-item" data-reveal>
          <div class="yr">${esc(e.y)} <span style="font-size:.9rem;color:var(--muted);font-family:var(--font);font-weight:400">${e.h ? '· ' + esc(e.h) : ''}</span></div>
          <h3>${e.sym} ${esc(e.t)}</h3><p>${esc(e.d)}</p></article>`).join('')}
      </div>
      <div class="section-title"><h2>Les quatre califes bien guidés</h2></div>
      <div class="grid g4">${CALIPHS.map((c, i) => `<div class="stat tilt"><b>${i + 1}</b><span style="color:var(--ink);font-size:1rem;font-weight:500">${esc(c.n)}</span><span>${esc(c.y)}</span></div>`).join('')}</div>
      <p class="note">« Vous avez, dans le Messager d'Allah, un excellent modèle. » (33:21) · Pour approfondir, consultez des ouvrages de référence de la Sîra (Ibn Hichâm, ar-Rahîq al-Makhtoûm…).</p>`;
    return revealOnScroll(el);
  },
};
