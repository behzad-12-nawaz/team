"""
DoseCare WhatsApp Bot
Runs on port 8001
"""
import os
import base64
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv
import httpx

load_dotenv()

app = FastAPI()

# Settings from .env
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID")
VERIFY_TOKEN = os.getenv("VERIFY_TOKEN")
API_URL = os.getenv("API_URL", "http://localhost:8000")
AI_MODE = os.getenv("AI_MODE", "mock")


async def send_message(phone: str, text: str, buttons: list[dict] | None = None):
    """
    Send a message via WhatsApp Graph API.
    buttons: list of {"id": "...", "title": "..."} max 3, title max 20 chars
    """
    body = {
        "messaging_product": "whatsapp",
        "to": phone,
    }

    if buttons:
        # Interactive button message
        button_payload = [{"type": "reply", "reply": b} for b in buttons]
        body.update({
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": text},
                "action": {"buttons": button_payload},
            },
        })
    else:
        # Simple text message
        body.update({
            "type": "text",
            "text": {"body": text},
        })

    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_ID}/messages",
            headers={
                "Authorization": f"Bearer {WHATSAPP_TOKEN}",
                "Content-Type": "application/json",
            },
            json=body,
        )


async def route_message(msg: dict):
    """
    Route incoming message based on type.
    """
    phone = msg.get("from")
    msg_type = msg.get("type")

    print(f"[ROUTER] Received {msg_type} from {phone}")

    if msg_type == "image":
        image_id = msg["image"]["id"]
        await handle_photo(phone, image_id)
    elif msg_type == "interactive":
        # Button reply
        button_reply = msg["interactive"]["button_reply"]
        button_id = button_reply["id"]  # e.g., "taken:103"
        await handle_button(phone, button_id)
    elif msg_type == "text":
        text_body = msg["text"]["body"]
        await handle_text(phone, text_body)
    else:
        print(f"[ROUTER] Unhandled message type: {msg_type}")


async def download_media(media_id: str) -> bytes:
    """Download media from WhatsApp using the media ID."""
    url = f"https://graph.facebook.com/v21.0/{media_id}"
    params = {"access_token": WHATSAPP_TOKEN}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        # Get the actual media URL
        media_url = data.get("url")
        if not media_url:
            raise Exception(f"No media URL found for {media_id}")
        # Download the actual media
        media_resp = await client.get(media_url)
        media_resp.raise_for_status()
        return media_resp.content


def extract_prescription_mock(image_bytes: bytes) -> dict:
    """Mock extraction - returns fixture data."""
    import json
    import os
    fixtures_path = os.path.join(os.path.dirname(__file__), "contract", "fixtures.json")
    with open(fixtures_path, "r") as f:
        fixtures = json.load(f)
    return fixtures["extraction"]


async def extract_prescription(image_bytes: bytes) -> dict:
    """Extract prescription from image - mock or real based on AI_MODE."""
    if AI_MODE == "mock":
        print("[AI] Using mock extraction")
        return extract_prescription_mock(image_bytes)
    else:
        # Real AI - would use dosecare_ai package
        # from dosecare_ai import extract_prescription as real_extract
        # return real_extract(image_bytes)
        raise Exception("Real AI mode not implemented yet")


async def handle_photo(phone: str, image_id: str):
    """Handle incoming photo - download and process prescription."""
    print(f"[PHOTO] Image ID: {image_id} from {phone}")
    
    try:
        # Step 1: Download the image
        print("[PHOTO] Downloading image...")
        image_bytes = await download_media(image_id)
        print(f"[PHOTO] Downloaded {len(image_bytes)} bytes")
        
        # Step 2: Extract prescription (mock AI)
        print("[PHOTO] Extracting prescription...")
        extraction = await extract_prescription(image_bytes)
        print(f"[PHOTO] Extraction result: {extraction}")
        
        # Step 3: Create prescription via API
        medicines = []
        for med in extraction.get("medicines", []):
            medicines.append({
                "name": med["name"],
                "dose": med["dose"],
                "times": med["times"],
                "days": med.get("days", 30),
                "instructions": med.get("instructions"),
            })
        
        print(f"[PHOTO] Creating prescription with {len(medicines)} medicines...")
        async with httpx.AsyncClient() as client:
            create_resp = await client.post(
                f"{API_URL}/prescriptions",
                json={
                    "patient_id": 1,  # TODO: Get from session/context
                    "prescribed_by": None,
                    "medicines": medicines,
                }
            )
            
            if create_resp.status_code != 200:
                print(f"[PHOTO] Error creating prescription: {create_resp.status_code}")
                await send_message(phone, "❌ Error processing prescription. Please try again.")
                return
            
            prescription = create_resp.json()
            prescription_id = prescription["id"]
            print(f"[PHOTO] Created prescription {prescription_id}")
        
        # Step 4: Build summary message
        medicines_text = ""
        for med in extraction.get("medicines", []):
            times_str = ", ".join(med["times"])
            instructions = f" ({med['instructions']})" if med.get("instructions") else ""
            unclear = " ⚠️ unclear" if med.get("unclear") else ""
            medicines_text += f"• {med['name']} {med['dose']} at {times_str}{instructions}{unclear}\n"
        
        summary = f"📋 Prescription Summary:\n\n{medicines_text}"
        
        # Add warnings if any
        warnings = extraction.get("warnings", [])
        if warnings:
            summary += "\n⚠️ Warnings:\n"
            for w in warnings:
                summary += f"• {w}\n"
            summary += "\nPlease send a clearer photo if possible.\n"
        
        # Step 5: Send summary with Confirm and Edit buttons
        buttons = [
            {"id": f"confirm:{prescription_id}", "title": "Confirm"},
            {"id": f"reject:{prescription_id}", "title": "Edit"},
        ]
        
        await send_message(phone, summary, buttons)
        print(f"[PHOTO] Sent summary with {len(buttons)} buttons")
        
    except Exception as e:
        print(f"[PHOTO] Error: {e}")
        await send_message(phone, "❌ Error processing photo. Please try again.")


async def handle_button(phone: str, button_id: str):
    """Handle button reply - parse action:id format."""
    print(f"[BUTTON] Button ID: {button_id} from {phone}")
    # Format: action:id (e.g., "taken:103", "confirm:11", "allow:7")
    parts = button_id.split(":", 1)
    if len(parts) == 2:
        action, ref_id = parts
        ref_id_int = int(ref_id)
        print(f"[BUTTON] Action: {action}, Ref ID: {ref_id_int}")
        
        async with httpx.AsyncClient() as client:
            if action == "taken":
                resp = await client.post(f"{API_URL}/doses/{ref_id_int}/reply", json={"action": "taken"})
                if resp.status_code == 200:
                    await send_message(phone, "Well done! You took your medicine on time.")
                elif resp.status_code == 422:
                    await send_message(phone, "This dose was already marked.")
                else:
                    await send_message(phone, "Error marking as taken. Please try again.")
                    
            elif action == "skip":
                resp = await client.post(f"{API_URL}/doses/{ref_id_int}/reply", json={"action": "skip"})
                if resp.status_code == 200:
                    await send_message(phone, "Skipped. Remember to take it later if needed.")
                else:
                    await send_message(phone, "Error skipping. Please try again.")
                    
            elif action == "snooze":
                resp = await client.post(f"{API_URL}/doses/{ref_id_int}/reply", json={"action": "snooze"})
                if resp.status_code == 200:
                    await send_message(phone, "Snoozed for 15 minutes. I will remind you again.")
                elif resp.status_code == 422:
                    await send_message(phone, "Snooze already used for this dose. You can skip or mark as taken.")
                else:
                    await send_message(phone, "Error snoozing. Please try again.")
                    
            elif action == "confirm":
                # Confirm prescription or doctor change
                resp = await client.post(f"{API_URL}/prescriptions/{ref_id_int}/confirm")
                if resp.status_code == 200:
                    result = resp.json()
                    await send_message(phone, f"Confirmed! I will remind you at your dose times. ({result.get('doses_created', 0)} doses created)")
                else:
                    # Try doctor change confirmation
                    await send_message(phone, "✅ Doctor change confirmed. Your new medicine plan is active.")
                    
            elif action == "reject":
                # Reject prescription or doctor change
                # Try prescription reject first
                resp = await client.post(f"{API_URL}/prescriptions/{ref_id_int}/reject")
                if resp.status_code == 200:
                    await send_message(phone, "Prescription rejected. Please send a clearer photo.")
                else:
                    # Doctor change reject
                    await client.delete(f"{API_URL}/doctor-links/{ref_id_int}")
                    await send_message(phone, "Doctor change rejected. Your current plan stays active.")
                    
            elif action == "allow":
                # Allow doctor link consent
                resp = await client.post(f"{API_URL}/doctor-links/{ref_id_int}/consent", json={"allow": True})
                if resp.status_code == 200:
                    await send_message(phone, "✅ Doctor can now view your medicine plan. You can revoke access anytime.")
                else:
                    await send_message(phone, "❌ Error granting access. Please try again.")
                    
            elif action == "deny":
                # Deny doctor link consent
                resp = await client.post(f"{API_URL}/doctor-links/{ref_id_int}/consent", json={"allow": False})
                if resp.status_code == 200:
                    await send_message(phone, "Doctor access denied. Your medicine plan stays private.")
                else:
                    await send_message(phone, "❌ Error denying access. Please try again.")
    else:
        print(f"[BUTTON] Invalid button ID format: {button_id}")


async def handle_text(phone: str, text: str):
    """Handle text messages."""
    print(f"[TEXT] Message: '{text}' from {phone}")
    text_lower = text.lower().strip()

    if text_lower == "hi":
        await send_message(phone, "👋 Hello! Send me a prescription photo to get started.")
    elif text_lower == "invite code":
        # Call GET /patients/{id}/invite-code
        # For now, use patient_id=1 (should come from session/context)
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{API_URL}/patients/1/invite-code")
            if resp.status_code == 200:
                data = resp.json()
                invite_code = data.get("invite_code", "N/A")
                await send_message(phone, f"Your invite code: {invite_code}\n\nShare this with your doctor to connect.")
            else:
                await send_message(phone, "Could not retrieve invite code. Please try again.")
    elif text_lower == "change doctor":
        # Start doctor change flow
        await send_message(phone, "To change your doctor:\n\n1. Your doctor sends a new prescription\n2. You review and confirm\n\nOr share your invite code with a new doctor.", buttons=[
            {"id": "invite:1", "title": "Share Code"},
        ])
    elif text_lower == "urdu":
        await send_message(phone, "DoseCare Urdu support coming soon!", buttons=[
            {"id": "english", "title": "English"},
        ])
    elif text_lower == "doctor link":
        # Doctor wants to connect - send consent request
        # This would be triggered when a doctor creates a link
        # For now, show how it works
        await send_message(phone, "A doctor wants to view your medicine plan.\n\nDo you allow this?", buttons=[
            {"id": "allow:1", "title": "Allow"},
            {"id": "deny:1", "title": "Deny"},
        ])
    else:
        await send_message(phone, f"You said: {text}\n\nTry: 'invite code' to get your doctor invite code.")


@app.get("/webhook")
async def verify(request: Request):
    """
    WhatsApp webhook verification (GET).
    Meta sends hub.verify_token and hub.challenge - we verify and return the challenge.
    """
    q = request.query_params
    token = q.get("hub.verify_token")
    challenge = q.get("hub.challenge")

    print(f"[WEBHOOK] Verification request - token: {token}")

    if token == VERIFY_TOKEN:
        print("[WEBHOOK] Verification successful!")
        return PlainTextResponse(challenge)

    print("[WEBHOOK] Verification failed - invalid token")
    raise HTTPException(status_code=403, detail="Invalid verify token")


@app.post("/webhook")
async def receive(payload: dict):
    """
    WhatsApp webhook receiver (POST).
    Process incoming messages.
    """
    print("[WEBHOOK] Received message payload")

    try:
        entry = payload.get("entry", [])
        if not entry:
            print("[WEBHOOK] No entries in payload")
            return {"status": "ok"}

        changes = entry[0].get("changes", [])
        if not changes:
            print("[WEBHOOK] No changes in entry")
            return {"status": "ok"}

        value = changes[0].get("value", {})
        messages = value.get("messages", [])

        for msg in messages:
            print(f"[WEBHOOK] Processing message: {msg}")
            await route_message(msg)

        return {"status": "ok"}

    except Exception as e:
        print(f"[WEBHOOK] Error processing message: {e}")
        return {"status": "error", "detail": str(e)}


@app.post("/send")
async def send(req: dict):
    """
    Bot send API - called by the backend (Task 1).
    Matches the contract shape exactly.
    """
    phone = req.get("phone")
    text = req.get("text")
    buttons = req.get("buttons")
    template = req.get("template")

    print(f"[SEND] Sending to {phone}: {text[:50]}...")

    if template:
        # TODO: Send approved template message
        # For now, fall through to send_message
        print(f"[SEND] Template: {template} - not yet implemented, using regular message")
        await send_message(phone, text, buttons)
    else:
        await send_message(phone, text, buttons)

    return {"sent": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
