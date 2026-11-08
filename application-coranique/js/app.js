/* ==========================================================================
   Coran Facile · démarrage et navigation
   Les adresses ressemblent à #sourate-2-255 (sourate 2, verset 255) ou #etude-114-1-3.
   ========================================================================== */
(() => {
  'use strict';

  const { $, $$, esc } = Outils;
  let jeton = 0; // si on change d'écran pendant un chargement, seul le dernier compte

  const afficher = (res) => {
    const main = $('#contenu');
    main.innerHTML = res.html;
    document.title = res.titre === 'Accueil' ? 'Coran Facile' : `${res.titre} · Coran Facile`;
    $('#titre-page').textContent = res.titre === 'Accueil' ? 'Coran Facile' : res.titre;

    const retour = $('#retour');
    retour.hidden = !res.retour;
    if (res.retour) {
      retour.href = `#${res.retour}`;
      retour.innerHTML = Outils.ico('retour');
    }
    $$('#nav a').forEach((a) => {
      if (a.dataset.nav === res.nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });

    const cible = res.ancre ? $(res.ancre) : null;
    if (cible) cible.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  };

  const aller = async () => {
    const moi = ++jeton;
    let hash = location.hash.replace(/^#/, '');
    try { hash = decodeURIComponent(hash); } catch (e) { /* adresse bizarre : on garde telle quelle */ }
    const [nom, ...args] = (hash || 'accueil').split('-');
    const vue = Vues.routes[nom] || Vues.routes.accueil;
    const main = $('#contenu');
    // Le message « Chargement » n'apparaît que si l'écran met un instant à arriver
    const minuterie = setTimeout(() => { if (moi === jeton) main.innerHTML = '<p class="chargement">Chargement…</p>'; }, 150);
    let res;
    try {
      res = await vue(args);
    } catch (e) {
      console.error(e);
      res = { titre: 'Oups', nav: 'accueil', html: `<div class="erreur"><strong>Un problème est survenu.</strong><p>${esc(e && e.message ? e.message : 'Erreur inconnue')}</p><a class="bouton" href="#accueil">Retour à l'accueil</a></div>` };
    }
    clearTimeout(minuterie);
    if (moi !== jeton) return;
    afficher(res);
    Vues.majPastille();
    if (res.apres) {
      try { await res.apres(); } catch (e) { console.error(e); }
    }
  };

  const demarrer = () => {
    Etat.charger();
    Vues.init();
    Lecteur.brancherSession();
    window.addEventListener('hashchange', aller);
    // Si l'application est ouverte dans un autre onglet, on reprend ses changements au lieu de les écraser
    window.addEventListener('storage', (e) => {
      if (e.key !== null && e.key !== 'coran-facile-v1') return;
      Etat.charger();
      Vues.appliquerReglages();
      Vues.majPastille();
    });
    aller();
    if (Etat.stockageIndisponible()) {
      Outils.message("Ton navigateur ne garde pas les données : ta progression sera perdue à la fermeture.", 6000);
    }
    // Fonctionnement hors connexion : seulement pour la version installable (celle qui déclare un manifeste),
    // ouverte depuis une adresse internet. Ailleurs (fichier local, page intégrée), on s'en passe sans bruit.
    if (Donnees.horsLignePossible()) {
      window.addEventListener('load', () => {
        try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* non autorisé ici */ }
      });
    }
  };

  demarrer();
})();
