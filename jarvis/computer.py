"""Outils qui agissent sur l'ordinateur : fichiers et commandes.

Chaque outil sensible a une « garde » de même signature qui renvoie la question à
poser à l'utilisateur (ou None si l'action est sans risque). Écrire un fichier et
lancer une commande demandent toujours son accord ; lire hors du dossier courant
aussi.
"""

import subprocess
from pathlib import Path

from .errors import ToolError

MAX_READ_CHARS = 20_000
MAX_OUTPUT_CHARS = 10_000
MAX_ENTRIES = 200
DEFAULT_TIMEOUT = 60
MAX_TIMEOUT = 300


def _resolve(path: str) -> Path:
    return Path(path).expanduser().resolve()


def _outside_workdir(path: Path) -> bool:
    return not path.is_relative_to(Path.cwd().resolve())


def _clip(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n[... tronqué à {limit} caractères]"


# --- Lecture ---------------------------------------------------------------


def list_directory(path: str = ".") -> str:
    target = _resolve(path)
    if not target.is_dir():
        raise ToolError(f"{target} n'est pas un dossier.")
    entries = sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
    lines = [f"{p.name}/" if p.is_dir() else p.name for p in entries[:MAX_ENTRIES]]
    if len(entries) > MAX_ENTRIES:
        lines.append(f"[... {len(entries) - MAX_ENTRIES} autres éléments]")
    return "\n".join(lines) or "(dossier vide)"


def read_file(path: str) -> str:
    target = _resolve(path)
    if not target.is_file():
        raise ToolError(f"{target} n'est pas un fichier.")
    with target.open(encoding="utf-8", errors="replace") as handle:
        content = handle.read(MAX_READ_CHARS + 1)
    return _clip(content, MAX_READ_CHARS)


def guard_read(path: str) -> str | None:
    target = _resolve(path)
    return f"Lire {target} (hors du dossier courant)" if _outside_workdir(target) else None


def guard_list(path: str = ".") -> str | None:
    target = _resolve(path)
    return f"Lister {target} (hors du dossier courant)" if _outside_workdir(target) else None


# --- Écriture et commandes -------------------------------------------------


def write_file(path: str, content: str) -> str:
    target = _resolve(path)
    if target.is_dir():
        raise ToolError(f"{target} est un dossier.")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return f"Fichier écrit : {target} ({len(content)} caractères)."


def guard_write(path: str, content: str) -> str:
    target = _resolve(path)
    verb = "Écraser" if target.exists() else "Créer"
    return f"{verb} le fichier {target} ({len(content)} caractères)"


def run_command(command: str, timeout: int = DEFAULT_TIMEOUT) -> str:
    timeout = min(max(int(timeout), 1), MAX_TIMEOUT)
    try:
        done = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            errors="replace",
            timeout=timeout,
            stdin=subprocess.DEVNULL,
        )
    except subprocess.TimeoutExpired:
        raise ToolError(f"Commande interrompue après {timeout} s.")
    output = _clip((done.stdout + done.stderr).strip(), MAX_OUTPUT_CHARS)
    return f"Code de sortie : {done.returncode}\n{output}".rstrip()


def guard_command(command: str, timeout: int = DEFAULT_TIMEOUT) -> str:
    return f"Exécuter la commande : {command}"
