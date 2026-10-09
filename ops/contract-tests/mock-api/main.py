# MOCK: replace on merge day
"""DoseCare mock API — implements ops/contract/00_contract.md (§4 backend, §5 bot).

Run from this folder:  uvicorn main:app --port 9000
Delete the whole mock-api/ folder on merge day when the real backend exists.
"""

import json
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response
from pydantic import BaseModel, Field

FIXTURES = json.loads(
    (Path(__file__).resolve().parents[2] / "contract" / "fixtures.json").read_text(
        encoding="utf-8"
    )
)

app = FastAPI(title="DoseCare Mock API (MOCK: replace on merge day)")

# --- in-memory mock state -------------------------------------------------
USERS = {
    "caregiver@demo.pk": FIXTURES["login"],
    "fatima@demo.pk": FIXTURES["login"],
    "bilal@demo.pk": {
        "access_token": "caregiver2-token",
        "role": "caregiver",
        "user_id": 4,
    },
    "doctor@demo.pk": {"access_token": "doctor-token", "role": "doctor", "user_id": 9},
    "ali@demo.pk": {"access_token": "patient-ali-token", "role": "patient", "user_id": 1},
    "amina@demo.pk": {
        "access_token": "patient-amina-token",
        "role": "patient",
        "user_id": 3,
    },
    "sara@demo.pk": {"access_token": "patient-sara-token", "role": "patient", "user_id": 5},
}
KNOWN_PATIENTS = {1, 3, 5}
LINKS: dict[int, dict] = {7: {"patient_id": 1, "status": "active"}}
SNOOZED: set[int] = set()
NEXT_PATIENT_ID = 6

PDF_BYTES = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n"
    b"trailer<</Root 1 0 R>>\n"
    b"%%EOF\n"
)


# --- request bodies -------------------------------------------------------
class LoginBody(BaseModel):
    email: str
    password: str


class Medicine(BaseModel):
    name: str
    dose: str
    times: list[str]
    days: int
    instructions: str | None = None


class PrescriptionBody(BaseModel):
    patient_id: int
    prescribed_by: int | None = None
    supersedes_id: int | None = None
    medicines: list[Medicine]


class DoseReply(BaseModel):
    action: Literal["taken", "skip", "snooze"]


class InviteBody(BaseModel):
    invite_code: str


class ConsentBody(BaseModel):
    allow: bool


class CaregiverPatientBody(BaseModel):
    name: str
    phone: str = Field(pattern=r"^\d+$")


class CaregiverSettingsBody(BaseModel):
    alert_mode: Literal["every", "summary"]


class BotSendBody(BaseModel):
    phone: str
    text: str
    buttons: list[dict] | None = None
    template: str | None = None


# --- dependencies ---------------------------------------------------------
def auth(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return authorization.removeprefix("Bearer ")


def doctor_only(token: str = Depends(auth)) -> str:
    if token != "doctor-token":
        raise HTTPException(status_code=403, detail="Doctors only")
    return token


def _require_patient_known(patient_id: int) -> None:
    if patient_id not in KNOWN_PATIENTS:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")


def _require_doctor_active_link(token: str, patient_id: int) -> None:
    if token != "doctor-token":
        return
    links = [l for l in LINKS.values() if l["patient_id"] == patient_id]
    if not links or all(l["status"] != "active" for l in links):
        raise HTTPException(status_code=403, detail=FIXTURES["error_403"]["detail"])


# --- §4 backend API -------------------------------------------------------
@app.post("/auth/login")
def login(body: LoginBody):
    user = USERS.get(body.email)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user


@app.post("/prescriptions")
def create_prescription(body: PrescriptionBody, token: str = Depends(auth)):
    status = "draft" if body.prescribed_by is None else "waiting_patient"
    return {"id": 11, "status": status, "version": 1}


@app.post("/prescriptions/{prescription_id}/confirm")
def confirm_prescription(prescription_id: int, token: str = Depends(auth)):
    # doses_created 90 = Metformin (2x30) + Amlodipine (1x30) from fixtures
    return {"id": prescription_id, "status": "active", "doses_created": 90}


@app.post("/prescriptions/{prescription_id}/reject")
def reject_prescription(prescription_id: int, token: str = Depends(auth)):
    return {"id": prescription_id, "status": "rejected"}


@app.get("/patients/{patient_id}/prescriptions")
def list_prescriptions(
    patient_id: int,
    status: str | None = None,  # MOCK: filter not implemented, always active list
    token: str = Depends(auth),
):
    _require_patient_known(patient_id)
    _require_doctor_active_link(token, patient_id)
    return FIXTURES["active_prescriptions"]


@app.get("/patients/{patient_id}/doses")
def list_doses(
    patient_id: int,
    from_: str | None = Query(default=None, alias="from"),  # MOCK: range not applied
    to: str | None = None,
    token: str = Depends(auth),
):
    _require_patient_known(patient_id)
    _require_doctor_active_link(token, patient_id)
    return FIXTURES["doses"]


@app.post("/doses/{dose_id}/reply")
def reply_to_dose(dose_id: int, body: DoseReply, token: str = Depends(auth)):
    if body.action == "snooze":
        if dose_id in SNOOZED:
            raise HTTPException(
                status_code=422, detail=FIXTURES["error_422_snooze"]["detail"]
            )
        SNOOZED.add(dose_id)
        status = "SCHEDULED"
    elif body.action == "taken":
        status = "CONFIRMED"
    else:
        status = "SKIPPED"
    return {"id": dose_id, "status": status}


@app.get("/patients/{patient_id}/invite-code")
def invite_code(patient_id: int, token: str = Depends(auth)):
    _require_patient_known(patient_id)
    return FIXTURES["invite_code"]


@app.post("/doctor-links")
def create_doctor_link(body: InviteBody, token: str = Depends(doctor_only)):
    # MOCK: any invite code resolves to Ali Khan's link (id 7)
    LINKS[7] = {"patient_id": 1, "status": "pending"}
    return {"id": 7, "status": "pending", "patient_id": 1}


@app.post("/doctor-links/{link_id}/consent")
def link_consent(link_id: int, body: ConsentBody, token: str = Depends(doctor_only)):
    link = LINKS.get(link_id)
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")
    link["status"] = "active" if body.allow else "revoked"
    return {"id": link_id, "status": link["status"]}


@app.delete("/doctor-links/{link_id}")
def delete_link(link_id: int, token: str = Depends(doctor_only)):
    link = LINKS.get(link_id)
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")
    link["status"] = "revoked"
    return {"id": link_id, "status": "revoked"}


@app.get("/doctor/patients")
def doctor_patients(token: str = Depends(doctor_only)):
    active_ids = {lid for lid, l in LINKS.items() if l["status"] == "active"}
    return [p for p in FIXTURES["doctor_patients"] if p["link_id"] in active_ids]


@app.get("/caregiver/patients")
def caregiver_patients(token: str = Depends(auth)):
    return FIXTURES["caregiver_patients"]


@app.post("/caregiver/patients")
def create_caregiver_patient(body: CaregiverPatientBody, token: str = Depends(auth)):
    global NEXT_PATIENT_ID
    patient_id = NEXT_PATIENT_ID
    NEXT_PATIENT_ID += 1
    KNOWN_PATIENTS.add(patient_id)
    return {"id": patient_id}


@app.put("/caregiver/settings")
def put_caregiver_settings(body: CaregiverSettingsBody, token: str = Depends(auth)):
    return {"alert_mode": body.alert_mode}


@app.get("/reports/{patient_id}/weekly")
def weekly_report(patient_id: int, token: str = Depends(auth)):
    _require_patient_known(patient_id)
    return FIXTURES["weekly_report"]


@app.get("/reports/{patient_id}/weekly.pdf")
def weekly_report_pdf(patient_id: int, token: str = Depends(auth)):
    _require_patient_known(patient_id)
    return Response(content=PDF_BYTES, media_type="application/pdf")


# --- §5 bot send API (called by the backend) ------------------------------
@app.post("/send")
def send(body: BotSendBody):
    # MOCK: contract §5 does not require an auth header on this endpoint
    return FIXTURES["bot_send_response"]
