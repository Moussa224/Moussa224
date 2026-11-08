/* ==========================================================================
   Coran Facile · service worker
   Garde l'application et les sourates lues sur l'appareil, pour qu'elles s'ouvrent sans internet.
   L'audio n'est pas gardé : il passe toujours par internet.
   Quand tu modifies un fichier de l'application, change VERSION pour que les appareils se mettent à jour.
   Le cache des sourates (DONNEES) doit porter le même nom que NOM_CACHE dans js/donnees.js.
   ========================================================================== */
const VERSION = 'coran-facile-1';
const COQUILLE = `${VERSION}-coquille`;
const DONNEES = 'coran-facile-donnees';

const FICHIERS = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'data/sourates.js',
  'js/contenu.js',
  'js/outils.js',
  'js/etat.js',
  'js/donnees.js',
  'js/audio.js',
  'js/vues.js',
  'js/app.js',
  'polices/AmiriQuran-arabe.woff2',
  'polices/Atkinson-400.woff2',
  'polices/Atkinson-400-italique.woff2',
  'polices/Atkinson-700.woff2',
  'icones/icone.svg',
  'icones/icone-192.png',
  'icones/icone-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(COQUILLE).then((cache) => cache.addAll(FICHIERS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms
        .filter((n) => n.startsWith('coran-facile-') && n !== COQUILLE && n !== DONNEES)
        .map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  const url = new URL(requete.url);
  if (requete.method !== 'GET' || url.origin !== self.location.origin) return; // l'audio et le reste passent directement

  // Sourates : on les garde dès qu'elles ont été lues une fois
  if (url.pathname.includes('/data/s/')) {
    event.respondWith(
      caches.open(DONNEES).then(async (cache) => {
        const gardee = await cache.match(requete);
        if (gardee) return gardee;
        const reponse = await fetch(requete);
        if (reponse.ok) cache.put(requete, reponse.clone());
        return reponse;
      })
    );
    return;
  }

  // Le reste de l'application : on répond tout de suite avec la copie gardée, et on la met à jour en coulisse
  event.respondWith(
    caches.open(COQUILLE).then(async (cache) => {
      const gardee = await cache.match(requete, { ignoreSearch: true });
      const reseau = fetch(requete)
        .then((reponse) => { if (reponse.ok) cache.put(requete, reponse.clone()); return reponse; })
        .catch(() => null);
      if (gardee) { event.waitUntil(reseau); return gardee; }
      const reponse = await reseau;
      if (reponse) return reponse;
      if (requete.mode === 'navigate') return cache.match('index.html');
      return Response.error();
    })
  );
});
