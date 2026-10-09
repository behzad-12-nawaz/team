import os
import sys
from datetime import datetime

from passlib.context import CryptContext
from sqlmodel import SQLModel, select, Session

from app.config import settings
from app.db import engine
from app.models import (
    User, CaregiverLink, DoctorLink, Prescription, Medicine, Dose, AuditLog,
    UserRole, PrescriptionStatus, LinkStatus, DoseStatus,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TABLES_WITH_ID = ["users", "doctor_links", "prescriptions", "medicines", "doses", "audit_log"]

USERS = [
    {"id": 1, "name": "Ali Khan", "phone": "923001234567", "email": "ali@example.com", "role": UserRole.patient, "password": "patient123", "invite_code": "ALI-4821"},
    {"id": 2, "name": "Saba Khan", "phone": "923009999999", "email": "saba@example.com", "role": UserRole.caregiver, "password": "caregiver123", "invite_code": None},
    {"id": 3, "name": "Dr. Ahmed", "phone": "923008888888", "email": "dr.ahmed@example.com", "role": UserRole.doctor, "password": "doctor123", "invite_code": None},
]

CAREGIVER_LINKS = [(1, 2)]
DOCTOR_LINK = {"id": 7, "patient_id": 1, "doctor_id": 3, "status": LinkStatus.active, "consent_at": datetime(2026, 10, 1, 10, 0, 0), "revoked_at": None}

PRESCRIPTIONS = [
    {"id": 11, "patient_id": 1, "prescribed_by": None, "status": PrescriptionStatus.active, "version": 1, "supersedes_id": None},
    {"id": 15, "patient_id": 1, "prescribed_by": None, "status": PrescriptionStatus.active, "version": 1, "supersedes_id": None},
]
MEDICINES = [
    {"prescription_id": 11, "name": "Metformin", "dose": "500 mg", "times": '["08:00","20:00"]', "days": 30, "instructions": "after meals"},
    {"prescription_id": 11, "name": "Amlodipine", "dose": "5 mg", "times": '["09:00"]', "days": 30, "instructions": None},
    {"prescription_id": 15, "name": "Vitamin D", "dose": "1000 IU", "times": '["09:00"]', "days": 30, "instructions": None},
]
DOSES = [
    {"id": 101, "medicine_id": 1, "patient_id": 1, "scheduled_at": datetime(2026, 10, 5, 3, 0, 0), "status": DoseStatus.CONFIRMED, "reminder_count": 1, "last_reminded_at": datetime(2026, 10, 5, 2, 50, 0), "snoozed": False, "replied_at": datetime(2026, 10, 5, 3, 5, 0)},
    {"id": 102, "medicine_id": 2, "patient_id": 1, "scheduled_at": datetime(2026, 10, 5, 4, 0, 0), "status": DoseStatus.MISSED, "reminder_count": 3, "last_reminded_at": datetime(2026, 10, 5, 3, 50, 0), "snoozed": False, "replied_at": None},
    {"id": 103, "medicine_id": 1, "patient_id": 1, "scheduled_at": datetime(2026, 10, 5, 15, 0, 0), "status": DoseStatus.NOTIFIED, "reminder_count": 2, "last_reminded_at": datetime(2026, 10, 5, 14, 50, 0), "snoozed": False, "replied_at": None},
    {"id": 104, "medicine_id": 1, "patient_id": 1, "scheduled_at": datetime(2026, 10, 6, 3, 0, 0), "status": DoseStatus.SCHEDULED, "reminder_count": 0, "last_reminded_at": None, "snoozed": False, "replied_at": None},
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


def _reset_sequences(session: Session):
    for table in TABLES_WITH_ID:
        session.exec(
            text(
                f"SELECT setval(pg_get_serial_sequence('{table}','id'), "
                f"COALESCE((SELECT MAX(id) FROM {table}), 1), true)"
            )
        )
    session.commit()


from sqlalchemy import text


def main():
    SQLModel.metadata.create_all(engine)
    is_postgres = settings.DATABASE_URL.startswith("postgresql")

    if is_postgres:
        print("WARNING: Remote database detected.")
        print("This will modify data in the remote database.")
        if "--confirm-remote" not in sys.argv:
            print("Run with --confirm-remote flag to proceed.")
            sys.exit(1)

    with Session(engine) as session:
        for u in USERS:
            get_or_create(
                session,
                User,
                phone=u["phone"],
                defaults={"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"], "password_hash": pwd_context.hash(u["password"]), "invite_code": u.get("invite_code")},
            )
        for pid, cid in CAREGIVER_LINKS:
            get_or_create(session, CaregiverLink, patient_id=pid, caregiver_id=cid)
        get_or_create(session, DoctorLink, id=DOCTOR_LINK["id"], defaults=DOCTOR_LINK)
        for p in PRESCRIPTIONS:
            get_or_create(session, Prescription, id=p["id"], defaults=p)
        for m in MEDICINES:
            get_or_create(session, Medicine, prescription_id=m["prescription_id"], name=m["name"], dose=m["dose"], defaults=m)
        for d in DOSES:
            get_or_create(session, Dose, id=d["id"], defaults=d)
        session.commit()

        if is_postgres:
            _reset_sequences(session)

    print("seed done")


if __name__ == "__main__":
    main()
