"""Boucle de conversation de Jarvis : Claude + outils locaux."""

from typing import Callable

import anthropic

from . import tools

MODEL = "claude-opus-5-5"
MAX_TOKENS = 16000
MAX_TOOL_ROUNDS = 10

SYSTEM_PROMPT = """\
Tu es Jarvis, l'assistant personnel de Moussa. Tu réponds en français, de façon \
claire, directe et chaleureuse, avec une pointe d'humour discrète.

Tu disposes d'outils : date et heure, calculatrice, notes. Utilise-les plutôt que \
de deviner — tu ne connais ni la date du jour ni l'heure. Quand on te demande de \
retenir quelque chose, enregistre une note. Réponds brièvement, sauf si on te \
demande des détails."""


class JarvisRefusal(Exception):
    """Claude a refusé de répondre (`stop_reason: refusal`)."""


class JarvisTruncated(Exception):
    """La réponse a été coupée en plein appel d'outil."""


class JarvisLoopLimit(Exception):
    """Trop d'allers-retours d'outils pour un seul message."""


class Jarvis:
    def __init__(
        self,
        client: anthropic.Anthropic | None = None,
        on_text: Callable[[str], None] = lambda text: None,
        on_tool: Callable[[str, dict], None] = lambda name, tool_input: None,
    ):
        self.client = client or anthropic.Anthropic()
        self.on_text = on_text
        self.on_tool = on_tool
        self.messages: list[dict] = []

    def reset(self) -> None:
        self.messages.clear()

    def ask(self, user_message: str) -> None:
        """Traite un message ; la réponse est diffusée via `on_text`.

        Si le tour échoue (erreur API, refus, réponse tronquée), l'historique est
        ramené à son état d'avant pour rester valide.
        """
        checkpoint = len(self.messages)
        self.messages.append({"role": "user", "content": user_message})
        try:
            self._run_turn()
        except BaseException:
            del self.messages[checkpoint:]
            raise

    def _run_turn(self) -> None:
        for _ in range(MAX_TOOL_ROUNDS):
            with self.client.messages.stream(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                tools=tools.TOOLS,
                messages=self.messages,
                output_config={"effort": "medium"},
                cache_control={"type": "ephemeral"},
            ) as stream:
                for text in stream.text_stream:
                    self.on_text(text)
                response = stream.get_final_message()

            if response.stop_reason == "refusal":
                raise JarvisRefusal()

            tool_uses = [b for b in response.content if b.type == "tool_use"]
            if response.stop_reason == "max_tokens" and tool_uses:
                raise JarvisTruncated()

            # Le contenu (blocs de réflexion compris) doit être renvoyé tel quel.
            self.messages.append({"role": "assistant", "content": response.content})
            if response.stop_reason == "max_tokens":
                self.on_text("\n[réponse tronquée]")
            if response.stop_reason != "tool_use":
                return

            results = []
            for block in tool_uses:
                self.on_tool(block.name, block.input)
                text, is_error = tools.execute(block.name, block.input)
                result = {"type": "tool_result", "tool_use_id": block.id, "content": text}
                if is_error:
                    result["is_error"] = True
                results.append(result)
            self.messages.append({"role": "user", "content": results})

        raise JarvisLoopLimit()

