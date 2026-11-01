// Contrôle d'intégrité des contenus : node scripts/check.mjs  (code de sortie ≠ 0 en cas de problème)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('✗ ' + m); } else console.log('✓ ' + m); };

// Coran : 114 fichiers, 6 236 versets, chaque verset a arabe + français + phonétique non vides
const Q = {}; const ctx = { self: {} }; ctx.self.NUR_Q = Q; vm.createContext(ctx);
for (let n = 1; n <= 114; n++) vm.runInContext(fs.readFileSync(path.join(root, `data/quran/${n}.js`), 'utf8'), ctx);
const total = Object.values(ctx.self.NUR_Q).reduce((a, s) => a + s.length, 0);
ok(Object.keys(ctx.self.NUR_Q).length === 114, 'Coran : 114 sourates');
ok(total === 6236, `Coran : ${total} versets (attendu 6236)`);
ok(Object.values(ctx.self.NUR_Q).every((s) => s.every((v) => v[0] && v[1] && v[2])), 'Coran : arabe, français et phonétique présents partout');
const verseExists = (s, v) => ctx.self.NUR_Q[s] && v >= 1 && v <= ctx.self.NUR_Q[s].length;

const { NAMES } = await import(path.join(root, 'src/content/names.js'));
ok(NAMES.length === 99, '99 Noms : 99 entrées');
ok(NAMES.every((n) => n.ar && n.tr && n.fr && n.ex), '99 Noms : champs complets');
ok(new Set(NAMES.map((n) => n.ar)).size === 99, '99 Noms : formes arabes distinctes');

const hadith = JSON.parse(fs.readFileSync(path.join(root, 'src/content/hadith.json'), 'utf8'));
ok(hadith.length === 42 && hadith.every((h, i) => h.n === i + 1 && h.ar.length > 40 && h.fr.length > 40 && h.src), 'Hadiths : 42 complets et numérotés');

const { DUAS } = await import(path.join(root, 'src/content/duas.js'));
let badRef = 0; for (const d of DUAS) { if (d.ref) { const [s, a, b = a] = d.ref; if (!verseExists(s, a) || !verseExists(s, b) || b < a) badRef++; } else if (!d.ar || !d.fr) badRef++; }
ok(badRef === 0, `Invocations : ${DUAS.length} entrées, références coraniques valides`);

const { PROPHETS, OTHER_STORIES } = await import(path.join(root, 'src/content/prophets.js'));
ok(PROPHETS.length === 25, 'Prophètes : 25 cités dans le Coran');
const refOk = (r) => { const m = /^(\d+):(\d+)(?:-(\d+))?$/.exec(r); if (!m) return false; const s = +m[1], a = +m[2], b = +(m[3] || m[2]); return verseExists(s, a) && verseExists(s, b) && b >= a; };
const badRefs = [...PROPHETS, ...OTHER_STORIES].flatMap((p) => p.refs.filter((r) => !refOk(r)).map((r) => `${p.id} ${r}`));
ok(badRefs.length === 0, `Récits : toutes les références de versets existent ${badRefs.join(', ')}`);
ok(new Set([...PROPHETS, ...OTHER_STORIES].map((p) => p.id)).size === PROPHETS.length + OTHER_STORIES.length, 'Récits : identifiants uniques');

const { QUIZ } = await import(path.join(root, 'src/content/quiz.js'));
ok(QUIZ.length >= 40 && QUIZ.every((q) => q.o.length === 4 && new Set(q.o).size === 4 && q.o[0] === q.a && q.e), `Quiz : ${QUIZ.length} questions, 4 choix distincts, explication`);

const { DAILY } = await import(path.join(root, 'src/content/verses.js'));
ok(DAILY.every(([s, v]) => verseExists(s, v)), 'Versets du jour : références valides');

const { SIRA } = await import(path.join(root, 'src/content/sira.js'));
ok(SIRA.length >= 20 && SIRA.every((e) => e.t && e.d && e.y), `Sîra : ${SIRA.length} étapes`);

console.log(fails ? `\n${fails} contrôle(s) en échec` : '\nTous les contrôles passent');
process.exit(fails ? 1 : 0);
