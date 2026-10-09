from openai import OpenAI

from .settings import get_openai_api_key


def get_openai_client() -> OpenAI:
    """Create and return an OpenAI client."""
    return OpenAI(api_key=get_openai_api_key())