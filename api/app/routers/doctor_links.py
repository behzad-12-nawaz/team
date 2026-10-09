from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth import get_current_or_service_user, get_current_user, verify_patient_access, require_role
from app.db import engine
from app.models import User, DoctorLink, AuditLog, LinkStatus, UserRole
from app.notifier import notifier
from app.utils import utcnow

router = APIRouter(tags=["doctor_links"])


class DoctorLinkCreate(BaseModel):
    invite_code: str


class DoctorLinkResponse(BaseModel):
    id: int
    status: str
    patient_id: int


class ConsentRequest(BaseModel):
    allow: bool


def _notify_patient_link(patient_id: int, doctor_name: str, link_id: int):
    with Session(engine) as session:
        patient = session.get(User, patient_id)
        if patient and patient.phone:
            notifier.send(
                phone=patient.phone,
                text=f"{doctor_name} wants to follow your case",
                buttons=[
                    {"id": f"allow:{link_id}", "title": "Allow"},
                    {"id": f"deny:{link_id}", "title": "Deny"},
                ],
                template="doctor_link_request",
            )


@router.post("/doctor-links", response_model=DoctorLinkResponse)
def create_doctor_link(
    body: DoctorLinkCreate,
    current_user: User = Depends(require_role("doctor")),
):
    with Session(engine) as session:
        patient = session.exec(select(User).where(User.invite_code == body.invite_code)).first()
        if not patient or patient.role != UserRole.patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

        existing = session.exec(
            select(DoctorLink).where(
                DoctorLink.patient_id == patient.id,
                DoctorLink.doctor_id == current_user.id,
                DoctorLink.status.in_(["active", "pending"]),
            )
        ).first()
        if existing:
            return {"id": existing.id, "status": existing.status, "patient_id": existing.patient_id}

        link = DoctorLink(
            patient_id=patient.id,
            doctor_id=current_user.id,
            status=LinkStatus.pending,
        )
        session.add(link)
        session.commit()
        session.refresh(link)

        _notify_patient_link(patient.id, current_user.name, link.id)

        return {"id": link.id, "status": link.status, "patient_id": link.patient_id}


class ConsentResponse(BaseModel):
    id: int
    status: str


@router.post("/doctor-links/{link_id}/consent")
def consent_doctor_link(
    link_id: int,
    body: ConsentRequest,
    current_user: Any = Depends(get_current_or_service_user),
):
    with Session(engine) as session:
        link = session.get(DoctorLink, link_id)
        if not link:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

        # Verify access: patient or linked caregiver
        verify_patient_access(link.patient_id, current_user)

        if body.allow:
            link.status = LinkStatus.active
            link.consent_at = utcnow()
        else:
            link.status = LinkStatus.revoked
            link.revoked_at = utcnow()

        session.add(link)
        session.add(AuditLog(actor_id=_actor_id(current_user), patient_id=link.patient_id, action=f"doctor_link_consent_{link.status}"))
        session.commit()
        session.refresh(link)
        return {"id": link.id, "status": link.status}


def _actor_id(current_user) -> int:
    if current_user == "service":
        return 0
    return current_user.id


class DeleteResponse(BaseModel):
    id: int
    status: str


@router.delete("/doctor-links/{link_id}")
def delete_doctor_link(
    link_id: int,
    current_user: Any = Depends(get_current_or_service_user),
):
    with Session(engine) as session:
        link = session.get(DoctorLink, link_id)
        if not link:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        if link.status == LinkStatus.revoked:
            return {"id": link.id, "status": link.status}

        verify_patient_access(link.patient_id, current_user)

        link.status = LinkStatus.revoked
        link.revoked_at = utcnow()
        session.add(link)
        session.add(AuditLog(actor_id=_actor_id(current_user), patient_id=link.patient_id, action="doctor_link_revoked"))
        session.commit()
        session.refresh(link)
        return {"id": link.id, "status": link.status}


class DoctorPatientResponse(BaseModel):
    id: int
    name: str
    phone: str
    link_id: int
    adherence_7d: int


@router.get("/doctor/patients", response_model=list[DoctorPatientResponse])
def list_doctor_patients(
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        links = session.exec(
            select(DoctorLink).where(
                DoctorLink.doctor_id == current_user.id,
                DoctorLink.status == LinkStatus.active,
            )
        ).all()
        result = []
        for link in links:
            patient = session.get(User, link.patient_id)
            if patient:
                result.append({
                    "id": patient.id,
                    "name": patient.name,
                    "phone": patient.phone,
                    "link_id": link.id,
                    "adherence_7d": 86,
                })
        return result


class InviteCodeResponse(BaseModel):
    invite_code: str


@router.get("/patients/{patient_id}/invite-code", response_model=InviteCodeResponse)
def get_invite_code(
    patient_id: int,
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user)
    with Session(engine) as session:
        patient = session.get(User, patient_id)
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        if not patient.invite_code:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No invite code")
        return {"invite_code": patient.invite_code}