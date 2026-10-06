import logging
from app.config import settings

logger = logging.getLogger(__name__)


class ConsoleNotifier:
    def send(self, phone: str, text: str, buttons: list | None = None, template: str | None = None):
        try:
            with open("outbox.log", "a") as f:
                f.write(f"{phone} | {text} | {buttons}\n")
        except Exception as e:
            logger.error("ConsoleNotifier failed: %s", e)


class HttpNotifier:
    def send(self, phone: str, text: str, buttons: list | None = None, template: str | None = None):
        try:
            import httpx
            headers = {}
            if settings.BOT_SERVICE_TOKEN:
                headers["Authorization"] = f"Bearer {settings.BOT_SERVICE_TOKEN}"
            httpx.post(
                f"{settings.BOT_URL}/send",
                json={
                    "phone": phone,
                    "text": text,
                    "buttons": buttons,
                    "template": template,
                },
                headers=headers,
                timeout=10,
            )
        except Exception as e:
            logger.error("HttpNotifier failed: %s", e)


notifier = ConsoleNotifier() if settings.NOTIFIER == "console" else HttpNotifier()
