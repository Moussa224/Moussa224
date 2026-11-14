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
