"""Mode passerelle : Jarvis parle à une passerelle compatible Anthropic (FreeLLMAPI…) plutôt qu'à Anthropic.

La passerelle se règle par `--passerelle URL` ou `JARVIS_GATEWAY_URL`, et sa clé par `JARVIS_GATEWAY_KEY`.
Les variables ANTHROPIC_* ne servent jamais ici : la vraie clé Anthropic ne doit pas partir vers
un autre serveur.
"""

import os
from urllib.parse import urlsplit

import anthropic

URL_VARIABLE = "JARVIS_GATEWAY_URL"
KEY_VARIABLE = "JARVIS_GATEWAY_KEY"
#: Nom de modèle de style Claude : la passerelle le range dans une famille et choisit le vrai modèle.
DEFAULT_MODEL = "claude-sonnet-5-5"


class GatewayError(ValueError):
    """La passerelle est mal réglée (adresse invalide, clé manquante)."""


def normalize_url(raw: str) -> str:
    """Adresse de base attendue par le SDK : sans `/v1` (le SDK ajoute `/v1/messages`), sans `/` final."""
    raw = raw.strip()
    parts = urlsplit(raw if "://" in raw else f"http://{raw}")
    try:
        valid = parts.scheme in ("http", "https") and bool(parts.hostname) and "@" not in parts.netloc
        valid = valid and (parts.port is None or parts.port > 0)  # lève ValueError si le port n'est pas un nombre
    except ValueError:
        valid = False
    if not valid:
        raise GatewayError(
            f"Adresse de passerelle invalide : {raw!r}. Exemple : http://127.0.0.1:3001 "
            "(copiez-la depuis FreeLLMAPI, bouton « Copier l'URL de base »)."
        )
    path = parts.path.rstrip("/")
    if path.endswith("/v1"):
        path = path[: -len("/v1")]
    return f"{parts.scheme}://{parts.netloc}{path}"


def resolve(option: str | None = None) -> str | None:
    """Adresse de la passerelle demandée (option, sinon variable d'environnement), ou None."""
    raw = option if option is not None else os.environ.get(URL_VARIABLE, "")
    return normalize_url(raw) if raw.strip() else None


def make_client(url: str) -> anthropic.Anthropic:
    key = os.environ.get(KEY_VARIABLE, "").strip()
    if not key:
        raise GatewayError(
            f"Il manque la clé de la passerelle : définissez {KEY_VARIABLE} "
            "(FreeLLMAPI, bouton « Copier la clé API »)."
        )
    # La clé est donnée sous les deux formes : le SDK ne va pas chercher d'autres identifiants dans l'environnement.
    return anthropic.Anthropic(base_url=url, api_key=key, auth_token=key)
