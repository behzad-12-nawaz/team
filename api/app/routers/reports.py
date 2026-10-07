from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response, JSONResponse
from sqlmodel import Session, select

from app.auth import get_current_user, verify_patient_access
from app.db import engine
from app.models import Dose, Medicine, User, Prescription, PrescriptionStatus
from app.utils import utcnow

try:
    from app.reports import make_weekly_pdf
    if make_weekly_pdf is None:
        raise ImportError
except (ImportError, AttributeError):
    make_weekly_pdf = None

router = APIRouter(tags=["reports"])


def _week_bounds(now: datetime) -> tuple[str, str]:
    today = now.date()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return monday.isoformat(), sunday.isoformat()


def _build_weekly_report(patient_id: int, session: Session) -> dict:
    patient = session.get(User, patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    week_start, week_end = _week_bounds(utcnow())
    week_start_dt = datetime.strptime(week_start, "%Y-%m-%d")
    week_end_dt = datetime.strptime(week_end, "%Y-%m-%d") + timedelta(days=1)

    doses = session.exec(
        select(Dose).where(
            Dose.patient_id == patient_id,
            Dose.scheduled_at >= week_start_dt,
            Dose.scheduled_at < week_end_dt,
        ).order_by(Dose.scheduled_at)
    ).all()

    rows = []
    taken_count = 0
    total = len(doses)
    for d in doses:
        med = session.get(Medicine, d.medicine_id)
        med_str = f"{med.name} {med.dose}" if med else "dose"
        rows.append({
            "date": d.scheduled_at.date().isoformat(),
            "medicine": med_str,
            "status": d.status,
        })
        if d.status == "CONFIRMED" or d.status == "CONFIRMED_LATE":
            taken_count += 1

    adherence = round(taken_count / total * 100) if total > 0 else 0

    return {
        "patient_name": patient.name,
        "week_start": week_start,
        "week_end": week_end,
        "adherence": adherence,
        "rows": rows,
    }


@router.get("/reports/{patient_id}/weekly")
def weekly_report(
    patient_id: int,
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user)
    with Session(engine) as session:
        return _build_weekly_report(patient_id, session)


@router.get("/reports/{patient_id}/weekly.pdf")
def weekly_report_pdf(
    patient_id: int,
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user)
    if make_weekly_pdf is None:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="PDF generation not available")

    with Session(engine) as session:
        report = _build_weekly_report(patient_id, session)
        pdf_bytes = make_weekly_pdf(report)
        return Response(content=pdf_bytes, media_type="application/pdf")
