import os
from datetime import datetime, timedelta

from sqlmodel import Session

from app.db import engine
from app.models import Dose, Medicine, DoseStatus
from app.engine import tick


def _create_test_dose():
    """Create a fresh test dose in SCHEDULED state for tick-based tests."""
    with Session(engine) as session:
        med = session.get(Medicine, 1)

        past_time = datetime.utcnow() - timedelta(minutes=10)
        dose = Dose(
            medicine_id=med.id,
            patient_id=1,
            scheduled_at=past_time,
            status=DoseStatus.SCHEDULED,
            reminder_count=0,
            last_reminded_at=None,
            snoozed=False,
        )
        session.add(dose)
        session.commit()
        session.refresh(dose)
        return dose.id


def _get_dose(session, dose_id):
    return session.get(Dose, dose_id)


def _count_reminder_messages():
    """Count 'Time for' reminder messages in outbox.log (excludes caretaker reply notifications)."""
    outbox_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "outbox.log")
    if not os.path.exists(outbox_path):
        return 0
    with open(outbox_path) as f:
        return sum(1 for line in f if "Time for" in line)


def test_dose_statuses():
    """Step 3: Dose statuses are as defined in the contract."""
    assert DoseStatus.SCHEDULED == "SCHEDULED"
    assert DoseStatus.NOTIFIED == "NOTIFIED"
    assert DoseStatus.CONFIRMED == "CONFIRMED"
    assert DoseStatus.SKIPPED == "SKIPPED"
    assert DoseStatus.MISSED == "MISSED"
    assert DoseStatus.CONFIRMED_LATE == "CONFIRMED_LATE"


def test_no_reply_three_reminders_then_missed():
    """Test 1: A dose with no reply produces exactly 3 reminders then becomes MISSED."""
    dose_id = _create_test_dose()
    with Session(engine) as session:
        dose = _get_dose(session, dose_id)
        assert dose.status == DoseStatus.SCHEDULED
        assert dose.reminder_count == 0

        base_time = dose.scheduled_at + timedelta(seconds=1)

        tick(base_time)
        session.expunge_all()
        dose = _get_dose(session, dose_id)
        assert dose.status == DoseStatus.NOTIFIED
        assert dose.reminder_count == 1

        tick(base_time + timedelta(minutes=6))
        session.expunge_all()
        dose = _get_dose(session, dose_id)
        assert dose.status == DoseStatus.NOTIFIED
        assert dose.reminder_count == 2

        tick(base_time + timedelta(minutes=12))
        session.expunge_all()
        dose = _get_dose(session, dose_id)
        assert dose.status == DoseStatus.NOTIFIED
        assert dose.reminder_count == 3

        tick(base_time + timedelta(minutes=18))
        session.expunge_all()
        dose = _get_dose(session, dose_id)
        assert dose.status == DoseStatus.MISSED
        assert dose.reminder_count == 3


def test_taken_after_reminder_stops_loop(client):
    """Test 2: Taking a dose via POST /doses/{id}/reply after reminder 1 stops the reminder loop."""
    _count_reminder_messages()  # Initialize/clear baseline

    dose_id = _create_test_dose()
    with Session(engine) as session:
        dose = _get_dose(session, dose_id)
        base_time = dose.scheduled_at + timedelta(seconds=1)

        tick(base_time)
        session.expunge_all()
        dose = _get_dose(session, dose_id)
        assert dose.status == DoseStatus.NOTIFIED
        assert dose.reminder_count == 1

        reminders_after_tick1 = _count_reminder_messages()

    # Use the actual API to mark as taken
    r = client.post(f"/doses/{dose_id}/reply", json={"action": "taken"},
                    headers={"Authorization": "Bearer test-bot-token-123"})
    assert r.status_code == 200
    assert r.json()["status"] == "CONFIRMED"

    with Session(engine) as session:
        for _ in range(3):
            tick(base_time + timedelta(minutes=6))
            session.expunge_all()

        dose = _get_dose(session, dose_id)
        assert dose.status == DoseStatus.CONFIRMED
        assert dose.reminder_count == 1

    # Verify no reminder messages were sent after the taken reply
    reminders_after_all_ticks = _count_reminder_messages()
    assert reminders_after_all_ticks == reminders_after_tick1, \
        "Should not send reminder after dose is taken"


def test_second_snooze_returns_422(client):
    """Test 3: A second snooze on the same dose returns HTTP 422."""
    dose_id = _create_test_dose()

    with Session(engine) as session:
        dose = _get_dose(session, dose_id)
        dose.status = DoseStatus.NOTIFIED
        dose.reminder_count = 1
        dose.last_reminded_at = datetime.utcnow() - timedelta(minutes=1)
        session.add(dose)
        session.commit()

    r = client.post(f"/doses/{dose_id}/reply", json={"action": "snooze"},
                    headers={"Authorization": "Bearer test-bot-token-123"})
    assert r.status_code == 200
    assert r.json()["status"] == "SCHEDULED"

    r = client.post(f"/doses/{dose_id}/reply", json={"action": "snooze"},
                    headers={"Authorization": "Bearer test-bot-token-123"})
    assert r.status_code == 422
    assert r.json()["detail"] == "Snooze already used for this dose"


def test_revoked_doctor_gets_403(client):
    """Test 4: A revoked doctor link returns HTTP 403."""
    from app.models import DoctorLink, LinkStatus

    with Session(engine) as session:
        link = session.get(DoctorLink, 7)
        link.status = LinkStatus.revoked
        link.revoked_at = datetime.utcnow()
        session.add(link)
        session.commit()

    token = _login_doctor(client)
    r = client.get("/reports/1/weekly", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403
    assert r.json()["detail"] == "Access to this patient has ended"


def _login_doctor(client):
    r = client.post("/auth/login", json={"email": "dr.ahmed@example.com", "password": "doctor123"})
    return r.json()["access_token"]
