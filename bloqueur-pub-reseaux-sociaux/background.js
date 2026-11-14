/*
 * Service worker de l'extension :
 *   - compte les pubs masquées (par onglet et au total) et l'affiche sur l'icône ;
 *   - bloque les requêtes vers les régies publicitaires (règle dynamique, selon les réglages).
 */
importScripts('sites.js');

const NETWORK_RULE_ID = 1;

const getSettings = () => chrome.storage.local.get(BPR_DEFAULTS);

/* ---------- Blocage des requêtes publicitaires ---------- */

const syncNetworkRules = async () => {
  const settings = await getSettings();
  const initiators = BPR_SITES.filter((s) => s.network !== false && settings.sites[s.id] !== false).flatMap(
    (s) => s.hosts
  );
  const active = settings.enabled && settings.network && initiators.length > 0;
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [NETWORK_RULE_ID],
    addRules: active
      ? [
          {
            id: NETWORK_RULE_ID,
            priority: 1,
            action: { type: 'block' },
            condition: {
              requestDomains: BPR_AD_DOMAINS,
              initiatorDomains: initiators,
              resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame', 'ping', 'media', 'other'],
            },
          },
        ]
      : [],
  });
};

/* ---------- Compteurs ---------- */

// Les messages arrivent en rafale : on les traite un par un pour ne pas écraser les compteurs.
let queue = Promise.resolve();

const setBadge = (tabId, count) =>
  chrome.action.setBadgeText({ tabId, text: count > 0 ? String(count) : '' }).catch(() => {});

const addHidden = (tabId, n) => {
  queue = queue
    .then(async () => {
      const [{ total = 0 }, { tabs = {} }] = await Promise.all([
        chrome.storage.local.get('total'),
        chrome.storage.session.get('tabs'),
      ]);
      tabs[tabId] = (tabs[tabId] || 0) + n;
      await Promise.all([chrome.storage.local.set({ total: total + n }), chrome.storage.session.set({ tabs })]);
      await setBadge(tabId, tabs[tabId]);
    })
    .catch((e) => console.error(e));
};

const resetTab = (tabId) => {
  queue = queue
    .then(async () => {
      const { tabs = {} } = await chrome.storage.session.get('tabs');
      delete tabs[tabId];
      await chrome.storage.session.set({ tabs });
      await setBadge(tabId, 0);
    })
    .catch((e) => console.error(e));
};

const resetAll = () => {
  queue = queue
    .then(async () => {
      const { tabs = {} } = await chrome.storage.session.get('tabs');
      await Promise.all([chrome.storage.local.set({ total: 0 }), chrome.storage.session.set({ tabs: {} })]);
      await Promise.all(Object.keys(tabs).map((id) => setBadge(Number(id), 0)));
    })
    .catch((e) => console.error(e));
};

/* ---------- Événements ---------- */

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message && message.type === 'hidden' && sender.tab && Number.isInteger(message.n) && message.n > 0) {
    addHidden(sender.tab.id, message.n);
  } else if (message && message.type === 'reset') {
    resetAll();
  }
});

// Le compteur de l'onglet repart de zéro à chaque rechargement ou changement de page complet.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') resetTab(tabId);
});
chrome.tabs.onRemoved.addListener(resetTab);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.enabled || changes.network || changes.sites)) syncNetworkRules();
});

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
  await chrome.storage.local.set(await getSettings()); // écrit les réglages par défaut
  await syncNetworkRules();
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
  await syncNetworkRules();
});
