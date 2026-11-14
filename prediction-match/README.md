# Prédicteur de match

Une application web qui estime, **pendant un match de football**, les chances de victoire de chaque équipe. Les chances sont recalculées à chaque but, tir ou carton rouge que vous saisissez.

Aucune installation : ouvrez `index.html` dans un navigateur. Aucun serveur, aucune clé, aucune dépendance (seule la police est chargée depuis Google Fonts, et la page marche sans).

## Utilisation

1. **Niveau des équipes** (panneau repliable). Au choix :
   - un niveau sur l'échelle Elo pour chaque équipe, avec le terrain (domicile, neutre) et le nombre moyen de buts du championnat ;
   - ou les **cotes décimales** d'un bookmaker avant le match (victoire A / nul / victoire B). L'application retire la marge et en déduit le niveau de chaque équipe.
2. **Nouveau match**, puis réglez la **minute** (curseur, boutons ± ou chronomètre en temps réel).
3. Saisissez ce qui se passe : **buts, tirs cadrés, tirs non cadrés, cartons rouges**. Chaque ajout est enregistré à la minute affichée ; le bouton − retire le dernier ajout de la ligne.
4. Lisez la prévision en haut de page, la courbe d'évolution et le détail (prochain but, scores finaux probables, buts à venir).

Déplacer le curseur de minute vers le passé relit le match : les événements plus tardifs sont masqués et la prévision revient à ce qu'elle était à ce moment-là.

**Simuler un match** tire un match au hasard d'après le niveau des équipes, pour voir la prévision évoluer sans rien saisir. Votre match en cours est conservé et revient en quittant la simulation.

Le match en cours est sauvegardé dans le navigateur (stockage local) : fermer la page ne le perd pas.

## Comment le calcul fonctionne

`modele.js` (aucune dépendance, utilisable aussi dans Node).

- Chaque équipe marque selon un **taux de buts par minute**. Le taux de départ vient du niveau Elo (la part des buts d'A est une logistique de l'écart Elo, calibrée pour retrouver les chances Elo habituelles) ou des cotes.
- Il est corrigé en direct par :
  - **le moment du match** : 45 % des buts en première période, 55 % en seconde, avec environ 4 minutes d'arrêts de jeu ;
  - **le score** : −5 % de buts par but d'avance, +7 % par but de retard (jusqu'à 3) ;
  - **les cartons rouges** : l'équipe à dix −25 %, l'équipe à onze +25 % (par carton) ;
  - **les tirs** : un tir cadré vaut 0,30 but, un tir non cadré 0,03. L'écart entre ce qu'une équipe produit et ce qu'on attendait ajuste son niveau, avec un poids volontairement faible pour l'avant-match (équivalent de 10 buts).
- Le reste du match est déroulé **demi-minute par demi-minute en suivant toutes les suites possibles de buts**. On en tire victoire A / nul / victoire B, le prochain but, les scores finaux probables et les buts à venir.

## Limites à connaître

- Les réglages (effet du score, du rouge, des tirs, répartition des buts dans le temps) sont des **ordres de grandeur du football en général**, repris de la littérature. Ils n'ont pas été mesurés sur un championnat précis ni testés contre des résultats réels de matchs.
- L'application **ne se connecte à aucun flux de scores** : le niveau des équipes et les événements viennent de vous.
- Elle ne connaît ni les blessures, ni la composition, ni la météo, ni les penalties, ni les prolongations.
- Une chance de 80 % veut dire que l'autre issue arrive une fois sur cinq. C'est un outil d'analyse, pas un conseil de pari.

## Tests

```
node --test prediction-match/test-modele.js
```

Les tests vérifient : probabilités qui font 100 %, symétrie, calibration sur l'échelle Elo (100 points d'écart = 64 %), avantage du terrain, effet du score, du rouge et des tirs, retour des cotes à leurs probabilités, et **cohérence du calcul avec la simulation** sur plusieurs milliers de matchs simulés.

Attention : la simulation utilise les mêmes hypothèses que le calcul. Ces tests prouvent donc que le calcul est correct par rapport au modèle, pas que le modèle prédit bien les vrais matchs.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html`, `style.css`, `script.js` | l'interface |
| `modele.js` | le calcul des prévisions |
| `test-modele.js` | les tests |
