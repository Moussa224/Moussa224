/*
 * Évaluation de modele.js sur de vrais matchs, sans triche.
 *
 * Test croisé : les réglages (moment, score, cartons) sont appris sur deux championnats puis testés sur
 * les deux autres, et inversement. L'avant-match de chaque match est une force d'équipe estimée sans lui.
 * À chaque minute de contrôle, la prévision est comparée au résultat final.
 *
 * Lancer :  node prediction-match/validation/evaluer.js   (après extraire.py et regression.py)
 */
const fs = require('fs');
const path = require('path');
const M = require('../modele.js');

const DONNEES = path.join(__dirname, 'donnees');
const D = JSON.parse(fs.readFileSync(path.join(DONNEES, 'matchs_condenses.json')));
const PRIORS = JSON.parse(fs.readFileSync(path.join(DONNEES, 'priors_oof.json')));
const GLM = JSON.parse(fs.readFileSync(path.join(DONNEES, 'params_glm.json')));
const BASE = JSON.parse(JSON.stringify(M.PARAMS));
const JALONS = [10, 20, 30, 45, 60, 70, 80, 85, 90];
const ARRETS = 3.8; // arrêts de jeu moyens de la 2e période dans ces données de 2015/16 (5 min dans l'application, pour les matchs récents)
const CADRE = new Set(['Goal', 'Saved', 'Saved to Post']);

/** Journal de l'application pour un vrai match : minute affichée = minute entamée. */
function journal(m) {
  const minute = (p, t) => (p === 1 ? Math.min(45, Math.max(1, Math.ceil(t))) : Math.max(46, Math.ceil(t)));
  return [
    ...m.buts.map((b) => ({ t: 'but', eq: b.eq, min: minute(b.p, b.t) })),
    ...m.rouges.map((r) => ({ t: 'rouge', eq: r.eq, min: minute(r.p, r.t) })),
    ...m.tirs.map((s) => ({ t: CADRE.has(s.issue) ? 'cadre' : 'hors', eq: s.eq, min: minute(s.p, s.t) })),
  ];
}
const issue = (m) => (m.score[0] > m.score[1] ? 0 : m.score[0] === m.score[1] ? 1 : 2);

function reglages(g) {
  Object.assign(M.PARAMS, JSON.parse(JSON.stringify(BASE)));
  if (g) {
    const c = Object.fromEntries(g.noms.map((n, i) => [n, g.coef[i]]));
    M.PARAMS.PENTE_TEMPS = g.c;
    M.PARAMS.MENE = [1, Math.exp(c['mène 1']), Math.exp(c['mène 2+'])];
    M.PARAMS.MENEE = [1, Math.exp(c['mené 1']), Math.exp(c['mené 2+'])];
    M.PARAMS.ROUGE_PROPRE = [1, Math.exp(c['équipe à 10']), BASE.ROUGE_PROPRE[2]];
    M.PARAMS.ROUGE_ADVERSE = [1, Math.exp(c['adversaire à 10']), BASE.ROUGE_ADVERSE[2]];
  }
  M.recalibrer();
}
function sansReglage() {
  Object.assign(M.PARAMS, JSON.parse(JSON.stringify(BASE)), {
    PENTE_TEMPS: 0, MENE: [1, 1, 1], MENEE: [1, 1, 1], ROUGE_PROPRE: [1, 1, 1], ROUGE_ADVERSE: [1, 1, 1], POIDS_TIR: 0,
  });
  M.recalibrer();
}

const mh = D.reduce((s, m) => s + m.score[0], 0) / D.length;
const ma = D.reduce((s, m) => s + m.score[1], 0) / D.length;

function lignes(filtre, { moyennes = false } = {}) {
  const out = [];
  for (const m of D.filter(filtre)) {
    const [lamA, lamB] = moyennes ? [mh, ma] : PRIORS[m.id];
    const forces = { lamA, lamB, arrets2: ARRETS };
    const ev = journal(m);
    const o = issue(m);
    for (const T of JALONS) {
      const r = M.prevoir(forces, ev, T);
      out.push({ T, o, p: [r.pA, r.pN, r.pB], rouge: m.rouges.some((x) => Math.ceil(x.t) <= T) });
    }
  }
  return out;
}

const ll = (l) => -Math.log(Math.max(l.p[l.o], 1e-6));
const brier = (l) => l.p.reduce((s, x, i) => s + (x - (i === l.o ? 1 : 0)) ** 2, 0);
const moy = (a, f) => a.reduce((s, x) => s + f(x), 0) / a.length;
const duPremierGroupe = (m) => ['PL1516', 'LL1516'].includes(m.saison);

// Réglages appris sur un groupe de championnats, test sur l'autre
const plis = [['PLLL', (m) => !duPremierGroupe(m)], ['SAL1', duPremierGroupe]];
let modele = [], neutre = [], moyennesLignes = [];
for (const [appris, filtreTest] of plis) {
  reglages(GLM[appris]);
  modele = modele.concat(lignes(filtreTest));
  moyennesLignes = moyennesLignes.concat(lignes(filtreTest, { moyennes: true }));
  sansReglage();
  neutre = neutre.concat(lignes(filtreTest));
}
reglages(null);

console.log(`TEST CROISÉ : ${D.length} vrais matchs, chacun prédit une fois par des réglages appris sur d'autres championnats\n`);
console.log('Qualité des prévisions à chaque minute de contrôle (plus petit = mieux)');
console.log('minute | log-loss sans réglage | log-loss modèle | Brier modèle | issue la plus probable juste | prévisions ≥ 80 % justes');
for (const T of JALONS) {
  const a = modele.filter((l) => l.T === T);
  const b = neutre.filter((l) => l.T === T);
  const sures = a.filter((l) => Math.max(...l.p) >= 0.8);
  const juste = sures.filter((l) => l.p.indexOf(Math.max(...l.p)) === l.o).length;
  const favori = a.filter((l) => l.p.indexOf(Math.max(...l.p)) === l.o).length;
  console.log(
    `${String(T).padStart(5)} | ${moy(b, ll).toFixed(4).padStart(21)} | ${moy(a, ll).toFixed(4).padStart(15)} | ${moy(a, brier).toFixed(4).padStart(12)} | ${((favori / a.length) * 100).toFixed(1).padStart(24)} % | ${sures.length ? ((juste / sures.length) * 100).toFixed(1) + ' % sur ' + sures.length : '—'}`
  );
}

const rouges = modele.filter((l) => l.rouge);
const rougesN = neutre.filter((l) => l.rouge);
console.log(`\nMatchs où un carton rouge est déjà tombé (n=${rouges.length}) : log-loss ${moy(rougesN, ll).toFixed(4)} sans réglage → ${moy(rouges, ll).toFixed(4)} avec le modèle`);

console.log('\nValeur du niveau des équipes connu avant le match (log-loss, plus petit = mieux)');
console.log('minute | niveau connu | équipes supposées égales');
for (const T of [10, 30, 45, 60, 70, 85]) {
  console.log(`${String(T).padStart(5)} | ${moy(modele.filter((l) => l.T === T), ll).toFixed(4).padStart(12)} | ${moy(moyennesLignes.filter((l) => l.T === T), ll).toFixed(4).padStart(24)}`);
}

console.log('\nFiabilité : quand le modèle annonce X %, combien de fois cela arrive-t-il ? (minutes 30 à 85, les 3 issues)');
const cases = Array.from({ length: 10 }, () => ({ n: 0, p: 0, o: 0 }));
for (const l of modele.filter((x) => x.T >= 30 && x.T <= 85)) {
  l.p.forEach((p, i) => {
    const c = cases[Math.min(9, Math.floor(p * 10))];
    c.n++; c.p += p; c.o += i === l.o ? 1 : 0;
  });
}
let ecart = 0, total = 0;
console.log('  annoncé  | observé  | nombre de prévisions');
for (const c of cases) {
  if (!c.n) continue;
  ecart += Math.abs(c.p / c.n - c.o / c.n) * c.n; total += c.n;
  console.log(`  ${((c.p / c.n) * 100).toFixed(1).padStart(6)} % | ${((c.o / c.n) * 100).toFixed(1).padStart(6)} % | ${String(c.n).padStart(6)}`);
}
console.log(`  écart moyen entre annoncé et observé : ${((ecart / total) * 100).toFixed(2)} points`);
