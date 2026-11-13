# Tableau de bord RH complet — tout votre service RH dans un seul fichier

Fichier à ouvrir dans Excel : **`tableau-de-bord-rh-complet.xlsx`**

## Ce qu'il contient (comme dans la vidéo)

| Élément | Où |
|---|---|
| **Un matricule → le document est prêt** : nom, poste, salaire, dates se remplissent tout seuls | case « Matricule » (rose / vert) en haut à droite de chaque document |
| **15 documents RH prêts à imprimer** (1 page A4 chacun) | onglets roses : Contrat CDI, Contrat CDD, Certificat de travail, Attestation de travail, Attestation travail & salaire, Avertissement, Demande de congé, Bon de sortie, Convocation entretien, Licenciement, Accusé de démission, Fin période essai, Solde de tout compte, Ordre de mission, Évaluation annuelle |
| **4 tableaux de bord en temps réel** | onglets verts : Dashboard RH (masse salariale, effectifs, CDI/CDD, contrats à échéance J-15 / J-36…), Formation, Recrutement de talents, Relations du collaborateur (absences, retards, turnover, avertissements) |
| **Une base de données unique** | `BASE DE DONNÉES` (jusqu'à 300 collaborateurs) + journaux `Absences`, `Suivi formations`, `Suivi avertissements` |
| **Fiche société** | `Info société` : nom, adresse, représentant, devise, année d'analyse, durée d'essai, préavis… |
| **Accueil** | boutons vers tous les onglets (le « 1 clic » de la vidéo) |

Code couleur : cellule **jaune** = à saisir · cellule **grise** = calcul automatique · **rose / vert** = matricule.

## Utilisation en 3 étapes

1. Remplissez **Info société** (elle apparaît sur tous les documents).
2. Saisissez ou collez vos collaborateurs dans **BASE DE DONNÉES** (un matricule unique par personne).
3. Ouvrez un document, tapez le matricule : tout est rempli. Imprimez avec **Ctrl + P** (zone d'impression A4 déjà réglée).

Les tableaux de bord se recalculent seuls à partir de la base et des journaux. L'année affichée se change dans `Info société`.

Essayez tout de suite : matricule **170** (Contrat CDI), **42** (Bon de sortie, Demande de congé), **17**, **55**, **90**…

## À savoir

- Les 31 collaborateurs, montants et dates fournis sont des **exemples fictifs** : remplacez-les par les vôtres.
- Les contrats et lettres sont des **modèles généraux** : faites-les valider par un juriste avant tout usage officiel.
- Il n'y a **pas de macro** (le fichier reste un `.xlsx` sans avertissement de sécurité) : le « 1 clic » correspond aux boutons de navigation et à l'impression directe.
- Les graphiques affichent les 6 départements, 6 sources de recrutement et 6 motifs de départ prévus dans `Listes`.

## Régénérer le fichier

```bash
pip install XlsxWriter openpyxl     # LibreOffice facultatif : il sert à pré-calculer les valeurs affichées
python3 rh-tout-en-un/construire_classeur.py
```

Les données d'exemple et les textes sont dans `_donnees.py` et `_documents.py`, les tableaux de bord dans `_tableaux.py`.
