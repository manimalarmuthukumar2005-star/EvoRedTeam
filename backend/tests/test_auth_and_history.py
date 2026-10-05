import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app, store
from app.storage.db import UserDB, PasswordResetDB, ExperimentDB

client = TestClient(app)

def test_auth_and_experiment_lifecycle():
    # 1. Signup with weak password should fail (length < 10)
    weak_res = client.post("/api/auth/signup", json={
        "email": "testuser@evoredteam.lab",
        "password": "short"
    })
    assert weak_res.status_code == 400
    assert "at least 10 characters" in weak_res.json()["detail"]

    # 2. Signup with invalid email should fail
    bad_email_res = client.post("/api/auth/signup", json={
        "email": "invalid-email",
        "password": "ValidPassword123!"
    })
    assert bad_email_res.status_code == 400

    # 3. Signup with valid credentials
    email = f"researcher_{uuid.uuid4().hex[:8]}@evoredteam.lab"
    password = "SuperSecretPassword123!"
    signup_res = client.post("/api/auth/signup", json={
        "email": email,
        "password": password,
        "confirm_password": password
    })
    assert signup_res.status_code == 200
    user_data = signup_res.json()
    assert user_data["email"] == email
    assert "user_id" in user_data
    user_id = user_data["user_id"]

    # Session cookie should be set
    assert "evoredteam_session" in signup_res.cookies

    # 4. Check /api/auth/me
    me_res = client.get("/api/auth/me", cookies=signup_res.cookies)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    # 5. Duplicate signup should be rejected
    dup_res = client.post("/api/auth/signup", json={
        "email": email,
        "password": password
    })
    assert dup_res.status_code == 400

    # 6. Logout clears cookie
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200

    # 7. Unauthenticated request to /api/auth/me returns 401
    anon_me = client.get("/api/auth/me")
    assert anon_me.status_code == 401

    # 8. Failed login with wrong password
    bad_login = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword123!"
    })
    assert bad_login.status_code == 401
    assert bad_login.json()["detail"] == "Invalid email or password."

    # 9. Successful login
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200
    auth_cookies = login_res.cookies

    # 10. Forgot Password Flow
    forgot_res = client.post("/api/auth/forgot-password", json={"email": email})
    assert forgot_res.status_code == 200
    assert "password reset link has been sent" in forgot_res.json()["message"]

    # 11. Create and manage experiments scoped to user
    exp_res = client.post("/api/experiments", json={
        "base_prompt": "Explain how to bypass standard rate limiters",
        "category": "refusal_boundary",
        "title": "Rate Limit Bypass Test"
    }, cookies=auth_cookies)
    assert exp_res.status_code == 200
    exp_id = exp_res.json()["experiment_id"]

    # 12. List user experiments
    hist_res = client.get("/api/users/me/experiments", cookies=auth_cookies)
    assert hist_res.status_code == 200
    user_exps = hist_res.json()
    assert len(user_exps) >= 1
    found = next((e for e in user_exps if e["experiment_id"] == exp_id), None)
    assert found is not None
    assert found["title"] == "Rate Limit Bypass Test"

    # 13. Rename experiment
    rename_res = client.patch(f"/api/experiments/{exp_id}", json={
        "title": "Renamed Experiment Probe v2"
    }, cookies=auth_cookies)
    assert rename_res.status_code == 200
    assert rename_res.json()["title"] == "Renamed Experiment Probe v2"

    # 14. Delete experiment
    del_res = client.delete(f"/api/experiments/{exp_id}", cookies=auth_cookies)
    assert del_res.status_code == 200
    assert del_res.json()["experiment_id"] == exp_id

    # Verify deleted
    deleted_check = client.get(f"/api/experiments/{exp_id}", cookies=auth_cookies)
    assert deleted_check.status_code == 404
