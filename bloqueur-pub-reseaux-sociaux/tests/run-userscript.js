/*
 * Tests de la version téléphone (userscript) : on simule un téléphone Android (écran tactile,
 * petit écran) et on injecte le script dans la page, comme le fait Violentmonkey ou Tampermonkey.
 *
 *   node tests/run-userscript.js
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mocks } = require('./mocks');
const { build, OUTPUT } = require('../tools/build-userscript');
const {
  OUT, check, finish, sleep, posts, settle, describeBad, allCorrect, serveMocks, openMock, bigFeed,
} = require('./helpers');

const pill = (page) => page.locator('#bpr-pastille button');
const pillLabel = (page) => pill(page).getAttribute('aria-label');

async function main() {
  // 1. Le fichier livré correspond au code actuel
  const shipped = fs.readFileSync(OUTPUT, 'utf8');
  check('le userscript livré est à jour (node tools/build-userscript.js)', shipped === build());
  check('en-tête : @match pour chaque réseau', (shipped.match(/^\/\/ @match /gm) || []).length === 10);
  check('en-tête : @inject-into content (à l\'abri de la CSP des sites)', /^\/\/ @inject-into\s+content$/m.test(shipped));

  const browser = await chromium.launch({ channel: 'chromium', headless: true });
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript({ content: shipped });
  await serveMocks(ctx);
  await ctx.route('https://example.org/**', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>autre</title><p>Bonjour</p>' })
  );

  // 2. Chaque réseau, sur un écran de téléphone
  for (const name of Object.keys(mocks)) {
    const page = await openMock(ctx, name);
    const list = await settle(page);
    check(`${name} (téléphone) : pubs masquées, vrais posts intacts`, allCorrect(list), describeBad(list));
    await page.close();
  }

  // 3. La pastille : compteur, pause, mémorisation de la pause
  {
    const page = await openMock(ctx, 'instagram'); // 2 pubs dans la maquette
    await settle(page);
    await sleep(300);
    check('pastille : affiche 2 pubs masquées', (await pillLabel(page)).includes('2 pubs masquées'), await pillLabel(page));
    const box = await pill(page).boundingBox();
    const viewport = page.viewportSize();
    check('pastille : entièrement visible à l\'écran, collée au bord gauche',
      box && box.x === 0 && box.y > 0 && box.y + box.height < viewport.height && box.width >= 36 && box.height >= 44, JSON.stringify(box));
    await page.screenshot({ path: path.join(OUT, 'telephone-actif.png') });

    await pill(page).tap();
    await sleep(300);
    let list = await posts(page);
    check('toucher la pastille : pause, les pubs réapparaissent', list.every((p) => p.visible) && (await pillLabel(page)).includes('en pause'));
    await page.screenshot({ path: path.join(OUT, 'telephone-pause.png') });

    await page.reload();
    await sleep(800);
    list = await posts(page);
    check('la pause est retenue après rechargement de la page', list.every((p) => p.visible) && (await pillLabel(page)).includes('en pause'));

    await pill(page).tap();
    list = await settle(page);
    check('toucher de nouveau la pastille : les pubs sont masquées sans recharger', allCorrect(list), describeBad(list));
    await page.close();
  }

  // 4. Pas de pastille ailleurs que sur les réseaux pris en charge
  {
    const page = await ctx.newPage();
    await page.goto('https://example.org/');
    await sleep(500);
    check('autre site : aucune pastille', (await page.locator('#bpr-pastille').count()) === 0);
    await page.close();
  }

  // 5. Pubs arrivant après coup
  {
    const page = await openMock(ctx, 'facebook');
    await settle(page);
    await page.evaluate(mocks.facebook.addAd);
    await page.evaluate(mocks.facebook.addLazyAd);
    await sleep(1800);
    const list = await posts(page);
    check('défilement infini et mention tardive : masqués aussi',
      list.some((p) => p.t === 'ad-late') && list.some((p) => p.t === 'ad-lazy') &&
      list.filter((p) => p.t.startsWith('ad-')).every((p) => !p.visible));
    await page.close();
  }

  // 6. Site qui interdit les <style> ajoutés par un script (CSP) : le script tourne dans la page, il y est soumis
  {
    const page = await openMock(ctx, 'facebook', { path: 'csp' });
    const list = await settle(page);
    check('page avec une CSP stricte sur les styles : pubs masquées', allCorrect(list), describeBad(list));
    check('page avec une CSP stricte : la pastille s\'affiche quand même', (await pill(page).count()) === 1);
    await page.close();
  }

  // 7. Pubs vidéo YouTube
  {
    const page = await openMock(ctx, 'youtube');
    await settle(page);
    await page.waitForFunction(() => document.getElementById('v').readyState >= 1);
    await page.evaluate(mocks.youtube.startVideoAd);
    await sleep(1200);
    const during = await page.evaluate(() => {
      const v = document.getElementById('v');
      return { skipped: window.__skipped || 0, time: v.currentTime, duration: v.duration, muted: v.muted, rate: v.playbackRate };
    });
    check('YouTube (téléphone) : pub vidéo passée, en sourdine',
      during.skipped >= 1 && during.muted && during.time >= during.duration - 0.2, JSON.stringify(during));
    await page.evaluate(mocks.youtube.endVideoAd);
    await sleep(1000);
    const after = await page.evaluate(() => ({ muted: document.getElementById('v').muted, rate: document.getElementById('v').playbackRate }));
    check('YouTube (téléphone) : son et vitesse rétablis après la pub', !after.muted && after.rate === 1, JSON.stringify(after));
    await page.close();
  }

  // 8. Gros fil
  {
    const page = await ctx.newPage();
    const { list, ms } = await bigFeed(page);
    check(`gros fil (600 posts, téléphone) : pubs masquées en ${ms} ms`, allCorrect(list) && ms < 3000, describeBad(list));
    await page.close();
  }

  await browser.close();

  // 9. Mode « content » : le script tourne dans le monde isolé d'une extension, comme le fait l'app Userscripts
  //    de Safari avec @inject-into content. On le simule avec une mini-extension qui charge le même fichier.
  {
    const extDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bpr-content-ext-'));
    const matches = [...shipped.matchAll(/^\/\/ @match\s+(\S+)/gm)].map((m) => m[1]);
    fs.writeFileSync(
      path.join(extDir, 'manifest.json'),
      JSON.stringify({ manifest_version: 3, name: 'test', version: '1', content_scripts: [{ matches, js: ['script.js'], run_at: 'document_start' }] })
    );
    fs.writeFileSync(path.join(extDir, 'script.js'), shipped);
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bpr-content-profile-'));
    const cctx = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      headless: true,
      ...devices['Pixel 7'],
      args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
    });
    await serveMocks(cctx);
    for (const name of Object.keys(mocks)) {
      const page = await openMock(cctx, name);
      const list = await settle(page);
      check(`mode content, ${name} : pubs masquées, vrais posts intacts`, allCorrect(list), describeBad(list));
      await page.close();
    }
    const page = await openMock(cctx, 'instagram');
    await settle(page);
    await sleep(300);
    check('mode content : la pastille compte 2 pubs', (await pillLabel(page)).includes('2 pubs masquées'), await pillLabel(page));
    await pill(page).tap();
    await sleep(300);
    check('mode content : toucher la pastille met en pause', (await posts(page)).every((p) => p.visible));
    await pill(page).tap();
    const list = await settle(page);
    check('mode content : toucher de nouveau relance le blocage', allCorrect(list), describeBad(list));
    await page.close();
    const csp = await openMock(cctx, 'facebook', { path: 'csp' });
    check('mode content, CSP stricte : pubs masquées', allCorrect(await settle(csp)));
    await cctx.close();
    fs.rmSync(extDir, { recursive: true, force: true });
    fs.rmSync(profile, { recursive: true, force: true });
  }

  process.exit(finish());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
