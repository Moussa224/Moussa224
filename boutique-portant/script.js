/* ==========================================================================
   Boutique · comportement du site
   Rien à modifier ici : les pièces et les textes se changent dans contenu.js
   ========================================================================== */
(() => {
  'use strict';

  const B = BOUTIQUE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  /* ---------- Réservation : e-mail ou WhatsApp ---------- */
  const lienReservation = (piece, taille) => {
    const msg = piece
      ? `Bonjour, je souhaite réserver : ${piece.nom}${taille ? `, taille ${taille}` : ''}.`
      : 'Bonjour, j\'ai une question sur la collection.';
    const wa = String(B.contact.whatsapp || '').replace(/\D/g, '');
    if (wa) return { href: `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, externe: true };
    const sujet = piece ? `Réservation · ${piece.nom}` : 'Question sur la collection';
    return { href: `mailto:${B.contact.email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(msg)}`, externe: false };
  };

  const enStock = (p) => p.tailles.filter((t) => !(p.rupture || []).includes(t));

  /* ---------- Textes simples ---------- */
  const fillTexts = () => {
    document.title = `${B.marque} · Collection`;
    $$('[data-txt]').forEach((el) => {
      const v = get(B, el.dataset.txt);
      if (v != null) el.textContent = v;
    });
    $$('[data-logo]').forEach((el) => {
      el.textContent = B.marque;
      if (!B.logoImage) return;
      el.classList.add('logo--image');
      el.innerHTML = `<img src="${esc(B.logoImage)}" alt="${esc(B.marque)}">`;
      // Image introuvable : on revient au nom écrit
      $('img', el).addEventListener('error', () => {
        el.classList.remove('logo--image');
        el.textContent = B.marque;
      }, { once: true });
    });
    $$('[data-contact]').forEach((el) => { el.href = lienReservation(null).href; });
    $('#aproposTexte').innerHTML = B.apropos.texte.map((t) => `<p>${esc(t)}</p>`).join('');
  };

  /* ==========================================================================
     Dessin des vêtements (SVG généré, aucune photo nécessaire)
     ========================================================================== */

  /* ---------- Couleurs ---------- */
  const rgb = (c) => {
    let h = c.replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const hex = (v) => `#${v.map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('')}`;
  const mix = (a, b, t) => { const B2 = rgb(b); return hex(rgb(a).map((x, i) => x + (B2[i] - x) * t)); };
  const sombre = (c, t) => mix(c, '#000000', t);
  const clair = (c, t) => mix(c, '#ffffff', t);
  const luminance = (c) => { const [r, g, b] = rgb(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

  /* Hasard reproductible : un vêtement garde les mêmes plis et les mêmes trous à chaque visite. */
  const hasard = (graine) => () => {
    graine = (graine + 0x6D2B79F5) | 0;
    let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const n1 = (x) => x.toFixed(1);

  /* ---------- Les formes. Chacune rend : d = contours, dedans = remplissage ---------- */
  const COUTURE = 'stroke-linecap="round" stroke-linejoin="round" fill="none"';

  const ourlet = (x1, x2, y, use, rnd) => {
    if (!use) return `Q${n1((x1 + x2) / 2)},${y + 5} ${x2},${y}`;
    const pts = [];
    for (let k = 1; k <= 18; k++) pts.push(`L${n1(x1 + ((x2 - x1) * k) / 18)},${n1(y + (rnd() - 0.4) * 7)}`);
    return pts.join(' ');
  };

  const contourTee = (col) => `M84,50 ${col === 'v' ? 'L100,76 L116,50' : 'Q100,68 116,50'} L146,60 L184,98 L166,120 L148,100 L148,238 Q100,243 52,238 L52,100 L34,120 L16,98 L54,60 Z`;

  const formes = {
    tee: (p, c) => ({
      d: [contourTee('rond'), 'M84,50 Q100,43 116,50 Q100,68 84,50 Z'],
      dedans: `
        <rect width="200" height="270" fill="${p.couleur}"/>
        <path d="M84,50 Q100,43 116,50 Q100,68 84,50 Z" fill="${sombre(p.couleur, 0.4)}"/>
        <path d="M84,50 Q100,68 116,50" ${COUTURE} stroke="${p.accent}" stroke-width="3.4"/>
        <path d="M54,60 Q49,82 52,100 M146,60 Q151,82 148,100" ${COUTURE} stroke="${c.trait}" stroke-width="1.2"/>
        <path d="M52,230 Q100,235 148,230" ${COUTURE} stroke="${c.trait}" stroke-width="1" stroke-dasharray="3 2.4"/>`,
      texteY: 124
    }),

    maillot: (p, c) => ({
      d: [contourTee('v'), 'M84,50 Q100,44 116,50 L100,76 Z'],
      dedans: `
        <rect width="200" height="270" fill="${p.couleur}"/>
        <rect x="30" y="96" width="38" height="160" fill="${p.accent}"/>
        <rect x="132" y="96" width="38" height="160" fill="${p.accent}"/>
        <path d="M179,93 L161,115 M21,93 L39,115" ${COUTURE} stroke="${p.accent}" stroke-width="6.5"/>
        <path d="M84,50 Q100,44 116,50 L100,76 Z" fill="${sombre(p.couleur, 0.45)}"/>
        <path d="M84,50 L100,76 L116,50" ${COUTURE} stroke="${p.accent}" stroke-width="4.4"/>
        <path d="M54,60 Q49,82 52,100 M146,60 Q151,82 148,100" ${COUTURE} stroke="${c.trait}" stroke-width="1.2"/>`,
      texteY: 128
    }),

    debardeur: (p, c, rnd) => {
      const bas = ourlet(153, 47, 238, p.use, rnd);
      return {
        d: [`M80,50 Q100,72 120,50 L136,52 Q141,98 153,106 L153,238 ${bas} L47,106 Q59,98 64,52 Z`, 'M80,50 Q100,43 120,50 Q100,72 80,50 Z'],
        dedans: `
          <rect width="200" height="270" fill="${p.couleur}"/>
          <path d="M80,50 Q100,43 120,50 Q100,72 80,50 Z" fill="${sombre(p.couleur, 0.4)}"/>
          <path d="M80,50 Q100,72 120,50" ${COUTURE} stroke="${p.accent}" stroke-width="3"/>
          <path d="M136,52 Q141,98 153,106 M64,52 Q59,98 47,106" ${COUTURE} stroke="${c.trait}" stroke-width="1.6"/>`,
        texteY: 130
      };
    },

    veste: (p, c) => {
      const rib = clair(p.couleur, 0.16);
      return {
        d: [
          'M82,48 Q100,60 118,48 L144,58 L147,104 L149,238 L51,238 L53,104 L56,58 Z',
          'M144,58 L170,68 Q180,74 182,112 L190,214 L162,220 L148,112 Z',
          'M56,58 L30,68 Q20,74 18,112 L10,214 L38,220 L52,112 Z',
          'M80,52 Q100,64 120,52 L118,40 Q100,50 82,40 Z'
        ],
        dedans: `
          <rect width="200" height="270" fill="${p.couleur}"/>
          <path d="M144,58 L170,68 Q180,74 182,112 L190,214 L162,220 L148,112 Z" fill="${p.accent}"/>
          <path d="M56,58 L30,68 Q20,74 18,112 L10,214 L38,220 L52,112 Z" fill="${p.accent}"/>
          <path d="M80,52 Q100,64 120,52 L118,40 Q100,50 82,40 Z" fill="${rib}"/>
          <path d="M81,46 Q100,57 119,46" ${COUTURE} stroke="${p.accent}" stroke-width="1.6"/>
          <polygon points="189,200 161,206 162,220 190,214" fill="${rib}"/>
          <polygon points="11,200 39,206 38,220 10,214" fill="${rib}"/>
          <path d="M189.5,207 L161.5,213 M10.5,207 L38.5,213" ${COUTURE} stroke="${p.accent}" stroke-width="2"/>
          <rect x="40" y="226" width="120" height="14" fill="${rib}"/>
          <path d="M40,231 H160" ${COUTURE} stroke="${p.accent}" stroke-width="1.8"/>
          <path d="M148,112 L147,58 M52,112 L53,58" ${COUTURE} stroke="${c.trait}" stroke-width="1.4"/>
          <path d="M64,176 L82,172 M136,176 L118,172" ${COUTURE} stroke="${c.trait}" stroke-width="1.8"/>
          ${[72, 98, 124, 150, 176, 202].map((y) => `<circle cx="100" cy="${y}" r="2.3" fill="${clair(p.couleur, 0.32)}"/>`).join('')}`,
        texteY: 98,
        texteX: 126,
        texteTaille: 8
      };
    }
  };

  /* ---------- Éléments communs : cintre, trous, plis, texte ---------- */
  const cintre = `
    <path d="M26,60 L100,30 L174,60" ${COUTURE} stroke="#B38E5B" stroke-width="4.6"/>
    <path d="M26,58.4 L100,28.4 L174,58.4" ${COUTURE} stroke="#E2C595" stroke-width="1.2" opacity=".75"/>
    <path d="M100,32 V16 M100,16 a6.5,6.5 0 1 1 6.5,-6.5" ${COUTURE} stroke="#B8733A" stroke-width="2.7"/>`;

  const trous = (rnd) => {
    let s = '';
    for (let k = 0; k < 34; k++) {
      const x = 54 + rnd() * 92;
      const y = rnd() < 0.62 ? 62 + rnd() * 92 : 150 + rnd() * 92;
      const r = 0.8 + rnd() * 2.4;
      s += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(r)}" ry="${n1(r * (0.45 + rnd() * 0.6))}" transform="rotate(${n1(rnd() * 180)} ${n1(x)} ${n1(y)})"/>`;
    }
    for (let k = 0; k < 9; k++) {
      const x = 50 + rnd() * 100;
      s += `<circle cx="${n1(x)}" cy="${n1(236 + rnd() * 5)}" r="${n1(1.6 + rnd() * 3)}"/>`;
    }
    for (let k = 0; k < 3; k++) {
      const x = 62 + rnd() * 76;
      const y = 84 + rnd() * 90;
      s += `<path d="M${n1(x)},${n1(y)} l${n1(5 + rnd() * 5)},${n1(-2 + rnd() * 4)} l${n1(-1 + rnd() * 3)},${n1(3 + rnd() * 3)} l${n1(-4 - rnd() * 4)},${n1(-1 + rnd() * 3)} Z"/>`;
    }
    return s;
  };

  const plis = (rnd) => [0, 1, 2].map(() => {
    const x = 62 + rnd() * 76;
    const dx = (rnd() - 0.5) * 14;
    return `<path d="M${n1(x)},${n1(104 + rnd() * 20)} Q${n1(x + dx)},170 ${n1(x + dx * 1.6)},${n1(226 + rnd() * 8)}" ${COUTURE} stroke="#000" stroke-opacity=".08" stroke-width="2.4"/>`;
  }).join('');

  const texteImprime = (p, f) => {
    if (!p.texte) return '';
    const taille = f.texteTaille || Math.min(17, 92 / (p.texte.length * 0.68));
    const clairSurSombre = luminance(p.couleur) < 0.55;
    const encre = clairSurSombre ? clair(p.couleur, 0.86) : sombre(p.couleur, 0.72);
    return `<text x="${f.texteX || 100}" y="${f.texteY}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="${n1(taille)}" letter-spacing=".6" fill="${encre}" fill-opacity=".92">${esc(p.texte)}</text>`;
  };

  const dessiner = (p, i) => {
    const id = `v${i}`;
    const rnd = hasard(i * 977 + 31);
    const trait = clair(sombre(p.couleur, 0.25), 0.04);
    const f = (formes[p.forme] || formes.tee)(p, { trait }, rnd);
    const ombre = luminance(p.couleur) > 0.8 ? '.14' : '.22';
    const masque = p.use ? `
      <mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="270">
        <rect width="200" height="270" fill="#fff"/><g fill="#000">${trous(rnd)}</g>
      </mask>` : '';
    const delavage = p.use ? `
      <ellipse cx="100" cy="118" rx="62" ry="70" fill="url(#${id}-w)"/>
      <ellipse cx="72" cy="200" rx="34" ry="38" fill="url(#${id}-w)" opacity=".7"/>` : '';
    const degradeDelavage = p.use ? `
      <radialGradient id="${id}-w">
        <stop offset="0" stop-color="${clair(p.couleur, 0.3)}" stop-opacity=".55"/>
        <stop offset="1" stop-color="${clair(p.couleur, 0.3)}" stop-opacity="0"/>
      </radialGradient>` : '';

    return `
      <svg class="cintre__svg" viewBox="0 0 200 270" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="${id}-c">${f.d.map((d) => `<path d="${d}"/>`).join('')}</clipPath>
          <linearGradient id="${id}-o" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stop-color="#000" stop-opacity="${ombre}"/>
            <stop offset=".18" stop-color="#000" stop-opacity="0"/>
            <stop offset=".5" stop-color="#fff" stop-opacity=".08"/>
            <stop offset=".82" stop-color="#000" stop-opacity="0"/>
            <stop offset="1" stop-color="#000" stop-opacity="${ombre}"/>
          </linearGradient>${degradeDelavage}${masque}
        </defs>
        ${cintre}
        <g${p.use ? ` mask="url(#${id}-m)"` : ''}>
          <g clip-path="url(#${id}-c)">
            ${f.dedans}
            ${delavage}
            <rect width="200" height="270" fill="url(#${id}-o)"/>
            ${plis(rnd)}
            ${texteImprime(p, f)}
          </g>
          ${f.d.map((d) => `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="1.3" stroke-linejoin="round"/>`).join('')}
        </g>
      </svg>`;
  };

  /* ==========================================================================
     Le portant
     ========================================================================== */
  const portant = $('#portant');
  const defile = $('#defile');
  const piste = $('#piste');
  const pieces = B.pieces;

  const corps = (p, i) => (p.photo
    ? `<img class="cintre__photo" src="${esc(p.photo)}" alt="" draggable="false">`
    : dessiner(p, i));

  piste.insertAdjacentHTML('beforeend', pieces.map((p, i) => `
    <button class="cintre" type="button" data-i="${i}" style="--i:${i}"
            aria-label="${esc(p.nom)}, ${esc(p.prix)}">
      <span class="cintre__corps">${corps(p, i)}</span>
      <span class="cintre__etiquette" aria-hidden="true">${esc(p.nom)}</span>
    </button>`).join(''));

  /* Photo introuvable : on garde le dessin plutôt qu'un trou sur le portant */
  $$('.cintre__photo', piste).forEach((img) => img.addEventListener('error', () => {
    const i = Number(img.closest('.cintre').dataset.i);
    img.outerHTML = dessiner(pieces[i], i);
  }, { once: true }));

  const slots = $$('.cintre', piste);
  let actif = -1;

  const legende = () => {
    const p = pieces[actif];
    const n = enStock(p).length;
    $('#legendeNom').textContent = p.nom;
    $('#legendeDetail').textContent = [
      p.prix,
      n ? `${n} taille${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}` : 'Épuisé'
    ].join(' · ');
  };

  /* ---------- Défilement : une pièce centrée = la pièce active ---------- */
  let auto = false;
  let finAuto = 0;

  const centrerSur = (i, doux = true) => {
    const s = slots[i];
    const r = s.getBoundingClientRect();
    const d = defile.getBoundingClientRect();
    const cible = defile.scrollLeft + (r.left + r.width / 2) - (d.left + d.width / 2);
    if (Math.abs(cible - defile.scrollLeft) < 2) return;
    auto = true;
    clearTimeout(finAuto);
    finAuto = setTimeout(() => { auto = false; }, 800);
    defile.scrollTo({ left: cible, behavior: doux && !reduceMotion ? 'smooth' : 'auto' });
  };

  const activer = (i, { centrer = true, elan = true } = {}) => {
    if (i === actif) return;
    const ancien = actif;
    const sens = i > ancien ? 1 : -1;
    actif = i;
    slots.forEach((s, k) => {
      s.classList.toggle('est-actif', k === i);
      if (k === i) s.setAttribute('aria-current', 'true'); else s.removeAttribute('aria-current');
    });
    legende();
    if (centrer) centrerSur(i, ancien >= 0);
    if (elan && ancien >= 0) {
      pousser(i, -sens * 38);
      pousser(ancien, sens * 26);
    }
  };

  /* ---------- Les pièces se balancent comme de vrais cintres ---------- */
  const RAIDEUR = 38;
  const AMORTI = 2.4;
  const pendules = slots.map((s) => ({ el: $('.cintre__corps', s), a: 0, v: 0 }));
  let raf = 0;
  let avant = 0;

  const boucle = (t) => {
    const dt = Math.min(0.034, (t - avant) / 1000);
    avant = t;
    let vivant = false;
    pendules.forEach((p) => {
      p.v += (-RAIDEUR * p.a - AMORTI * p.v) * dt;
      p.a = clamp(p.a + p.v * dt, -26, 26);
      if (Math.abs(p.a) < 0.03 && Math.abs(p.v) < 0.2) p.a = p.v = 0; else vivant = true;
      p.el.style.transform = p.a ? `rotate(${p.a.toFixed(2)}deg)` : '';
    });
    raf = vivant ? requestAnimationFrame(boucle) : 0;
  };

  function pousser(i, force) {
    const p = pendules[i];
    if (!p || reduceMotion) return;
    p.v = clamp(p.v + force, -150, 150);
    if (!raf) { avant = performance.now(); raf = requestAnimationFrame(boucle); }
  }

  /* La souris qui passe devant le portant fait osciller les pièces */
  let sourisX = null;
  portant.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const dx = sourisX == null ? 0 : clamp(e.clientX - sourisX, -40, 40);
    sourisX = e.clientX;
    if (!dx) return;
    slots.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (e.clientY < r.top - 10 || e.clientY > r.bottom + 10) return;
      const proche = Math.max(0, 1 - Math.abs(e.clientX - (r.left + r.width / 2)) / (r.width * 0.9));
      if (proche) pousser(i, -dx * proche * 1.4);
    });
  });
  portant.addEventListener('pointerleave', () => { sourisX = null; });

  /* Le défilement au doigt les fait osciller aussi, puis choisit la pièce centrée */
  let dernierX = defile.scrollLeft;
  let rafScroll = 0;
  defile.addEventListener('scroll', () => {
    const dx = clamp(defile.scrollLeft - dernierX, -40, 40);
    dernierX = defile.scrollLeft;
    if (dx) slots.forEach((_, i) => pousser(i, -dx * 0.8));
    if (auto || rafScroll) return;
    rafScroll = requestAnimationFrame(() => {
      rafScroll = 0;
      const d = defile.getBoundingClientRect();
      const milieu = d.left + d.width / 2;
      let meilleur = 0;
      let ecart = Infinity;
      slots.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const e = Math.abs(r.left + r.width / 2 - milieu);
        if (e < ecart) { ecart = e; meilleur = i; }
      });
      activer(meilleur, { centrer: false });
    });
  }, { passive: true });

  piste.addEventListener('click', (e) => {
    const s = e.target.closest('.cintre');
    if (!s) return;
    const i = Number(s.dataset.i);
    if (i === actif) ouvrirDispo(); else activer(i);
  });

  piste.addEventListener('keydown', (e) => {
    const sens = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!sens) return;
    e.preventDefault();
    const n = clamp(actif + sens, 0, slots.length - 1);
    activer(n);
    slots[n].focus({ preventScroll: true });
  });

  /* ==========================================================================
     Fenêtres : disponibilité et à propos
     ========================================================================== */
  const dialogDispo = $('#dialogDispo');
  const zoneTailles = $('#dispoTailles');
  const cta = $('#dispoCta');
  let tailleChoisie = null;

  const majReservation = () => {
    const p = pieces[actif];
    const { href, externe } = lienReservation(p, tailleChoisie);
    cta.href = href;
    cta.target = externe ? '_blank' : '_self';
    $$('.taille', zoneTailles).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === tailleChoisie)));
  };

  function ouvrirDispo() {
    const p = pieces[actif];
    const stock = enStock(p);
    tailleChoisie = stock[0] || null;

    $('#dispoNumero').textContent = `Pièce ${String(actif + 1).padStart(2, '0')} / ${String(pieces.length).padStart(2, '0')}`;
    $('#dispoTitre').textContent = p.nom;
    $('#dispoPrix').textContent = p.prix;
    zoneTailles.innerHTML = p.tailles.map((t) => {
      const rupture = (p.rupture || []).includes(t);
      return `<button class="taille" type="button" data-t="${esc(t)}" aria-pressed="false"${rupture ? ' disabled' : ''}>${esc(t)}</button>`;
    }).join('');

    cta.hidden = !stock.length;
    cta.textContent = 'Réserver cette pièce';
    $('#dispoNote').textContent = stock.length
      ? 'Série limitée · vous serez recontacté pour confirmer votre commande.'
      : 'Cette pièce est épuisée pour le moment.';
    if (stock.length) majReservation();
    dialogDispo.showModal();
  }

  zoneTailles.addEventListener('click', (e) => {
    const b = e.target.closest('.taille');
    if (!b || b.disabled) return;
    tailleChoisie = b.dataset.t;
    majReservation();
  });

  $('#boutonDispo').addEventListener('click', ouvrirDispo);
  $$('[data-ouvrir]').forEach((b) => b.addEventListener('click', () => $(`#${b.dataset.ouvrir}`).showModal()));

  /* Un clic en dehors de la fenêtre la ferme */
  $$('.dialogue').forEach((dlg) => dlg.addEventListener('click', (e) => {
    const r = dlg.getBoundingClientRect();
    const dedans = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!dedans) dlg.close();
  }));

  /* ==========================================================================
     Démarrage
     ========================================================================== */
  fillTexts();
  activer(Math.floor(pieces.length / 2), { centrer: true, elan: false });

  if (!reduceMotion) {
    slots.forEach((_, i) => setTimeout(() => pousser(i, (i % 2 ? 1 : -1) * 46), 650 + i * 70));
  }
})();
