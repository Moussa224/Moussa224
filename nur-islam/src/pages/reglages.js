import { store } from '../core/store.js';
import { RECITERS } from '../core/audio.js';
import { esc, toast } from '../core/dom.js';
import { icon } from '../core/icons.js';

export const VERSION = '1.0.0';
const row = (t, d, ctl) => `<div class="setting"><div><b style="font-weight:500">${t}</b>${d ? `<small>${d}</small>` : ''}</div><div>${ctl}</div></div>`;
const sel = (id, opts, cur) => `<select id="${id}" style="min-width:150px">${opts.map(([v, n]) => `<option value="${v}" ${v == cur ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
const sw = (id, on) => `<label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}></label>`;

export default {
  title: 'Réglages',
  mount(el, params) {
    const s = store.all();
    el.innerHTML = `
      <div class="page-head"><div class="eyebrow">Personnaliser</div><h1>Réglages <span class="ar" lang="ar">إعدادات</span></h1></div>
      <div class="card"><h3>Apparence</h3>
        ${row('Thème', 'Nuit, clair ou émeraude', sel('theme', [['nuit', 'Nuit'], ['clair', 'Clair'], ['emeraude', 'Émeraude']], s.theme))}
        ${row('Taille du texte arabe', 'Lecture du Coran et des invocations', `<input type="range" id="arSize" min="24" max="56" step="2" value="${s.arSize}" style="width:150px">`)}
        ${row('Qualité 3D', 'Réduisez-la pour économiser la batterie', sel('quality', [['auto', 'Automatique'], ['high', 'Élevée'], ['low', 'Économie']], s.quality))}
        ${row('Animations', 'Réduit les mouvements (accessibilité)', sel('motion', [['auto', 'Selon l\'appareil'], ['on', 'Complètes'], ['off', 'Réduites']], s.motion))}
      </div>
      <div class="card" style="margin-top:14px"><h3>Lecture et son</h3>
        ${row('Traduction française', 'Dans le lecteur du Coran', sw('fr', s.fr))}
        ${row('Phonétique', 'Dans le lecteur du Coran', sw('tr', s.tr))}
        ${row('Récitateur', 'Nécessite une connexion Internet', sel('reciter', RECITERS.map((r) => [r.id, r.name]), s.reciter))}
        ${row('Sons', 'Tasbih, quiz, alertes', sw('sound', s.sound))}
        ${row('Vibrations', 'Sur les appareils compatibles', sw('haptics', s.haptics))}
      </div>
      <div class="card" style="margin-top:14px"><h3>Prière et date</h3>
        ${row('Ville, méthode, école', 'Réglés dans « Horaires de prière »', `<a class="btn sm" href="#/prieres">${icon('clock')} Ouvrir</a>`)}
        ${row('Date hégirienne au coucher du soleil', 'Le jour hégirien commence au Maghrib', sw('hm', s.hijriAtMaghrib))}
      </div>
      <div class="card" style="margin-top:14px"><h3>Application</h3>
        <div class="row" style="gap:10px"><button class="btn gold" id="install" hidden>${icon('plus')} Installer Nûr sur l'appareil</button>
          <button class="btn" id="exp">Exporter mes données</button><label class="btn" style="cursor:pointer">Importer<input type="file" id="imp" accept="application/json" hidden></label><button class="btn ghost" id="rst" style="color:var(--rose)">Tout effacer</button></div>
        <p class="muted" style="font-size:.82rem;margin:10px 0 0">Vos données (favoris, suivi des prières, compteur…) restent sur cet appareil. Exportez-les pour les transférer ailleurs.</p></div>

      <div class="card" id="about" style="margin-top:14px"><h3>À propos de Nûr <span class="muted" style="font-size:.9rem;font-family:var(--font)">v${VERSION}</span></h3>
        <p><b>Confidentialité.</b> Nûr ne collecte aucune donnée, n'a ni compte, ni publicité, ni traceur. Les horaires de prière sont calculés sur votre appareil ; votre position, si vous l'autorisez, n'est jamais envoyée. L'audio de récitation, optionnel, est chargé depuis everyayah.com : ce service voit alors votre adresse IP.</p>
        <p><b>Exactitude.</b> Le texte du Coran provient de sources numériques reconnues ; les hadiths sont donnés avec leur référence. Les traductions sont des traductions du sens. Pour toute question de jurisprudence, adressez-vous à un savant qualifié.</p>
        <div class="divider"></div>
        <div class="eyebrow">Sources et licences</div>
        <ul class="lessons" style="margin:8px 0 0 18px;padding:0;font-size:.9rem">
          <li><b>Coran</b> : texte ʿuthmānî de <i>The Noble Qur'an Encyclopedia</i> (quranenc.com) et translittération de Tanzil.net, via le jeu de données « quran-json » de Risan Bagja Pradana (CC BY-SA 4.0). Traduction française : Muhammad Hamidullah (tanzil.net).</li>
          <li><b>40 hadiths</b> : texte arabe du jeu de données « Nawawi 40 Hadith » (CC BY 4.0) ; traductions du sens et notes : Nûr.</li>
          <li><b>Horaires de prière et qibla</b> : bibliothèque « adhan » de Batoul Apps (MIT).</li>
          <li><b>3D</b> : three.js (MIT). <b>Calendrier</b> : Intl (Umm al-Qura).</li>
          <li><b>Polices</b> : Amiri et Amiri Quran (SIL OFL), Outfit (SIL OFL), Cormorant Garamond (SIL OFL).</li>
          <li><b>Récitations</b> (en ligne) : EveryAyah.com.</li>
        </ul></div>`;
    const $ = (q) => el.querySelector(q);
    const bind = (id, key, conv = (v) => v, ev = 'change') => { const n = $('#' + id); n.addEventListener(ev, () => store.set(key, conv(n.type === 'checkbox' ? n.checked : n.value))); };
    bind('theme', 'theme'); bind('arSize', 'arSize', Number, 'input'); bind('quality', 'quality'); bind('motion', 'motion');
    bind('fr', 'fr'); bind('tr', 'tr'); bind('reciter', 'reciter'); bind('sound', 'sound'); bind('haptics', 'haptics'); bind('hm', 'hijriAtMaghrib');
    $('#quality').addEventListener('change', () => toast('La qualité 3D s\'applique à la prochaine scène ouverte'));
    $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([store.export()], { type: 'application/json' })); a.download = 'nur-sauvegarde.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
    $('#imp').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { store.import(await f.text()); toast('Données importées'); location.reload(); } catch { toast('Fichier invalide'); } };
    $('#rst').onclick = () => { if (confirm('Effacer toutes les données de Nûr sur cet appareil ?')) { store.reset(); toast('Données effacées'); location.reload(); } };
    const inst = $('#install');
    if (window.__nurInstall) inst.hidden = false;
    inst.onclick = async () => { const p = window.__nurInstall; if (!p) return; p.prompt(); await p.userChoice; window.__nurInstall = null; inst.hidden = true; };
    if (params && params.about) setTimeout(() => $('#about').scrollIntoView({ behavior: 'smooth' }), 400);
  },
};
