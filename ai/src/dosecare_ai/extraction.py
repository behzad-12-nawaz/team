from .config import is_mock_mode
from .models import Extraction
import json
import base64

def extract_prescription(image_bytes: bytes) -> dict:
    """Extract prescription information from an image."""

    if not image_bytes:
        raise ValueError("image_bytes cannot be empty")

    if is_mock_mode():
        data = {
            "medicines": [
                {
                    "name": "Metformin",
                    "dose": "500 mg",
                    "times": ["08:00", "20:00"],
                    "days": 30,
                    "instructions": "after meals",
                    "unclear": False,
                },
                {
                    "name": "Amlodipine",
                    "dose": "5 mg",
                    "times": ["09:00"],
                    "days": 30,
                    "instructions": None,
                    "unclear": True,
                },
            ],
            "warnings": [
                "Dose of Amlodipine is hard to read"
            ],
        }

        extraction = Extraction.model_validate(data)
        return extraction.model_dump()

    return _parse_extraction_response(
        _extract_with_openai(image_bytes)["raw_response"]
)


def _extract_with_openai(image_bytes: bytes) -> dict:
    """Extract prescription data using OpenAI vision."""
    from .openai_clients import get_openai_client

    try:
        client = get_openai_client()

        response = client.responses.create(
            model="gpt-4.1-mini",
            text={
                "format": {
                    "type": "json_object"
                }
            },
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                "Read this prescription image carefully. "
                                "Return only structured prescription information. "
                                "Never guess unreadable text. "
                                "Mark unclear medicine information as unclear=true "
                                "and explain it in warnings."
                            ),
                        },
                        {
                            "type": "input_image",
                            "image_url": (
                                "data:image/jpeg;base64,"
                                + base64.b64encode(image_bytes).decode()
                            ),
                        },
                    ],
                }
            ],
        )

        return {"raw_response": response.output_text}

    except Exception as exc:
        raise RuntimeError(
            "Prescription extraction failed. Please try again."
        ) from exc


def _parse_extraction_response(raw_text: str) -> dict:
    """Parse OpenAI's JSON response into prescription data."""

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid JSON response from AI") from exc

    extraction = Extraction.model_validate(data)
    return extraction.model_dump()