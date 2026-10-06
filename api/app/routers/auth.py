from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth import verify_password, create_access_token, require_role, patient_access
from app.config import settings
from app.db import engine
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(
    body: LoginRequest,
):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == body.email)).first()
        if not user or not verify_password(body.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        token = create_access_token({"sub": str(user.id), "role": user.role})
        return {"access_token": token, "role": user.role, "user_id": user.id}


@router.get("/test-patient-access/{patient_id}")
def test_patient_access(
    patient_id: int,
    current_user: User = Depends(patient_access),
):
    return {"patient_id": patient_id, "user_id": current_user.id}
