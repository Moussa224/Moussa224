"""Le README.md de ce dépôt est la page de profil GitHub de son propriétaire : on n'y touche pas."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_profile_readme_is_left_alone():
    profile = (ROOT / "README.md").read_text(encoding="utf-8")
    assert profile == "# Moussa224\nMoussa kourouma\n"


def test_jarvis_documentation_lives_in_its_own_file():
    assert (ROOT / "JARVIS.md").read_text(encoding="utf-8").startswith("# Jarvis\n")
    assert 'readme = "JARVIS.md"' in (ROOT / "pyproject.toml").read_text(encoding="utf-8")
