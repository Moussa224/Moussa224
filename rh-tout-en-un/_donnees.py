"""Listes déroulantes et données d'exemple (fictives) du classeur."""

from __future__ import annotations

from datetime import date, timedelta

AUJOURD_HUI = date.today()


def dans(jours: int) -> date:
    return AUJOURD_HUI + timedelta(days=jours)


SOCIETE = [
    # (clé, libellé, valeur d'exemple, aide)
    ("nom", "Raison sociale", "Hôtel Les Jardins", "Nom de votre entreprise, tel qu'il doit figurer sur les documents."),
    ("forme", "Forme juridique", "SARL", "SARL, SARLU, SA, SAS, entreprise individuelle…"),
    ("adresse", "Adresse du siège", "12 avenue des Orangers, Quartier Agdal", "Rue, quartier."),
    ("ville", "Ville", "Rabat", "Sert aussi pour « Fait à … » en bas des documents."),
    ("pays", "Pays", "Maroc", ""),
    ("rc", "N° du registre du commerce", "123456", ""),
    ("patente", "Identifiant fiscal / patente", "78901234", ""),
    ("cnss", "N° d'affiliation CNSS de l'entreprise", "1234567", "Caisse nationale de sécurité sociale."),
    ("rep", "Représentant légal", "Karim Alaoui", "Personne qui signe les documents."),
    ("qualite", "Qualité du représentant", "Directeur Général", ""),
    ("tel", "Téléphone", "+212 5 37 00 00 00", ""),
    ("email", "E-mail", "rh@exemple.com", ""),
    ("devise", "Devise", "MAD", "Texte affiché après les montants (MAD, GNF, XOF, EUR…)."),
]

PARAMETRES = [
    ("essai", "Période d'essai (mois)", 3, "Reprise dans les contrats et la confirmation de fin d'essai."),
    ("heures", "Durée hebdomadaire du travail (heures)", 44, "Reprise dans les contrats."),
    ("conge", "Congés payés acquis par mois (jours)", 1.5, "18 jours par an = 1,5 jour par mois."),
    ("preavis", "Préavis (jours)", 30, "Reprise dans la lettre de licenciement et l'accusé de démission."),
]

DEPARTEMENTS = ["Adm/Fin", "Comm.", "F&B", "Héberg.", "SPA", "Techn."]
CONTRATS = ["CDI", "CDD"]
GENRES = ["Homme", "Femme"]
STATUTS = ["Actif", "Sorti"]
SOURCES = ["LinkedIn", "Cooptation", "Candidature spontanée", "Annonce", "Agence d'emploi", "École / Stage"]
MOTIFS_SORTIE = ["Démission", "Fin de CDD", "Licenciement", "Retraite", "Fin de période d'essai", "Autre"]
TYPES_ABSENCE = ["Maladie", "Congé payé", "Congé sans solde", "Absence injustifiée", "Événement familial", "Retard"]
TYPES_FORMATION = ["Interne", "Externe", "E-learning", "Certifiante"]
NIVEAUX_AVERT = ["Avertissement verbal", "1er avertissement", "2e avertissement", "Mise à pied"]
JUSTIFIE = ["Oui", "Non"]
NATURES_CONGE = ["Congé payé annuel", "Congé sans solde", "Congé exceptionnel"]
STATUT_FORMATION = ["Réalisée", "Planifiée"]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
MOIS_COURTS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."]

# (matricule, nom, prénom, genre, naissance, nationalité, CIN, CNSS, adresse, ville, département, poste,
#  contrat, embauche, fin de CDD, salaire, primes, source, statut, sortie, motif)
A = "Actif"
S = "Sorti"
EMPLOYES = [
    (8, "Benjelloun", "Salma", "Femme", date(1984, 3, 12), "Marocaine", "A512346", "108452671", "12 rue Ibn Sina, Agdal", "Rabat", "Adm/Fin", "Directrice administrative et financière", "CDI", date(2016, 2, 1), None, 21000, 3000, "Cooptation", A, None, None),
    (17, "El Fassi", "Karim", "Homme", date(1990, 7, 23), "Marocaine", "B203417", "109563782", "4 rue Oqba, Hassan", "Rabat", "Adm/Fin", "Comptable", "CDI", date(2019, 9, 2), None, 9500, 500, "LinkedIn", A, None, None),
    (42, "Tazi", "Omar", "Homme", date(1993, 1, 15), "Marocaine", "BE48120", "110674893", "27 avenue Allal Ben Abdellah", "Salé", "Adm/Fin", "Assistant ressources humaines", "CDI", date(2021, 3, 15), None, 7000, 400, "Candidature spontanée", A, None, None),
    (55, "Lahlou", "Imane", "Femme", date(1988, 11, 2), "Marocaine", "A309954", "111785904", "8 rue des Roses, Souissi", "Rabat", "Adm/Fin", "Assistante de direction", "CDI", date(2018, 6, 1), None, 8000, 500, "Cooptation", A, None, None),
    (63, "Mernissi", "Yasmine", "Femme", date(1999, 5, 30), "Marocaine", "BK71533", "112896015", "15 rue Moulay Ismaïl", "Témara", "Adm/Fin", "Aide-comptable", "CDD", date(2026, 5, 4), dans(36), 5200, 200, "Agence d'emploi", A, None, None),
    (170, "Seddiki", "Anas", "Homme", date(1987, 9, 9), "Marocaine", "B510862", "113907126", "3 avenue de France, Agdal", "Rabat", "Adm/Fin", "Responsable achats", "CDI", date(2022, 2, 14), None, 9000, 500, "LinkedIn", A, None, None),
    (71, "Bennani", "Rachid", "Homme", date(1985, 4, 18), "Marocaine", "A118475", "114018237", "22 rue Tunis, Océan", "Rabat", "Comm.", "Responsable communication", "CDI", date(2020, 1, 6), None, 12500, 800, "LinkedIn", A, None, None),
    (72, "Cherkaoui", "Nadia", "Femme", date(1995, 12, 6), "Marocaine", "BJ62241", "115129348", "9 rue Al Qods, Yacoub El Mansour", "Rabat", "Comm.", "Community manager", "CDI", date(2022, 10, 3), None, 7500, 300, "Annonce", A, None, None),
    (74, "Skalli", "Hamza", "Homme", date(1997, 8, 21), "Marocaine", "BL30987", "116230459", "41 rue Ghandi, Souissi", "Rabat", "Comm.", "Graphiste", "CDD", date(2026, 3, 2), dans(15), 6000, 0, "Candidature spontanée", A, None, None),
    (85, "Berrada", "Mehdi", "Homme", date(1979, 2, 25), "Marocaine", "A044128", "117341560", "30 rue Mouline, Océan", "Rabat", "F&B", "Chef de cuisine", "CDI", date(2017, 4, 10), None, 14000, 1000, "Cooptation", A, None, None),
    (86, "Ouazzani", "Fatima", "Femme", date(1986, 6, 14), "Marocaine", "A200516", "118452671", "5 rue Sebta, Hay Riad", "Rabat", "F&B", "Cheffe de partie", "CDI", date(2019, 2, 18), None, 8500, 600, "Annonce", A, None, None),
    (90, "Idrissi", "Youssef", "Homme", date(1994, 10, 3), "Marocaine", "BH93360", "119563782", "18 rue Oued Fès, Akkari", "Rabat", "F&B", "Serveur", "CDI", date(2020, 6, 1), None, 4200, 500, "Annonce", A, None, None),
    (91, "Rahmouni", "Sanae", "Femme", date(1996, 3, 27), "Marocaine", "BJ10874", "120674893", "7 rue Imam Malik", "Salé", "F&B", "Serveuse", "CDI", date(2021, 7, 12), None, 4200, 500, "Annonce", A, None, None),
    (93, "Alami", "Soufiane", "Homme", date(2000, 1, 11), "Marocaine", "BM42265", "121785904", "12 rue Beni Mellal", "Rabat", "F&B", "Barman", "CDD", date(2026, 6, 1), dans(16), 4500, 300, "Agence d'emploi", A, None, None),
    (94, "Kettani", "Ayoub", "Homme", date(2001, 7, 19), "Marocaine", "BN55718", "122896015", "26 rue Bab Rouah", "Rabat", "F&B", "Commis de cuisine", "CDD", date(2026, 5, 15), dans(40), 3800, 200, "Candidature spontanée", A, None, None),
    (95, "Filali", "Houda", "Femme", date(1998, 9, 1), "Marocaine", "BK20493", "123907126", "14 rue Ibn Battouta", "Salé", "F&B", "Serveuse", "CDI", date(2023, 3, 6), None, 4200, 400, "LinkedIn", S, date(2026, 8, 31), "Démission"),
    (96, "Haddad", "Anas", "Homme", date(2002, 2, 8), "Marocaine", "BP12076", "124018237", "9 rue Fès, Takaddoum", "Rabat", "F&B", "Plongeur", "CDI", date(2024, 1, 8), None, 3300, 200, "Annonce", A, None, None),
    (97, "Lamrani", "Sofia", "Femme", date(1983, 5, 16), "Marocaine", "A401239", "125129348", "33 avenue Mohammed V", "Rabat", "F&B", "Maîtresse d'hôtel", "CDI", date(2018, 11, 5), None, 9500, 700, "Cooptation", A, None, None),
    (101, "Zniber", "Khalid", "Homme", date(1977, 8, 4), "Marocaine", "A011782", "126230459", "2 rue Zaki, Souissi", "Rabat", "Héberg.", "Directeur de l'hébergement", "CDI", date(2015, 9, 1), None, 16000, 1200, "Cooptation", A, None, None),
    (102, "Bouazza", "Leïla", "Femme", date(1994, 6, 22), "Marocaine", "BH77405", "127341560", "19 rue Safi, Agdal", "Rabat", "Héberg.", "Réceptionniste", "CDI", date(2020, 2, 3), None, 5500, 400, "LinkedIn", A, None, None),
    (103, "Sebti", "Adil", "Homme", date(1991, 11, 30), "Marocaine", "B330651", "128452671", "6 rue Taza, Hay Nahda", "Rabat", "Héberg.", "Réceptionniste de nuit", "CDI", date(2021, 11, 22), None, 5500, 600, "Annonce", A, None, None),
    (104, "Hajji", "Meryem", "Femme", date(1982, 4, 9), "Marocaine", "A288904", "129563782", "21 rue Marrakech, Océan", "Rabat", "Héberg.", "Gouvernante générale", "CDI", date(2019, 5, 13), None, 8000, 500, "Cooptation", A, None, None),
    (106, "Amrani", "Nabil", "Homme", date(1999, 12, 12), "Marocaine", "BK88213", "130674893", "11 rue Agadir", "Salé", "Héberg.", "Bagagiste", "CDD", date(2026, 2, 16), dans(80), 3600, 200, "Agence d'emploi", A, None, None),
    (107, "Ziani", "Rania", "Femme", date(1992, 1, 28), "Marocaine", "BE15527", "131785904", "8 rue Rabat, Hay Riad", "Rabat", "Héberg.", "Femme de chambre", "CDI", date(2022, 4, 4), None, 3800, 200, "Annonce", S, date(2026, 4, 30), "Licenciement"),
    (108, "Mouline", "Salim", "Homme", date(1996, 7, 7), "Marocaine", "BJ47790", "132896015", "35 rue Fès, Yacoub El Mansour", "Rabat", "Héberg.", "Valet de chambre", "CDI", date(2023, 9, 18), None, 3800, 200, "Annonce", A, None, None),
    (120, "Guessous", "Dounia", "Femme", date(1985, 10, 20), "Marocaine", "A155836", "133907126", "17 rue Souissi", "Rabat", "SPA", "Responsable SPA", "CDI", date(2018, 3, 5), None, 11000, 1000, "LinkedIn", A, None, None),
    (121, "Naciri", "Hind", "Femme", date(1993, 3, 3), "Marocaine", "BF30112", "134018237", "5 rue Ouarzazate", "Rabat", "SPA", "Praticienne bien-être", "CDI", date(2021, 5, 17), None, 5800, 700, "Candidature spontanée", A, None, None),
    (122, "Benkirane", "Lina", "Femme", date(2000, 6, 15), "Marocaine", "BM90764", "135129348", "29 rue Meknès, Agdal", "Rabat", "SPA", "Praticienne bien-être", "CDD", date(2026, 9, 1), dans(109), 5400, 500, "École / Stage", A, None, None),
    (150, "Tounsi", "Rachid", "Homme", date(1981, 1, 31), "Marocaine", "A077321", "136230459", "13 rue Beni Snassen", "Rabat", "Techn.", "Responsable technique", "CDI", date(2016, 8, 22), None, 13000, 800, "Cooptation", A, None, None),
    (151, "Belhaj", "Ayman", "Homme", date(1990, 5, 5), "Marocaine", "B260598", "137341560", "40 rue Casablanca", "Salé", "Techn.", "Électricien", "CDI", date(2020, 9, 7), None, 5200, 300, "Annonce", A, None, None),
    (152, "Daoudi", "Mounir", "Homme", date(1989, 9, 17), "Marocaine", "B184406", "138452671", "7 rue Kénitra", "Salé", "Techn.", "Plombier", "CDI", date(2022, 1, 10), None, 4800, 300, "Annonce", S, date(2026, 2, 28), "Démission"),
]

# (début, fin, matricule, type, retard en minutes, justifié, observation)
ABSENCES = [
    (date(2026, 1, 12), date(2026, 1, 14), 90, "Maladie", 0, "Oui", "Certificat médical"),
    (date(2026, 1, 26), date(2026, 1, 26), 91, "Retard", 45, "Non", ""),
    (date(2026, 2, 9), date(2026, 2, 20), 102, "Congé payé", 0, "Oui", ""),
    (date(2026, 2, 17), date(2026, 2, 17), 96, "Absence injustifiée", 0, "Non", "Sans nouvelles"),
    (date(2026, 3, 3), date(2026, 3, 3), 151, "Retard", 30, "Non", ""),
    (date(2026, 3, 16), date(2026, 3, 18), 17, "Maladie", 0, "Oui", "Certificat médical"),
    (date(2026, 3, 23), date(2026, 3, 27), 85, "Congé payé", 0, "Oui", ""),
    (date(2026, 4, 7), date(2026, 4, 7), 72, "Retard", 20, "Non", ""),
    (date(2026, 4, 13), date(2026, 4, 17), 104, "Congé payé", 0, "Oui", ""),
    (date(2026, 4, 21), date(2026, 4, 21), 93, "Événement familial", 0, "Oui", "Décès d'un proche"),
    (date(2026, 5, 5), date(2026, 5, 8), 90, "Maladie", 0, "Oui", ""),
    (date(2026, 5, 11), date(2026, 5, 11), 86, "Retard", 60, "Non", ""),
    (date(2026, 5, 18), date(2026, 5, 29), 120, "Congé payé", 0, "Oui", ""),
    (date(2026, 6, 2), date(2026, 6, 2), 103, "Retard", 25, "Non", ""),
    (date(2026, 6, 15), date(2026, 6, 17), 91, "Absence injustifiée", 0, "Non", ""),
    (date(2026, 6, 22), date(2026, 6, 26), 8, "Congé payé", 0, "Oui", ""),
    (date(2026, 7, 6), date(2026, 7, 17), 71, "Congé payé", 0, "Oui", ""),
    (date(2026, 7, 8), date(2026, 7, 8), 94, "Retard", 40, "Non", ""),
    (date(2026, 7, 20), date(2026, 7, 31), 97, "Congé payé", 0, "Oui", ""),
    (date(2026, 8, 3), date(2026, 8, 7), 121, "Maladie", 0, "Oui", "Certificat médical"),
    (date(2026, 8, 10), date(2026, 8, 21), 150, "Congé payé", 0, "Oui", ""),
    (date(2026, 9, 7), date(2026, 9, 7), 74, "Retard", 35, "Non", ""),
    (date(2026, 9, 14), date(2026, 9, 18), 42, "Congé payé", 0, "Oui", ""),
    (date(2026, 9, 28), date(2026, 9, 28), 108, "Absence injustifiée", 0, "Non", ""),
    (date(2026, 10, 5), date(2026, 10, 6), 101, "Événement familial", 0, "Oui", "Mariage"),
    (date(2026, 10, 12), date(2026, 10, 12), 85, "Retard", 15, "Non", ""),
    (date(2026, 10, 19), date(2026, 10, 23), 55, "Congé payé", 0, "Oui", ""),
    (date(2026, 10, 26), date(2026, 10, 30), 170, "Congé payé", 0, "Oui", ""),
    (date(2026, 11, 2), date(2026, 11, 4), 102, "Maladie", 0, "Oui", ""),
    (date(2026, 11, 9), date(2026, 11, 9), 90, "Retard", 50, "Non", ""),
]

# (date, matricule, intitulé, type, durée en jours, statut)
FORMATIONS = [
    (date(2026, 1, 20), 85, "Hygiène et sécurité alimentaire (HACCP)", "Externe", 2, "Réalisée"),
    (date(2026, 2, 10), 102, "Accueil et relation client", "Interne", 1, "Réalisée"),
    (date(2026, 2, 10), 103, "Accueil et relation client", "Interne", 1, "Réalisée"),
    (date(2026, 3, 9), 17, "Fiscalité de l'entreprise", "Externe", 3, "Réalisée"),
    (date(2026, 3, 24), 150, "Habilitation électrique", "Certifiante", 3, "Réalisée"),
    (date(2026, 4, 14), 71, "Stratégie de contenu digital", "E-learning", 2, "Réalisée"),
    (date(2026, 5, 12), 86, "Techniques de cuisine moderne", "Externe", 2, "Réalisée"),
    (date(2026, 5, 19), 120, "Soins du visage et du corps", "Certifiante", 4, "Réalisée"),
    (date(2026, 6, 16), 104, "Gestion du linge et des chambres", "Interne", 1, "Réalisée"),
    (date(2026, 7, 14), 42, "Droit social et paie", "E-learning", 2, "Réalisée"),
    (date(2026, 9, 22), 90, "Service en salle et vente additionnelle", "Interne", 1, "Réalisée"),
    (date(2026, 9, 22), 91, "Service en salle et vente additionnelle", "Interne", 1, "Réalisée"),
    (date(2026, 10, 13), 151, "Sécurité incendie", "Certifiante", 2, "Réalisée"),
    (date(2026, 10, 27), 72, "Photographie et montage vidéo", "E-learning", 2, "Réalisée"),
    (date(2026, 12, 8), 101, "Management d'équipe", "Externe", 3, "Planifiée"),
    (date(2026, 12, 15), 8, "Contrôle de gestion", "Externe", 2, "Planifiée"),
]

# (date, matricule, niveau, motif)
AVERTISSEMENTS = [
    (date(2026, 2, 18), 96, "1er avertissement", "Absence non justifiée le 17 février 2026"),
    (date(2026, 3, 5), 151, "Avertissement verbal", "Retards répétés"),
    (date(2026, 5, 13), 86, "Avertissement verbal", "Retard de plus d'une heure sans prévenir"),
    (date(2026, 6, 19), 91, "1er avertissement", "Absence non justifiée du 15 au 17 juin 2026"),
    (date(2026, 7, 10), 94, "1er avertissement", "Non-respect des règles d'hygiène en cuisine"),
    (date(2026, 9, 30), 108, "2e avertissement", "Nouvelle absence non justifiée le 28 septembre 2026"),
]
