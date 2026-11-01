// Calendrier hégirien (Umm al-Qura via Intl), phases de la lune et fêtes.
export const MONTHS = ['Mouharram', 'Safar', "Rabi' al-awwal", "Rabi' ath-thani", 'Joumada al-oula', 'Joumada ath-thania', 'Rajab', "Cha'ban", 'Ramadan', 'Chawwal', "Dhou al-qi'da", 'Dhou al-hijja'];
export const MONTHS_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
export const DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

let fmt;
try { fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' }); }
catch { fmt = null; }

const DAY = 86400000;

// y/m/d = date civile (grégorienne) → date hégirienne. Midi UTC pour éviter tout décalage de fuseau.
export function hijriFromCivil(y, m, d, adjust = 0) {
  const t = Date.UTC(y, m - 1, d, 12) + adjust * DAY;
  if (!fmt) return approx(t);
  const parts = fmt.formatToParts(new Date(t));
  const get = (k) => parseInt(parts.find((p) => p.type === k).value, 10);
  return { y: get('year'), m: get('month'), d: get('day') };
}

// Repli arithmétique (calendrier civil tabulaire) si Intl ne gère pas le calendrier.
function approx(t) {
  const jd = Math.floor(t / DAY) + 2440588;
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const m = Math.floor((24 * l3) / 709);
  return { y: 30 * n + j - 30, m, d: l3 - Math.floor((709 * m) / 24) };
}

export const civilToUTC = (y, m, d) => Date.UTC(y, m - 1, d, 12);
export const fmtHijri = (h) => `${h.d} ${MONTHS[h.m - 1]} ${h.y}`;

// Prochaine occurrence (à partir de y/m/d civil) d'un jour hégirien (mois, jour). Retourne { y,m,d, days }.
export function nextHijriOccurrence(hm, hd, from, adjust = 0, horizon = 400) {
  for (let i = 0; i <= horizon; i++) {
    const t = Date.UTC(from.y, from.m - 1, from.d, 12) + i * DAY;
    const dt = new Date(t);
    const h = hijriFromCivil(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), adjust);
    if (h.m === hm && h.d === hd) return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), days: i };
  }
  return null;
}

export const EVENTS = [
  { m: 1, d: 1, id: 'nouvel-an', fr: 'Nouvel an hégirien', ar: 'رأس السنة الهجرية', desc: "Début de l'année hégirienne, qui commence avec l'émigration (hijra) du Prophète ﷺ de La Mecque à Médine.", sym: '🌙' },
  { m: 1, d: 10, id: 'achoura', fr: 'Achoura', ar: 'عاشوراء', desc: "10 Mouharram. Le Prophète ﷺ a jeûné ce jour et recommandé d'y joindre le 9 (ou le 11). Jeûne rapporté par Boukhari et Mouslim.", sym: '🤲' },
  { m: 3, d: 12, id: 'mawlid', fr: 'Naissance du Prophète ﷺ (Mawlid)', ar: 'المولد النبوي', desc: "12 Rabi' al-awwal, date la plus répandue de la naissance du Prophète ﷺ. Les savants divergent sur la manière de commémorer cette date.", sym: '🌟' },
  { m: 7, d: 27, id: 'isra', fr: "Al-Isra' wal-Mi'raj", ar: 'الإسراء والمعراج', desc: "Voyage nocturne de La Mecque à Jérusalem puis élévation au ciel (sourate 17:1 et 53:1-18). La date du 27 Rajab est traditionnelle, mais non établie avec certitude.", sym: '✨' },
  { m: 9, d: 1, id: 'ramadan', fr: 'Début du Ramadan', ar: 'بداية رمضان', desc: "Mois du jeûne, quatrième pilier de l'Islam (2:183-185). Le début est confirmé par l'observation du croissant ou le calcul selon votre autorité locale.", sym: '🌙' },
  { m: 9, d: 27, id: 'qadr', fr: 'Laylat al-Qadr (nuit du Destin)', ar: 'ليلة القدر', desc: "Nuit meilleure que mille mois (97:3), à rechercher dans les dix dernières nuits du Ramadan, surtout les nuits impaires. La nuit du 27 est la plus citée.", sym: '⭐' },
  { m: 10, d: 1, id: 'fitr', fr: 'Aïd al-Fitr', ar: 'عيد الفطر', desc: "Fête de la rupture du jeûne : zakat al-fitr avant la prière de l'Aïd, prière en commun, partage et remerciements.", sym: '🎉' },
  { m: 12, d: 9, id: 'arafat', fr: "Jour d'Arafat", ar: 'يوم عرفة', desc: "9 Dhou al-hijja. Sommet du Hajj. Pour ceux qui ne sont pas en pèlerinage, jeûner ce jour efface les péchés de deux ans selon un hadith rapporté par Mouslim.", sym: '⛰️' },
  { m: 12, d: 10, id: 'adha', fr: 'Aïd al-Adha', ar: 'عيد الأضحى', desc: "Fête du sacrifice en souvenir de la soumission d'Ibrahim et d'Ismaïl (37:100-111). Prière de l'Aïd puis sacrifice et partage de la viande.", sym: '🐑' },
];

// ─── Lune ───
const SYNODIC = 29.530588853;
export function moonAge(date = new Date()) {
  const jd = date.getTime() / DAY + 2440587.5;
  const age = (jd - 2451550.1) % SYNODIC;
  return age < 0 ? age + SYNODIC : age;
}
export function moonPhase(date = new Date()) {
  const age = moonAge(date);
  const frac = age / SYNODIC;
  const illum = (1 - Math.cos(2 * Math.PI * frac)) / 2;
  const names = ['Nouvelle lune', 'Premier croissant', 'Premier quartier', 'Gibbeuse croissante', 'Pleine lune', 'Gibbeuse décroissante', 'Dernier quartier', 'Dernier croissant'];
  const name = names[Math.floor(((frac * 8) + 0.5) % 8)];
  return { age, frac, illum, name };
}
