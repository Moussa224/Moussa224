// ==UserScript==
// @name         Bloqueur de pubs - Réseaux sociaux
// @namespace    https://github.com/Moussa224/Moussa224
// @version      1.0.0
// @description  Masque les publicités et les posts sponsorisés sur Facebook, Instagram, X, YouTube, TikTok, LinkedIn, Reddit et Pinterest.
// @match        *://*.facebook.com/*
// @match        *://*.instagram.com/*
// @match        *://*.x.com/*
// @match        *://*.twitter.com/*
// @match        *://*.youtube.com/*
// @match        *://*.tiktok.com/*
// @match        *://*.linkedin.com/*
// @match        *://*.reddit.com/*
// @match        *://*.pinterest.com/*
// @match        *://*.pinterest.fr/*
// @run-at       document-start
// @noframes
// @grant        none
// @inject-into  content
// ==/UserScript==

(function () {
'use strict';

/*
 * Réseaux sociaux pris en charge et règles de détection des publicités.
 *
 * C'est LE fichier à modifier quand un réseau change son site et qu'une pub repasse
 * à travers (voir README.md, section « Quand une pub repasse »).
 *
 * Chaque réseau a :
 *   id, name   identifiant interne et nom affiché dans la fenêtre de l'extension
 *   hosts      noms de domaine du réseau (sous-domaines inclus)
 *   network    false = ne pas bloquer les requêtes publicitaires sur ce réseau
 *   css        sélecteurs CSS d'éléments qui sont TOUJOURS des pubs : ils sont masqués d'office
 *   items      règles pour les contenus qui ne sont une pub que s'ils portent la mention
 *              « Sponsorisé » / « Promoted » / etc. Chaque règle :
 *                container   sélecteur des éléments à examiner (un post, une carte…)
 *                adSelector  (facultatif) si cet élément est présent dans le post, c'est une pub
 *                label       (facultatif) { ignore, extra } — cherche la mention « Sponsorisé » dans le post
 *                              ignore  zones à ne pas lire (texte écrit par les utilisateurs : légende, commentaires…)
 *                              extra   mentions supplémentaires propres à ce réseau (ex. « Ad » sur X)
 *                hide        (facultatif) sélecteur de l'ancêtre à masquer à la place du post lui-même
 *   skipVideoAds  true = saute automatiquement les pubs vidéo du lecteur (YouTube)
 */

var BPR_DEFAULTS = { enabled: true, network: true, sites: {} };

/* Domaines de régies publicitaires bloqués quand le réseau social essaie de les contacter. */
var BPR_AD_DOMAINS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adservice.google.com',
  'static.ads-twitter.com',
  'ads-api.twitter.com',
  'ads.twitter.com',
  'ads.linkedin.com',
  'ads.tiktok.com',
  'ads.pinterest.com',
  'ads.reddit.com',
];

var BPR_SITES = [
  {
    id: 'facebook',
    name: 'Facebook',
    hosts: ['facebook.com'],
    items: [
      {
        // Les posts du fil, sauf les commentaires (qui sont aussi des « article » imbriqués).
        container: '[role="feed"] [role="article"]:not([role="article"] [role="article"])',
        adSelector: 'a[href*="/ads/about"], [aria-label="Sponsorisé"], [aria-label="Sponsored"]',
        label: {
          ignore: '[role="article"] [role="article"], [data-ad-comet-preview="message"], [data-ad-preview="message"]',
        },
        hide: '[role="feed"] > *',
      },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    hosts: ['instagram.com'],
    items: [{ container: 'article', label: { ignore: 'ul' } }],
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    hosts: ['x.com', 'twitter.com'],
    items: [
      {
        container: '[data-testid="cellInnerDiv"], [data-testid="trend"]',
        label: {
          extra: ['ad', 'ads', 'annonce', 'pub', 'anuncio', 'anzeige'],
          ignore: '[data-testid="tweetText"], [role="group"]',
        },
      },
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    hosts: ['youtube.com'],
    // YouTube détecte le blocage des requêtes publicitaires : on s'en tient au masquage et au saut des pubs.
    network: false,
    skipVideoAds: true,
    css: [
      'ytd-ad-slot-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-banner-promo-renderer',
      'ytd-statement-banner-renderer',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-promoted-video-renderer',
      'ytd-display-ad-renderer',
      'ytd-companion-slot-renderer',
      'ytd-action-companion-ad-renderer',
      '#masthead-ad',
      '#player-ads',
      '.ytp-ad-overlay-container',
      '.ytp-ad-image-overlay',
      'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    hosts: ['tiktok.com'],
    items: [
      {
        container: 'article[data-scroll-index], [data-e2e="recommend-list-item-container"]',
        label: { ignore: '[data-e2e="video-desc"], [data-e2e^="comment"]' },
      },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    hosts: ['linkedin.com'],
    css: ['.ad-banner-container'],
    items: [
      {
        container: '[data-urn^="urn:li:activity"], .feed-shared-update-v2',
        label: { ignore: '.update-components-text, .feed-shared-update-v2__description, .comments-comment-item' },
      },
    ],
  },
  {
    id: 'reddit',
    name: 'Reddit',
    hosts: ['reddit.com'],
    css: ['shreddit-ad-post', 'shreddit-comments-page-ad', '.promotedlink', '[data-promoted="true"]'],
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    hosts: ['pinterest.com', 'pinterest.fr'],
    items: [{ container: '[data-grid-item]', label: {} }],
  },
];

function bprFindSite(hostname) {
  return BPR_SITES.find((s) => s.hosts.some((h) => hostname === h || hostname.endsWith('.' + h)));
}

/*
 * Moteur du bloqueur : tourne dans chaque page des réseaux sociaux listés dans sites.js.
 *
 * Il masque (display:none) les pubs au lieu de les supprimer : on ne casse pas la page
 * et on peut tout réafficher d'un clic si l'on désactive le bloqueur.
 * Tout se passe dans le navigateur : rien n'est envoyé nulle part.
 *
 * Le moteur ne dépend d'aucun navigateur en particulier : on lui donne un « pont » qui sait
 *   loadSettings()           → Promise<{ enabled, sites }>   les réglages actuels
 *   onSettingsChange(rappel) → appelle rappel quand les réglages changent
 *   report(n)                → n pubs viennent d'être masquées
 * Extension de navigateur : content.js. Version téléphone (userscript) : telephone/bridge.js.
 */
function bprStartEngine(bridge) {
  'use strict';

  const site = bprFindSite(location.hostname);
  if (!site) return;

  const ATTR = 'data-bpr-hidden'; // posé sur chaque élément masqué
  const LABEL_BUDGET = 300; // nombre maximal de textes lus par post (la mention est dans l'en-tête, donc au début)
  const PASS_DELAY = 200; // ms : une analyse au plus toutes les 200 ms, même si la page bouge sans arrêt
  const SAFETY_DELAY = 5000; // ms : réanalyse complète de secours

  /* ---------- Reconnaissance de la mention « Sponsorisé » ---------- */

  // Texte nettoyé : sans accents, sans caractères invisibles ni ponctuation autour, en minuscules.
  const norm = (s) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ​-‏⁠﻿­]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
      .toLowerCase();

  const LABELS = new Set([
    'sponsorise', 'sponsorisee', 'sponsorises', 'sponsorisees', 'sponsored', 'publicite', 'publicites',
    'promoted', 'promu', 'promue', 'promus', 'promues', 'advertisement', 'gesponsert', 'werbung',
    'patrocinado', 'patrocinada', 'publicidad', 'sponsorizzato', 'sponsorizzata', 'pubblicita',
    'ممول', 'إعلان',
  ]);
  const PREFIX = /^(promoted by|promu par|promue par|sponsored by|sponsorise par|sponsorisee par|publicite de|gesponsert von|patrocinado por)( |$)/;

  const isLabelText = (raw, extra) => {
    if (raw.length > 80) return false;
    const t = norm(raw);
    return !!t && (LABELS.has(t) || (!!extra && extra.has(t)) || PREFIX.test(t));
  };

  // Le plus proche ancêtre de `node` qui correspond à `selector`, mais seulement à l'intérieur de `root`.
  const closestWithin = (node, selector, root) => {
    const m = node && node.closest(selector);
    return m && m !== root && root.contains(m) ? m : null;
  };

  // Vrai si le post contient la mention « Sponsorisé » (hors zones écrites par les utilisateurs).
  const hasLabel = (root, opts) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let i = 0, node; i < LABEL_BUDGET && (node = walker.nextNode()); i++) {
      const raw = node.nodeValue;
      if (raw.length > 60 || !raw.trim()) continue;
      let hit = isLabelText(raw, opts.extraSet);
      if (!hit && raw.trim().length <= 2) {
        // Mention éclatée lettre par lettre dans plusieurs <span> : on lit le groupe entier.
        const group = node.parentElement && node.parentElement.parentElement;
        hit = !!group && group !== root && root.contains(group) && group.childElementCount <= 16 &&
          isLabelText(group.textContent, opts.extraSet);
      }
      if (hit && !(opts.ignore && closestWithin(node.parentElement, opts.ignore, root))) return true;
    }
    return false;
  };

  const isAd = (el, rule) => {
    if (rule.adSelector && (el.matches(rule.adSelector) || el.querySelector(rule.adSelector))) return true;
    return !!rule.label && hasLabel(el, rule.label);
  };

  /* ---------- Règles du réseau courant ---------- */

  const valid = (selector) => {
    try {
      document.createDocumentFragment().querySelector(selector);
      return true;
    } catch (e) {
      console.warn('[Bloqueur de pubs] sélecteur ignoré :', selector);
      return false;
    }
  };

  const rules = (site.items || [])
    .filter((item) => valid(item.container) && (!item.adSelector || valid(item.adSelector)))
    .map((item) => ({
      container: item.container,
      adSelector: item.adSelector || '',
      hide: item.hide && valid(item.hide) ? item.hide : '',
      label: item.label
        ? {
            ignore: item.label.ignore && valid(item.label.ignore) ? item.label.ignore : '',
            extraSet: new Set((item.label.extra || []).map(norm)),
          }
        : null,
    }));
  const containerSel = rules.map((r) => r.container).join(',');
  const cssSel = (site.css || []).filter(valid).join(',');
  const cssText = `[${ATTR}]` + (cssSel ? `, :is(${cssSel})` : '') + '{display:none!important}';

  /* ---------- Masquage ---------- */

  let targets = new WeakMap(); // post examiné → élément réellement masqué
  let cssCounted = new WeakSet();
  const checked = new WeakMap(); // post → numéro d'analyse où il a été vérifié pour la dernière fois
  let epoch = 0;
  let newly = 0;

  const hide = (el, rule) => {
    const target = (rule.hide && el.closest(rule.hide)) || el;
    if (!target.hasAttribute(ATTR)) {
      target.setAttribute(ATTR, '');
      newly++;
    }
    targets.set(el, target);
  };

  const unhide = (el) => {
    const target = targets.get(el);
    if (target) target.removeAttribute(ATTR);
    targets.delete(el);
  };

  const report = (n) => bridge.report(n);

  const pass = () => {
    timer = 0;
    if (!running) return;
    newly = 0;
    for (const rule of rules) {
      for (const el of document.querySelectorAll(rule.container)) {
        if (checked.get(el) === epoch) continue;
        checked.set(el, epoch);
        if (isAd(el, rule)) hide(el, rule);
        else if (targets.has(el)) unhide(el); // le contenu a changé : ce n'est plus une pub
      }
    }
    if (cssSel) {
      for (const el of document.querySelectorAll(cssSel)) {
        // Les emplacements vides ne comptent pas comme des pubs masquées.
        if (cssCounted.has(el) || !(el.childElementCount || el.textContent.trim())) continue;
        cssCounted.add(el);
        newly++;
      }
    }
    if (newly) report(newly);
  };

  let timer = 0;
  const schedule = (delay = PASS_DELAY) => {
    if (!timer) timer = setTimeout(pass, delay);
  };

  const onMutations = (records) => {
    if (records.length > 500) {
      epoch++; // trop de changements d'un coup : on revérifie tout plutôt que de les trier
    } else if (containerSel) {
      for (const r of records) {
        const node = r.target.nodeType === 1 ? r.target : r.target.parentElement;
        const post = node && node.closest(containerSel);
        if (post) checked.delete(post); // quelque chose a changé dans ce post : à revérifier
      }
    }
    schedule();
  };

  /* ---------- Pubs vidéo (YouTube) ---------- */

  let adPlayback = null; // { video, muted, rate } : l'état à rétablir quand la pub est finie

  const restorePlayback = () => {
    if (!adPlayback) return;
    const { video, muted, rate } = adPlayback;
    adPlayback = null;
    if (video) {
      video.muted = muted;
      video.playbackRate = rate;
    }
  };

  const skipVideoAd = () => {
    const player = document.querySelector('.html5-video-player.ad-showing');
    if (!player) {
      restorePlayback();
      return;
    }
    const video = player.querySelector('video');
    if (!adPlayback) {
      adPlayback = video ? { video, muted: video.muted, rate: video.playbackRate } : {};
      report(1);
    }
    const skip = player.querySelector(
      '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-container button'
    );
    if (skip) skip.click();
    if (video) {
      video.muted = true;
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.playbackRate = 16;
        video.currentTime = video.duration; // va directement à la fin de la pub
      }
    }
  };

  /* ---------- Feuille de style ---------- */

  // Certains sites interdisent les <style> ajoutés par un script (règle de sécurité « CSP »), ce qui ne
  // gêne pas une extension mais bloquerait la version téléphone. Une feuille « adoptée » n'est pas concernée.
  let sheet = null;
  let style = null;

  const installStyle = () => {
    try {
      if (!sheet) {
        sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
      }
      if (!document.adoptedStyleSheets.includes(sheet)) {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      }
    } catch (e) {
      sheet = null; // navigateur trop ancien : on retombe sur une balise <style>
      if ((!style || !style.isConnected) && document.documentElement) {
        style = document.createElement('style');
        style.textContent = cssText;
        document.documentElement.append(style);
      }
    }
  };

  const removeStyle = () => {
    if (sheet) document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
    if (style) style.remove();
    sheet = style = null;
  };

  /* ---------- Marche / arrêt ---------- */

  let running = false;
  let observer = null;
  let safetyTimer = 0;
  let videoTimer = 0;

  const start = () => {
    if (running) return;
    running = true;
    installStyle();
    observer = new MutationObserver(onMutations);
    observer.observe(document, { childList: true, subtree: true, characterData: true });
    safetyTimer = setInterval(() => {
      installStyle(); // au cas où la page aurait écrasé nos styles
      epoch++;
      schedule();
    }, SAFETY_DELAY);
    if (site.skipVideoAds) videoTimer = setInterval(skipVideoAd, 400);
    schedule(0);
  };

  const stop = () => {
    if (!running) return;
    running = false;
    observer.disconnect();
    clearInterval(safetyTimer);
    clearInterval(videoTimer);
    clearTimeout(timer);
    timer = 0;
    removeStyle();
    for (const el of document.querySelectorAll(`[${ATTR}]`)) el.removeAttribute(ATTR);
    targets = new WeakMap();
    cssCounted = new WeakSet();
    epoch++;
    restorePlayback();
  };

  /* ---------- Réglages ---------- */

  const apply = (settings) => {
    const wanted = settings.enabled !== false && (settings.sites || {})[site.id] !== false;
    if (wanted) start();
    else stop();
  };

  apply(BPR_DEFAULTS); // on démarre tout de suite pour ne pas laisser passer de pub le temps de lire les réglages
  const reload = () => Promise.resolve(bridge.loadSettings()).then(apply);
  reload();
  bridge.onSettingsChange(reload);
}

/*
 * Branche le moteur (engine.js) sur un navigateur de téléphone.
 *
 * Un userscript n'a pas les API d'une extension (pas de fenêtre, pas d'icône avec compteur) :
 *   - les réglages tiennent dans localStorage (une seule option : pause) ;
 *   - une petite pastille sur le bord gauche de l'écran affiche le nombre de pubs masquées
 *     et, quand on la touche, met le bloqueur en pause ou le relance.
 */
const BPR_PAUSE_KEY = 'bpr-paused';

(() => {
  if (!bprFindSite(location.hostname)) return; // pas un réseau pris en charge : rien à faire, pas de pastille

  const listeners = [];
  let count = 0;

  const isPaused = () => {
    try {
      return localStorage.getItem(BPR_PAUSE_KEY) === '1';
    } catch (e) {
      return false; // stockage indisponible : on protège par défaut
    }
  };

  const setPaused = (paused) => {
    try {
      if (paused) localStorage.setItem(BPR_PAUSE_KEY, '1');
      else localStorage.removeItem(BPR_PAUSE_KEY);
    } catch (e) {
      /* la pause ne sera pas retenue d'une page à l'autre, sans gravité */
    }
    listeners.forEach((callback) => callback());
    render();
  };

  /* ---------- La pastille (dans un shadow DOM : le style du site ne peut pas la déformer) ---------- */

  const host = document.createElement('div');
  host.id = 'bpr-pastille';
  const root = host.attachShadow({ mode: 'open' });

  const css =
    ':host{all:initial}' +
    'button{position:fixed;left:env(safe-area-inset-left,0px);top:42%;z-index:2147483647;width:38px;height:46px;' +
    'padding:0;border:0;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;' +
    'border-radius:0 23px 23px 0;background:#2563eb;color:#fff;opacity:.7;cursor:pointer;touch-action:manipulation;' +
    'font:700 12px/1.15 system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;' +
    'justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.35)}' +
    'button.pause{background:#64748b}button:active{opacity:1}' +
    'span{pointer-events:none}.icone{font-size:16px}';
  try {
    const sheet = new CSSStyleSheet(); // une feuille « adoptée » n'est pas bloquée par la CSP des sites
    sheet.replaceSync(css);
    root.adoptedStyleSheets = [sheet];
  } catch (e) {
    const style = document.createElement('style');
    style.textContent = css;
    root.append(style);
  }

  const button = document.createElement('button');
  button.type = 'button';
  const icon = document.createElement('span');
  icon.className = 'icone';
  const label = document.createElement('span');
  button.append(icon, label);
  root.append(button);

  const render = () => {
    const paused = isPaused();
    button.classList.toggle('pause', paused);
    icon.textContent = paused ? '⏸' : '🛡';
    label.textContent = paused ? '' : String(count);
    button.setAttribute(
      'aria-label',
      paused
        ? 'Bloqueur de pubs en pause. Toucher pour le réactiver.'
        : `Bloqueur de pubs actif : ${count} pubs masquées. Toucher pour le mettre en pause.`
    );
  };

  button.addEventListener('click', () => setPaused(!isPaused()));

  // La pastille doit rester même si la page remplace son contenu.
  const attach = () => {
    if (!host.isConnected && document.documentElement) document.documentElement.append(host);
  };
  attach();
  document.addEventListener('DOMContentLoaded', attach);
  setInterval(attach, 2000);
  render();

  /* ---------- Pont vers le moteur ---------- */

  window.addEventListener('storage', (event) => {
    // Une autre page du même site vient de changer la pause.
    if (event.key === BPR_PAUSE_KEY) {
      listeners.forEach((callback) => callback());
      render();
    }
  });

  bprStartEngine({
    loadSettings: () => ({ enabled: !isPaused(), sites: {} }),
    onSettingsChange: (callback) => listeners.push(callback),
    report: (n) => {
      count += n;
      render();
    },
  });
})();
})();
