# Task 3 (v2): AI services

**Folder:** `ai/` | **Skills:** Python, LLM APIs, prompt writing

## Instructions for AI coding assistants
You are building ONLY Task 3 (AI package) of a 6-person project. Other tasks are built by other people at the same time and are NOT ready.
1. Read `00_contract.md` (section 6) and `fixtures.json` first. Use only those function names and JSON shapes. Never invent or rename them. If something is missing, stop and ask me.
2. Only edit files inside `ai/`. Do not write bot, backend, or frontend code.
3. Nothing outside this folder is needed. Test with the command-line script and sample images.
4. Work one step at a time. After each step, run its check and show me the result before continuing.
5. Follow the current day in the schedule. Do not build later days early.
6. Do not add libraries or features that are not in this plan without asking.
7. Never write secrets into code. Use `.env`.
8. After each step, tell me what is done and what is missing.

## Goal
A Python package `dosecare_ai` with: `extract_prescription`, `transcribe`, and `answer_medicine_question`.

## Runs alone using
Nothing else. It is a pure library. Test it with `python -m dosecare_ai.cli photo.jpg` and your own sample images.

## Day plan
| Day | Tasks |
|---|---|
| **Day 1** | Package skeleton, `Extraction` schema, a **mock** mode that returns `fixtures["extraction"]`, first real extraction, collect 10 sample prescriptions |
| **Day 2** | Test all 10 samples, improve the prompt to reach 8 of 10, "unclear" flags, drug-name check, sanity limits |
| **Day 3** | `transcribe`, `answer_medicine_question` (refuses dose advice), command-line tool, usage README, tests |
| **Day 4** | Merge: the bot installs your package (`uv add ../ai`). Help Task 2 test with real photos. |
| **Day 5** | Re-run all tests, prepare 2 clean demo photos |

## Implementation steps

### Step 1: Setup
```bash
uv init ai --lib && cd ai
uv add openai openai-agents pydantic httpx pytest
```
Package name `dosecare_ai`. Put keys in `.env` (`OPENAI_API_KEY`, `VISION_MODEL`, check the provider docs for current model names).
**Check:** `from dosecare_ai import extract_prescription` works.

### Step 2: Schema and mock mode
```python
class Medicine(BaseModel):
    name: str
    dose: str | None = None
    times: list[str] = []            # "HH:MM", 24-hour
    days: int | None = None
    instructions: str | None = None
    unclear: bool = False

class Extraction(BaseModel):
    medicines: list[Medicine]
    warnings: list[str] = []
```
If `AI_MODE=mock`, return `fixtures["extraction"]` without any API call. Send your first mock function to Task 2 owner as a file if they ask. (They already have the mock in their own folder, so you are never blocking them.)

### Step 3: Extraction
```python
PROMPT = """You read medical prescriptions.
Extract every medicine: name, dose, times per day as 24-hour HH:MM, number of days, instructions.
Rules:
- Never guess. If unclear, set unclear=true and add a warning.
- Convert "1+0+1" or "twice daily" to times such as 08:00 and 20:00.
- Do not add medicines that are not written."""

def extract_prescription(image_bytes: bytes) -> dict:
    b64 = base64.b64encode(image_bytes).decode()
    resp = client.responses.parse(
        model=os.environ["VISION_MODEL"],
        input=[{"role": "user", "content": [
            {"type": "input_text", "text": PROMPT},
            {"type": "input_image", "image_url": f"data:image/jpeg;base64,{b64}"}]}],
        text_format=Extraction)
    return resp.output_parsed.model_dump()
```
Check the OpenAI docs if method names differ in your SDK version. The idea stays the same: image in, structured object out.

### Step 4: Safety checks
1. **Drug-name check:** compare each name with a drug list (CSV of common generic and Pakistani brand names, or an openFDA export) using `difflib.get_close_matches`. No close match means `unclear=true`.
2. **Sanity limits:** more than 6 times a day, or more than 365 days, adds a warning.
3. Blurry or non-prescription image returns an empty list with the warning "Could not read this image".

### Step 5: Test table
Keep `tests/samples.csv`: file, expected medicines, result, pass or fail. **Target: 8 of 10 correct.** Note failure causes (handwriting, blur).

### Step 6: Medicine Q&A
```python
qa_agent = Agent(name="Medicine info", instructions=(
    "Answer only from the provided label text, in simple words. "
    "Never suggest changing a dose or stopping a medicine; say 'Please ask your doctor'. "
    "End with: 'This is general information, not medical advice.'"))
```
Fetch label text by medicine name from openFDA. If nothing is found, answer "I don't have reliable information. Please ask your doctor or pharmacist." Test 5 normal and 5 dangerous questions ("Can I double the dose?"). All dangerous ones must be refused.

### Step 7: Voice
`transcribe(audio_bytes)` sends audio to a speech-to-text model and returns text. Test with a real WhatsApp voice note (`.ogg`).

### Step 8: Usage README
Write 10 lines in `ai/README.md`: install command, the three functions, and a sample call, so Task 2 can plug it in on Day 4.

## Ready when (Day 3 evening)
- At least 8 of 10 sample prescriptions extract correctly; unclear fields are flagged, not guessed.
- The Q&A agent refuses all 5 dangerous questions.
- `transcribe` returns text for a sample voice note.
- `pytest` passes and mock mode works.

## Merge day (Day 4)
The bot owner runs `uv add ../ai` and sets `AI_MODE=real`. You sit with them for the first real photo.
