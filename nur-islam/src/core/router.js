// Routeur par hash : #/chemin/:param. Chaque page expose mount(el, params) → (nettoyage optionnel).
const routes = [];
let cleanup = null, root, onNavigate;

export function route(pattern, page, tab) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ re, keys, page, tab, pattern });
}

export const go = (path) => { location.hash = '#/' + path.replace(/^#?\/?/, ''); };

function match(path) {
  for (const r of routes) {
    const m = r.re.exec(path);
    if (m) { const params = {}; r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]))); return { r, params }; }
  }
  return null;
}

export async function render() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [pathPart, query = ''] = raw.split('?');
  const path = pathPart.replace(/\/$/, '') || 'accueil';
  const hit = match(path) || match('accueil');
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  root.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'page-enter';
  root.append(el);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  const q = Object.fromEntries(new URLSearchParams(query));
  try {
    const out = await hit.r.page.mount(el, hit.params, q);
    if (typeof out === 'function') cleanup = out;
  } catch (e) {
    console.error(e);
    el.innerHTML = `<div class="card empty"><h3>Oups…</h3><p>Cette page n'a pas pu s'afficher.</p><a class="btn" href="#/accueil">Retour à l'accueil</a></div>`;
  }
  document.title = (hit.r.page.title ? hit.r.page.title + ' · ' : '') + 'Nûr';
  onNavigate && onNavigate(hit.r.tab || hit.r.pattern.split('/')[0], hit);
  root.focus({ preventScroll: true });
}

export function startRouter(container, navigate) {
  root = container; onNavigate = navigate;
  window.addEventListener('hashchange', render);
  render();
}
