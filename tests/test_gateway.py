"""Mode passerelle (FreeLLMAPI…) : Jarvis parle le format Anthropic à un autre serveur."""

import json
import socket
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
from conftest import FakeClient, response, text_block

from jarvis import __main__ as cli
from jarvis import diagnostic, gateway, tools
from jarvis.agent import Jarvis

SECRET = "sk-ant-VRAIE-CLE-ANTHROPIC"


@pytest.fixture(autouse=True)
def environment(monkeypatch):
    for name in (gateway.URL_VARIABLE, gateway.KEY_VARIABLE):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", SECRET)
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", SECRET)
    for name in ("NO_PROXY", "no_proxy"):  # le serveur de test est local : pas de proxy
        monkeypatch.setenv(name, "127.0.0.1,localhost")


# --- Adresse et clé ---------------------------------------------------------


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("http://127.0.0.1:3001", "http://127.0.0.1:3001"),
        ("http://127.0.0.1:3001/", "http://127.0.0.1:3001"),
        ("http://127.0.0.1:3001/v1", "http://127.0.0.1:3001"),  # l'adresse « OpenAI » copiée dans FreeLLMAPI
        ("  http://localhost:3001/v1/  ", "http://localhost:3001"),
        ("127.0.0.1:31415", "http://127.0.0.1:31415"),  # sans http://
        ("https://passerelle.exemple/api/v1", "https://passerelle.exemple/api"),
        ("http://[::1]:3001", "http://[::1]:3001"),
    ],
)
def test_the_address_is_normalised_for_the_sdk(raw, expected):
    assert gateway.normalize_url(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "", "   ", "ftp://hote", "file:///etc/passwd", "http://", "http://hote:abc",
        "http://moi:secret@hote:1", "javascript:alert(1)",
    ],  # fmt: skip
)
def test_an_unusable_address_is_refused(raw):
    with pytest.raises(gateway.GatewayError, match="Adresse de passerelle invalide"):
        gateway.normalize_url(raw)


def test_the_option_wins_over_the_environment(monkeypatch):
    assert gateway.resolve(None) is None
    monkeypatch.setenv(gateway.URL_VARIABLE, "http://127.0.0.1:1111/v1")
    assert gateway.resolve(None) == "http://127.0.0.1:1111"
    assert gateway.resolve("http://127.0.0.1:2222") == "http://127.0.0.1:2222"
    monkeypatch.setenv(gateway.URL_VARIABLE, "   ")
    assert gateway.resolve(None) is None


def test_the_gateway_key_is_required(monkeypatch):
    with pytest.raises(gateway.GatewayError, match=gateway.KEY_VARIABLE):
        gateway.make_client("http://127.0.0.1:3001")
    monkeypatch.setenv(gateway.KEY_VARIABLE, "   ")
    with pytest.raises(gateway.GatewayError):
        gateway.make_client("http://127.0.0.1:3001")


def test_the_anthropic_credentials_never_go_to_the_gateway(monkeypatch):
    monkeypatch.setenv(gateway.KEY_VARIABLE, "freellmapi-locale")

    client = gateway.make_client("http://127.0.0.1:3001")

    assert str(client.base_url).rstrip("/") == "http://127.0.0.1:3001"
    sent = json.dumps(dict(client.auth_headers))
    assert "freellmapi-locale" in sent and SECRET not in sent


# --- Ce que Jarvis demande à une passerelle ------------------------------------


def test_the_request_only_uses_what_a_gateway_understands():
    jarvis = Jarvis(client=FakeClient(), gateway="http://127.0.0.1:3001")

    request = jarvis.request([{"role": "user", "content": "salut"}])

    assert "output_config" not in request and "cache_control" not in request
    assert request["tools"] == tools.TOOLS  # pas d'outils web : ce sont des outils d'Anthropic
    assert request["model"] == gateway.DEFAULT_MODEL
    assert "pas accès au web" in request["system"]


def test_the_model_can_still_be_chosen(monkeypatch):
    assert Jarvis(client=FakeClient(), gateway="http://x", model="claude-haiku-5-5").model == "claude-haiku-5-5"
    monkeypatch.setenv("JARVIS_MODEL", "claude-opus-4-5")
    assert Jarvis(client=FakeClient(), gateway="http://x").model == "claude-opus-4-5"


def test_asking_for_the_web_does_not_enable_it_through_a_gateway():
    assert Jarvis(client=FakeClient(), gateway="http://x", web=True).web is False


def test_without_a_gateway_nothing_changes():
    request = Jarvis(client=FakeClient()).request([])
    assert request["output_config"] == {"effort": "medium"} and request["cache_control"] == {"type": "ephemeral"}
    assert "pas accès au web" not in request["system"]
    assert "pas accès au web" in Jarvis(client=FakeClient(), web=False).request([])["system"]


# --- Un vrai serveur parlant le protocole Anthropic -----------------------------


def _message(content, stop_reason):
    return {
        "id": "msg_1", "type": "message", "role": "assistant", "model": "claude-sonnet-5-5",
        "content": content, "stop_reason": stop_reason, "stop_sequence": None,
        "usage": {"input_tokens": 1, "output_tokens": 1},
    }  # fmt: skip


def _events(blocks, stop_reason):
    """Les événements d'une réponse en flux, comme /v1/messages les envoie."""
    events = [("message_start", {"type": "message_start", "message": _message([], None)})]
    for index, block in enumerate(blocks):
        if block["type"] == "text":
            start, delta = {"type": "text", "text": ""}, {"type": "text_delta", "text": block["text"]}
        else:
            start = {"type": "tool_use", "id": block["id"], "name": block["name"], "input": {}}
            delta = {"type": "input_json_delta", "partial_json": json.dumps(block["input"])}
        events += [
            ("content_block_start", {"type": "content_block_start", "index": index, "content_block": start}),
            ("content_block_delta", {"type": "content_block_delta", "index": index, "delta": delta}),
            ("content_block_stop", {"type": "content_block_stop", "index": index}),
        ]
    delta = {"stop_reason": stop_reason, "stop_sequence": None}
    events += [
        ("message_delta", {"type": "message_delta", "delta": delta, "usage": {"output_tokens": 1}}),
        ("message_stop", {"type": "message_stop"}),
    ]
    return events


class FakeGateway(ThreadingHTTPServer):
    """Une passerelle minimale : /v1/messages, en flux ou non, avec réponses préparées."""

    def __init__(self, *replies):
        super().__init__(("127.0.0.1", 0), self.Handler)
        self.replies = list(replies)
        self.received = []
        threading.Thread(target=self.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True).start()

    @property
    def url(self):
        return f"http://127.0.0.1:{self.server_port}"

    def close(self):
        self.shutdown()
        self.server_close()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            headers = {name.lower(): value for name, value in self.headers.items()}
            self.server.received.append({"path": self.path, "headers": headers, "body": body})
            reply = self.server.replies.pop(0)
            if isinstance(reply, int):  # un statut d'erreur
                payload = json.dumps({"type": "error", "error": {"type": "authentication_error", "message": "non"}})
                self.send_response(reply)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(payload.encode())
                return
            blocks, stop_reason = reply
            if body.get("stream"):
                payload = "".join(
                    f"event: {name}\ndata: {json.dumps(data)}\n\n" for name, data in _events(blocks, stop_reason)
                )
                content_type = "text/event-stream"
            else:
                payload = json.dumps(_message(blocks, stop_reason))
                content_type = "application/json"
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.end_headers()
            self.wfile.write(payload.encode())


@pytest.fixture
def fake_gateway(monkeypatch):
    monkeypatch.setenv(gateway.KEY_VARIABLE, "freellmapi-locale")
    servers = []

    def start(*replies):
        servers.append(FakeGateway(*replies))
        return servers[-1]

    yield start
    for server in servers:
        server.close()


def test_a_conversation_with_a_tool_call_goes_through_the_gateway(fake_gateway):
    server = fake_gateway(
        ([{"type": "tool_use", "id": "t1", "name": "calculate", "input": {"expression": "6*7"}}], "tool_use"),
        ([{"type": "text", "text": "Ça fait 42."}], "end_turn"),
    )
    streamed, used = [], []
    jarvis = Jarvis(gateway=server.url, on_text=streamed.append, on_tool=lambda name, args: used.append(name))

    jarvis.ask("6 fois 7 ?")

    assert "".join(streamed) == "Ça fait 42." and used == ["calculate"]
    first, second = server.received
    assert first["path"] == "/v1/messages"
    assert first["headers"]["x-api-key"] == "freellmapi-locale"
    assert first["headers"]["authorization"] == "Bearer freellmapi-locale"
    assert SECRET not in json.dumps(first["headers"])  # la vraie clé Anthropic reste chez soi
    body = first["body"]
    assert body["model"] == gateway.DEFAULT_MODEL and body["stream"] is True
    assert "output_config" not in body and "cache_control" not in body
    assert not any(t.get("type", "").startswith("web_") for t in body["tools"])
    assert second["body"]["messages"][-1]["content"][0] == {
        "type": "tool_result", "tool_use_id": "t1", "content": "42",
    }  # fmt: skip


def test_the_address_copied_with_v1_works_too(fake_gateway):
    server = fake_gateway(([{"type": "text", "text": "ok"}], "end_turn"))
    streamed = []

    Jarvis(gateway=gateway.normalize_url(server.url + "/v1"), on_text=streamed.append).ask("salut")

    assert streamed == ["ok"] and server.received[0]["path"] == "/v1/messages"  # et pas /v1/v1/messages


def test_the_diagnostic_checks_the_gateway(fake_gateway):
    server = fake_gateway(([{"type": "text", "text": "ok"}], "end_turn"))
    lines = []

    ready = diagnostic.run(gateway=server.url, out=lines.append)

    report = "\n".join(lines)
    assert ready and f"passerelle {server.url}" in report
    assert "Recherche web : indisponible avec une passerelle" in report
    assert len(server.received) == 1 and "web_search" not in json.dumps(server.received[0]["body"])


def test_a_refused_gateway_key_is_explained(fake_gateway):
    server = fake_gateway(401)
    lines = []

    ready = diagnostic.run(gateway=server.url, out=lines.append)

    report = "\n".join(lines)
    assert not ready and gateway.KEY_VARIABLE in report and "ANTHROPIC_API_KEY" not in report


def test_a_gateway_that_is_not_running_is_explained(monkeypatch, capsys):
    monkeypatch.setenv(gateway.KEY_VARIABLE, "freellmapi-locale")
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]  # un port libre, donc sans serveur

    assert cli.main(["--passerelle", f"127.0.0.1:{port}", "salut"]) == 1

    err = capsys.readouterr().err
    assert "Connexion impossible à la passerelle" in err and "FreeLLMAPI est-il lancé" in err


# --- Ligne de commande ---------------------------------------------------------


def test_cli_without_the_gateway_key_says_what_to_do(capsys):
    assert cli.main(["--passerelle", "http://127.0.0.1:3001", "salut"]) == 1
    assert gateway.KEY_VARIABLE in capsys.readouterr().err


def test_cli_with_a_bad_address_says_what_is_wrong(capsys):
    for argv in (["--passerelle", "ftp://hote", "salut"], ["--passerelle", "ftp://hote", "--diagnostic"]):
        assert cli.main(argv) == 1
    assert "Adresse de passerelle invalide" in capsys.readouterr().err


def test_cli_one_question_through_the_gateway(fake_gateway, capsys):
    server = fake_gateway(([{"type": "text", "text": "Bonjour Moussa."}], "end_turn"))

    assert cli.main(["--passerelle", server.url, "Salut"]) == 0

    assert capsys.readouterr().out == "Bonjour Moussa.\n"


def test_the_gateway_can_come_from_the_environment(fake_gateway, monkeypatch, capsys):
    server = fake_gateway(([{"type": "text", "text": "Là."}], "end_turn"))
    monkeypatch.setenv(gateway.URL_VARIABLE, server.url + "/v1")

    assert cli.main(["Salut"]) == 0

    assert capsys.readouterr().out == "Là.\n"


def test_interactive_mode_says_which_gateway_is_used(fake_gateway, monkeypatch, capsys):
    server = fake_gateway()
    monkeypatch.setattr("builtins.input", lambda prompt="": "/quitter")

    assert cli.main(["--passerelle", server.url]) == 0

    assert f"Passerelle : {server.url}" in capsys.readouterr().out


def test_web_option_without_the_gateway_key_does_not_crash(monkeypatch, capsys):
    from jarvis import web

    monkeypatch.setattr(web, "webbrowser", None)  # ne jamais ouvrir de navigateur
    assert cli.main(["--web", "--passerelle", "http://127.0.0.1:3001", "--sans-navigateur"]) == 1
    assert gateway.KEY_VARIABLE in capsys.readouterr().err


def test_the_web_page_receives_the_gateway_setting(monkeypatch):
    from jarvis import web

    started = {}
    monkeypatch.setattr(web, "serve", lambda *args, **kwargs: started.update(args=args))

    cli.main(["--web", "--passerelle", "127.0.0.1:3001/v1"])

    assert started["args"][1]["gateway"] == "http://127.0.0.1:3001"


def test_a_fake_client_still_works_with_a_gateway_setting():
    client = FakeClient(response("end_turn", text_block("ok")))
    streamed = []
    Jarvis(client=client, gateway="http://127.0.0.1:3001", on_text=streamed.append).ask("salut")
    assert streamed == ["ok"]
