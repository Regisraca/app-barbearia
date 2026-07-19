import os
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env to get EXPO_PUBLIC_BACKEND_URL
FRONTEND_ENV = Path(__file__).resolve().parents[2] / "frontend" / ".env"
load_dotenv(FRONTEND_ENV)

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL not set in frontend/.env")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api_client):
    r = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@barberbook.com", "password": "admin123"},
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def client_user(api_client):
    """Register a fresh client user for tests."""
    import uuid
    email = f"TEST_client_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "password": "clientpass123",
        "name": "TEST Client User",
        "phone": "+5511911112222",
    }
    r = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
    assert r.status_code == 200, f"Client register failed: {r.status_code} {r.text}"
    data = r.json()
    return {
        "token": data["access_token"],
        "user": data["user"],
        "email": email,
        "password": "clientpass123",
        "headers": {"Authorization": f"Bearer {data['access_token']}", "Content-Type": "application/json"},
    }


@pytest.fixture(scope="session")
def barber_user(api_client, admin_headers):
    """Create a barber via admin, then login as barber."""
    import uuid
    email = f"TEST_barber_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "password": "barberpass123",
        "name": "TEST Barber Joe",
        "phone": "+5511922223333",
        "bio": "Experienced barber",
        "specialties": ["fade", "beard"],
    }
    r = api_client.post(f"{BASE_URL}/api/barbers", json=payload, headers=admin_headers)
    assert r.status_code == 200, f"Barber create failed: {r.status_code} {r.text}"
    barber = r.json()

    # login barber
    lr = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": "barberpass123"},
    )
    assert lr.status_code == 200, f"Barber login failed: {lr.status_code} {lr.text}"
    token = lr.json()["access_token"]

    return {
        "profile": barber,
        "id": barber["id"],
        "email": email,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    }
