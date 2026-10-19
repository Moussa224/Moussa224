import sys

import pytest

from jarvis import tools


def yes(question):
    return True


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


def test_memory_is_separate_from_notes():
    assert tools.load_memories() == []
    assert "souvenir 1" in tools.execute("remember", {"fact": "Préfère le tutoiement"})[0]
    assert tools.execute("list_notes", {})[0] == "Aucune note."
    assert [m["text"] for m in tools.load_memories()] == ["Préfère le tutoiement"]

    assert tools.execute("forget", {"id": 1}) == ("Souvenir 1 oublié.", False)
    assert tools.execute("forget", {"id": 1})[1] is True
    assert tools.load_memories() == []


def test_invalid_calls():
    assert tools.execute("add_note", {"text": "  "})[1] is True
    assert tools.execute("add_note", {"text": 5})[1] is True
    assert tools.execute("add_note", {"nope": "x"})[1] is True
    assert tools.execute("inconnu", {})[1] is True


def test_corrupted_files_are_reported(isolated_environment):
    isolated_environment.mkdir()
    (isolated_environment / "notes.json").write_text("{pas du json")
    (isolated_environment / "memory.json").write_text("{pas du json")

    text, is_error = tools.execute("list_notes", {})
    assert is_error and "corrompu" in text
    assert tools.load_memories() == []  # un souvenir illisible ne doit pas bloquer Jarvis


def test_every_tool_is_declared_and_handled():
    declared = {t["name"] for t in tools.TOOLS}
    assert declared == set(tools._HANDLERS)
    assert set(tools._GUARDS) <= declared


# --- Fichiers et commandes -------------------------------------------------


@pytest.fixture
def workdir(tmp_path, monkeypatch):
    work = tmp_path / "work"
    work.mkdir()
    monkeypatch.chdir(work)
    return work


def test_reading_inside_the_working_directory_needs_no_approval(workdir):
    (workdir / "a.txt").write_text("bonjour")
    (workdir / "sous").mkdir()

    assert tools.execute("read_file", {"path": "a.txt"}) == ("bonjour", False)
    assert tools.execute("list_directory", {}) == ("sous/\na.txt", False)


def test_reading_outside_the_working_directory_needs_approval(workdir, tmp_path):
    secret = tmp_path / "secret.txt"
    secret.write_text("mot de passe")

    text, is_error = tools.execute("read_file", {"path": str(secret)})
    assert (text, is_error) == ("L'utilisateur a refusé cette action.", False)
    assert tools.execute("read_file", {"path": str(secret)}, confirm=yes) == ("mot de passe", False)
    assert tools.execute("list_directory", {"path": str(tmp_path)})[0].startswith("L'utilisateur")


def test_read_file_is_truncated_and_errors_are_clear(workdir):
    (workdir / "gros.txt").write_text("x" * 30_000)

    text, _ = tools.execute("read_file", {"path": "gros.txt"})
    assert len(text) < 21_000 and "tronqué" in text
    assert tools.execute("read_file", {"path": "absent.txt"})[1] is True
    assert tools.execute("list_directory", {"path": "absent"})[1] is True


def test_write_file_always_asks(workdir):
    questions = []

    def record(question):
        questions.append(question)
        return True

    assert tools.execute("write_file", {"path": "x.txt", "content": "un"})[0].startswith("L'utilisateur")
    assert not (workdir / "x.txt").exists()

    tools.execute("write_file", {"path": "dossier/x.txt", "content": "un"}, confirm=record)
    tools.execute("write_file", {"path": "dossier/x.txt", "content": "deux"}, confirm=record)

    assert (workdir / "dossier" / "x.txt").read_text() == "deux"
    assert questions[0].startswith("Créer") and questions[1].startswith("Écraser")
    assert tools.execute("write_file", {"path": ".", "content": "x"}, confirm=yes)[1] is True


def test_run_command_always_asks(workdir):
    denied = tools.execute("run_command", {"command": "echo salut > fait.txt"})
    assert denied[0].startswith("L'utilisateur") and not (workdir / "fait.txt").exists()

    assert tools.execute("run_command", {"command": "echo salut"}, confirm=yes) == (
        "Code de sortie : 0\nsalut",
        False,
    )


def test_run_command_reports_failures_and_timeouts(workdir):
    text, is_error = tools.execute("run_command", {"command": "echo erreur >&2; exit 3"}, confirm=yes)
    assert not is_error and text == "Code de sortie : 3\nerreur"

    sleeper = f'"{sys.executable}" -c "import time; time.sleep(5)"'
    text, is_error = tools.execute("run_command", {"command": sleeper, "timeout": 1}, confirm=yes)
    assert is_error and "interrompue" in text


def test_run_command_cannot_read_stdin(workdir):
    text, _ = tools.execute("run_command", {"command": "cat"}, confirm=yes)
    assert text == "Code de sortie : 0"


def test_invalid_timeout_is_an_argument_error(workdir):
    assert tools.execute("run_command", {"command": "echo a", "timeout": "vite"}, confirm=yes)[1] is True
