"""Feuille « Calculs » (tous les chiffres, en formules) et les 4 tableaux de bord qui l'affichent."""

from __future__ import annotations

import _donnees as D
from _base import BLUE, GOLD, GREEN, GREEN_DK, GREEN_LT, INK, LINE, MUTED, NAVY, ORANGE, PINK, TEAL
from xlsxwriter.utility import xl_col_to_name

CALC = "Calculs"
LISTES = "Listes"
TABLEAUX = [
    # (feuille, libellé court du bouton, titre)
    ("Dashboard RH", "Dashboard RH", "Tableau de bord RH"),
    ("Formation", "Formation", "Formation"),
    ("Recrutement de talents", "Recrutement", "Recrutement de talents"),
    ("Relations du collaborateur", "Relations collab.", "Relations du collaborateur"),
]
PALETTE = [ORANGE, TEAL, PINK, BLUE, GOLD, GREEN, "#8B5CF6", "#64748B"]


# =====================================================================
# Feuille Calculs
# =====================================================================
def _liste(cle: str, i: int) -> str:
    """Référence de la i-ème valeur d'une liste de la feuille Listes."""
    col = [k for k, *_ in D_LISTES].index(cle)
    return f"{LISTES}!${xl_col_to_name(col)}${5 + i}"


D_LISTES = [
    ("depts", "Départements", D.DEPARTEMENTS),
    ("contrats", "Types de contrat", D.CONTRATS),
    ("genres", "Genres", D.GENRES),
    ("statuts", "Statuts", D.STATUTS),
    ("sources", "Sources de recrutement", D.SOURCES),
    ("motifs", "Motifs de sortie", D.MOTIFS_SORTIE),
    ("types_abs", "Types d'absence", D.TYPES_ABSENCE),
    ("types_form", "Types de formation", D.TYPES_FORMATION),
    ("niveaux", "Niveaux d'avertissement", D.NIVEAUX_AVERT),
    ("justifie", "Justifié ?", D.JUSTIFIE),
    ("natures", "Natures de congé", D.NATURES_CONGE),
    ("statut_form", "Statut de formation", D.STATUT_FORMATION),
]

ANNEE = "DATE(annee,1,1)"
FIN_ANNEE = "DATE(annee,12,31)"
DANS_ANNEE_EMB = f'bd_embauche,">="&{ANNEE},bd_embauche,"<="&{FIN_ANNEE}'
DANS_ANNEE_SOR = f'bd_sortie,">="&{ANNEE},bd_sortie,"<="&{FIN_ANNEE}'

# Positions des blocs de la feuille Calculs (lignes 0-indexées)
L_DEPT = 3  # 1re ligne de données du bloc « par département »
L_MOIS = 14
L_DIST = 30
L_KPI = 40
L_ECH = 64

# KPI : (nom, libellé, formule, format)
KPI = [
    ("k_effectif", "Effectif actif", '=COUNTIF(bd_statut,"Actif")', "0"),
    ("k_masse", "Masse salariale mensuelle brute", '=SUMIFS(bd_brut,bd_statut,"Actif")', "#,##0"),
    ("k_cdi", "Total CDI (actifs)", '=COUNTIFS(bd_statut,"Actif",bd_contrat,"CDI")', "0"),
    ("k_cdd", "Total CDD (actifs)", '=COUNTIFS(bd_statut,"Actif",bd_contrat,"CDD")', "0"),
    ("k_embauches", "Embauches de l'année", f"=COUNTIFS({DANS_ANNEE_EMB})", "0"),
    ("k_sorties", "Sorties de l'année", f"=COUNTIFS({DANS_ANNEE_SOR})", "0"),
    ("k_eff_debut", "Effectif au 1er janvier", f'=COUNTIFS(bd_embauche,"<"&{ANNEE})-COUNTIFS(bd_sortie,"<"&{ANNEE})', "0"),
    ("k_turnover", "Turnover de l'année", "=IF((k_eff_debut+k_effectif)=0,0,k_sorties/((k_eff_debut+k_effectif)/2))", "0.00%"),
    ("k_echeances", "Contrats à échéance (30 jours)", '=COUNTIFS(bd_jours,"<=30")', "0"),
    ("k_abs_jours", "Absences (jours, hors congés payés)", '=SUMIFS(abs_jours,abs_annee,annee,abs_type,"<>Congé payé")', "0"),
    ("k_retards", "Retards (minutes)", "=SUMIFS(abs_ret,abs_annee,annee)", "#,##0"),
    ("k_avert", "Avertissements de l'année", "=COUNTIFS(av_annee,annee)", "0"),
    ("k_form_nb", "Formations réalisées", '=COUNTIFS(fo_annee,annee,fo_statut,"Réalisée")', "0"),
    ("k_form_jours", "Jours de formation", '=SUMIFS(fo_jours,fo_annee,annee,fo_statut,"Réalisée")', "0"),
    ("k_formes", "Collaborateurs formés", '=SUMPRODUCT((bd_statut="Actif")*(COUNTIFS(fo_mat,bd_matricule,fo_annee,annee,fo_statut,"Réalisée")>0))', "0"),
    ("k_taux_form", "Taux de formation", "=IF(k_effectif=0,0,k_formes/k_effectif)", "0%"),
    ("k_solde_net", "Solde embauches − sorties", "=k_embauches-k_sorties", "+0;-0;0"),
]


def construire_calculs(bk, ws):
    f = bk.fmt
    ws.set_tab_color("#64748B")
    ws.set_column(0, 0, 30)
    ws.set_column(1, 22, 15)
    ws.write(0, 0, "Calculs — feuille technique : tout est calculé à partir de la BASE DE DONNÉES et des journaux. Ne rien saisir ici.", f(bold=True, font_size=12, font_color=NAVY))
    tete = f(bold=True, font_color="#FFFFFF", bg_color=NAVY, text_wrap=True, align="center", border=1, border_color=LINE)
    cell = f(border=1, border_color=LINE, bg_color="#F8FAFC")
    pct = f(border=1, border_color=LINE, bg_color="#F8FAFC", num_format="0%")
    nombre = f(border=1, border_color=LINE, bg_color="#F8FAFC", num_format="#,##0")

    # --- Par département ---
    ws.write(1, 0, "Par département", f(bold=True, font_color=ORANGE))
    for j, t in enumerate(["Département", "Effectif actif", "Masse salariale", "Collaborateurs formés", "Taux de formation", "Absences (jours)", "Retards (min)", "Avertissements", "Embauches", "Sorties"]):
        ws.write(2, j, t, tete)
    for i in range(len(D.DEPARTEMENTS)):
        r = L_DEPT + i
        a = f"$A{r + 1}"
        bk.f(ws, r, 0, f"={_liste('depts', i)}", cell)
        bk.f(ws, r, 1, f'=COUNTIFS(bd_dept,{a},bd_statut,"Actif")', nombre)
        bk.f(ws, r, 2, f'=SUMIFS(bd_brut,bd_dept,{a},bd_statut,"Actif")', nombre)
        bk.f(ws, r, 3, f'=SUMPRODUCT((bd_dept={a})*(bd_statut="Actif")*(COUNTIFS(fo_mat,bd_matricule,fo_annee,annee,fo_statut,"Réalisée")>0))', nombre)
        bk.f(ws, r, 4, f"=IF(B{r + 1}=0,0,D{r + 1}/B{r + 1})", pct)
        bk.f(ws, r, 5, f'=SUMIFS(abs_jours,abs_dept,{a},abs_annee,annee,abs_type,"<>Congé payé")', nombre)
        bk.f(ws, r, 6, f"=SUMIFS(abs_ret,abs_dept,{a},abs_annee,annee)", nombre)
        bk.f(ws, r, 7, f"=COUNTIFS(av_dept,{a},av_annee,annee)", nombre)
        bk.f(ws, r, 8, f"=COUNTIFS(bd_dept,{a},{DANS_ANNEE_EMB})", nombre)
        bk.f(ws, r, 9, f"=COUNTIFS(bd_dept,{a},{DANS_ANNEE_SOR})", nombre)

    # --- Par mois ---
    ws.write(L_MOIS - 2, 0, "Par mois (année d'analyse)", f(bold=True, font_color=ORANGE))
    for j, t in enumerate(["Mois", "Embauches", "Sorties", "Formations réalisées"]):
        ws.write(L_MOIS - 1, j, t, tete)
    for m in range(12):
        r = L_MOIS + m
        debut, fin = f"DATE(annee,{m + 1},1)", f"DATE(annee,{m + 2},1)"
        bk.f(ws, r, 0, f"=INDEX(l_mois_courts,{m + 1})", cell)
        bk.f(ws, r, 1, f'=COUNTIFS(bd_embauche,">="&{debut},bd_embauche,"<"&{fin})', nombre)
        bk.f(ws, r, 2, f'=COUNTIFS(bd_sortie,">="&{debut},bd_sortie,"<"&{fin})', nombre)
        bk.f(ws, r, 3, f'=COUNTIFS(fo_date,">="&{debut},fo_date,"<"&{fin},fo_statut,"Réalisée")', nombre)

    # --- Répartitions ---
    ws.write(L_DIST - 2, 0, "Répartitions", f(bold=True, font_color=ORANGE))
    blocs = [
        ("Contrats (actifs)", "contrats", '=COUNTIFS(bd_contrat,{a},bd_statut,"Actif")'),
        ("Genre (actifs)", "genres", '=COUNTIFS(bd_genre,{a},bd_statut,"Actif")'),
        ("Ressources de recrutement", "sources", "=COUNTIFS(bd_source,{a})"),
        ("Motifs de départ (année)", "motifs", "=COUNTIFS(bd_motif,{a}," + DANS_ANNEE_SOR + ")"),
        ("Types d'absence (nb de cas)", "types_abs", "=COUNTIFS(abs_type,{a},abs_annee,annee)"),
        ("Types de formation", "types_form", '=COUNTIFS(fo_type,{a},fo_annee,annee,fo_statut,"Réalisée")'),
        ("Avertissements par niveau", "niveaux", "=COUNTIFS(av_niveau,{a},av_annee,annee)"),
    ]
    for k, (titre, cle, formule) in enumerate(blocs):
        c = 3 * k
        ws.write(L_DIST - 1, c, titre, tete)
        ws.write(L_DIST - 1, c + 1, "Nombre", tete)
        valeurs = next(v for kk, _, v in D_LISTES if kk == cle)
        for i in range(len(valeurs)):
            r = L_DIST + i
            a = f"${xl_col_to_name(c)}{r + 1}"
            bk.f(ws, r, c, f"={_liste(cle, i)}", cell)
            bk.f(ws, r, c + 1, formule.format(a=a), nombre)

    # --- KPI ---
    ws.write(L_KPI - 2, 0, "Indicateurs clés", f(bold=True, font_color=ORANGE))
    ws.write(L_KPI - 1, 0, "Indicateur", tete)
    ws.write(L_KPI - 1, 1, "Valeur", tete)
    for i, (nom, libelle, formule, fmt) in enumerate(KPI):
        r = L_KPI + i
        ws.write(r, 0, libelle, cell)
        bk.f(ws, r, 1, formule, f(border=1, border_color=LINE, bg_color="#F8FAFC", num_format=fmt))
        bk.wb.define_name(nom, f"={CALC}!$B${r + 1}")
    # petits tableaux pour la jauge du turnover
    r = L_KPI + len(KPI) + 1
    ws.write(r, 0, "Jauge turnover", cell)
    bk.f(ws, r, 1, "=MIN(1,k_turnover)", f(border=1, border_color=LINE, num_format="0.00%"))
    bk.f(ws, r + 1, 1, "=1-B" + str(r + 1), f(border=1, border_color=LINE, num_format="0.00%"))
    ws.write(r + 1, 0, "Reste", cell)
    bk.f(ws, r + 2, 1, '="Turnover : "&FIXED(k_turnover*100,2)&" %"', cell)
    ws.write(r + 2, 0, "Titre de la jauge", cell)
    jauge_plage = [CALC, r, 1, r + 1, 1]
    jauge_titre = f"={CALC}!$B${r + 3}"

    # --- Contrats à échéance ---
    ws.write(L_ECH - 2, 0, "Contrats à échéance (5 plus proches)", f(bold=True, font_color=ORANGE))
    for j, t in enumerate(["Ordre", "Rang", "Ligne base", "Jours restants", "Collaborateur", "Département", "Fin de contrat"]):
        ws.write(L_ECH - 1, j, t, tete)
    for k in range(5):
        r = L_ECH + k
        n = r + 1
        ws.write(r, 0, k + 1, cell)
        bk.f(ws, r, 1, f'=IFERROR(SMALL(bd_rang,A{n}),"")', cell)
        bk.f(ws, r, 2, f'=IF(B{n}="","",MATCH(B{n},bd_rang,0))', cell)
        bk.f(ws, r, 3, f'=IF(C{n}="","",INDEX(bd_jours,C{n}))', cell)
        bk.f(ws, r, 4, f'=IF(C{n}="","",INDEX(bd_prenom,C{n})&" "&INDEX(bd_nom,C{n}))', cell)
        bk.f(ws, r, 5, f'=IF(C{n}="","",INDEX(bd_dept,C{n}))', cell)
        bk.f(ws, r, 6, f'=IF(C{n}="","",INDEX(bd_fin,C{n}))', f(border=1, border_color=LINE, bg_color="#F8FAFC", num_format="dd/mm/yyyy"))
    return jauge_titre, jauge_plage


# =====================================================================
# Graphiques
# =====================================================================
def _titre(texte):
    return {"name": texte, "name_font": {"size": 12, "bold": True, "color": INK, "name": "Calibri"}, "overlay": False}


def _cadre(ch, w, h):
    ch.set_chartarea({"border": {"color": LINE}, "fill": {"color": "#FFFFFF"}})
    ch.set_plotarea({"fill": {"none": True}, "border": {"none": True}})
    ch.set_size({"width": w, "height": h})


def _plage(c1, r1, r2, c2=None):
    return [CALC, r1, c1, r2, c1 if c2 is None else c2]


def barres(bk, titre, col_cat, col_val, r1, r2, couleur, fmt="#,##0", w=536, h=290, horizontal=False, nom="Série"):
    ch = bk.wb.add_chart({"type": "bar" if horizontal else "column"})
    ch.add_series({
        "name": nom, "categories": _plage(col_cat, r1, r2), "values": _plage(col_val, r1, r2),
        "fill": {"color": couleur}, "border": {"none": True}, "gap": 55,
        "data_labels": {"value": True, "num_format": fmt, "font": {"size": 9, "color": INK, "bold": True}},
    })
    ch.set_title(_titre(titre))
    ch.set_legend({"none": True})
    ch.set_x_axis({"num_font": {"size": 9, "color": MUTED}, "line": {"color": LINE}, "major_tick_mark": "none"})
    ch.set_y_axis({"visible": False, "major_gridlines": {"visible": True, "line": {"color": "#E8EBF0"}}, "min": 0})
    _cadre(ch, w, h)
    return ch


def barres_doubles(bk, titre, col_cat, series, r1, r2, w=536, h=290):
    ch = bk.wb.add_chart({"type": "column"})
    for nom, col, couleur in series:
        ch.add_series({
            "name": nom, "categories": _plage(col_cat, r1, r2), "values": _plage(col, r1, r2),
            "fill": {"color": couleur}, "border": {"none": True}, "gap": 70, "overlap": -5,
            "data_labels": {"value": True, "num_format": "0;-0;;", "font": {"size": 8, "color": INK}},
        })
    ch.set_title(_titre(titre))
    ch.set_legend({"position": "bottom", "font": {"size": 9}})
    ch.set_x_axis({"num_font": {"size": 9, "color": MUTED}, "line": {"color": LINE}, "major_tick_mark": "none"})
    ch.set_y_axis({"visible": False, "major_gridlines": {"visible": True, "line": {"color": "#E8EBF0"}}, "min": 0})
    _cadre(ch, w, h)
    return ch


def anneau(bk, titre, col_cat, col_val, r1, r2, w=536, h=290, couleurs=None, type_="doughnut"):
    ch = bk.wb.add_chart({"type": type_})
    n = r2 - r1 + 1
    ch.add_series({
        "name": titre, "categories": _plage(col_cat, r1, r2), "values": _plage(col_val, r1, r2),
        "points": [{"fill": {"color": (couleurs or PALETTE)[i % 8]}, "border": {"color": "#FFFFFF"}} for i in range(n)],
        "data_labels": {"value": True, "font": {"size": 9, "bold": True, "color": "#FFFFFF" if type_ == "doughnut" else INK}},
    })
    if type_ == "doughnut":
        ch.set_hole_size(52)
    ch.set_title(_titre(titre))
    ch.set_legend({"position": "right", "font": {"size": 9}})
    _cadre(ch, w, h)
    return ch


def jauge(bk, titre_cellule, plage, w=536, h=290):
    ch = bk.wb.add_chart({"type": "doughnut"})
    ch.add_series({
        "values": plage, "points": [{"fill": {"color": ORANGE}}, {"fill": {"color": "#E5E7EB"}}],
        "data_labels": {"value": False},
    })
    ch.set_hole_size(68)
    ch.set_title({"name": titre_cellule, "name_font": {"size": 14, "bold": True, "color": INK, "name": "Calibri"}, "overlay": False})
    ch.set_legend({"none": True})
    _cadre(ch, w, h)
    return ch


# =====================================================================
# Tableaux de bord
# =====================================================================
NCOLS = 16  # colonnes B..Q


def _gabarit(bk, ws, courant: int):
    f = bk.fmt
    feuille, _, titre = TABLEAUX[courant]
    ws.hide_gridlines(2)
    ws.set_tab_color(GREEN)
    ws.set_column(0, 0, 2)
    ws.set_column(1, NCOLS, 9)
    ws.set_column(NCOLS + 1, NCOLS + 1, 2)
    ws.set_default_row(20)
    ws.set_row(0, 24)
    ws.set_row(1, 30)
    ws.set_row(2, 24)
    bk.merge(ws, 0, 1, 2, NCOLS, titre, f(bold=True, font_size=26, font_color="#FFFFFF", bg_color=GREEN, align="center"))
    bk.merge(ws, 3, 1, 3, NCOLS, '="  "&soc_nom&"  ·  Année d’analyse "&annee&"  ·  chiffres calculés en temps réel depuis la BASE DE DONNÉES"', f(font_size=10, font_color=MUTED, bg_color=GREEN_LT, align="center"))
    bouton = f(bold=True, font_size=10, font_color="#FFFFFF", bg_color=NAVY, align="center", border=1, border_color="#FFFFFF")
    actif = f(bold=True, font_size=10, font_color=NAVY, bg_color=GOLD, align="center", border=1, border_color="#FFFFFF")
    ws.set_row(4, 24)
    bk.lien(ws, 4, 1, "Accueil", "🏠 Accueil", f(bold=True, font_size=10, bg_color="#FFD34E", align="center", border=1, border_color="#FFFFFF"), col2=2)
    for k, (autre, court, _) in enumerate(TABLEAUX):
        c = 3 + 3 * k
        bk.lien(ws, 4, c, autre, court, actif if k == courant else bouton, col2=c + 2)
    ws.set_row(5, 8)



def _tuile(bk, ws, r, c, couleur, libelle, valeur, fmt_nombre, sous):
    f = bk.fmt
    bk.merge(ws, r, c, r, c + 3, libelle, f(bold=True, font_size=10, font_color="#FFFFFF", bg_color=couleur, align="center"))
    ws.set_row(r + 1, 40)
    bk.merge(ws, r + 1, c, r + 1, c + 3, valeur, f(bold=True, font_size=26, font_color="#FFFFFF", bg_color=couleur, align="center", num_format=fmt_nombre))
    bk.merge(ws, r + 2, c, r + 2, c + 3, sous, f(font_size=9, font_color="#FFFFFF", bg_color=couleur, align="center", italic=True))


def _tuiles(bk, ws, r, definitions):
    couleurs = [ORANGE, TEAL, BLUE, PINK]
    for k, (libelle, formule, fmt, sous) in enumerate(definitions):
        _tuile(bk, ws, r, 1 + 4 * k, couleurs[k], libelle, formule, fmt, sous)
    ws.set_row(r + 3, 8)


def _page(ws, derniere_ligne):
    ws.set_paper(9)
    ws.set_portrait()
    ws.set_margins(left=0.4, right=0.4, top=0.5, bottom=0.5)
    ws.fit_to_pages(1, 0)
    ws.print_area(0, 0, derniere_ligne, NCOLS + 1)
    ws.set_footer("&L&8&A&R&8Page &P / &N")


def _bande(ws, ligne, gauche, droite):
    ws.insert_chart(ligne, 1, gauche, {"x_offset": 0, "y_offset": 4, "object_position": 1})
    if droite is not None:
        ws.insert_chart(ligne, 9, droite, {"x_offset": 4, "y_offset": 4, "object_position": 1})


def tableau_dashboard(bk, ws):
    _gabarit(bk, ws, 0)
    d0, d1 = L_DEPT, L_DEPT + len(D.DEPARTEMENTS) - 1
    _tuiles(bk, ws, 6, [
        ("Effectif actif", "=k_effectif", "0", "collaborateurs en poste"),
        ("Masse salariale", "=k_masse", "#,##0", '=soc_devise&" brut / mois"'),
        ("Total CDI", "=k_cdi", "0", "contrats à durée indéterminée"),
        ("Total CDD", "=k_cdd", "0", "contrats à durée déterminée"),
    ])
    _tuiles(bk, ws, 10, [
        ("Embauches", "=k_embauches", "0", '="en "&annee'),
        ("Sorties", "=k_sorties", "0", '="en "&annee'),
        ("Turnover", "=k_turnover", "0.0%", "sorties ÷ effectif moyen"),
        ("Contrats à échéance", "=k_echeances", "0", "dans les 30 jours"),
    ])
    _bande(ws, 14, barres(bk, "Effectif par département", 0, 1, d0, d1, TEAL, "0", nom="Effectif"),
           barres(bk, "Masse salariale par département", 0, 2, d0, d1, ORANGE, nom="Masse salariale"))
    _bande(ws, 29, anneau(bk, "Type de contrat", 0, 1, L_DIST, L_DIST + 1, couleurs=[TEAL, ORANGE]),
           anneau(bk, "Répartition hommes / femmes", 3, 4, L_DIST, L_DIST + 1, couleurs=[BLUE, PINK]))
    # Contrats à échéance
    f = bk.fmt
    r = 44
    bk.merge(ws, r, 1, r, NCOLS, "Contrats à échéance · jours restants", f(bold=True, font_size=12, font_color="#FFFFFF", bg_color=NAVY, indent=1))
    ws.set_row(r, 26)
    entete = f(bold=True, font_size=10, font_color=NAVY, bg_color="#F3F4F6", border=1, border_color=LINE, indent=1)
    for c1, c2, t in [(1, 7, "Collaborateur"), (8, 11, "Département"), (12, 14, "Fin de contrat"), (15, 16, "Reste")]:
        bk.merge(ws, r + 1, c1, r + 1, c2, t, entete)
    base = L_ECH
    for k in range(5):
        rr = r + 2 + k
        n = base + k + 1
        ws.set_row(rr, 24)
        ligne = f(border=1, border_color=LINE, indent=1)
        bk.merge(ws, rr, 1, rr, 7, f"={CALC}!E{n}", ligne)
        bk.merge(ws, rr, 8, rr, 11, f"={CALC}!F{n}", ligne)
        bk.merge(ws, rr, 12, rr, 14, f"={CALC}!G{n}", f(border=1, border_color=LINE, indent=1, num_format="dd/mm/yyyy", align="left"))
        bk.merge(ws, rr, 15, rr, 16, f'=IF({CALC}!D{n}="","",{CALC}!D{n})', f(bold=True, align="center", border=1, border_color=LINE, num_format='"J-"0;"Échu";"J-0"'))
        cellule = f"P{rr + 1}"
        ws.conditional_format(rr, 15, rr, 15, {"type": "formula", "criteria": f"=AND(ISNUMBER({cellule}),{cellule}<=30)", "format": bk.wb.add_format({"bg_color": PINK, "font_color": "#FFFFFF"}), "stop_if_true": True})
        ws.conditional_format(rr, 15, rr, 15, {"type": "formula", "criteria": f"=AND(ISNUMBER({cellule}),{cellule}<=60)", "format": bk.wb.add_format({"bg_color": ORANGE, "font_color": "#FFFFFF"}), "stop_if_true": True})
        ws.conditional_format(rr, 15, rr, 15, {"type": "formula", "criteria": f"=ISNUMBER({cellule})", "format": bk.wb.add_format({"bg_color": "#64748B", "font_color": "#FFFFFF"})})
    bk.merge(ws, r + 7, 1, r + 7, NCOLS, "Rouge : moins de 30 jours · Orange : moins de 60 jours · Gris : plus de 60 jours. Les contrats sont lus dans la BASE DE DONNÉES (colonne « Fin de contrat »).", f(font_size=9, italic=True, font_color=MUTED))
    _page(ws, r + 8)


def tableau_formation(bk, ws):
    _gabarit(bk, ws, 1)
    d0, d1 = L_DEPT, L_DEPT + len(D.DEPARTEMENTS) - 1
    _tuiles(bk, ws, 6, [
        ("Formations réalisées", "=k_form_nb", "0", '="en "&annee'),
        ("Jours de formation", "=k_form_jours", "0", "jours cumulés"),
        ("Collaborateurs formés", "=k_formes", "0", "parmi les actifs"),
        ("Taux de formation", "=k_taux_form", "0%", "formés ÷ effectif actif"),
    ])
    _bande(ws, 10, barres(bk, "Formés par département", 0, 3, d0, d1, BLUE, "0", nom="Formés"),
           barres(bk, "Taux de formation par département", 0, 4, d0, d1, GREEN_DK, "0%", nom="Taux"))
    _bande(ws, 25, anneau(bk, "Type de formation", 15, 16, L_DIST, L_DIST + len(D.TYPES_FORMATION) - 1),
           barres(bk, "Formations réalisées par mois", 0, 3, L_MOIS, L_MOIS + 11, ORANGE, "0", nom="Formations"))
    bk.merge(ws, 40, 1, 40, NCOLS, "Chaque formation se saisit dans l’onglet « Suivi formations » : le tableau de bord se met à jour tout seul.", bk.fmt(font_size=9, italic=True, font_color=MUTED))
    _page(ws, 41)


def tableau_recrutement(bk, ws):
    _gabarit(bk, ws, 2)
    d0, d1 = L_DEPT, L_DEPT + len(D.DEPARTEMENTS) - 1
    _tuiles(bk, ws, 6, [
        ("Total annuel embauchés", "=k_embauches", "0", '="en "&annee'),
        ("Sorties", "=k_sorties", "0", '="en "&annee'),
        ("Solde net", "=k_solde_net", "+0;-0;0", "embauches − sorties"),
        ("Effectif actif", "=k_effectif", "0", "collaborateurs en poste"),
    ])
    _bande(ws, 10, barres_doubles(bk, "Embauchés et sortants par mois", 0, [("Embauches", 1, TEAL), ("Sorties", 2, PINK)], L_MOIS, L_MOIS + 11),
           anneau(bk, "Ressources de recrutement", 6, 7, L_DIST, L_DIST + len(D.SOURCES) - 1, type_="pie"))
    _bande(ws, 25, barres(bk, "Embauches par département", 0, 8, d0, d1, TEAL, "0", nom="Embauches"),
           anneau(bk, "Motifs de départ", 9, 10, L_DIST, L_DIST + len(D.MOTIFS_SORTIE) - 1))
    bk.merge(ws, 40, 1, 40, NCOLS, "Les embauches et sorties sont lues dans la BASE DE DONNÉES (colonnes « Date d’embauche », « Date de sortie » et « Motif de sortie »).", bk.fmt(font_size=9, italic=True, font_color=MUTED))
    _page(ws, 41)


def tableau_relations(bk, ws, jauge_titre, jauge_plage):
    _gabarit(bk, ws, 3)
    d0, d1 = L_DEPT, L_DEPT + len(D.DEPARTEMENTS) - 1
    _tuiles(bk, ws, 6, [
        ("Turnover", "=k_turnover", "0.00%", "sorties ÷ effectif moyen"),
        ("Absences", "=k_abs_jours", "0", "jours, hors congés payés"),
        ("Retards", "=k_retards", "#,##0", "minutes cumulées"),
        ("Avertissements", "=k_avert", "0", '="en "&annee'),
    ])
    _bande(ws, 10, barres(bk, "Absences · jours par département", 0, 5, d0, d1, BLUE, "0", nom="Jours"),
           jauge(bk, jauge_titre, jauge_plage))
    _bande(ws, 25, barres(bk, "Retard en minutes par département", 0, 6, d0, d1, PINK, "#,##0", nom="Minutes"),
           anneau(bk, "Types d’absence (nombre de cas)", 12, 13, L_DIST, L_DIST + len(D.TYPES_ABSENCE) - 1))
    _bande(ws, 40, barres(bk, "Avertissements par niveau", 18, 19, L_DIST, L_DIST + len(D.NIVEAUX_AVERT) - 1, ORANGE, "0", nom="Avertissements"),
           barres(bk, "Avertissements par département", 0, 7, d0, d1, GOLD, "0", nom="Avertissements"))
    bk.merge(ws, 55, 1, 55, NCOLS, "Absences et retards se saisissent dans l’onglet « Absences », les sanctions dans « Suivi avertissements ».", bk.fmt(font_size=9, italic=True, font_color=MUTED))
    _page(ws, 56)
