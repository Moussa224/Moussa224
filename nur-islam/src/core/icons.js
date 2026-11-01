// Sprite SVG inline : un seul <svg> caché, référencé par <use href="#i-…">.
const S = (id, body, vb = '0 0 24 24') => `<symbol id="i-${id}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</symbol>`;

const sprite = [
  S('star8', '<path d="M10 10h28v28H10z"/><path d="M24 3l21 21-21 21L3 24z"/>', '0 0 48 48'),
  S('home', '<path d="M12 2.5c0 1.7-1.3 2.4-1.3 3.7 0 .7.6 1.1 1.3 1.1s1.3-.4 1.3-1.1C13.3 4.9 12 4.2 12 2.5z"/><path d="M5 20.5v-7.2a7 7 0 0 1 14 0v7.2M3 20.5h18M10 20.5v-4a2 2 0 0 1 4 0v4"/>'),
  S('clock', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>'),
  S('book', '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>'),
  S('grid', '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
  S('sliders', '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  S('compass', '<circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z"/>'),
  S('beads', '<circle cx="12" cy="5" r="2"/><circle cx="18" cy="9" r="2"/><circle cx="18" cy="15" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="6" cy="15" r="2"/><circle cx="6" cy="9" r="2"/>'),
  S('moon', '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'),
  S('scroll', '<path d="M8 4h10v14a2 2 0 0 1-2 2H6a2 2 0 0 0 2-2zM8 4a2 2 0 0 0-2 2v2h2M11 9h4M11 13h4"/>'),
  S('calc', '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>'),
  S('cal', '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  S('quiz', '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.2.9-1.2 1.7M12 17h.01"/>'),
  S('kaaba', '<path d="M4 8l8-3 8 3v10l-8 3-8-3z"/><path d="M4 8l8 3 8-3M12 11v10"/>'),
  S('heart', '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  S('play', '<path d="M8 5v14l11-7z" fill="currentColor"/>'),
  S('pause', '<path d="M8 5v14M16 5v14" stroke-width="3"/>'),
  S('bookmark', '<path d="M7 4h10v16l-5-4-5 4z"/>'),
  S('copy', '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  S('share', '<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="m8.2 10.8 6.6-3.6M8.2 13.2l6.6 3.6"/>'),
  S('search', '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
  S('back', '<path d="M15 5l-7 7 7 7"/>'),
  S('next', '<path d="M9 5l7 7-7 7"/>'),
  S('check', '<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  S('pin', '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
  S('sun', '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
  S('sound', '<path d="M4 10v4h4l5 4V6l-5 4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  S('skipb', '<path d="M18 6v12l-9-6zM6 6v12"/>'),
  S('skipf', '<path d="M6 6v12l9-6zM18 6v12"/>'),
  S('refresh', '<path d="M20 11a8 8 0 1 0-2.3 5.6M20 5v6h-6"/>'),
  S('plus', '<path d="M12 5v14M5 12h14"/>'),
  S('x', '<path d="M6 6l12 12M18 6 6 18"/>'),
  S('bell', '<path d="M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4"/>'),
  S('star', '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
  S('info', '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'),
  S('vibrate', '<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4 8v8M20 8v8"/>'),
  S('trophy', '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>'),
  S('pray', '<circle cx="12" cy="5" r="2.2"/><path d="M12 8v6M8 21l4-7 4 7M7 11h10"/>'),
  S('users', '<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M17.5 14.5A5.5 5.5 0 0 1 21 20"/>'),
  S('globe', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>'),
].join('');

export function installSprite() {
  if (document.getElementById('nur-sprite')) return;
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.id = 'nur-sprite';
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
  el.innerHTML = sprite;
  document.body.prepend(el);
}

export const icon = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
export const starNum = (n) => `<span class="star-num"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4"><use href="#i-star8"/></svg><span>${n}</span></span>`;
