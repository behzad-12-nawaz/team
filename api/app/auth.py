from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt import DecodeError, encode as jwt_encode, decode as jwt_decode
from passlib.context import CryptContext
from sqlmodel import Session, select

from app.config import settings
from app.db import engine
from app.models import User, DoctorLink, CaregiverLink, AuditLog

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=60))
    to_encode.update({"exp": expire})
    return jwt_encode(to_encode, settings.JWT_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt_decode(token, settings.JWT_SECRET, algorithms=["HS256"])


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except DecodeError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    with Session(engine) as session:
        user = session.get(User, int(user_id))
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user


def require_role(*allowed_roles: str) -> Callable[[User], User]:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return current_user
    return dependency


def verify_patient_access(patient_id: int, current_user: User | str):
    if current_user == "service":
        return
    with Session(engine) as session:
        patient = session.get(User, patient_id)
        if patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if current_user.role == "patient":
        if current_user.id != patient_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    elif current_user.role == "caregiver":
        with Session(engine) as session:
            link = session.exec(
                select(CaregiverLink).where(
                    CaregiverLink.patient_id == patient_id,
                    CaregiverLink.caregiver_id == current_user.id,
                )
            ).first()
            if link is None:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    elif current_user.role == "doctor":
        with Session(engine) as session:
            link = session.exec(
                select(DoctorLink).where(
                    DoctorLink.patient_id == patient_id,
                    DoctorLink.doctor_id == current_user.id,
                    DoctorLink.status == "active",
                )
            ).first()
            if link is None:
                session.add(AuditLog(actor_id=current_user.id, patient_id=patient_id, action="access_denied_no_active_link"))
                session.commit()
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this patient has ended")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORIDDEN, detail="Forbidden")


def patient_access(
    patient_id: int,
    current_user: User = Depends(get_current_user),
) -> User:
    verify_patient_access(patient_id, current_user)
    return current_user


def get_service_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    if credentials.credentials == settings.BOT_SERVICE_TOKEN:
        return "service"
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_or_service_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Any:
    token = credentials.credentials
    if token == settings.BOT_SERVICE_TOKEN:
        return "service"
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except DecodeError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    with Session(engine) as session:
        user = session.get(User, int(user_id))
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
