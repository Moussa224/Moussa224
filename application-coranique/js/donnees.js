/* ==========================================================================
   Coran Facile · accès au texte du Coran
   La liste des sourates est toujours là (data/sourates.js). Le texte d'une sourate est chargé
   seulement quand on l'ouvre (data/s/001.js … 114.js), ce qui garde l'ouverture rapide.
   ========================================================================== */
const Donnees = (() => {
  'use strict';

  const sourates = window.SOURATES;
  const NB_SOURATES = sourates.length;
  const NOM_CACHE = 'coran-facile-donnees';

  // Nombre de versets qui précèdent chaque sourate : sert à numéroter les versets de 1 à 6236.
  const avant = [];
  let cumul = 0;
  sourates.forEach((x, i) => { avant[i] = cumul; cumul += x.v; });
  const TOTAL_VERSETS = cumul;

  const sourate = (n) => sourates[n - 1];
  const rang = (s, v) => avant[s - 1] + v;
  const urlSourate = (n) => `data/s/${Outils.p3(n)}.js`;

  /* ---------- Chargement d'une sourate (fonctionne aussi en ouvrant index.html depuis le disque) ---------- */
  const enCours = new Map();
  const charger = (n) => {
    if (window.TEXTES && window.TEXTES[n]) return Promise.resolve(window.TEXTES[n]);
    if (enCours.has(n)) return enCours.get(n);
    const promesse = new Promise((ok, ko) => {
      const balise = document.createElement('script');
      balise.src = urlSourate(n);
      balise.async = true;
      balise.onload = () => (window.TEXTES && window.TEXTES[n] ? ok(window.TEXTES[n]) : ko(new Error('Sourate vide')));
      balise.onerror = () => { balise.remove(); ko(new Error('Sourate introuvable')); };
      document.head.appendChild(balise);
    }).finally(() => enCours.delete(n));
    enCours.set(n, promesse);
    return promesse;
  };

  // Un verset : { ar, ph, fr } (arabe, phonétique, traduction)
  const verset = async (s, v) => {
    const t = (await charger(s))[v - 1];
    return t ? { ar: t[0], ph: t[1], fr: t[2] } : null;
  };
  const mots = (texteArabe) => texteArabe.split(' ');

  /* ---------- Tout charger (pour la recherche et pour le mode hors-ligne) ---------- */
  const toutCharger = async (progression) => {
    let fait = 0;
    const file = Array.from({ length: NB_SOURATES }, (_, i) => i + 1);
    const ouvriers = Array.from({ length: 6 }, async () => {
      while (file.length) {
        const n = file.shift();
        await charger(n);
        fait++;
        if (progression) progression(fait, NB_SOURATES);
      }
    });
    await Promise.all(ouvriers);
  };

  /* ---------- Recherche dans les versets ---------- */
  // Cherche dans la traduction française, dans la phonétique ou dans l'arabe (sans les voyelles).
  const chercher = async (requete, progression, limite = 60) => {
    const q = requete.trim();
    if (!q) return [];
    await toutCharger(progression);
    const arabe = Outils.contientArabe(q);
    const cible = arabe ? Outils.sansTashkil(q) : Outils.sansAccents(q);
    const resultats = [];
    for (let s = 1; s <= NB_SOURATES && resultats.length < limite; s++) {
      const versets = window.TEXTES[s];
      for (let v = 1; v <= versets.length && resultats.length < limite; v++) {
        const [ar, ph, fr] = versets[v - 1];
        const trouve = arabe
          ? Outils.sansTashkil(ar).includes(cible)
          : Outils.sansAccents(fr).includes(cible) || Outils.sansAccents(ph).includes(cible);
        if (trouve) resultats.push({ s, v, ar, ph, fr });
      }
    }
    return resultats;
  };

  /* ---------- Mode hors-ligne : garder toutes les sourates dans le cache de l'appareil ---------- */
  const horsLignePossible = () => {
    try {
      return 'caches' in window && 'serviceWorker' in navigator && location.protocol.startsWith('http')
        && !!document.querySelector('link[rel="manifest"]');
    } catch (e) { return false; }
  };
  const nbEnCache = async () => {
    if (!horsLignePossible()) return 0;
    try {
      const cache = await caches.open(NOM_CACHE);
      return (await cache.keys()).length;
    } catch (e) { return 0; }
  };
  const telechargerTout = async (progression) => {
    const cache = await caches.open(NOM_CACHE);
    let fait = 0;
    const file = Array.from({ length: NB_SOURATES }, (_, i) => i + 1);
    const ouvriers = Array.from({ length: 4 }, async () => {
      while (file.length) {
        const url = urlSourate(file.shift());
        if (!(await cache.match(url))) {
          const reponse = await fetch(url);
          if (!reponse.ok) throw new Error(`Échec ${url}`);
          await cache.put(url, reponse);
        }
        fait++;
        if (progression) progression(fait, NB_SOURATES);
      }
    });
    await Promise.all(ouvriers);
  };

  return {
    sourates, NB_SOURATES, TOTAL_VERSETS, sourate, rang, charger, verset, mots,
    toutCharger, chercher, horsLignePossible, nbEnCache, telechargerTout
  };
})();
