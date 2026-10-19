"""Interface en ligne de commande : `python -m jarvis [question]`."""

import argparse
import os
import sys

import anthropic

from . import voice
from .agent import DEFAULT_MODEL, Jarvis, JarvisLoopLimit, JarvisRefusal, JarvisTruncated

try:  # historique et édition de ligne, si disponibles
    import readline  # noqa: F401
except ImportError:
    pass

AIDE = "Commandes : /reset (oublier la conversation), /aide, /quitter"
YES = ("o", "oui", "y", "yes")


def style(text: str, code: str, stream=None) -> str:
    stream = stream or sys.stdout
    if os.environ.get("NO_COLOR") or not stream.isatty():
        return text
    return f"\033[{code}m{text}\033[0m"


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


def ask_confirmation(question: str) -> bool:
    """Demande l'accord de l'utilisateur ; tout autre réponse que « oui » refuse."""
    print(style(f"\n  ? {question}", "33", sys.stderr), file=sys.stderr)
    try:
        answer = input("    Autoriser ? [o/N] ")
    except (EOFError, KeyboardInterrupt):
        print(file=sys.stderr)
        return False
    return answer.strip().lower() in YES


def short(value, limit: int = 80) -> str:
    text = " ".join(f"{k}={v!r}" for k, v in value.items()) if isinstance(value, dict) else str(value)
    return text if len(text) <= limit else text[: limit - 1] + "…"


class Session:
    """Relie Jarvis au terminal : affichage, voix, gestion des erreurs."""

    def __init__(self, model: str | None, web: bool, speak: bool):
        self.speak = speak
        self.reply: list[str] = []
        self.jarvis = Jarvis(
            model=model,
            web=web,
            on_text=self._on_text,
            on_tool=lambda name, args: print(
                style(f"\n  ⚙ {name} {short(args)}", "2", sys.stderr), file=sys.stderr
            ),
            on_notice=lambda message: print(style(f"\n  ! {message}", "33", sys.stderr), file=sys.stderr),
            confirm=ask_confirmation,
        )

    def _on_text(self, text: str) -> None:
        self.reply.append(text)
        print(text, end="", flush=True)

    def ask(self, message: str) -> bool:
        """Pose une question ; renvoie False si le tour a échoué."""
        self.reply.clear()
        try:
            self.jarvis.ask(message)
        except KeyboardInterrupt:
            print("\n(interrompu)")
            return False
        except (anthropic.AnthropicError, JarvisRefusal, JarvisTruncated, JarvisLoopLimit) as exc:
            return self._fail(exc)
        except TypeError as exc:
            if not is_missing_credentials(exc):
                raise
            return self._fail(exc)
        print()
        if self.speak and not voice.speak("".join(self.reply)):
            self.speak = False
            notice = style("  ! Synthèse vocale indisponible sur ce système.", "33", sys.stderr)
            print(notice, file=sys.stderr)
        return True

    @staticmethod
    def _fail(exc: Exception) -> bool:
        print(style(f"\n[{describe_error(exc)}]", "31", sys.stderr), file=sys.stderr)
        return False


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="jarvis", description="Jarvis, votre assistant personnel.")
    parser.add_argument("question", nargs="*", help="pose une seule question puis quitte")
    parser.add_argument("--modele", help=f"modèle Claude (défaut : $JARVIS_MODEL ou {DEFAULT_MODEL})")
    parser.add_argument("--sans-web", action="store_true", help="désactive la recherche et la lecture web")
    parser.add_argument("--voix", action="store_true", help="lit les réponses à voix haute")
    args = parser.parse_args(argv)

    try:
        session = Session(args.modele, web=not args.sans_web, speak=args.voix)
    except anthropic.AnthropicError as exc:
        print(f"[{describe_error(exc)}]", file=sys.stderr)
        return 1

    if args.question:
        return 0 if session.ask(" ".join(args.question)) else 1

    print(style("Jarvis", "1;36") + f" à votre service. {AIDE}")
    while True:
        try:
            # pas de couleur dans le prompt d'input() : elle fausserait readline
            print("\n" + style("vous", "1"), end=" ", flush=True)
            line = input("> ").strip()
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
            session.jarvis.reset()
            print("Conversation réinitialisée.")
        else:
            print(style("jarvis", "1;32") + " > ", end="", flush=True)
            session.ask(line)


if __name__ == "__main__":
    sys.exit(main())
