# NetCore Lab

Simulateur 3D de technicien réseau, jouable dans le navigateur (ordinateur et téléphone).

Vous travaillez dans la salle technique de Network Company : vous prenez des câbles dans votre sac, vous les branchez port par port sur les switchs, le PC et le serveur, puis vous configurez le switch depuis une console de type Cisco.

## Lancer le jeu

Ouvrez `index.html` dans un navigateur récent (Chrome, Edge, Firefox, Safari). Aucune installation n'est nécessaire. La bibliothèque Three.js est chargée depuis un CDN, avec une copie locale dans `lib/` si le réseau est coupé.

## Commandes

| Action | Clavier / souris | Téléphone |
| --- | --- | --- |
| Se déplacer | Z Q S D (ou W A S D, flèches) | joystick à gauche |
| Regarder | souris (cliquer sur la vue) | glisser à droite |
| Interagir (câbler, parler, porte) | E | bouton E |
| Console CLI du PC visé | C | bouton C |
| Infos sur l'appareil visé | B | bouton B |
| Sac d'équipement | I | bouton Sac |
| Station d'analyse (topologie, journal) | T | via le sac |
| Ranger le câble | G | bouton Ranger |
| Courir | Maj | |

## Déroulé

1. **Niveau 1** : brancher le câble console entre `con0` de SW-KAT1 et `COM1` de PC1, puis activer le port-security sticky sur `fa0/3` depuis la console.
2. **Niveau 2** : brancher PC2 sur `fa0/5` (câble droit), relier les deux switchs (câble croisé), poser le lien fibre vers le serveur, créer le VLAN 10 `COMPTA`.
3. Parler au responsable, puis prendre un café à la cafétéria.

Chaque mauvais câble est refusé avec une explication. Les indices de la console coûtent 10 XP chacun.

## Aides en jeu

- Un **guide d'objectif** (flèche, nom de l'appareil, distance) indique où aller et quel câble prendre.
- Un **repère** entoure l'appareil ou la personne visée, et une balise ambre signale l'objectif quand il est devant vous.
- La **station d'analyse** (touche T) affiche la topologie réseau en direct, avec les câbles par type, et le journal des événements.
- La qualité d'image s'adapte à la machine pour garder une bonne fluidité sur téléphone.

## Console

La console simule les commandes de base d'un switch Cisco : `enable`, `configure terminal`, `interface`, `switchport ...`, `vlan`, `show running-config`, `show ip interface brief`, `show vlan brief`, `show port-security`, `show mac address-table`, `write memory`, etc.
Les abréviations (`conf t`, `int fa0/3`), la touche Tab, l'aide `?` et le préfixe `do` en mode configuration fonctionnent.

## Fichiers

- `index.html`, `style.css` : interface (HUD, sac, câblage, console).
- `js/data.js` : appareils, câbles, règles de compatibilité, missions.
- `js/cli.js` : simulateur de ligne de commande.
- `js/world.js` : monde 3D (Three.js).
- `js/game.js` : boucle de jeu, entrées clavier et tactile, dialogues.
