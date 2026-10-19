import http.client
import json
import socket
import threading
import time

import pytest
from conftest import FakeClient, FakeStream, response, text_block, tool_block

from jarvis.web import JarvisServer, WebApp

TOKEN = "jeton-de-test"


class Browser:
    """Client HTTP minimal ; se comporte comme la page, ou comme un autre site avec `headers`."""

    def __init__(self, server):
        self.server = server
        self.host = f"127.0.0.1:{server.server_port}"

    def request(self, method, path, body=None, *, token=TOKEN, **headers):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=10)
        base = {"Host": self.host, "Content-Type": "application/json"}
        if token is not None:
            base["X-Jarvis-Token"] = token
        base.update({k.replace("_", "-"): v for k, v in headers.items() if v is not None})
        for key in [k.replace("_", "-") for k, v in headers.items() if v is None]:
            base.pop(key, None)
        payload = body if isinstance(body, (str, bytes)) else json.dumps(body) if body is not None else None
        connection.request(method, path, payload, base)
        return connection.getresponse()

    def json(self, *args, **kwargs):
        reply = self.request(*args, **kwargs)
        return reply.status, json.loads(reply.read())

    def events(self, message, **kwargs):
        reply = self.request("POST", "/api/chat", {"message": message}, **kwargs)
        assert reply.status == 200
        return [json.loads(line) for line in reply.read().decode().splitlines() if line]


@pytest.fixture
def start(monkeypatch):
    servers = []

    def _start(*responses, resume=False):
        client = FakeClient(*responses)
        monkeypatch.setattr("jarvis.agent.anthropic.Anthropic", lambda: client)
        server = JarvisServer(WebApp(TOKEN, resume=resume))
        threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True).start()
        servers.append(server)
        return Browser(server), server.app, client

    yield _start
    for server in servers:
        server.shutdown()
        server.server_close()


def test_page_is_served_with_a_strict_policy(start):
    browser, _, _ = start()

    reply = browser.request("GET", "/", token=None)
    page = reply.read().decode()

    assert reply.status == 200 and "<title>Jarvis</title>" in page
    assert "default-src 'none'" in reply.getheader("Content-Security-Policy")
    assert TOKEN not in page  # le jeton ne passe jamais par la page servie


def test_chat_streams_text_then_done(start):
    browser, _, _ = start(response("end_turn", text_block("Bonjour "), text_block("Moussa.")))

    assert browser.events("Salut") == [
        {"type": "text", "text": "Bonjour "},
        {"type": "text", "text": "Moussa."},
        {"type": "done"},
    ]


def test_tools_are_reported_to_the_page(start):
    call = response("tool_use", tool_block("t1", "calculate", {"expression": "6*7"}))
    browser, _, _ = start(call, response("end_turn", text_block("42.")))

    events = browser.events("6 fois 7 ?")

    assert {"type": "tool", "name": "calculate", "summary": "expression='6*7'"} in events
    assert events[-1] == {"type": "done"}


def test_state_returns_the_readable_conversation(start):
    browser, _, _ = start(response("end_turn", text_block("Bonjour.")))
    browser.events("Salut")

    status, state = browser.json("GET", "/api/state")

    assert status == 200
    assert state["transcript"] == [{"role": "user", "text": "Salut"}, {"role": "assistant", "text": "Bonjour."}]
    assert state["model"] == "claude-opus-5-5" and state["web"] is True


def test_resume_restores_the_previous_conversation(start):
    first, _, _ = start(response("end_turn", text_block("Bonjour.")))
    first.events("Salut")

    second, _, _ = start(resume=True)

    assert len(second.json("GET", "/api/state")[1]["transcript"]) == 2


def test_reset_forgets_everything(start):
    browser, app, _ = start(response("end_turn", text_block("Bonjour.")))
    browser.events("Salut")

    assert browser.json("POST", "/api/reset", {}) == (200, {"ok": True})

    assert browser.json("GET", "/api/state")[1]["transcript"] == []
    assert app.jarvis.messages == []


# --- Sécurité --------------------------------------------------------------


@pytest.mark.parametrize(
    "kwargs",
    [
        {"token": None},                                  # pas de jeton
        {"token": "mauvais"},                             # mauvais jeton
        {"token": "é" * 5},                               # jeton non ASCII : refus propre, pas d'erreur 500
        {"Origin": "https://pirate.example"},            # autre site dans le navigateur
        {"Host": "pirate.example:80"},                   # DNS rebinding
    ],
)
def test_requests_without_credentials_are_refused(start, kwargs):
    browser, app, client = start()
    kwargs = {k: v for k, v in kwargs.items()}

    status, _ = browser.json("POST", "/api/chat", {"message": "bonjour"}, **kwargs)
    assert status == 403
    assert browser.json("GET", "/api/state", **kwargs)[0] == 403
    assert client.requests == [] and app.jarvis.messages == []


def test_the_page_itself_refuses_a_foreign_host(start):
    browser, _, _ = start()
    assert browser.request("GET", "/", token=None, Host="pirate.example:80").status == 403


def test_the_own_origin_is_accepted(start):
    browser, _, _ = start()
    assert browser.json("GET", "/api/state", Origin=f"http://{browser.host}")[0] == 200
    assert browser.json("GET", "/api/state", Host=f"localhost:{browser.server.server_port}")[0] == 200


def test_writes_must_be_json(start):
    browser, _, client = start()

    reply = browser.request("POST", "/api/chat", '{"message": "x"}', Content_Type="text/plain")

    assert reply.status == 415 and client.requests == []


@pytest.mark.parametrize("body", ["pas du json", "[1]", '{"message": 5}', '{"message": "  "}', "{}"])
def test_invalid_bodies_are_rejected(start, body):
    browser, _, client = start()
    assert browser.request("POST", "/api/chat", body).status == 400
    assert client.requests == []


def test_unknown_routes(start):
    browser, _, _ = start()
    assert browser.request("GET", "/api/inconnu").status == 404
    assert browser.request("POST", "/api/inconnu", {}).status == 404
    assert browser.request("GET", "/../../etc/passwd", token=None).status == 404


# --- Accord de l'utilisateur dans la page ----------------------------------


def run_with_approval(start, allow, tmp_path):
    target = tmp_path / "cree.txt"
    call = response("tool_use", tool_block("t1", "write_file", {"path": str(target), "content": "salut"}))
    browser, _, client = start(call, response("end_turn", text_block("Fait.")))
    events, result = [], {}

    def chat():
        reply = browser.request("POST", "/api/chat", {"message": "écris un fichier"})
        for line in reply:
            event = json.loads(line)
            events.append(event)
            if event["type"] == "confirm":
                result["answer"] = browser.json("POST", "/api/confirm", {"id": event["id"], "allow": allow})

    worker = threading.Thread(target=chat)
    worker.start()
    worker.join(timeout=10)
    assert not worker.is_alive()
    return target, events, result["answer"], client


def test_sensitive_action_waits_for_the_page_and_runs_when_allowed(start, tmp_path):
    target, events, answer, _ = run_with_approval(start, True, tmp_path)

    confirm = next(e for e in events if e["type"] == "confirm")
    assert str(target) in confirm["question"]
    assert answer == (200, {"ok": True})
    assert target.read_text() == "salut"
    assert [e["type"] for e in events][-3:] == ["confirm_done", "text", "done"]


def test_sensitive_action_is_not_run_when_refused(start, tmp_path):
    target, _, answer, client = run_with_approval(start, False, tmp_path)

    assert answer[0] == 200 and not target.exists()
    assert "refusé" in client.requests[1]["messages"][-1]["content"][0]["content"]


def test_unanswered_approval_expires_and_refuses(start, tmp_path, monkeypatch):
    monkeypatch.setattr("jarvis.web.CONFIRM_TIMEOUT", 0.2)
    target = tmp_path / "jamais.txt"
    call = response("tool_use", tool_block("t1", "write_file", {"path": str(target), "content": "x"}))
    browser, _, _ = start(call, response("end_turn", text_block("Compris.")))

    events = browser.events("écris")

    assert [e["type"] for e in events] == ["tool", "confirm", "confirm_done", "text", "done"]
    assert not target.exists()


def test_stale_or_malformed_approvals_are_rejected(start):
    browser, _, _ = start()
    assert browser.json("POST", "/api/confirm", {"id": "inconnu", "allow": True})[0] == 404
    assert browser.json("POST", "/api/confirm", {"id": "x", "allow": "oui"})[0] == 400
    assert browser.json("POST", "/api/confirm", {"allow": True})[0] == 400


# --- Robustesse ------------------------------------------------------------


def test_one_conversation_at_a_time(start):
    browser, app, _ = start()
    assert app.begin(lambda event: None)

    assert browser.json("POST", "/api/chat", {"message": "bonjour"})[0] == 409
    assert browser.json("POST", "/api/reset", {})[0] == 409

    app.end()


def test_errors_reach_the_page_instead_of_a_stack_trace(start):
    browser, app, _ = start(response("refusal"))

    events = browser.events("quelque chose")

    assert events == [{"type": "error", "message": "Je ne peux pas répondre à cette demande."}]
    assert app.jarvis.messages == []


class SlowStream(FakeStream):
    """Une longue réponse qui arrive petit à petit, comme avec le vrai modèle."""

    @property
    def text_stream(self):
        for index in range(300):
            time.sleep(0.01)
            yield f"mot{index} "


def test_closing_the_page_mid_answer_cancels_the_turn_and_frees_jarvis(start):
    browser, app, client = start(response("end_turn", text_block("inutile")))
    client.stream = lambda **kwargs: SlowStream(client.responses[0])
    connection = http.client.HTTPConnection("127.0.0.1", browser.server.server_port, timeout=10)
    connection.request(
        "POST",
        "/api/chat",
        json.dumps({"message": "bonjour"}),
        {"Host": browser.host, "Content-Type": "application/json", "X-Jarvis-Token": TOKEN},
    )
    page_socket = connection.sock  # getresponse() détache le socket d'une réponse HTTP/1.0
    reply = connection.getresponse()
    assert json.loads(reply.fp.readline())["type"] == "text"  # la réponse a commencé
    page_socket.shutdown(socket.SHUT_RDWR)  # la page disparaît en plein milieu

    deadline = time.time() + 5
    while not app.begin(lambda event: None):  # le serveur doit se libérer tout seul
        assert time.time() < deadline, "Jarvis est resté bloqué après la fermeture de la page"
        time.sleep(0.05)
    app.end()
    assert app.jarvis.messages == []  # le tour abandonné ne pollue pas l'historique


def test_the_page_never_builds_html_from_untrusted_text():
    """Les réponses, pages web et fichiers sont affichés en texte brut, jamais interprétés."""
    from jarvis.web import INDEX

    page = INDEX.read_text(encoding="utf-8")

    for dangerous in ("innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval(", "new Function"):
        assert dangerous not in page


# --- Le jeton ne doit pas fuiter hors de la page -----------------------------


def test_browser_is_opened_on_a_private_launcher_never_on_the_token_url(monkeypatch, isolated_environment):
    """Une URL passée au navigateur est lisible par tous les utilisateurs de la machine (ps, /proc)."""
    import stat

    import jarvis.web as web

    opened, seen = [], {}
    monkeypatch.setattr(web.webbrowser, "open", opened.append)

    def serve_forever(self, *args, **kwargs):
        launcher = isolated_environment / "jarvis-open.html"
        seen["mode"] = stat.S_IMODE(launcher.stat().st_mode)
        seen["page"] = launcher.read_text()

    monkeypatch.setattr(web.JarvisServer, "serve_forever", serve_forever)

    web.serve(0, {}, resume=False, open_browser=True)

    [argument] = opened
    assert argument.startswith("file://") and "token" not in argument
    assert seen["mode"] == 0o600
    assert 'http-equiv="refresh"' in seen["page"] and "#token=" in seen["page"]
    assert not (isolated_environment / "jarvis-open.html").exists()  # supprimé à l'arrêt


def test_launcher_is_not_created_when_the_browser_is_not_wanted(monkeypatch, isolated_environment):
    import jarvis.web as web

    monkeypatch.setattr(web.JarvisServer, "serve_forever", lambda self, *a, **k: None)
    monkeypatch.setattr(web.webbrowser, "open", lambda url: pytest.fail("le navigateur ne devait pas s'ouvrir"))

    web.serve(0, {}, resume=False, open_browser=False)

    assert not (isolated_environment / "jarvis-open.html").exists()


def test_the_page_cannot_be_framed(start):
    browser, _, _ = start()

    reply = browser.request("GET", "/", token=None)

    assert reply.getheader("X-Frame-Options") == "DENY"
    assert "frame-ancestors 'none'" in reply.getheader("Content-Security-Policy")
