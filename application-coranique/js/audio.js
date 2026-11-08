/* ==========================================================================
   Coran Facile · lecteur audio
   Joue les versets l'un après l'autre, avec répétition, vitesse réglable et source de secours.
   L'audio vient d'everyayah.com (puis d'islamic.network en secours) : il faut une connexion internet.
   ========================================================================== */
const Lecteur = (() => {
  'use strict';

  const audio = new Audio();
  audio.preload = 'auto';

  let file = []; // versets à jouer : [{ s, v }]
  let i = -1; // verset en cours dans la file
  let fois = 0; // nombre de fois que le verset en cours a déjà été joué en entier
  let options = { repetitions: 1, suivant: true, boucle: false };
  let sources = [];
  let numeroSource = 0;
  let enLecture = false;
  let erreur = null;
  const ecouteurs = new Set();
  const ecouteursProgres = new Set();

  const recitant = () => CONTENU.recitants.find((r) => r.id === Etat.reglages().recitant) || CONTENU.recitants[0];

  const etat = () => ({
    actif: i >= 0,
    enLecture,
    item: file[i] || null,
    index: i,
    total: file.length,
    fois,
    repetitions: options.repetitions,
    options: { ...options },
    erreur
  });
  const notifier = () => { const e = etat(); ecouteurs.forEach((f) => f(e)); };

  // Adresses possibles d'un verset, de la plus fiable à la plus incertaine.
  const adresses = (s, v) => {
    const r = recitant();
    const liste = [`https://everyayah.com/data/${r.dossier}/${Outils.p3(s)}${Outils.p3(v)}.mp3`];
    if (r.islamic) liste.push(`https://cdn.islamic.network/quran/audio/${r.debit}/${r.islamic}/${Donnees.rang(s, v)}.mp3`);
    return liste;
  };

  const appliquerVitesse = () => {
    const vitesse = Etat.reglages().vitesse;
    audio.defaultPlaybackRate = vitesse;
    audio.playbackRate = vitesse;
    audio.preservesPitch = true;
  };

  const demarrer = () => {
    const promesse = audio.play();
    if (promesse && promesse.catch) {
      promesse.catch((e) => {
        if (e && e.name === 'AbortError') return; // un autre verset a pris la place : normal
        enLecture = false;
        notifier();
      });
    }
  };

  const preparerSuivant = () => {
    const suivant = file[i + 1] || (options.boucle ? file[0] : null);
    if (!suivant) return;
    const pre = new Audio();
    pre.preload = 'auto';
    pre.src = adresses(suivant.s, suivant.v)[0];
  };

  const chargerVerset = () => {
    const it = file[i];
    sources = adresses(it.s, it.v);
    numeroSource = 0;
    erreur = null;
    fois = 0;
    audio.src = sources[0];
    appliquerVitesse();
    enLecture = true;
    demarrer();
    notifier();
    majSession();
  };

  const avancer = () => {
    if (i + 1 < file.length) { i++; chargerVerset(); } else if (options.boucle && file.length) { i = 0; chargerVerset(); } else { enLecture = false; notifier(); }
  };

  audio.addEventListener('ended', () => {
    fois++;
    if (fois < options.repetitions) {
      audio.currentTime = 0;
      demarrer();
      notifier();
      return;
    }
    if (options.suivant) avancer(); else { enLecture = false; notifier(); }
  });
  audio.addEventListener('playing', () => { enLecture = true; notifier(); preparerSuivant(); });
  audio.addEventListener('pause', () => { if (!audio.ended && enLecture) { enLecture = false; notifier(); } });
  audio.addEventListener('timeupdate', () => {
    const f = audio.duration ? audio.currentTime / audio.duration : 0;
    ecouteursProgres.forEach((fn) => fn(f));
  });
  audio.addEventListener('error', () => {
    if (i < 0) return;
    numeroSource++;
    if (numeroSource < sources.length) {
      audio.src = sources[numeroSource];
      appliquerVitesse();
      demarrer();
      return;
    }
    enLecture = false;
    erreur = navigator.onLine === false
      ? "Pas de connexion internet : l'audio a besoin d'internet."
      : "Cet audio n'est pas disponible pour le moment. Essaie un autre récitant ou réessaie plus tard.";
    notifier();
    Outils.message(erreur, 5000);
  });

  /* ---------- Commandes ---------- */
  // Joue la liste de versets à partir de la position donnée.
  const jouer = (liste, depart = 0, opt = {}) => {
    const r = Etat.reglages();
    file = liste.slice();
    i = Outils.borner(depart, 0, file.length - 1);
    options = { repetitions: r.repetitions, suivant: r.suivant, boucle: false, ...opt };
    Etat.marquerJour();
    chargerVerset();
  };
  const basculer = () => {
    if (i < 0) return;
    if (enLecture) { audio.pause(); return; }
    if (audio.ended || audio.error) { chargerVerset(); return; }
    enLecture = true;
    demarrer();
    notifier();
  };
  const suivant = () => {
    if (i < 0) return;
    if (i + 1 < file.length) { i++; chargerVerset(); } else if (options.boucle) { i = 0; chargerVerset(); }
  };
  const precedent = () => {
    if (i < 0) return;
    if (audio.currentTime > 3 || i === 0) { audio.currentTime = 0; if (!enLecture) { enLecture = true; demarrer(); notifier(); } return; }
    i--;
    chargerVerset();
  };
  const arreter = () => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    file = [];
    i = -1;
    enLecture = false;
    erreur = null;
    notifier();
  };
  const regler = (opt) => { options = { ...options, ...opt }; notifier(); };
  const changerVitesse = (v) => { Etat.regler('vitesse', v); appliquerVitesse(); notifier(); };
  const changerRecitant = (id) => {
    Etat.regler('recitant', id);
    if (i >= 0) chargerVerset();
  };
  const ecouter = (fn) => { ecouteurs.add(fn); return () => ecouteurs.delete(fn); };
  const ecouterProgres = (fn) => { ecouteursProgres.add(fn); return () => ecouteursProgres.delete(fn); };
  const estEnCours = (s, v) => { const it = file[i]; return !!it && it.s === s && it.v === v; };

  /* ---------- Commandes de l'écran verrouillé du téléphone ---------- */
  function majSession() {
    if (!('mediaSession' in navigator) || i < 0) return;
    const it = file[i];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${Donnees.sourate(it.s).nom}, verset ${it.v}`,
        artist: recitant().nom,
        album: 'Coran Facile'
      });
    } catch (e) { /* non géré : sans conséquence */ }
  }
  const brancherSession = () => {
    if (!('mediaSession' in navigator)) return;
    const actions = { play: basculer, pause: basculer, nexttrack: suivant, previoustrack: precedent };
    for (const [nom, fn] of Object.entries(actions)) {
      try { navigator.mediaSession.setActionHandler(nom, fn); } catch (e) { /* non géré */ }
    }
  };

  return {
    jouer, basculer, suivant, precedent, arreter, regler, changerVitesse, changerRecitant,
    ecouter, ecouterProgres, estEnCours, etat, brancherSession
  };
})();
