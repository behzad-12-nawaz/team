from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import UniqueConstraint, Index, Enum as SQLEnum, Text
from enum import Enum


class UserRole(str, Enum):
    patient = "patient"
    caregiver = "caregiver"
    doctor = "doctor"


class PrescriptionStatus(str, Enum):
    draft = "draft"
    waiting_patient = "waiting_patient"
    active = "active"
    rejected = "rejected"
    stopped = "stopped"
    superseded = "superseded"


class LinkStatus(str, Enum):
    pending = "pending"
    active = "active"
    revoked = "revoked"


class DoseStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    NOTIFIED = "NOTIFIED"
    CONFIRMED = "CONFIRMED"
    SKIPPED = "SKIPPED"
    MISSED = "MISSED"
    CONFIRMED_LATE = "CONFIRMED_LATE"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    name: str
    phone: str = Field(index=True, unique=True)
    email: str | None = Field(default=None, index=True, unique=True)
    role: UserRole
    password_hash: str


class CaregiverLink(SQLModel, table=True):
    __tablename__ = "caregiver_links"
    __table_args__ = (UniqueConstraint("patient_id", "caregiver_id"),)

    patient_id: int = Field(foreign_key="users.id", primary_key=True)
    caregiver_id: int = Field(foreign_key="users.id", primary_key=True)


class DoctorLink(SQLModel, table=True):
    __tablename__ = "doctor_links"

    id: int | None = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="users.id", index=True)
    doctor_id: int = Field(foreign_key="users.id", index=True)
    status: LinkStatus = Field(default=LinkStatus.pending)
    consent_at: datetime | None = Field(default=None)
    revoked_at: datetime | None = Field(default=None)


class Prescription(SQLModel, table=True):
    __tablename__ = "prescriptions"

    id: int | None = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="users.id", index=True)
    prescribed_by: int | None = Field(foreign_key="users.id", default=None)
    status: PrescriptionStatus = Field(default=PrescriptionStatus.draft)
    version: int = Field(default=1)
    supersedes_id: int | None = Field(foreign_key="prescriptions.id", default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Medicine(SQLModel, table=True):
    __tablename__ = "medicines"

    id: int | None = Field(default=None, primary_key=True)
    prescription_id: int = Field(foreign_key="prescriptions.id", index=True)
    name: str
    dose: str
    times: str
    days: int
    instructions: str | None = Field(default=None)


class Dose(SQLModel, table=True):
    __tablename__ = "doses"

    id: int | None = Field(default=None, primary_key=True)
    medicine_id: int = Field(foreign_key="medicines.id", index=True)
    patient_id: int = Field(foreign_key="users.id", index=True)
    scheduled_at: datetime = Field(index=True)
    status: DoseStatus = Field(default=DoseStatus.SCHEDULED, index=True)
    reminder_count: int = Field(default=0)
    last_reminded_at: datetime | None = Field(default=None)
    snoozed: bool = Field(default=False)
    replied_at: datetime | None = Field(default=None)


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_log"

    id: int | None = Field(default=None, primary_key=True)
    actor_id: int = Field(foreign_key="users.id")
    patient_id: int = Field(foreign_key="users.id")
    action: str
    at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Setting(SQLModel, table=True):
    __tablename__ = "settings"

    caregiver_id: int = Field(foreign_key="users.id", primary_key=True)
    alert_mode: str = Field(default="every")


Index("ix_doses_patient_scheduled", Dose.patient_id, Dose.scheduled_at)
Index("ix_doses_status_scheduled", Dose.status, Dose.scheduled_at)
Index("ix_doctor_links_patient_status", DoctorLink.patient_id, DoctorLink.status)
