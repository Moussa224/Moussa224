"""Outils locaux de Jarvis : date/heure, calculatrice, notes, mémoire, ordinateur."""

import ast
import json
import math
import operator
import os
from datetime import datetime
from pathlib import Path
from typing import Callable
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from . import computer
from .errors import ToolError

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MOIS = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]

MAX_EXPRESSION_LENGTH = 200
MAX_EXPONENT = 1000


def jarvis_home() -> Path:
    """Dossier de données (`JARVIS_HOME`, sinon `~/.jarvis`)."""
    return Path(os.environ.get("JARVIS_HOME") or Path.home() / ".jarvis")


# --- Date et heure ---------------------------------------------------------


def get_datetime(timezone: str = "") -> str:
    if timezone:
        try:
            tz = ZoneInfo(timezone)
        except (ZoneInfoNotFoundError, ValueError):
            raise ToolError(
                f"Fuseau horaire inconnu : {timezone!r} (exemple : Europe/Paris)."
            )
        now = datetime.now(tz)
    else:
        now = datetime.now().astimezone()
    label = timezone or now.tzname() or "heure locale"
    return (
        f"{JOURS[now.weekday()]} {now.day} {MOIS[now.month - 1]} {now.year}, "
        f"{now:%H:%M:%S} ({label})"
    )


# --- Calculatrice ----------------------------------------------------------

_BINARY_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_UNARY_OPS = {ast.UAdd: operator.pos, ast.USub: operator.neg}
_FUNCTIONS = {
    "sqrt": math.sqrt, "sin": math.sin, "cos": math.cos, "tan": math.tan,
    "log": math.log, "log10": math.log10, "exp": math.exp,
    "abs": abs, "round": round, "min": min, "max": max,
}
_CONSTANTS = {"pi": math.pi, "e": math.e}


def _eval(node: ast.AST) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.Name) and node.id in _CONSTANTS:
        return _CONSTANTS[node.id]
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPS:
        return _UNARY_OPS[type(node.op)](_eval(node.operand))
    if isinstance(node, ast.BinOp) and type(node.op) in _BINARY_OPS:
        left, right = _eval(node.left), _eval(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > MAX_EXPONENT:
            raise ToolError(f"Exposant trop grand (maximum {MAX_EXPONENT}).")
        return _BINARY_OPS[type(node.op)](left, right)
    if (
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id in _FUNCTIONS
        and not node.keywords
    ):
        return _FUNCTIONS[node.func.id](*[_eval(arg) for arg in node.args])
    raise ToolError("Expression non prise en charge.")


def calculate(expression: str) -> str:
    if len(expression) > MAX_EXPRESSION_LENGTH:
        raise ToolError("Expression trop longue.")
    try:
        result = _eval(ast.parse(expression.strip(), mode="eval").body)
    except ToolError:
        raise
    except SyntaxError:
        raise ToolError(f"Expression invalide : {expression!r}.")
    except (ZeroDivisionError, ValueError, OverflowError, TypeError) as exc:
        raise ToolError(f"Calcul impossible : {exc}.")
    return str(result)


# --- Listes persistantes (notes et mémoire) --------------------------------


def _load(filename: str) -> list[dict]:
    path = jarvis_home() / filename
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        raise ToolError(f"Le fichier {path} est corrompu.")


def _save(filename: str, items: list[dict]) -> None:
    path = jarvis_home() / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        json.dump(items, handle, ensure_ascii=False, indent=2)
    os.chmod(path, 0o600)  # si le fichier existait déjà avec d'autres droits


def _append(filename: str, text: str) -> int:
    text = text.strip()
    if not text:
        raise ToolError("Le texte est vide.")
    items = _load(filename)
    item_id = max((i["id"] for i in items), default=0) + 1
    items.append(
        {
            "id": item_id,
            "text": text,
            "created": datetime.now().astimezone().isoformat(timespec="seconds"),
        }
    )
    _save(filename, items)
    return item_id


def _remove(filename: str, item_id: int, label: str) -> None:
    items = _load(filename)
    remaining = [i for i in items if i["id"] != item_id]
    if len(remaining) == len(items):
        raise ToolError(f"Aucun élément « {label} » avec l'identifiant {item_id}.")
    _save(filename, remaining)


def add_note(text: str) -> str:
    return f"Note {_append('notes.json', text)} enregistrée."


def list_notes() -> str:
    notes = _load("notes.json")
    if not notes:
        return "Aucune note."
    return "\n".join(f"{n['id']}. [{n['created']}] {n['text']}" for n in notes)


def delete_note(id: int) -> str:
    _remove("notes.json", id, "note")
    return f"Note {id} supprimée."


def remember(fact: str) -> str:
    return f"Retenu (souvenir {_append('memory.json', fact)}). Je m'en souviendrai aux prochaines sessions."


def forget(id: int) -> str:
    _remove("memory.json", id, "souvenir")
    return f"Souvenir {id} oublié."


def load_memories() -> list[dict]:
    """Souvenirs durables, injectés dans le prompt système au démarrage."""
    try:
        return _load("memory.json")
    except ToolError:
        return []


# --- Déclaration pour l'API ------------------------------------------------


def _tool(name: str, description: str, properties: dict | None = None, required: list | None = None):
    schema = {"type": "object", "properties": properties or {}}
    if required:
        schema["required"] = required
    return {"name": name, "description": description, "input_schema": schema}


_TEXT = {"type": "string"}

TOOLS = [
    _tool(
        "get_datetime",
        "Donne la date et l'heure actuelles. À utiliser pour toute question sur le "
        "jour, la date ou l'heure, car tu ne les connais pas.",
        {"timezone": {**_TEXT, "description": "Fuseau IANA, ex. Europe/Paris. Vide = heure locale."}},
    ),
    _tool(
        "calculate",
        "Évalue une expression mathématique : + - * / // % **, parenthèses, sqrt, "
        "sin, cos, tan, log, log10, exp, abs, round, min, max, pi, e.",
        {"expression": {**_TEXT, "description": "Ex. 'sqrt(2) * 3'."}},
        ["expression"],
    ),
    _tool(
        "add_note",
        "Enregistre une note de l'utilisateur (idée, rappel, liste de courses…).",
        {"text": {**_TEXT, "description": "Contenu de la note."}},
        ["text"],
    ),
    _tool("list_notes", "Liste toutes les notes enregistrées avec leur identifiant."),
    _tool(
        "delete_note",
        "Supprime une note à partir de son identifiant.",
        {"id": {"type": "integer", "description": "Identifiant de la note."}},
        ["id"],
    ),
    _tool(
        "remember",
        "Retient durablement un fait sur l'utilisateur (préférence, habitude, "
        "contexte personnel) pour les sessions futures. À distinguer des notes : "
        "un souvenir sert à mieux le connaître, pas à garder une information à lui rendre.",
        {"fact": {**_TEXT, "description": "Le fait, formulé clairement. Ex. « Préfère être tutoyé »."}},
        ["fact"],
    ),
    _tool(
        "forget",
        "Efface un souvenir à partir de son identifiant (visible dans ta mémoire).",
        {"id": {"type": "integer", "description": "Identifiant du souvenir."}},
        ["id"],
    ),
    _tool(
        "list_directory",
        "Liste le contenu d'un dossier (dossiers d'abord, suffixés par /).",
        {"path": {**_TEXT, "description": "Chemin du dossier. Défaut : dossier courant."}},
    ),
    _tool(
        "read_file",
        "Lit un fichier texte (tronqué à 20 000 caractères).",
        {"path": {**_TEXT, "description": "Chemin du fichier."}},
        ["path"],
    ),
    _tool(
        "write_file",
        "Crée ou écrase un fichier texte. L'utilisateur doit approuver chaque écriture.",
        {
            "path": {**_TEXT, "description": "Chemin du fichier."},
            "content": {**_TEXT, "description": "Contenu complet."},
        },
        ["path", "content"],
    ),
    _tool(
        "run_command",
        "Exécute une commande shell sur l'ordinateur de l'utilisateur et renvoie sa "
        "sortie. L'utilisateur doit approuver chaque commande ; n'en propose jamais "
        "de destructive sans qu'il l'ait demandé.",
        {
            "command": {**_TEXT, "description": "Commande shell."},
            "timeout": {
                "type": "integer",
                "description": "Délai maximal en secondes (60 par défaut, 300 maximum).",
            },
        },
        ["command"],
    ),
]

_HANDLERS: dict[str, Callable[..., str]] = {
    "get_datetime": get_datetime,
    "calculate": calculate,
    "add_note": add_note,
    "list_notes": list_notes,
    "delete_note": delete_note,
    "remember": remember,
    "forget": forget,
    "list_directory": computer.list_directory,
    "read_file": computer.read_file,
    "write_file": computer.write_file,
    "run_command": computer.run_command,
}

# Gardes : même signature que l'outil, renvoient la question à poser (ou None).
_GUARDS: dict[str, Callable[..., str | None]] = {
    "list_directory": computer.guard_list,
    "read_file": computer.guard_read,
    "write_file": computer.guard_write,
    "run_command": computer.guard_command,
}

Confirm = Callable[[str], bool]


def execute(name: str, tool_input: dict, confirm: Confirm = lambda question: False) -> tuple[str, bool]:
    """Exécute un outil et renvoie `(texte, is_error)`.

    Les actions sensibles passent par `confirm`, qui refuse tout par défaut.
    """
    handler = _HANDLERS.get(name)
    if handler is None:
        return f"Outil inconnu : {name}.", True
    try:
        guard = _GUARDS.get(name)
        question = guard(**tool_input) if guard else None
        if question and not confirm(question):
            return "L'utilisateur a refusé cette action.", False
        return handler(**tool_input), False
    except ToolError as exc:
        return str(exc), True
    except (TypeError, AttributeError, ValueError):
        return f"Arguments invalides pour {name} : {json.dumps(tool_input)}.", True
    except OSError as exc:
        return f"Erreur système : {exc}.", True
