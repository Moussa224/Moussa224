# Prédicteur de match

Une application web qui estime, **pendant un match de football**, les chances de victoire de chaque équipe, et qui compare ces chances aux cotes d'un bookmaker. Les chances sont recalculées à chaque but, tir ou carton rouge que vous saisissez.

Aucune installation : ouvrez `index.html` dans un navigateur. Aucun serveur, aucune clé, aucune dépendance (seule la police est chargée depuis Google Fonts, et la page marche sans).

## Ce qu'il faut savoir avant de parier

- **Le modèle est calibré, pas magique.** Sur 1 517 vrais matchs, quand il annonce 85 %, c'est arrivé 84,4 % du temps (écart moyen de 0,7 point sur toutes les prévisions). Sur 498 matchs de 2020 à 2024 jamais utilisés pour le régler, les prévisions à 80 % ou plus se sont réalisées 92,3 % du temps, pour 93,1 % annoncé. Le détail est dans [`validation/`](validation/README.md).
- **On ne sait pas s'il bat un bookmaker.** Les données de test n'ont pas de cotes en direct. Les bookmakers voient la composition, les blessures, la tactique, et leur marge (souvent 5 % ou plus) s'ajoute. Un modèle bien calibré ne suffit pas à gagner de l'argent.
- **Un grand écart avec les cotes est plus souvent une erreur du modèle qu'une occasion.** L'outil le signale (« Écart suspect »).
- **Le temps additionnel annoncé change beaucoup les dernières minutes.** Saisissez-le : c'est le réglage qui réduit le plus l'erreur à la 90e minute.
- **Des cotes d'avant-match irréalistes sont refusées** (par exemple un nul à 9 % entre deux équipes équilibrées) : l'application revient au niveau Elo et le dit.
- **Les prévisions sont les plus sûres en fin de match.** Après la 70e minute, le score et le temps restant décident presque tout. Avant la mi-temps, tout dépend de la qualité du niveau des équipes que vous saisissez.
- Ne jouez que ce que vous pouvez perdre. Réservé aux adultes.

## Utilisation

1. **Niveau des équipes et réglages** (panneau repliable). Au choix :
   - les **cotes décimales d'un bookmaker avant le match** (victoire A / nul / victoire B) : c'est le mieux. L'application retire la marge et en déduit le niveau de chaque équipe ;
   - ou un niveau sur l'échelle Elo pour chaque équipe, avec le terrain (domicile, neutre) et le nombre moyen de buts du championnat.

   Réglez aussi les **arrêts de jeu attendus en 2e période** (5 minutes par défaut ; 4 à 7 dans les matchs récents). Mettez le temps additionnel annoncé quand il l'est : cela compte beaucoup dans les dernières minutes.

   Le **chronomètre** se fonde sur l'horloge de l'appareil : si l'écran se verrouille ou si le navigateur ralentit l'onglet, la minute rattrape son retard. Il garde l'écran allumé quand le navigateur l'autorise.
2. **Nouveau match**, puis réglez la **minute** (curseur, boutons ± ou chronomètre en temps réel). À 45', la 1re période est considérée comme terminée, arrêts de jeu compris.
3. Saisissez ce qui se passe : **buts, tirs cadrés (buts compris), tirs non cadrés (contrés compris), cartons rouges**. Chaque ajout est enregistré à la minute affichée ; le bouton − retire le dernier ajout de la ligne.
4. Lisez la prévision en haut de page, la courbe d'évolution et le détail (prochain but, scores finaux probables, buts à venir).
5. **Comparer avec les cotes en direct** : saisissez la cote proposée sur les issues qui vous intéressent (résultat, double chance, plus/moins de X buts). L'application affiche, pour chaque issue, la **cote minimale** en dessous de laquelle le pari n'est pas intéressant, et un verdict : « Pas de valeur », « Valeur possible » ou « Écart suspect ». Le calcul retire par défaut 5 points de probabilité au modèle par prudence (réglable). La mise indicative est un quart de Kelly, plafonné à 2 % du capital.

Déplacer le curseur de minute vers le passé relit le match : les événements plus tardifs sont masqués et la prévision revient à ce qu'elle était à ce moment-là.

**Simuler un match** tire un match au hasard d'après le niveau des équipes, pour voir la prévision évoluer sans rien saisir. Votre match en cours est conservé et revient en quittant la simulation.

Le match en cours est sauvegardé dans le navigateur (stockage local) : fermer la page ne le perd pas.

## Comment le calcul fonctionne

`modele.js` (aucune dépendance, utilisable aussi dans Node).

- Chaque équipe marque selon un **taux de buts par minute**. Le taux de départ vient des cotes ou du niveau Elo.
- Il est corrigé en direct par des effets **mesurés sur 1 517 matchs réels** (voir `validation/`) :
  - **le moment du match** : un peu plus de buts en fin de match, plus les arrêts de jeu ;
  - **le score** : quand le score est ouvert, les deux équipes marquent un peu plus (×1,06 à ×1,15), l'équipe menée un peu plus encore. L'idée reçue selon laquelle l'équipe qui mène ralentit n'apparaît pas dans les données ;
  - **les cartons rouges** : l'équipe à dix marque environ 40 % de moins, l'équipe à onze environ 65 % de plus ;
  - **les tirs** : chaque tir, cadré ou non, vaut environ 0,105 but d'indice sur le niveau du jour, avec un poids de l'avant-match équivalent à 4,5 buts. Les buts déjà marqués n'apprennent rien de plus.
- Le reste du match est déroulé **demi-minute par demi-minute en suivant toutes les suites possibles de buts**. On en tire victoire A / nul / victoire B, le prochain but, les scores finaux probables, le nombre total de buts.

## Limites à connaître

- Les réglages viennent de **quatre championnats européens, saison 2015/16**. Un test sur 498 matchs de 2020 à 2024 est concluant en seconde période, mais les effets n'ont pas été remesurés sur le jeu moderne.
- L'application **ne se connecte à aucun flux de scores** : le niveau des équipes, les cotes et les événements viennent de vous.
- Elle ne connaît ni les blessures, ni la composition, ni la météo, ni les penalties, ni les prolongations. L'effet de plusieurs cartons rouges d'écart n'est pas mesuré.
- La fiabilité mesurée suppose un bon niveau d'avant-match. Avec un niveau Elo saisi à la main, elle dépend de votre estimation.

## Tests

```
node --test prediction-match/test-modele.js
```

Les tests vérifient : probabilités qui font 100 %, calage des cotes sur toute la plage réaliste et signalement des cotes irréalistes, symétrie, calibration sur l'échelle Elo (100 points d'écart = 64 %), « buts par match » qui garde son sens, arrêts de jeu, effet du score, du rouge et des tirs, retour des cotes à leurs probabilités, comparaison avec une cote (une cote équitable ne donne aucun avantage, la prudence retire un avantage apparent, mise plafonnée), et cohérence du calcul avec la simulation sur plusieurs milliers de matchs simulés.

Attention : la simulation utilise les mêmes hypothèses que le calcul. Ces tests prouvent donc que le calcul est correct par rapport au modèle. C'est le dossier `validation/` qui compare le modèle à de vrais matchs.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html`, `style.css`, `script.js` | l'interface |
| `modele.js` | le calcul des prévisions |
| `test-modele.js` | les tests |
| `validation/` | les mesures sur de vrais matchs : méthode, scripts, résultats (dont `evaluer-recents.js`, le test sur 2020-2024) |
