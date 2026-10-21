from types import SimpleNamespace

import anthropic
import httpx2
import pytest
from conftest import FakeClient

import jarvis.agent
from jarvis import __main__ as cli
from jarvis import diagnostic, tools, voice


def api_error(kind, status, message="refus"):
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    return kind(message, response=httpx2.Response(status, request=request), body=None)


class FakeApi:
    """Joue des issues successives pour `messages.create` (réponse ou exception)."""

    def __init__(self, *outcomes):
        self.outcomes = list(outcomes)
        self.calls = []
        self.messages = self

    def create(self, **kwargs):
        self.calls.append(kwargs)
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return SimpleNamespace(stop_reason="end_turn")


@pytest.fixture(autouse=True)
def speaker_available(monkeypatch):
    monkeypatch.setattr(voice, "find_speaker", lambda: ("/usr/bin/espeak-ng", ["-v", "fr"]))


def run(api, **kwargs):
    lines = []
    ready = diagnostic.run(client=api, out=lines.append, **kwargs)
    return ready, "\n".join(lines)


def test_everything_works():
    api = FakeApi(None, None)

    ready, report = run(api)

    assert ready and "Tout est prêt." in report
    assert report.count("✓") == 4 and "✗" not in report
    assert len(api.calls) == 2


def test_probe_sends_the_very_same_request_as_jarvis():
    api = FakeApi(None, None)
    run(api)

    def real(web):
        return jarvis.agent.Jarvis(client=FakeClient(), web=web, persist=False).request(diagnostic.PROBE, 16)

    local, with_web = api.calls
    assert with_web == real(web=True)
    assert local == {**real(web=True), "tools": tools.TOOLS}  # mêmes réglages, sans les outils web
    assert local["max_tokens"] == 16 and local["model"] == "claude-opus-5-5"


def test_a_refused_key_stops_the_checks_and_fails():
    api = FakeApi(api_error(anthropic.AuthenticationError, 401))

    ready, report = run(api)

    assert not ready and "Clé API refusée" in report
    assert "Recherche web : non testée" in report and len(api.calls) == 1


def test_a_missing_key_is_explained():
    api = FakeApi(TypeError('"Could not resolve authentication method. Expected one of api_key"'))

    ready, report = run(api)

    assert not ready and "Aucune clé API" in report


def test_unexpected_errors_are_not_hidden():
    with pytest.raises(TypeError, match="bug"):
        run(FakeApi(TypeError("bug du programme")))


def test_a_bad_model_or_tool_definition_is_reported_with_the_api_message():
    api = FakeApi(api_error(anthropic.NotFoundError, 404, "model: claude-inconnu"))

    ready, report = run(api, model="claude-inconnu")

    assert not ready and "Erreur de l'API (404) : model: claude-inconnu" in report


def api_error_with_body(kind, status, message):
    """Une erreur comme le SDK la construit vraiment : message préfixé et corps JSON."""
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    body = {"type": "error", "error": {"type": "invalid_request_error", "message": message}}
    return kind(f"Error code: {status} - {body}", response=httpx2.Response(status, request=request), body=body)


def test_an_empty_balance_is_explained_not_dumped():
    """Cas réel, rencontré avec une vraie clé : l'API répond 400 « credit balance is too low »."""
    api = FakeApi(
        api_error_with_body(
            anthropic.BadRequestError,
            400,
            "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade.",
        )
    )

    ready, report = run(api)

    assert not ready and "n'a plus de crédits" in report and "Plans & Billing" in report
    assert "Error code" not in report and "request_id" not in report


def test_other_api_errors_show_the_api_message_without_the_sdk_prefix():
    api = FakeApi(api_error_with_body(anthropic.NotFoundError, 404, "model: claude-inconnu"))

    _, report = run(api)

    assert "Erreur de l'API (404) : model: claude-inconnu" in report and "Error code" not in report


def test_a_key_without_a_workspace_gets_an_actionable_message():
    """Une clé non liée à un workspace est refusée (400) : le message doit dire quoi faire."""
    api = FakeApi(
        api_error(
            anthropic.BadRequestError,
            400,
            "anthropic-workspace-id is required when authenticating with an identity-linked API key",
        )
    )

    ready, report = run(api)

    assert not ready and "recréez-la en choisissant un workspace" in report
    assert "platform.claude.com/settings/keys" in report


def test_refused_web_search_is_a_warning_not_a_failure():
    api = FakeApi(None, api_error(anthropic.BadRequestError, 400, "web_search non autorisé"))

    ready, report = run(api)

    assert ready
    assert "! Recherche web refusée" in report and "web_search non autorisé" in report and "--sans-web" in report


def test_web_check_can_be_skipped():
    api = FakeApi(None)

    ready, report = run(api, web=False)

    assert ready and "désactivée (--sans-web)" in report and len(api.calls) == 1


def test_missing_speaker_is_only_a_warning(monkeypatch):
    monkeypatch.setattr(voice, "find_speaker", lambda: None)

    ready, report = run(FakeApi(None, None))

    assert ready and "! Voix du terminal : aucune commande" in report


def test_unusable_data_directory_fails(tmp_path, monkeypatch):
    blocker = tmp_path / "fichier"
    blocker.write_text("je suis un fichier, pas un dossier")
    monkeypatch.setenv("JARVIS_HOME", str(blocker / "jarvis"))

    ready, report = run(FakeApi(None, None))

    assert not ready and "✗ Dossier de données" in report


def test_the_diagnostic_does_not_touch_the_saved_conversation(isolated_environment):
    run(FakeApi(None, None))
    assert not (isolated_environment / "session.json").exists()


def test_cli_option_runs_the_diagnostic(monkeypatch, capsys):
    monkeypatch.setattr(jarvis.agent.anthropic, "Anthropic", lambda: FakeApi(None, None))
    assert cli.main(["--diagnostic"]) == 0
    assert "Tout est prêt." in capsys.readouterr().out

    refused = FakeApi(api_error(anthropic.AuthenticationError, 401))
    monkeypatch.setattr(jarvis.agent.anthropic, "Anthropic", lambda: refused)
    assert cli.main(["--diagnostic"]) == 1

