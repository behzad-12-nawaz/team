import os
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from sqlmodel import SQLModel, select, Session
from app.config import settings
from app.db import engine
from app.models import (
    User, CaregiverLink, DoctorLink, Prescription, Medicine, Dose, AuditLog,
    UserRole, PrescriptionStatus, LinkStatus, DoseStatus,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

USERS = [
    {"id": 1, "name": "Ali Khan", "phone": "923001234567", "email": "ali@example.com", "role": UserRole.patient, "password": "patient123"},
    {"id": 2, "name": "Saba Khan", "phone": "923009999999", "email": "saba@example.com", "role": UserRole.caregiver, "password": "caregiver123"},
    {"id": 3, "name": "Dr. Ahmed", "phone": "923008888888", "email": "dr.ahmed@example.com", "role": UserRole.doctor, "password": "doctor123"},
]

CAREGIVER_LINKS = [(1, 2)]
DOCTOR_LINK = {"id": 7, "patient_id": 1, "doctor_id": 3, "status": LinkStatus.active, "consent_at": datetime.now(timezone.utc), "revoked_at": None}

PRESCRIPTION = {"id": 11, "patient_id": 1, "prescribed_by": None, "status": PrescriptionStatus.active, "version": 1, "supersedes_id": None}
MEDICINES = [
    {"prescription_id": 11, "name": "Metformin", "dose": "500 mg", "times": '["08:00","20:00"]', "days": 30, "instructions": "after meals"},
    {"prescription_id": 11, "name": "Amlodipine", "dose": "5 mg", "times": '["09:00"]', "days": 30, "instructions": None},
]
DOSES = [
    {"id": 101, "medicine_id": 1, "patient_id": 1, "scheduled_at": datetime(2026, 10, 5, 3, 0, 0, tzinfo=timezone.utc), "status": DoseStatus.CONFIRMED, "reminder_count": 1, "last_reminded_at": datetime(2026, 10, 5, 2, 50, 0, tzinfo=timezone.utc), "snoozed": False, "replied_at": datetime(2026, 10, 5, 3, 5, 0, tzinfo=timezone.utc)},
    {"id": 102, "medicine_id": 2, "patient_id": 1, "scheduled_at": datetime(2026, 10, 5, 4, 0, 0, tzinfo=timezone.utc), "status": DoseStatus.MISSED, "reminder_count": 3, "last_reminded_at": datetime(2026, 10, 5, 3, 50, 0, tzinfo=timezone.utc), "snoozed": False, "replied_at": None},
    {"id": 103, "medicine_id": 1, "patient_id": 1, "scheduled_at": datetime(2026, 10, 5, 15, 0, 0, tzinfo=timezone.utc), "status": DoseStatus.NOTIFIED, "reminder_count": 2, "last_reminded_at": datetime(2026, 10, 5, 14, 50, 0, tzinfo=timezone.utc), "snoozed": False, "replied_at": None},
    {"id": 104, "medicine_id": 1, "patient_id": 1, "scheduled_at": datetime(2026, 10, 6, 3, 0, 0, tzinfo=timezone.utc), "status": DoseStatus.SCHEDULED, "reminder_count": 0, "last_reminded_at": None, "snoozed": False, "replied_at": None},
]


def get_or_create(session: Session, model, defaults=None, **kwargs):
    instance = session.exec(select(model).filter_by(**kwargs)).first()
    if instance:
        return instance, False
    else:
        params = dict(kwargs)
        if defaults:
            params.update(defaults)
        instance = model(**params)
        session.add(instance)
        return instance, True


def main():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        for u in USERS:
            get_or_create(
                session,
                User,
                phone=u["phone"],
                defaults={"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"], "password_hash": pwd_context.hash(u["password"])},
            )
        for pid, cid in CAREGIVER_LINKS:
            get_or_create(session, CaregiverLink, patient_id=pid, caregiver_id=cid)
        get_or_create(session, DoctorLink, id=DOCTOR_LINK["id"], defaults=DOCTOR_LINK)
        get_or_create(session, Prescription, id=PRESCRIPTION["id"], defaults=PRESCRIPTION)
        for m in MEDICINES:
            get_or_create(session, Medicine, prescription_id=m["prescription_id"], name=m["name"], dose=m["dose"], defaults=m)
        for d in DOSES:
            get_or_create(session, Dose, id=d["id"], defaults=d)
        session.commit()
    print("seed done")


if __name__ == "__main__":
    main()
