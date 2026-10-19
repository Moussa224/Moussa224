import pytest

from jarvis import tools


@pytest.fixture(autouse=True)
def jarvis_home(tmp_path, monkeypatch):
    monkeypatch.setenv("JARVIS_HOME", str(tmp_path))


def test_calculate():
    assert tools.execute("calculate", {"expression": "2 + 3 * 4"}) == ("14", False)
    assert tools.execute("calculate", {"expression": "sqrt(16) + 2**3"}) == ("12.0", False)


@pytest.mark.parametrize(
    "expression",
    ["__import__('os').system('ls')", "1 / 0", "2 ** 100000", "open('x')", "1 +", "a" * 500],
)
def test_calculate_rejects_unsafe_or_invalid(expression):
    text, is_error = tools.execute("calculate", {"expression": expression})
    assert is_error, text


def test_get_datetime():
    text, is_error = tools.execute("get_datetime", {"timezone": "Europe/Paris"})
    assert not is_error and "Europe/Paris" in text
    assert tools.execute("get_datetime", {"timezone": "Nulle/Part"})[1] is True
    assert tools.execute("get_datetime", {})[1] is False


def test_notes_roundtrip():
    assert tools.execute("list_notes", {}) == ("Aucune note.", False)
    assert tools.execute("add_note", {"text": "acheter du pain"}) == ("Note 1 enregistrée.", False)
    assert tools.execute("add_note", {"text": "appeler Awa"})[0] == "Note 2 enregistrée."
    listing, _ = tools.execute("list_notes", {})
    assert "acheter du pain" in listing and "appeler Awa" in listing

    assert tools.execute("delete_note", {"id": 1}) == ("Note 1 supprimée.", False)
    assert tools.execute("add_note", {"text": "x"})[0] == "Note 3 enregistrée."
    assert tools.execute("delete_note", {"id": 99})[1] is True


def test_invalid_calls():
    assert tools.execute("add_note", {"text": "  "})[1] is True
    assert tools.execute("add_note", {"text": 5})[1] is True
    assert tools.execute("add_note", {"nope": "x"})[1] is True
    assert tools.execute("inconnu", {})[1] is True


def test_corrupted_notes_file(tmp_path):
    (tmp_path / "notes.json").write_text("{pas du json")
    text, is_error = tools.execute("list_notes", {})
    assert is_error and "corrompu" in text


def test_every_tool_is_declared_and_handled():
    declared = {t["name"] for t in tools.TOOLS}
    assert declared == set(tools._HANDLERS)
