/* ==========================================================================
   Coran Facile · ce que l'application retient (réglages, progression, favoris)
   Tout reste sur l'appareil, dans le stockage du navigateur. Rien n'est envoyé nulle part.
   ========================================================================== */
const Etat = (() => {
  'use strict';

  const CLE = 'coran-facile-v1';
  // Intervalles de révision (en jours) selon la « boîte » où se trouve le verset : 1 → 5.
  const INTERVALLES = [0, 1, 3, 7, 14, 30];

  const parDefaut = () => ({
    reglages: { phonetique: true, traduction: true, taille: 3, recitant: 'alafasy', vitesse: 1, repetitions: 1, suivant: true, theme: 'auto' },
    lecture: null, // dernier endroit lu : { s, v }
    appris: {}, // "sourate:verset" → { b: boîte, d: prochaine révision, a: date d'apprentissage }
    favoris: [], // ["sourate:verset"]
    jours: [], // jours où l'on a étudié (AAAA-MM-JJ)
    lecons: {} // leçons terminées
  });

  let d = parDefaut();
  let enMemoire = false; // vrai si le stockage du navigateur est indisponible

  const cle = (s, v) => `${s}:${v}`;
  const estRef = (k) => /^\d{1,3}:\d{1,3}$/.test(k);
  const estJour = (j) => typeof j === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(j);

  /* ---------- Lecture / écriture ---------- */
  // Reprend des données (venant du stockage ou d'une sauvegarde) en ne gardant que ce qui est valide.
  const assainir = (brut) => {
    const res = parDefaut();
    if (!brut || typeof brut !== 'object') return res;
    const r = brut.reglages || {};
    const def = res.reglages;
    for (const k of Object.keys(def)) {
      if (typeof r[k] === typeof def[k]) def[k] = r[k];
    }
    def.taille = Outils.borner(Math.round(def.taille), 1, 5);
    def.repetitions = [1, 3, 5, 10].includes(def.repetitions) ? def.repetitions : 1;
    def.vitesse = [0.75, 1, 1.25].includes(def.vitesse) ? def.vitesse : 1;
    if (!['auto', 'clair', 'sombre'].includes(def.theme)) def.theme = 'auto';
    if (!CONTENU.recitants.some((x) => x.id === def.recitant)) def.recitant = 'alafasy';
    if (brut.lecture && Number.isInteger(brut.lecture.s) && Number.isInteger(brut.lecture.v)) {
      res.lecture = { s: brut.lecture.s, v: brut.lecture.v };
    }
    if (brut.appris && typeof brut.appris === 'object') {
      for (const [k, e] of Object.entries(brut.appris)) {
        if (estRef(k) && e && Number.isInteger(e.b) && estJour(e.d)) {
          res.appris[k] = { b: Outils.borner(e.b, 1, 5), d: e.d, a: estJour(e.a) ? e.a : e.d };
        }
      }
    }
    if (Array.isArray(brut.favoris)) res.favoris = brut.favoris.filter(estRef);
    if (Array.isArray(brut.jours)) res.jours = brut.jours.filter(estJour).slice(-400);
    if (brut.lecons && typeof brut.lecons === 'object') {
      for (const [k, v] of Object.entries(brut.lecons)) if (v === true) res.lecons[k] = true;
    }
    return res;
  };

  const charger = () => {
    try {
      const texte = localStorage.getItem(CLE);
      if (texte) d = assainir(JSON.parse(texte));
    } catch (e) {
      enMemoire = true;
    }
  };

  const sauver = () => {
    try {
      localStorage.setItem(CLE, JSON.stringify(d));
    } catch (e) {
      enMemoire = true;
    }
  };

  /* ---------- Réglages ---------- */
  const reglages = () => d.reglages;
  const regler = (nom, valeur) => { d.reglages[nom] = valeur; sauver(); };

  /* ---------- Où on en est ---------- */
  const lecture = () => d.lecture;
  const noterLecture = (s, v) => { d.lecture = { s, v }; sauver(); };

  /* ---------- Jours d'étude et série ---------- */
  const marquerJour = () => {
    const j = Outils.aujourdhui();
    if (d.jours[d.jours.length - 1] !== j && !d.jours.includes(j)) {
      d.jours.push(j);
      d.jours = d.jours.slice(-400);
      sauver();
    }
  };
  // Nombre de jours d'affilée, en comptant hier si l'on n'a pas encore étudié aujourd'hui.
  const serie = () => {
    const ensemble = new Set(d.jours);
    let jour = Outils.aujourdhui();
    if (!ensemble.has(jour)) jour = Outils.ajouterJours(jour, -1);
    let n = 0;
    while (ensemble.has(jour)) { n++; jour = Outils.ajouterJours(jour, -1); }
    return n;
  };
  const etudieAujourdhui = () => d.jours.includes(Outils.aujourdhui());

  /* ---------- Versets appris et révision espacée ---------- */
  const estAppris = (s, v) => Object.prototype.hasOwnProperty.call(d.appris, cle(s, v));
  const apprendre = (s, v, oui = true) => {
    const k = cle(s, v);
    if (oui && !d.appris[k]) {
      const j = Outils.aujourdhui();
      d.appris[k] = { b: 1, d: Outils.ajouterJours(j, INTERVALLES[1]), a: j };
    } else if (!oui) {
      delete d.appris[k];
    }
    sauver();
  };
  const nbAppris = () => Object.keys(d.appris).length;
  const nbApprisDe = (s) => Object.keys(d.appris).filter((k) => k.startsWith(`${s}:`)).length;
  const tousAppris = (s, de, a) => {
    for (let v = de; v <= a; v++) if (!estAppris(s, v)) return false;
    return true;
  };
  // Après une carte de révision : bonne réponse → boîte suivante, sinon retour à la première.
  const noterRevision = (s, v, sais) => {
    const k = cle(s, v);
    const e = d.appris[k] || { b: 1, a: Outils.aujourdhui() };
    e.b = sais ? Math.min(5, e.b + 1) : 1;
    e.d = Outils.ajouterJours(Outils.aujourdhui(), INTERVALLES[e.b]);
    d.appris[k] = e;
    sauver();
  };
  const aReviser = () => {
    const j = Outils.aujourdhui();
    return Object.entries(d.appris)
      .filter(([, e]) => e.d <= j)
      .map(([k, e]) => { const [s, v] = k.split(':').map(Number); return { s, v, d: e.d, b: e.b }; })
      .sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : x.s - y.s || x.v - y.v));
  };
  const prochaineRevision = () => {
    const dates = Object.values(d.appris).map((e) => e.d).sort();
    const futur = dates.find((x) => x > Outils.aujourdhui());
    return futur || null;
  };

  /* ---------- Favoris ---------- */
  const estFavori = (s, v) => d.favoris.includes(cle(s, v));
  const basculerFavori = (s, v) => {
    const k = cle(s, v);
    const i = d.favoris.indexOf(k);
    if (i >= 0) d.favoris.splice(i, 1); else d.favoris.push(k);
    sauver();
    return i < 0;
  };
  const favoris = () => d.favoris.map((k) => { const [s, v] = k.split(':').map(Number); return { s, v }; })
    .sort((x, y) => x.s - y.s || x.v - y.v);

  /* ---------- Leçons ---------- */
  const leconFaite = (id) => d.lecons[id] === true;
  const faireLecon = (id, oui = true) => { if (oui) d.lecons[id] = true; else delete d.lecons[id]; sauver(); };

  /* ---------- Sauvegarde manuelle ---------- */
  const exporter = () => JSON.stringify({ application: 'coran-facile', version: 1, ...d });
  const importer = (texte) => {
    const brut = JSON.parse(texte);
    if (!brut || brut.application !== 'coran-facile') throw new Error('Ce texte ne vient pas de Coran Facile.');
    d = assainir(brut);
    sauver();
  };
  const reinitialiser = () => { d = parDefaut(); sauver(); };
  const stockageIndisponible = () => enMemoire;

  return {
    charger, reglages, regler, lecture, noterLecture,
    marquerJour, serie, etudieAujourdhui,
    estAppris, apprendre, nbAppris, nbApprisDe, tousAppris, noterRevision, aReviser, prochaineRevision,
    estFavori, basculerFavori, favoris, leconFaite, faireLecon,
    exporter, importer, reinitialiser, stockageIndisponible
  };
})();
