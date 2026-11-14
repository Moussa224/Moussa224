/*
 * Fabrique la version téléphone : un seul fichier « userscript » qui réunit sites.js, engine.js
 * et telephone/bridge.js. Les réseaux pris en charge et la version viennent de sites.js et de
 * manifest.json, donc rien à recopier à la main.
 *
 *   node tools/build-userscript.js
 *
 * Il faut relancer cette commande après chaque modification de sites.js, engine.js ou bridge.js
 * (les tests vérifient que le fichier généré est à jour).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'telephone', 'bloqueur-pub-reseaux-sociaux.user.js');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8').trimEnd();

function build() {
  const manifest = JSON.parse(read('manifest.json'));
  const sandbox = {};
  new Function('sandbox', `${read('sites.js')}; sandbox.sites = BPR_SITES;`)(sandbox);
  const matches = sandbox.sites.flatMap((site) => site.hosts).map((host) => `// @match        *://*.${host}/*`);

  const header = [
    '// ==UserScript==',
    '// @name         Bloqueur de pubs - Réseaux sociaux',
    '// @namespace    https://github.com/Moussa224/Moussa224',
    `// @version      ${manifest.version}`,
    `// @description  ${manifest.description}`,
    ...matches,
    '// @run-at       document-start',
    '// @noframes',
    '// @grant        none',
    '// ==/UserScript==',
  ].join('\n');

  const parts = ['sites.js', 'engine.js', path.join('telephone', 'bridge.js')].map(read);
  return `${header}\n\n(function () {\n'use strict';\n\n${parts.join('\n\n')}\n})();\n`;
}

module.exports = { build, OUTPUT };

if (require.main === module) {
  fs.writeFileSync(OUTPUT, build());
  console.log(`écrit : ${path.relative(process.cwd(), OUTPUT)}`);
}
