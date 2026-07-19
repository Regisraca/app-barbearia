"""Backend regression tests for BarberBook API.

Covers auth, services, barbers, bookings and RBAC.
"""
import os
import uuid
from datetime import datetime, timedelta

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


# ============ AUTH ============
class TestAuth:
    def test_register_client_returns_token(self, api_client):
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@example.com"
        r = api_client.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": "pass12345", "name": "TEST Reg"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == email
        assert data["user"]["role"] == "client"
        assert "id" in data["user"]

    def test_register_duplicate_email_returns_400(self, api_client, client_user):
        r = api_client.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": client_user["email"],
                "password": "any12345",
                "name": "Dup",
            },
        )
        assert r.status_code == 400
        assert "already registered" in r.json()["detail"].lower()

    def test_login_admin_success(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@barberbook.com", "password": "admin123"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@barberbook.com"

    def test_login_wrong_password_returns_401(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@barberbook.com", "password": "wrongpass"},
        )
        assert r.status_code == 401

    def test_get_me_with_valid_token(self, api_client, admin_headers):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "admin@barberbook.com"
        assert data["role"] == "admin"

    def test_get_me_without_token_unauthorized(self, api_client):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code in (401, 403)


# ============ SERVICES ============
class TestServices:
    created_service_id = None

    def test_get_services_public(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/services")
        assert r.status_code == 200
        services = r.json()
        assert isinstance(services, list)
        assert len(services) >= 4  # 4 seeded
        for s in services:
            assert "id" in s and "name" in s and "price" in s
            assert "_id" not in s  # Mongo _id must not leak

    def test_admin_can_create_service(self, api_client, admin_headers):
        payload = {
            "name": f"TEST_Service_{uuid.uuid4().hex[:6]}",
            "description": "Test service",
            "price": 49.9,
            "duration_minutes": 30,
        }
        r = api_client.post(f"{BASE_URL}/api/services", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["price"] == 49.9
        assert "id" in data
        TestServices.created_service_id = data["id"]

        # Verify persistence via GET
        r2 = api_client.get(f"{BASE_URL}/api/services")
        assert any(s["id"] == data["id"] for s in r2.json())

    def test_client_cannot_create_service_403(self, api_client, client_user):
        r = api_client.post(
            f"{BASE_URL}/api/services",
            json={"name": "NoAllow", "price": 10, "duration_minutes": 10},
            headers=client_user["headers"],
        )
        assert r.status_code == 403

    def test_barber_cannot_create_service_403(self, api_client, barber_user):
        r = api_client.post(
            f"{BASE_URL}/api/services",
            json={"name": "NoAllow2", "price": 10, "duration_minutes": 10},
            headers=barber_user["headers"],
        )
        assert r.status_code == 403

    def test_admin_can_delete_service(self, api_client, admin_headers):
        # Create then delete
        payload = {
            "name": f"TEST_Del_{uuid.uuid4().hex[:6]}",
            "price": 20,
            "duration_minutes": 15,
        }
        r = api_client.post(f"{BASE_URL}/api/services", json=payload, headers=admin_headers)
        assert r.status_code == 200
        svc_id = r.json()["id"]

        d = api_client.delete(f"{BASE_URL}/api/services/{svc_id}", headers=admin_headers)
        assert d.status_code == 204

        # Verify removal
        listing = api_client.get(f"{BASE_URL}/api/services").json()
        assert not any(s["id"] == svc_id for s in listing)

    def test_client_cannot_delete_service_403(self, api_client, client_user):
        # Use any existing service id
        services = api_client.get(f"{BASE_URL}/api/services").json()
        assert services, "No services to test with"
        svc_id = services[0]["id"]
        r = api_client.delete(f"{BASE_URL}/api/services/{svc_id}", headers=client_user["headers"])
        assert r.status_code == 403


# ============ BARBERS ============
class TestBarbers:
    def test_admin_creates_barber_with_qr(self, barber_user):
        b = barber_user["profile"]
        assert b["id"]
        assert b["email"] == barber_user["email"]
        assert b["qr_code"] is not None
        assert b["qr_code"].startswith("data:image/png;base64,")
        assert "fade" in b["specialties"]
        assert b["bio"] == "Experienced barber"

    def test_get_barbers_list(self, api_client, barber_user):
        r = api_client.get(f"{BASE_URL}/api/barbers")
        assert r.status_code == 200
        barbers = r.json()
        assert isinstance(barbers, list)
        assert any(b["id"] == barber_user["id"] for b in barbers)
        for b in barbers:
            assert "qr_code" in b
            assert "specialties" in b
            assert "_id" not in b

    def test_get_barber_by_id(self, api_client, barber_user):
        r = api_client.get(f"{BASE_URL}/api/barbers/{barber_user['id']}")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == barber_user["id"]
        assert data["email"] == barber_user["email"]
        assert data["qr_code"] is not None

    def test_client_cannot_create_barber_403(self, api_client, client_user):
        r = api_client.post(
            f"{BASE_URL}/api/barbers",
            json={
                "email": f"nope_{uuid.uuid4().hex[:6]}@x.com",
                "password": "x123456",
                "name": "Nope",
            },
            headers=client_user["headers"],
        )
        assert r.status_code == 403

    def test_barber_cannot_create_barber_403(self, api_client, barber_user):
        r = api_client.post(
            f"{BASE_URL}/api/barbers",
            json={
                "email": f"nope2_{uuid.uuid4().hex[:6]}@x.com",
                "password": "x123456",
                "name": "Nope2",
            },
            headers=barber_user["headers"],
        )
        assert r.status_code == 403


# ============ BOOKINGS ============
class TestBookings:
    booking_id = None
    test_date = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
    test_time = "10:00"

    def _get_a_service_id(self, api_client):
        services = api_client.get(f"{BASE_URL}/api/services").json()
        assert services
        return services[0]["id"]

    def test_available_slots_full_before_booking(self, api_client, barber_user):
        r = api_client.get(
            f"{BASE_URL}/api/bookings/available-slots",
            params={"barber_id": barber_user["id"], "date": TestBookings.test_date},
        )
        assert r.status_code == 200
        slots = r.json()["available_slots"]
        # 9-18h * 2 slots = 18 slots (09:00..17:30)
        assert len(slots) == 18
        assert "09:00" in slots
        assert "17:30" in slots
        assert TestBookings.test_time in slots

    def test_client_creates_booking(self, api_client, client_user, barber_user):
        svc_id = self._get_a_service_id(api_client)
        payload = {
            "service_id": svc_id,
            "barber_id": barber_user["id"],
            "date": TestBookings.test_date,
            "time": TestBookings.test_time,
            "payment_method": "prepaid",
            "notes": "test booking",
        }
        r = api_client.post(f"{BASE_URL}/api/bookings", json=payload, headers=client_user["headers"])
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["client_id"] == client_user["user"]["id"]
        assert data["barber_id"] == barber_user["id"]
        assert data["status"] == "confirmed"
        assert data["payment_status"] == "paid"  # prepaid => paid
        assert data["payment_method"] == "prepaid"
        assert data["date"] == TestBookings.test_date
        TestBookings.booking_id = data["id"]

    def test_double_booking_returns_400(self, api_client, client_user, barber_user):
        svc_id = self._get_a_service_id(api_client)
        payload = {
            "service_id": svc_id,
            "barber_id": barber_user["id"],
            "date": TestBookings.test_date,
            "time": TestBookings.test_time,
            "payment_method": "onsite",
        }
        r = api_client.post(f"{BASE_URL}/api/bookings", json=payload, headers=client_user["headers"])
        assert r.status_code == 400
        assert "not available" in r.json()["detail"].lower()

    def test_available_slots_excludes_booked(self, api_client, barber_user):
        r = api_client.get(
            f"{BASE_URL}/api/bookings/available-slots",
            params={"barber_id": barber_user["id"], "date": TestBookings.test_date},
        )
        assert r.status_code == 200
        slots = r.json()["available_slots"]
        assert TestBookings.test_time not in slots
        assert len(slots) == 17

    def test_onsite_payment_status_pending(self, api_client, client_user, barber_user):
        svc_id = self._get_a_service_id(api_client)
        payload = {
            "service_id": svc_id,
            "barber_id": barber_user["id"],
            "date": TestBookings.test_date,
            "time": "11:00",  # different slot
            "payment_method": "onsite",
        }
        r = api_client.post(f"{BASE_URL}/api/bookings", json=payload, headers=client_user["headers"])
        assert r.status_code == 200
        assert r.json()["payment_status"] == "pending"

    def test_client_sees_only_own_bookings(self, api_client, client_user):
        r = api_client.get(f"{BASE_URL}/api/bookings", headers=client_user["headers"])
        assert r.status_code == 200
        bookings = r.json()
        assert len(bookings) >= 1
        for b in bookings:
            assert b["client_id"] == client_user["user"]["id"]

    def test_barber_sees_own_schedule(self, api_client, barber_user):
        r = api_client.get(f"{BASE_URL}/api/bookings", headers=barber_user["headers"])
        assert r.status_code == 200
        bookings = r.json()
        assert len(bookings) >= 1
        for b in bookings:
            assert b["barber_id"] == barber_user["id"]

    def test_admin_sees_all_bookings(self, api_client, admin_headers):
        r = api_client.get(f"{BASE_URL}/api/bookings", headers=admin_headers)
        assert r.status_code == 200
        bookings = r.json()
        assert isinstance(bookings, list)
        assert len(bookings) >= 2  # at least the ones we created

    def test_update_booking_status_completed(self, api_client, barber_user):
        assert TestBookings.booking_id, "Booking not created"
        r = api_client.patch(
            f"{BASE_URL}/api/bookings/{TestBookings.booking_id}/status",
            params={"status": "completed"},
            headers=barber_user["headers"],
        )
        assert r.status_code == 200, r.text

        # Verify via GET
        listing = api_client.get(
            f"{BASE_URL}/api/bookings", headers=barber_user["headers"]
        ).json()
        target = next((b for b in listing if b["id"] == TestBookings.booking_id), None)
        assert target is not None
        assert target["status"] == "completed"

    def test_booking_invalid_service_returns_404(self, api_client, client_user, barber_user):
        # Use a valid ObjectId that doesn't exist
        fake_id = "507f1f77bcf86cd799439011"
        payload = {
            "service_id": fake_id,
            "barber_id": barber_user["id"],
            "date": TestBookings.test_date,
            "time": "15:00",
            "payment_method": "onsite",
        }
        r = api_client.post(f"{BASE_URL}/api/bookings", json=payload, headers=client_user["headers"])
        assert r.status_code == 404
