from .config import is_mock_mode
from .openai_clients import get_openai_client


def answer_medicine_question(question: str, medicine: str) -> str:
    """Answer medicine questions safely."""

    if not question.strip():
        raise ValueError("question cannot be empty")

    if not medicine.strip():
        raise ValueError("medicine cannot be empty")

    question_lower = question.lower()

    unsafe_phrases = [
        "increase my dose",
        "decrease my dose",
        "change my dose",
        "change the dose",
        "stop taking",
        "stop my medicine",
        "can i stop",
        "should i stop",
    ]

    if any(phrase in question_lower for phrase in unsafe_phrases):
        return (
            f"I can't recommend changing or stopping {medicine} "
            "without guidance from a doctor or pharmacist. "
            "Please follow your prescription and seek professional "
            "medical advice."
        )

    if is_mock_mode():
        return (
            f"I can provide general information about {medicine}, "
            "but this is not medical advice. "
            "Please follow your prescription and consult a doctor or pharmacist "
            "for personal medical guidance."
        )

    return _answer_with_openai(question, medicine)


def _answer_with_openai(question: str, medicine: str) -> str:
    """Answer a medicine question using OpenAI."""


    client = get_openai_client()

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=(
            f"Medicine: {medicine}\n"
            f"Question: {question}\n\n"
            "Provide general educational information only. "
            "Do not recommend changing, increasing, decreasing, or stopping "
            "a medicine or its dose. Encourage the user to consult a doctor "
            "or pharmacist for personal medical advice."
        ),
    )

    return response.output_text