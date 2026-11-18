"""
Integration test suite for Authentication, 2FA OTP, Brute-Force Lockout, Password Recovery & Multi-Device Sessions.
"""

from __future__ import annotations

import time
from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


def test_security_sessions_2fa_and_recovery_pipeline() -> None:
    init_db()
    client = TestClient(app)

    r_adm = client.post("/v1/auth/login", json={"email": "admin@codemind.ai", "password": "hasib123"})
    assert r_adm.status_code == 200, r_adm.text
    adm_headers = {"Authorization": f"Bearer {r_adm.json()['access_token']}"}
    assert client.post("/v1/admin/reset-demo", headers=adm_headers).status_code == 200

    # 1. Register user with custom user_code & device_name
    ts = int(time.time())
    test_email = f"sec_qa_{ts}@codemind.edu.vn"
    reg = client.post(
        "/v1/auth/register",
        json={
            "email": test_email,
            "password": "InitialPass@123",
            "full_name": "Kiểm Thử Bảo Mật",
            "role": "student",
            "user_code": "2210999",
            "device_name": "MacBook Pro · Chrome 128",
        },
    )
    assert reg.status_code == 201, reg.text
    reg_data = reg.json()
    assert reg_data["session_id"]
    token1 = reg_data["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # 2. Security overview shows current session
    ov1 = client.get("/v1/auth/security-overview", headers=headers1)
    assert ov1.status_code == 200, ov1.text
    ov1_json = ov1.json()
    assert ov1_json["user"]["userCode"] == "2210999"
    assert ov1_json["user"]["twoFactorEnabled"] is False
    assert len(ov1_json["sessions"]) == 1
    assert ov1_json["sessions"][0]["isCurrent"] is True
    assert ov1_json["sessions"][0]["device"] == "MacBook Pro · Chrome 128"

    # 3. Simulate new device & verify Admin JWT Monitor sees it
    sim = client.post(
        "/v1/auth/sessions/simulate-device",
        json={"preset": "mobile"},
        headers=headers1,
    )
    assert sim.status_code == 201, sim.text
    sim_sess = sim.json()["session"]
    assert sim_sess["isUntrusted"] is True

    adm_jwts = client.get("/v1/admin/jwt-sessions", headers=adm_headers).json()["jwtSessions"]
    assert any(j["id"] == sim_sess["id"] for j in adm_jwts)

    # Toggle device trust & verify
    trust_res = client.patch(
        f"/v1/auth/sessions/{sim_sess['id']}/trust",
        json={"trusted": True},
        headers=headers1,
    )
    assert trust_res.status_code == 200, trust_res.text
    assert trust_res.json()["session"]["isUntrusted"] is False

    # Revoke single simulated device
    rev_single = client.delete(f"/v1/auth/sessions/{sim_sess['id']}", headers=headers1)
    assert rev_single.status_code == 200, rev_single.text
    assert rev_single.json()["status"] == "revoked"

    # Login on a second session to verify Refresh Token rejection after remote revoke
    login_b = client.post(
        "/v1/auth/login",
        json={"email": test_email, "password": "InitialPass@123", "device_name": "Ubuntu Lab PC"},
    )
    assert login_b.status_code == 200, login_b.text
    b_sid = login_b.json()["session_id"]
    b_refresh = login_b.json()["refresh_token"]

    # Revoke device B remotely from device A -> device B refresh token must fail 401
    assert client.delete(f"/v1/auth/sessions/{b_sid}", headers=headers1).status_code == 200
    r_ref_b = client.post("/v1/auth/refresh", json={"refresh_token": b_refresh})
    assert r_ref_b.status_code == 401

    # Simulate another device then test revoke-others
    assert client.post("/v1/auth/sessions/simulate-device", json={"preset": "linux"}, headers=headers1).status_code == 201
    rev_others = client.post("/v1/auth/sessions/revoke-others", headers=headers1)
    assert rev_others.status_code == 200, rev_others.text
    assert rev_others.json()["revoked_count"] >= 1
    assert client.get("/v1/auth/security-overview", headers=headers1).status_code == 200

    # 4. Enable 2FA OTP & test Challenge -> Verify Flow
    en_2fa = client.patch("/v1/auth/security-settings", json={"two_factor_enabled": True}, headers=headers1)
    assert en_2fa.status_code == 200, en_2fa.text
    assert en_2fa.json()["twoFactorEnabled"] is True

    login_2fa = client.post(
        "/v1/auth/login",
        json={"email": test_email, "password": "InitialPass@123"},
    )
    assert login_2fa.status_code == 200, login_2fa.text
    d_2fa = login_2fa.json()
    assert d_2fa["requires_2fa"] is True
    assert d_2fa["challenge_token"]
    assert d_2fa["demo_otp_hint"]

    wrong_otp = client.post(
        "/v1/auth/verify-2fa",
        json={"challenge_token": d_2fa["challenge_token"], "otp_code": "000000"},
    )
    assert wrong_otp.status_code == 400

    ok_otp = client.post(
        "/v1/auth/verify-2fa",
        json={"challenge_token": d_2fa["challenge_token"], "otp_code": d_2fa["demo_otp_hint"]},
    )
    assert ok_otp.status_code == 200, ok_otp.text
    assert ok_otp.json()["access_token"]
    assert ok_otp.json()["session_id"]

    # Disable 2FA back to test password change & brute force cleanly
    assert client.patch("/v1/auth/security-settings", json={"two_factor_enabled": False}, headers=headers1).status_code == 200

    # 5. Change password & verify old fails / new works
    ch_pwd = client.post(
        "/v1/auth/change-password",
        json={"current_password": "InitialPass@123", "new_password": "UpdatedPass@456", "revoke_other_sessions": True},
        headers=headers1,
    )
    assert ch_pwd.status_code == 200, ch_pwd.text
    assert client.post("/v1/auth/login", json={"email": test_email, "password": "InitialPass@123"}).status_code == 401
    assert client.post("/v1/auth/login", json={"email": test_email, "password": "UpdatedPass@456"}).status_code == 200

    # 6. Brute-force 5 wrong passwords -> HTTP 423 Locked -> Forgot/Reset Password unlocks
    for _ in range(4):
        assert client.post("/v1/auth/login", json={"email": test_email, "password": "Wrong!"}).status_code == 401
    fifth = client.post("/v1/auth/login", json={"email": test_email, "password": "Wrong!"})
    assert fifth.status_code == 423

    forgot = client.post("/v1/auth/forgot-password", json={"email": test_email})
    assert forgot.status_code == 200, forgot.text
    f_data = forgot.json()
    reset_pwd = client.post(
        "/v1/auth/reset-password",
        json={
            "challenge_token": f_data["challenge_token"],
            "otp_code": f_data["demo_otp_hint"],
            "new_password": "RecoveredPass@789",
        },
    )
    assert reset_pwd.status_code == 200, reset_pwd.text

    # Account unlocked and new password works
    rel_login = client.post("/v1/auth/login", json={"email": test_email, "password": "RecoveredPass@789"})
    assert rel_login.status_code == 200, rel_login.text
    assert rel_login.json()["access_token"]

    # Delete temporary test user & restore clean demo DB
    assert client.delete(f"/v1/admin/users/{reg_data['user']['id']}", headers=adm_headers).status_code == 200
    assert client.post("/v1/admin/reset-demo", headers=adm_headers).status_code == 200
