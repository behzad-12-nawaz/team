def hello() -> str:
    return "Hello from ai!"
from .models import Medicine, Extraction
from .extraction import extract_prescription
from .transcription import transcribe
from .medicine_qa import answer_medicine_question

__all__ = [
    "Medicine",
    "Extraction",
    "extract_prescription",
    "transcribe",
    "answer_medicine_question",
]
