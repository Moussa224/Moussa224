"""`jarvis --diagnostic` : vérifie avec votre vraie clé que tout fonctionne.

Les requêtes envoyées sont exactement celles de Jarvis (même modèle, même prompt, mêmes
outils), limitées à 16 jetons de sortie : le coût est négligeable.
"""

from typing import Callable

from . import voice
from .agent import Jarvis
from .display import TURN_ERRORS, describe_error, is_missing_credentials
from .gateway import GatewayError
from .tools import jarvis_home

OK, WARN, FAIL = "✓", "!", "✗"
PROBE = [{"role": "user", "content": "Réponds seulement : ok"}]
PROBE_TOKENS = 16


def _error_of(call: Callable[[], object], gateway: str | None = None) -> str | None:
    """Renvoie l'explication de l'échec de `call`, ou None s'il a réussi."""
    try:
        call()
    except TURN_ERRORS as exc:
        return describe_error(exc, gateway)
    except TypeError as exc:
        if is_missing_credentials(exc):
            return describe_error(exc, gateway)
        raise
    return None


def _check_data_directory() -> tuple[str, str]:
    home = jarvis_home()
    try:
        home.mkdir(parents=True, exist_ok=True)
        probe = home / ".diagnostic"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
    except OSError as exc:
        return FAIL, f"Dossier de données {home} inutilisable : {exc.strerror or exc}"
    return OK, f"Dossier de données : {home}"


def _check_voice() -> tuple[str, str]:
    speaker = voice.find_speaker()
    if speaker:
        return OK, f"Voix du terminal : {speaker[0]}"
    return WARN, "Voix du terminal : aucune commande de synthèse trouvée (la voix de la page web reste disponible)"


def run(
    model: str | None = None,
    web: bool = True,
    client=None,
    out: Callable[[str], None] = print,
    gateway: str | None = None,
) -> bool:
    """Lance les vérifications ; renvoie False si quelque chose empêche Jarvis de fonctionner."""
    results = [_check_data_directory()]
    try:
        jarvis = Jarvis(client=client, model=model, web=web, persist=False, gateway=gateway)
    except GatewayError as exc:
        results.append((FAIL, str(exc)))
        return _report(results, out)
    web = jarvis.web  # une passerelle n'a pas de recherche web
    jarvis.web = False  # d'abord les outils locaux seuls : si cela échoue, la cause n'est pas le web

    def probe() -> object:
        return jarvis.client.messages.create(**jarvis.request(PROBE, PROBE_TOKENS))

    failure = _error_of(probe, gateway)
    if failure:
        results.append((FAIL, failure))
        results.append((WARN, "Recherche web : non testée"))
    else:
        target = f"passerelle {gateway}, modèle {jarvis.model}" if gateway else f"Clé API, modèle {jarvis.model}"
        results.append((OK, f"{target} et outils locaux : acceptés"))
        if gateway:
            results.append((WARN, "Recherche web : indisponible avec une passerelle"))
        elif not web:
            results.append((WARN, "Recherche web : désactivée (--sans-web)"))
        else:
            jarvis.web = True
            failure = _error_of(probe)
            if failure:
                results.append(
                    (
                        WARN,
                        f"Recherche web refusée ({failure}) ; Jarvis fonctionnera sans. Activez-la dans la "
                        "Console Anthropic (paramètres de l'organisation) ou lancez avec --sans-web.",
                    )
                )
            else:
                results.append((OK, "Recherche web : acceptée"))
    results.append(_check_voice())
    return _report(results, out)


def _report(results: list[tuple[str, str]], out: Callable[[str], None]) -> bool:
    for mark, message in results:
        out(f"  {mark} {message}")
    ready = all(mark != FAIL for mark, _ in results)
    out("Tout est prêt." if ready else "Un problème empêche Jarvis de fonctionner (voir ✗ ci-dessus).")
    return ready
