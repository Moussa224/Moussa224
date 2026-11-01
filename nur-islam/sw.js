/* Nûr — service worker : fonctionne hors-ligne après la première visite.
   Stratégie : « cache d'abord, mise à jour en arrière-plan » pour les fichiers du même site. Aucune donnée n'est envoyée. */
const CACHE = 'nur-v1';
const CORE = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/outfit-latin-300-normal.woff2', 'fonts/outfit-latin-400-normal.woff2', 'fonts/outfit-latin-500-normal.woff2', 'fonts/outfit-latin-600-normal.woff2', 'fonts/outfit-latin-700-normal.woff2',
  'fonts/outfit-latin-ext-400-normal.woff2', 'fonts/outfit-latin-ext-600-normal.woff2',
  'fonts/cormorant-garamond-latin-500-normal.woff2', 'fonts/cormorant-garamond-latin-600-normal.woff2', 'fonts/cormorant-garamond-latin-700-normal.woff2', 'fonts/cormorant-garamond-latin-600-italic.woff2', 'fonts/cormorant-garamond-latin-ext-600-normal.woff2',
  'fonts/amiri-quran-arabic-400-normal.woff2', 'fonts/amiri-arabic-400-normal.woff2', 'fonts/amiri-arabic-700-normal.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Précharge tout le Coran (114 fichiers) pour l'usage hors-ligne complet.
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'precache-quran') {
    e.waitUntil((async () => {
      const c = await caches.open(CACHE);
      for (let n = 1; n <= 114; n++) { const u = `data/quran/${n}.js`; if (!(await c.match(u))) { try { await c.add(u); } catch {} } }
    })());
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
  })());
});
