// Rend index.html en PNG (affiche-simandou.png).  Usage : node render.js [facteur d'échelle]
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const scale = Number(process.argv[2]) || 2;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1206, height: 1326 }, deviceScaleFactor: scale });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.locator('#poster').screenshot({ path: path.join(__dirname, 'affiche-simandou.png') });
  await browser.close();
  console.log('OK → affiche-simandou.png (' + 1206 * scale + '×' + 1326 * scale + ')');
})();
