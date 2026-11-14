/*
 * Moteur de prédiction d'un match de football en cours de jeu.
 *
 * Principe : chaque équipe marque selon un « taux de buts » par minute. Ce taux part d'un
 * niveau d'avant-match (cotes des bookmakers ou points Elo), puis il est corrigé en direct par :
 *   - le moment du match (un peu plus de buts en fin de match qu'au début) et les arrêts de jeu,
 *   - le score (un match n'est pas aussi fermé quand le score est déjà ouvert),
 *   - les cartons rouges (le plus gros effet : 10 contre 11),
 *   - les tirs (une équipe qui domine a probablement un meilleur niveau du jour que prévu).
 *
 * À chaque instant, on déroule le reste du match demi-minute par demi-minute, en suivant toutes
 * les suites possibles de buts. On en tire la probabilité de victoire de chaque équipe, de match
 * nul, du prochain but, les scores finaux probables, etc.
 *
 * Les réglages de la section PARAMS ont été mesurés sur 1 517 matchs réels (voir validation/).
 *
 * Ce fichier ne dépend de rien : il s'utilise dans la page web et dans Node (tests).
 */
(function (racine, fabrique) {
  if (typeof module === 'object' && module.exports) module.exports = fabrique();
  else racine.Modele = fabrique();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Réglages du modèle.
  // « Mesuré » : estimé par régression de Poisson sur 1 517 matchs de Premier League, Liga,
  // Serie A et Ligue 1 (saison 2015/16, données StatsBomb), voir validation/README.md.
  // ---------------------------------------------------------------------------
  const P = {
    // Durée du match
    ARRETS_1: 2.0, // arrêts de jeu de la 1re période, en minutes (matchs récents : 2 à 4)
    ARRETS_2: 5.0, // arrêts de jeu attendus en 2e période (matchs récents : 4 à 7) ; réglable dans l'application
    DUREE_MIN: 1.5, // temps restant minimal une fois les arrêts de jeu annoncés dépassés
    PAS: 0.5, // pas de calcul, en minutes
    PLAFOND: 10, // buts maximum pris en compte sur le reste du match, par équipe

    // Niveau d'avant-match
    BUTS_MOYENS: 2.6, // buts par match, les deux équipes ensemble (mesuré : 2,63)
    AVANTAGE_DOMICILE: 75, // points Elo donnés à l'équipe qui joue chez elle
    // Part des buts d'A = logistique(PENTE_ELO × écart Elo / 400). Calibrée pour retrouver les chances
    // Elo habituelles (100 points d'écart = 64 % de points attendus, victoire = 1, nul = 0,5).
    PENTE_ELO: 2.0,

    // Moment du match : intensité 1 + PENTE_TEMPS × (minute/90 − 0,5). Mesuré : 0,26 à 0,30.
    PENTE_TEMPS: 0.28,

    // Effet du score, par rapport à un match à égalité (mesuré). Indexé par l'écart, plafonné à 2.
    // Les deux équipes marquent un peu plus quand le score est ouvert ; l'équipe menée un peu plus encore.
    MENE: [1, 1.06, 1.07],
    MENEE: [1, 1.08, 1.15],

    // Effet des cartons rouges, selon l'écart net de cartons (mesuré : ×0,60 et ×1,70, légèrement ramenés vers 1).
    // Au-delà d'un carton d'écart, très peu de matchs : valeurs prudentes, non mesurées.
    ROUGE_PROPRE: [1, 0.62, 0.45], // l'équipe qui a des joueurs en moins
    ROUGE_ADVERSE: [1, 1.65, 2.2], // l'équipe qui a des joueurs en plus

    // Tirs. Chaque tir, cadré ou non, vaut environ 0,105 but d'« évidence » sur le niveau du jour
    // (mesuré : les tirs non cadrés informent autant que les cadrés). CONFIANCE : poids de l'avant-match,
    // en buts équivalents (mesuré : 4,5, pente de contrôle 1,00 ± 0,26).
    POIDS_TIR: 0.105,
    CONFIANCE: 4.5,
    PERF_MIN: 0.6,
    PERF_MAX: 1.7,

    // Simulation (démonstration)
    ROUGE_PAR_MATCH: 0.1, // cartons rouges par équipe et par match (mesuré : 0,14 dans les 4 championnats)
    TIRS_CADRES: 0.337, // part des tirs qui sont cadrés (mesuré : 33,7 %)
    DISPERSION_NIVEAU: 0.2, // le vrai niveau du jour s'écarte du niveau annoncé de ±20 %
  };

  const bornes = (x, bas, haut) => Math.min(haut, Math.max(bas, x));

  // Intensité des buts selon la minute (1 au milieu du match).
  const intensite = (t) => 1 + P.PENTE_TEMPS * (Math.min(t, 90) / 90 - 0.5);

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
    const forces = { lamA: mu * part, lamB: mu * (1 - part) };
    // Contrôle : le modèle ne peut pas reproduire des cotes irréalistes (par exemple un nul à 9 % entre
    // deux équipes équilibrées). `ecart` est le plus grand écart restant sur les trois probabilités.
    const obtenu = probasInitiales(forces);
    const ecart = Math.max(Math.abs(obtenu.pA - cible.pA), Math.abs(obtenu.pN - cible.pN), Math.abs(obtenu.pB - cible.pB));
    return { ...forces, cible, ecart };
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

  const multScore = (ecart) => {
    const n = Math.min(Math.abs(ecart), 2);
    return ecart > 0 ? P.MENE[n] : ecart < 0 ? P.MENEE[n] : 1;
  };
  const multRouges = (propres, adverses) => {
    const net = propres - adverses;
    const n = Math.min(Math.abs(net), 2);
    return net > 0 ? P.ROUGE_PROPRE[n] : net < 0 ? P.ROUGE_ADVERSE[n] : 1;
  };

  // ---------------------------------------------------------------------------
  // Ligne de temps du match : 0 → 45, arrêts de jeu de la 1re période (comptés à 45'),
  // 45 → 90, arrêts de jeu de la 2e période. À 45', les arrêts de jeu de la 1re période sont écoulés.
  // ---------------------------------------------------------------------------

  /** Pas de calcul du temps restant à partir de `minute` : [{ dt, f }]. */
  function tempsRestant(minute, arrets2) {
    const pas = [];
    const regulier = (a, b) => {
      if (b - a < 1e-9) return;
      const n = Math.ceil((b - a) / P.PAS);
      const dt = (b - a) / n;
      for (let k = 0; k < n; k++) pas.push({ dt, f: intensite(a + (k + 0.5) * dt) });
    };
    const arret = (duree, ancre) => {
      const n = Math.ceil(duree / P.PAS);
      for (let k = 0; k < n; k++) pas.push({ dt: duree / n, f: intensite(ancre) });
    };
    if (minute < 45) {
      regulier(minute, 45);
      arret(P.ARRETS_1, 45);
    }
    if (minute < 90) regulier(Math.max(minute, 45), 90);
    arret(minute < 90 ? arrets2 : Math.max(arrets2 - (minute - 90), P.DUREE_MIN), 90);
    return pas;
  }

  /** Pas de calcul du temps déjà joué, du coup d'envoi à `minute` : [{ t0, dt, f }]. */
  function tempsEcoule(minute) {
    const pas = [];
    const regulier = (a, b) => {
      if (b - a < 1e-9) return;
      const n = Math.ceil((b - a) / P.PAS);
      const dt = (b - a) / n;
      for (let k = 0; k < n; k++) pas.push({ t0: a + k * dt, dt, f: intensite(a + (k + 0.5) * dt) });
    };
    const arret = (duree, ancre, t0Fixe) => {
      const n = Math.ceil(duree / P.PAS);
      const dt = duree / n;
      for (let k = 0; k < n; k++) pas.push({ t0: t0Fixe === null ? ancre + k * dt : t0Fixe, dt, f: intensite(ancre) });
    };
    regulier(0, Math.min(minute, 45));
    if (minute >= 45) arret(P.ARRETS_1, 45, 45 - 1e-6);
    if (minute > 45) regulier(45, Math.min(minute, 90));
    if (minute > 90) arret(minute - 90, 90, null);
    return pas;
  }

  // ---------------------------------------------------------------------------
  // Normalisation : « buts par match » garde son sens
  // ---------------------------------------------------------------------------

  /**
   * Coefficient qui fait que, pour des équipes de référence, le nombre de buts attendus au coup d'envoi
   * (en tenant compte du score qui évolue) est bien égal aux buts attendus donnés (lamA + lamB).
   */
  let kappaMemo = null;
  function kappa() {
    if (kappaMemo !== null) return kappaMemo;
    const ref = { lamA: 1.45, lamB: 1.15 };
    const sansEtat = { butsA: 0, butsB: 0, rougesA: 0, rougesB: 0 };
    let k = 1;
    for (let i = 0; i < 8; i++) {
      const { p, C } = derouler(ref, sansEtat, 0, 1, 1, k);
      let total = 0;
      for (let a = 0; a < C; a++) for (let b = 0; b < C; b++) total += (a + b) * p[a * C + b];
      k *= (ref.lamA + ref.lamB) / total;
    }
    kappaMemo = k;
    return k;
  }

  /** À appeler après avoir modifié PARAMS (tests, validation) : recalcule la normalisation. */
  function recalibrer() {
    kappaMemo = null;
    return kappa();
  }

  // ---------------------------------------------------------------------------
  // Niveau du jour d'après les tirs
  // ---------------------------------------------------------------------------

  /** Buts attendus de chaque équipe depuis le coup d'envoi jusqu'à `minute`, selon l'état réel du match. */
  function butsAttendusJusqua(forces, evenements, minute) {
    const tries = evenements.filter((v) => v.t === 'but' || v.t === 'rouge').sort((x, y) => x.min - y.min);
    const total = { A: 0, B: 0 };
    const etat = { butsA: 0, butsB: 0, rougesA: 0, rougesB: 0 };
    const k = kappa();
    let i = 0;
    for (const pas of tempsEcoule(minute)) {
      while (i < tries.length && tries[i].min <= pas.t0) {
        const v = tries[i++];
        etat[(v.t === 'but' ? 'buts' : 'rouges') + v.eq] += 1;
      }
      const ecart = etat.butsA - etat.butsB;
      total.A += forces.lamA * k * pas.f * multScore(ecart) * multRouges(etat.rougesA, etat.rougesB) * pas.dt;
      total.B += forces.lamB * k * pas.f * multScore(-ecart) * multRouges(etat.rougesB, etat.rougesA) * pas.dt;
    }
    return total;
  }

  /** Facteur de niveau du jour de chaque équipe, d'après ses tirs comparés à ce qu'on attendait. */
  function performances(forces, evenements, minute) {
    const attendu = butsAttendusJusqua(forces, evenements, minute);
    const s = etatA(evenements, minute);
    // Un but est au moins un tir cadré : saisir le but et le tir ne compte pas deux fois.
    const evidence = (cadres, buts, hors) => P.POIDS_TIR * (Math.max(cadres, buts) + hors);
    const mult = (x, att) => bornes((P.CONFIANCE + x) / (P.CONFIANCE + att), P.PERF_MIN, P.PERF_MAX);
    return {
      perfA: mult(evidence(s.cadresA, s.butsA, s.horsA), attendu.A),
      perfB: mult(evidence(s.cadresB, s.butsB, s.horsB), attendu.B),
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
  function derouler(forces, etat, minute, perfA = 1, perfB = 1, kap = null) {
    const pasRestants = tempsRestant(minute, forces.arrets2 === undefined ? P.ARRETS_2 : forces.arrets2);
    const C = P.PLAFOND + 1;
    let cour = new Float64Array(C * C);
    let suiv = new Float64Array(C * C);
    cour[0] = 1;
    let prochainA = 0;
    let prochainB = 0;

    const k = kap === null ? kappa() : kap;
    const baseA = forces.lamA * perfA * k;
    const baseB = forces.lamB * perfB * k;
    const rA = multRouges(etat.rougesA, etat.rougesB);
    const rB = multRouges(etat.rougesB, etat.rougesA);
    const ecart0 = etat.butsA - etat.butsB;
    const gA = new Float64Array(5); // probabilité qu'A marque pendant un pas, selon l'écart (-2 à +2 ou plus)
    const gB = new Float64Array(5);

    for (const { dt, f } of pasRestants) {
      for (let e = -2; e <= 2; e++) {
        gA[e + 2] = 1 - Math.exp(-baseA * f * rA * multScore(e) * dt);
        gB[e + 2] = 1 - Math.exp(-baseB * f * rB * multScore(-e) * dt);
      }
      suiv.fill(0);
      for (let a = 0; a < C; a++) {
        for (let b = 0; b < C; b++) {
          const p = cour[a * C + b];
          if (p < 1e-14) continue;
          const idx = bornes(ecart0 + a - b, -2, 2) + 2;
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
        plusDe: Array.from({ length: 9 }, (_, k) => (etat.butsA + etat.butsB >= k ? 1 : 0)),
        perfA: 1, perfB: 1,
      };
    }

    const { perfA, perfB } = performances(forces, evenements, minute);
    const { p, C, prochainA, prochainB } = derouler(forces, etat, minute, perfA, perfB);
    let pA = 0, pN = 0, pB = 0, resteA = 0, resteB = 0;
    const totaux = new Float64Array(etat.butsA + etat.butsB + 2 * C); // totaux[t] = probabilité de finir avec t buts au total
    const scores = [];
    for (let a = 0; a < C; a++) {
      for (let b = 0; b < C; b++) {
        const q = p[a * C + b];
        if (q === 0) continue;
        const d = ecart + a - b;
        if (d > 0) pA += q; else if (d === 0) pN += q; else pB += q;
        resteA += a * q;
        resteB += b * q;
        totaux[etat.butsA + etat.butsB + a + b] += q;
        scores.push({ a: etat.butsA + a, b: etat.butsB + b, p: q });
      }
    }
    scores.sort((x, y) => y.p - x.p);
    const somme = pA + pN + pB; // proche de 1 : la troncature à PLAFOND buts est négligeable
    // plusDe[k] = probabilité que le match compte au moins k buts au total (score actuel compris)
    const plusDe = Array.from({ length: 9 }, (_, k) => {
      let moins = 0;
      for (let t = 0; t < k && t < totaux.length; t++) moins += totaux[t];
      return Math.min(1, Math.max(0, 1 - moins / somme));
    });
    return {
      etat, minute, termine: false,
      pA: pA / somme, pN: pN / somme, pB: pB / somme,
      prochainA, prochainB, aucunBut: Math.max(0, 1 - prochainA - prochainB),
      resteA, resteB,
      scores: scores.slice(0, 5),
      plus25: plusDe[3],
      plusDe,
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
    const cleForces = forces.lamA.toFixed(5) + '/' + forces.lamB.toFixed(5) + '/' + (forces.arrets2 === undefined ? '' : forces.arrets2);
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
  // Comparaison avec les cotes d'un bookmaker
  // ---------------------------------------------------------------------------

  /**
   * Compare la probabilité du modèle à une cote décimale.
   * `incertitude` : points de probabilité retirés au modèle par prudence (le modèle peut se tromper).
   * Renvoie la probabilité implicite de la cote, l'espérance de gain par unité misée avec et sans prudence,
   * et une mise prudente (quart de Kelly, plafonnée) en part du capital.
   */
  function comparerCote(probaModele, cote, incertitude = 0.05) {
    if (!(cote > 1) || !Number.isFinite(probaModele)) return null;
    const implicite = 1 / cote;
    const prudente = Math.max(0, probaModele - incertitude);
    const esperance = probaModele * cote - 1;
    const esperancePrudente = prudente * cote - 1;
    const kelly = esperancePrudente > 0 ? esperancePrudente / (cote - 1) : 0; // fraction de Kelly sur la proba prudente
    return {
      implicite, prudente, esperance, esperancePrudente,
      miseConseillee: Math.min(0.02, kelly / 4), // quart de Kelly, jamais plus de 2 % du capital
      ecart: probaModele - implicite,
    };
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
    const f = intensite(minute - 0.5);
    const k = kappa();
    const taux = {
      A: forces.lamA * k * f * niveauDuJour.A * multScore(ecart) * multRouges(etat.rougesA, etat.rougesB),
      B: forces.lamB * k * f * niveauDuJour.B * multScore(-ecart) * multRouges(etat.rougesB, etat.rougesA),
    };
    const nouveaux = [];
    for (const eq of ['A', 'B']) {
      // Tirs au rythme taux / POIDS_TIR ; chacun est un but avec la probabilité POIDS_TIR (le taux de buts est donc respecté)
      const tirs = poisson(taux[eq] / P.POIDS_TIR, alea);
      for (let i = 0; i < tirs; i++) {
        const u = alea();
        if (u < P.POIDS_TIR) nouveaux.push({ t: 'but', eq, min: minute }, { t: 'cadre', eq, min: minute });
        else if (u < P.TIRS_CADRES) nouveaux.push({ t: 'cadre', eq, min: minute });
        else nouveaux.push({ t: 'hors', eq, min: minute });
      }
      if (alea() < P.ROUGE_PAR_MATCH / (90 + P.ARRETS_2)) nouveaux.push({ t: 'rouge', eq, min: minute });
    }
    return nouveaux;
  }

  return {
    PARAMS: P,
    forcesDepuisNiveaux, forcesDepuisCotes, probasDepuisCotes, libelleNiveau,
    etatA, prevoir, serie, probasInitiales, kappa, recalibrer, comparerCote,
    generateur, niveauxDuJour, simulerMinute,
  };
});
