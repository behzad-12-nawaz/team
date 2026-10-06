from datetime import datetime, timedelta, time
from typing import Any
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlmodel import Session, select, delete

from app.auth import get_current_user, get_current_or_service_user, patient_access, verify_patient_access
from app.config import settings
from app.db import engine
from app.models import (
    User, Prescription, Medicine, Dose,
    PrescriptionStatus, DoseStatus,
)
from app.notifier import notifier
from app.utils import utcnow

router = APIRouter(prefix="", tags=["prescriptions"])


class PrescriptionCreate(BaseModel):
    patient_id: int
    prescribed_by: int | None = None
    supersedes_id: int | None = None
    medicines: list[dict[str, Any]]


class PrescriptionResponse(BaseModel):
    id: int
    status: str
    version: int


class MedicineResponse(BaseModel):
    name: str
    dose: str
    times: list[str]
    days: int
    instructions: str | None = None


class PrescriptionWithMedicines(BaseModel):
    id: int
    status: str
    version: int
    medicines: list[MedicineResponse]


class DoseResponse(BaseModel):
    id: int
    medicine: str
    dose: str
    scheduled_at: datetime
    status: str
    reminder_count: int


def pkt_to_utc(date: datetime.date, time_str: str) -> datetime:
    hour, minute = map(int, time_str.split(":"))
    utc_hour = hour - 5
    if utc_hour < 0:
        utc_hour += 24
        date = date - timedelta(days=1)
    return datetime.combine(date, time(hour=utc_hour, minute=minute))


@router.post("/prescriptions", response_model=PrescriptionResponse)
def create_prescription(
    body: PrescriptionCreate,
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(body.patient_id, current_user)
    with Session(engine) as session:
        status = PrescriptionStatus.draft if body.prescribed_by is None else PrescriptionStatus.waiting_patient
        prescription = Prescription(
            patient_id=body.patient_id,
            prescribed_by=body.prescribed_by,
            status=status,
            version=1,
            supersedes_id=body.supersedes_id,
        )
        session.add(prescription)
        session.commit()
        session.refresh(prescription)

        for m in body.medicines:
            medicine = Medicine(
                prescription_id=prescription.id,
                name=m["name"],
                dose=m["dose"],
                times=json.dumps(m["times"]),
                days=m["days"],
                instructions=m.get("instructions"),
            )
            session.add(medicine)
        session.commit()

        if body.prescribed_by is not None:
            patient = session.get(User, body.patient_id)
            if patient and patient.phone:
                prescriber = session.get(User, body.prescribed_by)
                prescriber_name = prescriber.name if prescriber else "a doctor"
                notifier.send(
                    phone=patient.phone,
                    text=f"New prescription from {prescriber_name}",
                    buttons=[
                        {"id": f"confirm:{prescription.id}", "title": "Confirm"},
                        {"id": f"reject:{prescription.id}", "title": "Reject"},
                    ],
                    template="prescription_request",
                )

        return {"id": prescription.id, "status": prescription.status, "version": prescription.version}


@router.post("/prescriptions/{prescription_id}/confirm")
def confirm_prescription(
    prescription_id: int,
    current_user: Any = Depends(get_current_or_service_user),
):
    with Session(engine) as session:
        prescription = session.get(Prescription, prescription_id)
        if not prescription:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        verify_patient_access(prescription.patient_id, current_user)

        if prescription.status not in (PrescriptionStatus.waiting_patient, PrescriptionStatus.draft):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot confirm")

        if prescription.supersedes_id:
            old = session.get(Prescription, prescription.supersedes_id)
            if old:
                old.status = PrescriptionStatus.superseded
                session.add(old)
                old_medicines = session.exec(select(Medicine).where(Medicine.prescription_id == old.id)).all()
                for om in old_medicines:
                    session.execute(
                        delete(Dose).where(
                            Dose.medicine_id == om.id,
                            Dose.status == DoseStatus.SCHEDULED,
                            Dose.scheduled_at >= utcnow(),
                        )
                    )
                session.commit()

        prescription.status = PrescriptionStatus.active
        session.add(prescription)
        session.commit()
        session.refresh(prescription)

        medicines = session.exec(select(Medicine).where(Medicine.prescription_id == prescription.id)).all()
        doses_created = 0
        today = utcnow().date()
        start_date = today + timedelta(days=1)

        for medicine in medicines:
            times = json.loads(medicine.times)
            for day in range(medicine.days):
                date = start_date + timedelta(days=day)
                for time_str in times:
                    scheduled_at = pkt_to_utc(date, time_str)
                    dose = Dose(
                        medicine_id=medicine.id,
                        patient_id=prescription.patient_id,
                        scheduled_at=scheduled_at,
                        status=DoseStatus.SCHEDULED,
                    )
                    session.add(dose)
                    doses_created += 1

        session.commit()
        return {"id": prescription.id, "status": "active", "doses_created": doses_created}


@router.post("/prescriptions/{prescription_id}/reject")
def reject_prescription(
    prescription_id: int,
    current_user: Any = Depends(get_current_or_service_user),
):
    with Session(engine) as session:
        prescription = session.get(Prescription, prescription_id)
        if not prescription:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        verify_patient_access(prescription.patient_id, current_user)
        prescription.status = PrescriptionStatus.rejected
        session.add(prescription)
        session.commit()
        return {"id": prescription.id, "status": "rejected"}


@router.get("/patients/{patient_id}/prescriptions")
def list_prescriptions(
    patient_id: int,
    status: str | None = Query(None),
    current_user: User = Depends(patient_access),
):
    with Session(engine) as session:
        query = select(Prescription).where(Prescription.patient_id == patient_id)
        if status:
            query = query.where(Prescription.status == status)
        prescriptions = session.exec(query).all()

        result = []
        for p in prescriptions:
            medicines = session.exec(select(Medicine).where(Medicine.prescription_id == p.id)).all()
            meds = [
                {
                    "name": m.name,
                    "dose": m.dose,
                    "times": json.loads(m.times),
                    "days": m.days,
                    "instructions": m.instructions,
                }
                for m in medicines
            ]
            result.append({
                "id": p.id,
                "status": p.status,
                "version": p.version,
                "medicines": meds,
            })
        return result


@router.get("/patients/{patient_id}/doses")
def list_doses(
    patient_id: int,
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    current_user: User = Depends(patient_access),
):
    with Session(engine) as session:
        query = select(Dose).where(Dose.patient_id == patient_id)
        if from_date:
            query = query.where(Dose.scheduled_at >= from_date)
        if to_date:
            query = query.where(Dose.scheduled_at <= to_date)
        doses = session.exec(query).all()

        result = []
        for d in doses:
            medicine = session.get(Medicine, d.medicine_id)
            result.append({
                "id": d.id,
                "medicine": medicine.name if medicine else "",
                "dose": medicine.dose if medicine else "",
                "scheduled_at": d.scheduled_at,
                "status": d.status,
                "reminder_count": d.reminder_count,
            })
        return result