"""Les 15 documents RH : chacun se remplit tout seul à partir du matricule saisi en haut à droite."""

from __future__ import annotations

from datetime import time

from _base import INPUT, LINE, MUTED, NAVY, PINK, TEAL, E, concat, dmy, hhmm, lignes, long_date

NCOL = 9  # colonnes A..I
R = "$K$1"  # ligne du collaborateur dans la base (0 = matricule introuvable)
MATRICULE = "$H$2"


# ---------- Champs tirés de la base de données ----------
def b(cle: str) -> E:
    return E(f'IF({R}=0,"………",INDEX(bd_{cle},{R}))')


def b_date(cle: str) -> E:
    return E(f'IF(OR({R}=0,N(INDEX(bd_{cle},{R}))=0),"……/……/……",{dmy(f"INDEX(bd_{cle},{R})")})')


def b_argent(cle: str, decimales: int = 0) -> E:
    return E(f'IF({R}=0,"………",FIXED(N(INDEX(bd_{cle},{R})),{decimales})&" "&soc_devise)')


def b_nombre(cle: str) -> E:
    return E(f'IF({R}=0,"……",N(INDEX(bd_{cle},{R})))')


def s(cle: str) -> E:
    return E(f"soc_{cle}")


NOM = E(f'IF({R}=0,"………………",INDEX(bd_prenom,{R})&" "&UPPER(INDEX(bd_nom,{R})))')
CIV = E(f'IF({R}=0,"Monsieur / Madame",IF(INDEX(bd_genre,{R})="Femme","Madame","Monsieur"))')
PRO = E(f'IF({R}=0,"il/elle",IF(INDEX(bd_genre,{R})="Femme","elle","il"))')
ADRESSE = E(f'IF({R}=0,"………",INDEX(bd_adresse,{R})&", "&INDEX(bd_ville,{R}))')
SOCIETE = [
    s("nom"), " (", s("forme"), "), dont le siège est situé à ", s("adresse"), ", ", s("ville"), " (", s("pays"),
    "), immatriculée au registre du commerce sous le n° ", s("rc"), ", identifiant fiscal / patente n° ", s("patente"),
    ", affiliée à la CNSS sous le n° ", s("cnss"),
]


class Doc:
    def __init__(self, bk, ws, nom: str, matricule: int):
        self.bk, self.ws, self.nom = bk, ws, nom
        self.row = 2  # 0 et 1 : barre du haut
        self.top = 2
        self.plages_saisie: list[int] = []
        ws.hide_gridlines(2)
        ws.set_column(0, NCOL - 1, 11.3)
        ws.set_column(NCOL, NCOL, 2)
        ws.set_column(NCOL + 1, NCOL + 1, 6, None, {"hidden": True})
        ws.set_tab_color(PINK)
        ws.set_row(0, 22)
        ws.set_row(1, 32)
        f = bk.fmt
        bk.lien(ws, 0, 0, "Accueil", "🏠 Accueil", f(bold=True, bg_color="#FFD34E", align="center", border=1, border_color="#C99700"), col2=1, row2=1)
        bk.merge(ws, 0, 2, 0, 6, "Tapez ou choisissez un matricule  ➜", f(italic=True, font_color=MUTED, align="right"))
        bk.merge(ws, 1, 2, 1, 6, f'=IF({R}=0,"⚠ Matricule introuvable : saisissez un matricule de la base","✓ Tout est rempli")', f(bold=True, align="right", indent=1))
        ws.conditional_format(1, 2, 1, 2, {"type": "formula", "criteria": f"={R}=0", "format": bk.wb.add_format({"font_color": "#B3261E"})})
        ws.conditional_format(1, 2, 1, 2, {"type": "formula", "criteria": f"={R}>0", "format": bk.wb.add_format({"font_color": "#1C7A4B"})})
        bk.merge(ws, 0, 7, 0, 8, "Matricule", f(bold=True, font_color="#FFFFFF", bg_color=PINK, align="center", border=1, border_color=PINK))
        bk.merge(ws, 1, 7, 1, 8, matricule, f(bold=True, font_size=18, font_color="#FFFFFF", bg_color=TEAL, align="center", border=1, border_color=TEAL))
        ws.data_validation(1, 7, 1, 7, {"validate": "list", "source": "=l_matricules", "input_title": "Matricule", "input_message": "Choisissez dans la liste ou tapez un matricule de la BASE DE DONNÉES.", "error_title": "Matricule inconnu", "error_message": "Ce matricule n'existe pas dans la BASE DE DONNÉES."})
        bk.f(ws, 0, NCOL + 1, f"=IFERROR(MATCH({MATRICULE},bd_matricule,0),0)")

    # ----- saisies propres au document (barre du haut, non imprimée) -----
    def champ(self, cle: str, libelle: str, defaut, genre: str = "texte", liste: str | list | None = None) -> str:
        bk, ws = self.bk, self.ws
        f = bk.fmt
        r = self.row
        bk.merge(ws, r, 0, r, 3, libelle + " :", f(bold=True, align="right", font_size=10, font_color=NAVY))
        num = {"date": "dd/mm/yyyy", "heure": "hh:mm", "nombre": "#,##0.00", "entier": "0"}.get(genre, "@")
        fmt_in = f(bg_color=INPUT, border=1, border_color=LINE, align="left", num_format=num)
        bk.merge(ws, r, 4, r, 8, defaut, fmt_in)
        if isinstance(liste, str):
            ws.data_validation(r, 4, r, 4, {"validate": "list", "source": f"={liste}"})
        elif isinstance(liste, list):
            ws.data_validation(r, 4, r, 4, {"validate": "list", "source": liste})
        self.row += 1
        return f"$E${r + 1}"

    def date_doc(self, libelle: str = "Date du document") -> str:
        return self.champ("date", libelle, "=TODAY()", "date")

    def debut(self):
        self.row += 1  # ligne vide, hors zone d'impression
        self.top = self.row
        self.ws.set_row(self.row - 1, 8)

    # ----- mise en page du document -----
    def _fin_ligne(self, hauteur: float):
        self.ws.set_row(self.row, hauteur)
        self.row += 1

    def titre(self, texte: str, sous: str | None = None):
        f = self.bk.fmt
        self.bk.merge(self.ws, self.row, 0, self.row, NCOL - 1, texte, f(bold=True, font_size=18, align="center", border=2, border_color=NAVY))
        self._fin_ligne(40)
        if sous:
            self.bk.merge(self.ws, self.row, 0, self.row, NCOL - 1, sous, f(italic=True, font_size=12, align="center"))
            self._fin_ligne(22)
        self._fin_ligne(10)

    def h(self, texte: str):
        self.bk.merge(self.ws, self.row, 0, self.row, NCOL - 1, texte, self.bk.fmt(bold=True, font_size=11, font_color=NAVY, top=1, top_color=LINE))
        self._fin_ligne(22)

    def p(self, *parts, bold: bool = False, italic: bool = False, align: str = "justify", gras_taille: int = 11):
        contenu = concat(parts)
        fmt = self.bk.fmt(text_wrap=True, valign="top", align=align, bold=bold, italic=italic, font_size=gras_taille)
        self.bk.merge(self.ws, self.row, 0, self.row, NCOL - 1, contenu, fmt)
        self._fin_ligne(15 * lignes(list(parts), 112 if not bold else 100) + 5)

    def kv(self, libelle: str, *parts):
        f = self.bk.fmt
        self.bk.merge(self.ws, self.row, 0, self.row, 2, libelle, f(bold=True, valign="top", text_wrap=True))
        self.bk.merge(self.ws, self.row, 3, self.row, NCOL - 1, concat(parts), f(text_wrap=True, valign="top", align="left", bottom=3, bottom_color=LINE))
        self._fin_ligne(max(20, 15 * lignes(list(parts), 72) + 4))

    def ligne_montant(self, libelle: str, ref_cellule: str, gras: bool = False):
        f = self.bk.fmt
        self.bk.merge(self.ws, self.row, 0, self.row, 6, libelle, f(bold=gras, border=1, border_color=LINE, indent=1))
        self.bk.merge(self.ws, self.row, 7, self.row, 8, f"={ref_cellule}", f(bold=gras, border=1, border_color=LINE, num_format="#,##0.00", align="right", indent=1))
        self._fin_ligne(21)

    def sp(self, hauteur: float = 12):
        self._fin_ligne(hauteur)

    def signatures(self, *cases):
        """cases : (titre, mention). 2 cases → A:D et F:I ; 3 cases → A:C, D:F, G:I."""
        f = self.bk.fmt
        if len(cases) == 1:
            plages = [(5, 8)]
        elif len(cases) == 2:
            plages = [(0, 3), (5, 8)]
        else:
            plages = [(0, 2), (3, 5), (6, 8)]
        for (c1, c2), (titre, _) in zip(plages, cases):
            self.bk.merge(self.ws, self.row, c1, self.row, c2, titre, f(bold=True, align="center", top=1, left=1, right=1, bottom=1, bg_color="#F3F4F6", border_color=LINE))
        self._fin_ligne(22)
        for (c1, c2), (_, mention) in zip(plages, cases):
            self.bk.merge(self.ws, self.row, c1, self.row, c2, mention, f(italic=True, font_size=9, font_color=MUTED, align="center", valign="top", text_wrap=True, left=1, right=1, bottom=1, border_color=LINE))
        self._fin_ligne(70)

    def fin(self):
        ws = self.ws
        ws.set_paper(9)
        ws.set_portrait()
        ws.set_margins(left=0.6, right=0.6, top=0.7, bottom=0.7)
        ws.fit_to_pages(1, 1)
        ws.center_horizontally()
        ws.print_area(self.top, 0, self.row, NCOL - 1)
        ws.set_footer("&L&8&A&R&8Page &P / &N")


# =====================================================================
# Les 15 documents
# =====================================================================
def contrat(d: Doc, cdd: bool):
    date_doc = d.date_doc("Date de signature")
    motif = d.champ("motif", "Motif du recours au CDD", "accroissement temporaire d’activité") if cdd else None
    d.debut()
    d.titre("CONTRAT DE TRAVAIL", "(À durée déterminée)" if cdd else "(À durée indéterminée)")
    d.p("ENTRE LES SOUSSIGNÉS :", bold=True)
    d.p(*SOCIETE, ",")
    d.p("Représentée au présent acte par ", s("rep"), ", en sa qualité de ", s("qualite"), ". Ci-après dénommée « la Société », d’une part,")
    d.p("ET", bold=True)
    d.p(
        NOM, ", de nationalité ", b("nationalite"), ", né(e) le ", b_date("naissance"), ", titulaire de la pièce d’identité n° ", b("cin"),
        ", affilié(e) à la CNSS sous le n° ", b("cnss"), ", demeurant à ", ADRESSE, ". Ci-après dénommé(e) « le Salarié », d’autre part,",
    )
    d.p("IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT ENTRE LES SOUSSIGNÉS :", bold=True)
    d.h("ARTICLE 1 : OBJET")
    d.p("Le Salarié, qui accepte cet engagement, déclare formellement n’être lié à aucun autre employeur dont les activités seraient concurrentes de celles de la Société, et s’engage à exercer ses fonctions avec loyauté et diligence.")
    d.h("ARTICLE 2 : FONCTIONS")
    d.p("Le Salarié est engagé en qualité de ", b("poste"), " (matricule ", b("matricule"), "), au sein du département ", b("dept"),
        ". Il exerce ses fonctions sous l’autorité de la Direction et se conforme aux instructions qui lui sont données dans le cadre de son emploi.")
    d.h("ARTICLE 3 : DURÉE ET DATE D’EFFET")
    if cdd:
        duree = E(f'IF({R}=0,"……",N(INDEX(bd_fin,{R}))-N(INDEX(bd_embauche,{R}))+1)')
        d.p("Le présent contrat est conclu pour une durée déterminée, du ", b_date("embauche"), " au ", b_date("fin"), " inclus, soit ", duree,
            " jour(s), en raison du motif suivant : ", E(motif), ". Il prend fin de plein droit à son terme ; tout renouvellement doit faire l’objet d’un écrit signé des deux parties, dans les limites prévues par la législation du travail en vigueur.")
    else:
        d.p("Le présent contrat est conclu pour une durée indéterminée et prend effet le ", b_date("embauche"),
            ". Il est assorti d’une période d’essai de ", s("essai"), " mois, durant laquelle chaque partie peut y mettre fin dans les conditions prévues par la législation du travail en vigueur.")
    d.h("ARTICLE 4 : DURÉE DU TRAVAIL")
    d.p("La durée hebdomadaire de travail est de ", s("heures"), " heures, répartie selon l’horaire en vigueur dans la Société. En cas de nécessité de service, le Salarié accepte d’effectuer des heures supplémentaires dans le respect de la législation.")
    d.h("ARTICLE 5 : RÉMUNÉRATION")
    d.p("En contrepartie de son travail, le Salarié perçoit un salaire mensuel brut de base de ", b_argent("salaire"), ", auquel s’ajoutent des indemnités et primes mensuelles de ", b_argent("primes"),
        ", soit une rémunération mensuelle brute totale de ", b_argent("brut"),
        ". Le salaire est versé à terme échu, sous déduction des cotisations sociales et retenues légales.")
    d.h("ARTICLE 6 : CONGÉS")
    d.p("Le Salarié bénéficie de congés payés à raison de ", s("conge"), " jour(s) par mois de travail effectif, conformément à la législation en vigueur.")
    d.h("ARTICLE 7 : CONFIDENTIALITÉ ET RÈGLEMENT INTÉRIEUR")
    d.p("Le Salarié s’engage à respecter la plus stricte confidentialité sur les informations, documents et données de la Société dont il a connaissance, pendant et après l’exécution du contrat, ainsi qu’à observer le règlement intérieur.")
    d.h("ARTICLE 8 : RUPTURE")
    d.p("Le contrat peut être rompu dans le respect des dispositions légales en vigueur" + ("" if cdd else " et d’un préavis de "), *([] if cdd else [s("preavis"), " jours (sauf faute grave)"]), ".")
    d.h("ARTICLE 9 : DISPOSITIONS GÉNÉRALES")
    d.p("Pour tout ce qui n’est pas prévu au présent contrat, les parties se réfèrent à la législation du travail en vigueur. Tout litige relève de la compétence des juridictions de ", s("ville"), ".")
    d.sp()
    d.p("Fait en deux exemplaires originaux, à ", s("ville"), ", le ", E(long_date(date_doc)), ".", align="left")
    d.signatures(("La Société", "Lu et approuvé — signature et cachet"), ("Le Salarié", "Lu et approuvé — signature"))
    d.fin()


def certificat(d: Doc):
    date_fin = d.champ("fin", "Date de fin de contrat", f"=IF({R}=0,TODAY(),IF(N(INDEX(bd_sortie,{R}))=0,TODAY(),INDEX(bd_sortie,{R})))", "date")
    date_doc = d.date_doc()
    d.debut()
    d.titre("CERTIFICAT DE TRAVAIL")
    d.sp(14)
    d.p("Nous soussignés, ", *SOCIETE, ", représentée par ", s("rep"), ", ", s("qualite"), ",")
    d.p("certifions que ", CIV, " ", NOM, ", titulaire de la pièce d’identité n° ", b("cin"), ", a été employé(e) au sein de notre établissement du ", b_date("embauche"),
        " au ", E(dmy(date_fin)), ", en qualité de ", b("poste"), " (département ", b("dept"), ").")
    d.p(CIV, " ", NOM, " nous quitte libre de tout engagement.")
    d.sp(8)
    d.p("Le présent certificat lui est délivré, sur sa demande, pour servir et valoir ce que de droit.")
    d.sp(14)
    d.p("Fait à ", s("ville"), ", le ", E(long_date(date_doc)), ".", align="left")
    d.sp(6)
    d.signatures(("La Direction", "Signature et cachet de la Société"), ("Reçu par le salarié", "Date et signature"))
    d.fin()


def attestation(d: Doc, avec_salaire: bool):
    date_doc = d.date_doc()
    d.debut()
    d.titre("ATTESTATION DE TRAVAIL" + (" ET DE SALAIRE" if avec_salaire else ""))
    d.sp(14)
    d.p("Nous soussignés, ", *SOCIETE, ", représentée par ", s("rep"), ", ", s("qualite"), ", déclarons par la présente que :")
    d.sp(4)
    d.kv("Nom et prénom :", CIV, " ", NOM)
    d.kv("Pièce d’identité (CIN) :", b("cin"))
    d.kv("N° d’immatriculation CNSS :", b("cnss"))
    d.kv("Poste occupé :", b("poste"), " — département ", b("dept"))
    d.kv("Type de contrat :", b("contrat"))
    d.kv("Date d’embauche :", b_date("embauche"))
    if avec_salaire:
        d.kv("Salaire de base mensuel :", b_argent("salaire"))
        d.kv("Indemnités et primes :", b_argent("primes"))
        d.kv("Rémunération brute mensuelle :", b_argent("brut"))
    d.sp(8)
    d.p("est employé(e) au sein de notre établissement, en qualité de ", b("poste"), ", depuis le ", b_date("embauche"),
        (", et perçoit à ce titre une rémunération mensuelle brute de " if avec_salaire else ", et fait toujours partie de nos effectifs à la date de ce jour."),
        *([b_argent("brut"), "."] if avec_salaire else []))
    d.p("Cette attestation est délivrée à l’intéressé(e), sur sa demande, pour servir et valoir ce que de droit.")
    d.sp(14)
    d.p("Fait à ", s("ville"), ", le ", E(long_date(date_doc)), ".", align="left")
    d.sp(6)
    d.signatures(("La Direction", "Signature et cachet de la Société"))
    d.fin()


def avertissement(d: Doc):
    date_doc = d.date_doc()
    faits_le = d.champ("faits", "Date des faits", "=TODAY()-1", "date")
    faits = d.champ("motif", "Faits reprochés", "retard répété sans justification")
    niveau = d.champ("niveau", "Sanction", "un avertissement", liste=["un avertissement", "un second avertissement", "un dernier avertissement avant mise à pied"])
    d.debut()
    d.p(s("nom"), "  —  ", s("adresse"), ", ", s("ville"), bold=True, align="left")
    d.sp(6)
    d.p(s("ville"), ", le ", E(long_date(date_doc)), align="right")
    d.sp(6)
    d.kv("À l’attention de :", CIV, " ", NOM)
    d.kv("Matricule :", b("matricule"))
    d.kv("Poste :", b("poste"), " — département ", b("dept"))
    d.sp(8)
    d.p("Objet : Avertissement", bold=True, align="left")
    d.sp(6)
    d.p(CIV, ",")
    d.p("Nous avons constaté que, le ", E(dmy(faits_le)), ", les faits suivants ont été commis : ", E(faits),
        ". Ces faits constituent un manquement à vos obligations professionnelles et au règlement intérieur de la Société.")
    d.p("En application des dispositions du Code du travail et du règlement intérieur, nous avons le regret de vous infliger par la présente ", E(niveau),
        ". Cette sanction prend effet à compter de ce jour et sera versée à votre dossier personnel.")
    d.p("Nous vous invitons à veiller à ce que de tels faits ne se reproduisent plus ; à défaut, nous serions amenés à prendre des sanctions plus sévères.")
    d.p("Veuillez agréer, ", CIV, ", l’expression de nos salutations distinguées.")
    d.sp(8)
    d.signatures(("La Direction", "Signature et cachet"), ("Le salarié", "« Lu et pris connaissance », date et signature"))
    d.fin()


def demande_conge(d: Doc):
    date_doc = d.date_doc()
    nature = d.champ("nature", "Nature du congé", "Congé payé annuel", liste="l_natures")
    du = d.champ("du", "Du (premier jour d’absence)", "=TODAY()+30", "date")
    au = d.champ("au", "Au (dernier jour d’absence)", "=TODAY()+36", "date")
    d.debut()
    d.titre("DEMANDE DE CONGÉ PAYÉ")
    d.kv("Nom et prénom :", NOM)
    d.kv("Matricule :", b("matricule"))
    d.kv("Poste / département :", b("poste"), " — ", b("dept"))
    d.kv("Date d’embauche :", b_date("embauche"))
    d.sp(8)
    jours = f"({au}-{du}+1)"
    d.p("Je soussigné(e) ", NOM, " sollicite un(e) ", E(f"LOWER({nature})"), " du ", E(dmy(du)), " au ", E(dmy(au)),
        " inclus, soit ", E(jours), " jour(s) calendaires, avec reprise du travail le ", E(dmy(f"({au}+1)")), ".")
    solde = f'IF({R}=0,0,N(INDEX(bd_solde,{R})))'
    d.kv("Solde de congés actuel :", E(f"{solde}&\" jour(s)\""))
    d.kv("Jours demandés :", E(f"{jours}&\" jour(s)\""))
    d.kv("Solde après le congé :", E(f'IF({nature}="Congé payé annuel",{solde}-{jours},{solde})&" jour(s)"'))
    d.sp(6)
    d.p("La demande doit parvenir au service des Ressources Humaines au moins 15 jours avant la date de départ souhaitée.", italic=True, gras_taille=10)
    d.p("Fait à ", s("ville"), ", le ", E(long_date(date_doc)), ".", align="left")
    d.sp(6)
    d.p("AVIS DU RESPONSABLE HIÉRARCHIQUE :   ☐ Favorable      ☐ Défavorable", bold=True, align="left")
    d.p("DÉCISION DE LA DIRECTION :   ☐ Accordé      ☐ Refusé", bold=True, align="left")
    d.sp(6)
    d.signatures(("Le salarié", "Signature"), ("Le responsable", "Visa"), ("La Direction", "Visa et cachet"))
    d.fin()


def bon_sortie(d: Doc):
    date_s = d.champ("date", "Date de la sortie", "=TODAY()", "date")
    h1 = d.champ("h1", "Heure de sortie", time(14, 0), "heure")
    h2 = d.champ("h2", "Heure de retour prévue", time(16, 0), "heure")
    motif = d.champ("motif", "Motif", "Rendez-vous médical", liste=["Rendez-vous médical", "Raison personnelle", "Démarche administrative", "Mission de service", "Autre"])
    d.debut()
    d.titre("BON DE SORTIE")
    d.kv("Nom et prénom :", NOM)
    d.kv("Matricule :", b("matricule"))
    d.kv("Poste / département :", b("poste"), " — ", b("dept"))
    d.sp(8)
    d.p("Autorisation est accordée au salarié désigné ci-dessus de quitter son poste de travail le ", E(dmy(date_s)), ", de ", E(hhmm(h1)), " à ", E(hhmm(h2)),
        ", pour le motif suivant : ", E(motif), ".")
    d.p("Le salarié s’engage à regagner son poste à l’heure de retour indiquée. Tout dépassement non justifié pourra être décompté de la rémunération.", italic=True, gras_taille=10)
    d.sp(8)
    d.kv("Heure réelle de sortie :", "…… h ……")
    d.kv("Heure réelle de retour :", "…… h ……")
    d.sp(8)
    d.signatures(("Le salarié", "Signature"), ("Le chef de service", "Visa"), ("La Direction", "Visa et cachet"))
    d.fin()


def convocation(d: Doc):
    date_doc = d.date_doc()
    date_e = d.champ("date", "Date de l’entretien", "=TODAY()+3", "date")
    heure = d.champ("heure", "Heure de l’entretien", time(9, 30), "heure")
    lieu = d.champ("lieu", "Lieu", "Bureau de la Direction")
    objet = d.champ("objet", "Objet de l’entretien", "une éventuelle sanction disciplinaire", liste=["une éventuelle sanction disciplinaire", "un éventuel licenciement", "votre situation professionnelle"])
    d.debut()
    d.p(s("nom"), "  —  ", s("adresse"), ", ", s("ville"), bold=True, align="left")
    d.sp(6)
    d.p(s("ville"), ", le ", E(long_date(date_doc)), align="right")
    d.sp(6)
    d.kv("À l’attention de :", CIV, " ", NOM)
    d.kv("Matricule / poste :", b("matricule"), " — ", b("poste"))
    d.sp(8)
    d.p("Objet : Convocation à un entretien préalable", bold=True, align="left")
    d.sp(6)
    d.p(CIV, ",")
    d.p("Nous vous prions de bien vouloir vous présenter le ", E(dmy(date_e)), " à ", E(hhmm(heure)), ", à l’adresse suivante : ", E(lieu), ", pour un entretien portant sur ", E(objet), ".")
    d.p("Vous avez la possibilité de vous faire assister, lors de cet entretien, par un représentant du personnel ou par toute personne de votre choix appartenant à la Société.")
    d.p("Nous comptons sur votre présence et vous prions d’agréer, ", CIV, ", l’expression de nos salutations distinguées.")
    d.sp(8)
    d.signatures(("La Direction", "Signature et cachet"), ("Le salarié", "Reçu le … — signature"))
    d.fin()


def licenciement(d: Doc):
    date_doc = d.date_doc()
    motif = d.champ("motif", "Motif du licenciement", "insuffisance professionnelle persistante")
    preavis = d.champ("preavis", "Préavis (jours)", "=soc_preavis", "entier")
    effet = d.champ("effet", "Date de fin du contrat", f"=TODAY()+{preavis}", "date")
    d.debut()
    d.p(s("nom"), "  —  ", s("adresse"), ", ", s("ville"), bold=True, align="left")
    d.sp(6)
    d.p(s("ville"), ", le ", E(long_date(date_doc)), align="right")
    d.sp(6)
    d.kv("À l’attention de :", CIV, " ", NOM)
    d.kv("Matricule / poste :", b("matricule"), " — ", b("poste"))
    d.sp(8)
    d.p("Objet : Notification de licenciement", bold=True, align="left")
    d.sp(6)
    d.p(CIV, ",")
    d.p("Faisant suite à notre entretien préalable, nous avons le regret de vous notifier la rupture de votre contrat de travail pour le motif suivant : ", E(motif), ".")
    d.p("Conformément à la législation en vigueur, vous bénéficiez d’un préavis de ", E(preavis), " jours. Votre contrat prendra donc fin le ", E(dmy(effet)),
        ". Pendant ce préavis, vous disposez des heures d’absence prévues par la loi pour rechercher un nouvel emploi.")
    d.p("À l’issue du contrat, un certificat de travail et un reçu pour solde de tout compte vous seront remis, contre restitution du matériel et des documents appartenant à la Société.")
    d.p("Veuillez agréer, ", CIV, ", l’expression de nos salutations distinguées.")
    d.sp(8)
    d.signatures(("La Direction", "Signature et cachet"), ("Le salarié", "Reçu le … — signature"))
    d.fin()


def demission(d: Doc):
    date_doc = d.date_doc()
    recu = d.champ("recu", "Date de réception de la lettre de démission", "=TODAY()-1", "date")
    preavis = d.champ("preavis", "Préavis (jours)", "=soc_preavis", "entier")
    d.debut()
    d.p(s("nom"), "  —  ", s("adresse"), ", ", s("ville"), bold=True, align="left")
    d.sp(6)
    d.p(s("ville"), ", le ", E(long_date(date_doc)), align="right")
    d.sp(6)
    d.kv("À l’attention de :", CIV, " ", NOM)
    d.kv("Matricule / poste :", b("matricule"), " — ", b("poste"))
    d.sp(8)
    d.p("Objet : Accusé de réception de votre démission", bold=True, align="left")
    d.sp(6)
    d.p(CIV, ",")
    d.p("Nous accusons réception de votre lettre de démission du ", E(dmy(recu)), ", par laquelle vous nous informez de votre décision de quitter votre poste de ", b("poste"), ".")
    d.p("Conformément à votre contrat de travail, un préavis de ", E(preavis), " jours s’applique. Votre contrat prendra donc fin le ", E(dmy(f"({recu}+{preavis})")),
        ". À cette date, un certificat de travail et un reçu pour solde de tout compte vous seront remis.")
    d.p("Nous vous remercions pour votre contribution et vous prions d’agréer, ", CIV, ", l’expression de nos salutations distinguées.")
    d.sp(8)
    d.signatures(("La Direction", "Signature et cachet"), ("Le salarié", "Reçu le … — signature"))
    d.fin()


def fin_essai(d: Doc):
    date_doc = d.date_doc()
    fin_e = d.champ("fin", "Date de fin de la période d’essai", f"=IF({R}=0,TODAY(),EDATE(INDEX(bd_embauche,{R}),soc_essai))", "date")
    decision = d.champ("decision", "Décision", "confirmé(e) dans vos fonctions", liste=["confirmé(e) dans vos fonctions", "non confirmé(e) dans vos fonctions : il est mis fin à votre période d’essai"])
    d.debut()
    d.p(s("nom"), "  —  ", s("adresse"), ", ", s("ville"), bold=True, align="left")
    d.sp(6)
    d.p(s("ville"), ", le ", E(long_date(date_doc)), align="right")
    d.sp(6)
    d.kv("À l’attention de :", CIV, " ", NOM)
    d.kv("Matricule / poste :", b("matricule"), " — ", b("poste"))
    d.kv("Date d’embauche :", b_date("embauche"))
    d.sp(8)
    d.p("Objet : Fin de la période d’essai", bold=True, align="left")
    d.sp(6)
    d.p(CIV, ",")
    d.p("Votre période d’essai, d’une durée de ", s("essai"), " mois, prend fin le ", E(dmy(fin_e)), ". À l’issue de cette période, nous vous informons que vous êtes ", E(decision), ".")
    d.p("Nous vous prions d’agréer, ", CIV, ", l’expression de nos salutations distinguées.")
    d.sp(8)
    d.signatures(("La Direction", "Signature et cachet"), ("Le salarié", "Reçu le … — signature"))
    d.fin()


def solde_tout_compte(d: Doc):
    date_doc = d.date_doc()
    salaire = d.champ("salaire", "Salaire du dernier mois", f"=IF({R}=0,0,N(INDEX(bd_brut,{R})))", "nombre")
    conges = d.champ("conges", "Indemnité de congés non pris", f"=IF({R}=0,0,ROUND(MAX(0,N(INDEX(bd_solde,{R})))*N(INDEX(bd_brut,{R}))/26,2))", "nombre")
    preavis = d.champ("preavis", "Indemnité de préavis", 0, "nombre")
    autres = d.champ("autres", "Autres indemnités", 0, "nombre")
    retenues = d.champ("retenues", "Retenues (avances, matériel…)", 0, "nombre")
    d.debut()
    d.titre("REÇU POUR SOLDE DE TOUT COMPTE")
    d.kv("Nom et prénom :", NOM)
    d.kv("Matricule :", b("matricule"))
    d.kv("Poste / département :", b("poste"), " — ", b("dept"))
    d.kv("Entrée / sortie :", b_date("embauche"), "  →  ", b_date("sortie"))
    d.sp(8)
    d.ligne_montant("Salaire du dernier mois", salaire)
    d.ligne_montant("Indemnité compensatrice de congés payés non pris", conges)
    d.ligne_montant("Indemnité de préavis", preavis)
    d.ligne_montant("Autres indemnités", autres)
    d.ligne_montant("Retenues", retenues)
    total = f"({salaire}+{conges}+{preavis}+{autres}-{retenues})"
    d.bk.merge(d.ws, d.row, 0, d.row, 6, "TOTAL NET À PAYER", d.bk.fmt(bold=True, border=1, border_color=NAVY, indent=1, bg_color="#F3F4F6"))
    d.bk.merge(d.ws, d.row, 7, d.row, 8, f"={total}", d.bk.fmt(bold=True, border=1, border_color=NAVY, num_format="#,##0.00", align="right", indent=1, bg_color="#F3F4F6"))
    d._fin_ligne(24)
    d.sp(8)
    d.p("Je soussigné(e) ", NOM, ", reconnais avoir reçu de la société ", s("nom"), " la somme de ", E(f'FIXED({total},2)&" "&soc_devise'),
        ", à titre de solde de tout compte, en règlement de l’ensemble des sommes dues au titre de l’exécution et de la rupture de mon contrat de travail, sous réserve du droit de dénonciation dans le délai prévu par la législation en vigueur.")
    d.p("Fait à ", s("ville"), ", le ", E(long_date(date_doc)), ".", align="left")
    d.sp(6)
    d.signatures(("La Société", "Signature et cachet"), ("Le salarié", "Mention « Bon pour solde de tout compte » — signature"))
    d.fin()


def ordre_mission(d: Doc):
    date_doc = d.date_doc()
    dest = d.champ("dest", "Destination", "Casablanca")
    objet = d.champ("objet", "Objet de la mission", "Rencontre avec un fournisseur")
    depart = d.champ("depart", "Date de départ", "=TODAY()+7", "date")
    retour = d.champ("retour", "Date de retour", "=TODAY()+9", "date")
    moyen = d.champ("moyen", "Moyen de transport", "Véhicule de service", liste=["Véhicule de service", "Véhicule personnel", "Train", "Avion", "Autocar / taxi"])
    frais = d.champ("frais", "Frais pris en charge", "Hébergement et restauration", liste=["Hébergement et restauration", "Transport uniquement", "Forfait journalier"])
    avance = d.champ("avance", "Avance sur frais", 0, "nombre")
    d.debut()
    d.titre("ORDRE DE MISSION")
    d.kv("Nom et prénom :", NOM)
    d.kv("Matricule :", b("matricule"))
    d.kv("Poste / département :", b("poste"), " — ", b("dept"))
    d.sp(8)
    d.kv("Destination :", E(dest))
    d.kv("Objet de la mission :", E(objet))
    d.kv("Période :", "du ", E(dmy(depart)), " au ", E(dmy(retour)), " (", E(f"{retour}-{depart}+1"), " jour(s))")
    d.kv("Moyen de transport :", E(moyen))
    d.kv("Frais pris en charge :", E(frais))
    d.kv("Avance sur frais :", E(f'FIXED({avance},2)&" "&soc_devise'))
    d.sp(8)
    d.p("La Société ", s("nom"), " charge le salarié désigné ci-dessus d’effectuer la mission décrite ci-dessus. Un compte rendu et les justificatifs de frais sont à remettre au service des Ressources Humaines dans les jours suivant le retour.")
    d.p("Fait à ", s("ville"), ", le ", E(long_date(date_doc)), ".", align="left")
    d.sp(6)
    d.signatures(("La Direction", "Signature et cachet"), ("Le salarié", "Signature"))
    d.fin()


def evaluation(d: Doc):
    date_doc = d.date_doc("Date de l’entretien")
    annee = d.champ("annee", "Période évaluée (année)", "=annee", "entier")
    d.debut()
    d.titre("FICHE D’ÉVALUATION ANNUELLE")
    d.kv("Nom et prénom :", NOM)
    d.kv("Matricule :", b("matricule"))
    d.kv("Poste / département :", b("poste"), " — ", b("dept"))
    d.kv("Ancienneté :", E(f'IF({R}=0,"………",INDEX(bd_anciennete,{R})&" an(s)")'))
    d.kv("Période évaluée :", E(annee))
    d.sp(8)
    f = d.bk.fmt
    d.bk.merge(d.ws, d.row, 0, d.row, 6, "Critère (note de 1 à 5)", f(bold=True, bg_color="#F3F4F6", border=1, border_color=LINE, indent=1))
    d.bk.merge(d.ws, d.row, 7, d.row, 8, "Note", f(bold=True, bg_color="#F3F4F6", border=1, border_color=LINE, align="center"))
    d._fin_ligne(22)
    notes = []
    for critere, defaut in [("Qualité du travail", 4), ("Respect des délais et organisation", 4), ("Esprit d’équipe et communication", 5),
                            ("Initiative et autonomie", 3), ("Ponctualité et assiduité", 4), ("Respect des procédures et de la sécurité", 4)]:
        r = d.row
        d.bk.merge(d.ws, r, 0, r, 6, critere, f(border=1, border_color=LINE, indent=1))
        d.bk.merge(d.ws, r, 7, r, 8, defaut, f(bg_color=INPUT, border=1, border_color=LINE, align="center", bold=True))
        d.ws.data_validation(r, 7, r, 7, {"validate": "integer", "criteria": "between", "minimum": 1, "maximum": 5, "error_message": "Saisissez une note entière de 1 à 5."})
        notes.append(f"$H${r + 1}")
        d._fin_ligne(21)
    moyenne = f"AVERAGE({','.join(notes)})"
    d.bk.merge(d.ws, d.row, 0, d.row, 6, "NOTE MOYENNE", f(bold=True, border=1, border_color=NAVY, indent=1, bg_color="#F3F4F6"))
    d.bk.merge(d.ws, d.row, 7, d.row, 8, f"=ROUND({moyenne},2)", f(bold=True, border=1, border_color=NAVY, align="center", num_format="0.00", bg_color="#F3F4F6"))
    d._fin_ligne(24)
    appreciation = f'IF({moyenne}>=4.5,"Excellent",IF({moyenne}>=3.5,"Très satisfaisant",IF({moyenne}>=2.5,"Satisfaisant","À améliorer")))'
    d.sp(6)
    d.kv("Appréciation globale :", E(appreciation))
    d.sp(6)
    d.p("Points forts et axes de progrès :", bold=True, align="left")
    d.bk.merge(d.ws, d.row, 0, d.row, NCOL - 1, "", f(border=1, border_color=LINE))
    d._fin_ligne(60)
    d.p("Objectifs pour la période suivante :", bold=True, align="left")
    d.bk.merge(d.ws, d.row, 0, d.row, NCOL - 1, "", f(border=1, border_color=LINE))
    d._fin_ligne(60)
    d.p("Fait à ", s("ville"), ", le ", E(long_date(date_doc)), ".", align="left")
    d.signatures(("Le salarié", "Signature"), ("L’évaluateur", "Signature"), ("La Direction", "Visa"))
    d.fin()


# (nom de la feuille, matricule d'exemple, constructeur)
DOCUMENTS = [
    ("Contrat CDI", 170, lambda d: contrat(d, False)),
    ("Contrat CDD", 63, lambda d: contrat(d, True)),
    ("Certificat de travail", 152, certificat),
    ("Attestation de travail", 17, lambda d: attestation(d, False)),
    ("Attestation travail & salaire", 55, lambda d: attestation(d, True)),
    ("Avertissement", 96, avertissement),
    ("Demande de congé", 42, demande_conge),
    ("Bon de sortie", 42, bon_sortie),
    ("Convocation entretien", 108, convocation),
    ("Licenciement", 107, licenciement),
    ("Accusé de démission", 95, demission),
    ("Fin période essai", 122, fin_essai),
    ("Solde de tout compte", 152, solde_tout_compte),
    ("Ordre de mission", 150, ordre_mission),
    ("Évaluation annuelle", 90, evaluation),
]


def construire_documents(bk, feuilles: dict):
    for nom, matricule, fabrique in DOCUMENTS:
        d = Doc(bk, feuilles[nom], nom, matricule)
        fabrique(d)
