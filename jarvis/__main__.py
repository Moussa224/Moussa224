"""Interface en ligne de commande : `python -m jarvis [question]`."""

import argparse
import sys

import anthropic

from .agent import Jarvis, JarvisLoopLimit, JarvisRefusal, JarvisTruncated

try:  # historique et édition de ligne, si disponibles
    import readline  # noqa: F401
except ImportError:
    pass

AIDE = "Commandes : /reset (oublier la conversation), /aide, /quitter"


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
    if isinstance(exc, anthropic.APIStatusError):
        return f"Erreur de l'API ({exc.status_code}) : {exc.message}"
    if isinstance(exc, anthropic.APIConnectionError):
        return "Connexion impossible. Vérifiez votre réseau."
    return str(exc)


def ask(jarvis: Jarvis, message: str) -> bool:
    """Pose une question ; renvoie False si le tour a échoué."""
    try:
        jarvis.ask(message)
    except KeyboardInterrupt:
        print("\n(interrompu)")
        return False
    except (anthropic.AnthropicError, JarvisRefusal, JarvisTruncated, JarvisLoopLimit) as exc:
        print(f"\n[{describe_error(exc)}]", file=sys.stderr)
        return False
    except TypeError as exc:
        if not is_missing_credentials(exc):
            raise
        print(f"\n[{describe_error(exc)}]", file=sys.stderr)
        return False
    print()
    return True


def main() -> int:
    parser = argparse.ArgumentParser(prog="jarvis", description="Jarvis, votre assistant personnel.")
    parser.add_argument("question", nargs="*", help="pose une seule question puis quitte")
    args = parser.parse_args()

    try:
        jarvis = Jarvis(
            on_text=lambda text: print(text, end="", flush=True),
            on_tool=lambda name, tool_input: print(f"\n  ⚙ {name} {tool_input or ''}", file=sys.stderr),
        )
    except anthropic.AnthropicError as exc:
        print(f"[{describe_error(exc)}]", file=sys.stderr)
        return 1

    if args.question:
        return 0 if ask(jarvis, " ".join(args.question)) else 1

    print(f"Jarvis à votre service. {AIDE}")
    while True:
        try:
            line = input("\nvous > ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not line:
            continue
        if line in ("/quitter", "/quit", "/exit"):
            return 0
        if line in ("/aide", "/help"):
            print(AIDE)
        elif line == "/reset":
            jarvis.reset()
            print("Conversation réinitialisée.")
        else:
            print("jarvis > ", end="", flush=True)
            ask(jarvis, line)


if __name__ == "__main__":
    sys.exit(main())
