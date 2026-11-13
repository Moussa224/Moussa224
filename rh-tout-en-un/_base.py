"""Briques communes du générateur du classeur « Tableau de bord RH complet »."""

from __future__ import annotations

import math

import xlsxwriter

# Palette reprise de la vidéo : fond marine, orange, rose, vert sapin, vert des tableaux de bord.
NAVY = "#0B2540"
ORANGE = "#F28A1E"
ORANGE_DK = "#C96A06"
PINK = "#F43F5E"
TEAL = "#0F766E"
GREEN = "#6AA84F"
GREEN_DK = "#3F7D2E"
GREEN_LT = "#EAF3E3"
BLUE = "#3B5BA9"
GOLD = "#F6B800"
INK = "#1F2937"
MUTED = "#6B7280"
LINE = "#C9CED6"
INPUT = "#FFF2CC"  # cellules à saisir
CALC = "#EDEFF2"  # cellules calculées


class E:
    """Fragment de formule Excel brut (par opposition à un texte littéral)."""

    def __init__(self, expr: str):
        self.expr = expr


def lit(text: str) -> str:
    """Texte littéral pour une formule : 255 caractères maximum par littéral, d'où le découpage."""
    chunks = [text[i : i + 200] for i in range(0, len(text), 200)] or [""]
    return "&".join('"' + c.replace('"', '""') + '"' for c in chunks)


def concat(parts) -> str:
    """Assemble des textes et des E(...) en une formule `=...`, ou en texte simple s'il n'y a aucun champ."""
    if not any(isinstance(p, E) for p in parts):
        return "".join(parts)
    return "=" + "&".join(p.expr if isinstance(p, E) else lit(p) for p in parts)


def est_chars(parts, par_champ: int = 16) -> int:
    return sum(par_champ if isinstance(p, E) else len(p) for p in parts)


def lignes(parts, largeur: int = 98) -> int:
    texte_long = est_chars(parts)
    nb_sauts = sum(p.count("\n") for p in parts if isinstance(p, str))
    return max(1, math.ceil(texte_long / largeur)) + nb_sauts


def dmy(x: str) -> str:
    """Date jj/mm/aaaa sans dépendre de la langue d'Excel (TEXT(…, "jj/mm/aaaa") varie selon la langue)."""
    return f'TEXT(DAY({x}),"00")&"/"&TEXT(MONTH({x}),"00")&"/"&YEAR({x})'


def long_date(x: str) -> str:
    return f"DAY({x})&\" \"&INDEX(l_mois,MONTH({x}))&\" \"&YEAR({x})"


def hhmm(x: str) -> str:
    return f'TEXT(HOUR({x}),"00")&"h"&TEXT(MINUTE({x}),"00")'


class Book:
    def __init__(self, path: str, cache: dict | None = None):
        self.wb = xlsxwriter.Workbook(path)
        self.wb.set_calc_mode("auto")
        self.cache = cache or {}
        self.formulas: list[tuple[str, int, int]] = []
        self._fmts: dict = {}
        self.wb.set_properties(
            {
                "title": "Tableau de bord RH complet",
                "subject": "Tout votre service RH dans un seul fichier",
                "comments": "15 documents RH, 4 tableaux de bord, une base de données unique.",
            }
        )

    def fmt(self, **kw):
        key = tuple(sorted(kw.items()))
        if key not in self._fmts:
            base = {"font_name": "Calibri", "font_size": 11, "valign": "vcenter", "font_color": INK}
            base.update(kw)
            self._fmts[key] = self.wb.add_format(base)
        return self._fmts[key]

    def f(self, ws, row: int, col: int, formula: str, fmt=None):
        valeur = self.cache.get((ws.get_name(), row, col), 0)
        ws.write_formula(row, col, formula, fmt, valeur)
        self.formulas.append((ws.get_name(), row, col))

    def merge(self, ws, r1: int, c1: int, r2: int, c2: int, contenu, fmt):
        """Fusionne puis écrit un texte, un nombre ou une formule (texte commençant par « = »)."""
        if (r1, c1) == (r2, c2):
            self.put(ws, r1, c1, contenu, fmt)
            return
        ws.merge_range(r1, c1, r2, c2, "", fmt)
        self.put(ws, r1, c1, contenu, fmt)

    def put(self, ws, row: int, col: int, contenu, fmt=None):
        if isinstance(contenu, str) and contenu.startswith("="):
            self.f(ws, row, col, contenu, fmt)
        elif contenu is None:
            ws.write_blank(row, col, None, fmt)
        else:
            ws.write(row, col, contenu, fmt)

    def lien(self, ws, row: int, col: int, feuille: str, texte: str, fmt, col2: int | None = None, row2: int | None = None):
        cible = "internal:'" + feuille.replace("'", "''") + "'!A1"
        r2 = row if row2 is None else row2
        c2 = col if col2 is None else col2
        if (r2, c2) != (row, col):
            ws.merge_range(row, col, r2, c2, "", fmt)
        ws.write_url(row, col, cible, fmt, texte)

    def close(self):
        self.wb.close()
