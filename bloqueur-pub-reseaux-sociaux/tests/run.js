/*
 * Tests de bout en bout : on charge la vraie extension dans Chromium, on lui fait ouvrir des
 * maquettes de chaque réseau (voir mocks.js) et on vérifie que les pubs disparaissent
 * sans toucher aux vrais posts.
 *
 * Lancer (Playwright doit être installé : npm i -D playwright) :
 *   node tests/run.js
 * Sans écran (serveur, CI) :
 *   xvfb-run -a node tests/run.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mocks } = require('./mocks');

const EXT = path.resolve(__dirname, '..');
const OUT = process.env.TEST_OUT_DIR || os.tmpdir();

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? '  ok  ' : ' ECHEC'}  ${name}${ok || !detail ? '' : `\n          ${detail}`}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const posts = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-t]')].map((e) => ({
      t: e.dataset.t,
      visible: e.checkVisibility(),
      text: e.textContent.trim().slice(0, 25),
    }))
  );

// Attend que tous les posts publicitaires soient masqués (ou 4 s), puis renvoie l'état des posts.
const settle = async (page) => {
  await page
    .waitForFunction(
      () => [...document.querySelectorAll('[data-t^="ad"]')].every((e) => !e.checkVisibility()),
      null,
      { timeout: 4000 }
    )
    .catch(() => {});
  return posts(page);
};

const describeBad = (list) =>
  list.filter((p) => (p.t === 'organic') !== p.visible).map((p) => `${p.t} « ${p.text} » visible=${p.visible}`).join(' ; ');

const allCorrect = (list) => list.length > 0 && list.every((p) => (p.t === 'organic') === p.visible);

async function openMock(ctx, name, { before } = {}) {
  const mock = mocks[name];
  const page = await ctx.newPage();
  if (before) before(page);
  await page.goto(mock.url);
  return page;
}

async function main() {
  // 1. Cohérence manifeste / sites.js
  const manifest = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8'));
  const sandbox = {};
  new Function('sandbox', `${fs.readFileSync(path.join(EXT, 'sites.js'), 'utf8')}; sandbox.sites = BPR_SITES;`)(sandbox);
  const hosts = sandbox.sites.flatMap((s) => s.hosts).sort();
  const matches = manifest.content_scripts[0].matches.map((m) => m.replace('*://*.', '').replace('/*', '')).sort();
  check('manifest.json et sites.js listent les mêmes domaines', JSON.stringify(hosts) === JSON.stringify(matches),
    `${hosts} ≠ ${matches}`);
  for (const f of ['background.js', 'popup.html', 'sites.js', 'engine.js', ...Object.values(manifest.icons)]) {
    check(`fichier présent : ${f}`, fs.existsSync(path.join(EXT, f)));
  }

  // 2. Lancement de Chromium avec l'extension
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bpr-profile-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: !process.env.HEADED,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  for (const [name, mock] of Object.entries(mocks)) {
    await ctx.route(`${new URL(mock.url).origin}/**`, (route) => {
      const request = route.request();
      if (!request.url().endsWith('.webm')) {
        return route.fulfill({ contentType: 'text/html; charset=utf-8', body: mock.page });
      }
      // Chromium ne laisse avancer une vidéo que si le serveur gère les requêtes « Range ».
      const video = fs.readFileSync(path.join(__dirname, 'fixtures', 'video-2s.webm'));
      const range = /bytes=(\d+)-(\d*)/.exec(request.headers().range || '');
      const start = range ? Number(range[1]) : 0;
      const end = range && range[2] ? Number(range[2]) : video.length - 1;
      return route.fulfill({
        status: range ? 206 : 200,
        headers: {
          'Content-Type': 'video/webm',
          'Accept-Ranges': 'bytes',
          'Content-Length': String(end - start + 1),
          ...(range ? { 'Content-Range': `bytes ${start}-${end}/${video.length}` } : {}),
        },
        body: video.subarray(start, end + 1),
      });
    });
  }
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  const setSettings = async (patch) => {
    await sw.evaluate((p) => chrome.storage.local.set(p), patch);
    await sleep(400);
  };
  const storage = (area, key) => sw.evaluate(([a, k]) => chrome.storage[a].get(k), [area, key]);
  await sleep(500); // laisse onInstalled écrire les réglages et poser la règle réseau
  for (const p of ctx.pages()) if (p.url() === 'about:blank') await p.close();

  // 3. Chaque réseau : pubs masquées, vrais posts intacts
  for (const name of Object.keys(mocks)) {
    const page = await openMock(ctx, name);
    const list = await settle(page);
    check(`${name} : les pubs sont masquées et les vrais posts restent visibles`, allCorrect(list), describeBad(list));
    await page.close();
  }

  // 4. Pubs qui arrivent après coup (défilement infini, mention chargée en retard)
  {
    const page = await openMock(ctx, 'facebook');
    await settle(page);
    await page.evaluate(mocks.facebook.addAd);
    await page.evaluate(mocks.facebook.addLazyAd);
    await sleep(1800);
    const list = await posts(page);
    check('facebook : pub ajoutée par le défilement infini → masquée',
      list.filter((p) => p.t === 'ad-late').every((p) => !p.visible) && list.some((p) => p.t === 'ad-late'));
    check('facebook : pub dont la mention « Sponsored » arrive en retard → masquée',
      list.filter((p) => p.t === 'ad-lazy').every((p) => !p.visible) && list.some((p) => p.t === 'ad-lazy'));
    await page.close();
  }

  // 5. Réglages : tout désactiver, désactiver un seul réseau
  {
    const fb = await openMock(ctx, 'facebook');
    await settle(fb);
    await setSettings({ enabled: false });
    let list = await posts(fb);
    check('désactivé : les pubs réapparaissent aussitôt, sans recharger', list.every((p) => p.visible));
    await setSettings({ enabled: true });
    list = await settle(fb);
    check('réactivé : les pubs sont de nouveau masquées', allCorrect(list), describeBad(list));

    await setSettings({ sites: { facebook: false } });
    list = await posts(fb);
    check('Facebook coupé : les pubs Facebook réapparaissent', list.every((p) => p.visible));
    const ig = await openMock(ctx, 'instagram');
    list = await settle(ig);
    check('Facebook coupé : Instagram reste protégé', allCorrect(list), describeBad(list));
    await setSettings({ sites: {} });
    await fb.close();
    await ig.close();
  }

  // 6. Compteurs
  {
    await storage('local', 'total'); // la valeur existe déjà grâce aux pages précédentes
    const before = (await storage('local', 'total')).total || 0;
    const page = await openMock(ctx, 'instagram'); // 2 pubs dans la maquette
    await settle(page);
    await sleep(500);
    const after = (await storage('local', 'total')).total || 0;
    const { tabs = {} } = await storage('session', 'tabs');
    check('compteur total : +2 pour les 2 pubs d\'Instagram', after - before === 2, `avant=${before} après=${after}`);
    check('compteur par onglet : 2 sur la page Instagram', Object.values(tabs).includes(2), JSON.stringify(tabs));
    await page.close();
  }

  // 7. Blocage des requêtes publicitaires
  {
    const probe = async (name) => {
      const errors = [];
      const page = await openMock(ctx, name, {
        before: (p) => p.on('requestfailed', (r) => errors.push([r.url(), r.failure() ? r.failure().errorText : ''])),
      });
      await sleep(1200);
      await page.close();
      const hit = errors.find(([url]) => url.includes('googlesyndication.com'));
      return hit ? hit[1] : 'aucune erreur';
    };
    const fbErr = await probe('facebook');
    check('requête vers une régie de pub depuis Facebook → bloquée', fbErr.includes('BLOCKED_BY_CLIENT'), fbErr);
    const ytErr = await probe('youtube');
    check('même requête depuis YouTube → laissée passer (YouTube détecte le blocage)', !ytErr.includes('BLOCKED_BY_CLIENT'), ytErr);
    await setSettings({ network: false });
    const offErr = await probe('facebook');
    check('option « requêtes de pub » coupée → plus bloquée', !offErr.includes('BLOCKED_BY_CLIENT'), offErr);
    await setSettings({ network: true });
    const backErr = await probe('facebook');
    check('option réactivée → de nouveau bloquée', backErr.includes('BLOCKED_BY_CLIENT'), backErr);
  }

  // 8. Pubs vidéo YouTube
  {
    const page = await openMock(ctx, 'youtube');
    await settle(page);
    await page.waitForFunction(() => document.getElementById('v').readyState >= 1); // durée connue
    await page.evaluate(mocks.youtube.startVideoAd);
    await sleep(1200);
    const during = await page.evaluate(() => {
      const v = document.getElementById('v');
      return { skipped: window.__skipped || 0, time: v.currentTime, duration: v.duration, muted: v.muted, rate: v.playbackRate };
    });
    check('YouTube : le bouton « Passer » est cliqué', during.skipped >= 1, JSON.stringify(during));
    check('YouTube : la pub est mise en sourdine et envoyée à la fin',
      during.muted && during.duration > 1 && during.time >= during.duration - 0.2 && during.rate === 16, JSON.stringify(during));
    await page.evaluate(mocks.youtube.endVideoAd);
    await sleep(1000);
    const after = await page.evaluate(() => {
      const v = document.getElementById('v');
      return { muted: v.muted, rate: v.playbackRate };
    });
    check('YouTube : son et vitesse rétablis après la pub', !after.muted && after.rate === 1, JSON.stringify(after));
    await page.close();
  }

  // 9. Fenêtre de l'extension
  {
    const popup = await ctx.newPage();
    await popup.setViewportSize({ width: 380, height: 640 });
    await popup.goto(`chrome-extension://${extId}/popup.html`);
    await popup.waitForSelector('#sites li');
    check('fenêtre : 8 réseaux listés', (await popup.locator('#sites li').count()) === 8);
    check('fenêtre : protection affichée comme activée', (await popup.locator('#status').textContent()) === 'Protection activée');
    await popup.screenshot({ path: path.join(OUT, 'popup-on.png') });
    await popup.locator('#master').evaluate((el) => el.click());
    await sleep(500);
    check('fenêtre : l\'interrupteur général désactive la protection',
      (await popup.locator('#status').textContent()) === 'Protection désactivée' && (await storage('local', 'enabled')).enabled === false);
    check('fenêtre : les interrupteurs par réseau sont grisés quand tout est coupé',
      await popup.locator('#sites input').evaluateAll((els) => els.every((e) => e.disabled)));
    await popup.screenshot({ path: path.join(OUT, 'popup-off.png') });
    await popup.locator('#master').evaluate((el) => el.click());
    await sleep(400);
    await popup.locator('#sites input[data-id="tiktok"]').evaluate((el) => el.click());
    await sleep(400);
    check('fenêtre : l\'interrupteur d\'un réseau l\'enregistre', (await storage('local', 'sites')).sites.tiktok === false);
    await popup.locator('#reset').click();
    await sleep(600);
    check('fenêtre : « Remettre à zéro » vide le compteur total', (await storage('local', 'total')).total === 0);
    await setSettings({ sites: {} });
    await popup.close();
  }

  // 10. Gros fil : 600 posts dont 60 pubs, l'analyse doit rester rapide
  {
    const page = await ctx.newPage();
    await page.route('https://www.facebook.com/big', (route) => {
      const items = Array.from({ length: 600 }, (_, i) =>
        i % 10 === 0
          ? `<div><div role="article" data-t="ad"><h3>Marque ${i}</h3><span>Sponsorisé</span></div></div>`
          : `<div><div role="article" data-t="organic"><h3>Ami ${i}</h3><p>${'Un long texte de publication. '.repeat(10)}</p></div></div>`
      ).join('');
      route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><body><div role="feed">${items}</div></body>` });
    });
    const t0 = Date.now();
    await page.goto('https://www.facebook.com/big');
    const list = await settle(page);
    const ms = Date.now() - t0;
    check(`gros fil (600 posts) : 60 pubs masquées en ${ms} ms`, allCorrect(list) && ms < 3000, describeBad(list));
    await page.close();
  }

  await ctx.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
  console.log(`\n${passed} réussis, ${failed} échoués`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
