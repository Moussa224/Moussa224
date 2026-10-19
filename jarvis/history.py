"""Sauvegarde et reprise de la conversation (`~/.jarvis/session.json`)."""

import json
import os
from pathlib import Path

import pydantic

from .tools import jarvis_home


def _path() -> Path:
    return jarvis_home() / "session.json"


def _plain(value):
    """Convertit les blocs du SDK en JSON, comme le SDK le fait pour une requête."""
    if isinstance(value, pydantic.BaseModel):
        return value.model_dump(
            exclude_unset=True,
            mode="json",
            by_alias=True,
            exclude=getattr(value, "__api_exclude__", None),
        )
    if isinstance(value, list):
        return [_plain(item) for item in value]
    if isinstance(value, dict):
        return {key: _plain(item) for key, item in value.items()}
    return value


def save(messages: list[dict]) -> None:
    """Écrit l'historique de façon atomique, lisible par vous seul (il peut contenir des fichiers lus)."""
    path = _path()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        json.dump([_plain(message) for message in messages], handle, ensure_ascii=False)
    os.replace(temporary, path)


def load() -> list[dict]:
    """Relit l'historique ; vide si absent ou illisible."""
    try:
        messages = json.loads(_path().read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    valid = isinstance(messages, list) and all(
        isinstance(m, dict) and m.get("role") in ("user", "assistant") and "content" in m for m in messages
    )
    # Une conversation doit commencer par l'utilisateur pour être acceptée par l'API.
    if not valid or (messages and messages[0]["role"] != "user"):
        return []
    return messages


def clear() -> None:
    _path().unlink(missing_ok=True)
