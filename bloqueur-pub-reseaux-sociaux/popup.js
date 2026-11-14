/* Fenêtre de l'extension : réglages et compteurs. */
const $ = (selector) => document.querySelector(selector);

let settings = BPR_DEFAULTS;
let tabId = null;
let currentSiteId = null;

const save = (patch) => chrome.storage.local.set(patch);

const renderSettings = () => {
  const enabled = settings.enabled !== false;
  document.body.classList.toggle('off', !enabled);
  $('#master').checked = enabled;
  $('#status').textContent = enabled ? 'Protection activée' : 'Protection désactivée';
  $('#network').checked = settings.network !== false;
  $('#network').disabled = !enabled;
  for (const input of document.querySelectorAll('#sites input')) {
    input.checked = settings.sites[input.dataset.id] !== false;
    input.disabled = !enabled;
  }
};

const renderSites = () => {
  const list = $('#sites');
  for (const site of BPR_SITES) {
    const item = document.createElement('li');
    const label = document.createElement('label');
    label.className = 'row';

    const name = document.createElement('span');
    name.className = 'grow';
    name.textContent = site.name;
    if (site.id === currentSiteId) {
      const here = document.createElement('span');
      here.className = 'here';
      here.textContent = 'cet onglet';
      name.append(here);
    }

    const toggle = document.createElement('span');
    toggle.className = 'switch';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.setAttribute('aria-label', `Bloquer les pubs sur ${site.name}`);
    input.dataset.id = site.id;
    const track = document.createElement('span');
    track.className = 'track';
    toggle.append(input, track);

    label.append(name, toggle);
    item.append(label);
    list.append(item);
  }
};

const renderStats = async () => {
  const [{ total = 0 }, { tabs = {} }] = await Promise.all([
    chrome.storage.local.get('total'),
    chrome.storage.session.get('tabs'),
  ]);
  $('#total').textContent = total.toLocaleString('fr-FR');
  $('#tabCount').textContent = (tabs[tabId] || 0).toLocaleString('fr-FR');
};

const init = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    tabId = tab.id;
    try {
      const site = tab.url && bprFindSite(new URL(tab.url).hostname);
      currentSiteId = site ? site.id : null;
    } catch (e) {
      currentSiteId = null;
    }
  }
  renderSites();
  settings = await chrome.storage.local.get(BPR_DEFAULTS);
  renderSettings();
  await renderStats();

  $('#master').addEventListener('change', (e) => save({ enabled: e.target.checked }));
  $('#network').addEventListener('change', (e) => save({ network: e.target.checked }));
  $('#sites').addEventListener('change', (e) => {
    if (e.target.dataset.id) save({ sites: { ...settings.sites, [e.target.dataset.id]: e.target.checked } });
  });
  $('#reset').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'reset' }));

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local' && (changes.enabled || changes.network || changes.sites)) {
      settings = await chrome.storage.local.get(BPR_DEFAULTS);
      renderSettings();
    }
    if (changes.total || changes.tabs) renderStats();
  });
};

init();
