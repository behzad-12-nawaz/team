from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import Session, select

from app.db import engine
from app.models import Dose, Medicine, User, CaregiverLink, Setting, DoseStatus
from app.notifier import notifier
from app.utils import utcnow

REMINDER_INTERVAL_MINUTES = 5
MAX_REMINDERS = 3


def _medicine_for(dose: Dose, session: Session) -> Medicine | None:
    return session.get(Medicine, dose.medicine_id)


def _format_utc_to_pkt_time(utc_dt: datetime) -> str:
    pkt_dt = utc_dt + timedelta(hours=5)
    return pkt_dt.strftime("%I:%M %p").lstrip("0")


def _reminder_buttons(dose_id: int):
    return [
        {"id": f"taken:{dose_id}", "title": "Taken"},
        {"id": f"skip:{dose_id}", "title": "Skip"},
        {"id": f"snooze:{dose_id}", "title": "Snooze 15 min"},
    ]


def _patient_phone(dose: Dose, session: Session) -> str | None:
    patient = session.get(User, dose.patient_id)
    return patient.phone if patient else None


def _caregivers(dose: Dose, session: Session) -> list[tuple[str, int]]:
    result = []
    links = session.exec(
        select(CaregiverLink).where(CaregiverLink.patient_id == dose.patient_id)
    ).all()
    for link in links:
        caregiver = session.get(User, link.caregiver_id)
        if caregiver and caregiver.phone:
            setting = session.exec(
                select(Setting).where(Setting.caregiver_id == link.caregiver_id)
            ).first()
            alert_mode = setting.alert_mode if setting else "every"
            result.append((caregiver.phone, alert_mode))
    return result


def _notify_both(dose: Dose, session: Session):
    med = _medicine_for(dose, session)
    med_name = med.name if med else "dose"
    med_dose = med.dose if med else ""
    time_str = _format_utc_to_pkt_time(dose.scheduled_at)
    text = f"Time for {med_name} {med_dose} ({time_str})"
    buttons = _reminder_buttons(dose.id)
    template = "dose_reminder"

    patient_phone = _patient_phone(dose, session)
    if patient_phone:
        notifier.send(phone=patient_phone, text=text, buttons=buttons, template=template)

    for phone, alert_mode in _caregivers(dose, session):
        if alert_mode == "every":
            notifier.send(phone=phone, text=text, buttons=buttons, template=template)


def _notify_caregiver_final(dose: Dose, session: Session):
    med = _medicine_for(dose, session)
    med_name = med.name if med else "dose"
    med_dose = med.dose if med else ""
    time_str = _format_utc_to_pkt_time(dose.scheduled_at)
    text = f"MISSED: {med_name} {med_dose} ({time_str})"

    for phone, alert_mode in _caregivers(dose, session):
        if alert_mode == "every":
            notifier.send(phone=phone, text=text, buttons=None, template="dose_missed")


def tick(now: datetime | None = None):
    if now is None:
        now = utcnow()

    with Session(engine) as session:
        # Loop 1: SCHEDULED with scheduled_at <= now -> NOTIFIED
        sched_doses = session.exec(
            select(Dose).where(
                Dose.status == DoseStatus.SCHEDULED,
                Dose.scheduled_at <= now,
            )
        ).all()
        for d in sched_doses:
            _notify_both(d, session)
            d.status = DoseStatus.NOTIFIED
            d.reminder_count = 1
            d.last_reminded_at = now
            session.add(d)
        session.commit()

        # Loop 2: NOTIFIED, reminder_count < 3, last_reminded_at <= now - 5min -> increment
        retry_doses = session.exec(
            select(Dose).where(
                Dose.status == DoseStatus.NOTIFIED,
                Dose.reminder_count < MAX_REMINDERS,
                Dose.last_reminded_at <= now - timedelta(minutes=REMINDER_INTERVAL_MINUTES),
            )
        ).all()
        for d in retry_doses:
            _notify_both(d, session)
            d.reminder_count += 1
            d.last_reminded_at = now
            session.add(d)
        session.commit()

        # Loop 3: NOTIFIED, reminder_count >= 3, last_reminded_at <= now - 5min -> MISSED
        final_doses = session.exec(
            select(Dose).where(
                Dose.status == DoseStatus.NOTIFIED,
                Dose.reminder_count >= MAX_REMINDERS,
                Dose.last_reminded_at <= now - timedelta(minutes=REMINDER_INTERVAL_MINUTES),
            )
        ).all()
        for d in final_doses:
            d.status = DoseStatus.MISSED
            session.add(d)
            _notify_caregiver_final(d, session)
        session.commit()


_scheduler: BackgroundScheduler | None = None


def start_scheduler():
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler()
        _scheduler.add_job(lambda: tick(), "interval", seconds=60, id="reminder_tick")
        _scheduler.start()


def stop_scheduler():
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown()
        _scheduler = None
