import os

import httpx
import pytest


@pytest.fixture(scope="session")
def client():
    base = os.environ.get("BASE_URL")
    if not base:
        pytest.exit(
            "BASE_URL is not set. Example: BASE_URL=http://localhost:9000 pytest",
            returncode=4,
        )
    with httpx.Client(base_url=base.rstrip("/"), timeout=10.0) as c:
        yield c


@pytest.fixture(scope="session")
def login_as(client):
    def _login(email: str) -> dict:
        r = client.post("/auth/login", json={"email": email, "password": "demo"})
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _login


@pytest.fixture(scope="session")
def auth(login_as):
    return login_as("caregiver@demo.pk")


@pytest.fixture(scope="session")
def doctor_auth(login_as):
    return login_as("doctor@demo.pk")
