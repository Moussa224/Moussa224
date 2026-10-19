"""`jarvis --diagnostic` : vérifie avec votre vraie clé que tout fonctionne.

Les requêtes envoyées sont exactement celles de Jarvis (même modèle, même prompt, mêmes
outils), limitées à 16 jetons de sortie : le coût est négligeable.
"""

from typing import Callable

from . import voice
from .agent import Jarvis
from .display import TURN_ERRORS, describe_error, is_missing_credentials
from .tools import jarvis_home

OK, WARN, FAIL = "✓", "!", "✗"
PROBE = [{"role": "user", "content": "Réponds seulement : ok"}]
PROBE_TOKENS = 16


def _error_of(call: Callable[[], object]) -> str | None:
    """Renvoie l'explication de l'échec de `call`, ou None s'il a réussi."""
    try:
        call()
    except TURN_ERRORS as exc:
        return describe_error(exc)
    except TypeError as exc:
        if is_missing_credentials(exc):
            return describe_error(exc)
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


def run(model: str | None = None, web: bool = True, client=None, out: Callable[[str], None] = print) -> bool:
    """Lance les vérifications ; renvoie False si quelque chose empêche Jarvis de fonctionner."""
    results = [_check_data_directory()]
    jarvis = Jarvis(client=client, model=model, web=False, persist=False)

    def probe() -> object:
        return jarvis.client.messages.create(**jarvis.request(PROBE, PROBE_TOKENS))

    failure = _error_of(probe)
    if failure:
        results.append((FAIL, failure))
        results.append((WARN, "Recherche web : non testée"))
    else:
        results.append((OK, f"Clé API, modèle {jarvis.model} et outils locaux : acceptés"))
        if not web:
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

    for mark, message in results:
        out(f"  {mark} {message}")
    ready = all(mark != FAIL for mark, _ in results)
    out("Tout est prêt." if ready else "Un problème empêche Jarvis de fonctionner (voir ✗ ci-dessus).")
    return ready
