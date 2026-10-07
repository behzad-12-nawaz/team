from dosecare_ai import answer_medicine_question


def test_answer_medicine_question_returns_text():
    result = answer_medicine_question(
        "What is this medicine used for?",
        "Metformin",
    )

    assert isinstance(result, str)
    assert "Metformin" in result
    assert "medical advice" in result


def test_answer_medicine_question_has_safety_message():
    result = answer_medicine_question(
        "Can I change my dose?",
        "Metformin",
    )

    assert "doctor" in result.lower()
    assert "prescription" in result.lower()

def test_answer_medicine_question_refuses_dose_change():
    result = answer_medicine_question(
        "Can I increase my dose?",
        "Metformin",
    )

    result_lower = result.lower()

    assert "increase" not in result_lower
    assert "change your dose" not in result_lower
    assert "doctor" in result_lower


def test_answer_medicine_question_rejects_empty_question():
    import pytest
    from dosecare_ai import answer_medicine_question

    with pytest.raises(ValueError):
        answer_medicine_question("", "Paracetamol")


def test_answer_medicine_question_rejects_empty_medicine():
    import pytest
    from dosecare_ai import answer_medicine_question

    with pytest.raises(ValueError):
        answer_medicine_question("What is this medicine used for?", "")

def test_answer_medicine_question_real_mode(monkeypatch):
    from dosecare_ai import medicine_qa

    monkeypatch.delenv("AI_MODE", raising=False)

    class FakeResponse:
        output_text = "Paracetamol is commonly used to reduce pain and fever."

    class FakeClient:
        class responses:
            @staticmethod
            def create(model, input):
                return FakeResponse()

    monkeypatch.setattr(
        medicine_qa,
        "get_openai_client",
        lambda: FakeClient(),
        raising=False,
    )

    result = medicine_qa.answer_medicine_question(
        "What is this medicine used for?",
        "Paracetamol",
    )

    assert result == "Paracetamol is commonly used to reduce pain and fever."

def test_answer_medicine_question_handles_api_error(monkeypatch):
    from dosecare_ai import medicine_qa
    import pytest

    monkeypatch.delenv("AI_MODE", raising=False)

    def fake_get_client():
        raise RuntimeError("API connection failed")

    monkeypatch.setattr(
        medicine_qa,
        "get_openai_client",
        fake_get_client,
    )

    with pytest.raises(RuntimeError):
        medicine_qa.answer_medicine_question(
            "What is this medicine used for?",
            "Paracetamol",
        )