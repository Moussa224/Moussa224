import { icon } from '../core/icons.js';

const GROUPS = [
  ['Prière et orientation', [
    ['prieres', 'Horaires de prière', 'Calcul local, 12 méthodes, suivi des 5 prières', 'clock', 'صلاة'],
    ['qibla', 'Qibla', 'Boussole 3D avec la Kaaba', 'compass', 'قبلة'],
    ['guide', 'Guide de la prière', 'Ablutions et salât, figure 3D', 'pray', 'وضوء'],
    ['calendrier', 'Calendrier hégirien', 'Fêtes, jours blancs, lune 3D', 'cal', 'تقويم'],
  ]],
  ['Coran et dhikr', [
    ['coran', 'Le Coran', 'Arabe, français, phonétique, audio', 'book', 'قرآن'],
    ['tasbih', 'Tasbih 3D', 'Chapelet interactif', 'beads', 'تسبيح'],
    ['invocations', 'Invocations', 'Matin, soir, quotidien, Coran', 'heart', 'دعاء'],
    ['noms', 'Les 99 Noms', "Les plus beaux Noms d'Allah", 'star', 'أسماء'],
  ]],
  ['Connaissance', [
    ['hadiths', '40 hadiths', "Recueil d'an-Nawawî", 'scroll', 'حديث'],
    ['prophetes', 'Les prophètes', '25 prophètes et récits coraniques', 'users', 'أنبياء'],
    ['sira', 'La Sîra', 'Vie du Prophète ﷺ, frise 3D', 'moon', 'سيرة'],
    ['quiz', 'Quiz', 'Testez vos connaissances', 'quiz', 'اختبار'],
  ]],
  ['Outils', [
    ['zakat', 'Zakât', 'Calculateur de zakât al-mâl', 'calc', 'زكاة'],
    ['reglages', 'Réglages', 'Thème, qualité 3D, données, crédits', 'sliders', 'إعدادات'],
  ]],
];

export default {
  title: 'Explorer',
  mount(el) {
    el.innerHTML = `<div class="page-head"><div class="eyebrow">Tout Nûr</div><h1>Explorer <span class="ar" lang="ar">استكشف</span></h1><p>Toutes les rubriques de l'application, hors-ligne et sans compte.</p></div>` +
      GROUPS.map(([t, items]) => `<div class="section-title"><h2>${t}</h2></div><div class="grid g3">${items.map(([to, n, d, i, ar]) => `
        <a class="shortcut tilt" href="#/${to}"><span class="big-ar ar" lang="ar">${ar}</span><span class="ic pop">${icon(i)}</span><b class="pop2">${n}</b><small>${d}</small></a>`).join('')}</div>`).join('');
  },
};
