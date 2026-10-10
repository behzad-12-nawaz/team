"""
Fake Backend for DoseCare Bot Testing
Implements the contract API using fixtures.json
Run on port 8000: uvicorn fake_backend:app --host 0.0.0.0 --port 8000
"""
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

# Load fixtures
import os

# Get the directory of this file and construct path to fixtures
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURES_PATH = os.path.join(BASE_DIR, "contract", "fixtures.json")
with open(FIXTURES_PATH, "r") as f:
    FIXTURES = json.load(f)

# Simple in-memory state
prescriptions = {}
doses = {}
doctor_links = {}


@app.post("/auth/login")
async def login(data: dict):
    """Mock login - returns fixture data."""
    return FIXTURES["login"]


@app.post("/prescriptions")
async def create_prescription(data: dict):
    """Create a prescription - returns draft status if prescribed_by is null."""
    patient_id = data.get("patient_id")
    prescribed_by = data.get("prescribed_by")
    medicines = data.get("medicines", [])

    # Use fixture data
    result = FIXTURES["prescription_created"].copy()
    result["patient_id"] = patient_id
    prescriptions[result["id"]] = {
        "id": result["id"],
        "status": result["status"],
        "version": result["version"],
        "patient_id": patient_id,
        "prescribed_by": prescribed_by,
        "medicines": medicines,
    }
    return result


@app.post("/prescriptions/{prescription_id}/confirm")
async def confirm_prescription(prescription_id: int):
    """Confirm a prescription - returns active status."""
    if prescription_id not in prescriptions:
        raise HTTPException(status_code=404, detail="Prescription not found")

    prescriptions[prescription_id]["status"] = "active"
    return FIXTURES["prescription_confirmed"]


@app.post("/prescriptions/{prescription_id}/reject")
async def reject_prescription(prescription_id: int):
    """Reject a prescription."""
    if prescription_id not in prescriptions:
        raise HTTPException(status_code=404, detail="Prescription not found")

    prescriptions[prescription_id]["status"] = "rejected"
    return {"id": prescription_id, "status": "rejected"}


@app.get("/patients/{patient_id}/prescriptions")
async def get_patient_prescriptions(
    patient_id: int,
    status: Optional[str] = None
):
    """Get patient prescriptions - returns active prescriptions from fixtures."""
    result = FIXTURES.get("active_prescriptions", [])
    if status:
        result = [p for p in result if p.get("status") == status]
    return result


@app.get("/patients/{patient_id}/doses")
async def get_patient_doses(
    patient_id: int,
    from_time: Optional[str] = None,
    to_time: Optional[str] = None
):
    """Get patient doses - returns fixture doses."""
    return FIXTURES["doses"]


@app.post("/doses/{dose_id}/reply")
async def reply_dose(dose_id: int, data: dict):
    """Reply to a dose (taken/skip/snooze)."""
    action = data.get("action")

    if action not in ["taken", "skip", "snooze"]:
        raise HTTPException(status_code=422, detail="Invalid action")

    # Check for second snooze (return 422)
    if action == "snooze":
        dose = next((d for d in FIXTURES["doses"] if d["id"] == dose_id), None)
        if dose and dose.get("reminder_count", 0) >= 2:
            raise HTTPException(
                status_code=422,
                detail=FIXTURES["error_422_snooze"]["detail"]
            )

    return FIXTURES["dose_reply"]


@app.get("/patients/{patient_id}/invite-code")
async def get_invite_code(patient_id: int):
    """Get patient invite code."""
    return FIXTURES["invite_code"]


@app.post("/doctor-links")
async def create_doctor_link(data: dict):
    """Create a doctor link."""
    invite_code = data.get("invite_code")
    result = FIXTURES["doctor_link_created"].copy()
    doctor_links[result["id"]] = result
    return result


@app.post("/doctor-links/{link_id}/consent")
async def doctor_link_consent(link_id: int, data: dict):
    """Handle doctor link consent."""
    allow = data.get("allow")
    if link_id not in doctor_links:
        raise HTTPException(status_code=404, detail="Link not found")

    status = "active" if allow else "revoked"
    doctor_links[link_id]["status"] = status
    return FIXTURES["doctor_link_consent" if allow else "doctor_link_revoked"]


@app.delete("/doctor-links/{link_id}")
async def revoke_doctor_link(link_id: int):
    """Revoke a doctor link."""
    if link_id not in doctor_links:
        raise HTTPException(status_code=404, detail="Link not found")

    doctor_links[link_id]["status"] = "revoked"
    return FIXTURES["doctor_link_revoked"]


@app.get("/doctor/patients")
async def get_doctor_patients():
    """Get patients visible to doctor (with active link only)."""
    return FIXTURES["doctor_patients"]


@app.get("/caregiver/patients")
async def get_caregiver_patients():
    """Get patients visible to caregiver."""
    return FIXTURES["caregiver_patients"]


@app.post("/caregiver/patients")
async def create_caregiver_patient(data: dict):
    """Create a new patient for caregiver."""
    return {"id": 999}


@app.put("/caregiver/settings")
async def update_caregiver_settings(data: dict):
    """Update caregiver settings."""
    return {"alert_mode": data.get("alert_mode", "every")}


@app.get("/reports/{patient_id}/weekly")
async def get_weekly_report(patient_id: int):
    """Get weekly report."""
    return FIXTURES["weekly_report"]


@app.get("/reports/{patient_id}/weekly.pdf")
async def get_weekly_pdf(patient_id: int):
    """Get weekly report as PDF."""
    # Return mock PDF bytes
    return b"%PDF-1.4 mock pdf content"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
