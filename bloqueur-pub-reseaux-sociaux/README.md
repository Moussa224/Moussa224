# Bloqueur de pubs – Réseaux sociaux

Une extension pour navigateur qui **masque les publicités et les posts sponsorisés** sur :

Facebook · Instagram · X (Twitter) · YouTube · TikTok · LinkedIn · Reddit · Pinterest

Elle fonctionne sur **ordinateur**, dans Google Chrome, Microsoft Edge, Brave et Opera.
Elle ne collecte rien et n'envoie rien nulle part : tout se passe dans votre navigateur.

## Installer (2 minutes)

1. Récupérez ce dossier sur votre ordinateur : sur GitHub, bouton vert **Code → Download ZIP**, puis décompressez.
2. Ouvrez la page des extensions de votre navigateur :
   - Chrome : tapez `chrome://extensions` dans la barre d'adresse
   - Edge : `edge://extensions` · Brave : `brave://extensions` · Opera : `opera://extensions`
3. Activez **Mode développeur** (interrupteur en haut à droite).
4. Cliquez sur **Charger l'extension non empaquetée** et choisissez le dossier `bloqueur-pub-reseaux-sociaux`.
5. Cliquez sur l'icône puzzle de la barre du navigateur, puis sur l'épingle à côté de « Bloqueur de pubs » pour l'avoir toujours sous la main.

C'est tout : ouvrez Facebook, Instagram, etc., les pubs n'apparaissent plus. Le nombre de pubs masquées s'affiche sur l'icône.

> Chrome peut afficher de temps en temps un message sur les « extensions en mode développeur » : c'est normal
> pour une extension installée depuis un dossier, vous pouvez le fermer.

## Utiliser

Cliquez sur l'icône de l'extension :

- **L'interrupteur du haut** coupe ou rétablit tout le bloqueur. Les pubs réapparaissent aussitôt, sans recharger la page.
- **Un interrupteur par réseau** pour protéger Facebook mais pas Reddit, par exemple.
- **« Bloquer aussi les requêtes de pub »** coupe en plus les connexions vers les régies publicitaires (Google, etc.).
  Désactivé automatiquement sur YouTube, qui réagit mal à ce blocage.
- **Les compteurs** : pubs masquées sur l'onglet et au total.

## Ce qu'elle fait… et ne fait pas

| Réseau | Ce qui est masqué |
|---|---|
| Facebook | posts « Sponsorisé » dans le fil |
| Instagram | posts « Sponsorisé » dans le fil |
| X | tweets « Ad / Annonce / Sponsorisé » et tendances sponsorisées |
| YouTube | pubs dans la page d'accueil, bannières, pubs sur la vidéo ; **les pubs vidéo sont passées automatiquement** (bouton « Passer » cliqué, pub mise en sourdine et avancée jusqu'à la fin) |
| TikTok | vidéos « Sponsorisé » dans le fil |
| LinkedIn | posts « Promoted / Sponsorisé » et bannières |
| Reddit | posts et emplacements promus |
| Pinterest | épingles « Promu par… / Sponsorisé » |

**Limites à connaître :**

- **Pas sur téléphone.** Une extension ne peut pas agir dans les *applications* Facebook, Instagram, TikTok…
  ni dans Chrome pour Android (qui ne gère pas les extensions). Sur mobile, utilisez plutôt le navigateur Brave
  (bloqueur intégré) ou Firefox avec l'extension uBlock Origin, en ouvrant les réseaux depuis le navigateur.
- **Les réseaux changent leur site en permanence** (et brouillent exprès la mention « Sponsorisé » sur Facebook).
  Cette extension a été testée sur des **maquettes** qui reproduisent la structure de chaque site, pas sur les sites
  réels : une pub peut donc passer à travers, ou une mise à jour d'un réseau peut casser une règle. Voir
  « Quand une pub repasse » ci-dessous.
- **YouTube lutte contre les bloqueurs** : il peut afficher un avertissement ou ralentir la lecture. Si c'est le cas,
  désactivez l'interrupteur YouTube.
- **Non couverts** : les Stories et Reels sponsorisés, la colonne de droite de Facebook, les « partenariats rémunérés »
  où un créateur parle d'une marque (ce sont de vrais posts, pas des pubs affichées par le réseau).
- **Faux positifs rares** : un post est masqué quand il contient *exactement* la mention « Sponsorisé »,
  « Promoted »… hors de ce que les utilisateurs écrivent (légendes, commentaires). Si un vrai post disparaît,
  coupez le réseau concerné dans la fenêtre de l'extension.

## Quand une pub repasse

Tous les réglages propres à chaque réseau sont dans **`sites.js`** (le mode d'emploi est en tête du fichier).

1. Faites un clic droit sur la pub → **Inspecter**, et repérez l'élément qui entoure tout le post
   (une balise `article`, un `div` avec un `data-testid`, une balise `ytd-…`).
2. Ajoutez son sélecteur dans `sites.js` : dans `css` s'il s'agit d'une pub à coup sûr,
   ou dans `items` s'il faut d'abord vérifier la mention « Sponsorisé ».
3. Revenez sur la page `chrome://extensions` et cliquez sur la flèche circulaire de l'extension, puis rechargez le réseau.

## Comment ça marche

- `manifest.json` déclare l'extension et les sites concernés.
- `sites.js` décrit, pour chaque réseau, où se trouvent les pubs.
- `engine.js` tourne dans la page : il cherche les posts, lit la mention « Sponsorisé » (accents, majuscules,
  lettres éclatées, plusieurs langues) et masque ce qui est une pub. Il surveille la page, donc il masque aussi les
  pubs qui arrivent pendant que vous faites défiler.
- `background.js` compte les pubs masquées et bloque les requêtes vers les régies publicitaires.
- `popup.html` / `popup.css` / `popup.js` : la fenêtre de l'extension.
- `icons/`, `tools/make_icons.py` : les icônes et le script qui les dessine.

Les pubs sont **masquées** (`display: none`), pas supprimées : en désactivant l'extension, tout revient.

## Tester (pour les développeurs)

Les tests chargent la vraie extension dans Chromium, lui font ouvrir des maquettes de chaque réseau et vérifient que
les pubs disparaissent sans toucher aux vrais posts, que les interrupteurs et compteurs fonctionnent, que les requêtes
publicitaires sont bloquées et que les pubs vidéo YouTube sont sautées.

```bash
npm install --no-save playwright && npx playwright install chromium   # une seule fois
node bloqueur-pub-reseaux-sociaux/tests/run.js
# sur un serveur sans écran : xvfb-run -a node bloqueur-pub-reseaux-sociaux/tests/run.js
```
