# Nûr — Compagnon islamique en 3D · نور

Application web islamique **hors-ligne, sans compte, sans publicité, sans pistage**, avec des scènes 3D (Three.js).
Elle s'installe comme une application (PWA) sur téléphone et ordinateur.

## Fonctionnalités

| Rubrique | Ce que ça fait | 3D |
|---|---|---|
| **Accueil** | Mosquée 3D dont le **ciel suit les vrais horaires de prière** (aube, lever, midi, coucher, nuit), lune à la vraie phase, curseur pour parcourir la journée, prochaine prière, verset et hadith du jour | Mosquée, dôme, minarets, bassin réfléchissant, lanternes, étoiles |
| **Horaires de prière** | Calcul **100 % local** (bibliothèque `adhan`), 12 méthodes (MWL, UOIF, Umm al-Qura…), école d'Asr, 31 villes ou géolocalisation, tahajjud, Ramadan (imsak/iftar), suivi des 5 prières et série | – |
| **Qibla** | Direction (grand cercle) + distance, boussole capteur (Android/iOS) ou simulation | Cadran + Kaaba + pèlerins en tawaf |
| **Coran** | 114 sourates : arabe ʿuthmānî, **français (Hamidullah)**, phonétique ; recherche plein texte (français, phonétique, arabe sans voyelles), favoris, reprise de lecture, récitation audio ayah par ayah | Livre 3D, couverture qui s'ouvre |
| **Tasbih** | Chapelet à 33 pressions par tour, 8 formules sourcées, objectifs, séries, sons et vibrations | Chapelet 3D (perles, perle imam, pompon) |
| **99 Noms d'Allah** | Sens + explication, mode « appris » | Carrousel 3D |
| **Invocations** | 53 adhkar/du‘â' (après la prière, matin/soir, sommeil, quotidien, épreuves, Coran, Ramadan) avec source ; textes coraniques tirés du Coran embarqué | – |
| **40 hadiths d'an-Nawawî** | Arabe + traduction du sens + source et notes de contexte | – |
| **Prophètes** | 25 prophètes cités dans le Coran + 9 autres récits, avec références cliquables vers les versets | Pièce 3D |
| **Sîra** | Frise de la vie du Prophète ﷺ + les quatre califes | Frise qui se déploie en perspective |
| **Guide de la prière** | Ablutions et salât pas à pas, formules arabe/phonétique/français | **Figure 3D** qui exécute chaque posture |
| **Calendrier hégirien** | Umm al-Qura, fêtes, jours blancs, ajustement ±2 jours, jour hégirien au Maghrib | Lune 3D |
| **Zakât** | Calculateur (nisab or/argent, dettes), devises | – |
| **Quiz** | 48 questions avec explications, 4 thèmes | – |
| **Réglages** | Thèmes nuit/clair/émeraude, taille du texte arabe, qualité 3D, mouvements réduits, export/import des données | – |

## Lancer

Ouvrir `index.html` suffit (tout est préconstruit). Pour le mode hors-ligne et l'installation, servir en HTTP(S) :

```bash
cd nur-islam
npm install          # uniquement pour développer
npm run serve        # http://localhost:4173
```

Hébergement : n'importe quel hébergeur statique (GitHub Pages, Netlify…) — copier le dossier tel quel (sans `node_modules`).

## Développer

```bash
npm run build        # src/ → app.js (esbuild, un seul fichier, compatible file://)
npm run watch        # reconstruction automatique
npm run data         # régénère data/quran/*.js depuis le paquet « quran-json » (avec contrôles)
npm run hadith       # régénère src/content/hadith.json (arabe du jeu de données + traductions de scripts/hadith-fr.mjs)
npm run check        # contrôle d'intégrité des contenus (6 236 versets, 99 Noms, 42 hadiths, références…)
```

```
nur-islam/
├─ index.html · style.css · app.js (construit) · sw.js · manifest.webmanifest
├─ data/quran/1…114.js      sourates, chargées à la demande
├─ fonts/ · icons/
├─ src/
│  ├─ main.js               routes, navigation, thème, service worker
│  ├─ core/                 routeur, stockage local, horaires (adhan), calendrier hégirien, audio, rappels
│  ├─ scene/                moteur 3D, fond d'étoiles, ciel, mosquée, lune, Kaaba, chapelet, figure de prière
│  ├─ pages/                une page par rubrique
│  └─ content/              noms, hadiths, invocations, prophètes, Sîra, quiz
└─ scripts/                 génération des données, serveur local, contrôle d'intégrité
```

### Comment fonctionne la 3D

- **Ciel** : une palette interpolée entre les heures *réelles* (Fajr, lever, Dhouhr, Asr, coucher, Ichaa) ; le soleil suit l'arc lever→coucher ; la lune suit sa **vraie phase** (calculée) et passe au méridien selon son âge.
- **Figure de prière** : les postures sont définies par quelques points clés ; genoux et coudes sont calculés par **cinématique inverse** à deux segments, donc les membres gardent toujours des proportions justes, même pendant les transitions.
- **Performance** : qualité automatique (réduite sur mobile), pause hors écran et onglet masqué, pas d'ombres en qualité moyenne, respect de `prefers-reduced-motion`.

## Sources et licences

- **Coran** : texte ʿuthmānî de *The Noble Qur'an Encyclopedia* (quranenc.com) et translittération de Tanzil.net, via le paquet npm `quran-json` de Risan Bagja Pradana (**CC BY-SA 4.0**). Traduction française : Muhammad Hamidullah (tanzil.net). Les 6 236 versets sont contrôlés à la génération (nombre par sourate).
- **40 hadiths** : texte arabe du paquet `@kazishariar/nawawi-40-hadith-data` (CC BY 4.0) ; traductions du sens, attributions et notes rédigées pour Nûr.
- **Horaires/qibla** : `adhan` (Batoul Apps, MIT). **3D** : `three` (MIT).
- **Polices** : Amiri, Amiri Quran, Outfit, Cormorant Garamond (SIL OFL).
- **Récitations** (en ligne, optionnel) : EveryAyah.com.

Le Coran étant distribué ici sous CC BY-SA 4.0, toute redistribution des fichiers `data/quran/` doit conserver cette attribution et cette licence.

## Limites connues (à lire)

- **Récitation audio** : elle charge les fichiers depuis `everyayah.com` (connexion requise). Elle n'a pas pu être testée de bout en bout dans l'environnement de développement, qui bloque ce domaine.
- **Adhan sonore** : aucun fichier audio d'appel à la prière n'est embarqué (droits). Les alertes jouent un carillon synthétisé et fonctionnent **uniquement quand l'application est ouverte** (pas de notification « push » sans serveur).
- **Date hégirienne** : calendrier Umm al-Qura calculé ; le début réel des mois dépend de l'observation. Un ajustement de ±2 jours est proposé.
- **Lune de l'accueil** : la *phase* est exacte ; sa *position* dans le ciel est approchée (illustration).
- **Boussole** : nécessite un capteur d'orientation (et l'autorisation sur iOS) ; sinon, simulation par glissement.
- **Contenus religieux** : traductions du sens et résumés de récits rédigés avec soin, avec références, mais **à faire relire par un savant** avant toute diffusion publique. Les références (Boukhari, Mouslim…) sont celles usuelles ; vérifiez-les en cas de citation.
