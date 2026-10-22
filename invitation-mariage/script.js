/* ==========================================================================
   Invitation de mariage · comportement du site
   Rien à modifier ici : les textes et la date se changent dans contenu.js
   ========================================================================== */
(() => {
  'use strict';

  const S = SITE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  /* ---------- Dates et initiales ---------- */
  const formatDate = (iso) => {
    const txt = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(`${iso}T12:00:00Z`));
    return txt.charAt(0).toUpperCase() + txt.slice(1).replace(/(^|\s)1 (?=\D)/, '$11er ');
  };
  const formatDay = (iso) => formatDate(iso).replace(/^\S+\s/, '');   // sans le nom du jour

  const firstLetter = (s) => (Array.from(String(s).trim())[0] || '').toLocaleUpperCase('fr');
  const initiales = S.initiales || `${firstLetter(S.prenom1)} & ${firstLetter(S.prenom2)}`;

  const weddingTime = new Date(`${S.date}T${S.heure}:00${S.fuseau}`);

  /* ---------- Textes simples ---------- */
  const fillTexts = () => {
    document.title = `${S.prenom1} & ${S.prenom2} · Invitation de mariage`;
    $$('[data-txt]').forEach((el) => {
      const v = get(S, el.dataset.txt);
      if (v != null) el.textContent = v;
    });
    $$('[data-names]').forEach((el) => { el.textContent = `${S.prenom1} & ${S.prenom2}`; });
    $$('[data-date]').forEach((el) => { el.textContent = formatDate(S.date); });
    $$('[data-initiales]').forEach((el) => { el.textContent = initiales; });
    $$('[data-seal]').forEach((el) => { el.textContent = initiales.replace(/\s+/g, ''); });
  };

  /* ---------- Listes générées depuis contenu.js ---------- */
  const renderTimeline = () => {
    $('#timelineList').innerHTML = S.histoire.etapes.map((e, i) => `
      <li class="step">
        <span class="step__dot" aria-hidden="true">${['I', 'II', 'III', 'IV', 'V', 'VI'][i] || i + 1}</span>
        <div class="reveal" style="--d:.15s">
          <p class="step__date">${esc(e.date)}</p>
          <h3 class="step__title">${esc(e.titre)}</h3>
          <p>${esc(e.texte)}</p>
        </div>
      </li>`).join('');
  };

  const renderGallery = () => {
    $('#gallery').innerHTML = S.galerie.photos.slice(0, 6).map((p, i) => `
      <figure class="gitem reveal" style="--ar:${esc(p.format || '4 / 5')}" data-dir="${i % 2 ? -1 : 1}">
        <div class="gdepth"><div class="gframe">
          <img src="${esc(p.src)}" alt="${esc(p.alt || '')}" loading="lazy" decoding="async">
        </div></div>
      </figure>`).join('');
  };

  const renderSchedule = () => {
    $('#schedule').innerHTML = S.programme.moments.map((m, i) => `
      <li class="slot reveal" style="--d:${(i % 3) * 0.12}s">
        <span class="slot__time">${esc(m.heure)}</span>
        <span class="slot__dot" aria-hidden="true"></span>
        <div>
          <h3 class="slot__title">${esc(m.titre)}</h3>
          <p class="slot__text">${esc(m.texte)}</p>
        </div>
      </li>`).join('');
  };

  const renderSwatches = () => {
    const ul = $('#swatches');
    ul.innerHTML = S.tenue.couleurs.slice(0, 3).map((c, i) => `
      <li style="--d:${i * 0.18}s">
        <span class="swatch" style="--c:${esc(c.hex)}" role="img" aria-label="${esc(c.nom)}"></span>
        <span class="swatch-name">${esc(c.nom)}</span>
      </li>`).join('');
    ul.classList.add('reveal-group');
  };

  const setupVenue = () => {
    const l = S.lieu;
    const query = [l.salle, l.adresse, l.ville].filter(Boolean).join(', ');
    $('#mapFrame').src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&hl=fr&output=embed`;
    $('#routeBtn').href = l.lienItineraire
      || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  };

  const setupRsvp = () => {
    $('#rsvpBtn').href = S.rsvp.lienFormulaire;
    $('#rsvpDeadline').textContent = `${S.rsvp.prefixeDateLimite} ${formatDay(S.rsvp.dateLimite)}`;
  };

  /* ---------- Compte à rebours ---------- */
  const setupCountdown = () => {
    const box = $('#countdown');
    const done = $('#countdownDone');
    const cells = { d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
    const pad = (n) => String(n).padStart(2, '0');
    let timer;

    const tick = () => {
      const diff = weddingTime - Date.now();
      if (!(diff > 0)) {
        box.hidden = true; done.hidden = false; $('.countdown__title').hidden = true;
        clearInterval(timer);
        return;
      }
      const t = Math.floor(diff / 1000);
      cells.d.textContent = pad(Math.floor(t / 86400));
      cells.h.textContent = pad(Math.floor((t % 86400) / 3600));
      cells.m.textContent = pad(Math.floor((t % 3600) / 60));
      cells.s.textContent = pad(t % 60);
    };
    tick();
    timer = setInterval(tick, 1000);
  };

  /* ---------- Titres mot par mot ---------- */
  const splitWords = () => {
    $$('.split').forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(' ');
    });
  };

  /* ---------- Apparition au défilement ---------- */
  const startReveals = () => {
    const targets = $$('.reveal, .split, .reveal-group');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => io.observe(el));
  };

  /* ---------- Effets liés au défilement (ligne d'histoire + profondeur galerie) ---------- */
  const setupScrollEffects = () => {
    const timeline = $('#timeline');
    const track = $('.timeline__track');
    const line = $('.timeline__line');
    const tip = $('.timeline__tip');
    const steps = $$('.step');
    const items = $$('.gitem').map((el) => ({
      el,
      depth: $('.gdepth', el),
      frame: $('.gframe', el),
      dir: Number(el.dataset.dir) || 1
    }));

    let span = { top: 0, height: 1 };

    const measureTimeline = () => {
      const dots = $$('.step__dot');
      if (dots.length < 2) return;
      // Position du centre d'un rond, mesurée depuis le haut de la timeline
      const centerY = (dot) => dot.getBoundingClientRect().top + dot.offsetHeight / 2 - timeline.getBoundingClientRect().top;
      const top = centerY(dots[0]);
      const bottom = centerY(dots[dots.length - 1]);
      span = { top, height: Math.max(1, bottom - top) };
      [track, line].forEach((el) => { el.style.top = `${span.top}px`; el.style.height = `${span.height}px`; });
    };

    const updateTimeline = () => {
      const rect = timeline.getBoundingClientRect();
      const ref = window.innerHeight * 0.62;                  // repère de lecture à l'écran
      const p = clamp((ref - (rect.top + span.top)) / span.height, 0, 1);
      line.style.setProperty('--p', p.toFixed(4));
      tip.style.top = `${span.top + span.height * p}px`;
      timeline.classList.toggle('is-drawing', p > 0 && p < 1);
      steps.forEach((step) => {
        const dot = step.firstElementChild.getBoundingClientRect();
        step.classList.toggle('is-active', dot.top + dot.height / 2 <= ref);
      });
    };

    const updateGallery = () => {
      const vh = window.innerHeight;
      items.forEach(({ el, depth, frame, dir }) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        const t = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
        depth.style.setProperty('--fy', `${(t * dir * 26).toFixed(1)}px`);
        frame.style.setProperty('--iy', `${(-t * r.height * 0.075).toFixed(1)}px`);
      });
    };

    let queued = false;
    const update = () => {
      queued = false;
      updateTimeline();
      if (!reduceMotion) updateGallery();
    };
    const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    const remeasure = () => { measureTimeline(); request(); };

    measureTimeline();
    update();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(timeline);
  };

  /* ---------- Ouverture de l'enveloppe ---------- */
  const setupIntro = () => {
    const intro = $('#intro');
    const site = $('#site');
    const btn = $('#openBtn');
    const envelope = $('#envelope');
    let opened = false;

    // On affiche l'enveloppe quand les polices sont prêtes (au plus 1,5 s d'attente).
    const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))])
      .then(() => requestAnimationFrame(() => intro.classList.add('is-ready')));

    const showSite = () => {
      document.documentElement.classList.remove('is-locked');
      document.body.classList.remove('is-locked');
      document.body.classList.add('site-visible');
      intro.classList.add('is-done');
      startReveals();
      site.focus({ preventScroll: true });
      setTimeout(() => intro.remove(), 2000);
    };

    const open = () => {
      if (opened) return;
      opened = true;
      btn.disabled = true;
      if (reduceMotion) {
        intro.classList.add('is-ready');
        showSite();
        return;
      }
      intro.classList.add('is-opening');            // cachet, rabat, carte
      setTimeout(() => intro.classList.add('is-reveal'), 2600);   // la carte se centre
      setTimeout(showSite, 3500);                    // le site apparaît en fondu
    };

    btn.addEventListener('click', open);
    envelope.addEventListener('click', open);
  };

  /* ---------- Démarrage ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  fillTexts();
  renderTimeline();
  renderGallery();
  renderSchedule();
  renderSwatches();
  setupVenue();
  setupRsvp();
  splitWords();
  setupCountdown();
  setupScrollEffects();
  setupIntro();
})();
