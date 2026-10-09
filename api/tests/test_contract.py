from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.db import engine
from app.models import Dose, DoseStatus, Medicine, Prescription, PrescriptionStatus, DoctorLink, LinkStatus
from app.engine import tick


def _login_patient(client):
    r = client.post("/auth/login", json={"email": "ali@example.com", "password": "patient123"})
    return r.json()["access_token"]


def _login_caregiver(client):
    r = client.post("/auth/login", json={"email": "saba@example.com", "password": "caregiver123"})
    return r.json()["access_token"]


def _login_doctor(client):
    r = client.post("/auth/login", json={"email": "dr.ahmed@example.com", "password": "doctor123"})
    return r.json()["access_token"]


def _past_time():
    return datetime.utcnow() - timedelta(days=1)


# === Step 1 ===

def test_root(client):
    """Step 1: Root endpoint returns ok."""
    r = client.get("/")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


# === Step 3: Auth ===

def test_auth_login_success(client):
    """Step 3: Login returns access_token, role, user_id."""
    r = client.post("/auth/login", json={"email": "ali@example.com", "password": "patient123"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["role"] == "patient"
    assert data["user_id"] == 1


def test_auth_login_invalid_credentials(client):
    """Step 3: Invalid credentials return 401."""
    r = client.post("/auth/login", json={"email": "ali@example.com", "password": "wrong"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid credentials"


def test_auth_login_missing_user(client):
    """Step 3: Unknown user returns 401."""
    r = client.post("/auth/login", json={"email": "noone@example.com", "password": "pass"})
    assert r.status_code == 401


# === Step 4: Prescriptions ===

def test_prescriptions_create_draft(client):
    """Step 4: POST /prescriptions with prescribed_by=null creates draft."""
    token = _login_caregiver(client)
    r = client.post("/prescriptions", headers={"Authorization": f"Bearer {token}"}, json={
        "patient_id": 1,
        "prescribed_by": None,
        "supersedes_id": None,
        "medicines": [{"name": "NewMed", "dose": "5 mg", "times": ["08:00"], "days": 7, "instructions": None}],
    })
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "draft"
    assert data["version"] == 1


def test_prescriptions_create_waiting_patient(client):
    """Step 4: POST /prescriptions with prescribed_by set creates waiting_patient."""
    token = _login_doctor(client)
    r = client.post("/prescriptions", headers={"Authorization": f"Bearer {token}"}, json={
        "patient_id": 1,
        "prescribed_by": 3,
        "supersedes_id": None,
        "medicines": [{"name": "NewMed2", "dose": "5 mg", "times": ["08:00"], "days": 30, "instructions": None}],
    })
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "waiting_patient"
    assert "id" in data


def test_prescriptions_confirm_creates_doses(client):
    """Step 4: POST /prescriptions/{id}/confirm creates doses and activates."""
    token = _login_patient(client)

    with Session(engine) as session:
        pres = session.get(Prescription, 11)
        pres.status = PrescriptionStatus.waiting_patient
        session.add(pres)
        session.commit()

    r = client.post("/prescriptions/11/confirm", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "active"
    assert data["doses_created"] > 0


def test_prescriptions_reject(client):
    """Step 4: POST /prescriptions/{id}/reject sets rejected status."""
    token = _login_patient(client)

    with Session(engine) as session:
        pres = session.get(Prescription, 11)
        pres.status = PrescriptionStatus.waiting_patient
        session.add(pres)
        session.commit()

    r = client.post("/prescriptions/11/reject", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"


def test_prescriptions_list(client):
    """Step 4: GET /patients/{id}/prescriptions returns list."""
    token = _login_patient(client)
    r = client.get("/patients/1/prescriptions?status=active",
                   headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_doses_list(client):
    """Step 4: GET /patients/{id}/doses returns list."""
    token = _login_patient(client)
    r = client.get("/patients/1/doses", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "status" in data[0]


# === Step 5: Dose replies ===

def test_doses_reply_taken(client):
    """Step 5: POST /doses/{id}/reply with taken returns CONFIRMED."""
    with Session(engine) as session:
        dose = session.get(Dose, 104)
        dose.status = DoseStatus.SCHEDULED
        dose.scheduled_at = _past_time()
        session.add(dose)
        session.commit()

    r = client.post("/doses/104/reply", json={"action": "taken"},
                    headers={"Authorization": "Bearer test-bot-token-123"})
    assert r.status_code == 200
    assert r.json()["status"] == "CONFIRMED"


def test_doses_reply_skip(client):
    """Step 5: POST /doses/{id}/reply with skip returns SKIPPED."""
    r = client.post("/doses/104/reply", json={"action": "skip"},
                    headers={"Authorization": "Bearer test-bot-token-123"})
    assert r.status_code == 200
    assert r.json()["status"] == "SKIPPED"


def test_doses_reply_snooze(client):
    """Step 5: POST /doses/{id}/reply with snooze returns SCHEDULED."""
    r = client.post("/doses/104/reply", json={"action": "snooze"},
                    headers={"Authorization": "Bearer test-bot-token-123"})
    assert r.status_code == 200
    assert r.json()["status"] == "SCHEDULED"


def test_doses_reply_taken_late(client):
    """Step 5: Taking a MISSED dose returns CONFIRMED_LATE."""
    with Session(engine) as session:
        dose = session.get(Dose, 104)
        dose.status = DoseStatus.MISSED
        session.add(dose)
        session.commit()

    r = client.post("/doses/104/reply", json={"action": "taken"},
                    headers={"Authorization": "Bearer test-bot-token-123"})
    assert r.status_code == 200
    assert r.json()["status"] == "CONFIRMED_LATE"


def test_doses_reply_invalid_action(client):
    """Step 5: Invalid action returns 422."""
    r = client.post("/doses/104/reply", json={"action": "invalid"},
                    headers={"Authorization": "Bearer test-bot-token-123"})
    assert r.status_code == 422


def test_doses_reply_not_found(client):
    """Step 5: Non-existent dose returns 404."""
    r = client.post("/doses/99999/reply", json={"action": "taken"},
                    headers={"Authorization": "Bearer test-bot-token-123"})
    assert r.status_code == 404


# === Step 5: Invite code ===

def test_invite_code(client):
    """Step 5: GET /patients/{id}/invite-code returns invite_code."""
    token = _login_patient(client)
    r = client.get("/patients/1/invite-code", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["invite_code"] == "ALI-4821"


# === Step 5: Doctor links ===

def test_doctor_link_create(client):
    """Step 5: POST /doctor-links creates pending link."""
    with Session(engine) as session:
        link = session.get(DoctorLink, 7)
        link.status = LinkStatus.revoked
        link.revoked_at = datetime.utcnow()
        session.add(link)
        session.commit()

    token = _login_doctor(client)
    r = client.post("/doctor-links", headers={"Authorization": f"Bearer {token}"},
                    json={"invite_code": "ALI-4821"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "pending"
    assert data["patient_id"] == 1


def test_doctor_link_consent_active(client):
    """Step 5: POST /doctor-links/{id}/consent with allow=true sets active."""
    with Session(engine) as session:
        link = DoctorLink(patient_id=1, doctor_id=3, status=LinkStatus.pending)
        session.add(link)
        session.commit()
        link_id = link.id

    token = _login_patient(client)
    r = client.post(f"/doctor-links/{link_id}/consent",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"allow": True})
    assert r.status_code == 200
    assert r.json()["status"] == "active"


def test_doctor_link_consent_revoked(client):
    """Step 5: POST /doctor-links/{id}/consent with allow=false sets revoked."""
    with Session(engine) as session:
        link = DoctorLink(patient_id=1, doctor_id=3, status=LinkStatus.pending)
        session.add(link)
        session.commit()
        link_id = link.id

    token = _login_patient(client)
    r = client.post(f"/doctor-links/{link_id}/consent",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"allow": False})
    assert r.status_code == 200
    assert r.json()["status"] == "revoked"


def test_doctor_link_delete_revoke(client):
    """Step 5: DELETE /doctor-links/{id} revokes link."""
    token = _login_patient(client)
    r = client.delete("/doctor-links/7", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["status"] == "revoked"


def test_doctor_patients_active_only(client):
    """Step 5: GET /doctor/patients returns only patients with active links."""
    token = _login_doctor(client)
    r = client.get("/doctor/patients", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["name"] == "Ali Khan"


# === Step 5: Caregiver ===

def test_caregiver_patients(client):
    """Step 5: GET /caregiver/patients returns linked patients."""
    token = _login_caregiver(client)
    r = client.get("/caregiver/patients", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["name"] == "Ali Khan"


def test_caregiver_patients_create(client):
    """Step 5: POST /caregiver/patients creates patient by name+phone."""
    token = _login_caregiver(client)
    r = client.post("/caregiver/patients", headers={"Authorization": f"Bearer {token}"},
                    json={"name": "New Patient", "phone": "923007777777"})
    assert r.status_code == 200
    assert "id" in r.json()


def test_caregiver_patients_duplicate_phone(client):
    """Step 5: POST /caregiver/patients with duplicate phone returns 409."""
    token = _login_caregiver(client)
    r = client.post("/caregiver/patients", headers={"Authorization": f"Bearer {token}"},
                    json={"name": "Ali Khan", "phone": "923001234567"})
    assert r.status_code == 409


def test_caregiver_settings(client):
    """Step 5: PUT /caregiver/settings updates alert_mode."""
    token = _login_caregiver(client)
    r = client.put("/caregiver/settings", headers={"Authorization": f"Bearer {token}"},
                   json={"alert_mode": "summary"})
    assert r.status_code == 200
    assert r.json()["alert_mode"] == "summary"


# === Step 9: Reports ===

def test_reports_weekly(client):
    """Step 9: GET /reports/{id}/weekly returns report structure."""
    token = _login_patient(client)
    r = client.get("/reports/1/weekly", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "patient_name" in data
    assert "week_start" in data
    assert "week_end" in data
    assert "adherence" in data
    assert "rows" in data
    assert isinstance(data["rows"], list)


def test_reports_weekly_pdf_501(client):
    """Step 9: GET /reports/{id}/weekly.pdf returns 501 when PDF module missing."""
    token = _login_patient(client)
    r = client.get("/reports/1/weekly.pdf", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 501
