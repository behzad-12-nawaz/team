import random
import string
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth import require_role, hash_password
from app.db import engine
from app.models import User, CaregiverLink, Setting, Dose, Medicine, DoseStatus, UserRole
from app.utils import utcnow

router = APIRouter(tags=["caregiver"])


class CreatePatientRequest(BaseModel):
    name: str
    phone: str


class CreatePatientResponse(BaseModel):
    id: int


class CaregiverPatientResponse(BaseModel):
    id: int
    name: str
    phone: str
    today: dict
    adherence_7d: int


class SettingsRequest(BaseModel):
    alert_mode: str


class SettingsResponse(BaseModel):
    alert_mode: str


def _generate_invite_code(name: str) -> str:
    prefix = "".join(c.upper() for c in name if c.isalpha())[:3]
    while len(prefix) < 3:
        prefix += "X"
    digits = "".join(random.choices(string.digits, k=4))
    return f"{prefix}-{digits}"


def _doses_for_patient(patient_id: int, session: Session) -> list[Dose]:
    stmt = (
        select(Dose)
        .join(Medicine, Dose.medicine_id == Medicine.id)
        .where(Dose.patient_id == patient_id)
        .order_by(Dose.scheduled_at)
    )
    return session.exec(stmt).all()


@router.get("/caregiver/patients", response_model=list[CaregiverPatientResponse])
def list_caregiver_patients(
    current_user: User = Depends(require_role("caregiver")),
):
    with Session(engine) as session:
        links = session.exec(
            select(CaregiverLink).where(CaregiverLink.caregiver_id == current_user.id)
        ).all()
        result = []
        for link in links:
            patient = session.get(User, link.patient_id)
            if not patient:
                continue
            doses = _doses_for_patient(patient.id, session)
            today = utcnow().date()
            todays_doses = [d for d in doses if d.scheduled_at.date() == today]
            taken = sum(1 for d in todays_doses if d.status == DoseStatus.CONFIRMED)
            missed = sum(1 for d in todays_doses if d.status == DoseStatus.MISSED)
            week_ago = utcnow() - timedelta(days=7)
            week_doses = [d for d in doses if d.scheduled_at >= week_ago]
            if week_doses:
                adherence = round(sum(1 for d in week_doses if d.status == DoseStatus.CONFIRMED) / len(week_doses) * 100)
            else:
                adherence = 0
            result.append({
                "id": patient.id,
                "name": patient.name,
                "phone": patient.phone,
                "today": {"taken": taken, "total": len(todays_doses), "missed": missed},
                "adherence_7d": adherence,
            })
        return result


@router.post("/caregiver/patients", response_model=CreatePatientResponse)
def create_caregiver_patient(
    body: CreatePatientRequest,
    current_user: User = Depends(require_role("caregiver")),
):
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.phone == body.phone)).first()
        if existing:
            return {"id": existing.id}

        invite_code = _generate_invite_code(body.name)
        patient = User(
            name=body.name,
            phone=body.phone,
            email=None,
            role=UserRole.patient,
            password_hash=hash_password(""),
            invite_code=invite_code,
        )
        session.add(patient)
        session.commit()
        session.refresh(patient)

        link = CaregiverLink(patient_id=patient.id, caregiver_id=current_user.id)
        session.add(link)
        session.commit()

        return {"id": patient.id}


@router.put("/caregiver/settings", response_model=SettingsResponse)
def update_settings(
    body: SettingsRequest,
    current_user: User = Depends(require_role("caregiver")),
):
    if body.alert_mode not in ("every", "summary"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid alert_mode")

    with Session(engine) as session:
        setting = session.exec(select(Setting).where(Setting.caregiver_id == current_user.id)).first()
        if not setting:
            setting = Setting(caregiver_id=current_user.id)
            session.add(setting)
        setting.alert_mode = body.alert_mode
        session.add(setting)
        session.commit()
        session.refresh(setting)
        return {"alert_mode": setting.alert_mode}
