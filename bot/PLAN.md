# Task 2 (v2): WhatsApp bot

**Folder:** `bot/` | **Skills:** Python, webhooks, APIs

## Instructions for AI coding assistants
You are building ONLY Task 2 (WhatsApp bot) of a 6-person project. Other tasks are built by other people at the same time and are NOT ready.
1. Read `00_contract.md` and `fixtures.json` first. Use only those endpoint names, fields, button IDs, and statuses. Never invent or rename them. If something is missing, stop and ask me.
2. Only edit files inside `bot/`. Do not write backend, AI, or frontend code.
3. For the backend, use `tests/fake_backend.py`. For AI, use `AI_MODE=mock`. Mark them `# MOCK: replace on merge day`.
4. Work one step at a time. After each step, run its check and show me the result before continuing.
5. Follow the current day in the schedule. Do not build later days early.
6. Do not add libraries or features that are not in this plan without asking.
7. Never write secrets into code. Use `.env`.
8. After each step, tell me what is done, what is mocked, and what is missing.

## Goal
Receive WhatsApp messages, run the prescription photo flow, send reminders with **Taken / Skip / Snooze** buttons, and handle doctor consent and change confirmations.

## Runs alone using
- `tests/fake_backend.py`: a tiny FastAPI app that implements the contract using `fixtures.json` (run on port 8000).
- `AI_MODE=mock`: `extract_prescription` returns `fixtures["extraction"]`.
- A real Meta test number (or Telegram), so you can test on a phone from Day 1.

## WhatsApp rules (read first)
- Reply buttons: **max 3 per message, title max 20 characters**.
- Button messages work only **within 24 hours after the user last messaged you**. Reminders usually fall outside this, so they need an **approved template with 3 quick-reply buttons**. **Submit the template on Day 1.**
- Button IDs follow the contract: `taken:<dose_id>`, `confirm:<prescription_id>`, `allow:<link_id>`, and so on.
- Plan B: Telegram bot with inline keyboard buttons (free, no approval).

## Day plan
| Day | Tasks |
|---|---|
| **Day 1** | Meta app and test number, ngrok, webhook (verify and receive), `send_message`, submit the reminder template, `fake_backend.py` |
| **Day 2** | Photo flow with mock AI: download image, summary with Confirm and Edit buttons, call create and confirm endpoints. Button handlers for taken, skip, snooze. |
| **Day 3** | `POST /send` endpoint (contract), consent buttons (`allow`/`deny`), doctor-change confirm and reject, "Invite code" and "Change doctor" commands, friendly messages and Urdu text |
| **Day 4** | Merge: install the `ai/` package, set `AI_MODE=real`, point `API_URL` to the real backend |
| **Day 5** | Bug fixes and phone testing only |

## Implementation steps

### Step 1: Meta setup
Create a developer app, add WhatsApp, copy the test number ID and token to `.env`:
```
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_ID=...
VERIFY_TOKEN=any-secret
API_URL=http://localhost:8000
AI_MODE=mock
```
Run `ngrok http 8001` and use the HTTPS URL as the webhook. Add up to 5 team phones as test recipients.

### Step 2: Webhook
```python
@app.get("/webhook")
def verify(request: Request):
    q = request.query_params
    if q.get("hub.verify_token") == settings.VERIFY_TOKEN:
        return PlainTextResponse(q.get("hub.challenge"))
    raise HTTPException(403)

@app.post("/webhook")
async def receive(payload: dict):
    value = payload["entry"][0]["changes"][0]["value"]
    for msg in value.get("messages", []):
        await route_message(msg)
    return {"status": "ok"}
```
**Check:** sending "hi" from your phone prints the payload in the terminal.

### Step 3: Send function
```python
async def send_message(phone, text, buttons=None):
    body = {"messaging_product": "whatsapp", "to": phone}
    if buttons:   # [{"id","title"}], max 3
        body.update(type="interactive", interactive={
            "type": "button", "body": {"text": text},
            "action": {"buttons": [{"type": "reply", "reply": b} for b in buttons]}})
    else:
        body.update(type="text", text={"body": text})
    async with httpx.AsyncClient() as c:
        await c.post(f"https://graph.facebook.com/v21.0/{settings.WHATSAPP_PHONE_ID}/messages",
                     headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"}, json=body)
```
Check the current Graph API version in the Meta docs. **Check:** your phone receives three buttons.

### Step 4: Router
```python
async def route_message(msg):
    phone = msg["from"]
    t = msg["type"]
    if t == "image":        await handle_photo(phone, msg["image"]["id"])
    elif t == "interactive":
        action, ref = msg["interactive"]["button_reply"]["id"].split(":")
        await handle_button(phone, action, int(ref))
    elif t == "audio":      await handle_voice(phone, msg["audio"]["id"])   # stretch
    elif t == "text":       await handle_text(phone, msg["text"]["body"])
```

### Step 5: Photo flow
1. Download the image from the media ID.
2. `extract_prescription(image)` (mock or real, chosen by `AI_MODE`).
3. `POST {API_URL}/prescriptions` with `prescribed_by: null`.
4. Send a summary with buttons `confirm:<id>` and `reject:<id>` (use the title "Edit" for reject, and ask for a clearer photo).
5. If `warnings` exist, include them ("Please check the dose of Amlodipine").
6. On `confirm`, call `POST /prescriptions/{id}/confirm` and say "Done! I will remind you at your dose times."

### Step 6: Dose buttons
`taken`, `skip`, `snooze` call `POST /doses/{id}/reply`. Replies: "Marked as taken. Well done!", "Skipped.", "Snoozed for 15 minutes." If the backend returns 422 for a second snooze, say "Snooze already used for this dose."

### Step 7: `/send` endpoint (called by the backend)
```python
@app.post("/send")
async def send(req: SendRequest):
    if req.template:
        await send_template(req.phone, req.template, req)   # approved reminder template
    else:
        await send_message(req.phone, req.text, req.buttons)
    return {"sent": True}
```
Match the shape in the contract exactly. **Check:** `curl` with `fixtures["bot_send_request"]` delivers a message with buttons to your phone.

### Step 8: Doctor flow
- Doctor link request: send "Dr. X wants to view your medicine plan" with `allow:<link_id>` and `deny:<link_id>`; call `POST /doctor-links/{id}/consent`.
- Doctor change: send the new plan with `confirm` and `reject`.
- Text `Invite code` returns the code from `GET /patients/{id}/invite-code`.

### Step 9: Stretch (only if ahead)
Voice-note replies using `transcribe`; Telegram fallback.

## Ready when (Day 3 evening)
Against `fake_backend.py` and mock AI: photo, summary, Confirm works; a message sent to `/send` arrives with three buttons; tapping each button calls the right endpoint.

## Merge day (Day 4)
1. Install the AI package from `../ai` and set `AI_MODE=real`.
2. Set `API_URL` to the deployed backend and `BOT_SERVICE_TOKEN`.
3. Give Task 1 your deployed `BOT_URL`.
4. Set the Meta webhook to the deployed URL.
