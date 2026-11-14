# Validation sur de vrais matchs

Ce dossier contient tout ce qu'il faut pour refaire les mesures qui ont servi à régler `modele.js` et à vérifier sa fiabilité.

## Données

[StatsBomb Open Data](https://github.com/statsbomb/open-data) : les événements (buts, tirs, cartons, minute) de **1 517 matchs complets** de quatre championnats, saison 2015/16 : Premier League (380), Liga (380), Serie A (380), Ligue 1 (377). Les scores reconstruits à partir des événements correspondent aux scores officiels pour les 1 517 matchs. Merci de citer StatsBomb si vous publiez ces résultats.

Les prolongations et les tirs au but sont exclus. 3 997 buts, 413 expulsions (cartons rouges directs et seconds jaunes).

## Reproduire

```
python3 prediction-match/validation/extraire.py      # télécharge et condense (environ 2 minutes, nécessite curl)
python3 prediction-match/validation/regression.py    # mesure les effets (nécessite numpy)
node prediction-match/validation/evaluer.js          # test croisé, fiabilité
```

Les données téléchargées vont dans `validation/donnees/` (ignoré par git).

## Méthode

1. **Force des équipes sans regarder le match prédit.** Pour chaque championnat, les matchs sont répartis en 10 groupes. Les buts attendus de chaque équipe dans un match viennent d'un modèle attaque/défense ajusté sur les 9 autres groupes. Cet avant-match est donc honnête, mais moins bon que des cotes de bookmaker.
2. **Régression de Poisson minute par minute** (279 032 lignes : une par équipe et par intervalle de jeu). Elle mesure, toutes choses égales par ailleurs, l'effet du moment du match, du score et des cartons rouges sur le taux de buts, puis l'effet des tirs déjà tentés sur les buts à venir.
3. **Test croisé entre championnats.** Les réglages sont appris sur Premier League + Liga puis testés sur Serie A + Ligue 1, et inversement. Chaque match est prédit une seule fois, par des réglages qui ne l'ont jamais vu.
4. À chaque minute de contrôle (10, 20, 30, 45, 60, 70, 80, 85, 90), le modèle donne ses probabilités avec les événements survenus jusque-là, et on les compare au résultat final.

## Ce qui a été mesuré

| Effet | Mesure (± 1 écart-type) | Utilisé dans `modele.js` | Ancienne hypothèse |
|---|---|---|---|
| Carton rouge, équipe à dix | ×0,60 (± 0,11) | ×0,62 | ×0,75 |
| Carton rouge, équipe à onze | ×1,71 (± 0,06) | ×1,65 | ×1,25 |
| Équipe qui mène de 1 but | ×1,07 (± 0,04) | ×1,06 | ×0,95 (elle ralentirait) |
| Équipe menée de 1 but | ×1,08 (± 0,05) | ×1,08 | ×1,07 |
| Équipe menée de 2 buts ou plus | ×1,15 (± 0,06) | ×1,15 | ×1,14 |
| Moment du match (pente de l'intensité) | 0,26 à 0,30 | 0,28 | 0,36 |
| Poids de l'avant-match face aux tirs | 4,5 buts équivalents, pente de contrôle 1,06 ± 0,25 | 4,5 | 10 |
| Valeur d'un tir | 0,105 but, cadré ou non | 0,105 | 0,30 cadré, 0,03 non cadré |

Les valeurs sont stables d'une moitié des données à l'autre (par exemple le carton rouge : ×0,607 et ×0,602 pour l'équipe à dix). Les buts déjà marqués n'apprennent rien de plus que les tirs sur les buts à venir (pente de contrôle −0,11 ± 0,16).

## Fiabilité (test croisé, 1 517 matchs)

`log-loss` : plus petit = mieux. Pour mémoire, deviner au hasard parmi trois issues donne 1,099.

| Minute | log-loss sans aucun réglage de dynamique | log-loss du modèle | Issue la plus probable juste | Prévisions ≥ 80 % justes |
|---|---|---|---|---|
| 10 | 0,9760 | 0,9728 | 52,1 % | 86,9 % (sur 84) |
| 20 | 0,9393 | 0,9338 | 55,3 % | 87,2 % (sur 148) |
| 30 | 0,9122 | 0,9034 | 56,6 % | 86,5 % (sur 244) |
| 45 | 0,8102 | 0,7942 | 63,9 % | 88,9 % (sur 413) |
| 60 | 0,6997 | 0,6780 | 69,7 % | 91,3 % (sur 577) |
| 70 | 0,6042 | 0,5830 | 75,9 % | 92,6 % (sur 743) |
| 80 | 0,4373 | 0,4224 | 85,2 % | 92,4 % (sur 1 000) |
| 85 | 0,3338 | 0,3229 | 89,9 % | 92,3 % (sur 1 194) |
| 90 | 0,1909 | 0,1873 | 95,2 % | 95,2 % (sur 1 517) |

Dans les matchs où un carton rouge est déjà tombé, le log-loss passe de 0,5490 (sans réglage) à 0,4756. Face à l'ancienne version du modèle (réglages posés avant la mesure), le modèle actuel gagne de 0,004 à 0,006 de log-loss entre la 45e et la 85e minute ; l'intervalle de confiance à 95 % exclut zéro de la 60e à la 85e minute.

**Courbe de fiabilité** (prévisions des minutes 30 à 85, les trois issues) : quand le modèle annonce X %, voici combien de fois l'issue est arrivée.

| Annoncé | 3 % | 15 % | 25 % | 35 % | 45 % | 55 % | 66 % | 75 % | 85 % | 97 % |
|---|---|---|---|---|---|---|---|---|---|---|
| Observé | 3,2 % | 14,5 % | 25,8 % | 35,8 % | 44,1 % | 55,0 % | 66,1 % | 72,7 % | 84,4 % | 96,0 % |

L'écart moyen entre annoncé et observé est de **0,69 point**. Le seul écart un peu marqué est à 75 % (observé 72,7 % sur 1 487 prévisions, qui viennent de moins de 1 517 matchs, donc corrélées) ; l'outil de comparaison avec les cotes retire par défaut 5 points au modèle pour cette raison.

**Valeur du niveau des équipes selon le moment du match.** Le log-loss avec le niveau des équipes connu, comparé à des équipes supposées égales : 0,973 contre 1,029 à la 10e minute, 0,794 contre 0,814 à la 45e, 0,583 contre 0,592 à la 70e, 0,323 contre 0,324 à la 85e. Après la 70e minute, le score et le temps restant décident presque tout ; le niveau d'avant-match ne compte vraiment que dans la première heure.

## Limites de cette validation

- **Pas de comparaison avec le marché.** Ces données ne contiennent pas les cotes en direct. On sait que les probabilités sont bien calibrées, pas qu'elles battent un bookmaker. Les bookmakers intègrent la composition, les blessures, la tactique et le flux d'argent ; leur marge (souvent 5 % ou plus) s'ajoute. Un modèle bien calibré ne suffit pas à gagner de l'argent.
- **L'avant-match vient d'un modèle maison.** La fiabilité réelle de l'outil dépend de la qualité du niveau des équipes saisi. Des cotes de bookmaker donnent en principe un meilleur avant-match, mais cela n'a pas été testé ici.
- **Un seul exercice, un seul type de championnat.** Saison 2015/16, quatre championnats européens. Les arrêts de jeu sont plus longs aujourd'hui (4 à 7 minutes en 2e période d'après les matchs récents de la même source) : l'application les règle, mais les effets du jeu moderne n'ont pas été remesurés.
- **Cartons rouges multiples non mesurés** (deux joueurs d'écart ou plus : trop peu de matchs). Les valeurs correspondantes sont prudentes mais non mesurées.
- **Poids des tirs ajusté sur toutes les données**, puis fixé : le test croisé ne le réapprend pas à chaque moitié. Son effet sur la qualité des prévisions est modeste.
- **La simulation de démonstration** de l'application utilise les mêmes hypothèses que le calcul : elle ne prouve rien sur la réalité.
