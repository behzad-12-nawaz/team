from dosecare_ai.config import is_mock_mode


def test_mock_mode_is_enabled(monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")

    assert is_mock_mode() is True


def test_mock_mode_is_disabled(monkeypatch):
    monkeypatch.setenv("AI_MODE", "real")

    assert is_mock_mode() is False