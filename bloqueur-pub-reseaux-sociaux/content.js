/* Branche le moteur (engine.js) sur les API de l'extension : réglages, compteur. */
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  bprStartEngine({
    loadSettings: () => chrome.storage.local.get(BPR_DEFAULTS),
    onSettingsChange: (callback) =>
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.enabled || changes.sites)) callback();
      }),
    report: (n) => {
      try {
        chrome.runtime.sendMessage({ type: 'hidden', n });
      } catch (e) {
        /* l'extension a été rechargée : cette page ne peut plus lui parler, sans gravité */
      }
    },
  });
}
