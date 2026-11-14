# Bloqueur de pubs – Réseaux sociaux

Une extension pour navigateur qui **masque les publicités et les posts sponsorisés** sur :

Facebook · Instagram · X (Twitter) · YouTube · TikTok · LinkedIn · Reddit · Pinterest

Elle fonctionne sur **ordinateur**, dans Google Chrome, Microsoft Edge, Brave et Opera.
Pour le **téléphone** (iPhone ou Android), une version « script » existe : voir [Sur téléphone](#sur-téléphone).
Elle ne collecte rien et n'envoie rien nulle part : tout se passe dans votre navigateur.

## Installer (2 minutes)

1. Récupérez ce dossier sur votre ordinateur : sur GitHub, choisissez la branche `claude/awesome-cray-s6pyhi`
   (tant qu'elle n'est pas fusionnée dans `master`), bouton vert **Code → Download ZIP**, puis décompressez.
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

- **Pas dans les applications du téléphone.** Ni une extension ni un script ne peuvent agir dans les *applications*
  Facebook, Instagram, TikTok… ni dans Chrome pour Android (qui ne gère pas les extensions).
  Voir [Sur téléphone](#sur-téléphone) pour la solution.
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

## Sur téléphone

Les applications (Facebook, Instagram, TikTok…) ne peuvent pas être modifiées. Il faut donc ouvrir les réseaux
**dans le navigateur du téléphone**, avec la version « script » de l'outil :
[`telephone/bloqueur-pub-reseaux-sociaux.user.js`](telephone/bloqueur-pub-reseaux-sociaux.user.js).
C'est le même moteur que l'extension, dans un seul fichier.

Lien d'installation du script (à ouvrir **dans le navigateur indiqué ci-dessous**) :
`https://raw.githubusercontent.com/Moussa224/Moussa224/claude/awesome-cray-s6pyhi/bloqueur-pub-reseaux-sociaux/telephone/bloqueur-pub-reseaux-sociaux.user.js`
(quand la branche sera fusionnée, remplacez `claude/awesome-cray-s6pyhi` par `master`).

### iPhone : Safari + Userscripts

1. Installez l'application gratuite **Userscripts** depuis l'App Store et ouvrez-la une fois : elle demande un
   dossier où ranger ses scripts, choisissez-en un.
2. Activez-la dans Safari : Réglages → Safari → Extensions → **Userscripts**, et autorisez-la sur **tous les sites**
   (le chemin exact change un peu selon la version d'iOS). iOS 16.4 ou plus récent est recommandé.
3. Dans **Safari**, ouvrez le lien d'installation du script ci-dessus, touchez **Aa** dans la barre d'adresse →
   **Userscripts** → **Installer**.
4. Utilisez ensuite les réseaux **dans Safari** :
   - tapez l'adresse vous-même (`facebook.com`, `instagram.com`, `x.com`…) ou passez par un favori : un lien ouvert
     depuis une autre application ou un message lance souvent l'application à la place ;
   - n'utilisez pas un raccourci « Sur l'écran d'accueil » : les extensions de Safari n'y fonctionnent normalement pas.

### Android : Firefox + Violentmonkey

1. Installez **Firefox** depuis le Play Store.
2. Dans Firefox : menu ⋮ → **Modules complémentaires** → installez **Violentmonkey** (ou Tampermonkey).
3. Toujours dans Firefox, ouvrez le lien d'installation du script ci-dessus. Violentmonkey propose de l'installer : confirmez.
4. Ouvrez Facebook, Instagram, etc. **dans Firefox** (pas dans l'application).

### La pastille

Une petite pastille bleue 🛡 apparaît sur le bord gauche de l'écran, avec le nombre de pubs masquées : c'est la preuve
que ça marche. **Touchez-la pour mettre en pause** (elle devient grise ⏸), touchez-la encore pour relancer.
La pause est retenue pour ce site (`www.facebook.com` et `m.facebook.com` comptent comme deux sites).

### Ce qui diffère de l'ordinateur

- **Aucun blocage des requêtes de pub** : un script ne peut que masquer. L'option « requêtes de pub » n'existe que
  dans l'extension.
- **Les sites mobiles ont une autre structure que les sites pour ordinateur** (par exemple `m.facebook.com`), et les
  règles de `sites.js` ont été écrites pour la version ordinateur. Si des pubs passent sur Facebook, demandez la
  **version pour ordinateur** du site (Safari : **Aa** → « Demander le site web pour ordinateur » ; Firefox : menu ⋮ →
  « Version pour ordinateur »). La pastille y est alors toute petite.
- **Les applications gardent leurs pubs.** Pour limiter celles qui viennent de régies externes, même dans les
  applications, vous pouvez régler un DNS de blocage de pubs (Android : Réglages → Réseau → DNS privé →
  `dns.adguard-dns.com` ; iPhone : un profil DNS de blocage de pubs, comme ceux proposés par AdGuard DNS). Cela ne retire pas les posts sponsorisés que Facebook ou Instagram insèrent eux-mêmes dans
  le fil.
- **Ce qui a été testé, et ce qui ne l'a pas été.** Le script a été testé dans Chromium en mode téléphone (écran
  tactile, maquettes des réseaux), y compris dans le mode d'injection « extension » que l'application Userscripts
  utilise sur iPhone. Il n'a **pas** été essayé avec le moteur de Safari ni sur un vrai iPhone ou un vrai téléphone
  Android : les étapes d'installation ci-dessus suivent le fonctionnement habituel de ces outils, sans avoir été
  essayées de bout en bout. Le code n'utilise pas de fonction plus récente que iOS 15.4 ; une fonction plus récente
  (iOS 16.4) améliore la pastille quand elle est disponible.

## Quand une pub repasse

Tous les réglages propres à chaque réseau sont dans **`sites.js`** (le mode d'emploi est en tête du fichier).

1. Faites un clic droit sur la pub → **Inspecter**, et repérez l'élément qui entoure tout le post
   (une balise `article`, un `div` avec un `data-testid`, une balise `ytd-…`).
2. Ajoutez son sélecteur dans `sites.js` : dans `css` s'il s'agit d'une pub à coup sûr,
   ou dans `items` s'il faut d'abord vérifier la mention « Sponsorisé ».
3. Revenez sur la page `chrome://extensions` et cliquez sur la flèche circulaire de l'extension, puis rechargez le réseau.
4. Pour la version téléphone, régénérez le script : `node tools/build-userscript.js`, puis réinstallez-le.

## Comment ça marche

- `manifest.json` déclare l'extension et les sites concernés.
- `sites.js` décrit, pour chaque réseau, où se trouvent les pubs.
- `engine.js` tourne dans la page : il cherche les posts, lit la mention « Sponsorisé » (accents, majuscules,
  lettres éclatées, plusieurs langues) et masque ce qui est une pub. Il surveille la page, donc il masque aussi les
  pubs qui arrivent pendant que vous faites défiler.
- `content.js` branche le moteur sur l'extension (réglages et compteur).
- `background.js` compte les pubs masquées et bloque les requêtes vers les régies publicitaires.
- `popup.html` / `popup.css` / `popup.js` : la fenêtre de l'extension.
- `telephone/` : la version téléphone (`bridge.js` = la pastille, et le fichier `.user.js` généré par
  `tools/build-userscript.js` à partir de `sites.js`, `engine.js` et `bridge.js`).
- `icons/`, `tools/make_icons.py` : les icônes et le script qui les dessine.

Les pubs sont **masquées** (`display: none`), pas supprimées : en désactivant l'extension, tout revient.

## Tester (pour les développeurs)

Les tests chargent la vraie extension dans Chromium, lui font ouvrir des maquettes de chaque réseau et vérifient que
les pubs disparaissent sans toucher aux vrais posts, que les interrupteurs et compteurs fonctionnent, que les requêtes
publicitaires sont bloquées et que les pubs vidéo YouTube sont sautées.

```bash
npm install --no-save playwright && npx playwright install chromium   # une seule fois
node bloqueur-pub-reseaux-sociaux/tests/run.js              # l'extension
node bloqueur-pub-reseaux-sociaux/tests/run-userscript.js   # la version téléphone (écran tactile simulé)
```
