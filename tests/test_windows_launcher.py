"""Le lanceur Windows ne peut pas tourner sur la CI Linux : on vérifie au moins ce qui le casserait."""

import re
from pathlib import Path

LAUNCHER = Path(__file__).resolve().parent.parent / "Lancer-Jarvis.bat"


def lines():
    return LAUNCHER.read_bytes().decode("ascii").split("\r\n")


def test_the_launcher_is_plain_ascii_with_windows_line_endings():
    raw = LAUNCHER.read_bytes()
    raw.decode("ascii")  # pas d'accent : cmd les afficherait de travers selon la page de code
    assert raw.count(b"\n") == raw.count(b"\r\n") > 50, "fins de ligne CRLF obligatoires (sinon `goto` peut échouer)"


def test_every_jump_has_a_label():
    text = "\n".join(lines())
    labels = set(re.findall(r"^:(\w+)\s*$", text, flags=re.MULTILINE))
    targets = set(re.findall(r"\bgoto\s+:?(\w+)", text, flags=re.IGNORECASE)) - {"eof"}
    assert targets <= labels, f"étiquettes manquantes : {targets - labels}"
    assert {"menu", "diag", "web", "terminal", "fin"} <= labels


def test_no_parentheses_in_echo_text_inside_blocks():
    """Une parenthèse dans un `echo` placé dans un bloc ( ... ) referme le bloc trop tôt."""
    for number, line in enumerate(lines(), start=1):
        if line.startswith(" ") and line.strip().lower().startswith("echo "):
            assert "(" not in line and ")" not in line, f"ligne {number} : {line!r}"


def test_it_does_what_it_promises():
    text = "\n".join(lines())
    assert 'cd /d "%~dp0"' in text  # travaille dans son propre dossier, d'où `python -m jarvis` fonctionne
    assert "sys.version_info >= (3, 10)" in text
    assert "pip install" in text and "anthropic" in text
    assert "ANTHROPIC_API_KEY" in text
    for command in ("-m jarvis --diagnostic", "-m jarvis --web", "-m jarvis\r\n".strip()):
        assert command in text


def test_the_api_key_is_only_stored_when_the_user_says_so():
    text = "\n".join(lines())
    assert text.count("setx") == 1
    before = text[: text.index("setx")]
    assert "choice /c ON" in before and "if not errorlevel 2" in before  # seulement si « O »


def test_git_keeps_the_launcher_byte_for_byte():
    attributes = (LAUNCHER.parent / ".gitattributes").read_text()
    assert "*.bat -text" in attributes
