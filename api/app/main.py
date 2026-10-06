from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.engine import start_scheduler, stop_scheduler
from app.routers import auth, prescriptions, doses, doctor_links


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="DoseCare API", version="0.1.0", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(prescriptions.router)
app.include_router(doses.router)
app.include_router(doctor_links.router)


@app.get("/")
def root():
    return {"ok": True}
