"""Vérifie que l'application coranique est complète et que ses données sont intactes."""

import importlib.util
import json
import re
import unicodedata
from pathlib import Path

import pytest

APP = Path(__file__).resolve().parent.parent / "application-coranique"


def _lire(chemin: str) -> str:
    return (APP / chemin).read_text(encoding="utf-8")


def _charger_generateur():
    spec = importlib.util.spec_from_file_location("generer_donnees", APP / "outils" / "generer_donnees.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _sourates() -> list[dict]:
    lignes = re.findall(r"^\s*(\{.*\}),?$", _lire("data/sourates.js"), flags=re.MULTILINE)
    return [json.loads(ligne) for ligne in lignes]


def _versets(n: int) -> list[list[str]]:
    texte = _lire(f"data/s/{n:03d}.js")
    return json.loads(texte.split(f")[{n}]=", 1)[1].rstrip().removesuffix(";"))


SOURATES = _sourates()


# ---------- Les données ----------


def test_les_114_sourates_et_6236_versets_sont_la():
    assert [s["n"] for s in SOURATES] == list(range(1, 115))
    assert sum(s["v"] for s in SOURATES) == 6236


@pytest.mark.parametrize("sourate", SOURATES, ids=lambda s: f"{s['n']:03d}-{s['nom']}")
def test_chaque_sourate_est_complete(sourate):
    versets = _versets(sourate["n"])
    assert len(versets) == sourate["v"]
    for arabe, phonetique, francais in versets:
        assert arabe.strip() and phonetique.strip() and francais.strip()
        assert re.search(r"[ء-ي]", arabe), "le texte arabe doit contenir des lettres"
        assert chr(0x2009) not in arabe  # espace fine parasite
        assert "AA" not in phonetique  # la lettre aïn doit avoir été convertie
        assert not re.search(r"[A-Z]{2}", phonetique)


def test_la_bismillah_est_le_premier_verset_de_la_fatiha():
    arabe, phonetique, francais = _versets(1)[0]
    lettres = "".join(c for c in arabe if unicodedata.category(c) != "Mn")  # sans les voyelles ni les signes
    assert lettres.split(" ") == ["بسم", "ٱلله", "ٱلرحمن", "ٱلرحيم"]
    assert phonetique == "Bismi Allahi alrrahmani alrrahimi"
    assert francais.startswith("Au nom d'Allah")


# ---------- La phonétique à la française ----------


@pytest.mark.parametrize(
    ("anglais", "francais"),
    [
        ("Alhamdu lillahi rabbi alAAalameena", "Alhamdou lillahi rabbi al‘alamina"),
        ("Qul huwa Allahu ahadun", "Qoul houwa Allahou ahadoun"),
        ("Allatheena amanoo waAAamiloo", "Allathina amanou wa‘amilou"),
        ("AAamma yatasaaloona", "‘Amma yatassalouna"),
        ("onzila ilayka", "Ounzila ilayka"),
        ("min sharri ma khalaqa", "Min charri ma khalaqa"),
        ("alssalihati wajaAAala", "Alssalihati wadja‘ala"),
    ],
)
def test_phonetique_fr(anglais, francais):
    assert _charger_generateur().phonetique_fr(anglais) == francais


# ---------- Les fichiers de l'application ----------


def test_les_fichiers_cites_par_la_page_existent():
    page = _lire("index.html")
    for chemin in re.findall(r'(?:src|href)="([^"#:]+\.(?:js|css|png|svg|webmanifest))"', page):
        assert (APP / chemin).is_file(), chemin


def test_le_service_worker_garde_des_fichiers_qui_existent():
    sw = _lire("sw.js")
    fichiers = re.search(r"const FICHIERS = \[(.*?)\];", sw, flags=re.DOTALL).group(1)
    for chemin in re.findall(r"'([^']+)'", fichiers):
        if chemin != "./":
            assert (APP / chemin).is_file(), chemin


def test_le_cache_des_sourates_porte_le_meme_nom_partout():
    nom_sw = re.search(r"const DONNEES = '([^']+)'", _lire("sw.js")).group(1)
    nom_app = re.search(r"const NOM_CACHE = '([^']+)'", _lire("js/donnees.js")).group(1)
    assert nom_sw == nom_app


def test_le_manifeste_est_valide_et_ses_icones_existent():
    manifeste = json.loads(_lire("manifest.webmanifest"))
    assert manifeste["lang"] == "fr"
    for icone in manifeste["icons"]:
        assert (APP / icone["src"]).is_file(), icone["src"]


def test_les_polices_ont_leur_licence():
    assert (APP / "polices" / "LICENCE-AmiriQuran.txt").is_file()
    assert (APP / "polices" / "LICENCE-Atkinson.txt").is_file()


# ---------- Le contenu pédagogique renvoie à de vrais versets ----------


def _mots(s: int, v: int) -> list[str]:
    return _versets(s)[v - 1][0].split(" ")


def test_les_exemples_de_tajwid_pointent_sur_de_vrais_mots():
    contenu = _lire("js/contenu.js")
    exemples = re.findall(r"\{ s: (\d+), v: (\d+), mots: \[(\d+), (\d+)\]", contenu)
    assert len(exemples) >= 12
    for s, v, debut, fin in map(lambda e: tuple(map(int, e)), exemples):
        assert 1 <= s <= 114 and 1 <= v <= SOURATES[s - 1]["v"], (s, v)
        assert 0 <= debut <= fin < len(_mots(s, v)), (s, v, debut, fin)


def test_le_parcours_et_les_versets_du_jour_existent():
    contenu = _lire("js/contenu.js")
    parcours = re.findall(r"type: 'passage', s: (\d+), de: (\d+), a: (\d+)", contenu)
    assert len(parcours) >= 10
    for s, de, a in map(lambda e: tuple(map(int, e)), parcours):
        assert 1 <= de <= a <= SOURATES[s - 1]["v"], (s, de, a)
    jour = re.search(r"versetsDuJour: \[(.*?)\n  \]", contenu, flags=re.DOTALL).group(1)
    refs = [tuple(map(int, r)) for r in re.findall(r"\[(\d+), (\d+)\]", jour)]
    assert len(refs) >= 15
    for s, v in refs:
        assert 1 <= v <= SOURATES[s - 1]["v"], (s, v)


def test_les_recitants_ont_un_identifiant_unique():
    contenu = _lire("js/contenu.js")
    ids = re.findall(r"\{ id: '([a-z]+)', nom: '[^']+', style:", contenu)
    assert len(ids) == len(set(ids)) >= 4
