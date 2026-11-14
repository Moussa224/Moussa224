/*
 * Prédicteur de match : l'interface.
 * Tout le calcul est dans modele.js. Ici : l'état du match, les saisies, et l'affichage.
 */
(() => {
  'use strict';

  const M = window.Modele;
  const $ = (id) => document.getElementById(id);
  const CLE_STOCKAGE = 'prediction-match-v1';
  const MINUTE_MAX = 100;
  const MARCHES = ['A', 'N', 'B', 'AN', 'BN', 'AB', 'O', 'U'];
  const LIGNES_BUTS = [0.5, 1.5, 2.5, 3.5, 4.5];

  // ---------------------------------------------------------------------------
  // État du match
  // ---------------------------------------------------------------------------

  /** Match d'exemple affiché à l'ouverture : B ouvre le score, A égalise, B reçoit un carton rouge. */
  function exemple() {
    const e = (t, eq, min) => ({ t, eq, min });
    return {
      nomA: 'Équipe A', nomB: 'Équipe B',
      mode: 'elo', niveauA: 1760, niveauB: 1660, terrain: 'A', butsMoyens: 2.6,
      cotes: { A: '', N: '', B: '' },
      arrets2: 5,
      paris: { cotes: {}, prudence: 5, ligne: 2.5, capital: '' },
      minute: 63, fin: null, exemple: true,
      evenements: [
        e('cadre', 'A', 11), e('hors', 'B', 17), e('but', 'B', 23), e('cadre', 'A', 31), e('hors', 'A', 36),
        e('cadre', 'A', 44), e('but', 'A', 49), e('cadre', 'A', 52), e('rouge', 'B', 55), e('cadre', 'A', 58), e('hors', 'A', 61),
      ],
    };
  }

  const TYPES = ['but', 'rouge', 'cadre', 'hors'];

  /** Relit un état sauvegardé en vérifiant chaque champ : le stockage local peut contenir n'importe quoi. */
  function valider(s) {
    if (!s || typeof s !== 'object') return null;
    const nb = (x, min, max, defaut) => (Number.isFinite(+x) && x !== null && x !== '' ? Math.min(max, Math.max(min, +x)) : defaut);
    const evenements = (Array.isArray(s.evenements) ? s.evenements : [])
      .filter((v) => v && TYPES.includes(v.t) && (v.eq === 'A' || v.eq === 'B') && Number.isFinite(+v.min))
      .map((v) => ({ t: v.t, eq: v.eq, min: Math.round(nb(v.min, 0, MINUTE_MAX, 0)) }));
    return {
      nomA: String(s.nomA ?? '').slice(0, 24),
      nomB: String(s.nomB ?? '').slice(0, 24),
      mode: s.mode === 'cotes' ? 'cotes' : 'elo',
      niveauA: nb(s.niveauA, 1200, 2100, 1760),
      niveauB: nb(s.niveauB, 1200, 2100, 1660),
      terrain: ['A', 'N', 'B'].includes(s.terrain) ? s.terrain : 'A',
      butsMoyens: nb(s.butsMoyens, 1.8, 3.6, 2.6),
      cotes: { A: String(s.cotes?.A ?? '').slice(0, 8), N: String(s.cotes?.N ?? '').slice(0, 8), B: String(s.cotes?.B ?? '').slice(0, 8) },
      arrets2: Math.round(nb(s.arrets2, 2, 10, 5)),
      paris: {
        cotes: Object.fromEntries(MARCHES.map((id) => [id, String(s.paris?.cotes?.[id] ?? '').slice(0, 8)])),
        prudence: Math.round(nb(s.paris?.prudence, 0, 12, 5)),
        ligne: LIGNES_BUTS.includes(+s.paris?.ligne) ? +s.paris.ligne : 2.5,
        capital: String(s.paris?.capital ?? '').slice(0, 14),
      },
      minute: Math.round(nb(s.minute, 0, MINUTE_MAX, 0)),
      fin: s.fin === null || s.fin === undefined ? null : Math.round(nb(s.fin, 0, MINUTE_MAX, 0)),
      exemple: Boolean(s.exemple),
      evenements,
    };
  }

  function charger() {
    try {
      const brut = window.localStorage.getItem(CLE_STOCKAGE);
      return brut ? valider(JSON.parse(brut)) : null;
    } catch (_) {
      return null;
    }
  }

  let S = charger() || exemple();
  let sim = null; // simulation en cours ou terminée : { avant, alea, jour, forces, depart, finMinute, timer, terminee }
  let chrono = null;
  let curseur = null; // minute pointée sur le graphique
  const cacheSerie = new Map();

  function sauver() {
    if (sim) return; // une simulation ne remplace jamais votre match
    try {
      window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(S));
    } catch (_) {
      /* stockage indisponible : l'application marche sans */
    }
  }

  const nomA = () => S.nomA.trim() || 'Équipe A';
  const nomB = () => S.nomB.trim() || 'Équipe B';
  const nomDe = (eq) => (eq === 'A' ? nomA() : nomB());
  const termine = () => S.fin !== null && S.minute >= S.fin;

  // ---------------------------------------------------------------------------
  // Niveaux d'avant-match
  // ---------------------------------------------------------------------------

  let cacheForces = { cle: '', valeur: null };
  const lireCote = (texte) => parseFloat(String(texte).replace(',', '.'));
  const cotesSaisies = () => [lireCote(S.cotes.A), lireCote(S.cotes.N), lireCote(S.cotes.B)];

  function cotesValides() {
    return S.mode === 'cotes' && cotesSaisies().every((c) => Number.isFinite(c) && c > 1);
  }

  function forces() {
    let f = null;
    if (cotesValides()) {
      const cotes = cotesSaisies();
      const cle = cotes.join('|');
      if (cacheForces.cle !== cle) cacheForces = { cle, valeur: M.forcesDepuisCotes(...cotes) };
      f = cacheForces.valeur;
    }
    if (!f) f = M.forcesDepuisNiveaux({ niveauA: S.niveauA, niveauB: S.niveauB, terrain: S.terrain, butsMoyens: S.butsMoyens });
    return { ...f, arrets2: S.arrets2 };
  }

  // ---------------------------------------------------------------------------
  // Petits outils d'affichage
  // ---------------------------------------------------------------------------

  const NS_SVG = 'http://www.w3.org/2000/svg';
  function svg(nom, attrs, texte) {
    const e = document.createElementNS(NS_SVG, nom);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (texte !== undefined) e.textContent = texte;
    return e;
  }
  function html(nom, classe, texte) {
    const e = document.createElement(nom);
    if (classe) e.className = classe;
    if (texte !== undefined) e.textContent = texte;
    return e;
  }
  /** Remplace le contenu d'un élément. Les noms d'équipes viennent de l'utilisateur : jamais d'innerHTML. */
  function remplir(el, ...parties) {
    el.replaceChildren(...parties.map((p) => (typeof p === 'string' ? document.createTextNode(p) : p)));
  }
  const gras = (texte) => html('b', '', texte);

  const virgule = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const libMinute = (m) => (m > 90 ? `90+${m - 90}'` : `${m}'`);

  /** Pourcentage affiché. Tant que le match n'est pas fini, jamais 100 % ni 0 % : rien n'est certain. */
  function pct(p, fini) {
    const n = Math.round(p * 100);
    if (fini) return `${n} %`;
    if (n >= 100) return '99 %';
    if (n <= 0) return '< 1 %';
    return `${n} %`;
  }

  // ---------------------------------------------------------------------------
  // Actions sur le match
  // ---------------------------------------------------------------------------

  function ajouter(t, eq) {
    S.evenements.push({ t, eq, min: S.minute });
    sauver();
    rendre();
  }

  /** Retire le dernier ajout du type voulu, parmi ceux déjà survenus à la minute affichée. */
  function retirer(t, eq) {
    let choisi = -1;
    S.evenements.forEach((v, i) => {
      if (v.t === t && v.eq === eq && v.min <= S.minute && (choisi < 0 || v.min >= S.evenements[choisi].min)) choisi = i;
    });
    if (choisi >= 0) S.evenements.splice(choisi, 1);
    sauver();
    rendre();
  }

  function changerMinute(m) {
    S.minute = Math.min(MINUTE_MAX, Math.max(0, Math.round(m)));
    sauver();
    rendre();
  }

  function arreterChrono() {
    if (chrono) clearInterval(chrono);
    chrono = null;
  }
  function basculerChrono() {
    if (chrono) {
      arreterChrono();
    } else {
      chrono = setInterval(() => {
        if (S.minute >= MINUTE_MAX) arreterChrono();
        else S.minute += 1;
        sauver();
        rendre();
      }, 60000);
    }
    rendre();
  }

  /** Bouton à double validation : un premier appui demande confirmation, un second exécute. */
  let arme = null;
  function reinitialiserArme() {
    if (!arme) return;
    clearTimeout(arme.minuteur);
    arme.bouton.textContent = arme.texte;
    arme = null;
  }
  function armer(bouton, texteConfirmation, action) {
    if (arme && arme.bouton === bouton) {
      reinitialiserArme();
      action();
      return;
    }
    reinitialiserArme();
    arme = { bouton, texte: bouton.textContent, minuteur: setTimeout(reinitialiserArme, 4000) };
    bouton.textContent = texteConfirmation;
  }

  function nouveauMatch() {
    arreterChrono();
    S = { ...S, minute: 0, fin: null, exemple: false, evenements: [], paris: { ...S.paris, cotes: {} } };
    curseur = null;
    sauver();
    rendre();
  }

  function sifflet() {
    S.fin = S.fin === null ? S.minute : null;
    sauver();
    rendre();
  }

  // ---------------------------------------------------------------------------
  // Simulation : un match tiré au hasard d'après le niveau des équipes
  // ---------------------------------------------------------------------------

  function lancerSimulation() {
    arreterChrono();
    const alea = M.generateur((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0);
    const f = forces();
    sim = {
      avant: JSON.parse(JSON.stringify(S)),
      alea, forces: f, jour: M.niveauxDuJour(alea),
      depart: M.prevoir(f, [], 0),
      finMinute: 93 + Math.floor(alea() * 3),
      timer: null, terminee: false,
    };
    S = { ...S, minute: 0, fin: null, exemple: false, evenements: [] };
    curseur = null;
    sim.timer = setInterval(pasSimulation, 300);
    rendre();
  }

  function pasSimulation() {
    S.minute += 1;
    S.evenements.push(...M.simulerMinute(sim.forces, S.evenements, S.minute, sim.alea, sim.jour));
    if (S.minute >= sim.finMinute) {
      clearInterval(sim.timer);
      sim.timer = null;
      sim.terminee = true;
      S.fin = S.minute;
    }
    rendre();
  }

  function quitterSimulation() {
    if (sim.timer) clearInterval(sim.timer);
    S = sim.avant;
    sim = null;
    curseur = null;
    rendre();
  }

  // ---------------------------------------------------------------------------
  // Affichage : tableau de score, minute, prévision
  // ---------------------------------------------------------------------------

  function rendreEntete(r) {
    const champ = (el, valeur) => {
      if (document.activeElement !== el && el.value !== valeur) el.value = valeur;
    };
    champ($('nom-a'), S.nomA);
    champ($('nom-b'), S.nomB);
    $('score').textContent = `${r.etat.butsA} – ${r.etat.butsB}`;
    $('minute-affichee').textContent = libMinute(S.minute);
    $('minute').value = S.minute;
    $('minute-moins').disabled = S.minute <= 0;
    $('minute-plus').disabled = S.minute >= MINUTE_MAX;

    const plusTard = S.evenements.filter((v) => v.min > S.minute).length;
    const note = $('note-relecture');
    let texteNote = '';
    if (plusTard > 0) {
      texteNote = `Relecture : ${plusTard} événement${plusTard > 1 ? 's' : ''} survenu${plusTard > 1 ? 's' : ''} plus tard ${plusTard > 1 ? 'sont masqués' : 'est masqué'} à cette minute.`;
    } else if (S.minute === 45) {
      texteNote = "À 45', la 1re période est considérée comme terminée, arrêts de jeu compris.";
    } else if (S.minute >= 90) {
      texteNote = `Arrêts de jeu : le calcul suppose ${S.arrets2} minutes annoncées (réglage dans « Niveau des équipes et réglages »).`;
    }
    note.hidden = texteNote === '';
    note.textContent = texteNote;

    const btnChrono = $('chrono');
    btnChrono.setAttribute('aria-pressed', String(Boolean(chrono)));
    btnChrono.innerHTML = chrono
      ? '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>Pause'
      : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>Chrono';
  }

  /** Légende à trois entrées : équipe A, match nul, équipe B. */
  function legendeEquipes(ul) {
    ul.replaceChildren(
      ...[
        ['a', `${nomA()} gagne`],
        ['n', 'Match nul'],
        ['b', `${nomB()} gagne`],
      ].map(([classe, texte]) => {
        const li = html('li');
        li.append(html('span', `cle cle--${classe}`), html('span', '', texte));
        return li;
      })
    );
  }

  function rendrePrevision(r) {
    const fini = termine();
    const p = { A: r.pA, N: r.pN, B: r.pB };
    const tete = ['A', 'N', 'B'].reduce((a, b) => (p[b] > p[a] ? b : a));
    const debut = S.minute === 0 && !S.evenements.some((v) => v.min <= 0);

    $('prev-etiquette').textContent = fini ? 'Résultat final' : debut ? 'Avant le match' : `Prévision à ${libMinute(S.minute)}`;
    $('hero-chiffre').textContent = pct(p[tete], fini);

    let texte;
    if (fini) texte = tete === 'N' ? 'Match nul' : `${nomDe(tete)} gagne`;
    else if (tete === 'N') texte = 'Le nul est le scénario le plus probable';
    else if (p[tete] >= 0.9) texte = `${nomDe(tete)} : victoire quasi acquise`;
    else if (p[tete] >= 0.7) texte = `${nomDe(tete)} : victoire probable`;
    else if (p[tete] >= 0.5) texte = `Avantage pour ${nomDe(tete)}`;
    else texte = `Match ouvert, léger avantage pour ${nomDe(tete)}`;
    const pastille = html('span', `pastille ${tete === 'A' ? 'pastille--a' : tete === 'B' ? 'pastille--b' : ''}`);
    if (tete === 'N') pastille.style.background = 'var(--nul)';
    pastille.setAttribute('aria-hidden', 'true');
    remplir($('hero-texte'), pastille, html('span', '', texte));

    // Barre à trois parts : largeur proportionnelle, 2 px d'écart, valeur écrite dedans si la place le permet
    const barre = $('segments');
    const parts = [
      ['a', 'A', nomA()],
      ['n', 'N', 'Match nul'],
      ['b', 'B', nomB()],
    ];
    if (barre.children.length !== 3) {
      barre.replaceChildren(
        ...parts.map(([cl]) => {
          const seg = html('div', `segment segment--${cl}`);
          seg.append(html('span', 'segment-texte'));
          return seg;
        })
      );
    }
    const largeurBarre = barre.clientWidth - 4;
    parts.forEach(([, cle], i) => {
      const seg = barre.children[i];
      const valeur = p[cle];
      const vide = valeur < 0.0005;
      seg.classList.toggle('segment--vide', vide);
      seg.style.flexGrow = String(vide ? 0 : valeur);
      seg.style.flexBasis = '0';
      const etiquette = seg.firstChild;
      etiquette.textContent = pct(valeur, fini);
      etiquette.hidden = vide || largeurBarre * valeur < etiquette.textContent.length * 9 + 18;
    });
    barre.setAttribute('aria-label', parts.map(([, cle, nom]) => `${nom} ${pct(p[cle], fini)}`).join(', '));

    legendeEquipes($('legende'));
  }

  // ---------------------------------------------------------------------------
  // Affichage : saisie des événements
  // ---------------------------------------------------------------------------

  const LIGNES = [
    { t: 'but', cle: 'buts', libelle: 'Buts' },
    { t: 'cadre', cle: 'cadres', libelle: 'Tirs cadrés', aide: 'buts compris' },
    { t: 'hors', cle: 'hors', libelle: 'Tirs non cadrés', aide: 'contrés compris' },
    { t: 'rouge', cle: 'rouges', libelle: 'Cartons rouges' },
  ];
  const SINGULIER = { but: 'un but', cadre: 'un tir cadré', hors: 'un tir non cadré', rouge: 'un carton rouge' };

  function construireEvenements() {
    const grille = $('evenements-grille');
    const tete = (eq) => {
      const d = html('div', 'tete');
      d.append(html('span', `pastille pastille--${eq.toLowerCase()}`), html('span', '', ''));
      d.dataset.eq = eq;
      return d;
    };
    grille.replaceChildren(html('div'), tete('A'), tete('B'));
    for (const ligne of LIGNES) {
      const lib = html('div', 'libelle', ligne.libelle);
      if (ligne.aide) lib.append(html('small', '', ligne.aide));
      grille.append(lib);
      for (const eq of ['A', 'B']) {
        const pas = html('div', 'pas');
        pas.dataset.t = ligne.t;
        pas.dataset.eq = eq;
        const moins = html('button', 'moins', '−');
        moins.type = 'button';
        moins.dataset.act = 'moins';
        const sortie = html('output', '', '0');
        const plus = html('button', 'plus', '+');
        plus.type = 'button';
        plus.dataset.act = 'plus';
        pas.append(moins, sortie, plus);
        grille.append(pas);
      }
    }
    grille.addEventListener('click', (ev) => {
      const bouton = ev.target.closest('button[data-act]');
      if (!bouton || bouton.disabled) return;
      const { t, eq } = bouton.parentElement.dataset;
      if (bouton.dataset.act === 'plus') ajouter(t, eq);
      else retirer(t, eq);
    });
  }

  function rendreEvenements(r) {
    const grille = $('evenements-grille');
    grille.querySelectorAll('.tete').forEach((d) => {
      d.lastChild.textContent = nomDe(d.dataset.eq);
    });
    grille.querySelectorAll('.pas').forEach((pas) => {
      const { t, eq } = pas.dataset;
      const ligne = LIGNES.find((l) => l.t === t);
      const n = r.etat[ligne.cle + eq];
      pas.querySelector('output').textContent = String(n);
      const moins = pas.querySelector('.moins');
      const plus = pas.querySelector('.plus');
      moins.disabled = !S.evenements.some((v) => v.t === t && v.eq === eq && v.min <= S.minute);
      moins.setAttribute('aria-label', `Retirer ${SINGULIER[t]} pour ${nomDe(eq)}`);
      plus.setAttribute('aria-label', `Ajouter ${SINGULIER[t]} pour ${nomDe(eq)} à la ${libMinute(S.minute)}`);
    });
  }

  // ---------------------------------------------------------------------------
  // Affichage : graphique des chances au fil du match
  // ---------------------------------------------------------------------------

  const GRAPHE = { gauche: 42, droite: 16, haut: 10, hauteur: 180 };

  function rendreGraphe(f) {
    const cadre = $('graphe-cadre');
    const zone = $('graphe');
    const W = Math.max(280, Math.floor(cadre.clientWidth));
    const axeY = GRAPHE.haut + GRAPHE.hauteur;
    const voie = { A: axeY + 42, B: axeY + 62 };
    const H = axeY + 78;
    const xMax = Math.max(94, S.minute);
    const largeurTrace = W - GRAPHE.gauche - GRAPHE.droite;
    const x = (m) => GRAPHE.gauche + (m / xMax) * largeurTrace;
    const y = (p) => GRAPHE.haut + (1 - p) * GRAPHE.hauteur;

    zone.setAttribute('viewBox', `0 0 ${W} ${H}`);
    zone.setAttribute('width', W);
    zone.setAttribute('height', H);

    const points = M.serie(f, S.evenements, S.minute, cacheSerie, S.fin);
    if (cacheSerie.size > 4000) cacheSerie.clear();
    const noeuds = [];

    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      noeuds.push(svg('line', { x1: GRAPHE.gauche, x2: W - GRAPHE.droite, y1: y(v), y2: y(v), class: v === 0 ? 'g-axe' : 'g-grille' }));
      noeuds.push(svg('text', { x: GRAPHE.gauche - 8, y: y(v) + 4, 'text-anchor': 'end' }, `${Math.round(v * 100)} %`));
    }
    for (let m = 0; m <= 90; m += 15) {
      noeuds.push(svg('text', { x: x(m), y: axeY + 18, 'text-anchor': m === 0 ? 'start' : 'middle' }, `${m}'`));
    }

    // Courbes : le nul d'abord, les équipes par-dessus
    const trace = (cle, classe) => {
      const d = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${x(pt.minute).toFixed(1)} ${y(pt[cle]).toFixed(1)}`).join('');
      noeuds.push(svg('path', { d, class: `g-ligne g-ligne--${classe}` }));
    };
    trace('pN', 'n');
    trace('pA', 'a');
    trace('pB', 'b');
    const dernier = points[points.length - 1];
    for (const [cle, classe] of [['pN', 'n'], ['pA', 'a'], ['pB', 'b']]) {
      noeuds.push(svg('circle', { cx: x(dernier.minute), cy: y(dernier[cle]), r: 5, class: `g-point g-point--${classe}` }));
    }

    // Buts et cartons rouges, une voie par équipe
    for (const eq of ['A', 'B']) {
      noeuds.push(svg('circle', { cx: GRAPHE.gauche - 18, cy: voie[eq], r: 4, class: `g-point g-point--${eq.toLowerCase()}`, 'stroke-width': 0 }));
      let dernierX = -99;
      S.evenements
        .filter((v) => v.eq === eq && (v.t === 'but' || v.t === 'rouge') && v.min <= S.minute)
        .sort((a, b) => a.min - b.min)
        .forEach((v) => {
          const cx = x(v.min);
          if (v.t === 'but') noeuds.push(svg('circle', { cx, cy: voie[eq], r: 5.5, class: `g-point g-point--${eq.toLowerCase()}` }));
          else noeuds.push(svg('rect', { x: cx - 4, y: voie[eq] - 6, width: 8, height: 12, rx: 2, class: 'g-rouge' }));
          if (cx - dernierX >= 34) {
            noeuds.push(svg('text', { x: cx + 9, y: voie[eq] + 4 }, `${v.min}'`));
            dernierX = cx;
          }
        });
    }

    // Curseur de lecture
    const ligneCurseur = svg('line', { y1: GRAPHE.haut, y2: axeY, class: 'g-curseur', visibility: 'hidden' });
    const pointsCurseur = ['n', 'a', 'b'].map((c) => svg('circle', { r: 4.5, class: `g-point g-point--${c}`, visibility: 'hidden' }));
    const capteur = svg('rect', { x: GRAPHE.gauche, y: GRAPHE.haut - 4, width: largeurTrace, height: GRAPHE.hauteur + 8, fill: 'transparent' });
    noeuds.push(ligneCurseur, ...pointsCurseur, capteur);
    zone.replaceChildren(...noeuds);

    const bulle = $('infobulle');
    function placer(minute) {
      if (minute === null || minute > S.minute) {
        curseur = null;
        ligneCurseur.setAttribute('visibility', 'hidden');
        pointsCurseur.forEach((c) => c.setAttribute('visibility', 'hidden'));
        bulle.hidden = true;
        return;
      }
      curseur = minute;
      const pt = points[minute];
      const px = x(minute);
      ligneCurseur.setAttribute('x1', px);
      ligneCurseur.setAttribute('x2', px);
      ligneCurseur.setAttribute('visibility', 'visible');
      ['pN', 'pA', 'pB'].forEach((cle, i) => {
        pointsCurseur[i].setAttribute('cx', px);
        pointsCurseur[i].setAttribute('cy', y(pt[cle]));
        pointsCurseur[i].setAttribute('visibility', 'visible');
      });
      const fini = S.fin !== null && minute >= S.fin;
      const ligne = (classe, valeur, nom) => {
        const d = html('div', 'l');
        d.append(html('span', `cle cle--${classe}`), gras(pct(valeur, fini)), html('span', '', nom));
        return d;
      };
      bulle.replaceChildren(
        html('div', 't', libMinute(minute)),
        ligne('a', pt.pA, `${nomA()} gagne`),
        ligne('n', pt.pN, 'Match nul'),
        ligne('b', pt.pB, `${nomB()} gagne`)
      );
      bulle.hidden = false;
      const largeurBulle = bulle.offsetWidth;
      const gauche = px + 14 + largeurBulle > W ? px - largeurBulle - 14 : px + 14;
      bulle.style.left = `${Math.max(0, gauche)}px`;
      bulle.style.top = `${GRAPHE.haut + 4}px`;
    }
    const depuisPointeur = (ev) => {
      const boite = zone.getBoundingClientRect();
      const px = ((ev.clientX - boite.left) * W) / boite.width;
      return Math.min(S.minute, Math.max(0, Math.round(((px - GRAPHE.gauche) / largeurTrace) * xMax)));
    };
    capteur.addEventListener('pointermove', (ev) => placer(depuisPointeur(ev)));
    capteur.addEventListener('pointerdown', (ev) => placer(depuisPointeur(ev)));
    capteur.addEventListener('pointerleave', () => placer(null));
    zone.onkeydown = (ev) => {
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
        ev.preventDefault();
        const base = curseur === null ? S.minute : curseur;
        placer(Math.min(S.minute, Math.max(0, base + (ev.key === 'ArrowRight' ? 1 : -1))));
      } else if (ev.key === 'Escape') {
        placer(null);
      }
    };
    zone.onblur = () => placer(null);
    if (curseur !== null) placer(Math.min(curseur, S.minute));

    // Légende de la courbe et tableau de valeurs
    legendeEquipes($('legende-graphe'));

    const table = $('tableau-valeurs');
    const lignes = points.filter((pt) => pt.minute % 5 === 0 || pt.minute === S.minute);
    const entete = html('tr');
    ['Minute', `${nomA()} gagne`, 'Nul', `${nomB()} gagne`].forEach((t) => entete.append(html('th', '', t)));
    table.replaceChildren(html('thead'), html('tbody'));
    table.tHead.append(entete);
    lignes.forEach((pt) => {
      const tr = html('tr');
      const fini = S.fin !== null && pt.minute >= S.fin;
      [libMinute(pt.minute), pct(pt.pA, fini), pct(pt.pN, fini), pct(pt.pB, fini)].forEach((t) => tr.append(html('td', '', t)));
      table.tBodies[0].append(tr);
    });
  }

  // ---------------------------------------------------------------------------
  // Comparaison avec les cotes en direct
  // ---------------------------------------------------------------------------

  const ICONES_VERDICT = {
    valeur: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    aucune: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    suspect: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2L14.4 13H1.6z M8 6.4v3.2 M8 11.3v.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const TEXTE_VERDICT = { valeur: 'Valeur possible', aucune: 'Pas de valeur', suspect: 'Écart suspect', vide: 'Entrez une cote' };

  /** Les issues sur lesquelles on peut comparer une cote, avec la probabilité du modèle. */
  function marches(r) {
    const L = S.paris.ligne;
    const plus = r.plusDe[Math.ceil(L)];
    return [
      { id: 'A', nom: `${nomA()} gagne`, p: r.pA, cle: 'a' },
      { id: 'N', nom: 'Match nul', p: r.pN, cle: 'n' },
      { id: 'B', nom: `${nomB()} gagne`, p: r.pB, cle: 'b' },
      { id: 'AN', nom: `${nomA()} ou nul`, p: r.pA + r.pN, cle: 'a' },
      { id: 'BN', nom: `${nomB()} ou nul`, p: r.pB + r.pN, cle: 'b' },
      { id: 'AB', nom: 'Pas de match nul', p: r.pA + r.pB, cle: 'n' },
      { id: 'O', nom: `Plus de ${virgule(L)} buts`, p: plus, cle: 'n' },
      { id: 'U', nom: `Moins de ${virgule(L)} buts`, p: 1 - plus, cle: 'n' },
    ];
  }

  function construireParis() {
    const liste = $('liste-paris');
    liste.replaceChildren(
      ...MARCHES.map((id) => {
        const li = html('li', 'pari');
        li.dataset.id = id;
        const tete = html('div', 'pari-tete');
        tete.append(html('span', 'cle'), html('span', 'pari-nom'), html('span', 'pari-proba'));
        const corps = html('div', 'pari-corps');
        const etiquette = html('label', 'pari-cote');
        const champ = html('input', 'saisie');
        champ.id = `cote-${id}`;
        champ.type = 'text';
        champ.inputMode = 'decimal';
        champ.autocomplete = 'off';
        champ.placeholder = 'Cote';
        champ.setAttribute('aria-label', 'Cote proposée');
        etiquette.append(champ);
        corps.append(etiquette, html('span', 'pari-min'), html('span', 'verdict'));
        li.append(tete, corps, html('p', 'pari-detail'));
        champ.addEventListener('input', (e) => {
          S.paris.cotes[id] = e.target.value;
          sauver();
          rendre();
        });
        return li;
      })
    );
  }

  const montant = (x) => Math.round(x).toLocaleString('fr-FR');

  function rendreParis(r) {
    const fini = termine();
    const prudence = S.paris.prudence / 100;
    $('val-prudence').textContent = `${S.paris.prudence} point${S.paris.prudence > 1 ? 's' : ''}`;
    const remplirChamp = (el, valeur) => {
      if (document.activeElement !== el && el.value !== String(valeur)) el.value = valeur;
    };
    remplirChamp($('prudence'), S.paris.prudence);
    remplirChamp($('ligne-buts'), S.paris.ligne);
    remplirChamp($('capital'), S.paris.capital);
    const capital = parseFloat(String(S.paris.capital).replace(/\s/g, '').replace(',', '.'));

    $('liste-paris').hidden = fini;
    const synthese = $('synthese-paris');
    if (fini) {
      synthese.textContent = 'Le match est terminé : il n\'y a plus rien à comparer.';
      return;
    }
    let nbCotes = 0;
    let nbValeur = 0;
    let nbSuspect = 0;
    for (const m of marches(r)) {
      const li = $('liste-paris').querySelector(`[data-id="${m.id}"]`);
      li.querySelector('.cle').className = `cle cle--${m.cle}`;
      li.querySelector('.pari-nom').textContent = m.nom;
      li.querySelector('.pari-proba').textContent = pct(m.p, false);
      remplirChamp(li.querySelector('input'), S.paris.cotes[m.id] || '');

      const prudente = m.p - prudence;
      li.querySelector('.pari-min').textContent = prudente > 0.01 ? `Cote minimale ${virgule(1 / prudente, 2)}` : 'Aucune cote ne suffit';

      const cote = lireCote(S.paris.cotes[m.id] || '');
      const c = cote > 1 ? M.comparerCote(m.p, cote, prudence) : null;
      let verdict = 'vide';
      let detail = '';
      if (c) {
        nbCotes += 1;
        if (c.esperancePrudente > 0) {
          verdict = c.ecart > 0.12 ? 'suspect' : 'valeur';
        } else {
          verdict = 'aucune';
        }
        const gain = c.esperancePrudente * 100;
        detail = `La cote correspond à ${pct(c.implicite, false)} de chances. Gain moyen attendu avec la marge de prudence : ${gain >= 0 ? '+' : '−'}${virgule(Math.abs(gain))} % de la mise.`;
        if (verdict === 'valeur') {
          nbValeur += 1;
          detail += ` Mise indicative : ${virgule(c.miseConseillee * 100)} % du capital`;
          detail += capital > 0 ? ` (environ ${montant(capital * c.miseConseillee)}).` : '.';
        } else if (verdict === 'suspect') {
          nbSuspect += 1;
          detail += ' Le bookmaker est très loin du modèle : il sait peut-être quelque chose que le modèle ignore (blessure, composition, minute exacte). Vérifiez avant tout.';
        }
      }
      const pastille = li.querySelector('.verdict');
      pastille.className = `verdict verdict--${verdict}`;
      pastille.innerHTML = (ICONES_VERDICT[verdict] || '') + `<span>${TEXTE_VERDICT[verdict]}</span>`;
      const ligneDetail = li.querySelector('.pari-detail');
      ligneDetail.textContent = detail;
      ligneDetail.hidden = detail === '';
    }

    const cotes1X2 = ['A', 'N', 'B'].map((id) => lireCote(S.paris.cotes[id] || ''));
    const marge = cotes1X2.every((x) => x > 1) ? cotes1X2.reduce((t, x) => t + 1 / x, 0) - 1 : null;
    let texte;
    if (nbCotes === 0) {
      texte = 'Entrez une cote pour juger si elle paie assez. La « cote minimale » indique, pour chaque issue, la cote en dessous de laquelle le pari n\'est pas intéressant avec la marge de prudence choisie.';
    } else if (nbValeur === 0 && nbSuspect === 0) {
      texte = 'Aucune des cotes saisies ne montre de valeur avec cette marge de prudence. Ne pas parier est une décision valable.';
    } else if (nbValeur === 0) {
      texte = 'Une cote s\'écarte beaucoup du modèle : le plus probable est que le bookmaker sache quelque chose que le modèle ignore. Ne pas parier est une décision valable.';
    } else {
      texte = `${nbValeur} cote${nbValeur > 1 ? 's' : ''} à valeur possible. Avant de parier, vérifiez ce que le bookmaker pourrait savoir de plus (blessure, composition).`;
    }
    if (marge !== null && marge >= 0) texte += ` Marge du bookmaker sur le résultat : ${virgule(marge * 100)} %.`;
    else if (marge !== null) texte += ' Les trois cotes du résultat sont inhabituellement généreuses (marge négative) : vérifiez-les.';
    synthese.textContent = texte;
  }

  // ---------------------------------------------------------------------------
  // Affichage : détails de la prévision
  // ---------------------------------------------------------------------------

  function ligneBarre(nom, valeur, relatif, classe, fini) {
    const li = html('li');
    const piste = html('div', 'piste');
    const barre = html('div', `barre barre--${classe}`);
    barre.style.width = `${Math.max(0, Math.min(1, relatif)) * 100}%`;
    piste.append(barre);
    const n = html('span', 'nom', nom);
    n.title = nom;
    li.append(n, piste, html('span', 'valeur', pct(valeur, fini)));
    return li;
  }

  function rendreDetails(r) {
    const fini = termine();
    const prochain = $('liste-prochain');
    if (fini) {
      prochain.replaceChildren(html('li', 'nom', 'Le match est terminé.'));
    } else {
      prochain.replaceChildren(
        ligneBarre(nomA(), r.prochainA, r.prochainA, 'a', false),
        ligneBarre('Aucun but', r.aucunBut, r.aucunBut, 'n', false),
        ligneBarre(nomB(), r.prochainB, r.prochainB, 'b', false)
      );
    }

    const maxScore = r.scores[0] ? r.scores[0].p : 1;
    $('liste-scores').replaceChildren(
      ...r.scores.map((s) => ligneBarre(`${s.a} – ${s.b}`, s.p, s.p / maxScore, s.a > s.b ? 'a' : s.a < s.b ? 'b' : 'n', fini))
    );

    const chiffres = $('chiffres');
    if (fini) {
      remplir(chiffres, html('dt', '', 'Total de buts'), html('dd', '', String(r.etat.butsA + r.etat.butsB)));
    } else {
      const dt = (t) => html('dt', '', t);
      const dd = (t) => html('dd', '', t);
      chiffres.replaceChildren(
        dt(`Buts à venir pour ${nomA()}`), dd(virgule(r.resteA)),
        dt(`Buts à venir pour ${nomB()}`), dd(virgule(r.resteB)),
        dt('Plus de 2,5 buts au total'), dd(pct(r.plus25, false))
      );
    }

    const signe = (perf) => `${perf >= 1 ? '+' : '−'}${Math.abs(Math.round((perf - 1) * 100))} %`;
    const forme = $('forme');
    if (fini) forme.textContent = '';
    else if (Math.abs(r.perfA - 1) < 0.02 && Math.abs(r.perfB - 1) < 0.02) {
      forme.textContent = 'Pas assez de tirs saisis pour corriger le niveau annoncé des équipes.';
    } else {
      forme.textContent = `Niveau du jour d'après les tirs, par rapport au niveau annoncé : ${nomA()} ${signe(r.perfA)}, ${nomB()} ${signe(r.perfB)}.`;
    }
  }

  // ---------------------------------------------------------------------------
  // Affichage : réglages d'avant-match
  // ---------------------------------------------------------------------------

  function rendreReglages(f) {
    $('lib-niveau-a').textContent = nomA();
    $('lib-niveau-b').textContent = nomB();
    $('lib-cote-a').textContent = `Victoire ${nomA()}`;
    $('lib-cote-b').textContent = `Victoire ${nomB()}`;

    const mettre = (id, valeur) => {
      const el = $(id);
      if (document.activeElement !== el && el.value !== String(valeur)) el.value = valeur;
    };
    mettre('niveau-a', S.niveauA);
    mettre('niveau-b', S.niveauB);
    mettre('terrain', S.terrain);
    mettre('buts-moyens', S.butsMoyens);
    mettre('arrets2', S.arrets2);
    $('val-arrets2').textContent = `${S.arrets2} min`;
    mettre('cote-a', S.cotes.A);
    mettre('cote-n', S.cotes.N);
    mettre('cote-b', S.cotes.B);
    document.querySelectorAll('input[name="mode"]').forEach((r) => (r.checked = r.value === S.mode));
    $('reglage-elo').hidden = S.mode !== 'elo';
    $('reglage-cotes').hidden = S.mode !== 'cotes';

    $('val-niveau-a').textContent = `${S.niveauA} · ${M.libelleNiveau(S.niveauA)}`;
    $('val-niveau-b').textContent = `${S.niveauB} · ${M.libelleNiveau(S.niveauB)}`;
    $('val-buts-moyens').textContent = virgule(S.butsMoyens);

    const utilise = cotesValides();
    const alerte = $('alerte-cotes');
    const saisieIncomplete = S.mode === 'cotes' && !utilise;
    alerte.hidden = !saisieIncomplete;
    if (saisieIncomplete) alerte.textContent = 'Saisissez les trois cotes (chacune supérieure à 1). En attendant, le niveau Elo est utilisé.';
    ['cote-a', 'cote-n', 'cote-b'].forEach((id) => {
      const valeur = $(id).value.trim();
      $(id).setAttribute('aria-invalid', String(S.mode === 'cotes' && valeur !== '' && !(lireCote(valeur) > 1)));
    });

    const terrainTexte = { A: `${nomA()} à domicile`, N: 'terrain neutre', B: `${nomB()} à domicile` }[S.terrain];
    $('reglages-resume').textContent =
      S.mode === 'cotes' && utilise
        ? `Cotes ${S.cotes.A} / ${S.cotes.N} / ${S.cotes.B}`
        : `${nomA()} ${S.niveauA} · ${nomB()} ${S.niveauB} · ${terrainTexte}`;

    const debut = M.prevoir(f, [], 0);
    const parties = [
      'Avant le match : ', `${nomA()} `, gras(pct(debut.pA, false)), ' · Nul ', gras(pct(debut.pN, false)), ` · ${nomB()} `, gras(pct(debut.pB, false)),
    ];
    if (utilise && f.cible) parties.push(` · marge du bookmaker ${virgule(f.cible.marge * 100)} %`);
    remplir($('avant-match'), ...parties);
  }

  // ---------------------------------------------------------------------------
  // Bandeau et boutons d'action
  // ---------------------------------------------------------------------------

  function rendreBandeau() {
    const bandeau = $('bandeau');
    bandeau.replaceChildren();
    if (sim) {
      const gagnant = (() => {
        const e = M.etatA(S.evenements, S.minute);
        return e.butsA > e.butsB ? `${nomA()} gagne` : e.butsA < e.butsB ? `${nomB()} gagne` : 'match nul';
      })();
      if (sim.terminee) {
        bandeau.append(
          gras('Simulation terminée : '),
          `${gagnant}. Avant le coup d'envoi, le modèle donnait ${pct(sim.depart.pA, false)} à ${nomA()}, ${pct(sim.depart.pN, false)} au nul et ${pct(sim.depart.pB, false)} à ${nomB()}. `
        );
      } else {
        bandeau.append(gras('Simulation en cours. '), 'Les événements sont tirés au hasard d\'après le niveau des équipes. Votre match est conservé. ');
      }
      const quitter = html('button', 'btn btn--petit', 'Quitter la simulation');
      quitter.type = 'button';
      quitter.addEventListener('click', quitterSimulation);
      bandeau.append(quitter);
      bandeau.hidden = false;
    } else if (S.exemple) {
      bandeau.append(gras('Match d\'exemple. '), 'Modifiez-le pour voir la prévision bouger, ou touchez « Nouveau match » pour saisir le vôtre.');
      bandeau.hidden = false;
    } else {
      bandeau.hidden = true;
    }
  }

  function rendreActions() {
    const enSimulation = Boolean(sim);
    $('zone-temps').inert = enSimulation;
    $('zone-evenements').inert = enSimulation;
    $('zone-paris').inert = enSimulation;
    $('reglages').inert = enSimulation;
    $('btn-nouveau').disabled = enSimulation;
    $('btn-sifflet').disabled = enSimulation;
    $('btn-sifflet').textContent = S.fin === null ? 'Coup de sifflet final' : 'Reprendre le match';
    $('btn-simuler').textContent = enSimulation ? 'Quitter la simulation' : 'Simuler un match';
  }

  // ---------------------------------------------------------------------------
  // Dessin complet
  // ---------------------------------------------------------------------------

  function rendre() {
    const f = forces();
    const r = M.prevoir(f, S.evenements, S.minute, termine());
    rendreBandeau();
    rendreEntete(r);
    rendrePrevision(r);
    rendreReglages(f);
    rendreEvenements(r);
    rendreParis(r);
    rendreGraphe(f);
    rendreDetails(r);
    rendreActions();
  }

  // ---------------------------------------------------------------------------
  // Branchements
  // ---------------------------------------------------------------------------

  function brancher() {
    construireEvenements();
    construireParis();

    $('nom-a').addEventListener('input', (e) => { S.nomA = e.target.value; sauver(); rendre(); });
    $('nom-b').addEventListener('input', (e) => { S.nomB = e.target.value; sauver(); rendre(); });

    $('minute').addEventListener('input', (e) => changerMinute(+e.target.value));
    $('minute-moins').addEventListener('click', () => changerMinute(S.minute - 1));
    $('minute-plus').addEventListener('click', () => changerMinute(S.minute + 1));
    $('chrono').addEventListener('click', basculerChrono);

    $('btn-nouveau').addEventListener('click', (e) => {
      if (S.exemple || S.evenements.length === 0) nouveauMatch();
      else armer(e.currentTarget, 'Effacer ce match ?', nouveauMatch);
    });
    $('btn-sifflet').addEventListener('click', sifflet);
    $('btn-simuler').addEventListener('click', () => (sim ? quitterSimulation() : lancerSimulation()));

    document.querySelectorAll('input[name="mode"]').forEach((r) =>
      r.addEventListener('change', (e) => { S.mode = e.target.value; sauver(); rendre(); })
    );
    const lier = (id, cle, convertir = (v) => v) =>
      $(id).addEventListener('input', (e) => { S[cle] = convertir(e.target.value); sauver(); rendre(); });
    lier('niveau-a', 'niveauA', Number);
    lier('niveau-b', 'niveauB', Number);
    lier('terrain', 'terrain');
    lier('buts-moyens', 'butsMoyens', Number);
    lier('arrets2', 'arrets2', Number);
    $('prudence').addEventListener('input', (e) => { S.paris.prudence = Number(e.target.value); sauver(); rendre(); });
    $('ligne-buts').addEventListener('input', (e) => { S.paris.ligne = Number(e.target.value); sauver(); rendre(); });
    $('capital').addEventListener('input', (e) => { S.paris.capital = e.target.value; sauver(); rendre(); });
    for (const [id, cle] of [['cote-a', 'A'], ['cote-n', 'N'], ['cote-b', 'B']]) {
      $(id).addEventListener('input', (e) => { S.cotes[cle] = e.target.value; sauver(); rendre(); });
    }

    // Le graphique est tracé à la largeur réelle : on le redessine quand elle change.
    let attente = 0;
    if (window.ResizeObserver) {
      let largeur = $('graphe-cadre').clientWidth;
      new ResizeObserver(() => {
        const nouvelle = $('graphe-cadre').clientWidth;
        if (nouvelle === largeur) return;
        largeur = nouvelle;
        cancelAnimationFrame(attente);
        attente = requestAnimationFrame(rendre);
      }).observe($('graphe-cadre'));
    }
  }

  brancher();
  rendre();
})();
