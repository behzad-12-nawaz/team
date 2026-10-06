from fastapi import FastAPI

from app.routers import auth

app = FastAPI(title="DoseCare API", version="0.1.0")
app.include_router(auth.router)


@app.get("/")
def root():
    return {"ok": True}
