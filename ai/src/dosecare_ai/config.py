import os


def is_mock_mode() -> bool:
    """Return True when AI_MODE is set to mock."""
    return os.getenv("AI_MODE", "").lower() == "mock"