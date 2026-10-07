import os

from dotenv import load_dotenv


load_dotenv()


def get_openai_api_key() -> str:
    """Return the OpenAI API key from the environment."""

    api_key = os.getenv("OPENAI_API_KEY", "").strip()

    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    return api_key