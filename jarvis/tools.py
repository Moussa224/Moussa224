"""Outils locaux que Jarvis peut appeler : date/heure, calculatrice, notes."""

import ast
import json
import math
import operator
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MOIS = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]

MAX_EXPRESSION_LENGTH = 200
MAX_EXPONENT = 1000


class ToolError(Exception):
    """Erreur lisible renvoyée à Claude avec `is_error: true`."""


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


# --- Notes -----------------------------------------------------------------


def _notes_path() -> Path:
    return jarvis_home() / "notes.json"


def _load_notes() -> list[dict]:
    path = _notes_path()
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        raise ToolError(f"Le fichier de notes {path} est corrompu.")


def _save_notes(notes: list[dict]) -> None:
    path = _notes_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(notes, ensure_ascii=False, indent=2), encoding="utf-8")


def add_note(text: str) -> str:
    text = text.strip()
    if not text:
        raise ToolError("La note est vide.")
    notes = _load_notes()
    note_id = max((n["id"] for n in notes), default=0) + 1
    notes.append(
        {
            "id": note_id,
            "text": text,
            "created": datetime.now().astimezone().isoformat(timespec="seconds"),
        }
    )
    _save_notes(notes)
    return f"Note {note_id} enregistrée."


def list_notes() -> str:
    notes = _load_notes()
    if not notes:
        return "Aucune note."
    return "\n".join(f"{n['id']}. [{n['created']}] {n['text']}" for n in notes)


def delete_note(id: int) -> str:
    notes = _load_notes()
    remaining = [n for n in notes if n["id"] != id]
    if len(remaining) == len(notes):
        raise ToolError(f"Aucune note avec l'identifiant {id}.")
    _save_notes(remaining)
    return f"Note {id} supprimée."


# --- Déclaration pour l'API ------------------------------------------------

TOOLS = [
    {
        "name": "get_datetime",
        "description": (
            "Donne la date et l'heure actuelles. À utiliser pour toute question "
            "sur le jour, la date ou l'heure, car tu ne les connais pas."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "timezone": {
                    "type": "string",
                    "description": "Fuseau IANA, ex. Europe/Paris. Vide = heure locale.",
                }
            },
        },
    },
    {
        "name": "calculate",
        "description": (
            "Évalue une expression mathématique : + - * / // % **, parenthèses, "
            "sqrt, sin, cos, tan, log, log10, exp, abs, round, min, max, pi, e."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "Ex. 'sqrt(2) * 3'."}
            },
            "required": ["expression"],
        },
    },
    {
        "name": "add_note",
        "description": "Enregistre une note durable (idée, rappel, information à retenir).",
        "input_schema": {
            "type": "object",
            "properties": {"text": {"type": "string", "description": "Contenu de la note."}},
            "required": ["text"],
        },
    },
    {
        "name": "list_notes",
        "description": "Liste toutes les notes enregistrées avec leur identifiant.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "delete_note",
        "description": "Supprime une note à partir de son identifiant.",
        "input_schema": {
            "type": "object",
            "properties": {"id": {"type": "integer", "description": "Identifiant de la note."}},
            "required": ["id"],
        },
    },
]

_HANDLERS = {
    "get_datetime": get_datetime,
    "calculate": calculate,
    "add_note": add_note,
    "list_notes": list_notes,
    "delete_note": delete_note,
}


def execute(name: str, tool_input: dict) -> tuple[str, bool]:
    """Exécute un outil et renvoie `(texte, is_error)`."""
    handler = _HANDLERS.get(name)
    if handler is None:
        return f"Outil inconnu : {name}.", True
    try:
        return handler(**tool_input), False
    except ToolError as exc:
        return str(exc), True
    except (TypeError, AttributeError):
        return f"Arguments invalides pour {name} : {json.dumps(tool_input)}.", True
    except OSError as exc:
        return f"Erreur d'accès au fichier : {exc}.", True
