class ToolError(Exception):
    """Erreur lisible renvoyée à Claude avec `is_error: true`."""


class JarvisRefusal(Exception):
    """Claude a refusé de répondre (`stop_reason: refusal`)."""


class JarvisTruncated(Exception):
    """La réponse a été coupée en plein appel d'outil."""


class JarvisLoopLimit(Exception):
    """Trop d'allers-retours d'outils pour un seul message."""
