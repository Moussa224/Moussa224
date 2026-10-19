"""Interface en ligne de commande : `python -m jarvis [question]`."""

import argparse
import os
import sys

import anthropic

from . import voice
from .agent import DEFAULT_MODEL, Jarvis
from .display import TURN_ERRORS, describe_error, is_missing_credentials, short

try:  # historique et édition de ligne, si disponibles
    import readline  # noqa: F401
except ImportError:
    pass

AIDE = "Commandes : /reset (oublier la conversation), /aide, /quitter"
DEFAULT_PORT = 8765
YES = ("o", "oui", "y", "yes")


def style(text: str, code: str, stream=None) -> str:
    stream = stream or sys.stdout
    if os.environ.get("NO_COLOR") or not stream.isatty():
        return text
    return f"\033[{code}m{text}\033[0m"


def ask_confirmation(question: str) -> bool:
    """Demande l'accord de l'utilisateur ; tout autre réponse que « oui » refuse."""
    print(style(f"\n  ? {question}", "33", sys.stderr), file=sys.stderr)
    try:
        answer = input("    Autoriser ? [o/N] ")
    except (EOFError, KeyboardInterrupt):
        print(file=sys.stderr)
        return False
    return answer.strip().lower() in YES


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
        except TURN_ERRORS as exc:
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
    parser.add_argument("--continuer", action="store_true", help="reprend la dernière conversation")
    parser.add_argument("--web", action="store_true", help="ouvre l'interface web locale")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"port de l'interface web ({DEFAULT_PORT})")
    parser.add_argument("--sans-navigateur", action="store_true", help="n'ouvre pas le navigateur avec --web")
    args = parser.parse_args(argv)

    if args.web:
        from . import web  # import tardif : le terminal n'a pas besoin du serveur

        try:
            web.serve(
                args.port,
                {"model": args.modele, "web": not args.sans_web},
                resume=args.continuer,
                open_browser=not args.sans_navigateur,
            )
        except OSError as exc:
            reason = exc.strerror or exc
            print(f"[Impossible de démarrer le serveur sur le port {args.port} : {reason}]", file=sys.stderr)
            return 1
        return 0

    try:
        session = Session(args.modele, web=not args.sans_web, speak=args.voix)
    except anthropic.AnthropicError as exc:
        print(f"[{describe_error(exc)}]", file=sys.stderr)
        return 1

    if args.continuer:
        count = session.jarvis.resume()
        print(style(f"Conversation reprise ({count} messages)." if count else "Aucune conversation à reprendre.", "2"))

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
