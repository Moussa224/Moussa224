/*
 * Test hors période : le modèle (réglé sur 2015/16) est évalué sur des matchs de 2020 à 2024 qu'il n'a jamais vus.
 *
 * Ces matchs viennent de compétitions où l'on n'a pas le niveau des équipes avant le match (tournois, matchs
 * isolés d'un club). Les équipes sont donc supposées égales : les prévisions du début de match sont forcément
 * moins bonnes. On ne regarde ici que la seconde période, où le niveau d'avant-match compte très peu.
 *
 * Lancer :  python3 prediction-match/validation/extraire.py recents
 *           node prediction-match/validation/evaluer-recents.js
 */
const fs = require('fs');
const path = require('path');
const M = require('../modele.js');

const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'donnees', 'recents_condenses.json')));
const CADRE = new Set(['Goal', 'Saved', 'Saved to Post']);
const JALONS = [60, 70, 80, 85, 90];

const minute = (p, t) => (p === 1 ? Math.min(45, Math.max(1, Math.ceil(t))) : Math.max(46, Math.ceil(t)));
const journal = (m) => [
  ...m.buts.map((b) => ({ t: 'but', eq: b.eq, min: minute(b.p, b.t) })),
  ...m.rouges.map((r) => ({ t: 'rouge', eq: r.eq, min: minute(r.p, r.t) })),
  ...m.tirs.map((s) => ({ t: CADRE.has(s.issue) ? 'cadre' : 'hors', eq: s.eq, min: minute(s.p, s.t) })),
];
const issue = (m) => (m.score[0] > m.score[1] ? 0 : m.score[0] === m.score[1] ? 1 : 2);
const ll = (p, o) => -Math.log(Math.max(p[o], 1e-6));
const brier = (p, o) => p.reduce((s, x, i) => s + (x - (i === o ? 1 : 0)) ** 2, 0);

const matchs = R.filter((m) => m.fins['1'] && m.fins['2']);
const parComp = {};
for (const m of matchs) (parComp[m.saison] = parComp[m.saison] || []).push(m);

console.log(`TEST HORS PÉRIODE : ${matchs.length} matchs de 2020 à 2024, jamais utilisés pour régler le modèle\n`);
console.log('Compétition      | matchs | buts/match | arrêts 1re | arrêts 2e | rouges/match');
for (const [nom, ms] of Object.entries(parComp)) {
  const f = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  console.log(
    `${nom.padEnd(16)} | ${String(ms.length).padStart(6)} | ${f(ms.map((m) => m.score[0] + m.score[1])).toFixed(2).padStart(10)} | ${f(ms.map((m) => m.fins['1'] - 45)).toFixed(1).padStart(8)} min | ${f(ms.map((m) => m.fins['2'] - 90)).toFixed(1).padStart(6)} min | ${f(ms.map((m) => m.rouges.length)).toFixed(2).padStart(10)}`
  );
}
const totalMoyen = matchs.reduce((s, m) => s + m.score[0] + m.score[1], 0) / matchs.length;
const arretsMoyens = matchs.reduce((s, m) => s + m.fins['2'] - 90, 0) / matchs.length;
console.log(`\nEnsemble : ${totalMoyen.toFixed(2)} buts par match, ${arretsMoyens.toFixed(1)} min d'arrêts en 2e période (2015/16 : 2,63 buts, 3,8 min)\n`);

// Forces : équipes égales, total de buts de l'ensemble
const lam = totalMoyen / 2;
const variantes = [
  ['arrêts réglés à 3,8 (valeur de 2015/16)', () => 3.8],
  ['arrêts réglés à 5 (valeur par défaut)', () => 5],
  ['arrêts réglés à la moyenne de la compétition', (m) => parComp[m.saison].reduce((s, x) => s + x.fins['2'] - 90, 0) / parComp[m.saison].length],
  ['arrêts réglés au temps réellement joué (idéal)', (m) => m.fins['2'] - 90],
];
console.log('Qualité des prévisions en 2e période selon le réglage des arrêts de jeu (log-loss, plus petit = mieux)');
console.log('Réglage'.padEnd(50) + JALONS.map((T) => String(T).padStart(8)).join(''));
const lignesVariante = {};
for (const [nom, arrets] of variantes) {
  const sommes = JALONS.map(() => 0);
  const lignes = [];
  for (const m of matchs) {
    const ev = journal(m);
    const o = issue(m);
    JALONS.forEach((T, i) => {
      const r = M.prevoir({ lamA: lam, lamB: lam, arrets2: arrets(m) }, ev, T);
      const p = [r.pA, r.pN, r.pB];
      sommes[i] += ll(p, o);
      lignes.push({ T, p, o });
    });
  }
  lignesVariante[nom] = lignes;
  console.log(nom.padEnd(50) + sommes.map((s) => (s / matchs.length).toFixed(4).padStart(8)).join(''));
}

// Fiabilité avec le réglage par défaut
const defaut = lignesVariante[variantes[1][0]];
console.log('\nFiabilité avec le réglage par défaut (5 min), prévisions des minutes 60 à 85, les 3 issues');
const cases = Array.from({ length: 10 }, () => ({ n: 0, p: 0, o: 0 }));
for (const l of defaut.filter((x) => x.T >= 60 && x.T <= 85)) {
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

const sures = defaut.filter((l) => l.T >= 60 && l.T <= 85 && Math.max(...l.p) >= 0.8);
const justes = sures.filter((l) => l.p.indexOf(Math.max(...l.p)) === l.o).length;
console.log(`  prévisions à 80 % ou plus : ${justes} justes sur ${sures.length} (${((justes / sures.length) * 100).toFixed(1)} %), annoncées en moyenne à ${((sures.reduce((s, l) => s + Math.max(...l.p), 0) / sures.length) * 100).toFixed(1)} %`);
