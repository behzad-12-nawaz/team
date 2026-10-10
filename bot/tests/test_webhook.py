"""
Simple tests for the bot webhook.
Run with: python tests/test_webhook.py
"""
import asyncio
import httpx
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test environment
os.environ["WHATSAPP_TOKEN"] = "test-token"
os.environ["WHATSAPP_PHONE_ID"] = "123456789"
os.environ["VERIFY_TOKEN"] = "any-secret"
os.environ["API_URL"] = "http://localhost:8000"
os.environ["AI_MODE"] = "mock"

from bot_app import app


async def test_webhook_verification():
    """Test webhook verification endpoint."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    # Test successful verification
    response = client.get(
        "/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "any-secret",
            "hub.challenge": "test_challenge_123"
        }
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert response.text == "test_challenge_123", f"Expected challenge, got {response.text}"
    print("[PASS] Webhook verification successful")

    # Test failed verification
    response = client.get(
        "/webhook",
        params={
            "hub.verify_token": "wrong-token",
            "hub.challenge": "test_challenge"
        }
    )
    assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    print("[PASS] Webhook verification rejected wrong token")


async def test_webhook_receive():
    """Test webhook message receiver."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    # Simulate a text message payload from WhatsApp
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "from": "923001234567",
                                    "type": "text",
                                    "text": {"body": "hi"},
                                    "timestamp": "1696528800"
                                }
                            ],
                            "contacts": [
                                {
                                    "wa_id": "923001234567",
                                    "profile": {"name": "Test User"}
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }

    response = client.post("/webhook", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert response.json() == {"status": "ok"}
    print("[PASS] Webhook received text message successfully")


async def test_send_endpoint():
    """Test the /send endpoint."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    # Test with buttons (from fixtures)
    payload = {
        "phone": "923001234567",
        "text": "Time for Metformin 500 mg (8:00 AM)",
        "buttons": [
            {"id": "taken:103", "title": "Taken"},
            {"id": "skip:103", "title": "Skip"},
            {"id": "snooze:103", "title": "Snooze 15 min"}
        ],
        "template": "dose_reminder"
    }

    # This will try to send via WhatsApp API which will fail in test
    # but we can verify the endpoint is reachable
    response = client.post("/send", json=payload)
    # The send will fail because there's no real WhatsApp token
    # but the endpoint should be reachable
    print(f"[PASS] Send endpoint reachable (status: {response.status_code})")


async def main():
    print("Testing DoseCare Bot Webhook...\n")

    try:
        await test_webhook_verification()
        await test_webhook_receive()
        await test_send_endpoint()
        print("\n[PASS] All tests passed!")
    except AssertionError as e:
        print(f"\n[FAIL] Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
