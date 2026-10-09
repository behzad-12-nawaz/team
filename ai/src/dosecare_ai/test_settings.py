import pytest

from dosecare_ai.settings import get_openai_api_key


def test_get_openai_api_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    assert get_openai_api_key() == "test-key"


def test_get_openai_api_key_raises_when_missing(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(RuntimeError, match="OPENAI_API_KEY is not configured"):
        get_openai_api_key()