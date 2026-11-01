// Génère data/quran/<n>.js (chargés à la demande) et src/content/surahs.json
// à partir du paquet npm « quran-json » (texte ʿuthmānī + traduction française de
// Muhammad Hamidullah + translittération). Voir README pour les licences.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules/quran-json/dist/chapters/fr');
const out = path.join(root, 'data/quran');
fs.mkdirSync(out, { recursive: true });

// Nombre officiel de versets par sourate (édition de Médine / Hafs) — contrôle d'intégrité.
const EXPECTED = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const JUZ = [[1,1],[2,142],[2,253],[3,93],[4,24],[4,148],[5,82],[6,111],[7,88],[8,41],[9,93],[11,6],[12,53],[15,2],[17,1],[18,75],[21,1],[23,1],[25,21],[27,56],[29,46],[33,31],[36,28],[39,32],[41,47],[46,1],[51,31],[58,1],[67,1],[78,1]];

const index = JSON.parse(fs.readFileSync(path.join(src, 'index.json'), 'utf8'));
let total = 0;
const surahs = [];
for (const meta of index) {
  const ch = JSON.parse(fs.readFileSync(path.join(src, `${meta.id}.json`), 'utf8'));
  if (ch.verses.length !== EXPECTED[meta.id - 1]) throw new Error(`Sourate ${meta.id}: ${ch.verses.length} versets, attendu ${EXPECTED[meta.id - 1]}`);
  ch.verses.forEach((v, i) => { if (v.id !== i + 1) throw new Error(`Sourate ${meta.id}: numérotation incohérente`); if (!v.text || !v.translation) throw new Error(`Sourate ${meta.id}:${v.id} vide`); });
  total += ch.verses.length;
  const clean = (s) => s.replace(/\s+/g, ' ').trim();
  const body = ch.verses.map((v) => [clean(v.text), clean(v.translation), clean(v.transliteration || '')]);
  fs.writeFileSync(path.join(out, `${meta.id}.js`), `(self.NUR_Q=self.NUR_Q||{})[${meta.id}]=${JSON.stringify(body)};\n`);
  surahs.push({ id: meta.id, ar: meta.name, tr: meta.transliteration, fr: meta.translation, type: meta.type === 'meccan' ? 'M' : 'D', n: meta.total_verses });
}
if (total !== 6236) throw new Error(`Total ${total} ≠ 6236`);
fs.writeFileSync(path.join(root, 'src/content/surahs.json'), JSON.stringify({ surahs, juz: JUZ }));
console.log(`OK — 114 sourates, ${total} versets`);
