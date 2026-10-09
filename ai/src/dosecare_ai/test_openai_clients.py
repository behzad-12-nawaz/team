from dosecare_ai.openai_clients import get_openai_client


def test_get_openai_client(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    client = get_openai_client()

    assert client is not None