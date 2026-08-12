from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.main import create_app
from backend.app.errors import ForbiddenScopeError
from backend.app.models import AuditRecord, AuthSessionRecord, UserCredentialRecord, UserRecord
from backend.app.security import issue_access_token
from backend.app.repositories import AuditRepository, IdentityRepository
from backend.app.services import AuthorizationService, SecurityContext
from backend.scripts.bootstrap_identity import USERS, bootstrap_identity
from backend.tests.conftest import make_settings

PASSWORDS = {
    "E-0231": "employee-test-password",
    "A-001": "training-admin-password",
    "R-001": "reviewer-test-password",
    "S-001": "system-admin-password",
}
PROFILE_IDS = {row[0]: row[6] for row in USERS}


def _seed(engine) -> None:
    with Session(engine) as session:
        bootstrap_identity(session, passwords=PASSWORDS)
        session.commit()


def _android_login(client: TestClient, account: str, password: str):
    return client.post(
        "/api/v1/auth/login",
        headers={"X-Client-Kind": "android"},
        json={"account": account, "password": password},
    )


def _web_login(client: TestClient, account: str, password: str):
    return client.post(
        "/api/v1/auth/login",
        json={"account": account, "password": password},
    )


def test_bootstrap_is_idempotent_and_stores_argon2_hashes(sqlite_engine) -> None:
    _seed(sqlite_engine)
    with Session(sqlite_engine) as session:
        first_hashes = {
            row.account_name: row.password_hash
            for row in session.scalars(select(UserCredentialRecord))
        }
        result = bootstrap_identity(session, passwords={})
        session.commit()
        second_hashes = {
            row.account_name: row.password_hash
            for row in session.scalars(select(UserCredentialRecord))
        }

    assert result.credentials_created == 0
    assert result.credentials_rotated == 0
    assert first_hashes == second_hashes
    assert set(first_hashes) == set(PASSWORDS)
    assert all(value.startswith("$argon2id$") for value in first_hashes.values())
    assert all(password not in str(first_hashes) for password in PASSWORDS.values())


def test_login_errors_are_uniform_and_audited_without_secrets(sqlite_engine) -> None:
    _seed(sqlite_engine)
    app = create_app(make_settings(), engine=sqlite_engine)
    with TestClient(app) as client:
        unknown = _web_login(client, "UNKNOWN", "wrong-password")
        wrong = _web_login(client, "E-0231", "wrong-password")

    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json()["error"]["message"] == wrong.json()["error"]["message"]
    with Session(sqlite_engine) as session:
        records = list(
            session.scalars(
                select(AuditRecord).where(AuditRecord.action == "auth.login")
            )
        )
    assert len(records) == 2
    serialized = " ".join(str(record.client_summary) for record in records)
    assert "wrong-password" not in serialized
    assert "token" not in serialized.lower()


def test_access_refresh_rotation_reuse_and_logout(sqlite_engine) -> None:
    _seed(sqlite_engine)
    app = create_app(make_settings(), engine=sqlite_engine)
    with TestClient(app) as client:
        login = _android_login(client, "E-0231", PASSWORDS["E-0231"])
        assert login.status_code == 200
        first = login.json()["data"]
        access = first["access_token"]
        refresh = first["refresh_token"]
        me = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access}", "X-Client-Kind": "android"},
        )
        assert me.status_code == 200

        rotated = client.post(
            "/api/v1/auth/refresh",
            headers={"X-Client-Kind": "android"},
            json={"refresh_token": refresh},
        )
        assert rotated.status_code == 200
        next_refresh = rotated.json()["data"]["refresh_token"]
        assert next_refresh != refresh

        reuse = client.post(
            "/api/v1/auth/refresh",
            headers={"X-Client-Kind": "android"},
            json={"refresh_token": refresh},
        )
        assert reuse.status_code == 401
        after_reuse = client.post(
            "/api/v1/auth/refresh",
            headers={"X-Client-Kind": "android"},
            json={"refresh_token": next_refresh},
        )
        assert after_reuse.status_code == 401

        replacement_login = _android_login(client, "E-0231", PASSWORDS["E-0231"])
        replacement = replacement_login.json()["data"]
        logout = client.post(
            "/api/v1/auth/logout",
            headers={"X-Client-Kind": "android"},
            json={"refresh_token": replacement["refresh_token"]},
        )
        assert logout.status_code == 200
        expired_session = client.get(
            "/api/v1/auth/me",
            headers={
                "Authorization": f"Bearer {replacement['access_token']}",
                "X-Client-Kind": "android",
            },
        )
        assert expired_session.status_code == 401


def test_web_refresh_requires_csrf_and_never_returns_refresh_token(sqlite_engine) -> None:
    _seed(sqlite_engine)
    app = create_app(make_settings(), engine=sqlite_engine)
    with TestClient(app) as client:
        login = _web_login(client, "E-0231", PASSWORDS["E-0231"])
        assert login.status_code == 200
        assert login.json()["data"]["refresh_token"] is None
        set_cookie = ",".join(login.headers.get_list("set-cookie")).lower()
        assert "tegang_refresh=" in set_cookie and "httponly" in set_cookie
        assert "samesite=lax" in set_cookie

        assert client.post("/api/v1/auth/refresh", json={}).status_code == 403
        csrf = client.cookies.get("tegang_csrf")
        assert csrf
        refreshed = client.post(
            "/api/v1/auth/refresh",
            headers={"X-CSRF-Token": csrf},
            json={},
        )
        assert refreshed.status_code == 200
        assert refreshed.json()["data"]["refresh_token"] is None


def test_expired_access_token_and_disabled_user_are_rejected(sqlite_engine) -> None:
    _seed(sqlite_engine)
    settings = make_settings()
    with Session(sqlite_engine) as session:
        user = session.scalar(select(UserRecord).where(UserRecord.external_id == USERS[0][1]))
        assert user is not None
        auth_session = AuthSessionRecord(
            external_id="sid_01ARZ3NDEKTSV4RRFFQ69G5FAZ",
            user_id=user.id,
            client_kind="web",
            issued_at=datetime.now(UTC) - timedelta(hours=2),
            expires_at=datetime.now(UTC) + timedelta(days=1),
        )
        session.add(auth_session)
        session.commit()
    token, _ = issue_access_token(
        settings,
        user_id=USERS[0][1],
        session_id="sid_01ARZ3NDEKTSV4RRFFQ69G5FAZ",
        now=datetime.now(UTC) - timedelta(hours=1),
    )
    app = create_app(settings, engine=sqlite_engine)
    with TestClient(app) as client:
        expired = client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert expired.status_code == 401
        with Session(sqlite_engine) as session:
            user = session.scalar(
                select(UserRecord).where(UserRecord.external_id == USERS[0][1])
            )
            assert user is not None
            user.status = "inactive"
            session.commit()
        disabled = _web_login(client, "E-0231", PASSWORDS["E-0231"])
        assert disabled.status_code == 401


def test_demo_mode_and_android_role_boundary_are_server_enforced(sqlite_engine) -> None:
    _seed(sqlite_engine)
    disabled_app = create_app(make_settings(demo_mode=False), engine=sqlite_engine)
    with TestClient(disabled_app) as client:
        assert client.get("/api/v1/auth/demo-profiles").status_code == 403
        assert client.post(
            "/api/v1/auth/demo-login", json={"account": "E-0231"}
        ).status_code == 403

    app = create_app(make_settings(), engine=sqlite_engine)
    with TestClient(app) as client:
        for account in ("A-001", "R-001", "S-001"):
            response = _android_login(client, account, PASSWORDS[account])
            assert response.status_code == 403


def test_resource_scope_and_role_matrix_are_default_deny(sqlite_engine) -> None:
    _seed(sqlite_engine)
    app = create_app(make_settings(), engine=sqlite_engine)
    with TestClient(app) as client:
        unauthenticated = client.get(
            f"/api/v1/identity/employee-profiles/{PROFILE_IDS['E-0231']}"
        )
        assert unauthenticated.status_code == 401

        employee = _web_login(client, "E-0231", PASSWORDS["E-0231"]).json()["data"]
        employee_headers = {"Authorization": f"Bearer {employee['access_token']}"}
        assert client.get(
            f"/api/v1/identity/employee-profiles/{PROFILE_IDS['E-0231']}",
            headers=employee_headers,
        ).status_code == 200
        assert client.get(
            f"/api/v1/identity/employee-profiles/{PROFILE_IDS['A-001']}",
            headers=employee_headers,
        ).status_code == 404

        admin = _web_login(client, "A-001", PASSWORDS["A-001"]).json()["data"]
        admin_headers = {"Authorization": f"Bearer {admin['access_token']}"}
        assert client.get(
            f"/api/v1/identity/employee-profiles/{PROFILE_IDS['E-0231']}",
            headers=admin_headers,
        ).status_code == 200
        assert "approval.assigned.review" not in admin["principal"]["capabilities"]
        assert "agent.developer_trace.read" not in admin["principal"]["capabilities"]

        reviewer = _web_login(client, "R-001", PASSWORDS["R-001"]).json()["data"]
        assert "approval.assigned.review" in reviewer["principal"]["capabilities"]
        assert "system.config.manage" not in reviewer["principal"]["capabilities"]

        system = _web_login(client, "S-001", PASSWORDS["S-001"]).json()["data"]
        system_headers = {"Authorization": f"Bearer {system['access_token']}"}
        assert "agent.developer_trace.read" in system["principal"]["capabilities"]
        assert client.get(
            f"/api/v1/identity/employee-profiles/{PROFILE_IDS['E-0231']}",
            headers=system_headers,
        ).status_code == 404

    with Session(sqlite_engine) as session:
        allowed = session.scalar(
            select(AuditRecord).where(
                AuditRecord.action == "identity.employee.read",
                AuditRecord.allowed.is_(True),
            )
        )
        denied = session.scalar(
            select(AuditRecord).where(
                AuditRecord.action == "identity.employee.read",
                AuditRecord.allowed.is_(False),
            )
        )
    assert allowed is not None and allowed.actor_user_id is not None
    assert denied is not None and denied.request_id.startswith("req_")
    assert denied.trace_id.startswith("trc_")


def test_authorization_service_enforces_four_role_action_matrix(sqlite_engine) -> None:
    _seed(sqlite_engine)
    matrix = {
        "E-0231": {
            "training.self.read": True,
            "training.department.manage": False,
            "approval.assigned.review": False,
            "agent.developer_trace.read": False,
        },
        "A-001": {
            "training.self.read": False,
            "training.department.manage": True,
            "approval.assigned.review": False,
            "agent.developer_trace.read": False,
        },
        "R-001": {
            "training.department.manage": False,
            "approval.assigned.review": True,
            "system.config.manage": False,
            "agent.developer_trace.read": False,
        },
        "S-001": {
            "training.self.read": False,
            "training.department.manage": False,
            "system.config.manage": True,
            "agent.developer_trace.read": True,
        },
    }
    context = SecurityContext(
        request_id="req_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        trace_id="trc_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        client_kind="web",
        user_agent="pytest",
    )
    with Session(sqlite_engine) as session:
        identity = IdentityRepository(session)
        authorization = AuthorizationService(identity, AuditRepository(session))
        for account, checks in matrix.items():
            user_id = next(row[1] for row in USERS if row[0] == account)
            principal = identity.load_principal(
                external_user_id=user_id,
                session_id="sid_01ARZ3NDEKTSV4RRFFQ69G5FAV",
                request_id=context.request_id,
                trace_id=context.trace_id,
            )
            assert principal is not None
            for capability, allowed in checks.items():
                if allowed:
                    authorization.require_capability(
                        principal,
                        context,
                        capability=capability,
                        action=f"matrix.{capability}",
                        resource_type="matrix_probe",
                    )
                else:
                    try:
                        authorization.require_capability(
                            principal,
                            context,
                            capability=capability,
                            action=f"matrix.{capability}",
                            resource_type="matrix_probe",
                        )
                    except ForbiddenScopeError:
                        pass
                    else:
                        raise AssertionError(f"{account} unexpectedly gained {capability}")
