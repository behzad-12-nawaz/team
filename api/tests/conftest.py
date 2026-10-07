import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///./test_dosecare.db"
os.environ["JWT_SECRET"] = "test-secret-for-pytest-only"
os.environ["NOTIFIER"] = "console"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from sqlmodel import SQLModel, Session, create_engine
from fastapi.testclient import TestClient
from datetime import datetime

from app.config import settings
from app.db import engine
from app.models import (
    User, CaregiverLink, DoctorLink, Prescription, Medicine, Dose, Setting,
    UserRole, PrescriptionStatus, LinkStatus, DoseStatus,
)
from app.auth import hash_password
from app.engine import stop_scheduler


TEST_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test_dosecare.db")
OUTBOX_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "outbox.log")


@pytest.fixture(autouse=True)
def test_db():
    """Create a fresh test database before each test and clean up after."""
    stop_scheduler()

    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    if os.path.exists(OUTBOX_PATH):
        os.remove(OUTBOX_PATH)

    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        _seed_data(session)

    yield engine

    stop_scheduler()
    engine.dispose()
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    if os.path.exists(OUTBOX_PATH):
        os.remove(OUTBOX_PATH)


@pytest.fixture
def client(test_db):
    stop_scheduler()
    with TestClient(app) as c:
        yield c
    stop_scheduler()
    engine.dispose()


# Import app AFTER env vars are set
from app.main import app


def _seed_data(session: Session):
    session.add(User(id=1, name="Ali Khan", phone="923001234567",
                     email="ali@example.com", role=UserRole.patient,
                     password_hash=hash_password("patient123"), invite_code="ALI-4821"))
    session.add(User(id=2, name="Saba Khan", phone="923009999999",
                     email="saba@example.com", role=UserRole.caregiver,
                     password_hash=hash_password("caregiver123"), invite_code=None))
    session.add(User(id=3, name="Dr. Ahmed", phone="923008888888",
                     email="dr.ahmed@example.com", role=UserRole.doctor,
                     password_hash=hash_password("doctor123"), invite_code=None))
    session.commit()

    session.add(CaregiverLink(patient_id=1, caregiver_id=2))
    session.add(DoctorLink(id=7, patient_id=1, doctor_id=3, status=LinkStatus.active,
                           consent_at=datetime(2026, 10, 1, 10, 0, 0), revoked_at=None))
    session.commit()

    session.add(Prescription(id=11, patient_id=1, prescribed_by=None,
                             status=PrescriptionStatus.active, version=1, supersedes_id=None))
    session.add(Medicine(id=1, prescription_id=11, name="Metformin", dose="500 mg",
                         times='["08:00","20:00"]', days=30, instructions="after meals"))
    session.add(Medicine(id=2, prescription_id=11, name="Amlodipine", dose="5 mg",
                         times='["09:00"]', days=30, instructions=None))
    session.commit()

    session.add(Dose(id=101, medicine_id=1, patient_id=1, scheduled_at=datetime(2026, 10, 5, 3, 0, 0),
                     status=DoseStatus.CONFIRMED, reminder_count=1,
                     last_reminded_at=datetime(2026, 10, 5, 2, 50, 0), snoozed=False,
                     replied_at=datetime(2026, 10, 5, 3, 5, 0)))
    session.add(Dose(id=102, medicine_id=2, patient_id=1, scheduled_at=datetime(2026, 10, 5, 4, 0, 0),
                     status=DoseStatus.MISSED, reminder_count=3,
                     last_reminded_at=datetime(2026, 10, 5, 3, 50, 0), snoozed=False,
                     replied_at=None))
    session.add(Dose(id=103, medicine_id=1, patient_id=1, scheduled_at=datetime(2026, 10, 5, 15, 0, 0),
                     status=DoseStatus.NOTIFIED, reminder_count=2,
                     last_reminded_at=datetime(2026, 10, 5, 14, 50, 0), snoozed=False,
                     replied_at=None))
    session.add(Dose(id=104, medicine_id=1, patient_id=1, scheduled_at=datetime(2026, 10, 6, 3, 0, 0),
                     status=DoseStatus.SCHEDULED, reminder_count=0, last_reminded_at=None,
                     snoozed=False, replied_at=None))
    session.commit()
