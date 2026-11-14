/*
 * Tests du moteur de prédiction. Lancer avec :  node --test prediction-match/test-modele.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./modele.js');

const proche = (a, b, tolerance, message) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${message || ''} attendu ${b} ± ${tolerance}, obtenu ${a}`);
const elo = (ecart) => 1 / (1 + Math.pow(10, -ecart / 400));
const somme3 = (r) => r.pA + r.pN + r.pB;
const egaux = { lamA: 1.3, lamB: 1.3 };

test('les trois probabilités font toujours 100 %', () => {
  for (const minute of [0, 20, 45, 70, 89, 93]) {
    const r = M.prevoir(egaux, [{ t: 'but', eq: 'A', min: 10 }, { t: 'rouge', eq: 'B', min: 15 }], minute);
    proche(somme3(r), 1, 1e-9, `minute ${minute}`);
  }
});

test('deux équipes identiques sur terrain neutre : chances égales', () => {
  const forces = M.forcesDepuisNiveaux({ niveauA: 1700, niveauB: 1700, terrain: 'N' });
  const r = M.prevoir(forces, [], 0);
  proche(r.pA, r.pB, 1e-9);
  assert.ok(r.pN > 0.2 && r.pN < 0.35, `part de nuls plausible, obtenu ${r.pN}`);
});

test("l'échelle Elo est respectée : 100 points d'écart donnent environ 64 % de points attendus", () => {
  for (const ecart of [50, 100, 200, 300, 400]) {
    const forces = M.forcesDepuisNiveaux({ niveauA: 1500 + ecart, niveauB: 1500, terrain: 'N' });
    const p = M.probasInitiales(forces);
    proche(p.pA + p.pN / 2, elo(ecart), 0.015, `écart ${ecart}`);
  }
});

test("jouer à domicile avantage l'équipe, et seulement elle", () => {
  const base = { niveauA: 1700, niveauB: 1700 };
  const chezA = M.probasInitiales(M.forcesDepuisNiveaux({ ...base, terrain: 'A' }));
  const neutre = M.probasInitiales(M.forcesDepuisNiveaux({ ...base, terrain: 'N' }));
  const chezB = M.probasInitiales(M.forcesDepuisNiveaux({ ...base, terrain: 'B' }));
  assert.ok(chezA.pA > neutre.pA && neutre.pA > chezB.pA);
});

test('la probabilité de gagner de A monte avec son avance au score, à minute égale', () => {
  const avec = (buts) => {
    const evts = [];
    for (let i = 0; i < buts; i++) evts.push({ t: 'but', eq: 'A', min: 10 + i });
    return M.prevoir(egaux, evts, 60).pA;
  };
  const [a0, a1, a2, a3] = [0, 1, 2, 3].map(avec);
  assert.ok(a0 < a1 && a1 < a2 && a2 < a3);
});

test('une équipe qui mène 1-0 à la 85e gagne très probablement', () => {
  const r = M.prevoir(egaux, [{ t: 'but', eq: 'A', min: 30 }], 85);
  assert.ok(r.pA > 0.88, `pA=${r.pA}`);
});

test('0-0 dans les arrêts de jeu : le nul est quasi certain', () => {
  const r = M.prevoir(egaux, [], 92);
  assert.ok(r.pN > 0.9, `pN=${r.pN}`);
});

test('un carton rouge fait baisser les chances de l\'équipe réduite à 10', () => {
  const sans = M.prevoir(egaux, [], 30);
  const avec = M.prevoir(egaux, [{ t: 'rouge', eq: 'A', min: 30 }], 30);
  assert.ok(avec.pA < sans.pA - 0.08, `${avec.pA} contre ${sans.pA}`);
  assert.ok(avec.pB > sans.pB + 0.08);
});

test('plus de tirs cadrés pour A : sa prévision monte, celle de B baisse (effet modéré)', () => {
  const evts = [];
  for (let m = 5; m <= 55; m += 5) evts.push({ t: 'cadre', eq: 'A', min: m });
  evts.push({ t: 'cadre', eq: 'B', min: 40 });
  const sans = M.prevoir(egaux, [], 60);
  const avec = M.prevoir(egaux, evts, 60);
  assert.ok(avec.pA > sans.pA + 0.02, 'les tirs comptent');
  assert.ok(avec.pA < sans.pA + 0.2, 'mais ils ne remplacent pas le score');
  assert.ok(avec.perfA > 1 && avec.perfB < 1);
});

test('un but compte au moins comme un tir cadré (pas de double comptage si on saisit les deux)', () => {
  const seulBut = M.prevoir(egaux, [{ t: 'but', eq: 'A', min: 20 }], 40);
  const butEtTir = M.prevoir(egaux, [{ t: 'but', eq: 'A', min: 20 }, { t: 'cadre', eq: 'A', min: 20 }], 40);
  proche(seulBut.perfA, butEtTir.perfA, 1e-9);
});

test('le prochain but : probabilités cohérentes avec les buts attendus', () => {
  const r = M.prevoir({ lamA: 2.0, lamB: 0.8 }, [], 0);
  proche(r.prochainA + r.prochainB + r.aucunBut, 1, 1e-9);
  assert.ok(r.prochainA > r.prochainB);
  // sans aucun but, c'est environ le rapport des taux : 2.0 / 2.8 = 71 % des matchs avec but
  proche(r.prochainA / (r.prochainA + r.prochainB), 2.0 / 2.8, 0.03);
});

test('les scores finaux probables sont triés et incluent le score actuel', () => {
  const r = M.prevoir(egaux, [{ t: 'but', eq: 'A', min: 70 }], 88);
  assert.deepEqual([r.scores[0].a, r.scores[0].b], [1, 0]);
  for (let i = 1; i < r.scores.length; i++) assert.ok(r.scores[i - 1].p >= r.scores[i].p);
  assert.ok(r.scores.every((s) => s.a >= 1 && s.b >= 0), 'on ne peut pas redescendre sous le score actuel');
});

test('coup de sifflet final : le résultat est certain', () => {
  const r = M.prevoir(egaux, [{ t: 'but', eq: 'B', min: 50 }], 90, true);
  assert.deepEqual([r.pA, r.pN, r.pB], [0, 0, 1]);
});

test('les cotes redonnent les probabilités implicites, marge retirée', () => {
  const cible = M.probasDepuisCotes(2.1, 3.4, 3.6);
  proche(somme3({ pA: cible.pA, pN: cible.pN, pB: cible.pB }), 1, 1e-12);
  for (const cotes of [[2.1, 3.4, 3.6], [1.35, 5.2, 9.5], [3.9, 3.3, 2.0], [2.6, 2.9, 2.8]]) {
    const forces = M.forcesDepuisCotes(...cotes);
    const vise = M.probasDepuisCotes(...cotes);
    const obtenu = M.probasInitiales(forces);
    proche(obtenu.pA, vise.pA, 0.005, `A pour ${cotes}`);
    proche(obtenu.pN, vise.pN, 0.005, `nul pour ${cotes}`);
    proche(obtenu.pB, vise.pB, 0.005, `B pour ${cotes}`);
  }
});

test('des cotes invalides sont refusées', () => {
  assert.equal(M.forcesDepuisCotes(1, 3, 3), null);
  assert.equal(M.forcesDepuisCotes(NaN, 3, 3), null);
  assert.equal(M.forcesDepuisCotes(2, 3, 'x'), null);
});

test("la série tracée a une valeur par minute et part de la prévision d'avant-match", () => {
  const s = M.serie(egaux, [], 45);
  assert.equal(s.length, 46);
  const r0 = M.prevoir(egaux, [], 0);
  proche(s[0].pA, r0.pA, 1e-12);
  const cache = new Map();
  const evts = [{ t: 'but', eq: 'A', min: 20 }];
  const x = M.serie(egaux, evts, 30, cache);
  const y = M.serie(egaux, evts, 30, cache);
  assert.deepEqual(x, y);
  assert.ok(x[19].pA < x[20].pA, 'le but de la 20e minute fait monter A');
});

test("le journal est lu dans l'ordre des minutes, pas dans l'ordre de saisie", () => {
  const a = M.prevoir(egaux, [{ t: 'but', eq: 'A', min: 50 }, { t: 'but', eq: 'B', min: 10 }], 60);
  const b = M.prevoir(egaux, [{ t: 'but', eq: 'B', min: 10 }, { t: 'but', eq: 'A', min: 50 }], 60);
  proche(a.pA, b.pA, 1e-12);
});

test('simulation : sur de nombreux matchs, les résultats collent aux probabilités d\'avant-match', () => {
  const forces = M.forcesDepuisNiveaux({ niveauA: 1800, niveauB: 1650, terrain: 'A' });
  const avant = M.prevoir(forces, [], 0);
  const alea = M.generateur(2024);
  const N = 4000;
  const compte = { A: 0, N: 0, B: 0 };
  for (let i = 0; i < N; i++) {
    const evts = [];
    const jour = M.niveauxDuJour(alea);
    for (let m = 1; m <= 94; m++) evts.push(...M.simulerMinute(forces, evts, m, alea, jour));
    const e = M.etatA(evts, 94);
    compte[e.butsA > e.butsB ? 'A' : e.butsA === e.butsB ? 'N' : 'B']++;
  }
  proche(compte.A / N, avant.pA, 0.03, 'victoires A');
  proche(compte.N / N, avant.pN, 0.03, 'nuls');
  proche(compte.B / N, avant.pB, 0.03, 'victoires B');
});

test("calibration en cours de match : à 60' et à égalité, les prévisions annoncées se réalisent", () => {
  const forces = { lamA: 1.5, lamB: 1.1 };
  const alea = M.generateur(7);
  const N = 3000;
  let somme = 0;
  let victoires = 0;
  let cas = 0;
  for (let i = 0; i < N; i++) {
    const evts = [];
    const jour = M.niveauxDuJour(alea);
    for (let m = 1; m <= 94; m++) evts.push(...M.simulerMinute(forces, evts, m, alea, jour));
    const e60 = M.etatA(evts, 60);
    if (e60.butsA !== e60.butsB) continue; // on ne garde que les matchs à égalité à la 60e
    cas++;
    somme += M.prevoir(forces, evts, 60).pA;
    const f = M.etatA(evts, 94);
    if (f.butsA > f.butsB) victoires++;
  }
  assert.ok(cas > 500, `assez de cas (${cas})`);
  proche(victoires / cas, somme / cas, 0.04, 'fréquence de victoire de A contre prévision moyenne');
});

test('le calcul est rapide (une prévision en moins de 5 ms)', () => {
  const t = Date.now();
  for (let i = 0; i < 100; i++) M.prevoir(egaux, [{ t: 'but', eq: 'A', min: 30 }], 45);
  assert.ok((Date.now() - t) / 100 < 5);
});
