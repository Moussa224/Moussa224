import pytest
from conftest import FakeClient, response, text_block

import jarvis.agent
from jarvis import __main__ as cli


@pytest.fixture
def fake_api(monkeypatch):
    """Remplace le client Anthropic créé par Jarvis ; renvoie la liste des clients."""
    clients = []

    def install(*responses):
        client = FakeClient(*responses)
        clients.append(client)
        monkeypatch.setattr(jarvis.agent.anthropic, "Anthropic", lambda: client)
        return client

    return install


def test_one_shot_question(fake_api, capsys):
    fake_api(response("end_turn", text_block("Bonjour Moussa.")))

    assert cli.main(["Salut", "Jarvis"]) == 0

    assert capsys.readouterr().out == "Bonjour Moussa.\n"


def test_options_are_passed_to_jarvis(fake_api):
    client = fake_api(response("end_turn"))

    cli.main(["--sans-web", "--modele", "claude-haiku-5-5", "a"])

    request = client.requests[0]
    assert request["model"] == "claude-haiku-5-5"
    assert not any(t.get("name") == "web_search" for t in request["tools"])


def test_interactive_loop(fake_api, monkeypatch, capsys):
    client = fake_api(
        response("end_turn", text_block("Un.")),
        response("end_turn", text_block("Deux.")),
    )
    inputs = iter(["", "/aide", "premier", "/reset", "second", "/quitter"])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))

    assert cli.main([]) == 0

    out = capsys.readouterr().out
    assert "Commandes :" in out and "Un." in out and "Deux." in out
    assert len(client.requests[1]["messages"]) == 1  # /reset a bien tout oublié


def test_end_of_input_quits_cleanly(fake_api, monkeypatch):
    fake_api()

    def eof(prompt=""):
        raise EOFError

    monkeypatch.setattr("builtins.input", eof)
    assert cli.main([]) == 0


def test_voice_option_reads_the_reply_aloud(fake_api, monkeypatch):
    fake_api(response("end_turn", text_block("Il fait beau.")))
    spoken = []
    monkeypatch.setattr(cli.voice, "speak", lambda text: spoken.append(text) or True)

    cli.main(["--voix", "météo ?"])

    assert spoken == ["Il fait beau."]


def test_missing_voice_is_reported_once(fake_api, monkeypatch, capsys):
    fake_api(response("end_turn"), response("end_turn"))
    monkeypatch.setattr(cli.voice, "speak", lambda text: False)
    inputs = iter(["a", "b", "/quitter"])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))

    cli.main(["--voix"])

    assert capsys.readouterr().err.count("Synthèse vocale indisponible") == 1


def test_errors_are_explained_not_dumped(fake_api, capsys):
    fake_api(response("refusal"))

    assert cli.main(["quelque chose"]) == 1

    assert "Je ne peux pas répondre" in capsys.readouterr().err


def test_missing_api_key_is_explained(capsys, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_AUTH_TOKEN", raising=False)
    monkeypatch.setenv("HOME", "/nonexistent")

    assert cli.main(["bonjour"]) == 1

    assert "Aucune clé API" in capsys.readouterr().err


@pytest.mark.parametrize("answer, expected", [("o", True), ("OUI", True), ("", False), ("non", False)])
def test_confirmation_prompt(monkeypatch, capsys, answer, expected):
    monkeypatch.setattr("builtins.input", lambda prompt="": answer)
    assert cli.ask_confirmation("Exécuter la commande : ls") is expected
    assert "Exécuter la commande : ls" in capsys.readouterr().err


def test_confirmation_without_a_terminal_refuses(monkeypatch):
    def eof(prompt=""):
        raise EOFError

    monkeypatch.setattr("builtins.input", eof)
    assert cli.ask_confirmation("Exécuter la commande : ls") is False


def test_colors_only_on_a_terminal(monkeypatch):
    class Tty:
        def isatty(self):
            return True

    assert cli.style("a", "1", Tty()) == "\033[1ma\033[0m"
    monkeypatch.setenv("NO_COLOR", "1")
    assert cli.style("a", "1", Tty()) == "a"
    assert cli.style("a", "1") == "a"  # sortie de test : pas un terminal


def test_tool_arguments_are_shortened_for_display():
    assert cli.short({"command": "ls"}) == "command='ls'"
    assert len(cli.short({"content": "x" * 500})) == 80


def test_continue_resumes_the_saved_conversation(fake_api, capsys):
    fake_api(response("end_turn", text_block("Bonjour.")))
    cli.main(["Salut"])
    client = fake_api(response("end_turn", text_block("Encore là.")))

    assert cli.main(["--continuer", "Toujours là ?"]) == 0

    assert "Conversation reprise (2 messages)." in capsys.readouterr().out
    assert [m["role"] for m in client.requests[0]["messages"]] == ["user", "assistant", "user"]


def test_continue_without_a_saved_conversation(fake_api, capsys):
    fake_api(response("end_turn", text_block("Bonjour.")))

    cli.main(["--continuer", "Salut"])

    assert "Aucune conversation à reprendre." in capsys.readouterr().out


def test_web_option_starts_the_local_server(monkeypatch):
    from jarvis import web

    started = {}
    monkeypatch.setattr(web, "serve", lambda *args, **kwargs: started.update(args=args, kwargs=kwargs))

    assert cli.main(["--web", "--port", "9000", "--sans-web", "--continuer", "--sans-navigateur"]) == 0

    assert started["args"] == (9000, {"model": None, "web": False})
    assert started["kwargs"] == {"resume": True, "open_browser": False}


def test_web_option_explains_a_busy_port(monkeypatch, capsys):
    from jarvis import web

    def busy(*args, **kwargs):
        raise OSError(98, "Address already in use")

    monkeypatch.setattr(web, "serve", busy)

    assert cli.main(["--web"]) == 1

    assert "port 8765" in capsys.readouterr().err


def test_model_output_cannot_drive_the_terminal(fake_api, capsys):
    """Un texte venu du web (via le modèle) ne doit pas injecter de séquences d'échappement."""
    hostile = "salut\x1b]52;c;ZXZpbA==\x07\x1b[2J\r efface\ttout\nfin"
    fake_api(response("end_turn", text_block(hostile)))

    cli.main(["bonjour"])

    out = capsys.readouterr().out
    assert "\x1b" not in out and "\x07" not in out and "\r" not in out
    assert "salut" in out and "\tout" not in out and "efface\ttout\nfin" in out  # texte et mise en forme gardés
