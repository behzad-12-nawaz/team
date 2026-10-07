# DoseCare AI

DoseCare AI is the AI package for the **DoseCare** project.

It provides AI-assisted features for:

* Prescription image extraction
* Medicine information extraction
* Audio transcription
* Medicine question answering
* Prescription validation and safety warnings
* Safe handling of unclear prescription information

The package is designed with a **mock mode** for development and testing and a **real AI mode** for production use when an OpenAI API key with available credits is configured.

---

## Features

### 1. Prescription Extraction

The package can process a prescription image and extract structured information such as:

* Medicine name
* Dose
* Times
* Number of days
* Instructions
* Unclear information
* Prescription warnings

Example output:

```python
{
    "medicines": [
        {
            "name": "Metformin",
            "dose": "500 mg",
            "times": ["08:00", "20:00"],
            "days": 30,
            "instructions": "after meals",
            "unclear": False
        }
    ],
    "warnings": []
}
```

The system is designed **not to guess** information that cannot be reliably read from a prescription.

---

### 2. Audio Transcription

The package can convert audio into text.

```python
text = transcribe(audio_bytes)
```

Mock mode returns a test transcription, while real mode uses an AI transcription service.

---

### 3. Medicine Question Answering

The package can answer general educational questions about medicines.

Example:

```python
answer = answer_medicine_question(
    "What is Metformin used for?",
    "Metformin"
)
```

The system provides general information and does not replace professional medical advice.

---

### 4. Medication Safety

The system is designed to avoid recommending unsafe medication changes.

For example, questions such as:

* "Can I stop taking this medicine?"
* "Should I increase my dose?"
* "Can I decrease my dose?"
* "Can I change my dose?"

are handled with a safety response recommending consultation with a doctor or pharmacist.

---

## Project Structure

```text
ai/
│
├── contract/
│
├── samples/
│   └── prescriptions/
│       ├── 1.jpeg
│       ├── 10.jpeg
│       ├── 100.jpeg
│       ├── 101.jpeg
│       ├── 102.jpeg
│       ├── 103.jpeg
│       ├── 104.jpeg
│       ├── 105.jpeg
│       ├── 106.jpeg
│       └── 107.jpeg
│
├── src/
│   └── dosecare_ai/
│       ├── __init__.py
│       ├── config.py
│       ├── extraction.py
│       ├── medicine_qa.py
│       ├── models.py
│       ├── openai_clients.py
│       ├── settings.py
│       ├── transcription.py
│       ├── cli.py
│       │
│       ├── test_config.py
│       ├── test_extraction.py
│       ├── test_medicine_qa.py
│       ├── test_models.py
│       ├── test_openai_clients.py
│       ├── test_settings.py
│       └── test_transcription.py
│
├── .env
├── .gitignore
├── PLAN.md
├── README.md
├── pyproject.toml
└── uv.lock
```

---

# Requirements

The project requires:

* Python 3.14+
* `uv`
* OpenAI API access for real AI mode
* Windows, Linux, or macOS

The project is currently developed and tested with:

```text
Python 3.14.8
uv 0.12.23
```

---

# Installation

Clone the repository:

```powershell
git clone https://github.com/behzad-12-nawaz/team.git
```

Move into the repository:

```powershell
cd team
```

Synchronize the AI project dependencies:

```powershell
uv sync --project .\ai
```

This installs the dependencies defined in the AI project's `pyproject.toml`.

---

# Dependencies

The AI package uses the following main libraries:

* OpenAI
* OpenAI Agents
* Pydantic
* HTTPX
* Pytest
* Python Dotenv

Dependencies are managed using `uv`.

---

# Environment Variables

Create a `.env` file inside the `ai` directory:

```text
ai/
└── .env
```

Add your OpenAI API key:

```env
OPENAI_API_KEY=your_api_key_here
```

Do **not** commit your real API key to Git.

The project `.gitignore` is configured to keep `.env` out of Git.

---

# Mock Mode

DoseCare AI includes a mock mode for development and testing.

Mock mode does **not** require OpenAI API credits.

Enable it in PowerShell:

```powershell
$env:AI_MODE="mock"
```

You can verify the environment variable with:

```powershell
$env:AI_MODE
```

Expected:

```text
mock
```

When mock mode is enabled:

* Prescription extraction returns controlled sample data.
* Audio transcription returns a mock transcription.
* Medicine Q&A returns a safe general-information response.
* No real OpenAI request is required.

Mock mode is recommended for local development and automated tests when API credits are unavailable.

---

# Public Python API

The package exposes three main public functions:

```python
from dosecare_ai import (
    extract_prescription,
    transcribe,
    answer_medicine_question,
)
```

---

## Prescription Extraction API

Function:

```python
extract_prescription(image_bytes: bytes) -> dict
```

Example:

```python
from dosecare_ai import extract_prescription

with open("prescription.jpeg", "rb") as file:
    image_bytes = file.read()

result = extract_prescription(image_bytes)

print(result)
```

The result contains:

```python
{
    "medicines": [...],
    "warnings": [...]
}
```

Each medicine can contain:

```python
{
    "name": "Metformin",
    "dose": "500 mg",
    "times": ["08:00", "20:00"],
    "days": 30,
    "instructions": "after meals",
    "unclear": False
}
```

---

# Prescription Validation

Prescription extraction uses structured validation.

The system validates:

* Medicine name
* Dose
* Times
* Duration
* Instructions
* Unclear fields

Time values must use the format:

```text
HH:MM
```

For example:

```text
08:00
14:30
20:00
```

The system also performs sanity checks for suspicious values such as:

* Extremely long medicine names
* Unusually long prescription durations
* Too many daily medication times
* An unusually large number of medicines

Warnings are returned instead of silently accepting suspicious information.

---

# Unclear Prescription Information

The system must not guess information that cannot be reliably read.

If information is unclear, the medicine can be marked:

```python
"unclear": True
```

and a warning can be added:

```python
"warnings": [
    "Dose of medicine is hard to read"
]
```

This is important because prescription information is medical information and should not be fabricated.

---

# Audio Transcription API

Function:

```python
transcribe(audio_bytes: bytes) -> str
```

Example:

```python
from dosecare_ai import transcribe

with open("audio.wav", "rb") as file:
    audio_bytes = file.read()

text = transcribe(audio_bytes)

print(text)
```

In mock mode, the function returns:

```text
This is a mock transcription.
```

In real mode, the audio is sent to the configured AI transcription service.

---

# Medicine Question Answering API

Function:

```python
answer_medicine_question(
    question: str,
    medicine: str
) -> str
```

Example:

```python
from dosecare_ai import answer_medicine_question

answer = answer_medicine_question(
    "What is Metformin used for?",
    "Metformin",
)

print(answer)
```

The function validates that both:

* Question
* Medicine name

are provided.

Empty values raise an error.

---

# Medication Safety Rules

DoseCare AI must not provide instructions to:

* Increase a medicine dose
* Decrease a medicine dose
* Change a medicine dose
* Stop taking a medicine
* Stop prescribed medication without professional guidance

For example:

```text
Can I stop taking Metformin?
```

produces a safety response similar to:

```text
I can't recommend changing or stopping Metformin without guidance from a doctor or pharmacist. Please follow your prescription and seek professional medical advice.
```

The purpose is to avoid turning the AI system into an unsafe medication-dosing tool.

---

# Command Line Interface

DoseCare AI includes a command-line interface.

The CLI can be executed with:

```powershell
uv run --project .\ai python -m dosecare_ai.cli
```

---

## CLI Help

Run:

```powershell
uv run --project .\ai python -m dosecare_ai.cli --help
```

This displays the available options.

---

# Prescription CLI

To process a prescription image:

```powershell
uv run --project .\ai python -m dosecare_ai.cli --prescription .\ai\samples\prescriptions\1.jpeg
```

Example mock output:

```text
{
    'medicines': [
        {
            'name': 'Metformin',
            'dose': '500 mg',
            'times': ['08:00', '20:00'],
            'days': 30,
            'instructions': 'after meals',
            'unclear': False
        }
    ],
    'warnings': [...]
}
```

---

# Audio CLI

To transcribe an audio file:

```powershell
uv run --project .\ai python -m dosecare_ai.cli --audio path\to\audio.wav
```

In mock mode, the output is:

```text
This is a mock transcription.
```

---

# Medicine Question CLI

To ask a medicine question:

```powershell
uv run --project .\ai python -m dosecare_ai.cli --question "What is Metformin used for?" --medicine "Metformin"
```

Example mock response:

```text
I can provide general information about Metformin, but this is not medical advice. Please follow your prescription and consult a doctor or pharmacist for personal medical guidance.
```

---

# Testing

The project uses `pytest`.

Run all tests for the AI package:

```powershell
uv run --project .\ai pytest .\ai\src\dosecare_ai
```

The current package test suite contains tests for:

* Configuration
* Prescription extraction
* Prescription validation
* Medicine question answering
* Pydantic models
* OpenAI client configuration
* Environment settings
* Audio transcription

Current status:

```text
32 passed
```

---

# Sample Prescription Dataset

The project contains 10 sample prescription images for development testing.

They are stored in:

```text
ai/samples/prescriptions/
```

Current sample files:

```text
1.jpeg
10.jpeg
100.jpeg
101.jpeg
102.jpeg
103.jpeg
104.jpeg
105.jpeg
106.jpeg
107.jpeg
```

The sample runner can process all available prescription images.

Run:

```powershell
uv run --project .\ai python .\ai\test_samples.py
```

In mock mode, each image is processed through the same controlled mock extraction response.

Mock processing verifies that:

* Images can be loaded
* Prescription extraction can be called
* Structured results are returned
* Warnings are preserved
* Medicine information follows the expected schema

Mock results should **not** be interpreted as real-world prescription recognition accuracy.

---

# Real AI Mode

When real AI access is available, remove mock mode from the current PowerShell session:

```powershell
Remove-Item Env:AI_MODE
```

Verify:

```powershell
$env:AI_MODE
```

If the variable is not set, the application uses real AI mode.

A valid OpenAI API key must be configured in:

```text
ai/.env
```

Example:

```env
OPENAI_API_KEY=your_api_key_here
```

Never place the real API key directly into source code.

---

# Real Prescription Extraction

In real mode, the prescription image is processed using an AI vision model.

The extraction prompt instructs the model to:

* Read the prescription carefully
* Return structured JSON
* Avoid guessing
* Mark unclear information
* Preserve readable information
* Return warnings when information cannot be reliably extracted

The returned JSON is then validated using the project's Pydantic models.

---

# Error Handling

The package validates invalid inputs.

For example, an empty prescription image:

```python
extract_prescription(b"")
```

raises:

```text
ValueError
```

An empty audio input:

```python
transcribe(b"")
```

raises:

```text
ValueError
```

An empty medicine question:

```python
answer_medicine_question("", "Metformin")
```

raises:

```text
ValueError
```

This prevents invalid input from silently entering the AI pipeline.

---

# Data Models

The package uses Pydantic models for structured prescription data.

## Medicine

A medicine contains:

```text
name
dose
times
days
instructions
unclear
```

## Extraction

An extraction contains:

```text
medicines
warnings
```

This provides a predictable structure for the rest of the DoseCare application.

---

# Safety Disclaimer

DoseCare AI is an AI-assisted software component and is **not a doctor, pharmacist, or medical professional**.

Information generated by the system should not be used as a replacement for professional medical advice.

Users should:

* Follow their prescribed instructions.
* Consult a doctor or pharmacist for personal medical decisions.
* Not change, increase, decrease, or stop medication based only on an AI response.
* Seek professional help when prescription information is unclear.

---

# Development Workflow

Recommended development workflow:

### 1. Enable mock mode

```powershell
$env:AI_MODE="mock"
```

### 2. Run package tests

```powershell
uv run --project .\ai pytest .\ai\src\dosecare_ai
```

### 3. Test prescription extraction

```powershell
uv run --project .\ai python -m dosecare_ai.cli --prescription .\ai\samples\prescriptions\1.jpeg
```

### 4. Test transcription

```powershell
uv run --project .\ai python -m dosecare_ai.cli --audio path\to\audio.wav
```

### 5. Test medicine Q&A

```powershell
uv run --project .\ai python -m dosecare_ai.cli --question "What is Metformin used for?" --medicine "Metformin"
```

### 6. Run the complete test suite again

```powershell
uv run --project .\ai pytest .\ai\src\dosecare_ai
```

---

# Git Safety

Never commit:

```text
.env
.venv/
__pycache__/
.pytest_cache/
```

The `.env` file may contain a private API key and must remain private.

If an API key is accidentally exposed publicly, revoke it and create a new key.

---

# Current Development Status

| Component                      | Status                         |
| ------------------------------ | ------------------------------ |
| Package structure              | Complete                       |
| Pydantic prescription schema   | Complete                       |
| Mock mode                      | Complete                       |
| Prescription extraction        | Implemented                    |
| Prescription validation        | Implemented                    |
| Sanity checks                  | Implemented                    |
| Unclear prescription handling  | Implemented                    |
| Audio transcription            | Implemented                    |
| Medicine Q&A                   | Implemented                    |
| Medication safety rules        | Implemented                    |
| CLI                            | Implemented                    |
| Sample prescription images     | Added                          |
| Automated tests                | Passing                        |
| README documentation           | Complete                       |
| Real OpenAI extraction testing | Requires available API credits |

---

# Important Note About Mock Mode

When:

```powershell
$env:AI_MODE="mock"
```

is enabled, the system does **not** perform real AI analysis of prescription images.

The returned prescription information is controlled test data.

Therefore, successful mock tests prove that:

* The package works correctly.
* The data structures are valid.
* The safety logic works.
* The CLI works.
* The tests pass.

They do **not** prove that the AI can accurately read real prescriptions.

Real prescription accuracy should be evaluated only when real AI access is available.

---

# License

This AI package is part of the DoseCare project.

Refer to the main repository for the project's licensing and contribution information.

---

# Summary

DoseCare AI provides the AI layer for the DoseCare project with three primary capabilities:

```text
Prescription Image
       ↓
extract_prescription()
       ↓
Structured Medicine Data
```

```text
Audio
  ↓
transcribe()
  ↓
Text
```

```text
Medicine + Question
        ↓
answer_medicine_question()
        ↓
Safe General Information
```

The package includes validation, safety handling, mock mode, CLI support, sample prescription images, and automated tests.
