from types import SimpleNamespace

import pytest
from anthropic.types import TextBlock, ToolUseBlock


@pytest.fixture(autouse=True)
def isolated_environment(tmp_path, monkeypatch):
    """Données dans un dossier temporaire, jamais dans le vrai ~/.jarvis."""
    home = tmp_path / "home"
    monkeypatch.setenv("JARVIS_HOME", str(home))
    monkeypatch.delenv("JARVIS_MODEL", raising=False)
    monkeypatch.delenv("NO_COLOR", raising=False)
    return home


def text_block(text):
    return TextBlock(type="text", text=text)


def tool_block(id, name, input):
    return ToolUseBlock(type="tool_use", id=id, name=name, input=input)


def response(stop_reason, *content):
    return SimpleNamespace(stop_reason=stop_reason, content=list(content))


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
    """Rejoue des réponses préparées (ou lève les exceptions fournies)."""

    def __init__(self, *responses):
        self.responses = list(responses)
        self.requests = []
        self.messages = self

    def stream(self, **kwargs):
        self.requests.append({**kwargs, "messages": list(kwargs["messages"])})
        item = self.responses.pop(0)
        if isinstance(item, Exception):
            raise item
        return FakeStream(item)
