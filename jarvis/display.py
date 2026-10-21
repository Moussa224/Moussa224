"""Mise en forme partagée par le terminal et l'interface web."""

import unicodedata

import anthropic

from .errors import JarvisLoopLimit, JarvisRefusal, JarvisTruncated
from .gateway import KEY_VARIABLE

#: Erreurs qu'un tour de conversation peut lever et qu'on explique à l'utilisateur.
TURN_ERRORS = (anthropic.AnthropicError, JarvisRefusal, JarvisTruncated, JarvisLoopLimit)


def is_missing_credentials(exc: Exception) -> bool:
    """Le SDK lève un TypeError (et non une AnthropicError) sans identifiants."""
    return isinstance(exc, TypeError) and "authentication method" in str(exc)


def _api_message(exc: anthropic.APIStatusError) -> str:
    """Le message de l'API lui-même, sans le préfixe « Error code: 400 - {...} » du SDK."""
    error = exc.body.get("error") if isinstance(exc.body, dict) else None
    if isinstance(error, dict) and isinstance(error.get("message"), str):
        return error["message"]
    return str(exc.message)


def describe_error(exc: Exception, gateway: str | None = None) -> str:
    """Explication d'une erreur ; `gateway` (adresse) adapte les conseils au mode passerelle."""
    if is_missing_credentials(exc):
        return "Aucune clé API. Définissez ANTHROPIC_API_KEY (voir JARVIS.md)."
    if isinstance(exc, JarvisRefusal):
        return "Je ne peux pas répondre à cette demande."
    if isinstance(exc, JarvisTruncated):
        return "Ma réponse a été coupée en plein calcul. Pouvez-vous reformuler ?"
    if isinstance(exc, JarvisLoopLimit):
        return "Trop d'étapes pour une seule demande. Pouvez-vous la simplifier ?"
    if isinstance(exc, anthropic.AuthenticationError):
        if gateway:
            return f"Clé de la passerelle refusée. Vérifiez {KEY_VARIABLE} (clé affichée par FreeLLMAPI)."
        return "Clé API refusée. Vérifiez ANTHROPIC_API_KEY."
    if isinstance(exc, anthropic.RateLimitError):
        return "Trop de requêtes. Réessayez dans un instant."
    if isinstance(exc, anthropic.APIStatusError):
        message = _api_message(exc)
        if "credit balance is too low" in message.lower():
            return (
                "Votre compte Anthropic n'a plus de crédits : ajoutez-en dans la console "
                "(platform.claude.com, Plans & Billing)."
            )
        if "anthropic-workspace-id" in message:
            return (
                "Votre clé API peut servir sur plusieurs workspaces : recréez-la en choisissant un workspace "
                "(platform.claude.com/settings/keys)."
            )
        return f"Erreur de l'API ({exc.status_code}) : {message}"
    if isinstance(exc, anthropic.APIConnectionError):
        if gateway:
            return f"Connexion impossible à la passerelle {gateway}. FreeLLMAPI est-il lancé ?"
        return "Connexion impossible. Vérifiez votre réseau."
    return str(exc)


def visible(text: str) -> str:
    """Rend visible ce qu'un terminal ou un navigateur interpréterait : `\\r`, séquences ANSI, inversion du
    sens d'écriture, caractères invisibles. Sert à tout ce que l'utilisateur doit approuver : un texte
    piégé ne peut ainsi pas se déguiser en autre chose."""
    return "".join(ch if ch.isprintable() else ch.encode("unicode_escape").decode() for ch in text)


def plain(text: str) -> str:
    """Retire d'un texte affiché brut dans un terminal les caractères de contrôle (sauf retour à la ligne
    et tabulation) : un texte venu du web ne peut pas y piloter le terminal."""
    return "".join(ch for ch in text if ch in "\n\t" or unicodedata.category(ch) != "Cc")


def short(value, limit: int = 80) -> str:
    """Résumé d'une ligne des arguments d'un outil."""
    text = " ".join(f"{k}={v!r}" for k, v in value.items()) if isinstance(value, dict) else str(value)
    return text if len(text) <= limit else text[: limit - 1] + "…"
