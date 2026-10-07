from .config import is_mock_mode
from .openai_clients import get_openai_client


def transcribe(audio_bytes: bytes) -> str:
    """Convert audio bytes into text."""

    if not audio_bytes:
        raise ValueError("audio_bytes cannot be empty")

    if is_mock_mode():
        return "This is a mock transcription."

    return _transcribe_with_openai(audio_bytes)


def _transcribe_with_openai(audio_bytes: bytes) -> str:
    """Transcribe audio using OpenAI."""

    client = get_openai_client()

    response = client.audio.transcriptions.create(
        model="gpt-4o-mini-transcribe",
        file=("audio.wav", audio_bytes, "audio/wav"),
    )

    return response.text