from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth import get_current_or_service_user, get_current_user
from app.db import engine
from app.models import Dose, Medicine, User, CaregiverLink, DoseStatus
from app.notifier import notifier
from app.utils import utcnow

router = APIRouter(tags=["doses"])


class ReplyRequest(BaseModel):
    action: str


class ReplyResponse(BaseModel):
    id: int
    status: str


@router.post("/doses/{dose_id}/reply")
def reply(
    dose_id: int,
    body: ReplyRequest,
    current_user: Any = Depends(get_current_or_service_user),
):
    if body.action not in ("taken", "skip", "snooze"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid action")

    with Session(engine) as session:
        dose = session.get(Dose, dose_id)
        if not dose:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

        if body.action == "taken":
            if dose.status == DoseStatus.MISSED:
                dose.status = DoseStatus.CONFIRMED_LATE
            else:
                dose.status = DoseStatus.CONFIRMED
        elif body.action == "skip":
            dose.status = DoseStatus.SKIPPED
        elif body.action == "snooze":
            if dose.snoozed:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Snooze already used for this dose",
                )
            dose.scheduled_at = dose.scheduled_at + timedelta(minutes=15)
            dose.reminder_count = 0
            dose.snoozed = True
            dose.status = DoseStatus.SCHEDULED

        dose.replied_at = utcnow()
        session.add(dose)
        session.commit()
        session.refresh(dose)

        # Notify caregiver
        patient = session.get(User, dose.patient_id)
        caregiver_links = session.exec(
            select(CaregiverLink).where(CaregiverLink.patient_id == dose.patient_id)
        ).all()
        if patient and caregiver_links:
            medicine = session.get(Medicine, dose.medicine_id)
            med_name = medicine.name if medicine else "dose"
            for link in caregiver_links:
                caregiver = session.get(User, link.caregiver_id)
                if caregiver and caregiver.phone:
                    notifier.send(
                        phone=caregiver.phone,
                        text=f"{patient.name} {body.action} {med_name}",
                        buttons=None,
                        template=None,
                    )

        return {"id": dose.id, "status": dose.status}
