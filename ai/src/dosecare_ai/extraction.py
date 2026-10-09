from .config import is_mock_mode
from .models import Extraction
from .openai_clients import get_openai_client
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
                                "Return only structured prescription information as JSON. "
                                "Never guess unreadable, blurry, cropped, or ambiguous text. "
                                "If the prescription is too blurry or unclear to reliably read, "
                                "mark the affected medicine as unclear=true. "
                                "If the whole prescription cannot be reliably read, return an empty "
                                "medicines list and explain the problem in warnings. "
                                "Preserve all readable information exactly. "
                                "Do not invent medicine names, doses, times, durations, or instructions."
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
        print(f"OPENAI ERROR: {type(exc).__name__}: {exc}")
        raise RuntimeError("Prescription extraction failed") from exc


def _parse_extraction_response(raw_text: str) -> dict:
    """Parse OpenAI's JSON response into prescription data."""

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid JSON response from AI") from exc

    extraction = Extraction.model_validate(data)
    result = extraction.model_dump()

    result = _validate_medicine_names(result)
    result = _validate_sanity_limits(result)

    return result

def _validate_medicine_names(extraction: dict) -> dict:
    """Validate medicine names and add warnings for suspicious names."""

    for medicine in extraction["medicines"]:
        name = medicine["name"].strip()

        if len(name) < 2:
            medicine["unclear"] = True
            extraction["warnings"].append(
                "Medicine name is unclear or too short"
            )

        if len(name) > 100:
            medicine["unclear"] = True
            extraction["warnings"].append(
                f"Medicine name is unusually long: {name}"
            )

    return extraction

def _validate_sanity_limits(extraction: dict) -> dict:
    """Check for unrealistic prescription values."""

    if len(extraction["medicines"]) > 20:
        extraction["warnings"].append(
            "Prescription contains an unusually large number of medicines"
        )

    for medicine in extraction["medicines"]:
        if medicine["days"] > 365:
            medicine["unclear"] = True
            extraction["warnings"].append(
                f"Duration for {medicine['name']} is unusually long"
            )

        if len(medicine["times"]) > 12:
            medicine["unclear"] = True
            extraction["warnings"].append(
                f"Too many daily times for {medicine['name']}"
            )

    return extraction