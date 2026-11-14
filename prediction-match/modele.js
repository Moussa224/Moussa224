/*
 * Moteur de prédiction d'un match de football en cours de jeu.
 *
 * Principe : chaque équipe marque selon un « taux de buts » par minute. Ce taux part d'un
 * niveau d'avant-match (points Elo ou cotes des bookmakers), puis il est corrigé en direct par :
 *   - le moment du match (on marque un peu plus en fin de match qu'au début),
 *   - le score (l'équipe qui mène ralentit, celle qui est menée pousse),
 *   - les cartons rouges (10 contre 11),
 *   - les tirs cadrés et non cadrés (une équipe qui domine a probablement un meilleur niveau
 *     que prévu, mais on se méfie : l'avant-match garde un gros poids).
 *
 * À chaque instant, on déroule le reste du match minute par minute (demi-minute exactement),
 * en suivant toutes les suites possibles de buts. On en tire la probabilité de victoire de
 * chaque équipe, de match nul, du prochain but, les scores finaux probables, etc.
 *
 * Ce fichier ne dépend de rien : il s'utilise dans la page web et dans Node (tests).
 */
(function (racine, fabrique) {
  if (typeof module === 'object' && module.exports) module.exports = fabrique();
  else racine.Modele = fabrique();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Réglages du modèle. Ce sont des ordres de grandeur issus de la littérature sur le football,
  // pas des valeurs mesurées sur votre championnat.
  // ---------------------------------------------------------------------------
  const P = {
    FIN: 94, // minute de fin attendue : 90 + environ 4 minutes d'arrêts de jeu
    DUREE_MIN: 1.5, // temps restant minimal quand on a dépassé la minute de fin attendue
    PAS: 0.5, // pas de calcul, en minutes
    PLAFOND: 10, // buts maximum pris en compte sur le reste du match, par équipe

    BUTS_MOYENS: 2.6, // buts par match, les deux équipes ensemble
    AVANTAGE_DOMICILE: 75, // points Elo donnés à l'équipe qui joue chez elle
    // Part des buts d'A = logistique(PENTE_ELO × écart Elo / 400). Calibrée pour retrouver les chances
    // Elo habituelles (100 points d'écart = 64 % de points attendus, victoire = 1, nul = 0,5) : voir test-modele.js.
    PENTE_ELO: 2.0,

    PENTE_TEMPS: 0.36, // les buts arrivent surtout en 2e mi-temps : 45 % avant, 55 % après

    // Effet du score : par but d'écart (jusqu'à 3)
    ECART_MENE: 0.05, // l'équipe qui mène marque 5 % de moins par but d'avance
    ECART_MENEE: 0.07, // l'équipe menée marque 7 % de plus par but de retard

    // Effet d'un carton rouge, par carton (jusqu'à 3)
    ROUGE_PROPRE: 0.75, // l'équipe à 10 marque 25 % de moins
    ROUGE_ADVERSE: 1.25, // l'équipe à 11 marque 25 % de plus

    // Tirs : conversion en « buts attendus » (xG)
    XG_CADRE: 0.3, // un tir cadré vaut en moyenne 0,30 but
    XG_HORS: 0.03, // un tir non cadré vaut en moyenne 0,03 but
    CONFIANCE_AVANT_MATCH: 10, // poids de l'avant-match, en « buts équivalents »
    PERF_MIN: 0.65,
    PERF_MAX: 1.5,

    // Simulation
    ROUGE_PAR_MATCH: 0.06, // cartons rouges par équipe et par match
    HORS_PAR_CADRE: 2, // tirs non cadrés pour un tir cadré
    DISPERSION_NIVEAU: 0.15, // le vrai niveau du jour s'écarte du niveau annoncé de ±15 %
  };

  const bornes = (x, bas, haut) => Math.min(haut, Math.max(bas, x));

  // Intensité des buts selon la minute : 1 en moyenne sur les 90 minutes.
  const intensite = (t) => 1 + P.PENTE_TEMPS * (Math.min(t, 90) / 90 - 0.5);
  const NORME = 90 + (P.FIN - 90) * intensite(90); // intégrale de l'intensité du début à FIN

  // ---------------------------------------------------------------------------
  // Niveaux d'avant-match
  // ---------------------------------------------------------------------------

  /** Buts attendus sur tout le match pour chaque équipe, d'après leurs niveaux (échelle Elo). */
  function forcesDepuisNiveaux({ niveauA, niveauB, terrain = 'A', butsMoyens = P.BUTS_MOYENS }) {
    const avantage = terrain === 'A' ? P.AVANTAGE_DOMICILE : terrain === 'B' ? -P.AVANTAGE_DOMICILE : 0;
    const ecart = niveauA - niveauB + avantage;
    const part = 1 / (1 + Math.exp((-P.PENTE_ELO * ecart) / 400)); // part des buts attendus qui revient à A
    return { lamA: butsMoyens * part, lamB: butsMoyens * (1 - part) };
  }

  /** Probabilités implicites des cotes décimales (marge du bookmaker retirée). */
  function probasDepuisCotes(coteA, coteN, coteB) {
    if (![coteA, coteN, coteB].every((c) => Number.isFinite(c) && c > 1)) return null;
    const inv = [1 / coteA, 1 / coteN, 1 / coteB];
    const total = inv[0] + inv[1] + inv[2];
    return { pA: inv[0] / total, pN: inv[1] / total, pB: inv[2] / total, marge: total - 1 };
  }

  /**
   * Cherche les buts attendus de chaque équipe qui redonnent les probabilités des cotes.
   * Deux inconnues : le total de buts (règle les nuls) et la part de A (règle l'écart A/B).
   */
  function forcesDepuisCotes(coteA, coteN, coteB) {
    const cible = probasDepuisCotes(coteA, coteN, coteB);
    if (!cible) return null;
    const ratio = cible.pA / (cible.pA + cible.pB);
    const evaluer = (mu, part) => probasInitiales({ lamA: mu * part, lamB: mu * (1 - part) });

    const partPour = (mu) => {
      let bas = 0.02;
      let haut = 0.98;
      for (let i = 0; i < 14; i++) {
        const milieu = (bas + haut) / 2;
        const p = evaluer(mu, milieu);
        if (p.pA / (p.pA + p.pB) < ratio) bas = milieu;
        else haut = milieu;
      }
      return (bas + haut) / 2;
    };

    let basMu = 0.8;
    let hautMu = 5.5;
    for (let i = 0; i < 12; i++) {
      const mu = (basMu + hautMu) / 2;
      const p = evaluer(mu, partPour(mu));
      if (p.pN > cible.pN) basMu = mu; // trop de nuls : il faut plus de buts
      else hautMu = mu;
    }
    const mu = (basMu + hautMu) / 2;
    const part = partPour(mu);
    return { lamA: mu * part, lamB: mu * (1 - part), cible };
  }

  const LIBELLES_NIVEAU = [
    [2000, 'Élite mondiale'],
    [1850, 'Très haut niveau'],
    [1750, 'Haut niveau'],
    [1650, 'Bon niveau'],
    [1550, 'Niveau moyen'],
    [1450, 'Niveau modeste'],
    [-Infinity, 'Niveau faible'],
  ];
  const libelleNiveau = (n) => LIBELLES_NIVEAU.find(([seuil]) => n >= seuil)[1];

  // ---------------------------------------------------------------------------
  // État du match à une minute donnée, d'après le journal des événements
  // ---------------------------------------------------------------------------

  /** Un événement : { t: 'but' | 'rouge' | 'cadre' | 'hors', eq: 'A' | 'B', min: nombre } */
  function etatA(evenements, minute) {
    const e = { butsA: 0, butsB: 0, rougesA: 0, rougesB: 0, cadresA: 0, cadresB: 0, horsA: 0, horsB: 0 };
    for (const v of evenements) {
      if (v.min > minute) continue;
      const cle = { but: 'buts', rouge: 'rouges', cadre: 'cadres', hors: 'hors' }[v.t] + v.eq;
      e[cle] += 1;
    }
    return e;
  }

  const multEcart = (ecart) => {
    const n = Math.min(Math.abs(ecart), 3);
    if (ecart > 0) return 1 - P.ECART_MENE * n;
    if (ecart < 0) return 1 + P.ECART_MENEE * n;
    return 1;
  };
  const multRouges = (propres, adverses) =>
    Math.pow(P.ROUGE_PROPRE, Math.min(propres, 3)) * Math.pow(P.ROUGE_ADVERSE, Math.min(adverses, 3));

  /** Buts attendus de chaque équipe depuis le coup d'envoi jusqu'à `minute`, selon l'état réel du match. */
  function butsAttendusJusqua(forces, evenements, minute) {
    const tries = evenements.filter((v) => v.t === 'but' || v.t === 'rouge').sort((x, y) => x.min - y.min);
    const total = { A: 0, B: 0 };
    if (minute <= 0) return total;
    const n = Math.ceil(minute / P.PAS);
    const dt = minute / n;
    const etat = { butsA: 0, butsB: 0, rougesA: 0, rougesB: 0 };
    let i = 0;
    for (let k = 0; k < n; k++) {
      const t0 = k * dt;
      while (i < tries.length && tries[i].min <= t0) {
        const v = tries[i++];
        etat[(v.t === 'but' ? 'buts' : 'rouges') + v.eq] += 1;
      }
      const f = intensite(t0 + dt / 2) / NORME;
      const ecart = etat.butsA - etat.butsB;
      total.A += forces.lamA * f * multEcart(ecart) * multRouges(etat.rougesA, etat.rougesB) * dt;
      total.B += forces.lamB * f * multEcart(-ecart) * multRouges(etat.rougesB, etat.rougesA) * dt;
    }
    return total;
  }

  /** Facteur de niveau du jour de chaque équipe, d'après ses tirs comparés à ce qu'on attendait. */
  function performances(forces, evenements, minute) {
    const attendu = butsAttendusJusqua(forces, evenements, minute);
    const s = etatA(evenements, minute);
    const xg = (cadres, buts, hors) => P.XG_CADRE * Math.max(cadres, buts) + P.XG_HORS * hors; // un but est au moins un tir cadré
    const mult = (x, att) => bornes((P.CONFIANCE_AVANT_MATCH + x) / (P.CONFIANCE_AVANT_MATCH + att), P.PERF_MIN, P.PERF_MAX);
    return {
      perfA: mult(xg(s.cadresA, s.butsA, s.horsA), attendu.A),
      perfB: mult(xg(s.cadresB, s.butsB, s.horsB), attendu.B),
    };
  }

  // ---------------------------------------------------------------------------
  // Le calcul : déroulement du reste du match
  // ---------------------------------------------------------------------------

  /**
   * Loi des buts marqués d'ici la fin, pour chaque équipe, en suivant le score à chaque pas.
   * Renvoie la matrice p[a][b] (probabilité que A marque a buts et B b buts d'ici la fin)
   * ainsi que la probabilité que le prochain but soit pour A ou pour B.
   */
  function derouler(forces, etat, minute, perfA = 1, perfB = 1) {
    const reste = Math.max(P.FIN - minute, P.DUREE_MIN);
    const n = Math.ceil(reste / P.PAS);
    const dt = reste / n;
    const C = P.PLAFOND + 1;
    let cour = new Float64Array(C * C);
    let suiv = new Float64Array(C * C);
    cour[0] = 1;
    let prochainA = 0;
    let prochainB = 0;

    const baseA = (forces.lamA * perfA) / NORME;
    const baseB = (forces.lamB * perfB) / NORME;
    const rA = multRouges(etat.rougesA, etat.rougesB);
    const rB = multRouges(etat.rougesB, etat.rougesA);
    const ecart0 = etat.butsA - etat.butsB;
    const gA = new Float64Array(7); // probabilité qu'A marque pendant un pas, selon l'écart (-3 à +3)
    const gB = new Float64Array(7);

    for (let k = 0; k < n; k++) {
      const f = intensite(minute + (k + 0.5) * dt);
      for (let e = -3; e <= 3; e++) {
        gA[e + 3] = 1 - Math.exp(-baseA * f * rA * multEcart(e) * dt);
        gB[e + 3] = 1 - Math.exp(-baseB * f * rB * multEcart(-e) * dt);
      }
      suiv.fill(0);
      for (let a = 0; a < C; a++) {
        for (let b = 0; b < C; b++) {
          const p = cour[a * C + b];
          if (p < 1e-14) continue;
          const idx = bornes(ecart0 + a - b, -3, 3) + 3;
          const pa = gA[idx];
          const pb = gB[idx];
          const aSuiv = Math.min(a + 1, C - 1);
          const bSuiv = Math.min(b + 1, C - 1);
          const seulA = p * pa * (1 - pb);
          const seulB = p * (1 - pa) * pb;
          const deux = p * pa * pb;
          suiv[aSuiv * C + b] += seulA;
          suiv[a * C + bSuiv] += seulB;
          suiv[aSuiv * C + bSuiv] += deux;
          suiv[a * C + b] += p - seulA - seulB - deux;
          if (a === 0 && b === 0) {
            prochainA += seulA + (pa + pb > 0 ? (deux * pa) / (pa + pb) : 0);
            prochainB += seulB + (pa + pb > 0 ? (deux * pb) / (pa + pb) : 0);
          }
        }
      }
      [cour, suiv] = [suiv, cour];
    }
    return { p: cour, C, prochainA, prochainB };
  }

  /** Probabilités au coup d'envoi (sans événement), utilisées pour caler les cotes. */
  function probasInitiales(forces) {
    const sansEtat = { butsA: 0, butsB: 0, rougesA: 0, rougesB: 0 };
    const { p, C } = derouler(forces, sansEtat, 0);
    let pA = 0;
    let pN = 0;
    let pB = 0;
    for (let a = 0; a < C; a++) {
      for (let b = 0; b < C; b++) {
        if (a > b) pA += p[a * C + b];
        else if (a === b) pN += p[a * C + b];
        else pB += p[a * C + b];
      }
    }
    return { pA, pN, pB };
  }

  /**
   * Prévision complète à la minute `minute`, d'après les événements survenus jusque-là.
   * `termine` : le coup de sifflet final a été donné, le résultat est connu.
   */
  function prevoir(forces, evenements, minute, termine = false) {
    const etat = etatA(evenements, minute);
    const ecart = etat.butsA - etat.butsB;

    if (termine) {
      return {
        etat, minute, termine: true,
        pA: ecart > 0 ? 1 : 0, pN: ecart === 0 ? 1 : 0, pB: ecart < 0 ? 1 : 0,
        prochainA: 0, prochainB: 0, aucunBut: 1, resteA: 0, resteB: 0,
        scores: [{ a: etat.butsA, b: etat.butsB, p: 1 }],
        plus25: etat.butsA + etat.butsB >= 3 ? 1 : 0,
        perfA: 1, perfB: 1,
      };
    }

    const { perfA, perfB } = performances(forces, evenements, minute);
    const { p, C, prochainA, prochainB } = derouler(forces, etat, minute, perfA, perfB);
    let pA = 0, pN = 0, pB = 0, resteA = 0, resteB = 0, plus25 = 0;
    const scores = [];
    for (let a = 0; a < C; a++) {
      for (let b = 0; b < C; b++) {
        const q = p[a * C + b];
        if (q === 0) continue;
        const d = ecart + a - b;
        if (d > 0) pA += q; else if (d === 0) pN += q; else pB += q;
        resteA += a * q;
        resteB += b * q;
        if (etat.butsA + etat.butsB + a + b >= 3) plus25 += q;
        scores.push({ a: etat.butsA + a, b: etat.butsB + b, p: q });
      }
    }
    scores.sort((x, y) => y.p - x.p);
    const somme = pA + pN + pB; // proche de 1 : la troncature à PLAFOND buts est négligeable
    return {
      etat, minute, termine: false,
      pA: pA / somme, pN: pN / somme, pB: pB / somme,
      prochainA, prochainB, aucunBut: Math.max(0, 1 - prochainA - prochainB),
      resteA, resteB,
      scores: scores.slice(0, 5),
      plus25: plus25 / somme,
      perfA, perfB,
    };
  }

  /**
   * Prévision à chaque minute entière de 0 à `jusqua` : de quoi tracer la courbe du match.
   * `cache` (un Map) évite de refaire les calculs des minutes dont rien n'a changé.
   * `fin` : minute du coup de sifflet final (ou null) ; à partir de là le résultat est connu.
   */
  function serie(forces, evenements, jusqua, cache = new Map(), fin = null) {
    const points = [];
    const tri = evenements.slice().sort((x, y) => x.min - y.min);
    const cleForces = forces.lamA.toFixed(5) + '/' + forces.lamB.toFixed(5);
    for (let m = 0; m <= jusqua; m++) {
      const termine = fin !== null && m >= fin;
      const passes = tri.filter((v) => v.min <= m);
      const cle = cleForces + '|' + m + '|' + (termine ? 'fin' : '') + '|' + passes.map((v) => v.t + v.eq + v.min).join(',');
      let pt = cache.get(cle);
      if (!pt) {
        const r = prevoir(forces, tri, m, termine);
        pt = { minute: m, pA: r.pA, pN: r.pN, pB: r.pB };
        cache.set(cle, pt);
      }
      points.push(pt);
    }
    return points;
  }

  // ---------------------------------------------------------------------------
  // Simulation d'un match (démonstration)
  // ---------------------------------------------------------------------------

  /** Générateur pseudo-aléatoire reproductible (pour les tests et l'exemple). */
  function generateur(graine) {
    let a = graine >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function poisson(lambda, alea) {
    const seuil = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= alea();
    } while (p > seuil);
    return k - 1;
  }

  /** Niveau réel du jour de chaque équipe, caché : le modèle ne le connaît pas et doit le deviner. */
  function niveauxDuJour(alea) {
    const gauss = () => Math.sqrt(-2 * Math.log(1 - alea())) * Math.cos(2 * Math.PI * alea());
    return { A: Math.exp(P.DISPERSION_NIVEAU * gauss()), B: Math.exp(P.DISPERSION_NIVEAU * gauss()) };
  }

  /** Événements survenus pendant la minute `minute` (entre minute-1 et minute). */
  function simulerMinute(forces, evenements, minute, alea, niveauDuJour) {
    const etat = etatA(evenements, minute - 1);
    const ecart = etat.butsA - etat.butsB;
    const f = intensite(minute - 0.5) / NORME;
    const taux = {
      A: forces.lamA * f * niveauDuJour.A * multEcart(ecart) * multRouges(etat.rougesA, etat.rougesB),
      B: forces.lamB * f * niveauDuJour.B * multEcart(-ecart) * multRouges(etat.rougesB, etat.rougesA),
    };
    const nouveaux = [];
    for (const eq of ['A', 'B']) {
      const tirsCadres = poisson(taux[eq] / P.XG_CADRE, alea);
      for (let i = 0; i < tirsCadres; i++) {
        nouveaux.push({ t: alea() < P.XG_CADRE ? 'but' : 'cadre', eq, min: minute });
      }
      const tirsHors = poisson((P.HORS_PAR_CADRE * taux[eq]) / P.XG_CADRE, alea);
      for (let i = 0; i < tirsHors; i++) nouveaux.push({ t: 'hors', eq, min: minute });
      if (alea() < P.ROUGE_PAR_MATCH / P.FIN) nouveaux.push({ t: 'rouge', eq, min: minute });
    }
    return nouveaux;
  }

  return {
    PARAMS: P,
    forcesDepuisNiveaux, forcesDepuisCotes, probasDepuisCotes, libelleNiveau,
    etatA, prevoir, serie, probasInitiales,
    generateur, niveauxDuJour, simulerMinute,
  };
});
