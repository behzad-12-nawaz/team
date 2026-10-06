from fastapi import FastAPI

app = FastAPI(title="DoseCare API", version="0.1.0")


@app.get("/")
def root():
    return {"ok": True}
