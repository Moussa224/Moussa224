/*
 * Fausses pages qui reproduisent la structure de chaque réseau (celle que sites.js cherche).
 * Chaque post porte data-t="ad" (doit être masqué) ou data-t="organic" (doit rester visible).
 *
 * Attention : ce sont des maquettes écrites à partir de la structure connue des sites,
 * pas les vrais sites. Elles prouvent que le moteur applique bien les règles, pas que les
 * réseaux n'ont pas changé leur code depuis.
 */

const html = (body) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>maquette</title></head><body>${body}</body></html>`;

// Image servie par une régie publicitaire : sert à vérifier le blocage réseau.
const AD_PIXEL = '<img id="pixel" src="https://pagead2.googlesyndication.com/pagead/test.gif" width="1" height="1" alt="">';

const mocks = {
  facebook: {
    url: 'https://www.facebook.com/',
    page: html(`
      <div role="feed" id="feed">
        <div><div role="article" data-t="organic">
          <h3>Marie</h3><span>Il y a 2 h</span>
          <div data-ad-comet-preview="message">Ce produit n'est pas sponsorisé</div>
          <div role="article"><span>Publicité</span></div>
        </div></div>
        <div><div role="article" data-t="ad">
          <h3>Boutique</h3><a href="/ads/about/?id=1">lien</a><div>Achetez maintenant</div>
        </div></div>
        <div><div role="article" data-t="ad">
          <h3>Autre boutique</h3>
          <span><span>S</span><span>p</span><span>o</span><span>n</span><span>s</span><span>o</span><span>r</span><span>i</span><span>s</span><span>é</span></span>
        </div></div>
        <div><div role="article" data-t="organic"><h3>Paul</h3><div data-ad-comet-preview="message">Sponsorisé</div></div></div>
      </div>${AD_PIXEL}`),
    // Ajoute un post publicitaire comme le ferait le défilement infini.
    addAd: `document.getElementById('feed').insertAdjacentHTML('beforeend',
      '<div><div role="article" data-t="ad-late"><h3>Nouveau</h3><span>Sponsorisé</span></div></div>')`,
    // Ajoute d'abord un post sans mention, puis la mention arrive plus tard (chargement progressif).
    addLazyAd: `const d = document.createElement('div');
      d.innerHTML = '<div role="article" data-t="ad-lazy"><h3>Lent</h3><span id="lazy"></span></div>';
      document.getElementById('feed').append(d);
      setTimeout(() => { document.getElementById('lazy').textContent = 'Sponsored'; }, 700);`,
  },

  instagram: {
    url: 'https://www.instagram.com/',
    page: html(`
      <main>
        <article data-t="organic"><header><span>lea</span></header>
          <ul><li><span>Publicité</span></li></ul></article>
        <article data-t="ad"><header><span>marque</span><span>Sponsorisé</span></header></article>
        <article data-t="ad"><header><span>marque2</span><span>Sponsored</span><span> · </span></header></article>
        <article data-t="organic"><header><span>omar</span></header><span>Une belle journée</span></article>
      </main>`),
  },

  x: {
    url: 'https://x.com/home',
    page: html(`
      <div>
        <div data-testid="cellInnerDiv"><article data-t="organic">
          <div data-testid="User-Name"><span>Alice</span><span>@alice</span><span>·</span><span>2h</span></div>
          <div data-testid="tweetText">Ad</div></article></div>
        <div data-testid="cellInnerDiv"><article data-t="ad">
          <div data-testid="User-Name"><span>Shop</span><span>@shop</span><span>·</span><span>Ad</span></div>
          <div data-testid="tweetText">Promo</div></article></div>
        <div data-testid="cellInnerDiv"><article data-t="ad">
          <div data-testid="User-Name"><span>Shop FR</span><span>@shopfr</span><span>·</span><span>Sponsorisé</span></div></article></div>
        <div data-testid="cellInnerDiv"><div data-testid="trend" data-t="ad"><span>Promoted by Marque</span></div></div>
        <div data-testid="cellInnerDiv"><div data-testid="trend" data-t="organic"><span>#Football</span></div></div>
      </div>`),
  },

  youtube: {
    url: 'https://www.youtube.com/',
    page: html(`
      <ytd-rich-item-renderer data-t="organic"><div>Une vidéo</div></ytd-rich-item-renderer>
      <ytd-rich-item-renderer data-t="ad"><ytd-ad-slot-renderer><div>Pub</div></ytd-ad-slot-renderer></ytd-rich-item-renderer>
      <div id="masthead-ad" data-t="ad"><div>Bannière</div></div>
      <div class="html5-video-player" id="player"><video id="v" src="/video-2s.webm" preload="auto"></video>
        <button class="ytp-skip-ad-button" style="display:none" onclick="window.__skipped = (window.__skipped || 0) + 1">Passer</button>
      </div>${AD_PIXEL}`),
    // Simule le début d'une pub vidéo : classe ad-showing + bouton « Passer » affiché.
    startVideoAd: `document.querySelector('.ytp-skip-ad-button').style.display = 'block';
      document.getElementById('player').classList.add('ad-showing');`,
    endVideoAd: `document.getElementById('player').classList.remove('ad-showing');`,
  },

  tiktok: {
    url: 'https://www.tiktok.com/foryou',
    page: html(`
      <div>
        <article data-scroll-index="0" data-t="organic"><div data-e2e="video-desc">Sponsorisé</div></article>
        <article data-scroll-index="1" data-t="ad"><span>Sponsorisé</span></article>
        <article data-scroll-index="2" data-t="organic"><div data-e2e="video-desc">Ma danse</div></article>
      </div>`),
  },

  linkedin: {
    url: 'https://www.linkedin.com/feed/',
    page: html(`
      <div>
        <div class="feed-shared-update-v2" data-t="organic"><div class="update-components-text">Promoted</div></div>
        <div class="feed-shared-update-v2" data-t="ad"><div class="update-components-actor"><span>Promoted</span></div></div>
        <div class="feed-shared-update-v2" data-t="ad"><div class="update-components-actor"><span>Sponsorisé</span></div></div>
        <div class="ad-banner-container" data-t="ad"><div>Bannière</div></div>
      </div>`),
  },

  reddit: {
    url: 'https://www.reddit.com/',
    page: html(`
      <div>
        <shreddit-post data-t="organic"><div>Un sujet</div></shreddit-post>
        <shreddit-ad-post data-t="ad"><div>Promoted</div></shreddit-ad-post>
        <div class="promotedlink" data-t="ad"><div>Pub</div></div>
      </div>`),
  },

  pinterest: {
    url: 'https://www.pinterest.com/',
    page: html(`
      <div>
        <div data-grid-item="true" data-t="organic"><div>Recette de gâteau</div></div>
        <div data-grid-item="true" data-t="ad"><div>Promu par Marque</div></div>
        <div data-grid-item="true" data-t="ad"><div>Sponsorisé</div></div>
      </div>`),
  },
};

module.exports = { mocks };
