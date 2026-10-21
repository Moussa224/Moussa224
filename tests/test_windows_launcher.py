"""Les lanceurs Windows ne peuvent pas tourner sur la CI Linux : on vérifie au moins ce qui les casserait."""

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
CLAUDE = ROOT / "Lancer-Jarvis.bat"
FREE = ROOT / "Lancer-Jarvis-Gratuit.bat"
LAUNCHERS = pytest.mark.parametrize("launcher", [CLAUDE, FREE], ids=lambda path: path.name)


def lines(launcher: Path = CLAUDE):
    return launcher.read_bytes().decode("ascii").split("\r\n")


def content(launcher: Path = CLAUDE) -> str:
    return "\n".join(lines(launcher))


@LAUNCHERS
def test_the_launcher_is_plain_ascii_with_windows_line_endings(launcher):
    raw = launcher.read_bytes()
    raw.decode("ascii")  # pas d'accent : cmd les afficherait de travers selon la page de code
    assert raw.count(b"\n") == raw.count(b"\r\n") > 50, "fins de ligne CRLF obligatoires (sinon `goto` peut échouer)"


@LAUNCHERS
def test_every_jump_has_a_label(launcher):
    text = content(launcher)
    labels = set(re.findall(r"^:(\w+)\s*$", text, flags=re.MULTILINE))
    targets = set(re.findall(r"\bgoto\s+:?(\w+)", text, flags=re.IGNORECASE)) - {"eof"}
    assert targets <= labels, f"étiquettes manquantes : {targets - labels}"
    assert {"menu", "diag", "web", "terminal", "fin"} <= labels


@LAUNCHERS
def test_no_parentheses_in_echo_text_inside_blocks(launcher):
    """Une parenthèse dans un `echo` placé dans un bloc ( ... ) referme le bloc trop tôt."""
    for number, line in enumerate(lines(launcher), start=1):
        if line.startswith(" ") and line.strip().lower().startswith("echo "):
            assert "(" not in line and ")" not in line, f"ligne {number} : {line!r}"


@LAUNCHERS
def test_it_does_what_it_promises(launcher):
    text = content(launcher)
    assert 'cd /d "%~dp0"' in text  # travaille dans son propre dossier, d'où `python -m jarvis` fonctionne
    assert "sys.version_info >= (3, 10)" in text
    assert "pip install" in text and "anthropic" in text
    for command in ("-m jarvis --diagnostic", "-m jarvis --web", "-m jarvis\r\n".strip()):
        assert command in text


@LAUNCHERS
def test_a_launcher_run_outside_the_project_folder_explains_what_to_do(launcher):
    """Constaté : un .bat ouvert depuis l'intérieur du ZIP tourne seul, sans le dossier `jarvis`."""
    text = content(launcher)
    guard = text.index('if not exist "jarvis\\__main__.py"')
    assert guard < text.index("sys.version_info") < text.index("pip install")  # avant toute installation
    assert "Extraire tout" in text[guard : guard + 600] and "exit /b 1" in text[guard : guard + 600]


def test_the_claude_launcher_asks_for_the_anthropic_key():
    assert "ANTHROPIC_API_KEY" in content(CLAUDE)


def test_the_claude_launcher_ignores_a_gateway_set_for_the_other_launcher():
    """Sinon, Jarvis resterait branché sur FreeLLMAPI alors qu'on a lancé la version Claude."""
    text = content(CLAUDE)
    assert text.index('set "JARVIS_GATEWAY_URL="') < text.index(":menu")


def test_the_free_launcher_asks_for_the_gateway_and_never_touches_the_anthropic_key():
    text = content(FREE)
    for variable in ("JARVIS_GATEWAY_URL", "JARVIS_GATEWAY_KEY"):
        assert f'set /p "{variable}=' in text
    assert "ANTHROPIC" not in text  # surtout pas de `setx` qui écraserait la vraie clé Anthropic


@pytest.mark.parametrize("launcher, stored", [(CLAUDE, 1), (FREE, 2)], ids=lambda value: getattr(value, "name", value))
def test_settings_are_only_stored_when_the_user_says_so(launcher, stored):
    text = content(launcher)
    assert text.count("setx") == stored
    before = text[: text.index("setx")]
    assert "choice /c ON" in before and "if not errorlevel 2" in before  # seulement si « O »
    assert text.rindex("setx") < text.index(":menu")


def test_git_keeps_the_launchers_byte_for_byte():
    attributes = (ROOT / ".gitattributes").read_text()
    assert "*.bat -text" in attributes
