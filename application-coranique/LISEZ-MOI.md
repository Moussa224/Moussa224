# Coran Facile

Une application pour apprendre le Coran pas à pas, en français. Elle marche dans un navigateur, sur téléphone comme sur ordinateur, sans compte et sans rien installer.

## Ce qu'elle permet

- **Lire** les 114 sourates : texte arabe avec toutes les voyelles, phonétique à la française (« Alhamdou lillahi rabbi al‘alamina »), traduction française. On peut cacher la phonétique ou la traduction et agrandir le texte arabe.
- **Écouter** chaque verset, ou toute la sourate, avec six récitants. On règle la vitesse (0,75×, 1×, 1,25×) et on peut **répéter chaque verset 3, 5 ou 10 fois** : c'est la méthode classique pour mémoriser.
- **Mémoriser** : on choisit 2 à 4 versets, on cache de plus en plus de mots (de « quelques mots » à « tout »), puis on passe un quiz « quel mot manque ? ».
- **Réviser** : les versets marqués comme appris reviennent au bon moment (demain, dans 3 jours, 7, 14, puis 30 jours). Une pastille sur l'onglet Réviser indique combien il y en a.
- **Apprendre à lire l'arabe** : les 28 lettres avec leur son, leurs quatre formes et un quiz ; les voyelles avec un petit atelier (choisir une lettre et un signe pour voir comment ça se lit) ; les règles de tajwid avec des exemples tirés du Coran.
- **Un parcours conseillé** de 17 étapes : lettres, voyelles, puis les sourates courtes (Al-Fatiha, An-Nas, Al-Falaq, Al-Ikhlas…) jusqu'à Ayat al-Kursi.
- **Chercher** une sourate (par nom, numéro, sens ou en arabe) ou un mot dans les versets (en français, en phonétique ou en arabe, avec ou sans voyelles).
- Favoris, reprise de la lecture là où on s'est arrêté, jours d'affilée, thème clair ou sombre.

## L'utiliser

- **Sur ordinateur** : ouvrir `index.html` (double-clic). Tout le texte du Coran est dans le dossier.
- **En ligne** : mettre le dossier sur un hébergement de pages web (voir plus bas). Sur téléphone, on peut alors « Ajouter à l'écran d'accueil » pour l'avoir comme une application.
- **Sans internet** : depuis l'adresse en ligne, ouvrir **Réglages → Télécharger tout le texte du Coran** (environ 3 Mo). Ensuite la lecture, la mémorisation, les révisions et les leçons marchent sans connexion.

> **L'audio a toujours besoin d'internet.** Il est lu depuis le site everyayah.com (avec islamic.network en secours pour deux récitants). Hors connexion, l'application le dit clairement.

La progression (versets appris, favoris, réglages) reste sur l'appareil, dans le navigateur. Rien n'est envoyé nulle part. Dans **Réglages → Ma progression**, on peut copier une sauvegarde et la coller sur un autre appareil.

## La mettre en ligne (GitHub Pages)

1. Sur GitHub : **Settings → Pages**, source « Deploy from a branch », branche `master`, dossier `/ (root)`.
2. Après quelques minutes, l'application est à une adresse de la forme `https://<nom>.github.io/application-coranique/`.

Attention : GitHub Pages publie tout le contenu du dépôt sur cette branche, pas seulement ce dossier.

## Modifier l'application

Pas d'installation ni de compilation : ce sont de simples fichiers.

| Fichier | Rôle |
| --- | --- |
| `index.html`, `style.css` | La page et son apparence (couleurs et tailles en haut de `style.css`) |
| `js/contenu.js` | Alphabet, voyelles, tajwid, parcours, versets du jour, récitants |
| `js/vues.js` | Les écrans |
| `js/audio.js` | Le lecteur audio |
| `js/etat.js` | Ce que l'application retient (progression, révisions espacées) |
| `js/donnees.js` | Le chargement des sourates et la recherche |
| `sw.js` | Le fonctionnement hors connexion |
| `data/` | Le texte du Coran (fichiers générés, ne pas modifier à la main) |

- **Après toute modification des fichiers de l'application**, changer `VERSION` dans `sw.js`, sinon les appareils qui ont déjà l'application gardent l'ancienne version.
- **Ajouter un récitant** : ajouter une ligne dans `recitants` de `js/contenu.js`. Le nom du dossier se trouve sur everyayah.com.
- **Régénérer les données** :
  ```
  cd /un/dossier/vide && npm pack quran-json@3.1.2 && tar xzf quran-json-3.1.2.tgz
  python application-coranique/outils/generer_donnees.py /un/dossier/vide/package/dist
  ```
  Si le contenu de `data/` change, changer aussi le nom du cache `coran-facile-donnees` dans `sw.js` et dans `js/donnees.js` (les deux doivent rester identiques).
- **Vérifier** : `python -m pytest` contrôle que les 6 236 versets sont là et que les exemples de tajwid et le parcours pointent sur de vrais versets.

## Une limite à connaître

La phonétique est une **aide de lecture** : elle vient d'une translittération automatique, où les voyelles longues ne sont pas toutes notées. Pour la prononciation exacte, il faut écouter le récitant, et rien ne remplace un enseignant qui écoute et corrige. L'application est faite pour s'entraîner entre deux cours.

## Sources et licences

- Texte arabe et translittération : projet [Tanzil](https://tanzil.net) (texte coranique uthmani).
- Traduction française : Muhammad Hamidullah (via Tanzil).
- Mise en forme des données : paquet npm [quran-json](https://github.com/risan/quran-json) de Risan Bagja Pradana, licence CC BY 4.0.
- Audio : [everyayah.com](https://everyayah.com) et [islamic.network](https://islamic.network), joué directement depuis leurs serveurs.
- Polices : Amiri Quran (The Amiri Project Authors) et Atkinson Hyperlegible (Braille Institute of America), sous licence SIL Open Font License 1.1 (voir `polices/`).
