from types import SimpleNamespace

import pytest

from jarvis.agent import Jarvis, JarvisLoopLimit, JarvisRefusal, JarvisTruncated


def text_block(text):
    return SimpleNamespace(type="text", text=text)


def tool_block(id, name, input):
    return SimpleNamespace(type="tool_use", id=id, name=name, input=input)


class FakeStream:
    def __init__(self, response):
        self.response = response

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    @property
    def text_stream(self):
        return iter(b.text for b in self.response.content if b.type == "text")

    def get_final_message(self):
        return self.response


class FakeClient:
    """Rejoue des réponses préparées et garde une copie des requêtes."""

    def __init__(self, *responses):
        self.responses = list(responses)
        self.requests = []
        self.messages = self

    def stream(self, **kwargs):
        self.requests.append({**kwargs, "messages": list(kwargs["messages"])})
        return FakeStream(self.responses.pop(0))


def response(stop_reason, *content):
    return SimpleNamespace(stop_reason=stop_reason, content=list(content))


def make_jarvis(client, streamed=None, used=None):
    return Jarvis(
        client=client,
        on_text=(streamed.append if streamed is not None else lambda t: None),
        on_tool=(lambda name, args: used.append(name)) if used is not None else (lambda n, a: None),
    )


def test_simple_answer_is_streamed_and_kept_in_history():
    streamed = []
    jarvis = make_jarvis(FakeClient(response("end_turn", text_block("Bonjour !"))), streamed)

    jarvis.ask("salut")

    assert streamed == ["Bonjour !"]
    assert [m["role"] for m in jarvis.messages] == ["user", "assistant"]


def test_tool_round_trip():
    answer = response("end_turn", text_block("Ça fait 14."))
    call = response("tool_use", tool_block("t1", "calculate", {"expression": "2+3*4"}))
    client, used = FakeClient(call, answer), []
    jarvis = make_jarvis(client, used=used)

    jarvis.ask("2+3*4 ?")

    assert used == ["calculate"]
    second_request = client.requests[1]["messages"]
    assert second_request[-1] == {
        "role": "user",
        "content": [{"type": "tool_result", "tool_use_id": "t1", "content": "14"}],
    }
    assert client.requests[0]["model"] == "claude-opus-5-5"


def test_tool_error_is_reported_to_claude():
    call = response("tool_use", tool_block("t1", "calculate", {"expression": "1/0"}))
    client = FakeClient(call, response("end_turn", text_block("Impossible.")))

    make_jarvis(client).ask("1/0 ?")

    result = client.requests[1]["messages"][-1]["content"][0]
    assert result["is_error"] is True


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
