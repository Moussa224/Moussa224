import { installSprite, icon } from './core/icons.js';
import { store } from './core/store.js';
import { route, startRouter } from './core/router.js';
import { initBackground } from './scene/background.js';
import { initTilt } from './core/tilt.js';
import { currentPlace, hijriNow } from './core/prayer.js';
import { MONTHS } from './core/hijri.js';
import home from './pages/home.js';
import prieres from './pages/prieres.js';
import qibla from './pages/qibla.js';
import coran from './pages/coran.js';
import lecteur from './pages/lecteur.js';
import tasbih from './pages/tasbih.js';
import noms from './pages/noms.js';
import invocations from './pages/invocations.js';
import hadiths from './pages/hadiths.js';
import prophetes from './pages/prophetes.js';
import sira from './pages/sira.js';
import guide from './pages/guide.js';
import calendrier from './pages/calendrier.js';
import zakat from './pages/zakat.js';
import quiz from './pages/quiz.js';
import explorer from './pages/explorer.js';
import reglages from './pages/reglages.js';
import { startReminders } from './core/reminders.js';

const TABS = [
  { id: 'accueil', t: 'Accueil', i: 'home' },
  { id: 'prieres', t: 'Prières', i: 'clock' },
  { id: 'coran', t: 'Coran', i: 'book' },
  { id: 'explorer', t: 'Explorer', i: 'grid' },
  { id: 'reglages', t: 'Réglages', i: 'sliders' },
];

function applySettings() {
  const r = document.documentElement;
  r.dataset.theme = store.get('theme');
  const m = store.get('motion'); if (m === 'auto') delete r.dataset.motion; else r.dataset.motion = m;
  r.style.setProperty('--ar-size', store.get('arSize') + 'px');
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', store.get('theme') === 'clair' ? '#f7f2e6' : '#060d1f');
}

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__nurInstall = e; });

function boot() {
  installSprite();
  applySettings();
  store.on((k) => ['theme', 'motion', 'arSize', '*'].includes(k) && applySettings());

  initBackground(document.getElementById('bg'));
  initTilt();

  const bar = document.getElementById('tabbar');
  bar.innerHTML = TABS.map((t) => `<button class="tab" data-tab="${t.id}" aria-label="${t.t}">${icon(t.i)}<span>${t.t}</span></button>`).join('');
  bar.addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) location.hash = '#/' + b.dataset.tab; });

  const chip = document.getElementById('hijriChip');
  const updChip = () => { const h = hijriNow(currentPlace()); chip.innerHTML = `<b>${h.d}</b> ${MONTHS[h.m - 1]} ${h.y}`; };
  updChip(); setInterval(updChip, 60000);
  chip.addEventListener('click', () => (location.hash = '#/calendrier'));

  route('accueil', home, 'accueil');
  route('prieres', prieres, 'prieres');
  route('qibla', qibla, 'qibla');
  route('coran', coran, 'coran');
  route('coran/:n', lecteur, 'coran');
  route('tasbih', tasbih, 'tasbih');
  route('noms', noms, 'noms');
  route('noms/:n', noms, 'noms');
  route('invocations', invocations, 'invocations');
  route('invocations/:c', invocations, 'invocations');
  route('hadiths', hadiths, 'hadiths');
  route('hadiths/:n', hadiths, 'hadiths');
  route('prophetes', prophetes, 'prophetes');
  route('prophetes/:id', prophetes, 'prophetes');
  route('sira', sira, 'sira');
  route('guide', guide, 'guide');
  route('calendrier', calendrier, 'calendrier');
  route('zakat', zakat, 'zakat');
  route('quiz', quiz, 'quiz');
  route('explorer', explorer, 'explorer');
  route('reglages', reglages, 'reglages');
  route('apropos', { ...reglages, mount: (el, p) => reglages.mount(el, { ...p, about: true }) }, 'reglages');
  route('', home, 'accueil');

  startReminders();
  startRouter(document.getElementById('view'), (tab) => {
    const main = ['accueil', 'prieres', 'coran'].includes(tab) ? tab : tab === 'reglages' ? 'reglages' : 'explorer';
    bar.querySelectorAll('.tab').forEach((b) => (b.dataset.tab === main ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  });
}

// Hors-ligne : service worker (http/https uniquement ; ajoutez ?nosw pour le désactiver pendant le développement).
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !location.search.includes('nosw')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then((reg) => {
    const ask = () => (reg.active || reg.waiting || reg.installing)?.postMessage({ type: 'precache-quran' });
    navigator.serviceWorker.ready.then(() => setTimeout(ask, 4000));
  }).catch(() => {}));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
