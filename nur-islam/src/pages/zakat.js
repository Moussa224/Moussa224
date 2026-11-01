import { store } from '../core/store.js';
import { esc } from '../core/dom.js';

const CURR = [['EUR', 'Euro (€)'], ['USD', 'Dollar US ($)'], ['GNF', 'Franc guinéen (GNF)'], ['XOF', 'Franc CFA BCEAO (XOF)'], ['XAF', 'Franc CFA BEAC (XAF)'], ['MAD', 'Dirham marocain (MAD)'], ['DZD', 'Dinar algérien (DZD)'], ['TND', 'Dinar tunisien (TND)'], ['GBP', 'Livre sterling (£)'], ['CAD', 'Dollar canadien (CAD)'], ['CHF', 'Franc suisse (CHF)'], ['SAR', 'Riyal saoudien (SAR)'], ['AED', 'Dirham des Émirats (AED)'], ['TRY', 'Livre turque (TRY)']];
const FIELDS = [
  ['cash', "Espèces, comptes bancaires, épargne", "Argent disponible à la date de calcul."],
  ['goldW', "Or (en grammes)", "Or d'investissement et bijoux selon l'avis de votre école ; indiquez le poids pur."],
  ['silverW', "Argent métal (en grammes)", "Argent détenu comme épargne ou bijoux."],
  ['invest', "Placements (actions, parts…)", "Valeur du marché pour ce qui est détenu à but d'investissement ou de revente."],
  ['stock', "Marchandises destinées à la vente", "Stock d'un commerce, à sa valeur actuelle de vente."],
  ['owed', "Créances que l'on vous doit", "Sommes prêtées dont le remboursement est quasi certain."],
  ['other', "Autres biens zakâtables", "Tout bien de rapport destiné à la revente."],
  ['debts', "Dettes à rembourser maintenant", "À déduire : seules les dettes exigibles à court terme."],
];

export default {
  title: 'Zakât',
  mount(el) {
    const z = { currency: 'EUR', gold: 0, silver: 0, basis: 'gold', ...store.get('zakat') };
    el.innerHTML = `
      <div class="page-head"><div class="eyebrow">Troisième pilier</div><h1>Calculateur de zakât <span class="ar" lang="ar">الزكاة</span></h1>
        <p>« Prélève de leurs biens une aumône pour les purifier » (9:103). Estimez votre zakât al-mâl (2,5 % de l'épargne après un an, au-delà du nisab).</p></div>
      <div class="grid g2" style="align-items:start">
        <div class="card">
          <label class="field">Devise<select id="cur">${CURR.map(([c, n]) => `<option value="${c}" ${c === z.currency ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <div class="grid g2" style="gap:10px"><label class="field">Cours de l'or (par gramme)<input type="number" inputmode="decimal" id="pg" min="0" step="any" value="${z.gold || ''}" placeholder="cours du jour"></label>
            <label class="field">Cours de l'argent (par gramme)<input type="number" inputmode="decimal" id="ps" min="0" step="any" value="${z.silver || ''}" placeholder="cours du jour"></label></div>
          <label class="field">Seuil (nisab) de référence<select id="basis"><option value="gold" ${z.basis === 'gold' ? 'selected' : ''}>Or : 85 g (le plus utilisé)</option><option value="silver" ${z.basis === 'silver' ? 'selected' : ''}>Argent : 595 g (seuil plus bas)</option></select></label>
          <div class="divider"></div>
          ${FIELDS.map(([k, t, h]) => `<label class="field">${t}<input type="number" inputmode="decimal" min="0" step="any" data-k="${k}" placeholder="0"><small class="muted" style="font-size:.74rem">${h}</small></label>`).join('')}
        </div>
        <div class="card tilt" id="res" style="position:sticky;top:80px"></div>
      </div>
      <div class="card" style="margin-top:14px"><h3>À savoir</h3><ul class="lessons" style="margin:6px 0 0 18px;padding:0">
        <li>La zakât est due sur les biens qui atteignent le <b>nisab</b> et sont détenus depuis <b>un an lunaire</b> (hawl).</li>
        <li>On ne paie pas la zakât sur sa résidence, son véhicule personnel, ses meubles ni ses outils de travail.</li>
        <li>Le bétail, les récoltes et les mines ont des règles propres, non couvertes ici.</li>
        <li><b>Zakât al-fitr</b> : due par chaque personne avant la prière de l'Aïd al-Fitr, d'un volume (sâ‘) de nourriture de base (environ 2,5 à 3 kg).</li>
        <li>Les bénéficiaires sont énumérés en 9:60 : pauvres, nécessiteux, collecteurs, cœurs à rapprocher, affranchissements, endettés, voie d'Allah, voyageur.</li></ul>
        <p class="note">Ce calcul est une estimation. Pour votre situation précise (bijoux, commerce, dettes, placements), consultez un savant ou un organisme de confiance. Les cours de l'or et de l'argent ne sont pas intégrés : saisissez ceux du jour.</p></div>`;
    const $ = (s) => el.querySelector(s);
    const val = (k) => parseFloat(el.querySelector(`[data-k=${k}]`).value) || 0;
    const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: z.currency, maximumFractionDigits: z.currency === 'GNF' || z.currency === 'XOF' || z.currency === 'XAF' ? 0 : 2 }).format(n);
    function calc() {
      z.currency = $('#cur').value; z.gold = parseFloat($('#pg').value) || 0; z.silver = parseFloat($('#ps').value) || 0; z.basis = $('#basis').value;
      store.set('zakat', { currency: z.currency, gold: z.gold, silver: z.silver, basis: z.basis });
      const gross = val('cash') + val('goldW') * z.gold + val('silverW') * z.silver + val('invest') + val('stock') + val('owed') + val('other');
      const net = Math.max(0, gross - val('debts'));
      const nisab = z.basis === 'gold' ? 85 * z.gold : 595 * z.silver;
      const known = nisab > 0;
      const due = known && net >= nisab;
      $('#res').innerHTML = `
        <div class="eyebrow">Résultat</div>
        <div class="row spread" style="margin:8px 0"><span class="muted">Total des biens</span><b>${fmt(gross)}</b></div>
        <div class="row spread" style="margin:8px 0"><span class="muted">− Dettes exigibles</span><b>${fmt(val('debts'))}</b></div>
        <div class="row spread" style="margin:8px 0"><span class="muted">Base de calcul</span><b>${fmt(net)}</b></div>
        <div class="row spread" style="margin:8px 0"><span class="muted">Nisab (${z.basis === 'gold' ? '85 g d\'or' : '595 g d\'argent'})</span><b>${known ? fmt(nisab) : '— saisissez le cours'}</b></div>
        <div class="divider"></div>
        ${!known ? '<p class="muted">Indiquez le cours du jour du métal de référence pour connaître le nisab.</p>' : due
          ? `<div class="eyebrow">Zakât à verser (2,5 %)</div><div class="bignum" style="color:var(--gold);margin:6px 0">${fmt(net * 0.025)}</div><p class="muted" style="margin:0">Votre base dépasse le nisab : si ces biens sont détenus depuis un an lunaire, la zakât est due.</p>`
          : `<div class="bignum" style="color:var(--em);margin:6px 0;font-size:2rem">Pas de zakât due</div><p class="muted" style="margin:0">Votre base est inférieure au nisab. L'aumône volontaire (sadaqa) reste toujours recommandée.</p>`}`;
    }
    el.addEventListener('input', calc); el.addEventListener('change', calc); calc();
  },
};
