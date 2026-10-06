from fastapi import FastAPI

app = FastAPI(title="DoseCare Hello Bot")


@app.get("/")
def hello():
    return {"hello": "dosecare-bot"}


@app.get("/send")
def send():
    return {"sent": True}


@app.post("/send")
def send_post():
    return {"sent": True}
