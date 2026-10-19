import subprocess

from jarvis import voice


def test_clean_for_speech_drops_what_reads_badly():
    text = "**Salut** !\n- voir https://exemple.fr/page\n```py\nprint(1)\n```\n- `code` fini"
    assert voice.clean_for_speech(text) == "Salut ! voir code fini"


def test_leading_dash_cannot_become_an_option():
    assert voice.clean_for_speech("--version") == "version"


def test_speak_runs_the_first_available_speaker(monkeypatch):
    calls = []
    found = {"espeak-ng": "/usr/bin/espeak-ng"}
    monkeypatch.setattr(voice.shutil, "which", found.get)
    monkeypatch.setattr(voice.subprocess, "run", lambda cmd, **kw: calls.append(cmd))
    monkeypatch.setattr(voice.sys, "platform", "linux")

    assert voice.speak("**Bonjour**") is True
    assert calls == [["/usr/bin/espeak-ng", "-v", "fr", "Bonjour"]]


def test_speak_degrades_gracefully(monkeypatch):
    monkeypatch.setattr(voice.sys, "platform", "linux")
    monkeypatch.setattr(voice.shutil, "which", lambda name: None)
    assert voice.speak("Bonjour") is False

    monkeypatch.setattr(voice.shutil, "which", lambda name: "/bin/say")

    def broken(cmd, **kw):
        raise subprocess.CalledProcessError(1, cmd)

    monkeypatch.setattr(voice.subprocess, "run", broken)
    assert voice.speak("Bonjour") is False
    assert voice.speak("   ") is False
