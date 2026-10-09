from dosecare_ai import extract_prescription, extraction
from dosecare_ai.extraction import _extract_with_openai, _parse_extraction_response
import pytest

def test_extract_prescription_returns_valid_structure():
    result = extract_prescription(b"fake-image")

    assert "medicines" in result
    assert "warnings" in result
    assert isinstance(result["medicines"], list)
    assert isinstance(result["warnings"], list)


def test_extract_prescription_returns_expected_medicine():
    result = extract_prescription(b"fake-image")

    assert result["medicines"][0]["name"] == "Metformin"
    assert result["medicines"][0]["dose"] == "500 mg"
    assert result["medicines"][0]["times"] == ["08:00", "20:00"]
    assert result["medicines"][0]["days"] == 30
    assert result["medicines"][0]["unclear"] is False


def test_extract_prescription_keeps_unclear_warning():
    result = extract_prescription(b"fake-image")

    assert result["medicines"][1]["name"] == "Amlodipine"
    assert result["medicines"][1]["unclear"] is True
    assert "Amlodipine" in result["warnings"][0]

def test_extract_prescription_rejects_empty_image():

    with pytest.raises(ValueError, match="image_bytes cannot be empty"):
        extract_prescription(b"")


def test_real_extraction_helper_exists():

    assert callable(_extract_with_openai)

def test_parse_extraction_response():

    raw_json = """
    {
        "medicines": [
            {
                "name": "Metformin",
                "dose": "500 mg",
                "times": ["08:00", "20:00"],
                "days": 30,
                "instructions": "after meals",
                "unclear": false
            }
        ],
        "warnings": []
    }
    """

    result = _parse_extraction_response(raw_json)

    assert result["medicines"][0]["name"] == "Metformin"
    assert result["medicines"][0]["dose"] == "500 mg"
    assert result["medicines"][0]["unclear"] is False


def test_extract_prescription_real_mode(monkeypatch):

    monkeypatch.delenv("AI_MODE", raising=False)

    fake_response = {
        "raw_response": """
        {
            "medicines": [
                {
                    "name": "Paracetamol",
                    "dose": "500 mg",
                    "times": ["09:00"],
                    "days": 5,
                    "instructions": "after food",
                    "unclear": false
                }
            ],
            "warnings": []
        }
        """
    }

    monkeypatch.setattr(
        extraction,
        "_extract_with_openai",
        lambda image_bytes: fake_response,
    )

    result = extraction.extract_prescription(b"fake-image")

    assert result["medicines"][0]["name"] == "Paracetamol"
    assert result["medicines"][0]["dose"] == "500 mg"
    assert result["medicines"][0]["days"] == 5


def test_parse_extraction_response_rejects_invalid_json():
    import pytest
    from dosecare_ai.extraction import _parse_extraction_response

    with pytest.raises(ValueError):
        _parse_extraction_response("this is not valid json")

def test_extract_with_openai_handles_api_error(monkeypatch):
    from dosecare_ai import extraction

    def fake_client():
        raise RuntimeError("API connection failed")

    monkeypatch.setattr(
        extraction,
        "get_openai_client",
        fake_client,
        raising=False,
    )

    import pytest

    with pytest.raises(RuntimeError, match="Prescription extraction failed"):
        extraction._extract_with_openai(b"fake image")



def test_parse_extraction_response_rejects_empty_medicine_name():
    from dosecare_ai.extraction import _parse_extraction_response
    import pytest

    bad_response = """
    {
        "medicines": [
            {
                "name": "",
                "dose": "500 mg",
                "times": ["09:00"],
                "days": 5,
                "instructions": "after food",
                "unclear": false
            }
        ],
        "warnings": []
    }
    """

    with pytest.raises(ValueError):
        _parse_extraction_response(bad_response)


def test_parse_extraction_response_rejects_empty_dose():
    from dosecare_ai.extraction import _parse_extraction_response
    import pytest

    bad_response = """
    {
        "medicines": [
            {
                "name": "Paracetamol",
                "dose": "",
                "times": ["09:00"],
                "days": 5,
                "instructions": "after food",
                "unclear": false
            }
        ],
        "warnings": []
    }
    """

    with pytest.raises(ValueError):
        _parse_extraction_response(bad_response)


def test_parse_extraction_response_rejects_invalid_time():
    from dosecare_ai.extraction import _parse_extraction_response
    import pytest

    bad_response = """
    {
        "medicines": [
            {
                "name": "Paracetamol",
                "dose": "500 mg",
                "times": ["25:00"],
                "days": 5,
                "instructions": "after food",
                "unclear": false
            }
        ],
        "warnings": []
    }
    """

    with pytest.raises(ValueError):
        _parse_extraction_response(bad_response)

def test_parse_extraction_response_rejects_zero_days():
    import pytest

    bad_response = """
    {
        "medicines": [
            {
                "name": "Paracetamol",
                "dose": "500 mg",
                "times": ["09:00"],
                "days": 0,
                "instructions": "after food",
                "unclear": false
            }
        ],
        "warnings": []
    }
    """

    with pytest.raises(ValueError):
        _parse_extraction_response(bad_response)


def test_parse_extraction_response_rejects_empty_times():
    from dosecare_ai.extraction import _parse_extraction_response
    import pytest

    bad_response = """
    {
        "medicines": [
            {
                "name": "Paracetamol",
                "dose": "500 mg",
                "times": [],
                "days": 5,
                "instructions": "after food",
                "unclear": false
            }
        ],
        "warnings": []
    }
    """

    with pytest.raises(ValueError):
        _parse_extraction_response(bad_response)