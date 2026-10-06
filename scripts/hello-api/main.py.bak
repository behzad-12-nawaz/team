from fastapi import FastAPI

app = FastAPI(title="DoseCare Hello API")

@app.get("/")
def hello():
    return {"hello": "dosecare-api"}

@app.get("/health")
def health():
    return {"status": "ok"}
