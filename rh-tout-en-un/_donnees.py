"""Listes déroulantes et données d'exemple (fictives) du classeur."""

from __future__ import annotations

from datetime import date, timedelta

AUJOURD_HUI = date.today()


def dans(jours: int) -> date:
    return AUJOURD_HUI + timedelta(days=jours)


SOCIETE = [
    # (clé, libellé, valeur d'exemple, aide)
    ("nom", "Raison sociale", "Multimédia Glory Guinée", "Nom de votre entreprise, tel qu'il doit figurer sur les documents."),
    ("forme", "Forme juridique", "SARL", "SARL, SARLU, SA, SAS, entreprise individuelle…"),
    ("adresse", "Adresse du siège", "(à compléter)", "Rue, quartier, commune. Figure dans l'en-tête de chaque document."),
    ("ville", "Ville", "Conakry", "Sert aussi pour « Fait à … » en bas des documents."),
    ("pays", "Pays", "Guinée", ""),
    ("rc", "N° RCCM (registre du commerce)", "(à compléter)", ""),
    ("patente", "NIF (identifiant fiscal)", "(à compléter)", ""),
    ("cnss", "N° d'affiliation CNSS de l'entreprise", "(à compléter)", "Caisse nationale de sécurité sociale."),
    ("rep", "Représentant légal", "(à compléter)", "Personne qui signe les documents (ex. le Gérant)."),
    ("qualite", "Qualité du représentant", "Gérant", ""),
    ("tel", "Téléphone", "(à compléter)", ""),
    ("email", "E-mail", "(à compléter)", ""),
    ("devise", "Devise", "GNF", "Texte affiché après les montants (GNF, MAD, XOF, EUR…)."),
]

PARAMETRES = [
    ("essai", "Période d'essai (mois)", 3, "Reprise dans les contrats et la confirmation de fin d'essai. À vérifier selon votre Code du travail."),
    ("heures", "Durée hebdomadaire du travail (heures)", 40, "Reprise dans les contrats. À vérifier selon votre Code du travail."),
    ("conge", "Congés payés acquis par mois (jours)", 1.5, "Reprise dans le solde de congés. À adapter à votre Code du travail ou convention."),
    ("preavis", "Préavis (jours)", 30, "Reprise dans la lettre de licenciement et l'accusé de démission."),
]

DEPARTEMENTS = ["Adm/Fin", "Comm.", "Prod.", "Digital", "Commercial", "Techn."]
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
G = "Guinéenne"
EMPLOYES = [
    (8, "Camara", "Mariama", "Femme", date(1984, 3, 12), G, "GN2041875", "108452671", "Quartier Almamya, Kaloum", "Conakry", "Adm/Fin", "Directrice administrative et financière", "CDI", date(2016, 2, 1), None, 12000000, 1500000, "Cooptation", A, None, None),
    (17, "Diallo", "Mamadou", "Homme", date(1990, 7, 23), G, "GN3120934", "109563782", "Quartier Camayenne, Dixinn", "Conakry", "Adm/Fin", "Comptable", "CDI", date(2019, 9, 2), None, 5000000, 500000, "LinkedIn", A, None, None),
    (42, "Bah", "Ibrahima", "Homme", date(1993, 1, 15), G, "GN2218406", "110674893", "Quartier Kipé, Ratoma", "Conakry", "Adm/Fin", "Assistant ressources humaines", "CDI", date(2021, 3, 15), None, 3500000, 300000, "Candidature spontanée", A, None, None),
    (55, "Barry", "Aïssatou", "Femme", date(1988, 11, 2), G, "GN1907251", "111785904", "Quartier Taouyah, Ratoma", "Conakry", "Adm/Fin", "Assistante de direction", "CDI", date(2018, 6, 1), None, 4000000, 400000, "Cooptation", A, None, None),
    (63, "Sylla", "Fanta", "Femme", date(1999, 5, 30), G, "GN4412087", "112896015", "Quartier Sonfonia, Ratoma", "Conakry", "Adm/Fin", "Aide-comptable", "CDD", date(2026, 5, 4), dans(36), 2200000, 150000, "Agence d'emploi", A, None, None),
    (170, "Touré", "Sékou", "Homme", date(1987, 9, 9), G, "GN1730568", "113907126", "Quartier Nongo, Ratoma", "Conakry", "Adm/Fin", "Responsable achats", "CDI", date(2022, 2, 14), None, 5500000, 500000, "LinkedIn", A, None, None),
    (71, "Soumah", "Alpha", "Homme", date(1985, 4, 18), G, "GN1805932", "114018237", "Quartier Lambanyi, Ratoma", "Conakry", "Comm.", "Responsable communication", "CDI", date(2020, 1, 6), None, 7000000, 700000, "LinkedIn", A, None, None),
    (72, "Keïta", "Mariam", "Femme", date(1995, 12, 6), G, "GN3350471", "115129348", "Quartier Matam, Matam", "Conakry", "Comm.", "Community manager", "CDI", date(2022, 10, 3), None, 3800000, 300000, "Annonce", A, None, None),
    (74, "Bangoura", "Moussa", "Homme", date(1997, 8, 21), G, "GN3987214", "116230459", "Quartier Hamdallaye, Ratoma", "Conakry", "Comm.", "Graphiste", "CDD", date(2026, 3, 2), dans(15), 3000000, 0, "Candidature spontanée", A, None, None),
    (85, "Condé", "Mohamed", "Homme", date(1979, 2, 25), G, "GN1204419", "117341560", "Quartier Dixinn Port, Dixinn", "Conakry", "Prod.", "Chef de production", "CDI", date(2017, 4, 10), None, 8000000, 800000, "Cooptation", A, None, None),
    (86, "Sow", "Hawa", "Femme", date(1986, 6, 14), G, "GN1660925", "118452671", "Quartier Bellevue, Dixinn", "Conakry", "Prod.", "Réalisatrice", "CDI", date(2019, 2, 18), None, 5000000, 500000, "Annonce", A, None, None),
    (90, "Camara", "Abdoulaye", "Homme", date(1994, 10, 3), G, "GN2780163", "119563782", "Quartier Coléah, Matam", "Conakry", "Prod.", "Cadreur", "CDI", date(2020, 6, 1), None, 3200000, 300000, "Annonce", A, None, None),
    (91, "Diakité", "Kadiatou", "Femme", date(1996, 3, 27), G, "GN3012748", "120674893", "Quartier Madina, Matam", "Conakry", "Prod.", "Monteuse", "CDI", date(2021, 7, 12), None, 3200000, 300000, "Annonce", A, None, None),
    (93, "Traoré", "Lansana", "Homme", date(2000, 1, 11), G, "GN4120386", "121785904", "Quartier Enta, Matoto", "Conakry", "Prod.", "Preneur de son", "CDD", date(2026, 6, 1), dans(16), 2500000, 200000, "Agence d'emploi", A, None, None),
    (94, "Fofana", "Ousmane", "Homme", date(2001, 7, 19), G, "GN4285519", "122896015", "Quartier Dabondy, Matoto", "Conakry", "Prod.", "Assistant de production", "CDD", date(2026, 5, 15), dans(40), 2000000, 150000, "Candidature spontanée", A, None, None),
    (95, "Baldé", "Nènè", "Femme", date(1998, 9, 1), G, "GN3641027", "123907126", "Quartier Gbessia, Matoto", "Conakry", "Prod.", "Scripte", "CDI", date(2023, 3, 6), None, 2500000, 200000, "LinkedIn", S, date(2026, 8, 31), "Démission"),
    (96, "Doumbouya", "Sidiki", "Homme", date(2002, 2, 8), G, "GN4398672", "124018237", "Quartier Yimbaya, Matoto", "Conakry", "Prod.", "Technicien de plateau", "CDI", date(2024, 1, 8), None, 2000000, 200000, "Annonce", A, None, None),
    (97, "Cissé", "Fatoumata", "Femme", date(1983, 5, 16), G, "GN1490835", "125129348", "Quartier Landréah, Dixinn", "Conakry", "Prod.", "Productrice exécutive", "CDI", date(2018, 11, 5), None, 6500000, 600000, "Cooptation", A, None, None),
    (101, "Sidibé", "Lamine", "Homme", date(1977, 8, 4), G, "GN1011293", "126230459", "Quartier Kaloum Centre, Kaloum", "Conakry", "Digital", "Directeur digital", "CDI", date(2015, 9, 1), None, 10000000, 1000000, "Cooptation", A, None, None),
    (102, "Camara", "Ramatoulaye", "Femme", date(1994, 6, 22), G, "GN2977450", "127341560", "Quartier Minière, Dixinn", "Conakry", "Digital", "Cheffe de projet digital", "CDI", date(2020, 2, 3), None, 5500000, 500000, "LinkedIn", A, None, None),
    (103, "Diallo", "Thierno", "Homme", date(1991, 11, 30), G, "GN2330651", "128452671", "Quartier Simbaya, Ratoma", "Conakry", "Digital", "Développeur web", "CDI", date(2021, 11, 22), None, 5000000, 400000, "Annonce", A, None, None),
    (104, "Barry", "Fatou", "Femme", date(1982, 4, 9), G, "GN1588904", "129563782", "Quartier Centre, Coyah", "Coyah", "Digital", "Webdesigner", "CDI", date(2019, 5, 13), None, 3800000, 300000, "Cooptation", A, None, None),
    (106, "Soumah", "Mamadou", "Homme", date(1999, 12, 12), G, "GN3880213", "130674893", "Quartier Bambeto, Ratoma", "Conakry", "Digital", "Intégrateur web", "CDD", date(2026, 2, 16), dans(80), 2500000, 200000, "Agence d'emploi", A, None, None),
    (107, "Bah", "Mariama", "Femme", date(1992, 1, 28), G, "GN3015527", "131785904", "Quartier Cosa, Ratoma", "Conakry", "Digital", "Rédactrice web", "CDI", date(2022, 4, 4), None, 2800000, 200000, "Annonce", S, date(2026, 4, 30), "Licenciement"),
    (108, "Sylla", "Karamoko", "Homme", date(1996, 7, 7), G, "GN3547790", "132896015", "Quartier Dar-es-Salam, Matam", "Conakry", "Digital", "Développeur mobile", "CDI", date(2023, 9, 18), None, 4800000, 400000, "Annonce", A, None, None),
    (120, "Touré", "Hadja", "Femme", date(1985, 10, 20), G, "GN1755836", "133907126", "Quartier Camayenne, Dixinn", "Conakry", "Commercial", "Responsable commerciale", "CDI", date(2018, 3, 5), None, 7500000, 700000, "LinkedIn", A, None, None),
    (121, "Keïta", "Aminata", "Femme", date(1993, 3, 3), G, "GN2730112", "134018237", "Quartier Kaporo, Ratoma", "Conakry", "Commercial", "Chargée de clientèle", "CDI", date(2021, 5, 17), None, 3500000, 300000, "Candidature spontanée", A, None, None),
    (122, "Konaté", "Mariame", "Femme", date(2000, 6, 15), G, "GN4090764", "135129348", "Quartier Kobaya, Ratoma", "Conakry", "Commercial", "Commerciale terrain", "CDD", date(2026, 9, 1), dans(109), 2800000, 200000, "École / Stage", A, None, None),
    (150, "Condé", "Alhassane", "Homme", date(1981, 1, 31), G, "GN1377321", "136230459", "Quartier Boulbinet, Kaloum", "Conakry", "Techn.", "Responsable technique", "CDI", date(2016, 8, 22), None, 8500000, 800000, "Cooptation", A, None, None),
    (151, "Sow", "Mamoudou", "Homme", date(1990, 5, 5), G, "GN2560598", "137341560", "Quartier Hafia, Dixinn", "Conakry", "Techn.", "Technicien réseau", "CDI", date(2020, 9, 7), None, 3800000, 300000, "Annonce", A, None, None),
    (152, "Bangoura", "Aboubacar", "Homme", date(1989, 9, 17), G, "GN2184406", "138452671", "Quartier Sangoyah, Matoto", "Conakry", "Techn.", "Technicien informatique", "CDI", date(2022, 1, 10), None, 3500000, 300000, "Annonce", S, date(2026, 2, 28), "Démission"),
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
    (date(2026, 1, 20), 85, "Gestion de production audiovisuelle", "Externe", 2, "Réalisée"),
    (date(2026, 2, 10), 102, "Gestion de projet agile (Scrum)", "Interne", 1, "Réalisée"),
    (date(2026, 2, 10), 103, "Gestion de projet agile (Scrum)", "Interne", 1, "Réalisée"),
    (date(2026, 3, 9), 17, "Fiscalité de l'entreprise", "Externe", 3, "Réalisée"),
    (date(2026, 3, 24), 150, "Habilitation électrique", "Certifiante", 3, "Réalisée"),
    (date(2026, 4, 14), 71, "Stratégie de contenu digital", "E-learning", 2, "Réalisée"),
    (date(2026, 5, 12), 86, "Techniques de réalisation et d'écriture", "Externe", 2, "Réalisée"),
    (date(2026, 5, 19), 120, "Techniques de vente et négociation", "Certifiante", 4, "Réalisée"),
    (date(2026, 6, 16), 104, "Design d'interface (UI/UX)", "Interne", 1, "Réalisée"),
    (date(2026, 7, 14), 42, "Droit social et paie", "E-learning", 2, "Réalisée"),
    (date(2026, 9, 22), 90, "Prise de vue et lumière", "Interne", 1, "Réalisée"),
    (date(2026, 9, 22), 91, "Montage vidéo avancé", "Interne", 1, "Réalisée"),
    (date(2026, 10, 13), 151, "Sécurité des réseaux", "Certifiante", 2, "Réalisée"),
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
    (date(2026, 7, 10), 94, "1er avertissement", "Non-respect des consignes de sécurité sur le plateau"),
    (date(2026, 9, 30), 108, "2e avertissement", "Nouvelle absence non justifiée le 28 septembre 2026"),
]
