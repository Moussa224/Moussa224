"""Génère les fichiers de données de l'application coranique.

Source : le paquet npm « quran-json » (texte Tanzil, traduction française de Muhammad Hamidullah,
translittération Tanzil). Utilisation :

    cd /un/dossier/vide && npm pack quran-json@3.1.2 && tar xzf quran-json-3.1.2.tgz
    python application-coranique/outils/generer_donnees.py /un/dossier/vide/package/dist

Produit data/sourates.js (la liste des 114 sourates) et data/s/001.js … 114.js (un fichier par sourate,
chargé seulement quand on l'ouvre). Ce sont des fichiers .js et non .json pour que l'application
fonctionne aussi quand on ouvre index.html directement depuis le disque.
"""

from __future__ import annotations

import json
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

DOSSIER_APP = Path(__file__).resolve().parent.parent

# Noms des sourates tels qu'on les écrit couramment en français (sans signes spéciaux, faciles à chercher).
NOMS = [
    "Al-Fatiha", "Al-Baqara", "Al-Imran", "An-Nisa", "Al-Ma'ida", "Al-An'am", "Al-A'raf", "Al-Anfal",
    "At-Tawba", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf",
    "Maryam", "Ta-Ha", "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara",
    "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum", "Luqman", "As-Sajda", "Al-Ahzab", "Saba", "Fatir",
    "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan",
    "Al-Jathiya", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Adh-Dhariyat", "At-Tur",
    "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'a", "Al-Hadid", "Al-Mujadala", "Al-Hashr", "Al-Mumtahana",
    "As-Saff", "Al-Jumu'a", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam",
    "Al-Haqqa", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyama", "Al-Insan",
    "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin",
    "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiya", "Al-Fajr", "Al-Balad", "Ash-Shams",
    "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-Alaq", "Al-Qadr", "Al-Bayyina", "Az-Zalzala",
    "Al-Adiyat", "Al-Qari'a", "At-Takathur", "Al-Asr", "Al-Humaza", "Al-Fil", "Quraysh", "Al-Ma'un",
    "Al-Kawthar", "Al-Kafirun", "An-Nasr", "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas",
]

# Sens des noms : on garde la traduction de la source, sauf quand elle n'aide pas (nom laissé tel quel, etc.).
SENS_CORRIGES = {
    3: "La famille d'Imran",
    7: "Les hauteurs",
    15: "Le Hijr (région rocheuse)",
    20: "Lettres Ta et Ha",
    34: "Saba (peuple du Yémen)",
    36: "Lettres Ya et Sin",
    38: "Lettre Sad",
    46: "Les dunes",
    50: "Lettre Qaf",
    51: "Les vents qui éparpillent",
    52: "Le mont",
    94: "Le soulagement",
}


_VOYELLES = {"oo": "ou", "ee": "i", "aa": "a", "o": "ou", "e": "i", "u": "ou"}


def phonetique_fr(translit: str) -> str:
    """Réécrit la translittération (écrite à l'anglaise) avec l'orthographe qu'un francophone lit naturellement.

    Dans la source, « u » (et « o » seul) note la voyelle courte « ou », « oo » le « ou » long, « ee » le « i » long,
    « AA » la lettre ع (aïn), « j » la lettre ج. Les longueurs de voyelles ne sont pas notées de façon fiable
    dans la source, on ne les reprend donc pas : c'est l'audio qui montre la durée.
    """
    t = translit.replace("AA", "‘")  # lettre ع (aïn)
    t = t[:1].lower() + t[1:]  # la majuscule de début de phrase est remise à la fin
    t = re.sub(r"(?<=[aeiou])s(?=[aeiou])", "ss", t)  # un « s » entre deux voyelles se lirait « z » en français
    t = t.replace("sh", "ch")
    t = re.sub(r"oo|ee|aa|[oeu]", lambda m: _VOYELLES[m.group()], t)  # en une seule passe : « ou » n'est pas retraité
    t = t.replace("j", "dj")
    for i, c in enumerate(t):  # majuscule en début de phrase, même si la phrase commence par ‘ (aïn)
        if c.isalpha():
            return t[:i] + c.upper() + t[i + 1:]
    return t


def _normaliser_nom(nom: str) -> str:
    return re.sub(r"[^a-z]", "", nom.lower())


def construire(dossier_source: Path, dossier_app: Path = DOSSIER_APP) -> int:
    arabe = json.loads((dossier_source / "quran.json").read_text(encoding="utf-8"))
    francais = json.loads((dossier_source / "quran_fr.json").read_text(encoding="utf-8"))
    translit = json.loads((dossier_source / "quran_transliteration.json").read_text(encoding="utf-8"))
    assert len(arabe) == len(francais) == len(translit) == len(NOMS) == 114

    (dossier_app / "data" / "s").mkdir(parents=True, exist_ok=True)
    sourates = []
    total = 0
    for a, f, t in zip(arabe, francais, translit, strict=True):
        n = a["id"]
        assert f["id"] == t["id"] == n
        nb = a["total_verses"]
        assert len(a["verses"]) == len(f["verses"]) == len(t["verses"]) == nb
        # Les noms choisis doivent rester proches de ceux de la source (garde-fou contre un nom décalé ou une faute).
        proche = SequenceMatcher(None, _normaliser_nom(NOMS[n - 1]), _normaliser_nom(t["transliteration"])).ratio()
        assert proche > 0.85, (n, NOMS[n - 1], t["transliteration"])

        versets = []
        for i, (va, vf, vt) in enumerate(zip(a["verses"], f["verses"], t["verses"], strict=True), start=1):
            assert va["id"] == vf["id"] == vt["id"] == i
            texte = va["text"].replace(chr(0x2009), " ")
            versets.append([texte, phonetique_fr(vt["transliteration"]), vf["translation"].strip()])
        total += nb

        contenu = json.dumps(versets, ensure_ascii=False, separators=(",", ":"))
        assert chr(0x2028) not in contenu and chr(0x2029) not in contenu
        (dossier_app / "data" / "s" / f"{n:03d}.js").write_text(
            f"(window.TEXTES=window.TEXTES||{{}})[{n}]={contenu};\n", encoding="utf-8"
        )
        sourates.append(
            {
                "n": n,
                "ar": a["name"],
                "nom": NOMS[n - 1],
                "sens": SENS_CORRIGES.get(n, f["translation"]),
                "v": nb,
                "lieu": "M" if a["type"] == "meccan" else "D",
            }
        )

    assert total == 6236, total
    lignes = ",\n".join("  " + json.dumps(s, ensure_ascii=False, separators=(",", ":")) for s in sourates)
    (dossier_app / "data" / "sourates.js").write_text(
        "/* Généré par outils/generer_donnees.py : ne pas modifier à la main.\n"
        "   n = numéro · ar = nom arabe · nom = nom français · sens = signification · v = nombre de versets\n"
        "   lieu = M (révélée à La Mecque) ou D (révélée à Médine) */\n"
        f"window.SOURATES = [\n{lignes}\n];\n",
        encoding="utf-8",
    )
    return total


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    total = construire(Path(sys.argv[1]))
    print(f"{total} versets écrits dans {DOSSIER_APP / 'data'}")


if __name__ == "__main__":
    main()
