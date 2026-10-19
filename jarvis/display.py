"""Mise en forme partagée par le terminal et l'interface web."""

import unicodedata

import anthropic

from .errors import JarvisLoopLimit, JarvisRefusal, JarvisTruncated

#: Erreurs qu'un tour de conversation peut lever et qu'on explique à l'utilisateur.
TURN_ERRORS = (anthropic.AnthropicError, JarvisRefusal, JarvisTruncated, JarvisLoopLimit)


def is_missing_credentials(exc: Exception) -> bool:
    """Le SDK lève un TypeError (et non une AnthropicError) sans identifiants."""
    return isinstance(exc, TypeError) and "authentication method" in str(exc)


def describe_error(exc: Exception) -> str:
    if is_missing_credentials(exc):
        return "Aucune clé API. Définissez ANTHROPIC_API_KEY (voir le README)."
    if isinstance(exc, JarvisRefusal):
        return "Je ne peux pas répondre à cette demande."
    if isinstance(exc, JarvisTruncated):
        return "Ma réponse a été coupée en plein calcul. Pouvez-vous reformuler ?"
    if isinstance(exc, JarvisLoopLimit):
        return "Trop d'étapes pour une seule demande. Pouvez-vous la simplifier ?"
    if isinstance(exc, anthropic.AuthenticationError):
        return "Clé API refusée. Vérifiez ANTHROPIC_API_KEY."
    if isinstance(exc, anthropic.RateLimitError):
        return "Trop de requêtes. Réessayez dans un instant."
    if isinstance(exc, anthropic.BadRequestError) and "anthropic-workspace-id" in str(exc.message):
        return (
            "Votre clé API peut servir sur plusieurs workspaces : recréez-la en choisissant un workspace "
            "(platform.claude.com/settings/keys)."
        )
    if isinstance(exc, anthropic.APIStatusError):
        return f"Erreur de l'API ({exc.status_code}) : {exc.message}"
    if isinstance(exc, anthropic.APIConnectionError):
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
