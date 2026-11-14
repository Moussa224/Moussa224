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
