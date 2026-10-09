from dosecare_ai import transcribe


def test_transcribe_returns_text():
    result = transcribe(b"fake-audio")

    assert isinstance(result, str)
    assert result == "This is a mock transcription."


def test_transcribe_rejects_empty_audio():
    import pytest
    from dosecare_ai import transcribe

    with pytest.raises(ValueError):
        transcribe(b"")


def test_transcribe_real_mode(monkeypatch):
    from dosecare_ai import transcription

    monkeypatch.delenv("AI_MODE", raising=False)

    class FakeResponse:
        text = "Take one tablet after breakfast."

    class FakeAudio:
        def transcriptions(self):
            return None

    class FakeClient:
        class audio:
            @staticmethod
            def transcriptions():
                return None

    def fake_get_client():
        class Client:
            class audio:
                class transcriptions:
                    @staticmethod
                    def create(model, file):
                        return FakeResponse()

        return Client()

    monkeypatch.setattr(
        transcription,
        "get_openai_client",
        fake_get_client,
    )

    result = transcription.transcribe(b"fake-audio")

    assert result == "Take one tablet after breakfast."

def test_transcribe_handles_api_error(monkeypatch):
    from dosecare_ai import transcription
    import pytest

    monkeypatch.delenv("AI_MODE", raising=False)

    def fake_get_client():
        raise RuntimeError("API connection failed")

    monkeypatch.setattr(
        transcription,
        "get_openai_client",
        fake_get_client,
    )

    with pytest.raises(RuntimeError):
        transcription.transcribe(b"fake-audio")