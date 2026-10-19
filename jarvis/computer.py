"""Outils qui agissent sur l'ordinateur : fichiers et commandes.

Chaque outil sensible a une « garde » de même signature qui renvoie la question à
poser à l'utilisateur (ou None si l'action est sans risque). Écrire un fichier et
lancer une commande demandent toujours son accord ; lire hors du dossier courant
aussi.
"""

import os
import signal
import subprocess
from pathlib import Path

from .display import visible
from .errors import ToolError

MAX_READ_CHARS = 20_000
MAX_OUTPUT_CHARS = 10_000
MAX_ENTRIES = 200
DEFAULT_TIMEOUT = 60
MAX_TIMEOUT = 300
PREVIEW_CHARS = 300

# Même dans le dossier courant (souvent le dossier personnel), ces fichiers demandent l'accord.
SENSITIVE_DIRS = {".ssh", ".aws", ".gnupg", ".kube", ".docker", ".jarvis"}
SENSITIVE_FILES = {".netrc", ".pypirc", ".npmrc", ".pgpass", ".git-credentials", "id_rsa", "id_ecdsa", "id_ed25519"}
SENSITIVE_SUFFIXES = {".pem", ".key", ".p12", ".pfx"}


def _resolve(path: str) -> Path:
    return Path(path).expanduser().resolve()


def _outside_workdir(path: Path) -> bool:
    return not path.is_relative_to(Path.cwd().resolve())


def _is_sensitive(path: Path) -> bool:
    name = path.name.lower()
    return bool(
        {part.lower() for part in path.parts} & SENSITIVE_DIRS
        or name in SENSITIVE_FILES
        or name.startswith(".env")
        or path.suffix.lower() in SENSITIVE_SUFFIXES
    )


def _read_question(verb: str, target: Path) -> str | None:
    shown = visible(str(target))
    if _is_sensitive(target):
        return f"{verb} {shown} (fichier sensible : clés, identifiants ou secrets possibles)"
    if _outside_workdir(target):
        return f"{verb} {shown} (hors du dossier courant)"
    return None


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
    return _read_question("Lire", _resolve(path))


def guard_list(path: str = ".") -> str | None:
    return _read_question("Lister", _resolve(path))


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
    preview = visible(content[:PREVIEW_CHARS]) + ("…" if len(content) > PREVIEW_CHARS else "")
    return f"{verb} le fichier {visible(str(target))} ({len(content)} caractères) : « {preview} »"


def _kill_tree(process: subprocess.Popen) -> None:
    """Arrête la commande et tout ce qu'elle a lancé (le shell seul ne suffit pas)."""
    try:
        if os.name == "posix":
            os.killpg(process.pid, signal.SIGKILL)  # le processus est chef de son propre groupe
        else:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(process.pid)], capture_output=True)
    except (ProcessLookupError, PermissionError):
        pass  # déjà terminé
    try:
        process.communicate(timeout=5)  # récupère le processus et ferme les tubes
    except subprocess.TimeoutExpired:
        process.kill()


def run_command(command: str, timeout: int = DEFAULT_TIMEOUT) -> str:
    timeout = min(max(int(timeout), 1), MAX_TIMEOUT)
    process = subprocess.Popen(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        errors="replace",
        stdin=subprocess.DEVNULL,
        start_new_session=os.name == "posix",  # groupe à part : on peut tout arrêter d'un coup
    )
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        _kill_tree(process)
        raise ToolError(f"Commande interrompue après {timeout} s.")
    except BaseException:  # Ctrl-C compris : ne rien laisser tourner derrière nous
        _kill_tree(process)
        raise
    output = _clip((stdout + stderr).strip(), MAX_OUTPUT_CHARS)
    return f"Code de sortie : {process.returncode}\n{output}".rstrip()


def guard_command(command: str, timeout: int = DEFAULT_TIMEOUT) -> str:
    return f"Exécuter la commande : {visible(command)}"
