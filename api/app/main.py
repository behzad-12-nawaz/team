from fastapi import FastAPI

from app.routers import auth, prescriptions

app = FastAPI(title="DoseCare API", version="0.1.0")
app.include_router(auth.router)
app.include_router(prescriptions.router)


@app.get("/")
def root():
    return {"ok": True}
