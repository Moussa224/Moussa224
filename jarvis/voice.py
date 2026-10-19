"""Synthèse vocale optionnelle, via les outils du système (aucune dépendance)."""

import re
import shutil
import subprocess
import sys

# (exécutable, arguments avant le texte) — le premier disponible est utilisé.
_SPEAKERS = [
    ("say", ["-v", "Thomas"]),          # macOS
    ("espeak-ng", ["-v", "fr"]),        # Linux
    ("espeak", ["-v", "fr"]),           # Linux
    ("spd-say", ["-l", "fr", "-w"]),    # Linux (speech-dispatcher)
]


def clean_for_speech(text: str) -> str:
    """Retire ce qui se lit mal à voix haute : liens, code, symboles markdown."""
    text = re.sub(r"```.*?```", " ", text, flags=re.DOTALL)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[`*_#>]|^\s*[-•]\s+", " ", text, flags=re.MULTILINE)
    # un tiret initial serait pris pour une option par la commande de synthèse
    return re.sub(r"\s+", " ", text).strip().lstrip("-").strip()


def find_speaker() -> tuple[str, list[str]] | None:
    if sys.platform == "win32":
        return None  # pas de commande équivalente simple sans dépendance
    for name, args in _SPEAKERS:
        path = shutil.which(name)
        if path:
            return path, args
    return None


def speak(text: str) -> bool:
    """Lit le texte à voix haute ; renvoie False si rien n'a pu être dit."""
    speaker = find_speaker()
    text = clean_for_speech(text)
    if speaker is None or not text:
        return False
    path, args = speaker
    try:
        subprocess.run([path, *args, text], check=True, stdin=subprocess.DEVNULL, timeout=120)
    except (OSError, subprocess.SubprocessError):
        return False
    return True
