/* Outils communs aux tests (extension : run.js, téléphone : run-userscript.js). */
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
const finish = () => {
  console.log(`\n${passed} réussis, ${failed} échoués`);
  return failed ? 1 : 0;
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

// Sert les maquettes à la place des vrais sites. Le chemin /csp ajoute une politique de sécurité
// qui interdit les <style> ajoutés par un script, comme le font certains vrais sites.
async function serveMocks(ctx) {
  for (const mock of Object.values(mocks)) {
    await ctx.route(`${new URL(mock.url).origin}/**`, (route) => {
      const request = route.request();
      if (!request.url().endsWith('.webm')) {
        const csp = new URL(request.url()).pathname === '/csp' ? { 'Content-Security-Policy': "style-src 'self'" } : {};
        return route.fulfill({ contentType: 'text/html; charset=utf-8', headers: csp, body: mock.page });
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
}

async function openMock(ctx, name, { before, path: urlPath = '' } = {}) {
  const page = await ctx.newPage();
  if (before) before(page);
  await page.goto(new URL(urlPath, mocks[name].url).href);
  return page;
}

// Gros fil de 600 posts dont 60 pubs : sert à vérifier que l'analyse reste rapide.
async function bigFeed(page) {
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
  return { list, ms: Date.now() - t0 };
}

module.exports = {
  EXT, OUT, check, finish, sleep, posts, settle, describeBad, allCorrect, serveMocks, openMock, bigFeed,
};
