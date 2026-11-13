"""Construit « tableau-de-bord-rh-complet.xlsx » : tout un service RH dans un seul fichier Excel.

Ce que contient le classeur (c'est ce que montre la vidéo) :
  * 15 documents RH prêts à imprimer, qui se remplissent tout seuls quand on tape un matricule ;
  * 4 tableaux de bord en temps réel (Dashboard RH, Formation, Recrutement, Relations du collaborateur) ;
  * une BASE DE DONNÉES unique, des journaux (absences, formations, avertissements) et la fiche « Info société ».

Utilisation :  python3 construire_classeur.py        (nécessite le paquet XlsxWriter ; OpenPyXL et LibreOffice
sont facultatifs : ils servent uniquement à pré-calculer les valeurs affichées avant la première ouverture).
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import _donnees as D  # noqa: E402
from _base import (  # noqa: E402
    GOLD,
    GREEN,
    INK,
    INPUT,
    LINE,
    MUTED,
    NAVY,
    ORANGE,
    PINK,
    TEAL,
    Book,
)
from _documents import DOCUMENTS, LOGO, construire_documents  # noqa: E402
from _tableaux import (  # noqa: E402
    CALC,
    D_LISTES,
    TABLEAUX,
    construire_calculs,
    tableau_dashboard,
    tableau_formation,
    tableau_recrutement,
    tableau_relations,
)
from xlsxwriter.utility import xl_col_to_name  # noqa: E402

FICHIER = "tableau-de-bord-rh-complet.xlsx"
S_ACCUEIL, S_BASE, S_INFO, S_LISTES = "Accueil", "BASE DE DONNÉES", "Info société", "Listes"
S_ABS, S_FORM, S_AVERT = "Absences", "Suivi formations", "Suivi avertissements"
CAPACITE = 300  # lignes pré-formatées dans la base et les journaux
PREMIERE = 5  # première ligne de données (0-indexée) = ligne Excel 6


def en_tete(bk, ws, titre: str, aide: str, largeur: int, couleur_onglet: str):
    f = bk.fmt
    ws.set_tab_color(couleur_onglet)
    bk.lien(ws, 0, 0, S_ACCUEIL, "🏠 Accueil", f(bold=True, font_size=10, bg_color="#FFD34E", align="center", border=1, border_color="#C99700"))
    bk.merge(ws, 0, 1, 0, largeur, titre, f(bold=True, font_size=16, font_color=NAVY))
    ws.set_row(0, 26)
    bk.merge(ws, 1, 0, 1, largeur, aide, f(font_size=10, font_color=MUTED, text_wrap=True, valign="top"))
    ws.set_row(1, 32)


# =====================================================================
# Info société
# =====================================================================
def feuille_info(bk, ws):
    f = bk.fmt
    ws.hide_gridlines(2)
    ws.set_column(0, 0, 40)
    ws.set_column(1, 1, 46)
    ws.set_column(2, 2, 70)
    en_tete(bk, ws, "Info société", "Renseignez les cellules jaunes : elles se retrouvent automatiquement sur les 15 documents et les tableaux de bord.", 2, NAVY)
    titre = f(bold=True, font_color="#FFFFFF", bg_color=NAVY)
    lib = f(bold=True, border=1, border_color=LINE, indent=1)
    saisie = f(bg_color=INPUT, border=1, border_color=LINE, indent=1)
    aide = f(font_size=9, italic=True, font_color=MUTED, indent=1)
    r = 3
    bk.merge(ws, r, 0, r, 2, "Votre société", titre)
    for cle, libelle, valeur, note in D.SOCIETE:
        r += 1
        ws.write(r, 0, libelle, lib)
        ws.write(r, 1, valeur, saisie)
        ws.write(r, 2, note, aide)
        bk.wb.define_name(f"soc_{cle}", f"='{S_INFO}'!$B${r + 1}")
    r += 2
    bk.merge(ws, r, 0, r, 2, "Paramètres", titre)
    r += 1
    ws.write(r, 0, "Année d’analyse des tableaux de bord", lib)
    bk.f(ws, r, 1, "=YEAR(TODAY())", f(bg_color=INPUT, border=1, border_color=LINE, indent=1, align="left", num_format="0"))
    ws.write(r, 2, "Par défaut : l’année en cours. Tapez une autre année (ex. 2025) pour revoir une période passée.", aide)
    bk.wb.define_name("annee", f"='{S_INFO}'!$B${r + 1}")
    for cle, libelle, valeur, note in D.PARAMETRES:
        r += 1
        ws.write(r, 0, libelle, lib)
        ws.write(r, 1, valeur, f(bg_color=INPUT, border=1, border_color=LINE, indent=1, align="left"))
        ws.write(r, 2, note, aide)
        bk.wb.define_name(f"soc_{cle}", f"='{S_INFO}'!$B${r + 1}")
    ws.set_paper(9)
    ws.set_landscape()
    ws.fit_to_pages(1, 1)
    r += 2
    ws.merge_range(r, 0, r + 2, 2, "Complétez les cellules « (à compléter) » : adresse, RCCM, NIF, CNSS, représentant, téléphone, e-mail. Les modèles de contrats et de lettres sont des modèles généraux : faites-les valider par un juriste avant de les utiliser.", f(text_wrap=True, valign="top", font_size=10, font_color=MUTED, italic=True))


# =====================================================================
# Listes
# =====================================================================
def feuille_listes(bk, ws):
    f = bk.fmt
    ws.set_column(0, 13, 24)
    en_tete(bk, ws, "Listes", "Les menus déroulants de tout le classeur. Ajoutez ou modifiez les éléments en dessous des titres ; "
            "les graphiques affichent les éléments prévus au départ (6 départements, 6 sources…).", 6, "#64748B")
    tete = f(bold=True, font_color="#FFFFFF", bg_color=NAVY, align="center", border=1, border_color=LINE, text_wrap=True)
    saisie = f(bg_color=INPUT, border=1, border_color=LINE)
    for c, (cle, titre, valeurs) in enumerate(D_LISTES):
        ws.write(3, c, titre, tete)
        for i in range(30):
            if i < len(valeurs):
                ws.write(4 + i, c, valeurs[i], saisie)
            else:
                ws.write_blank(4 + i, c, None, saisie)
        col = xl_col_to_name(c)
        bk.wb.define_name(f"l_{cle}", f"=OFFSET({S_LISTES}!${col}$5,0,0,MAX(1,COUNTA({S_LISTES}!${col}$5:${col}$34)),1)")
    c = len(D_LISTES)
    ws.write(3, c, "Mois", tete)
    ws.write(3, c + 1, "Mois (abrégés)", tete)
    for i in range(12):
        ws.write(4 + i, c, D.MOIS[i], f(border=1, border_color=LINE, bg_color="#F8FAFC"))
        ws.write(4 + i, c + 1, D.MOIS_COURTS[i], f(border=1, border_color=LINE, bg_color="#F8FAFC"))
    ws.set_row(3, 30)
    bk.wb.define_name("l_mois", f"={S_LISTES}!${xl_col_to_name(c)}$5:${xl_col_to_name(c)}$16")
    bk.wb.define_name("l_mois_courts", f"={S_LISTES}!${xl_col_to_name(c + 1)}$5:${xl_col_to_name(c + 1)}$16")
    ws.freeze_panes(4, 0)


# =====================================================================
# Tables : base de données et journaux
# =====================================================================
def _format_saisie(bk, genre: str):
    num = {"date": "dd/mm/yyyy", "argent": "#,##0", "entier": "0"}.get(genre)
    kw = dict(bg_color="#FFFBEA", border=1, border_color=LINE)
    if num:
        kw["num_format"] = num
    return bk.fmt(**kw)


def _format_calc(bk, genre: str):
    num = {"date": "dd/mm/yyyy", "argent": "#,##0", "entier": "0", "un": "0.0"}.get(genre)
    kw = dict(bg_color="#EDEFF2", border=1, border_color=LINE, font_color="#374151")
    if num:
        kw["num_format"] = num
    return bk.fmt(**kw)


def ecrire_table(bk, ws, colonnes, lignes_donnees, prefixe: str, nom_feuille: str):
    """colonnes : (clé, titre, largeur, genre, liste, formule(r, L) ou None). Écrit 300 lignes pré-formatées."""
    f = bk.fmt
    L = {c[0]: xl_col_to_name(i) for i, c in enumerate(colonnes)}
    ent_saisie = f(bold=True, font_color="#FFFFFF", bg_color=NAVY, text_wrap=True, align="center", border=1, border_color="#FFFFFF")
    ent_calc = f(bold=True, font_color="#FFFFFF", bg_color="#64748B", text_wrap=True, align="center", border=1, border_color="#FFFFFF")
    ws.set_row(PREMIERE - 1, 36)
    for i, (cle, titre, largeur, genre, liste, formule) in enumerate(colonnes):
        ws.set_column(i, i, largeur)
        ws.write(PREMIERE - 1, i, titre, ent_calc if formule else ent_saisie)
        derniere = PREMIERE + CAPACITE
        bk.wb.define_name(f"{prefixe}_{cle}", f"='{nom_feuille}'!${L[cle]}${PREMIERE + 1}:${L[cle]}${derniere}")
        fmt = _format_calc(bk, genre) if formule else _format_saisie(bk, genre)
        for k in range(CAPACITE):
            r = PREMIERE + k
            if formule:
                bk.f(ws, r, i, formule(r + 1, L), fmt)
            else:
                valeur = lignes_donnees[k].get(cle) if k < len(lignes_donnees) else None
                if valeur in (None, ""):
                    ws.write_blank(r, i, None, fmt)
                else:
                    ws.write(r, i, valeur, fmt)
        if liste and not formule:
            ws.data_validation(PREMIERE, i, PREMIERE + CAPACITE - 1, i, {"validate": "list", "source": f"={liste}", "ignore_blank": True})
    ws.autofilter(PREMIERE - 1, 0, PREMIERE + CAPACITE - 1, len(colonnes) - 1)
    ws.set_paper(9)
    ws.set_landscape()
    ws.fit_to_pages(1, 0)
    ws.repeat_rows(PREMIERE - 1)
    ws.set_default_row(18)
    ws.set_row(PREMIERE - 1, 36)
    return L


def feuille_base(bk, ws):
    cles = ["matricule", "nom", "prenom", "genre", "naissance", "nationalite", "cin", "cnss", "adresse", "ville", "dept",
            "poste", "contrat", "embauche", "fin", "salaire", "primes", "source", "statut", "sortie", "motif"]
    lignes = [dict(zip(cles, e)) for e in D.EMPLOYES]

    def brut(r, L):
        return f'=IF(A{r}="","",N({L["salaire"]}{r})+N({L["primes"]}{r}))'

    def anciennete(r, L):
        return (f'=IF(OR(A{r}="",N({L["embauche"]}{r})=0),"",IFERROR(DATEDIF({L["embauche"]}{r},'
                f'IF(N({L["sortie"]}{r})>0,{L["sortie"]}{r},TODAY()),"Y"),0))')

    def jours(r, L):
        return f'=IF(AND({L["contrat"]}{r}="CDD",{L["statut"]}{r}="Actif",N({L["fin"]}{r})>0),{L["fin"]}{r}-TODAY(),"")'

    def rang(r, L):
        return f'=IF({L["jours"]}{r}="","",{L["jours"]}{r}+A{r}/100000)'

    def droit(r, L):
        e = L["embauche"]
        return (f'=IF(OR(A{r}="",N({e}{r})=0),"",IFERROR(MIN(12,DATEDIF(MAX({e}{r},DATE(annee,1,1)),'
                f'DATE(annee,12,31),"M")+1)*soc_conge,0))')

    def pris(r, L):
        return f'=IF(A{r}="","",SUMIFS(abs_jours,abs_mat,A{r},abs_type,"Congé payé",abs_annee,annee))'

    def solde(r, L):
        return f'=IF(A{r}="","",{L["droit"]}{r}-{L["pris"]}{r})'

    colonnes = [
        ("matricule", "Matricule", 10, "entier", None, None),
        ("nom", "Nom", 16, "texte", None, None),
        ("prenom", "Prénom", 15, "texte", None, None),
        ("genre", "Genre", 10, "texte", "l_genres", None),
        ("naissance", "Date de naissance", 13, "date", None, None),
        ("nationalite", "Nationalité", 13, "texte", None, None),
        ("cin", "CIN / pièce d’identité", 15, "texte", None, None),
        ("cnss", "N° CNSS", 13, "texte", None, None),
        ("adresse", "Adresse", 30, "texte", None, None),
        ("ville", "Ville", 12, "texte", None, None),
        ("dept", "Département", 12, "texte", "l_depts", None),
        ("poste", "Poste", 32, "texte", None, None),
        ("contrat", "Type de contrat", 11, "texte", "l_contrats", None),
        ("embauche", "Date d’embauche", 13, "date", None, None),
        ("fin", "Fin de contrat (CDD)", 14, "date", None, None),
        ("salaire", "Salaire de base mensuel", 14, "argent", None, None),
        ("primes", "Indemnités et primes", 13, "argent", None, None),
        ("source", "Source de recrutement", 21, "texte", "l_sources", None),
        ("statut", "Statut", 9, "texte", "l_statuts", None),
        ("sortie", "Date de sortie", 13, "date", None, None),
        ("motif", "Motif de sortie", 21, "texte", "l_motifs", None),
        ("brut", "Rémunération brute", 14, "argent", None, brut),
        ("anciennete", "Ancienneté (années)", 12, "entier", None, anciennete),
        ("jours", "Jours restants (CDD)", 12, "entier", None, jours),
        ("rang", "Rang échéance", 10, "un", None, rang),
        ("droit", "Congés annuels (jours)", 12, "un", None, droit),
        ("pris", "Congés pris (jours)", 12, "un", None, pris),
        ("solde", "Solde de congés (jours)", 12, "un", None, solde),
    ]
    en_tete(bk, ws, "BASE DE DONNÉES — vos collaborateurs",
            "Une ligne = un collaborateur (jusqu’à 300). Cellules jaunes : à saisir ou à coller. Colonnes grises : calculées automatiquement. "
            "Les 31 collaborateurs ci-dessous sont des EXEMPLES FICTIFS : remplacez-les par les vôtres. Le matricule doit être unique.", 12, "#F6B800")
    ecrire_table(bk, ws, colonnes, lignes, "bd", S_BASE)
    ws.freeze_panes(PREMIERE, 3)
    ws.conditional_format(PREMIERE, 0, PREMIERE + CAPACITE - 1, 0, {"type": "duplicate", "format": bk.wb.add_format({"bg_color": "#F8B4B4", "font_color": "#7F1D1D"})})
    bk.wb.define_name("l_matricules", f"=OFFSET('{S_BASE}'!$A$6,0,0,MAX(1,COUNT('{S_BASE}'!$A$6:$A${PREMIERE + CAPACITE})),1)")
    ws.data_validation(PREMIERE, 0, PREMIERE + CAPACITE - 1, 0, {"validate": "integer", "criteria": ">", "value": 0, "error_title": "Matricule", "error_message": "Saisissez un matricule numérique, unique."})


def _nom_collab(mat):
    return lambda r, L: (f'=IF({L[mat]}{r}="","",IFERROR(INDEX(bd_nom,MATCH({L[mat]}{r},bd_matricule,0))&" "&'
                         f'INDEX(bd_prenom,MATCH({L[mat]}{r},bd_matricule,0)),"Matricule inconnu"))')


def _dept_collab(mat):
    return lambda r, L: f'=IF({L[mat]}{r}="","",IFERROR(INDEX(bd_dept,MATCH({L[mat]}{r},bd_matricule,0)),""))'


def _annee(date):
    return lambda r, L: f'=IF({L[date]}{r}="","",YEAR({L[date]}{r}))'


def feuille_absences(bk, ws):
    cles = ["debut", "fin", "mat", "type", "ret", "justifie", "obs"]
    lignes = [dict(zip(cles, a)) for a in D.ABSENCES]
    colonnes = [
        ("debut", "Date de début", 13, "date", None, None),
        ("fin", "Date de fin", 13, "date", None, None),
        ("mat", "Matricule", 11, "entier", "l_matricules", None),
        ("nom", "Collaborateur", 26, "texte", None, _nom_collab("mat")),
        ("dept", "Département", 13, "texte", None, _dept_collab("mat")),
        ("type", "Type d’absence", 20, "texte", "l_types_abs", None),
        ("jours", "Nombre de jours", 11, "entier", None,
         lambda r, L: f'=IF(OR({L["mat"]}{r}="",{L["debut"]}{r}=""),"",IF({L["type"]}{r}="Retard",0,IF(N({L["fin"]}{r})=0,1,{L["fin"]}{r}-{L["debut"]}{r}+1)))'),
        ("ret", "Retard (minutes)", 12, "entier", None, None),
        ("justifie", "Justifié ?", 10, "texte", "l_justifie", None),
        ("annee", "Année", 8, "entier", None, _annee("debut")),
        ("obs", "Observation", 34, "texte", None, None),
    ]
    en_tete(bk, ws, "Absences, congés et retards", "Une ligne par absence ou par retard. Saisissez le matricule : le nom et le département se remplissent. "
            "Pour un retard, choisissez « Retard » et indiquez les minutes. Alimente les tableaux « Relations du collaborateur » et le solde de congés.", 9, "#F6B800")
    ecrire_table(bk, ws, colonnes, lignes, "abs", S_ABS)
    ws.freeze_panes(PREMIERE, 0)


def feuille_formations(bk, ws):
    cles = ["date", "mat", "intitule", "type", "jours", "statut"]
    lignes = [dict(zip(cles, a)) for a in D.FORMATIONS]
    colonnes = [
        ("date", "Date", 13, "date", None, None),
        ("mat", "Matricule", 11, "entier", "l_matricules", None),
        ("nom", "Collaborateur", 26, "texte", None, _nom_collab("mat")),
        ("dept", "Département", 13, "texte", None, _dept_collab("mat")),
        ("intitule", "Intitulé de la formation", 42, "texte", None, None),
        ("type", "Type", 14, "texte", "l_types_form", None),
        ("jours", "Durée (jours)", 11, "entier", None, None),
        ("statut", "Statut", 12, "texte", "l_statut_form", None),
        ("annee", "Année", 8, "entier", None, _annee("date")),
    ]
    en_tete(bk, ws, "Suivi des formations", "Une ligne par collaborateur formé. Statut « Réalisée » : compté dans le tableau de bord Formation ; « Planifiée » : à venir.", 8, "#F6B800")
    ecrire_table(bk, ws, colonnes, lignes, "fo", S_FORM)
    ws.freeze_panes(PREMIERE, 0)


def feuille_avertissements(bk, ws):
    cles = ["date", "mat", "niveau", "motif"]
    lignes = [dict(zip(cles, a)) for a in D.AVERTISSEMENTS]
    colonnes = [
        ("date", "Date", 13, "date", None, None),
        ("mat", "Matricule", 11, "entier", "l_matricules", None),
        ("nom", "Collaborateur", 26, "texte", None, _nom_collab("mat")),
        ("dept", "Département", 13, "texte", None, _dept_collab("mat")),
        ("niveau", "Niveau", 22, "texte", "l_niveaux", None),
        ("motif", "Motif", 56, "texte", None, None),
        ("annee", "Année", 8, "entier", None, _annee("date")),
    ]
    en_tete(bk, ws, "Suivi des avertissements", "Une ligne par sanction. La lettre d’avertissement se génère dans l’onglet « Avertissement ».", 7, "#F6B800")
    ecrire_table(bk, ws, colonnes, lignes, "av", S_AVERT)
    ws.freeze_panes(PREMIERE, 0)


# =====================================================================
# Accueil
# =====================================================================
def feuille_accueil(bk, ws):
    f = bk.fmt
    ws.hide_gridlines(2)
    ws.set_tab_color(ORANGE)
    ws.set_column(0, 0, 2)
    ws.set_column(1, 12, 13.5)
    ws.set_column(13, 13, 2)
    fond = f(bg_color=NAVY)
    for r in range(0, 5):
        for c in range(0, 14):
            ws.write_blank(r, c, None, fond)
    ws.set_row(0, 22)
    ws.set_row(1, 40)
    ws.set_row(2, 24)
    # Tuile blanche du logo à gauche, titre sur fond marine à droite
    ws.merge_range(0, 1, 3, 2, "", f(bg_color="#FFFFFF"))
    if LOGO.exists():
        ws.insert_image(0, 1, str(LOGO), {"x_scale": 0.33, "y_scale": 0.33, "x_offset": 30, "y_offset": 8, "object_position": 2})
    ws.merge_range(0, 3, 2, 12, "", f(bg_color=NAVY, align="center", font_size=30, bold=True))
    ws.write_rich_string(0, 3, f(bold=True, font_size=30, font_color="#FFFFFF"), "Le Tableau de bord ", f(bold=True, font_size=30, font_color=ORANGE), "RH complet",
                         f(bg_color=NAVY, align="center"))
    bk.merge(ws, 3, 3, 3, 12, '=soc_nom&" "&soc_forme&"  ·  Tout votre service RH dans un seul fichier"',
             f(bold=True, font_size=15, font_color="#FFFFFF", bg_color=NAVY, align="center"))
    ws.set_row(3, 28)
    ws.set_row(4, 14)

    def section(r, texte):
        ws.set_row(r, 30)
        bk.merge(ws, r, 1, r, 12, texte, f(bold=True, font_size=15, font_color=ORANGE, bottom=2, bottom_color=ORANGE))

    section(6, "Comment ça marche")
    cartes = [
        (TEAL, "1 · Votre société", "Renseignez votre entreprise dans l’onglet « Info société » : nom, adresse, représentant. Tout se retrouve sur les documents."),
        (PINK, "2 · Vos collaborateurs", "Saisissez ou collez vos collaborateurs dans « BASE DE DONNÉES » (jusqu’à 300). Un matricule par personne."),
        (ORANGE, "3 · Un matricule, un document", "Ouvrez un document, tapez le matricule en haut à droite : nom, poste, salaire et dates se remplissent tout seuls."),
    ]
    for k, (couleur, titre, texte) in enumerate(cartes):
        c = 1 + 4 * k
        bk.merge(ws, 7, c, 7, c + 3, titre, f(bold=True, font_size=12, font_color="#FFFFFF", bg_color=couleur, align="center"))
        bk.merge(ws, 8, c, 8, c + 3, texte, f(text_wrap=True, valign="top", font_size=10, border=1, border_color=couleur, indent=1))
    ws.set_row(7, 26)
    ws.set_row(8, 64)

    section(10, "4 tableaux de bord en temps réel")
    for k, (feuille, _, titre) in enumerate(TABLEAUX):
        c = 1 + 3 * k
        bk.lien(ws, 11, c, feuille, titre, f(bold=True, font_color="#FFFFFF", bg_color=GREEN, align="center", border=2, border_color="#FFFFFF", text_wrap=True), col2=c + 2)
    ws.set_row(11, 40)

    section(13, "15 documents RH prêts à imprimer")
    for k, (feuille, _, _) in enumerate(DOCUMENTS):
        r, c = 14 + k // 3, 1 + 4 * (k % 3)
        ws.set_row(r, 32)
        bk.lien(ws, r, c, feuille, f"{k + 1:02d} · {feuille}", f(bold=True, font_color="#FFFFFF", bg_color=PINK, align="center", border=2, border_color="#FFFFFF"), col2=c + 3)

    section(20, "Vos données")
    donnees = [S_BASE, S_INFO, S_ABS, S_FORM, S_AVERT, S_LISTES]
    for k, nom in enumerate(donnees):
        r, c = 21 + k // 3, 1 + 4 * (k % 3)
        ws.set_row(r, 32)
        bk.lien(ws, r, c, nom, nom, f(bold=True, font_color="#FFFFFF", bg_color=NAVY, align="center", border=2, border_color="#FFFFFF"), col2=c + 3)

    section(24, "Légende")
    bk.merge(ws, 25, 1, 25, 3, "Cellule à saisir", f(bg_color=INPUT, border=1, border_color=LINE, align="center"))
    bk.merge(ws, 25, 4, 25, 7, "Calcul automatique : ne pas modifier", f(bg_color="#EDEFF2", border=1, border_color=LINE, align="center"))
    bk.merge(ws, 25, 8, 25, 9, "Matricule", f(bold=True, font_color="#FFFFFF", bg_color=PINK, align="center"))
    bk.merge(ws, 25, 10, 25, 12, "170", f(bold=True, font_color="#FFFFFF", bg_color=TEAL, align="center"))
    ws.set_row(25, 24)

    ws.merge_range(27, 1, 28, 12, "Essayez tout de suite : ouvrez « Contrat CDI » (matricule 170), « Bon de sortie » ou « Demande de congé » (matricule 42), puis remplacez le matricule par 17, 55, 90… "
                   "Tout se met à jour. Les tableaux de bord se calculent depuis la BASE DE DONNÉES et les journaux.",
                   f(text_wrap=True, valign="top", font_size=10, font_color=INK, bg_color="#FFF7E6", border=1, border_color=GOLD, indent=1))
    ws.merge_range(30, 1, 31, 12, "Les collaborateurs, montants et dates de ce classeur sont des exemples fictifs. Les modèles de contrats et de lettres sont des textes généraux : "
                   "faites-les valider par un juriste avant tout usage officiel. Imprimez chaque document avec Ctrl + P : la zone d’impression est déjà réglée (A4).",
                   f(text_wrap=True, valign="top", font_size=9, italic=True, font_color=MUTED, indent=1))
    ws.set_paper(9)
    ws.fit_to_pages(1, 1)
    ws.print_area(0, 0, 32, 13)


# =====================================================================
# Assemblage
# =====================================================================
def construire(chemin: Path, cache: dict):
    bk = Book(str(chemin), cache)
    ordre = [S_ACCUEIL] + [t[0] for t in TABLEAUX] + [S_BASE, S_INFO] + [d[0] for d in DOCUMENTS] + [S_ABS, S_FORM, S_AVERT, S_LISTES, CALC]
    feuilles = {nom: bk.wb.add_worksheet(nom) for nom in ordre}

    feuille_info(bk, feuilles[S_INFO])
    feuille_listes(bk, feuilles[S_LISTES])
    feuille_base(bk, feuilles[S_BASE])
    feuille_absences(bk, feuilles[S_ABS])
    feuille_formations(bk, feuilles[S_FORM])
    feuille_avertissements(bk, feuilles[S_AVERT])
    jauge_titre, jauge_plage = construire_calculs(bk, feuilles[CALC])
    tableau_dashboard(bk, feuilles["Dashboard RH"])
    tableau_formation(bk, feuilles["Formation"])
    tableau_recrutement(bk, feuilles["Recrutement de talents"])
    tableau_relations(bk, feuilles["Relations du collaborateur"], jauge_titre, jauge_plage)
    construire_documents(bk, feuilles)
    feuille_accueil(bk, feuilles[S_ACCUEIL])
    feuilles[S_ACCUEIL].activate()
    bk.close()
    return bk.formulas


def recalculer(xlsx: Path, formules) -> dict:
    """Fait calculer le classeur par LibreOffice puis relit les résultats : ils sont réinjectés comme valeurs affichées."""
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        print("LibreOffice introuvable : les valeurs seront calculées à l'ouverture dans Excel.")
        return {}
    import datetime as dt

    from openpyxl import load_workbook
    from openpyxl.utils.datetime import to_excel

    with tempfile.TemporaryDirectory() as tmp:
        sortie = Path(tmp) / "sortie"
        sortie.mkdir()
        profil = Path(tmp) / "profil"
        (profil / "user").mkdir(parents=True)
        # Par défaut LibreOffice ne recalcule pas les fichiers Excel à l'ouverture : on lui impose un recalcul complet.
        (profil / "user" / "registrymodifications.xcu").write_text(
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" '
            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n'
            '<item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="OOXMLRecalcMode" oor:op="fuse">'
            "<value>0</value></prop></item>\n</oor:items>\n",
            encoding="utf-8",
        )
        subprocess.run(
            [soffice, f"-env:UserInstallation=file://{profil}", "--headless", "--convert-to", "xlsx:Calc MS Excel 2007 XML", "--outdir", str(sortie), str(xlsx)],
            check=True, capture_output=True, timeout=300,
        )
        classeur = load_workbook(sortie / xlsx.name, data_only=True)
        cache = {}
        for feuille, r, c in formules:
            v = classeur[feuille].cell(row=r + 1, column=c + 1).value
            if isinstance(v, (dt.datetime, dt.date)):
                v = to_excel(v)
            elif isinstance(v, dt.time):
                v = (v.hour * 3600 + v.minute * 60 + v.second) / 86400
            cache[(feuille, r, c)] = "" if v is None else v
    return cache


def main():
    dossier = Path(__file__).resolve().parent
    final = dossier / FICHIER
    with tempfile.TemporaryDirectory() as tmp:
        brouillon = Path(tmp) / FICHIER
        formules = construire(brouillon, {})
        cache = recalculer(brouillon, formules)
    construire(final, cache)
    print(f"{final.name} : {len(formules)} formules, {len(cache)} valeurs pré-calculées.")


if __name__ == "__main__":
    main()
