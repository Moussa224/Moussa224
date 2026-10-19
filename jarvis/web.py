"""Interface web locale : `python -m jarvis --web`.

Le serveur n'écoute que sur 127.0.0.1 et ne fait confiance qu'à la page qu'il sert.
Comme Jarvis peut agir sur l'ordinateur, chaque appel exige :
- un jeton secret aléatoire (transmis dans le fragment de l'URL, jamais envoyé ni journalisé) ;
- un en-tête `Host` attendu (contre le « DNS rebinding ») ;
- une `Origin` identique au serveur quand elle est présente (contre les autres sites) ;
- du JSON en `Content-Type` pour les écritures (ce qui force un contrôle préalable du navigateur).
Les actions sensibles restent soumises à l'accord de l'utilisateur, demandé dans la page.
"""

import hmac
import html
import json
import os
import secrets
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from .agent import Jarvis
from .display import TURN_ERRORS, describe_error, is_missing_credentials, short
from .tools import jarvis_home

INDEX = Path(__file__).parent / "static" / "index.html"
TOKEN_HEADER = "X-Jarvis-Token"
CONFIRM_TIMEOUT = 120  # secondes, ensuite l'action est refusée
MAX_BODY = 1_000_000


class ClientGone(Exception):
    """La page s'est fermée en cours d'échange : on abandonne le tour."""


class WebApp:
    """Une conversation Jarvis partagée avec la page, un échange à la fois."""

    def __init__(self, token: str, jarvis_options: dict | None = None, resume: bool = False):
        self.token = token
        self._busy = threading.Lock()
        self._sink = None
        self._pending: dict[str, dict] = {}
        self.jarvis = Jarvis(
            on_text=lambda text: self._emit(type="text", text=text),
            on_tool=lambda name, args: self._emit(type="tool", name=name, summary=short(args)),
            on_notice=lambda message: self._emit(type="notice", message=message),
            confirm=self._confirm,
            **(jarvis_options or {}),
        )
        if resume:
            self.jarvis.resume()

    # --- Échange en cours -------------------------------------------------

    def begin(self, sink) -> bool:
        """Réserve la conversation ; `sink(event)` reçoit les événements à envoyer à la page."""
        if not self._busy.acquire(blocking=False):
            return False
        self._sink = sink
        return True

    def end(self) -> None:
        self._sink = None
        self._busy.release()

    def _emit(self, **event) -> None:
        if not self._sink:
            return
        try:
            self._sink(event)
        except OSError as exc:
            self._sink = None
            # Pas une OSError : les outils en avaleraient une et le tour continuerait.
            raise ClientGone() from exc

    def chat(self, message: str) -> None:
        """Traite un message ; chaque étape part vers la page, erreurs comprises."""
        try:
            self.jarvis.ask(message)
        except TURN_ERRORS as exc:
            self._emit(type="error", message=describe_error(exc))
        except TypeError as exc:
            if not is_missing_credentials(exc):
                raise
            self._emit(type="error", message=describe_error(exc))
        else:
            self._emit(type="done")

    # --- Accord de l'utilisateur ------------------------------------------

    def _confirm(self, question: str) -> bool:
        request_id = secrets.token_hex(8)
        entry = {"decided": threading.Event(), "allow": False}
        self._pending[request_id] = entry
        try:
            self._emit(type="confirm", id=request_id, question=question)
            decided = entry["decided"].wait(CONFIRM_TIMEOUT)
            self._emit(type="confirm_done", id=request_id)
            return decided and entry["allow"]
        finally:
            self._pending.pop(request_id, None)

    def decide(self, request_id: str, allow: bool) -> bool:
        entry = self._pending.get(request_id)
        if entry is None:
            return False
        entry["allow"] = allow
        entry["decided"].set()
        return True


class Handler(BaseHTTPRequestHandler):
    server: "JarvisServer"

    def log_message(self, format, *args):  # silence : le terminal sert à la conversation
        pass

    # --- Réponses ---------------------------------------------------------

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _refuse(self, status: int, message: str) -> None:
        self._send_json(status, {"error": message})

    # --- Contrôles de sécurité --------------------------------------------

    def _trusted_origin(self) -> bool:
        host = self.headers.get("Host", "")
        if host not in self.server.allowed_hosts:
            return False
        origin = self.headers.get("Origin")
        return origin is None or origin == f"http://{host}"

    def _authorized(self) -> bool:
        token = self.headers.get(TOKEN_HEADER, "")
        # en octets : compare_digest refuse les chaînes non ASCII
        return self._trusted_origin() and hmac.compare_digest(token.encode(), self.server.app.token.encode())

    def _read_json(self) -> dict | None:
        if not self.headers.get("Content-Type", "").startswith("application/json"):
            self._refuse(415, "Content-Type application/json requis.")
            return None
        try:
            length = int(self.headers.get("Content-Length", ""))
            if not 0 <= length <= MAX_BODY:
                raise ValueError
            body = json.loads(self.rfile.read(length))
        except ValueError:
            self._refuse(400, "Requête invalide.")
            return None
        if not isinstance(body, dict):
            self._refuse(400, "Requête invalide.")
            return None
        return body

    # --- Routes -----------------------------------------------------------

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            if not self._trusted_origin():
                return self._refuse(403, "Accès refusé.")
            page = INDEX.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(page)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header(
                "Content-Security-Policy",
                "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
                "connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
            )
            self.end_headers()
            self.wfile.write(page)
        elif self.path == "/api/state":
            if not self._authorized():
                return self._refuse(403, "Accès refusé.")
            jarvis = self.server.app.jarvis
            self._send_json(200, {"transcript": jarvis.transcript(), "model": jarvis.model, "web": jarvis.web})
        else:
            self._refuse(404, "Introuvable.")

    def do_POST(self):
        routes = {"/api/chat": self._chat, "/api/confirm": self._confirm, "/api/reset": self._reset}
        route = routes.get(self.path)
        if route is None:
            return self._refuse(404, "Introuvable.")
        if not self._authorized():
            return self._refuse(403, "Accès refusé.")
        body = self._read_json()
        if body is not None:
            route(body)

    def _chat(self, body: dict) -> None:
        message = body.get("message")
        if not isinstance(message, str) or not message.strip():
            return self._refuse(400, "Message vide.")
        app = self.server.app
        if not app.begin(self._write_event):
            return self._refuse(409, "Jarvis est déjà en train de répondre.")
        try:
            self.send_response(200)
            self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            app.chat(message.strip())
        except (ClientGone, OSError):
            pass  # la page a été fermée : l'échange est abandonné (et annulé dans l'historique)
        finally:
            app.end()

    def _write_event(self, event: dict) -> None:
        self.wfile.write(json.dumps(event, ensure_ascii=False).encode() + b"\n")
        self.wfile.flush()

    def _confirm(self, body: dict) -> None:
        request_id, allow = body.get("id"), body.get("allow")
        if not isinstance(request_id, str) or not isinstance(allow, bool):
            return self._refuse(400, "Requête invalide.")
        if not self.server.app.decide(request_id, allow):
            return self._refuse(404, "Demande inconnue ou expirée.")
        self._send_json(200, {"ok": True})

    def _reset(self, body: dict) -> None:
        app = self.server.app
        if not app.begin(lambda event: None):
            return self._refuse(409, "Jarvis est en train de répondre.")
        try:
            app.jarvis.reset()
        finally:
            app.end()
        self._send_json(200, {"ok": True})


class JarvisServer(ThreadingHTTPServer):
    def __init__(self, app: WebApp, port: int = 0):
        super().__init__(("127.0.0.1", port), Handler)
        self.app = app
        self.allowed_hosts = {f"127.0.0.1:{self.server_port}", f"localhost:{self.server_port}"}


def _write_launcher(url: str) -> Path:
    """Page de redirection que vous seul pouvez lire, à ouvrir dans le navigateur à la place de l'URL.

    Une URL passée en argument au navigateur est visible de tous les utilisateurs de la machine
    (`ps`, `/proc/<pid>/cmdline`) pendant toute sa durée de vie ; or le jeton donne la main sur Jarvis,
    approbations comprises. Même précaution que Jupyter."""
    path = jarvis_home() / "jarvis-open.html"
    path.parent.mkdir(parents=True, exist_ok=True)
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC | getattr(os, "O_NOFOLLOW", 0)
    target = html.escape(url, quote=True)
    with os.fdopen(os.open(path, flags, 0o600), "w", encoding="utf-8") as handle:
        handle.write(
            f'<!doctype html><meta charset="utf-8"><title>Jarvis</title>'
            f'<meta http-equiv="refresh" content="0;url={target}"><a href="{target}">Ouvrir Jarvis</a>'
        )
    os.chmod(path, 0o600)  # si le fichier existait déjà avec d'autres droits
    return path


def serve(port: int, jarvis_options: dict, resume: bool, open_browser: bool = True) -> None:
    token = secrets.token_urlsafe(24)
    server = JarvisServer(WebApp(token, jarvis_options, resume), port)
    url = f"http://127.0.0.1:{server.server_port}/#token={token}"
    print(f"Jarvis web : {url}")
    print("Gardez ce lien privé : il donne accès à Jarvis. Ctrl-C pour arrêter.")
    launcher = None
    if open_browser:
        try:
            launcher = _write_launcher(url)
            webbrowser.open(launcher.as_uri())
        except OSError as exc:
            print(f"Navigateur non ouvert ({exc.strerror or exc}) : utilisez le lien ci-dessus.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()
    finally:
        server.server_close()
        if launcher:
            launcher.unlink(missing_ok=True)
