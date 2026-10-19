import anthropic
import httpx2
import pytest
from anthropic.types import ServerToolUseBlock, ThinkingBlock
from conftest import FakeClient, response, text_block, tool_block

from jarvis import history, tools
from jarvis.agent import (
    WEB_TOOLS,
    Jarvis,
    JarvisLoopLimit,
    JarvisRefusal,
    JarvisTruncated,
    build_system_prompt,
)


def make_jarvis(client, streamed=None, used=None, **kwargs):
    return Jarvis(
        client=client,
        on_text=(streamed.append if streamed is not None else lambda t: None),
        on_tool=(lambda name, args: used.append(name)) if used is not None else (lambda n, a: None),
        **kwargs,
    )


def bad_request():
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    return anthropic.BadRequestError(
        "tool not enabled", response=httpx2.Response(400, request=request), body=None
    )


def test_simple_answer_is_streamed_and_kept_in_history():
    streamed = []
    jarvis = make_jarvis(FakeClient(response("end_turn", text_block("Bonjour !"))), streamed)

    jarvis.ask("salut")

    assert streamed == ["Bonjour !"]
    assert [m["role"] for m in jarvis.messages] == ["user", "assistant"]


def test_tool_round_trip():
    call = response("tool_use", tool_block("t1", "calculate", {"expression": "2+3*4"}))
    client, used = FakeClient(call, response("end_turn", text_block("Ça fait 14."))), []
    jarvis = make_jarvis(client, used=used)

    jarvis.ask("2+3*4 ?")

    assert used == ["calculate"]
    assert client.requests[1]["messages"][-1] == {
        "role": "user",
        "content": [{"type": "tool_result", "tool_use_id": "t1", "content": "14"}],
    }
    assert client.requests[0]["model"] == "claude-opus-5-5"


def test_tool_error_is_reported_to_claude():
    call = response("tool_use", tool_block("t1", "calculate", {"expression": "1/0"}))
    client = FakeClient(call, response("end_turn", text_block("Impossible.")))

    make_jarvis(client).ask("1/0 ?")

    assert client.requests[1]["messages"][-1]["content"][0]["is_error"] is True


def test_conversation_history_accumulates_and_resets():
    client = FakeClient(
        response("end_turn", text_block("Enchanté.")),
        response("end_turn", text_block("Moussa.")),
    )
    jarvis = make_jarvis(client)

    jarvis.ask("Je m'appelle Moussa")
    jarvis.ask("Comment je m'appelle ?")

    assert len(client.requests[1]["messages"]) == 3
    jarvis.reset()
    assert jarvis.messages == []


@pytest.mark.parametrize(
    "bad_response, error",
    [
        (response("refusal"), JarvisRefusal),
        (response("max_tokens", tool_block("t1", "calculate", {})), JarvisTruncated),
    ],
)
def test_failed_turn_rolls_back_history(bad_response, error):
    client = FakeClient(response("end_turn", text_block("ok")), bad_response)
    jarvis = make_jarvis(client)
    jarvis.ask("premier message")
    saved = list(jarvis.messages)

    with pytest.raises(error):
        jarvis.ask("deuxième message")

    assert jarvis.messages == saved


def test_truncated_text_answer_is_kept_with_notice():
    streamed = []
    jarvis = make_jarvis(FakeClient(response("max_tokens", text_block("début"))), streamed)

    jarvis.ask("long récit")

    assert streamed[-1] == "\n[réponse tronquée]"
    assert len(jarvis.messages) == 2


def test_tool_loop_is_bounded():
    loop = [response("tool_use", tool_block(f"t{i}", "list_notes", {})) for i in range(20)]
    jarvis = make_jarvis(FakeClient(*loop))

    with pytest.raises(JarvisLoopLimit):
        jarvis.ask("boucle")

    assert jarvis.messages == []


# --- Web -------------------------------------------------------------------


def test_web_tools_are_declared_by_default_and_can_be_disabled():
    with_web, without_web = FakeClient(response("end_turn")), FakeClient(response("end_turn"))

    make_jarvis(with_web).ask("a")
    make_jarvis(without_web, web=False).ask("a")

    assert [t["name"] for t in with_web.requests[0]["tools"]][-2:] == ["web_search", "web_fetch"]
    assert all(t not in without_web.requests[0]["tools"] for t in WEB_TOOLS)


def test_paused_web_turn_is_resumed_with_its_content():
    server_block = ServerToolUseBlock(
        type="server_tool_use", id="srvtoolu_1", name="web_search", input={"query": "actualité"}
    )
    client = FakeClient(
        response("pause_turn", server_block),
        response("end_turn", text_block("Voici le résultat.")),
    )
    streamed = []
    jarvis = make_jarvis(client, streamed)

    jarvis.ask("actualité ?")

    assert streamed == ["Voici le résultat."]
    resumed = client.requests[1]["messages"]
    assert [m["role"] for m in resumed] == ["user", "assistant"]
    assert resumed[-1]["content"] == [server_block]


def test_web_tools_are_dropped_when_the_api_rejects_them():
    notices = []
    client = FakeClient(bad_request(), response("end_turn", text_block("Sans web.")))
    jarvis = make_jarvis(client, on_notice=notices.append)

    jarvis.ask("bonjour")

    assert notices == ["Outils web indisponibles, je continue sans."]
    assert any(t["name"] == "web_search" for t in client.requests[0]["tools"])
    assert not any(t["name"] == "web_search" for t in client.requests[1]["tools"])
    assert jarvis.web is False


def test_bad_request_without_web_is_not_swallowed():
    jarvis = make_jarvis(FakeClient(bad_request()), web=False)

    with pytest.raises(anthropic.BadRequestError):
        jarvis.ask("bonjour")

    assert jarvis.messages == []


# --- Mémoire et accord de l'utilisateur ------------------------------------


def test_memories_are_part_of_the_system_prompt():
    assert "Ce que tu sais" not in build_system_prompt()
    tools.execute("remember", {"fact": "Préfère être tutoyé"})

    client = FakeClient(response("end_turn", text_block("Salut !")))
    make_jarvis(client).ask("coucou")

    assert "- [1] Préfère être tutoyé" in client.requests[0]["system"]


def test_model_can_be_chosen(monkeypatch):
    monkeypatch.setenv("JARVIS_MODEL", "claude-sonnet-5-5")
    from_env = FakeClient(response("end_turn"))
    explicit = FakeClient(response("end_turn"))

    make_jarvis(from_env).ask("a")
    make_jarvis(explicit, model="claude-haiku-5-5").ask("a")

    assert from_env.requests[0]["model"] == "claude-sonnet-5-5"
    assert explicit.requests[0]["model"] == "claude-haiku-5-5"


def test_sensitive_actions_go_through_the_confirmation_callback(tmp_path):
    target = tmp_path / "fichier.txt"
    call = response("tool_use", tool_block("t1", "write_file", {"path": str(target), "content": "x"}))

    declined = FakeClient(call, response("end_turn"))
    make_jarvis(declined).ask("écris")
    assert not target.exists()
    assert "refusé" in declined.requests[1]["messages"][-1]["content"][0]["content"]

    asked = []
    accepted = FakeClient(call, response("end_turn"))
    make_jarvis(accepted, confirm=lambda q: asked.append(q) or True).ask("écris")
    assert target.read_text() == "x"
    assert len(asked) == 1 and str(target) in asked[0]


# --- Reprise de la conversation --------------------------------------------


def test_conversation_is_saved_and_can_be_resumed():
    first = FakeClient(
        response("tool_use", tool_block("t1", "calculate", {"expression": "6*7"})),
        response("end_turn", ThinkingBlock(type="thinking", thinking="", signature="sig"), text_block("42.")),
    )
    make_jarvis(first).ask("6 fois 7 ?")

    second = FakeClient(response("end_turn", text_block("Toujours 42.")))
    jarvis = make_jarvis(second)
    assert jarvis.resume() == 4
    jarvis.ask("Et si on le redouble ?")

    sent = second.requests[0]["messages"]
    assert [m["role"] for m in sent] == ["user", "assistant", "user", "assistant", "user"]
    assert sent[1]["content"] == [{"id": "t1", "input": {"expression": "6*7"}, "name": "calculate", "type": "tool_use"}]
    # la réflexion et sa signature reviennent telles quelles, comme l'exige l'API
    assert sent[3]["content"][0] == {"signature": "sig", "thinking": "", "type": "thinking"}


def test_resumed_conversation_stays_readable():
    first = make_jarvis(FakeClient(response("end_turn", text_block("Bonjour."))))
    first.ask("Salut")
    live = first.transcript()

    resumed = make_jarvis(FakeClient())
    resumed.resume()

    assert live == [{"role": "user", "text": "Salut"}, {"role": "assistant", "text": "Bonjour."}]
    assert resumed.transcript() == live


def test_transcript_hides_tool_traffic():
    jarvis = make_jarvis(
        FakeClient(
            response("tool_use", tool_block("t1", "list_notes", {})),
            response("end_turn", text_block("Aucune note.")),
        )
    )
    jarvis.ask("mes notes ?")

    assert jarvis.transcript() == [
        {"role": "user", "text": "mes notes ?"},
        {"role": "assistant", "text": "Aucune note."},
    ]


def test_failed_turns_are_not_saved():
    jarvis = make_jarvis(FakeClient(response("end_turn", text_block("ok")), response("refusal")))
    jarvis.ask("un")
    with pytest.raises(JarvisRefusal):
        jarvis.ask("deux")

    assert len(history.load()) == 2


def test_reset_forgets_the_saved_conversation():
    jarvis = make_jarvis(FakeClient(response("end_turn", text_block("ok"))))
    jarvis.ask("un")
    assert history.load()

    jarvis.reset()

    assert history.load() == []
    assert make_jarvis(FakeClient()).resume() == 0


def test_persistence_can_be_disabled():
    make_jarvis(FakeClient(response("end_turn", text_block("ok"))), persist=False).ask("un")
    assert history.load() == []


def test_unreadable_saves_are_ignored(isolated_environment):
    isolated_environment.mkdir()
    path = isolated_environment / "session.json"
    for broken in ["{pas du json", '{"a": 1}', '[{"role": "assistant", "content": "x"}]', '[{"role": "user"}]']:
        path.write_text(broken)
        assert history.load() == []


def test_save_is_private_and_failures_do_not_break_the_turn(isolated_environment, monkeypatch):
    notices = []
    jarvis = make_jarvis(FakeClient(response("end_turn", text_block("ok"))), on_notice=notices.append)
    jarvis.ask("un")
    assert (isolated_environment / "session.json").stat().st_mode & 0o777 == 0o600

    def disk_full(messages):
        raise OSError(28, "No space left on device")

    monkeypatch.setattr(history, "save", disk_full)
    jarvis.client = FakeClient(response("end_turn", text_block("encore")))
    jarvis.ask("deux")  # ne lève pas : la réponse a été donnée

    assert notices == ["Conversation non sauvegardée : No space left on device."]
