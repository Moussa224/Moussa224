/* ==========================================================================
   Coran Facile · petits outils partagés (sélecteurs, dates, recherche, icônes, messages)
   ========================================================================== */
const Outils = (() => {
  'use strict';

  const $ = (sel, racine = document) => racine.querySelector(sel);
  const $$ = (sel, racine = document) => Array.from(racine.querySelectorAll(sel));

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const p3 = (n) => String(n).padStart(3, '0');
  const borner = (v, min, max) => Math.min(max, Math.max(min, v));
  const reduireMouvement = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Pluriels et nombres (en français, 0 et 1 sont au singulier) ---------- */
  const nombre = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;

  /* ---------- Dates, toujours à l'heure locale de l'appareil ---------- */
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const aujourdhui = () => iso(new Date());
  const versDate = (jour) => { const [a, m, j] = jour.split('-').map(Number); return new Date(a, m - 1, j); };
  const ajouterJours = (jour, n) => { const d = versDate(jour); d.setDate(d.getDate() + n); return iso(d); };
  const ecartJours = (a, b) => Math.round((versDate(b) - versDate(a)) / 864e5);
  const dateLongue = (jour) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(versDate(jour));
  const quand = (jour) => {
    const e = ecartJours(aujourdhui(), jour);
    if (e <= 0) return "aujourd'hui";
    if (e === 1) return 'demain';
    if (e < 7) return dateLongue(jour);
    return `dans ${e} jours`;
  };

  /* ---------- Textes : comparaison sans accents ni voyelles arabes ---------- */
  // Les caractères invisibles (accents combinants, voyelles arabes) sont désignés par leur numéro Unicode
  const car = (...codes) => String.fromCharCode(...codes);
  const classe = (...plages) => new RegExp(`[${plages.map((p) => (Array.isArray(p) ? `${car(p[0])}-${car(p[1])}` : car(p))).join('')}]`, 'g');
  const ACCENTS = classe([0x0300, 0x036f]); // accents combinants (é = e + ´)
  const VOYELLES_ARABES = classe([0x064b, 0x065f], 0x0670, [0x06d6, 0x06ed], 0x0640); // voyelles, signes de lecture, tatouil
  const ARABE = `[${car(0x0600)}-${car(0x06ff)}]`; // bloc des lettres arabes
  const sansAccents = (s) => s.normalize('NFD').replace(ACCENTS, '').toLowerCase().replace(/[‘’'`]/g, '');
  const sansTashkil = (s) => s
    .replace(VOYELLES_ARABES, '')
    .replace(/[آأإٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  const contientArabe = (s) => new RegExp(ARABE).test(s);

  /* ---------- Hasard ---------- */
  const melanger = (liste) => {
    const t = liste.slice();
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
  };

  /* ---------- Icônes (traits fins, héritent de la couleur du texte) ---------- */
  const ICONES = {
    accueil: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h5v-5.5h3v5.5h5V10"/>',
    coran: '<path d="M12 6.5C10 5 7 4.5 4 4.5v14c3 0 6 .5 8 2 2-1.5 5-2 8-2v-14c-3 0-6 .5-8 2z"/><path d="M12 6.5v14"/>',
    apprendre: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11.5V16c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5"/><path d="M21.5 9v5"/>',
    reviser: '<path d="M4 11a8 8 0 0 1 14-4.5L20 9"/><path d="M20 4v5h-5"/><path d="M20 13a8 8 0 0 1-14 4.5L4 15"/><path d="M4 20v-5h5"/>',
    reglages: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    play: '<g fill="currentColor" stroke="none"><path d="M8 5.2v13.6a.6.6 0 0 0 .9.5l10.6-6.8a.6.6 0 0 0 0-1L8.9 4.7a.6.6 0 0 0-.9.5z"/></g>',
    pause: '<g fill="currentColor" stroke="none"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></g>',
    suivant: '<path d="M6 6l8 6-8 6z"/><path d="M18 6v12"/>',
    precedent: '<path d="M18 6l-8 6 8 6z"/><path d="M6 6v12"/>',
    etoile: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8 6.9 19.5l1-5.7-4.1-4 5.7-.8z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    retour: '<path d="M15 5l-7 7 7 7"/>',
    droite: '<path d="M9 5l7 7-7 7"/>',
    fermer: '<path d="M6 6l12 12M18 6L6 18"/>',
    repeter: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
    son: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
    oeil: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/>',
    cache: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><path d="M4 20 20 4"/>',
    flamme: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.3 1.3 1 2 1.8 2.2C10.5 8.5 11 5.5 12 3z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    moins: '<path d="M5 12h14"/>',
    nuage: '<path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 8.6 4.7 4.7 0 0 1 17.5 18z"/><path d="M12 11v6m0 0-2.2-2.2M12 17l2.2-2.2"/>'
  };
  const ico = (nom, classe = '') => `<svg class="ico ${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONES[nom] || ''}</svg>`;

  /* ---------- Message qui s'efface tout seul ---------- */
  let minuterieMessage = 0;
  const message = (texte, duree = 3200) => {
    const el = $('#message');
    if (!el) return;
    el.textContent = texte;
    el.classList.add('visible');
    clearTimeout(minuterieMessage);
    minuterieMessage = setTimeout(() => el.classList.remove('visible'), duree);
  };

  return {
    $, $$, esc, p3, borner, reduireMouvement, nombre,
    iso, aujourdhui, ajouterJours, ecartJours, dateLongue, quand,
    car, ARABE, sansAccents, sansTashkil, contientArabe, melanger, ico, message
  };
})();
