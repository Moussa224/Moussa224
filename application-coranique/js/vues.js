/* ==========================================================================
   Coran Facile · les écrans
   Chaque écran est une fonction qui renvoie { titre, retour, nav, html, apres }.
   Les boutons portent un attribut data-action : le code correspondant est dans « Actions » plus bas.
   ========================================================================== */
const Vues = (() => {
  'use strict';

  const { $, $$, esc, ico, nombre, message } = Outils;
  const nomDe = (s) => Donnees.sourate(s).nom;
  const referenceTxt = (s, v) => `${nomDe(s)} ${s}:${v}`;
  const tousLesVersets = (s) => Array.from({ length: Donnees.sourate(s).v }, (_, i) => ({ s, v: i + 1 }));
  const pourcent = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const barre = (a, b) => `<div class="barre" role="progressbar" aria-valuemin="0" aria-valuemax="${b}" aria-valuenow="${a}"><i style="width:${pourcent(a, b)}%"></i></div>`;

  const erreurDonnees = () => `
    <div class="erreur">
      <strong>Impossible de charger ce texte.</strong>
      <p>Vérifie ta connexion internet, puis réessaie. Après avoir téléchargé l'application dans les réglages, elle marche aussi sans internet.</p>
      <button type="button" class="bouton" data-action="recharger">Réessayer</button>
    </div>`;

  /* ---------- Réglages d'affichage appliqués à toute la page ---------- */
  const appliquerReglages = () => {
    const r = Etat.reglages();
    const rac = document.documentElement;
    rac.dataset.phonetique = r.phonetique ? '1' : '0';
    rac.dataset.traduction = r.traduction ? '1' : '0';
    rac.dataset.taille = String(r.taille);
    if (r.theme === 'auto') rac.removeAttribute('data-theme');
    else rac.setAttribute('data-theme', r.theme === 'clair' ? 'light' : 'dark');
  };

  const majPastille = () => {
    const n = Etat.aReviser().length;
    const p = $('#pastille-reviser');
    if (!p) return;
    p.hidden = n === 0;
    p.textContent = n > 99 ? '99+' : String(n);
  };

  /* ==========================================================================
     Parcours conseillé
     ========================================================================== */
  const etapeTerminee = (e) => (e.type === 'lecon' ? Etat.leconFaite(e.id) : Etat.tousAppris(e.s, e.de, e.a));
  const etapeCourante = () => CONTENU.parcours.findIndex((e) => !etapeTerminee(e));
  // Pour un passage : on propose d'étudier les prochains versets pas encore appris, 3 à la fois.
  const lienEtape = (e) => {
    if (e.type === 'lecon') return `#${e.lien}`;
    let debut = e.de;
    while (debut < e.a && Etat.estAppris(e.s, debut)) debut++;
    return `#etude-${e.s}-${debut}-${Math.min(debut + 2, e.a)}`;
  };
  const detailEtape = (e) => {
    if (e.type === 'lecon') return `Leçon · ${e.duree}`;
    const total = e.a - e.de + 1;
    let faits = 0;
    for (let v = e.de; v <= e.a; v++) if (Etat.estAppris(e.s, v)) faits++;
    return `${nombre(total, 'verset', 'versets')} · ${faits} sur ${total} appris`;
  };

  /* ==========================================================================
     Accueil
     ========================================================================== */
  const versetDuJour = () => {
    const liste = CONTENU.versetsDuJour;
    const i = Outils.ecartJours('2026-01-01', Outils.aujourdhui());
    return liste[((i % liste.length) + liste.length) % liste.length];
  };

  const accueil = () => {
    const lec = Etat.lecture();
    const dues = Etat.aReviser();
    const idx = etapeCourante();
    const etapes = CONTENU.parcours;
    const [js, jv] = versetDuJour();

    const reprise = lec
      ? `<a class="lien-carte" href="#sourate-${lec.s}-${lec.v}">
           <span class="medaillon medaillon--plein">${lec.s}</span>
           <div><strong>Reprendre ta lecture</strong><span class="discret">${esc(nomDe(lec.s))}, verset ${lec.v}</span></div>${ico('droite')}
         </a>`
      : `<a class="lien-carte" href="#sourate-1">
           <span class="medaillon medaillon--plein">1</span>
           <div><strong>Commencer par Al-Fatiha</strong><span class="discret">La sourate d'ouverture, 7 versets</span></div>${ico('droite')}
         </a>`;

    let revision = '';
    if (dues.length) {
      revision = `<section class="carte carte--accent">
          <p class="carte__etiquette">À réviser</p>
          <h2>${nombre(dues.length, 'verset', 'versets')} à réviser aujourd'hui</h2>
          <p class="discret">Réviser un peu chaque jour fixe les versets dans la mémoire.</p>
          <a class="bouton" href="#reviser">Réviser maintenant</a>
        </section>`;
    } else if (Etat.nbAppris()) {
      const prochaine = Etat.prochaineRevision();
      revision = `<section class="carte">
          <h2>Rien à réviser aujourd'hui</h2>
          <p class="discret">${prochaine ? `Prochaine révision : ${esc(Outils.quand(prochaine))}.` : 'Bravo, tout est à jour.'}</p>
        </section>`;
    }

    let parcours;
    if (idx === -1) {
      parcours = `<section class="carte"><p class="carte__etiquette">Ton parcours</p><h2>Parcours terminé !</h2><p class="discret">Tu as appris tous les passages du parcours. Continue avec d'autres sourates dans l'onglet Coran.</p></section>`;
    } else {
      const e = etapes[idx];
      parcours = `<section class="carte">
          <p class="carte__etiquette">Ton parcours · étape ${idx + 1} sur ${etapes.length}</p>
          <h2>${esc(e.titre)}</h2>
          ${barre(idx, etapes.length)}
          <p class="discret">${esc(detailEtape(e))}</p>
          <div class="rangee"><a class="bouton" href="${lienEtape(e)}">Continuer</a><a class="bouton bouton--second" href="#apprendre">Voir tout le parcours</a></div>
        </section>`;
    }

    return {
      titre: 'Accueil',
      nav: 'accueil',
      html: `
        <div class="accueil-tete">
          <p class="salut">As-salâmu ‘alaykum</p>
          <h1>Apprends le Coran, un verset à la fois.</h1>
        </div>
        ${reprise}
        ${revision}
        ${parcours}
        <section class="carte verset-du-jour" aria-labelledby="jour-titre">
          <p class="carte__etiquette" id="jour-titre">Verset du jour</p>
          <div id="verset-jour" class="discret">Chargement…</div>
        </section>
        <section class="stats" aria-label="Ta progression">
          <a class="stat" href="#coran"><span class="stat__valeur">${Etat.nbAppris()}</span><span class="stat__nom">${Etat.nbAppris() > 1 ? 'versets appris' : 'verset appris'}</span></a>
          <div class="stat"><span class="stat__valeur">${Etat.serie()}</span><span class="stat__nom">${Etat.serie() > 1 ? 'jours d’affilée' : 'jour d’affilée'}</span></div>
          <a class="stat" href="#favoris"><span class="stat__valeur">${Etat.favoris().length}</span><span class="stat__nom">${Etat.favoris().length > 1 ? 'favoris' : 'favori'}</span></a>
        </section>
        <div class="pile">
          <a class="lien-carte" href="#alphabet"><div><strong>L'alphabet arabe</strong><span class="discret">Reconnaître les 28 lettres</span></div>${ico('droite')}</a>
          <a class="lien-carte" href="#tajwid"><div><strong>Les règles du tajwid</strong><span class="discret">Réciter avec justesse</span></div>${ico('droite')}</a>
        </div>`,
      apres: async () => {
        const zone = $('#verset-jour');
        try {
          const t = await Donnees.verset(js, jv);
          if (!zone || !t) return;
          zone.className = '';
          zone.innerHTML = `
            <blockquote>
              <p class="ar" lang="ar" dir="rtl">${esc(t.ar)}</p>
              <p class="fr">${esc(t.fr)}</p>
            </blockquote>
            <p class="discret">${esc(referenceTxt(js, jv))}</p>
            <div class="rangee" data-s="${js}" data-v="${jv}">
              <button type="button" class="bouton bouton--second" data-action="jouer-seul">${ico('son')} Écouter</button>
              <a class="bouton bouton--second" href="#sourate-${js}-${jv}">Lire la sourate</a>
            </div>`;
        } catch (e) {
          if (zone) zone.textContent = 'Le verset du jour s’affichera dès que tu seras connecté à internet.';
        }
      }
    };
  };

  /* ==========================================================================
     Liste des sourates + recherche
     ========================================================================== */
  const listeCtx = { filtre: 'toutes', q: '' };

  const nomPlat = (s) => Outils.sansAccents(s).replace(/[^a-z0-9]/g, '');
  const correspond = (x, q) => {
    if (!q) return true;
    if (/^\d+$/.test(q)) return x.n === Number(q);
    if (Outils.contientArabe(q)) {
      const cible = Outils.sansTashkil(q).replace(/\s/g, '');
      const nom = Outils.sansTashkil(x.ar).replace(/\s/g, '');
      return nom.includes(cible) || nom.replace(/^ال/, '').includes(cible.replace(/^ال/, ''));
    }
    const cible = nomPlat(q);
    return nomPlat(x.nom).includes(cible) || nomPlat(x.sens).includes(cible);
  };

  const ligneSourate = (x) => {
    const faits = Etat.nbApprisDe(x.n);
    return `<a class="sourate-ligne" href="#sourate-${x.n}">
        <span class="medaillon">${x.n}</span>
        <span class="sourate-ligne__corps">
          <strong>${esc(x.nom)}</strong>
          <span class="discret">${esc(x.sens)} · ${nombre(x.v, 'verset', 'versets')}</span>
          ${faits ? barre(faits, x.v) : ''}
        </span>
        <span class="sourate-ligne__ar" lang="ar">${esc(x.ar)}</span>
      </a>`;
  };

  const rendreListe = () => {
    const q = listeCtx.q.trim();
    let liste = Donnees.sourates.filter((x) => correspond(x, q));
    if (listeCtx.filtre === 'courtes') liste = liste.filter((x) => x.v <= 20);
    if (listeCtx.filtre === 'apprises') liste = liste.filter((x) => Etat.nbApprisDe(x.n) > 0);
    const zone = $('#liste');
    if (!zone) return;
    zone.innerHTML = liste.length
      ? liste.map(ligneSourate).join('')
      : `<div class="vide"><p>Aucune sourate ne correspond.</p></div>`;
    const plein = $('#chercher-versets');
    if (plein) {
      const utile = q.length >= 3 && !/^\d+$/.test(q);
      plein.hidden = !utile;
      plein.innerHTML = utile ? `${ico('coran')} Chercher « ${esc(q)} » dans les versets` : '';
    }
  };

  const coran = () => ({
    titre: 'Le Coran',
    nav: 'coran',
    html: `
      <h1>Les 114 sourates</h1>
      <div class="pile">
        <input class="recherche" id="recherche" type="search" placeholder="Nom, numéro ou sens (ex. vache)" aria-label="Chercher une sourate" autocomplete="off" data-input="recherche-sourates" value="${esc(listeCtx.q)}">
        <div class="puces" role="group" aria-label="Filtrer">
          ${[['toutes', 'Toutes'], ['courtes', 'Courtes'], ['apprises', 'Avec versets appris']]
            .map(([id, nom]) => `<button type="button" class="puce" aria-pressed="${listeCtx.filtre === id}" data-action="filtre-sourates" data-filtre="${id}">${nom}</button>`).join('')}
        </div>
      </div>
      <div class="liste-sourates" id="liste"></div>
      <button type="button" class="bouton bouton--second bouton--large" id="chercher-versets" data-action="chercher-versets" hidden></button>
      <div class="pile" id="resultats-versets" aria-live="polite"></div>`,
    apres: rendreListe
  });

  /* ==========================================================================
     Lecture d'une sourate
     ========================================================================== */
  let observateurLecture = null;

  const htmlVerset = (s, v, t) => `
    <li class="verset" id="v${v}" data-s="${s}" data-v="${v}">
      <div class="verset__haut">
        <span class="medaillon medaillon--petit">${v}</span>
        <div class="verset__actions">
          <button type="button" class="icone-btn" data-action="jouer" aria-label="Écouter le verset ${v}">${ico('play')}</button>
          <button type="button" class="icone-btn" data-action="favori" aria-pressed="${Etat.estFavori(s, v)}" aria-label="Favori : verset ${v}">${ico('etoile')}</button>
          <button type="button" class="icone-btn" data-action="appris" aria-pressed="${Etat.estAppris(s, v)}" aria-label="Verset ${v} appris">${ico('check')}</button>
        </div>
      </div>
      <p class="ar" lang="ar" dir="rtl">${esc(t[0])}</p>
      <p class="ph">${esc(t[1])}</p>
      <p class="fr">${esc(t[2])}</p>
    </li>`;

  const sourate = async ([argS, argV]) => {
    const n = Number(argS);
    if (!Number.isInteger(n) || n < 1 || n > Donnees.NB_SOURATES) return accueil();
    const x = Donnees.sourate(n);
    let textes;
    try {
      textes = await Donnees.charger(n);
    } catch (e) {
      return { titre: x.nom, retour: 'coran', nav: 'coran', html: erreurDonnees() };
    }
    const cible = Outils.borner(Number(argV) || 0, 0, x.v);
    const lec = Etat.lecture();
    const repriseVerset = !cible && lec && lec.s === n && lec.v > 1 ? Outils.borner(lec.v, 1, x.v) : 0;
    if (cible) Etat.noterLecture(n, cible); else if (!lec || lec.s !== n) Etat.noterLecture(n, 1);
    Etat.marquerJour();

    const avecBismillah = n !== 1 && n !== 9;
    const prev = n > 1 ? Donnees.sourate(n - 1) : null;
    const suiv = n < Donnees.NB_SOURATES ? Donnees.sourate(n + 1) : null;
    const r = Etat.reglages();

    return {
      titre: x.nom,
      retour: 'coran',
      nav: 'coran',
      html: `
        <article data-s="${n}" class="pile">
          <header class="sourate-tete">
            <p class="discret">Sourate ${n} · ${x.lieu === 'M' ? 'Mecquoise' : 'Médinoise'} · ${nombre(x.v, 'verset', 'versets')}</p>
            <h1 class="sourate-tete__ar" lang="ar">${esc(x.ar)}</h1>
            <p class="sourate-tete__nom"><strong>${esc(x.nom)}</strong> · ${esc(x.sens)}</p>
            <div class="rangee">
              <button type="button" class="bouton" data-action="ecouter-sourate">${ico('play')} Écouter la sourate</button>
              <a class="bouton bouton--second" href="#etude-${n}">Mémoriser</a>
            </div>
            ${repriseVerset ? `<a href="#sourate-${n}-${repriseVerset}">Reprendre au verset ${repriseVerset}</a>` : ''}
          </header>
          <div class="reglages-lecture" role="group" aria-label="Affichage">
            <button type="button" class="puce" aria-pressed="${r.phonetique}" data-action="afficher-phonetique">Phonétique</button>
            <button type="button" class="puce" aria-pressed="${r.traduction}" data-action="afficher-traduction">Traduction</button>
            <span class="reglages-lecture__taille">
              <button type="button" class="icone-btn" data-action="taille-moins" aria-label="Texte arabe plus petit">${ico('moins')}</button>
              <span aria-hidden="true" class="ar-petit">ع</span>
              <button type="button" class="icone-btn" data-action="taille-plus" aria-label="Texte arabe plus grand">${ico('plus')}</button>
            </span>
          </div>
          ${x.v > 15 ? `<div class="aller-verset"><label for="aller-v">Aller au verset</label><input id="aller-v" type="number" inputmode="numeric" min="1" max="${x.v}" placeholder="1 – ${x.v}"><button type="button" class="bouton bouton--second" data-action="aller-verset">Aller</button></div>` : ''}
          ${avecBismillah ? `<button type="button" class="bismillah" data-action="bismillah" aria-label="Écouter la basmala"><span class="ar" lang="ar" dir="rtl">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</span></button>` : ''}
          <ol class="versets">${textes.map((t, i) => htmlVerset(n, i + 1, t)).join('')}</ol>
          <nav class="sourate-nav" aria-label="Sourate précédente ou suivante">
            ${prev ? `<a class="bouton bouton--second" href="#sourate-${prev.n}">${ico('retour')} ${esc(prev.nom)}</a>` : '<span></span>'}
            ${suiv ? `<a class="bouton bouton--second" href="#sourate-${suiv.n}">${esc(suiv.nom)} ${ico('droite')}</a>` : '<span></span>'}
          </nav>
        </article>`,
      ancre: cible > 1 ? `#v${cible}` : null,
      apres: () => {
        if (observateurLecture) observateurLecture.disconnect();
        if ('IntersectionObserver' in window) {
          let attente = 0;
          observateurLecture = new IntersectionObserver((entrees) => {
            for (const en of entrees) {
              if (!en.isIntersecting) continue;
              const v = Number(en.target.dataset.v);
              clearTimeout(attente);
              attente = setTimeout(() => Etat.noterLecture(n, v), 600);
            }
          }, { rootMargin: '-15% 0px -80% 0px' });
          $$('.verset').forEach((el) => observateurLecture.observe(el));
        }
        surLecteur(Lecteur.etat());
      }
    };
  };

  /* ==========================================================================
     Mémoriser : masquer des mots, puis quiz
     ========================================================================== */
  const NIVEAUX = ['Tout est visible', 'Quelques mots cachés', 'La moitié est cachée', 'Presque tout est caché', 'Tout est caché'];
  let etude = null; // { s, de, a, textes, onglet, niveau, repetitions, quiz }

  // Nombre pseudo-aléatoire stable pour (sourate, verset, mot) : les mêmes mots restent cachés quand on change de niveau.
  const hachage = (s, v, i) => {
    let h = Math.imul(s, 73856093) ^ Math.imul(v, 19349663) ^ Math.imul(i + 1, 83492791);
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const motsCaches = (s, v, nb, niveau) => {
    const part = [0, 0.25, 0.5, 0.75, 1][niveau];
    const rangs = Array.from({ length: nb }, (_, i) => hachage(s, v, i));
    const caches = new Set();
    rangs.forEach((r, i) => { if (niveau === 4 || r < part) caches.add(i); });
    if (niveau > 0 && caches.size === 0) caches.add(rangs.indexOf(Math.min(...rangs)));
    return caches;
  };

  const htmlMots = (s, v, arabe, niveau) => {
    const mots = Donnees.mots(arabe);
    const caches = motsCaches(s, v, mots.length, niveau);
    return mots.map((m, i) => (caches.has(i)
      ? `<span class="mot cache" role="button" tabindex="0" data-action="reveler-mot" aria-label="Mot caché, touche pour le voir">${esc(m)}</span>`
      : `<span class="mot">${esc(m)}</span>`)).join(' ');
  };

  const optionsPlage = (max, choisi, minimum = 1) => {
    let html = '';
    for (let v = minimum; v <= max; v++) html += `<option value="${v}"${v === choisi ? ' selected' : ''}>${v}</option>`;
    return html;
  };

  const rendrePanneauMasque = () => {
    const e = etude;
    let html = `
      <div class="niveau">
        <label for="niveau"><strong>Mots cachés :</strong> <output id="niveau-txt">${NIVEAUX[e.niveau]}</output></label>
        <input id="niveau" type="range" min="0" max="4" step="1" value="${e.niveau}" data-input="niveau-masque">
      </div>
      <div class="rangee">
        <button type="button" class="bouton" data-action="ecouter-passage">${ico('play')} Écouter</button>
        <label class="discret" for="etude-rep">chaque verset</label>
        <select id="etude-rep" data-change="etude-repetitions" aria-label="Nombre de répétitions">
          ${[1, 3, 5, 10].map((n) => `<option value="${n}"${n === e.repetitions ? ' selected' : ''}>${n} fois</option>`).join('')}
        </select>
      </div>
      <p class="discret">Touche un mot caché pour le faire apparaître. Récite à voix haute, puis vérifie.</p>
      <ol class="etude-versets" id="etude-versets">`;
    for (let v = e.de; v <= e.a; v++) {
      const t = e.textes[v - 1];
      html += `<li class="etude-verset" data-s="${e.s}" data-v="${v}">
          <div class="verset__haut"><span class="medaillon medaillon--petit">${v}</span>
            <button type="button" class="icone-btn" data-action="jouer-seul" aria-label="Écouter le verset ${v}">${ico('play')}</button></div>
          <p class="ar" lang="ar" dir="rtl">${htmlMots(e.s, v, t[0], e.niveau)}</p>
          <p class="ph">${esc(t[1])}</p>
          <p class="fr">${esc(t[2])}</p>
        </li>`;
    }
    html += `</ol>
      <div class="carte">
        <h2>Tu connais ce passage ?</h2>
        <p class="discret">Marque-le comme appris : il sera ajouté à tes révisions, avec un premier rappel demain.</p>
        <button type="button" class="bouton bouton--bon" data-action="sais-passage">${ico('check')} Je connais ces versets</button>
      </div>`;
    return html;
  };

  /* ----- Quiz : retrouver le mot manquant ----- */
  const longueurBase = (m) => Outils.sansTashkil(m).length;
  const construireQuiz = async (e) => {
    let tousMots = e.textes.flatMap((t) => Donnees.mots(t[0]));
    if (new Set(tousMots).size < 12) {
      try { tousMots = tousMots.concat((await Donnees.charger(1)).flatMap((t) => Donnees.mots(t[0]))); } catch (err) { /* pas grave */ }
    }
    const versets = [];
    for (let v = e.de; v <= e.a; v++) versets.push(v);
    const nb = Outils.borner(versets.length * 2, 4, 8);
    const ordre = [];
    while (ordre.length < nb) ordre.push(...Outils.melanger(versets));
    const dejaPris = new Set();
    const questions = ordre.slice(0, nb).map((v) => {
      const mots = Donnees.mots(e.textes[v - 1][0]);
      let candidats = mots.map((m, i) => i).filter((i) => longueurBase(mots[i]) >= 3 && !dejaPris.has(`${v}:${i}`));
      if (!candidats.length) candidats = mots.map((m, i) => i);
      const idx = candidats[Math.floor(Math.random() * candidats.length)];
      dejaPris.add(`${v}:${idx}`);
      const bonne = mots[idx];
      const bonnePlate = Outils.sansTashkil(bonne);
      const pool = Array.from(new Set(tousMots)).filter((m) => Outils.sansTashkil(m) !== bonnePlate);
      const proches = Outils.melanger(pool).sort((a, b) => Math.abs(longueurBase(a) - longueurBase(bonne)) - Math.abs(longueurBase(b) - longueurBase(bonne))).slice(0, 8);
      const options = Outils.melanger([bonne, ...Outils.melanger(proches).slice(0, 3)]);
      return { v, mots, idx, bonne, options };
    });
    return { questions, i: 0, score: 0, repondu: false };
  };

  const rendrePanneauQuiz = () => {
    const e = etude;
    const q = e.quiz;
    if (!q) return '<p class="chargement">Préparation du quiz…</p>';
    if (q.i >= q.questions.length) {
      const sur = q.questions.length;
      const bravo = q.score === sur ? 'Parfait, sans faute !' : q.score >= sur * 0.7 ? 'Très bien, tu y es presque.' : 'Continue : réécoute le passage et réessaie.';
      return `<div class="carte centre">
          <p class="carte__etiquette">Résultat</p>
          <p class="score">${q.score} / ${sur}</p>
          <p>${bravo}</p>
          <div class="rangee" style="justify-content:center">
            <button type="button" class="bouton" data-action="quiz-refaire">Recommencer</button>
            <button type="button" class="bouton bouton--bon" data-action="sais-passage">${ico('check')} Je connais ces versets</button>
          </div>
        </div>`;
    }
    const cur = q.questions[q.i];
    const t = e.textes[cur.v - 1];
    const phrase = cur.mots.map((m, i) => (i === cur.idx
      ? `<span class="quiz-trou${q.repondu ? ' rempli' : ''}" id="quiz-trou">${esc(cur.bonne)}</span>`
      : esc(m))).join(' ');
    return `
      <p class="quiz-compteur">Question ${q.i + 1} sur ${q.questions.length}</p>
      <div class="etude-verset" data-s="${e.s}" data-v="${cur.v}">
        <div class="verset__haut"><span class="medaillon medaillon--petit">${cur.v}</span>
          <button type="button" class="icone-btn" data-action="jouer-seul" aria-label="Écouter le verset">${ico('play')}</button></div>
        <p class="ar" lang="ar" dir="rtl">${phrase}</p>
        <p class="fr">${esc(t[2])}</p>
      </div>
      <p><strong>Quel mot manque ?</strong></p>
      <div class="options">
        ${cur.options.map((o, k) => `<button type="button" class="option" lang="ar" dir="rtl" data-action="reponse" data-k="${k}"${q.repondu ? ' disabled' : ''}>${esc(o)}</button>`).join('')}
      </div>
      <div id="quiz-retour" aria-live="polite"></div>`;
  };

  const rendreEtude = () => {
    if (!etude || !$('#etude-panneau')) return;
    $('#etude-panneau').innerHTML = etude.onglet === 'quiz' ? rendrePanneauQuiz() : rendrePanneauMasque();
    $$('[data-onglet]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.onglet === etude.onglet)));
    $('#etude-titre-plage').textContent = etude.de === etude.a ? `verset ${etude.de}` : `versets ${etude.de} à ${etude.a}`;
    surLecteur(Lecteur.etat());
  };

  const etudeVue = async ([argS, argDe, argA]) => {
    const s = Number(argS);
    if (!Number.isInteger(s) || s < 1 || s > Donnees.NB_SOURATES) return accueil();
    const x = Donnees.sourate(s);
    let textes;
    try { textes = await Donnees.charger(s); } catch (e) { return { titre: 'Mémoriser', retour: `sourate-${s}`, nav: 'coran', html: erreurDonnees() }; }
    let de = Number(argDe);
    if (!de) { de = 1; while (de < x.v && Etat.estAppris(s, de)) de++; }
    de = Outils.borner(de, 1, x.v);
    const a = Outils.borner(Number(argA) || Math.min(de + 2, x.v), de, x.v);
    const meme = etude && etude.s === s;
    etude = { s, de, a, textes, onglet: 'masque', niveau: meme ? etude.niveau : 1, repetitions: meme ? etude.repetitions : 3, quiz: null };
    Etat.marquerJour();

    return {
      titre: `Mémoriser ${x.nom}`,
      retour: `sourate-${s}`,
      nav: 'coran',
      html: `
        <header class="pile">
          <h1>Mémoriser</h1>
          <p><strong>${esc(x.nom)}</strong> · <span id="etude-titre-plage"></span></p>
          <div class="plage">
            <label>Du verset <select id="etude-de" data-change="etude-plage">${optionsPlage(x.v, de)}</select></label>
            <label>au verset <select id="etude-a" data-change="etude-plage">${optionsPlage(x.v, a)}</select></label>
          </div>
          <p class="discret">Astuce : apprends 2 à 4 versets à la fois, puis ajoute les suivants.</p>
        </header>
        <div class="onglets" role="tablist" aria-label="Méthode">
          <button type="button" role="tab" data-action="onglet" data-onglet="masque" aria-selected="true">Cacher des mots</button>
          <button type="button" role="tab" data-action="onglet" data-onglet="quiz" aria-selected="false">Quiz</button>
        </div>
        <div class="pile" id="etude-panneau" role="tabpanel"></div>`,
      apres: rendreEtude
    };
  };

  /* ==========================================================================
     Réviser (cartes à répétition espacée)
     ========================================================================== */
  let rev = null; // { file, i, revele, sus, revoir, textes }

  const rendreRevision = () => {
    const zone = $('#revision');
    if (!zone || !rev) return;
    if (rev.i >= rev.file.length) {
      const prochaine = Etat.prochaineRevision();
      zone.innerHTML = `<div class="carte centre">
          <p class="carte__etiquette">Terminé</p>
          <h2>Bien joué !</h2>
          <p>${rev.sus} su${rev.sus > 1 ? 's' : ''} · ${rev.revoir} à revoir</p>
          <p class="discret">${prochaine ? `Prochaine révision : ${esc(Outils.quand(prochaine))}.` : ''}</p>
          <a class="bouton" href="#accueil">Retour à l'accueil</a>
        </div>`;
      majPastille();
      return;
    }
    const c = rev.file[rev.i];
    const t = rev.textes[c.s][c.v - 1];
    const mots = Donnees.mots(t[0]);
    zone.innerHTML = `
      <p class="quiz-compteur centre">Carte ${rev.i + 1} sur ${rev.file.length}</p>
      <article class="carte carte-revision" data-s="${c.s}" data-v="${c.v}">
        <p class="carte-revision__ref">${esc(nomDe(c.s))}, verset ${c.v}</p>
        <p class="carte-revision__fr">${esc(t[2])}</p>
        ${rev.revele
          ? `<p class="ar" lang="ar" dir="rtl">${esc(t[0])}</p><p class="ph">${esc(t[1])}</p>`
          : `<p class="discret">Récite ce verset à voix haute. Premier mot : <span class="ar-petit" lang="ar">${esc(mots[0])}</span></p>`}
        <div class="rangee" style="justify-content:center">
          <button type="button" class="bouton bouton--second" data-action="jouer-seul">${ico('son')} Écouter</button>
        </div>
      </article>
      ${rev.revele
        ? `<div class="choix-note">
             <button type="button" class="bouton bouton--alerte" data-action="noter" data-sais="0">À revoir</button>
             <button type="button" class="bouton bouton--bon" data-action="noter" data-sais="1">Je le savais</button>
           </div>`
        : `<button type="button" class="bouton bouton--large" data-action="voir-verset">${ico('oeil')} Voir le verset</button>`}`;
  };

  const reviser = async () => {
    const dues = Etat.aReviser();
    if (!dues.length) {
      const prochaine = Etat.prochaineRevision();
      const aucun = !Etat.nbAppris();
      return {
        titre: 'Réviser', nav: 'reviser',
        html: `<h1>Réviser</h1>
          <div class="carte centre">
            <h2>${aucun ? 'Pas encore de versets à réviser' : 'Tout est à jour'}</h2>
            <p class="discret">${aucun ? 'Quand tu marques des versets comme appris, ils reviennent ici au bon moment : demain, dans 3 jours, dans une semaine…' : `Prochaine révision : ${esc(Outils.quand(prochaine || Outils.aujourdhui()))}.`}</p>
            <a class="bouton" href="#apprendre">${aucun ? 'Voir le parcours' : 'Apprendre de nouveaux versets'}</a>
          </div>`
      };
    }
    const file = dues.slice(0, 10);
    const textes = {};
    try {
      await Promise.all([...new Set(file.map((c) => c.s))].map(async (s) => { textes[s] = await Donnees.charger(s); }));
    } catch (e) {
      return { titre: 'Réviser', nav: 'reviser', html: `<h1>Réviser</h1>${erreurDonnees()}` };
    }
    rev = { file, i: 0, revele: false, sus: 0, revoir: 0, textes };
    Etat.marquerJour();
    return {
      titre: 'Réviser',
      nav: 'reviser',
      html: `<h1>Réviser</h1>
        <p class="discret">${nombre(dues.length, 'verset à réviser', 'versets à réviser')}${dues.length > 10 ? ' · 10 par séance' : ''}</p>
        <div class="pile" id="revision"></div>`,
      apres: rendreRevision
    };
  };

  /* ==========================================================================
     Apprendre : parcours et leçons
     ========================================================================== */
  const apprendre = () => {
    const etapes = CONTENU.parcours;
    const idx = etapeCourante();
    const faites = idx === -1 ? etapes.length : idx;
    const lecon = (id, titre, texte) => `<a class="lien-carte" href="#${id}">
        <div><strong>${titre}</strong><span class="discret">${texte}</span></div>
        ${Etat.leconFaite(id) ? '<span class="etiquette etiquette--bon">Terminée</span>' : ico('droite')}
      </a>`;
    return {
      titre: 'Apprendre',
      nav: 'apprendre',
      html: `
        <h1>Apprendre</h1>
        <section class="carte">
          <p class="carte__etiquette">Ton parcours</p>
          <h2>${faites} étape${faites > 1 ? 's' : ''} sur ${etapes.length}</h2>
          ${barre(faites, etapes.length)}
          <p class="discret">On commence par les lettres, puis les voyelles, puis les sourates courtes du Coran : c'est la voie la plus simple.</p>
        </section>
        <section class="pile" aria-label="Leçons">
          ${lecon('alphabet', "L'alphabet arabe", '28 lettres, leurs formes et leurs sons')}
          ${lecon('voyelles', 'Les voyelles et les signes', 'Lire une syllabe, un mot, un verset')}
          ${lecon('tajwid', 'Les règles du tajwid', 'Réciter avec justesse, avec des exemples du Coran')}
        </section>
        <section class="pile">
          <h2>Étape par étape</h2>
          <ol class="parcours">
            ${etapes.map((e, i) => {
              const fait = i < idx || idx === -1 || etapeTerminee(e);
              const courante = i === idx;
              return `<li class="etape${fait ? ' etape--fait' : ''}${courante ? ' etape--courante' : ''}">
                  <span class="etape__marque">${fait ? ico('check') : i + 1}</span>
                  <div class="etape__corps"><a href="${lienEtape(e)}">${esc(e.titre)}</a><span class="discret">${esc(detailEtape(e))}</span></div>
                  ${courante ? `<a class="bouton" href="${lienEtape(e)}">Continuer</a>` : ''}
                </li>`;
            }).join('')}
          </ol>
        </section>
        <p class="note-enseignant">Pour bien réciter, rien ne remplace un enseignant qui t'écoute. Cette application t'aide à t'entraîner entre deux cours.</p>`
    };
  };

  /* ==========================================================================
     Alphabet
     ========================================================================== */
  // Le trait de liaison (tatouil, U+0640) montre où la lettre s'accroche à ses voisines
  const TATOUIL = Outils.car(0x0640);
  const HAMZA = Outils.car(0x0621);
  const formesLettre = (x) => {
    if (x.l === HAMZA) return { seule: x.l, debut: x.l, milieu: x.l, fin: x.l }; // la hamza ne se lie jamais
    if (!x.lie) return { seule: x.l, debut: x.l, milieu: TATOUIL + x.l, fin: TATOUIL + x.l };
    return { seule: x.l, debut: x.l + TATOUIL, milieu: TATOUIL + x.l + TATOUIL, fin: TATOUIL + x.l };
  };
  let quizLettres = null;

  const alphabet = ([mode]) => {
    if (mode === 'quiz') return quizAlphabet();
    const lettres = CONTENU.alphabet;
    const fait = Etat.leconFaite('alphabet');
    return {
      titre: "L'alphabet arabe",
      retour: 'apprendre',
      nav: 'apprendre',
      html: `
        <h1>L'alphabet arabe</h1>
        <p class="discret">L'arabe s'écrit de droite à gauche. Touche une lettre pour voir son son et ses formes (seule, au début, au milieu, à la fin d'un mot).</p>
        <div class="rangee">
          <a class="bouton" href="#alphabet-quiz">S'entraîner avec un quiz</a>
        </div>
        <div class="grille-lettres" dir="rtl">
          ${lettres.map((x, i) => `<button type="button" class="lettre" data-action="lettre" data-i="${i}">
              <span class="lettre__glyphe" lang="ar">${x.l}</span><span class="lettre__nom" dir="ltr">${esc(x.nom)}</span></button>`).join('')}
        </div>
        <div class="carte">
          <p>${fait ? 'Tu as terminé cette leçon.' : "Quand tu reconnais les lettres, marque la leçon comme terminée."}</p>
          <button type="button" class="bouton ${fait ? 'bouton--second' : 'bouton--bon'}" data-action="lecon-faite" data-id="alphabet" data-suite="voyelles">${fait ? 'Leçon terminée ✓' : "J'ai terminé cette leçon"}</button>
          <a class="bouton bouton--second" href="#voyelles">Leçon suivante : les voyelles</a>
        </div>`
    };
  };

  const ouvrirLettre = (i) => {
    const lettres = CONTENU.alphabet;
    const x = lettres[i];
    const f = formesLettre(x);
    const proches = CONTENU.familles.find((fam) => fam.includes(x.l));
    const autres = proches ? Array.from(proches).filter((c) => c !== x.l) : [];
    ouvrirDialogue(`
      <button type="button" class="icone-btn dialogue__fermer" data-action="fermer-dialogue" aria-label="Fermer">${ico('fermer')}</button>
      <div class="lettre-detail">
        <p class="lettre-detail__glyphe" lang="ar">${x.l}</p>
        <h2 id="dialogue-titre">${esc(x.nom)}</h2>
        ${x.lat ? `<p class="discret">On l'écrit « ${esc(x.lat)} » en français</p>` : ''}
        <p>${esc(x.son)}</p>
        <div class="formes" dir="rtl">
          <div class="forme"><span lang="ar">${f.fin}</span><small>Fin</small></div>
          <div class="forme"><span lang="ar">${f.milieu}</span><small>Milieu</small></div>
          <div class="forme"><span lang="ar">${f.debut}</span><small>Début</small></div>
          <div class="forme"><span lang="ar">${f.seule}</span><small>Seule</small></div>
        </div>
        <p class="discret">${esc(x.astuce)}${x.lie || x.l === HAMZA ? '' : ' Cette lettre ne se lie jamais à la lettre qui la suit.'}</p>
        ${autres.length ? `<p class="discret">Elle ressemble à : <span class="ar-en-ligne" lang="ar" dir="rtl">${autres.join(' ')}</span></p>` : ''}
        <div class="lettre-detail__nav">
          <button type="button" class="bouton bouton--second" data-action="lettre" data-i="${(i + lettres.length - 1) % lettres.length}">${ico('retour')} Précédente</button>
          <button type="button" class="bouton bouton--second" data-action="lettre" data-i="${(i + 1) % lettres.length}">Suivante ${ico('droite')}</button>
        </div>
      </div>`);
  };

  const quizAlphabet = () => {
    if (!quizLettres || quizLettres.i >= quizLettres.questions.length) {
      const base = CONTENU.alphabet.slice(0, 28);
      quizLettres = { questions: Outils.melanger(base).slice(0, 10).map((x) => ({
        x, options: Outils.melanger([x, ...Outils.melanger(base.filter((y) => y.nom !== x.nom)).slice(0, 3)])
      })), i: 0, score: 0, repondu: false };
    }
    return {
      titre: 'Quiz des lettres',
      retour: 'alphabet',
      nav: 'apprendre',
      html: '<h1>Quiz des lettres</h1><div class="pile" id="quiz-lettres"></div>',
      apres: rendreQuizLettres
    };
  };

  function rendreQuizLettres() {
    const zone = $('#quiz-lettres');
    const q = quizLettres;
    if (!zone || !q) return;
    if (q.i >= q.questions.length) {
      const reussi = q.score >= 8;
      if (reussi) Etat.faireLecon('alphabet');
      zone.innerHTML = `<div class="carte centre">
          <p class="carte__etiquette">Résultat</p>
          <p class="score">${q.score} / ${q.questions.length}</p>
          <p>${reussi ? "Excellent, tu connais bien les lettres ! La leçon est validée." : 'Pas mal ! Regarde encore les lettres, puis réessaie.'}</p>
          <div class="rangee" style="justify-content:center">
            <button type="button" class="bouton" data-action="quiz-lettres-refaire">Recommencer</button>
            <a class="bouton bouton--second" href="#alphabet">Revoir les lettres</a>
          </div>
        </div>`;
      return;
    }
    const cur = q.questions[q.i];
    zone.innerHTML = `
      <p class="quiz-compteur">Question ${q.i + 1} sur ${q.questions.length}</p>
      <div class="carte centre"><p class="lettre-detail__glyphe" lang="ar">${cur.x.l}</p><p><strong>Comment s'appelle cette lettre ?</strong></p></div>
      <div class="options">
        ${cur.options.map((o, k) => `<button type="button" class="option option--nom" data-action="reponse-lettre" data-k="${k}"${q.repondu ? ' disabled' : ''}>${esc(o.nom)}</button>`).join('')}
      </div>
      <div id="quiz-retour" aria-live="polite"></div>`;
  }

  /* ==========================================================================
     Voyelles
     ========================================================================== */
  // Signes écrits au-dessus ou au-dessous d'une lettre (numéros Unicode)
  const SIGNES = {
    fatha: Outils.car(0x64e),
    damma: Outils.car(0x64f),
    kasra: Outils.car(0x650),
    soukoun: Outils.car(0x652),
    chadda: Outils.car(0x651, 0x64e),
    'tanwin-fath': Outils.car(0x64b),
    'tanwin-damm': Outils.car(0x64c),
    'tanwin-kasr': Outils.car(0x64d)
  };
  const syllabe = (lat, id) => ({
    fatha: `${lat}a`, damma: `${lat}ou`, kasra: `${lat}i`, soukoun: lat, chadda: `${lat}${lat}a`,
    'tanwin-fath': `${lat}an`, 'tanwin-damm': `${lat}oun`, 'tanwin-kasr': `${lat}in`
  })[id];
  const atelier = { lettre: 1, signe: 'fatha' }; // lettre : numéro dans CONTENU.alphabet (1 = ب)

  const rendreAtelier = () => {
    const zone = $('#atelier-zone');
    if (!zone) return;
    const x = CONTENU.alphabet[atelier.lettre];
    const v = CONTENU.voyelles.find((y) => y.id === atelier.signe);
    zone.innerHTML = `
      <div class="atelier__resultat" aria-live="polite">
        <span class="ar-petit" lang="ar">${x.l}${SIGNES[atelier.signe]}</span>
        <span class="atelier__lecture">${esc(syllabe(x.lat, atelier.signe))}</span>
        <span class="discret">${esc(v.nom)}${x.nom.includes('grave') || x.nom === 'Aïn' || x.nom === 'Hâ fort' || x.nom === 'Khâ' || x.nom === 'Ghaïn' || x.l === 'ق' || x.l === 'ص' || x.l === 'ض' ? ' · écoute bien cette lettre, elle se prononce plus au fond de la gorge' : ''}</span>
      </div>`;
    $$('[data-lettre]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.lettre) === atelier.lettre)));
    $$('[data-signe]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.signe === atelier.signe)));
  };

  const voyelles = () => {
    const fait = Etat.leconFaite('voyelles');
    const lettresBase = CONTENU.alphabet.map((x, i) => ({ x, i })).filter(({ x }) => x.l !== 'ا' && x.l !== 'ء');
    return {
      titre: 'Les voyelles',
      retour: 'apprendre',
      nav: 'apprendre',
      html: `
        <h1>Les voyelles et les signes</h1>
        <p class="discret">En arabe, les lettres sont des consonnes. Les voyelles sont de petits signes posés au-dessus ou au-dessous. Dans le Coran, ils sont tous écrits : il suffit de les lire.</p>
        <section class="pile" aria-labelledby="h-atelier">
          <h2 id="h-atelier">Essaie toi-même</h2>
          <div class="atelier">
            <div id="atelier-zone"></div>
            <div><p class="libelle"><strong>1. Choisis une lettre</strong></p>
              <div class="grille-choix" dir="rtl">${lettresBase.map(({ x, i }) => `<button type="button" lang="ar" data-action="atelier-lettre" data-lettre="${i}" aria-pressed="false" aria-label="${esc(x.nom)}">${x.l}</button>`).join('')}</div></div>
            <div><p class="libelle"><strong>2. Choisis un signe</strong></p>
              <div class="grille-choix grille-choix--signes">${CONTENU.voyelles.map((y) => `<button type="button" data-action="atelier-signe" data-signe="${y.id}" aria-pressed="false"><span class="ar-petit" lang="ar">ـ${y.signe}</span>${esc(y.nom)}</button>`).join('')}</div></div>
          </div>
        </section>
        <section class="pile" aria-labelledby="h-signes">
          <h2 id="h-signes">Les signes un par un</h2>
          <div class="signes">
            ${CONTENU.voyelles.map((y) => `<div class="signe-carte">
                <div class="signe-carte__haut"><strong>${esc(y.nom)}</strong><span class="ar-petit" lang="ar">${y.exemple}</span></div>
                <span class="etiquette" style="justify-self:start">${esc(y.lecture)}</span>
                <p class="discret">${esc(y.texte)}</p></div>`).join('')}
          </div>
        </section>
        <section class="pile" aria-labelledby="h-longues">
          <h2 id="h-longues">Les voyelles longues</h2>
          <p class="discret">Quand une voyelle est suivie d'un alif, d'un waw ou d'un yâ, on la tient deux fois plus longtemps.</p>
          <div class="signes">
            ${CONTENU.voyellesLongues.map((y) => `<div class="signe-carte"><div class="signe-carte__haut"><strong>${esc(y.lecture)}</strong><span class="ar-petit" lang="ar">${y.exemple}</span></div><p class="discret">${esc(y.texte)}</p></div>`).join('')}
          </div>
        </section>
        <section class="pile" aria-labelledby="h-autres">
          <h2 id="h-autres">D'autres signes que tu verras</h2>
          <div class="tableau-signes">
            ${CONTENU.autresSignes.map((y) => `<div class="ligne-signe"><span class="ar-petit" lang="ar">${y.exemple}</span><div><strong>${esc(y.nom)}</strong><p class="discret">${esc(y.texte)}</p></div></div>`).join('')}
          </div>
        </section>
        <div class="carte">
          <button type="button" class="bouton ${fait ? 'bouton--second' : 'bouton--bon'}" data-action="lecon-faite" data-id="voyelles" data-suite="apprendre">${fait ? 'Leçon terminée ✓' : "J'ai terminé cette leçon"}</button>
        </div>`,
      apres: rendreAtelier
    };
  };

  /* ==========================================================================
     Tajwid
     ========================================================================== */
  const ARABE_SUITE = new RegExp(`${Outils.ARABE}+(?:\\s+${Outils.ARABE}+)*`, 'g');
  const texteAvecArabe = (txt) => esc(txt).replace(ARABE_SUITE, (m) => `<span class="ar-en-ligne" lang="ar" dir="rtl">${m}</span>`);

  const tajwid = () => {
    const regles = CONTENU.tajwid;
    const groupes = [...new Set(regles.map((r) => r.groupe))];
    const fait = Etat.leconFaite('tajwid');
    return {
      titre: 'Le tajwid',
      retour: 'apprendre',
      nav: 'apprendre',
      html: `
        <h1>Les règles du tajwid</h1>
        <p class="discret">Le tajwid, c'est l'art de bien prononcer chaque lettre et de respecter les durées. Voici les règles de base, avec des exemples pris dans le Coran. Touche un exemple pour l'écouter.</p>
        <div class="pile">
          ${groupes.map((g, k) => `<details class="groupe"${k === 0 ? ' open' : ''}>
              <summary>${esc(g)}</summary>
              <div class="groupe__corps">
                ${regles.filter((r) => r.groupe === g).map((r) => `<div class="regle">
                    <h3>${esc(r.titre)}</h3>
                    <p>${texteAvecArabe(r.texte)}</p>
                    ${r.exemples.map((ex) => `<div class="exemple" data-s="${ex.s}" data-v="${ex.v}" data-de="${ex.mots[0]}" data-a="${ex.mots[1]}">
                        <div class="ar" lang="ar" dir="rtl">…</div>
                        ${ex.note ? `<p class="discret">${esc(ex.note)}</p>` : ''}
                        <div class="exemple__pied"><button type="button" class="icone-btn" data-action="jouer-seul" aria-label="Écouter l'exemple">${ico('play')}</button><a href="#sourate-${ex.s}-${ex.v}">${esc(nomDe(ex.s))} ${ex.s}:${ex.v}</a></div>
                      </div>`).join('')}
                  </div>`).join('')}
              </div>
            </details>`).join('')}
          <details class="groupe">
            <summary>Les signes d'arrêt</summary>
            <div class="groupe__corps">
              <p class="discret">Ces petits signes au-dessus des mots indiquent où l'on peut ou non s'arrêter.</p>
              <div class="tableau-signes">
                ${CONTENU.signesArret.map((y) => `<div class="ligne-signe"><span class="ar-petit" lang="ar">${y.signe}</span><p>${esc(y.texte)}</p></div>`).join('')}
              </div>
            </div>
          </details>
        </div>
        <p class="note-enseignant">Le tajwid s'apprend surtout en écoutant et en répétant avec un enseignant. Ces pages sont un aide-mémoire pour t'accompagner.</p>
        <div class="carte">
          <button type="button" class="bouton ${fait ? 'bouton--second' : 'bouton--bon'}" data-action="lecon-faite" data-id="tajwid" data-suite="apprendre">${fait ? 'Leçon terminée ✓' : "J'ai terminé cette leçon"}</button>
        </div>`,
      apres: async () => {
        const zones = $$('.exemple');
        await Promise.all(zones.map(async (zone) => {
          const s = Number(zone.dataset.s);
          const v = Number(zone.dataset.v);
          const de = Number(zone.dataset.de);
          const a = Number(zone.dataset.a);
          const cible = $('.ar', zone);
          try {
            const t = await Donnees.verset(s, v);
            const mots = Donnees.mots(t.ar);
            const debut = Math.max(0, de - 2);
            const fin = Math.min(mots.length - 1, a + 2);
            const morceaux = [];
            for (let i = debut; i <= fin; i++) morceaux.push(i >= de && i <= a ? `<mark>${esc(mots[i])}</mark>` : esc(mots[i]));
            cible.innerHTML = `${debut > 0 ? '… ' : ''}${morceaux.join(' ')}${fin < mots.length - 1 ? ' …' : ''}`;
          } catch (e) {
            cible.innerHTML = '<span class="discret" dir="ltr">Exemple disponible avec internet</span>';
          }
        }));
      }
    };
  };

  /* ==========================================================================
     Favoris
     ========================================================================== */
  const favoris = async () => {
    const liste = Etat.favoris();
    if (!liste.length) {
      return { titre: 'Favoris', retour: 'accueil', nav: 'coran', html: `<h1>Mes favoris</h1><div class="vide"><p>Tu n'as pas encore de favoris.</p><p class="discret">Touche l'étoile à côté d'un verset pour le retrouver ici.</p><a class="bouton" href="#coran">Ouvrir le Coran</a></div>` };
    }
    let textes = {};
    try {
      await Promise.all([...new Set(liste.map((x) => x.s))].map(async (s) => { textes[s] = await Donnees.charger(s); }));
    } catch (e) { textes = null; }
    if (!textes) return { titre: 'Favoris', retour: 'accueil', nav: 'coran', html: `<h1>Mes favoris</h1>${erreurDonnees()}` };
    return {
      titre: 'Favoris',
      retour: 'accueil',
      nav: 'coran',
      html: `<h1>Mes favoris</h1>
        <ol class="versets">
          ${liste.map(({ s, v }) => `<li class="verset" data-s="${s}" data-v="${v}">
              <div class="verset__haut"><a class="resultat-verset__ref" href="#sourate-${s}-${v}">${esc(referenceTxt(s, v))}</a>
                <div class="verset__actions">
                  <button type="button" class="icone-btn" data-action="jouer-seul" aria-label="Écouter">${ico('play')}</button>
                  <button type="button" class="icone-btn" data-action="favori" data-retirer="1" aria-pressed="true" aria-label="Retirer des favoris">${ico('etoile')}</button>
                </div></div>
              <p class="ar" lang="ar" dir="rtl">${esc(textes[s][v - 1][0])}</p>
              <p class="ph">${esc(textes[s][v - 1][1])}</p>
              <p class="fr">${esc(textes[s][v - 1][2])}</p>
            </li>`).join('')}
        </ol>`
    };
  };

  /* ==========================================================================
     Réglages
     ========================================================================== */
  const segment = (action, valeurs, courant) => `<div class="segment" role="group">${valeurs
    .map(([val, nom]) => `<button type="button" data-action="${action}" data-valeur="${val}" aria-pressed="${String(val) === String(courant)}">${nom}</button>`).join('')}</div>`;
  const interrupteur = (id, change, cle, actif, nom, aide) => `<div class="reglage">
      <label class="reglage__texte" for="${id}"><span>${nom}</span>${aide ? `<small>${aide}</small>` : ''}</label>
      <input type="checkbox" role="switch" class="interrupteur" id="${id}" data-change="${change}" data-cle="${cle}"${actif ? ' checked' : ''}>
    </div>`;

  const reglagesVue = () => {
    const r = Etat.reglages();
    return {
      titre: 'Réglages',
      nav: 'reglages',
      html: `
        <h1>Réglages</h1>
        <section class="section-reglage carte" aria-labelledby="g-affichage">
          <h2 id="g-affichage">Affichage</h2>
          ${interrupteur('r-ph', 'reglage-bool', 'phonetique', r.phonetique, 'Phonétique', 'Aide à lire l’arabe avec nos lettres')}
          ${interrupteur('r-tr', 'reglage-bool', 'traduction', r.traduction, 'Traduction française', 'Traduction de Muhammad Hamidullah')}
          <div class="reglage reglage--colonne">
            <label class="reglage__texte" for="r-taille"><span>Taille du texte arabe</span></label>
            <input id="r-taille" type="range" min="1" max="5" step="1" value="${r.taille}" data-input="reglage-taille" style="accent-color:var(--lapis);height:2rem">
            <div class="apercu-ar"><p class="ar" lang="ar" dir="rtl">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</p></div>
          </div>
          <div class="reglage"><span class="reglage__texte"><span>Thème</span></span>${segment('reglage-theme', [['auto', 'Auto'], ['clair', 'Clair'], ['sombre', 'Sombre']], r.theme)}</div>
        </section>
        <section class="section-reglage carte" aria-labelledby="g-audio">
          <h2 id="g-audio">Audio</h2>
          <div class="reglage reglage--colonne">
            <label class="reglage__texte" for="r-recitant"><span>Récitant</span><small>${esc((CONTENU.recitants.find((x) => x.id === r.recitant) || CONTENU.recitants[0]).style)}</small></label>
            <select id="r-recitant" data-change="reglage-recitant">${CONTENU.recitants.map((x) => `<option value="${x.id}"${x.id === r.recitant ? ' selected' : ''}>${esc(x.nom)}</option>`).join('')}</select>
          </div>
          <div class="reglage"><span class="reglage__texte"><span>Vitesse</span></span>${segment('reglage-vitesse', [[0.75, '0,75×'], [1, '1×'], [1.25, '1,25×']], r.vitesse)}</div>
          <div class="reglage"><span class="reglage__texte"><span>Répéter chaque verset</span></span>${segment('reglage-repetitions', [[1, '1'], [3, '3'], [5, '5'], [10, '10']], r.repetitions)}</div>
          ${interrupteur('r-suiv', 'reglage-bool', 'suivant', r.suivant, 'Enchaîner les versets', 'Passer seul au verset suivant')}
          <p class="discret">L'audio vient d'internet (everyayah.com). Il faut donc être connecté pour l'écouter.</p>
        </section>
        <section class="section-reglage carte" aria-labelledby="g-hors">
          <h2 id="g-hors">Utiliser sans internet</h2>
          <p class="discret" id="etat-hors">Vérification…</p>
          <button type="button" class="bouton bouton--second" id="bouton-hors" data-action="telecharger-tout">${ico('nuage')} Télécharger tout le texte du Coran</button>
          <div id="progression-hors"></div>
        </section>
        <section class="section-reglage carte" aria-labelledby="g-donnees">
          <h2 id="g-donnees">Ma progression</h2>
          <p class="discret">Tes versets appris, favoris et réglages restent sur cet appareil. Pour les garder en sécurité ou les passer sur un autre appareil, copie la sauvegarde et colle-la là-bas.</p>
          <textarea class="sauvegarde" id="sauvegarde" aria-label="Texte de sauvegarde" spellcheck="false" placeholder="Colle ici une sauvegarde pour la restaurer"></textarea>
          <div class="rangee">
            <button type="button" class="bouton bouton--second" data-action="copier-sauvegarde">Copier ma sauvegarde</button>
            <button type="button" class="bouton bouton--second" data-action="restaurer">Restaurer</button>
          </div>
          <button type="button" class="bouton bouton--alerte" id="bouton-reinit" data-action="reinitialiser">Tout effacer</button>
        </section>
        <section class="section-reglage carte credits" aria-labelledby="g-propos">
          <h2 id="g-propos">À propos</h2>
          <p>Coran Facile est une application gratuite pour apprendre le Coran pas à pas.</p>
          <p>Texte arabe et translittération : projet Tanzil (tanzil.net). Traduction française : Muhammad Hamidullah. Données mises en forme à partir du paquet « quran-json » de Risan Bagja Pradana (licence CC BY 4.0). Audio : everyayah.com. Polices : Amiri Quran et Atkinson Hyperlegible (licence SIL OFL).</p>
          <p>La phonétique est une aide de lecture : les voyelles longues n'y sont pas toutes notées. Pour la prononciation exacte, écoute le récitant, de préférence avec un enseignant.</p>
        </section>`,
      apres: async () => {
        const etat = $('#etat-hors');
        const bouton = $('#bouton-hors');
        if (!Donnees.horsLignePossible()) {
          etat.textContent = 'Ouvre l’application depuis son adresse internet pour pouvoir la télécharger. Si tu l’as ouverte depuis un fichier, tout le texte est déjà sur ton appareil.';
          bouton.hidden = true;
          return;
        }
        const n = await Donnees.nbEnCache();
        etat.textContent = n >= Donnees.NB_SOURATES
          ? 'Tout le texte du Coran est sur cet appareil : tu peux lire sans internet (seul l’audio en a besoin).'
          : `${n} sourate${n > 1 ? 's' : ''} sur ${Donnees.NB_SOURATES} disponible${n > 1 ? 's' : ''} sans internet. Télécharge le reste (environ 3 Mo) pour tout lire sans connexion.`;
        bouton.hidden = n >= Donnees.NB_SOURATES;
      }
    };
  };

  /* ==========================================================================
     Fenêtre (dialogue) et lecteur audio
     ========================================================================== */
  const ouvrirDialogue = (html) => {
    const d = $('#dialogue');
    d.innerHTML = html;
    if (!d.open) d.showModal();
  };

  let dernierItem = null;
  const surLecteur = (e) => {
    const lecteur = $('#lecteur');
    lecteur.hidden = !e.actif;
    document.body.classList.toggle('avec-lecteur', e.actif);
    $$('.est-lu').forEach((el) => el.classList.remove('est-lu'));
    if (!e.actif) { dernierItem = null; return; }
    const it = e.item;
    $('#lecteur-nom').textContent = `${nomDe(it.s)}, verset ${it.v}`;
    let detail = e.total > 1 ? `${e.index + 1} sur ${e.total}` : Donnees.sourate(it.s).sens;
    if (e.repetitions > 1) detail += ` · lecture ${Math.min(e.fois + (e.enLecture ? 1 : 0), e.repetitions)} sur ${e.repetitions}`;
    if (e.erreur) detail = 'Audio indisponible';
    $('#lecteur-detail').textContent = detail;
    const bouton = $('#lecteur-lecture');
    bouton.innerHTML = ico(e.enLecture ? 'pause' : 'play');
    bouton.setAttribute('aria-label', e.enLecture ? 'Pause' : 'Lecture');
    // Met le verset en cours en valeur dans la page, et le montre s'il est hors de l'écran
    const el = document.querySelector(`[data-s="${it.s}"][data-v="${it.v}"].verset, [data-s="${it.s}"][data-v="${it.v}"].etude-verset`);
    if (el) {
      el.classList.add('est-lu');
      const cle = `${it.s}:${it.v}:${e.index}`;
      if (cle !== dernierItem) {
        const r = el.getBoundingClientRect();
        if (r.top < 70 || r.bottom > window.innerHeight - 190) el.scrollIntoView({ behavior: Outils.reduireMouvement() ? 'auto' : 'smooth', block: 'center' });
      }
    }
    dernierItem = `${it.s}:${it.v}:${e.index}`;
    if (!$('#lecteur-options').hidden) construireOptionsLecteur();
  };

  const construireOptionsLecteur = () => {
    const e = Lecteur.etat();
    const r = Etat.reglages();
    const zone = $('#lecteur-options');
    const puces = (action, liste, courant) => `<div class="puces">${liste.map(([val, nom]) => `<button type="button" class="puce" data-action="${action}" data-valeur="${val}" aria-pressed="${String(val) === String(courant)}">${nom}</button>`).join('')}</div>`;
    const focus = document.activeElement && document.activeElement.id;
    zone.innerHTML = `
      <div><label for="opt-recitant">Récitant</label>
        <select id="opt-recitant" data-change="opt-recitant">${CONTENU.recitants.map((x) => `<option value="${x.id}"${x.id === r.recitant ? ' selected' : ''}>${esc(x.nom)}</option>`).join('')}</select></div>
      <div><span class="libelle">Vitesse</span>${puces('opt-vitesse', [[0.75, '0,75×'], [1, '1×'], [1.25, '1,25×']], r.vitesse)}</div>
      <div><span class="libelle">Répéter chaque verset</span>${puces('opt-repetitions', [[1, '1 fois'], [3, '3 fois'], [5, '5 fois'], [10, '10 fois']], e.repetitions)}</div>
      <div class="reglage"><label class="reglage__texte" for="opt-suivant"><span>Passer au verset suivant</span></label>
        <input type="checkbox" role="switch" class="interrupteur" id="opt-suivant" data-change="opt-suivant"${e.options.suivant ? ' checked' : ''}></div>
      <div class="reglage"><label class="reglage__texte" for="opt-boucle"><span>Recommencer à la fin</span></label>
        <input type="checkbox" role="switch" class="interrupteur" id="opt-boucle" data-change="opt-boucle"${e.options.boucle ? ' checked' : ''}></div>`;
    if (focus && $(`#${focus}`)) $(`#${focus}`).focus();
  };

  /* ==========================================================================
     Actions (boutons) · entrées · changements
     ========================================================================== */
  const contexte = (el) => {
    const c = el.closest('[data-v]');
    return c ? { s: Number(c.dataset.s), v: Number(c.dataset.v) } : null;
  };
  const pressed = (el, oui) => el.setAttribute('aria-pressed', String(oui));
  const marquerSegment = (el) => { $$('button', el.closest('.segment, .puces')).forEach((b) => pressed(b, b === el)); };

  const Actions = {
    /* --- lecture / audio --- */
    jouer: (el) => { const c = contexte(el); if (c) Lecteur.jouer(tousLesVersets(c.s), c.v - 1); },
    'jouer-seul': (el) => {
      const c = contexte(el);
      if (c) Lecteur.jouer([c], 0, { suivant: false, repetitions: 1 });
    },
    'ecouter-sourate': () => { const s = Number($('article[data-s]').dataset.s); Lecteur.jouer(tousLesVersets(s), 0); },
    bismillah: () => Lecteur.jouer([{ s: 1, v: 1 }], 0, { suivant: false, repetitions: 1 }),
    lecture: () => Lecteur.basculer(),
    suiv: () => Lecteur.suivant(),
    prec: () => Lecteur.precedent(),
    'fermer-lecteur': () => { Lecteur.arreter(); $('#lecteur-options').hidden = true; $('#lecteur-options-bouton').setAttribute('aria-expanded', 'false'); },
    'options-lecteur': (el) => {
      const zone = $('#lecteur-options');
      zone.hidden = !zone.hidden;
      el.setAttribute('aria-expanded', String(!zone.hidden));
      if (!zone.hidden) construireOptionsLecteur();
    },
    'opt-vitesse': (el) => { Lecteur.changerVitesse(Number(el.dataset.valeur)); construireOptionsLecteur(); },
    'opt-repetitions': (el) => { const n = Number(el.dataset.valeur); Etat.regler('repetitions', n); Lecteur.regler({ repetitions: n }); construireOptionsLecteur(); },

    /* --- favoris / appris --- */
    favori: (el) => {
      const c = contexte(el);
      if (!c) return;
      const actif = Etat.basculerFavori(c.s, c.v);
      pressed(el, actif);
      message(actif ? 'Ajouté aux favoris' : 'Retiré des favoris');
      if (el.dataset.retirer && !actif) { const li = el.closest('.verset'); if (li) li.remove(); if (!$('.versets .verset')) window.dispatchEvent(new Event('hashchange')); }
    },
    appris: (el) => {
      const c = contexte(el);
      if (!c) return;
      const oui = !Etat.estAppris(c.s, c.v);
      Etat.apprendre(c.s, c.v, oui);
      if (oui) Etat.marquerJour();
      pressed(el, oui);
      message(oui ? 'Verset appris. Première révision demain.' : 'Retiré des versets appris');
      majPastille();
    },

    /* --- affichage de la lecture --- */
    'afficher-phonetique': (el) => { const v = !Etat.reglages().phonetique; Etat.regler('phonetique', v); pressed(el, v); appliquerReglages(); },
    'afficher-traduction': (el) => { const v = !Etat.reglages().traduction; Etat.regler('traduction', v); pressed(el, v); appliquerReglages(); },
    'taille-plus': () => { Etat.regler('taille', Outils.borner(Etat.reglages().taille + 1, 1, 5)); appliquerReglages(); },
    'taille-moins': () => { Etat.regler('taille', Outils.borner(Etat.reglages().taille - 1, 1, 5)); appliquerReglages(); },
    'aller-verset': () => {
      const champ = $('#aller-v');
      const v = Number(champ.value);
      const max = Number(champ.max);
      if (!v || v < 1 || v > max) { message(`Choisis un numéro entre 1 et ${max}`); return; }
      const el = $(`#v${v}`);
      if (el) { el.scrollIntoView({ block: 'start' }); el.classList.add('est-lu'); setTimeout(() => el.classList.remove('est-lu'), 1800); }
    },

    /* --- liste des sourates --- */
    'filtre-sourates': (el) => { listeCtx.filtre = el.dataset.filtre; $$('[data-action="filtre-sourates"]').forEach((b) => pressed(b, b === el)); rendreListe(); },
    'chercher-versets': async () => {
      const q = listeCtx.q.trim();
      const zone = $('#resultats-versets');
      zone.innerHTML = '<p class="chargement">Recherche en cours…</p>';
      try {
        const res = await Donnees.chercher(q, (a, b) => { zone.innerHTML = `<p class="chargement">Lecture du Coran… ${a} sur ${b}</p>`; });
        const arabe = Outils.contientArabe(q);
        zone.innerHTML = res.length
          ? `<p class="discret">${res.length >= 60 ? 'Les 60 premiers résultats' : nombre(res.length, 'résultat', 'résultats')}</p>` + res.map((r) => `<a class="resultat-verset" href="#sourate-${r.s}-${r.v}">
              <span class="resultat-verset__ref">${esc(referenceTxt(r.s, r.v))}</span>
              ${arabe ? `<span class="ar" lang="ar" dir="rtl">${esc(r.ar)}</span>` : ''}
              <span>${esc(r.fr)}</span></a>`).join('')
          : '<div class="vide"><p>Aucun verset trouvé.</p></div>';
      } catch (e) {
        zone.innerHTML = erreurDonnees();
      }
    },

    /* --- mémoriser --- */
    onglet: async (el) => {
      etude.onglet = el.dataset.onglet;
      if (etude.onglet === 'quiz' && !etude.quiz) { rendreEtude(); etude.quiz = await construireQuiz(etude); }
      rendreEtude();
    },
    'reveler-mot': (el) => { el.classList.remove('cache'); el.removeAttribute('role'); el.removeAttribute('tabindex'); el.removeAttribute('data-action'); el.removeAttribute('aria-label'); },
    'ecouter-passage': () => {
      const liste = [];
      for (let v = etude.de; v <= etude.a; v++) liste.push({ s: etude.s, v });
      Lecteur.jouer(liste, 0, { repetitions: etude.repetitions, suivant: true });
    },
    'sais-passage': () => {
      let n = 0;
      for (let v = etude.de; v <= etude.a; v++) if (!Etat.estAppris(etude.s, v)) { Etat.apprendre(etude.s, v, true); n++; }
      Etat.marquerJour();
      majPastille();
      const x = Donnees.sourate(etude.s);
      const suite = etude.a < x.v ? `<a class="bouton" href="#etude-${etude.s}-${etude.a + 1}-${Math.min(etude.a + 3, x.v)}">Versets suivants</a>` : `<a class="bouton" href="#apprendre">Retour au parcours</a>`;
      $('#etude-panneau').innerHTML = `<div class="carte centre">
          <p class="carte__etiquette">Bravo</p>
          <h2>${n ? `${nombre(n, 'verset ajouté', 'versets ajoutés')} à tes révisions` : 'Ces versets sont déjà dans tes révisions'}</h2>
          <p class="discret">Tu les reverras demain, puis à intervalles de plus en plus longs.</p>
          <div class="rangee" style="justify-content:center">${suite}<a class="bouton bouton--second" href="#reviser">Mes révisions</a></div>
        </div>`;
      window.scrollTo({ top: 0 });
    },
    reponse: (el) => {
      const q = etude.quiz;
      if (!q || q.repondu) return;
      const cur = q.questions[q.i];
      const choisi = cur.options[Number(el.dataset.k)];
      const juste = choisi === cur.bonne;
      q.repondu = true;
      if (juste) q.score++;
      $$('.option').forEach((b, k) => {
        b.disabled = true;
        if (cur.options[k] === cur.bonne) b.classList.add('juste');
      });
      if (!juste) el.classList.add('faux');
      $('#quiz-trou').classList.add('rempli');
      const dernier = q.i + 1 >= q.questions.length;
      $('#quiz-retour').innerHTML = `<div class="retour-quiz ${juste ? 'juste' : 'faux'}">${juste ? 'Bonne réponse !' : 'Pas tout à fait : la bonne réponse est en vert.'}</div>
        <button type="button" class="bouton bouton--large" style="margin-top:.8rem" data-action="quiz-suivant">${dernier ? 'Voir mon score' : 'Question suivante'}</button>`;
      $('[data-action="quiz-suivant"]').focus();
    },
    'quiz-suivant': () => { etude.quiz.i++; etude.quiz.repondu = false; rendreEtude(); },
    'quiz-refaire': async () => { etude.quiz = null; rendreEtude(); etude.quiz = await construireQuiz(etude); rendreEtude(); },

    /* --- réviser --- */
    'voir-verset': () => { rev.revele = true; rendreRevision(); },
    noter: (el) => {
      const c = rev.file[rev.i];
      const sais = el.dataset.sais === '1';
      Etat.noterRevision(c.s, c.v, sais);
      if (sais) rev.sus++; else rev.revoir++;
      rev.i++;
      rev.revele = false;
      rendreRevision();
      window.scrollTo({ top: 0 });
    },

    /* --- alphabet, voyelles, leçons --- */
    lettre: (el) => ouvrirLettre(Number(el.dataset.i)),
    'fermer-dialogue': () => $('#dialogue').close(),
    'reponse-lettre': (el) => {
      const q = quizLettres;
      if (!q || q.repondu) return;
      const cur = q.questions[q.i];
      const choisi = cur.options[Number(el.dataset.k)];
      const juste = choisi.nom === cur.x.nom;
      q.repondu = true;
      if (juste) q.score++;
      $$('.option').forEach((b, k) => { b.disabled = true; if (cur.options[k].nom === cur.x.nom) b.classList.add('juste'); });
      if (!juste) el.classList.add('faux');
      const dernier = q.i + 1 >= q.questions.length;
      $('#quiz-retour').innerHTML = `<div class="retour-quiz ${juste ? 'juste' : 'faux'}">${juste ? 'Bravo !' : `C'était « ${esc(cur.x.nom)} » : ${esc(cur.x.son)}`}</div>
        <button type="button" class="bouton bouton--large" style="margin-top:.8rem" data-action="quiz-lettres-suivant">${dernier ? 'Voir mon score' : 'Question suivante'}</button>`;
      $('[data-action="quiz-lettres-suivant"]').focus();
    },
    'quiz-lettres-suivant': () => { quizLettres.i++; quizLettres.repondu = false; rendreQuizLettres(); },
    'quiz-lettres-refaire': () => { quizLettres = null; window.dispatchEvent(new Event('hashchange')); },
    'atelier-lettre': (el) => { atelier.lettre = Number(el.dataset.lettre); rendreAtelier(); },
    'atelier-signe': (el) => { atelier.signe = el.dataset.signe; rendreAtelier(); },
    'lecon-faite': (el) => {
      const id = el.dataset.id;
      if (Etat.leconFaite(id)) { Etat.faireLecon(id, false); message('Leçon remise à faire'); window.dispatchEvent(new Event('hashchange')); return; }
      Etat.faireLecon(id);
      Etat.marquerJour();
      message('Leçon terminée, bravo !');
      location.hash = `#${el.dataset.suite || 'apprendre'}`;
    },

    /* --- réglages --- */
    'reglage-theme': (el) => { Etat.regler('theme', el.dataset.valeur); marquerSegment(el); appliquerReglages(); },
    'reglage-vitesse': (el) => { Lecteur.changerVitesse(Number(el.dataset.valeur)); marquerSegment(el); },
    'reglage-repetitions': (el) => { const n = Number(el.dataset.valeur); Etat.regler('repetitions', n); Lecteur.regler({ repetitions: n }); marquerSegment(el); },
    'telecharger-tout': async (el) => {
      const zone = $('#progression-hors');
      el.disabled = true;
      try {
        await Donnees.telechargerTout((a, b) => { zone.innerHTML = `<p class="discret">Téléchargement… ${a} sur ${b}</p>${barre(a, b)}`; });
        zone.innerHTML = '';
        message('Le Coran est maintenant disponible sans internet');
        $('#etat-hors').textContent = 'Tout le texte du Coran est sur cet appareil : tu peux lire sans internet (seul l’audio en a besoin).';
        el.hidden = true;
      } catch (e) {
        zone.innerHTML = '<div class="erreur"><strong>Le téléchargement s’est interrompu.</strong><p>Vérifie ta connexion et réessaie : ce qui est déjà téléchargé est conservé.</p></div>';
      }
      el.disabled = false;
    },
    'copier-sauvegarde': async () => {
      const champ = $('#sauvegarde');
      champ.value = Etat.exporter();
      try { await navigator.clipboard.writeText(champ.value); message('Sauvegarde copiée'); } catch (e) { champ.select(); message('Sélectionne le texte et copie-le'); }
    },
    restaurer: () => {
      const champ = $('#sauvegarde');
      if (!champ.value.trim()) { message('Colle d’abord une sauvegarde dans le cadre'); return; }
      try {
        Etat.importer(champ.value.trim());
        appliquerReglages();
        majPastille();
        champ.value = '';
        message('Sauvegarde restaurée');
        window.dispatchEvent(new Event('hashchange'));
      } catch (e) {
        message('Cette sauvegarde n’est pas valide');
      }
    },
    reinitialiser: (el) => {
      if (el.dataset.confirme !== '1') {
        el.dataset.confirme = '1';
        el.textContent = 'Touche encore pour tout effacer';
        setTimeout(() => { el.dataset.confirme = ''; el.textContent = 'Tout effacer'; }, 4000);
        return;
      }
      Etat.reinitialiser();
      quizLettres = null;
      appliquerReglages();
      majPastille();
      message('Tout a été effacé');
      window.dispatchEvent(new Event('hashchange'));
    },
    recharger: () => window.dispatchEvent(new Event('hashchange'))
  };

  const Entrees = {
    'recherche-sourates': (el) => { listeCtx.q = el.value; rendreListe(); },
    'niveau-masque': (el) => {
      etude.niveau = Number(el.value);
      $('#niveau-txt').textContent = NIVEAUX[etude.niveau];
      $$('#etude-versets .etude-verset').forEach((li) => {
        const t = etude.textes[Number(li.dataset.v) - 1];
        $('.ar', li).innerHTML = htmlMots(etude.s, Number(li.dataset.v), t[0], etude.niveau);
      });
    },
    'reglage-taille': (el) => { Etat.regler('taille', Number(el.value)); appliquerReglages(); }
  };

  const Changements = {
    'reglage-bool': (el) => { Etat.regler(el.dataset.cle, el.checked); appliquerReglages(); },
    'reglage-recitant': (el) => { Lecteur.changerRecitant(el.value); },
    'opt-recitant': (el) => { Lecteur.changerRecitant(el.value); },
    'opt-suivant': (el) => { Etat.regler('suivant', el.checked); Lecteur.regler({ suivant: el.checked }); },
    'opt-boucle': (el) => { Lecteur.regler({ boucle: el.checked }); },
    'etude-repetitions': (el) => { etude.repetitions = Number(el.value); },
    'etude-plage': () => {
      const de = Number($('#etude-de').value);
      const a = Math.max(de, Number($('#etude-a').value));
      etude.de = de;
      etude.a = a;
      etude.quiz = null;
      // Le « au verset » ne propose que des versets après le « du verset »
      $('#etude-a').innerHTML = optionsPlage(Donnees.sourate(etude.s).v, a, de);
      history.replaceState(null, '', `#etude-${etude.s}-${etude.de}-${etude.a}`);
      rendreEtude();
    }
  };

  const init = () => {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el || el.disabled) return;
      const f = Actions[el.dataset.action];
      if (f) f(el, e);
    });
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-action]')) {
        e.preventDefault();
        e.target.click();
      }
    });
    document.addEventListener('input', (e) => {
      const el = e.target.closest('[data-input]');
      if (el && Entrees[el.dataset.input]) Entrees[el.dataset.input](el, e);
    });
    document.addEventListener('change', (e) => {
      const el = e.target.closest('[data-change]');
      if (el && Changements[el.dataset.change]) Changements[el.dataset.change](el, e);
    });
    $('#dialogue').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    Lecteur.ecouter(surLecteur);
    Lecteur.ecouterProgres((f) => { $('#lecteur-progres').style.width = `${Math.round(f * 100)}%`; });
    $$('[data-icone]').forEach((s) => { s.innerHTML = ico(s.dataset.icone); });
    const iconesLecteur = { prec: 'precedent', lecture: 'play', suiv: 'suivant', 'options-lecteur': 'reglages', 'fermer-lecteur': 'fermer' };
    $$('#lecteur [data-action]').forEach((b) => { b.innerHTML = ico(iconesLecteur[b.dataset.action]); });
    appliquerReglages();
    majPastille();
  };

  return {
    init, majPastille, appliquerReglages,
    routes: { accueil, coran, sourate, etude: etudeVue, apprendre, alphabet, voyelles, tajwid, reviser, favoris, reglages: reglagesVue }
  };
})();
