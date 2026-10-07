"""Contract tests for ops/contract/00_contract.md (§4 backend, §5 bot).

Shapes only: status codes and required keys. Exact values are asserted only
where the contract itself pins them (e.g. confirm -> "active", send -> true).

Run: BASE_URL=http://localhost:9000 pytest
"""

MEDICINES = [
    {
        "name": "Metformin",
        "dose": "500 mg",
        "times": ["08:00", "20:00"],
        "days": 30,
        "instructions": "after meals",
    },
    {
        "name": "Amlodipine",
        "dose": "5 mg",
        "times": ["09:00"],
        "days": 30,
        "instructions": None,
    },
]


def test_login_returns_token_role_user(client):
    r = client.post("/auth/login", json={"email": "caregiver@demo.pk", "password": "demo"})
    assert r.status_code == 200
    assert set(r.json()) >= {"access_token", "role", "user_id"}


def test_create_prescription_status_by_prescribed_by(client, auth):
    body = {
        "patient_id": 1,
        "prescribed_by": None,
        "supersedes_id": None,
        "medicines": MEDICINES,
    }
    r = client.post("/prescriptions", json=body, headers=auth)
    assert r.status_code == 200
    data = r.json()
    assert set(data) >= {"id", "status", "version"}
    assert data["status"] == "draft"

    body["prescribed_by"] = 9
    r = client.post("/prescriptions", json=body, headers=auth)
    assert r.status_code == 200
    assert r.json()["status"] == "waiting_patient"


def test_confirm_prescription(client, auth):
    r = client.post("/prescriptions/11/confirm", headers=auth)
    assert r.status_code == 200
    data = r.json()
    assert set(data) >= {"id", "status", "doses_created"}
    assert data["status"] == "active"
    assert isinstance(data["doses_created"], int)


def test_reject_prescription(client, auth):
    r = client.post("/prescriptions/11/reject", headers=auth)
    assert r.status_code == 200
    data = r.json()
    assert set(data) >= {"id", "status"}
    assert data["status"] == "rejected"


def test_list_active_prescriptions(client, auth):
    r = client.get(
        "/patients/1/prescriptions",
        params={"status": "active"},
        headers=auth,
    )
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and items
    assert set(items[0]) >= {"id", "status", "version", "medicines"}
    assert isinstance(items[0]["medicines"], list)


def test_list_doses(client, auth):
    r = client.get(
        "/patients/1/doses",
        params={"from": "2026-10-05T00:00:00Z", "to": "2026-10-06T23:59:59Z"},
        headers=auth,
    )
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and items
    assert set(items[0]) >= {
        "id",
        "medicine",
        "dose",
        "scheduled_at",
        "status",
        "reminder_count",
    }


def test_dose_reply_taken(client, auth):
    r = client.post("/doses/103/reply", json={"action": "taken"}, headers=auth)
    assert r.status_code == 200
    assert set(r.json()) >= {"id", "status"}


def test_second_snooze_rejected(client, auth):
    # contract: snooze once per dose — second snooze returns 422 with detail
    for dose_id in (101, 102, 103, 104):
        first = client.post(
            f"/doses/{dose_id}/reply", json={"action": "snooze"}, headers=auth
        )
        if first.status_code == 422:
            continue  # already snoozed in a previous run — try the next dose
        assert first.status_code == 200, first.text
        second = client.post(
            f"/doses/{dose_id}/reply", json={"action": "snooze"}, headers=auth
        )
        assert second.status_code == 422
        assert set(second.json()) >= {"detail"}
        return
    raise AssertionError("every dose already snoozed — restart mock-api (uvicorn)")


def test_invite_code(client, auth):
    r = client.get("/patients/1/invite-code", headers=auth)
    assert r.status_code == 200
    assert set(r.json()) >= {"invite_code"}


def test_create_doctor_link_pending(client, doctor_auth):
    r = client.post("/doctor-links", json={"invite_code": "ALI-4821"}, headers=doctor_auth)
    assert r.status_code == 200
    data = r.json()
    assert set(data) >= {"id", "status", "patient_id"}
    assert data["status"] == "pending"


def test_link_consent_allow_and_deny(client, doctor_auth):
    r = client.post("/doctor-links/7/consent", json={"allow": True}, headers=doctor_auth)
    assert r.status_code == 200
    data = r.json()
    assert set(data) >= {"id", "status"}
    assert data["status"] == "active"

    r = client.post("/doctor-links/7/consent", json={"allow": False}, headers=doctor_auth)
    assert r.status_code == 200
    assert r.json()["status"] == "revoked"


def test_delete_doctor_link_revoked(client, doctor_auth):
    r = client.delete("/doctor-links/7", headers=doctor_auth)
    assert r.status_code == 200
    data = r.json()
    assert set(data) >= {"id", "status"}
    assert data["status"] == "revoked"


def test_doctor_read_after_revoke_403(client, doctor_auth):
    client.delete("/doctor-links/7", headers=doctor_auth)  # ensure revoked
    r = client.get(
        "/patients/1/prescriptions",
        params={"status": "active"},
        headers=doctor_auth,
    )
    assert r.status_code == 403
    assert set(r.json()) >= {"detail"}


def test_doctor_patients_active_links_only(client, doctor_auth):
    client.post("/doctor-links/7/consent", json={"allow": True}, headers=doctor_auth)
    r = client.get("/doctor/patients", headers=doctor_auth)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and items
    assert set(items[0]) >= {"id", "name", "phone"}


def test_caregiver_patients(client, auth):
    r = client.get("/caregiver/patients", headers=auth)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and items
    assert set(items[0]) >= {"id", "name", "phone", "today", "adherence_7d"}


def test_create_caregiver_patient(client, auth):
    r = client.post(
        "/caregiver/patients",
        json={"name": "Demo Patient", "phone": "923000000001"},
        headers=auth,
    )
    assert r.status_code == 200
    assert set(r.json()) >= {"id"}


def test_caregiver_settings(client, auth):
    r = client.put("/caregiver/settings", json={"alert_mode": "summary"}, headers=auth)
    assert r.status_code == 200
    assert set(r.json()) >= {"alert_mode"}


def test_weekly_report(client, auth):
    r = client.get("/reports/1/weekly", headers=auth)
    assert r.status_code == 200
    data = r.json()
    assert set(data) >= {"patient_name", "week_start", "week_end", "adherence", "rows"}


def test_weekly_report_pdf(client, auth):
    r = client.get("/reports/1/weekly.pdf", headers=auth)
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"


def test_bot_send(client):
    body = {
        "phone": "923001234567",
        "text": "Time for Metformin 500 mg (8:00 AM)",
        "buttons": [
            {"id": "taken:103", "title": "Taken"},
            {"id": "skip:103", "title": "Skip"},
            {"id": "snooze:103", "title": "Snooze 15 min"},
        ],
        "template": "dose_reminder",
    }
    r = client.post("/send", json=body)
    assert r.status_code == 200
    assert r.json()["sent"] is True


def test_error_401_without_token(client):
    r = client.get("/caregiver/patients")
    assert r.status_code == 401
    assert set(r.json()) >= {"detail"}


def test_error_404_unknown_patient(client, auth):
    r = client.get(
        "/patients/99999/prescriptions",
        params={"status": "active"},
        headers=auth,
    )
    assert r.status_code == 404
    assert set(r.json()) >= {"detail"}
