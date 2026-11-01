// Fusionne le texte arabe du paquet « @kazishariar/nawawi-40-hadith-data » avec nos traductions (hadith-fr.mjs)
// → src/content/hadith.json. Les « pieds de page » (références en arabe) sont retirés du texte arabe.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FR } from './hadith-fr.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@kazishariar/nawawi-40-hadith-data/data.json'), 'utf8')).data;

const FOOT = /(?:رَوَاهُ|رواه|رَوَاه|حَدِيثٌ حَسَنٌ|حديث حسن|حَدِيثٌ صَحِيحٌ|رَوَيْنَاهُ)/;
function clean(a, n) {
  a = a.replace(/\s+/g, ' ').trim();
  if (n === 27) {
    a = a.replace('رَوَاهُ مُسْلِمٌ .', '');
    const i = a.lastIndexOf('حَدِيثٌ حَسَنٌ'); if (i > 0) a = a.slice(0, i);
  } else {
    const m = FOOT.exec(a); if (m && m.index > 60) a = a.slice(0, m.index);
  }
  a = a.replace(/\s*وَقَالَ:?\s*$/, '');
  return a.replace(/\s*[،.]\s*$/, '').replace(/\s+([،.])/g, '$1').trim();
}

const out = data.map((h) => {
  const n = parseInt(h.id.split('_')[1], 10);
  const fr = FR[n]; if (!fr) throw new Error('Traduction manquante : ' + n);
  return { n, ar: clean(h.arabic, n), fr: fr[0], src: fr[1], note: fr[2] || '' };
});
if (out.length !== 42) throw new Error('Attendu 42 hadiths, trouvé ' + out.length);
fs.writeFileSync(path.join(root, 'src/content/hadith.json'), JSON.stringify(out));
console.log(`OK — ${out.length} hadiths, ${(JSON.stringify(out).length / 1024).toFixed(0)} Ko`);
