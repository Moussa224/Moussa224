// Horaires de prière (calcul astronomique 100 % hors-ligne avec « adhan »), qibla, distance.
import { Coordinates, CalculationMethod, PrayerTimes, SunnahTimes, Qibla, Madhab, HighLatitudeRule } from 'adhan';
import { store } from './store.js';
import { hijriFromCivil } from './hijri.js';

export const CITIES = [
  { id: 'conakry', name: 'Conakry', country: 'Guinée', lat: 9.6412, lon: -13.5784, tz: 'Africa/Conakry' },
  { id: 'kankan', name: 'Kankan', country: 'Guinée', lat: 10.3854, lon: -9.3057, tz: 'Africa/Conakry' },
  { id: 'labe', name: 'Labé', country: 'Guinée', lat: 11.3182, lon: -12.2833, tz: 'Africa/Conakry' },
  { id: 'kindia', name: 'Kindia', country: 'Guinée', lat: 10.0565, lon: -12.8647, tz: 'Africa/Conakry' },
  { id: 'nzerekore', name: "N'Zérékoré", country: 'Guinée', lat: 7.7562, lon: -8.8179, tz: 'Africa/Conakry' },
  { id: 'dakar', name: 'Dakar', country: 'Sénégal', lat: 14.7167, lon: -17.4677, tz: 'Africa/Dakar' },
  { id: 'bamako', name: 'Bamako', country: 'Mali', lat: 12.6392, lon: -8.0029, tz: 'Africa/Bamako' },
  { id: 'abidjan', name: 'Abidjan', country: "Côte d'Ivoire", lat: 5.36, lon: -4.0083, tz: 'Africa/Abidjan' },
  { id: 'freetown', name: 'Freetown', country: 'Sierra Leone', lat: 8.4657, lon: -13.2317, tz: 'Africa/Freetown' },
  { id: 'ouagadougou', name: 'Ouagadougou', country: 'Burkina Faso', lat: 12.3714, lon: -1.5197, tz: 'Africa/Ouagadougou' },
  { id: 'niamey', name: 'Niamey', country: 'Niger', lat: 13.5116, lon: 2.1254, tz: 'Africa/Niamey' },
  { id: 'nouakchott', name: 'Nouakchott', country: 'Mauritanie', lat: 18.0735, lon: -15.9582, tz: 'Africa/Nouakchott' },
  { id: 'lagos', name: 'Lagos', country: 'Nigéria', lat: 6.5244, lon: 3.3792, tz: 'Africa/Lagos' },
  { id: 'casablanca', name: 'Casablanca', country: 'Maroc', lat: 33.5731, lon: -7.5898, tz: 'Africa/Casablanca' },
  { id: 'alger', name: 'Alger', country: 'Algérie', lat: 36.7538, lon: 3.0588, tz: 'Africa/Algiers' },
  { id: 'tunis', name: 'Tunis', country: 'Tunisie', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
  { id: 'lecaire', name: 'Le Caire', country: 'Égypte', lat: 30.0444, lon: 31.2357, tz: 'Africa/Cairo' },
  { id: 'paris', name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
  { id: 'marseille', name: 'Marseille', country: 'France', lat: 43.2965, lon: 5.3698, tz: 'Europe/Paris' },
  { id: 'lyon', name: 'Lyon', country: 'France', lat: 45.764, lon: 4.8357, tz: 'Europe/Paris' },
  { id: 'bruxelles', name: 'Bruxelles', country: 'Belgique', lat: 50.8503, lon: 4.3517, tz: 'Europe/Brussels' },
  { id: 'geneve', name: 'Genève', country: 'Suisse', lat: 46.2044, lon: 6.1432, tz: 'Europe/Zurich' },
  { id: 'londres', name: 'Londres', country: 'Royaume-Uni', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
  { id: 'montreal', name: 'Montréal', country: 'Canada', lat: 45.5019, lon: -73.5674, tz: 'America/Toronto' },
  { id: 'newyork', name: 'New York', country: 'États-Unis', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { id: 'istanbul', name: 'Istanbul', country: 'Turquie', lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul' },
  { id: 'lameque', name: 'La Mecque', country: 'Arabie saoudite', lat: 21.3891, lon: 39.8579, tz: 'Asia/Riyadh' },
  { id: 'medine', name: 'Médine', country: 'Arabie saoudite', lat: 24.5247, lon: 39.5692, tz: 'Asia/Riyadh' },
  { id: 'dubai', name: 'Dubaï', country: 'Émirats arabes unis', lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai' },
  { id: 'jakarta', name: 'Jakarta', country: 'Indonésie', lat: -6.2088, lon: 106.8456, tz: 'Asia/Jakarta' },
  { id: 'kualalumpur', name: 'Kuala Lumpur', country: 'Malaisie', lat: 3.139, lon: 101.6869, tz: 'Asia/Kuala_Lumpur' },
];

export const METHODS = [
  { id: 'MWL', name: 'Ligue islamique mondiale (18° / 17°)', make: () => CalculationMethod.MuslimWorldLeague() },
  { id: 'UOIF', name: 'UOIF / France (12° / 12°)', make: () => { const p = CalculationMethod.Other(); p.fajrAngle = 12; p.ishaAngle = 12; return p; } },
  { id: 'EGYPT', name: 'Autorité générale égyptienne (19,5° / 17,5°)', make: () => CalculationMethod.Egyptian() },
  { id: 'UMMALQURA', name: 'Umm al-Qura, La Mecque', make: () => CalculationMethod.UmmAlQura() },
  { id: 'KARACHI', name: 'Université de Karachi (18° / 18°)', make: () => CalculationMethod.Karachi() },
  { id: 'ISNA', name: 'ISNA, Amérique du Nord (15° / 15°)', make: () => CalculationMethod.NorthAmerica() },
  { id: 'MOON', name: 'Moonsighting Committee', make: () => CalculationMethod.MoonsightingCommittee() },
  { id: 'TURKEY', name: 'Diyanet, Turquie', make: () => CalculationMethod.Turkey() },
  { id: 'DUBAI', name: 'Dubaï', make: () => CalculationMethod.Dubai() },
  { id: 'QATAR', name: 'Qatar', make: () => CalculationMethod.Qatar() },
  { id: 'KUWAIT', name: 'Koweït', make: () => CalculationMethod.Kuwait() },
  { id: 'SINGAPORE', name: 'Singapour / Malaisie', make: () => CalculationMethod.Singapore() },
];

export const PRAYERS = [
  { id: 'fajr', fr: 'Fajr', ar: 'الفجر', sub: "L'aube", rakaat: 2 },
  { id: 'dhuhr', fr: 'Dhouhr', ar: 'الظهر', sub: 'Midi', rakaat: 4 },
  { id: 'asr', fr: 'Asr', ar: 'العصر', sub: "L'après-midi", rakaat: 4 },
  { id: 'maghrib', fr: 'Maghrib', ar: 'المغرب', sub: 'Le coucher du soleil', rakaat: 3 },
  { id: 'isha', fr: 'Ichaa', ar: 'العشاء', sub: 'La nuit', rakaat: 4 },
];
export const SUNRISE = { id: 'sunrise', fr: 'Chourouq', ar: 'الشروق', sub: 'Le lever du soleil' };

export const KAABA = { lat: 21.422487, lon: 39.826206 };

export function currentPlace() {
  const c = store.get('custom');
  if (store.get('city') === 'custom' && c) return { id: 'custom', ...c, country: c.country || 'Position personnalisée' };
  return CITIES.find((x) => x.id === store.get('city')) || CITIES[0];
}

// Date civile (y, m, d) dans le fuseau du lieu.
export function civilInTZ(date, tz) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const g = (t) => parseInt(parts.find((p) => p.type === t).value, 10);
  return { y: g('year'), m: g('month'), d: g('day'), hh: g('hour'), mm: g('minute'), ss: g('second') };
}

export function paramsFor(place) {
  const m = METHODS.find((x) => x.id === store.get('method')) || METHODS[0];
  const p = m.make();
  p.madhab = store.get('madhab') === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  if (Math.abs(place.lat) > 48) p.highLatitudeRule = HighLatitudeRule.recommended(new Coordinates(place.lat, place.lon));
  return p;
}

// Horaires pour le jour civil du lieu contenant `at`. dayOffset = +1 pour demain.
export function timesFor(place, at = new Date(), dayOffset = 0) {
  const c = civilInTZ(at, place.tz);
  const base = new Date(c.y, c.m - 1, c.d + dayOffset, 12, 0, 0); // le calcul n'utilise que Y/M/D locaux
  const coords = new Coordinates(place.lat, place.lon);
  const pt = new PrayerTimes(coords, base, paramsFor(place));
  const sun = new SunnahTimes(pt);
  return {
    civil: { y: base.getFullYear(), m: base.getMonth() + 1, d: base.getDate() },
    fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, sunset: pt.sunset, maghrib: pt.maghrib, isha: pt.isha,
    middleOfNight: sun.middleOfTheNight, lastThird: sun.lastThirdOfTheNight,
  };
}

// Prochaine prière (parmi les 5 obligatoires) et prière en cours, à l'instant `now`.
export function status(place, now = new Date()) {
  const today = timesFor(place, now, 0);
  const order = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  let next = null;
  for (const id of order) if (today[id] > now) { next = { id, at: today[id], day: 0 }; break; }
  if (!next) { const tm = timesFor(place, now, 1); next = { id: 'fajr', at: tm.fajr, day: 1 }; }
  let current = null;
  if (now < today.fajr) current = 'isha';
  else for (const id of order) if (today[id] <= now) current = id;
  const idx = order.indexOf(next.id);
  const prevAt = next.day === 1 ? today.isha : idx === 0 ? timesFor(place, now, -1).isha : today[order[idx - 1]];
  return { today, next, current, prevAt, progress: Math.min(1, Math.max(0, (now - prevAt) / (next.at - prevAt))) };
}

export function fmtTime(date, tz, seconds = false) {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}), hourCycle: 'h23' }).format(date);
}
export function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
}

// Date hégirienne « du moment » (le jour hégirien commence au coucher du soleil).
export function hijriNow(place, now = new Date()) {
  const c = civilInTZ(now, place.tz);
  const t = timesFor(place, now, 0);
  const shift = store.get('hijriAtMaghrib') && now >= t.maghrib ? 1 : 0;
  const date = new Date(Date.UTC(c.y, c.m - 1, c.d + shift, 12));
  return { ...hijriFromCivil(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), store.get('hijriAdjust')), civil: c, afterMaghrib: !!shift };
}

export function qiblaBearing(place) { return Qibla(new Coordinates(place.lat, place.lon)); }

export function distanceKm(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
