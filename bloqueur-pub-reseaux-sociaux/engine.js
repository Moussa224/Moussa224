/*
 * Moteur du bloqueur : tourne dans chaque page des réseaux sociaux listés dans sites.js.
 *
 * Il masque (display:none) les pubs au lieu de les supprimer : on ne casse pas la page
 * et on peut tout réafficher d'un clic si l'on désactive le bloqueur.
 * Tout se passe dans le navigateur : rien n'est envoyé nulle part.
 */
(() => {
  'use strict';

  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;
  const site = bprFindSite(location.hostname);
  if (!site) return;

  const ATTR = 'data-bpr-hidden'; // posé sur chaque élément masqué
  const ROOT_ATTR = 'data-bpr-on'; // posé sur <html> tant que le bloqueur est actif
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
  const cssText =
    `html[${ROOT_ATTR}] [${ATTR}]` + (cssSel ? `, html[${ROOT_ATTR}] :is(${cssSel})` : '') + '{display:none!important}';

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

  const report = (n) => {
    try {
      chrome.runtime.sendMessage({ type: 'hidden', n });
    } catch (e) {
      /* l'extension a été rechargée : cette page ne peut plus lui parler, sans gravité */
    }
  };

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

  /* ---------- Marche / arrêt ---------- */

  let running = false;
  let observer = null;
  let style = null;
  let safetyTimer = 0;
  let videoTimer = 0;

  const start = () => {
    if (running) return;
    running = true;
    document.documentElement.setAttribute(ROOT_ATTR, '');
    style = document.createElement('style');
    style.textContent = cssText;
    document.documentElement.append(style);
    observer = new MutationObserver(onMutations);
    observer.observe(document, { childList: true, subtree: true, characterData: true });
    safetyTimer = setInterval(() => {
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
    style.remove();
    document.documentElement.removeAttribute(ROOT_ATTR);
    for (const el of document.querySelectorAll(`[${ATTR}]`)) el.removeAttribute(ATTR);
    targets = new WeakMap();
    cssCounted = new WeakSet();
    epoch++;
    restorePlayback();
  };

  /* ---------- Réglages (fenêtre de l'extension) ---------- */

  const apply = (settings) => {
    const wanted = settings.enabled !== false && (settings.sites || {})[site.id] !== false;
    if (wanted) start();
    else stop();
  };

  apply(BPR_DEFAULTS); // on démarre tout de suite pour ne pas laisser passer de pub le temps de lire les réglages
  const reload = () => chrome.storage.local.get(BPR_DEFAULTS).then(apply);
  reload();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.enabled || changes.sites)) reload();
  });
})();
