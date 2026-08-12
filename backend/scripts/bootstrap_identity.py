"""Idempotently seed the C-06 simulated organization and four demo identities.

Passwords are accepted only from environment variables and are never printed.
Existing credential hashes remain unchanged unless BOOTSTRAP_ROTATE_PASSWORDS=true.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path

from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.config import Settings  # noqa: E402
from backend.app.database import create_database_engine, create_session_factory  # noqa: E402
from backend.app.models import (  # noqa: E402
    DepartmentRecord,
    EmployeeProfileRecord,
    OrganizationRecord,
    PositionRecord,
    RoleRecord,
    UserCredentialRecord,
    UserRecord,
    user_department_scopes,
    user_departments,
    user_roles,
)

ULIDS = (
    "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    "01ARZ3NDEKTSV4RRFFQ69G5FAW",
    "01ARZ3NDEKTSV4RRFFQ69G5FAX",
    "01ARZ3NDEKTSV4RRFFQ69G5FAY",
)
ORG_ID = f"org_{ULIDS[0]}"

DEPARTMENTS = (
    (f"dept_{ULIDS[0]}", "炼钢生产部"),
    (f"dept_{ULIDS[1]}", "培训管理"),
    (f"dept_{ULIDS[2]}", "安全管理"),
    (f"dept_{ULIDS[3]}", "智信部"),
)
POSITIONS = (
    (f"pos_{ULIDS[0]}", "STEEL-EMPLOYEE", "炼钢生产岗位（模拟）", DEPARTMENTS[0][0]),
    (f"pos_{ULIDS[1]}", "TRAINING-ADMIN", "培训管理员岗位（模拟）", DEPARTMENTS[1][0]),
    (f"pos_{ULIDS[2]}", "SAFETY-REVIEWER", "安全审核岗位（模拟）", DEPARTMENTS[2][0]),
    (f"pos_{ULIDS[3]}", "SYSTEM-ADMIN", "系统管理员岗位（模拟）", DEPARTMENTS[3][0]),
)
ROLES = (
    (
        f"role_{ULIDS[0]}",
        "employee",
        "员工",
        [
            "training.self.read",
            "learning.self.write",
            "assessment.self.write",
            "message.self.read",
            "record.self.read",
        ],
    ),
    (
        f"role_{ULIDS[1]}",
        "training_admin",
        "培训管理员",
        [
            "training.department.read",
            "training.department.manage",
            "report.department.read",
            "agent.business_trace.read",
        ],
    ),
    (
        f"role_{ULIDS[2]}",
        "reviewer",
        "审核员",
        [
            "approval.assigned.review",
            "report.department.read",
            "agent.business_trace.read",
        ],
    ),
    (
        f"role_{ULIDS[3]}",
        "system_admin",
        "系统管理员",
        [
            "system.config.manage",
            "identity.system.manage",
            "agent.developer_trace.read",
        ],
    ),
)
USERS = (
    ("E-0231", f"usr_{ULIDS[0]}", "模拟员工 E-0231", "employee", DEPARTMENTS[0][0], f"pos_{ULIDS[0]}", f"emp_{ULIDS[0]}"),
    ("A-001", f"usr_{ULIDS[1]}", "模拟培训管理员 A-001", "training_admin", DEPARTMENTS[1][0], f"pos_{ULIDS[1]}", f"emp_{ULIDS[1]}"),
    ("R-001", f"usr_{ULIDS[2]}", "模拟审核员 R-001", "reviewer", DEPARTMENTS[2][0], f"pos_{ULIDS[2]}", f"emp_{ULIDS[2]}"),
    ("S-001", f"usr_{ULIDS[3]}", "模拟系统管理员 S-001", "system_admin", DEPARTMENTS[3][0], f"pos_{ULIDS[3]}", f"emp_{ULIDS[3]}"),
)
PASSWORD_ENV = {
    "E-0231": "BOOTSTRAP_E0231_PASSWORD",
    "A-001": "BOOTSTRAP_A001_PASSWORD",
    "R-001": "BOOTSTRAP_R001_PASSWORD",
    "S-001": "BOOTSTRAP_S001_PASSWORD",
}


@dataclass(frozen=True, slots=True)
class BootstrapResult:
    organizations: int
    departments: int
    positions: int
    roles: int
    users: int
    credentials_created: int
    credentials_rotated: int


def _passwords_from_env() -> dict[str, str]:
    return {account: os.getenv(name, "") for account, name in PASSWORD_ENV.items()}


def _valid_password(password: str) -> bool:
    return len(password) >= 12 and not password.isspace()


def bootstrap_identity(
    session: Session,
    *,
    passwords: dict[str, str],
    rotate_passwords: bool = False,
) -> BootstrapResult:
    password_hash = PasswordHash.recommended()
    organization = session.scalar(
        select(OrganizationRecord).where(OrganizationRecord.external_id == ORG_ID)
    )
    if organization is None:
        organization = OrganizationRecord(
            external_id=ORG_ID,
            status="active",
            name="特钢智教模拟组织（非真实企业）",
            simulated=True,
        )
        session.add(organization)
        session.flush()

    departments: dict[str, DepartmentRecord] = {}
    for external_id, name in DEPARTMENTS:
        record = session.scalar(
            select(DepartmentRecord).where(DepartmentRecord.external_id == external_id)
        )
        if record is None:
            record = DepartmentRecord(
                external_id=external_id,
                status="active",
                name=name,
                organization_id=organization.id,
            )
            session.add(record)
            session.flush()
        elif record.organization_id is None:
            record.organization_id = organization.id
        departments[external_id] = record

    positions: dict[str, PositionRecord] = {}
    for external_id, code, name, department_id in POSITIONS:
        record = session.scalar(
            select(PositionRecord).where(PositionRecord.external_id == external_id)
        )
        if record is None:
            record = PositionRecord(
                external_id=external_id,
                status="active",
                organization_id=organization.id,
                department_id=departments[department_id].id,
                code=code,
                name=name,
            )
            session.add(record)
            session.flush()
        positions[external_id] = record

    roles: dict[str, RoleRecord] = {}
    for external_id, role_code, name, scopes in ROLES:
        record = session.scalar(
            select(RoleRecord).where(RoleRecord.role_code == role_code)
        )
        if record is None:
            record = RoleRecord(
                external_id=external_id,
                status="active",
                role_code=role_code,
                name=name,
                permission_scopes=scopes,
            )
            session.add(record)
            session.flush()
        else:
            record.permission_scopes = scopes
        roles[role_code] = record

    created_credentials = 0
    rotated_credentials = 0
    for account, external_id, display_name, role_code, department_id, position_id, profile_id in USERS:
        user = session.scalar(
            select(UserRecord).where(UserRecord.external_id == external_id)
        )
        if user is None:
            user = UserRecord(
                external_id=external_id,
                status="active",
                display_name=display_name,
            )
            session.add(user)
            session.flush()

        department = departments[department_id]
        role = roles[role_code]
        position = positions[position_id]
        if session.execute(
            select(user_roles.c.user_id).where(
                user_roles.c.user_id == user.id,
                user_roles.c.role_id == role.id,
            )
        ).first() is None:
            session.execute(user_roles.insert().values(user_id=user.id, role_id=role.id))
        if session.execute(
            select(user_departments.c.user_id).where(
                user_departments.c.user_id == user.id,
                user_departments.c.department_id == department.id,
            )
        ).first() is None:
            session.execute(
                user_departments.insert().values(
                    user_id=user.id, department_id=department.id
                )
            )

        data_scopes = ["employee:self"] if role_code == "employee" else []
        if role_code in {"training_admin", "reviewer"}:
            steel_department = departments[DEPARTMENTS[0][0]]
            scope_type = "training_management" if role_code == "training_admin" else "approval_review"
            if session.execute(
                select(user_department_scopes.c.user_id).where(
                    user_department_scopes.c.user_id == user.id,
                    user_department_scopes.c.department_id == steel_department.id,
                    user_department_scopes.c.scope_type == scope_type,
                )
            ).first() is None:
                session.execute(
                    user_department_scopes.insert().values(
                        user_id=user.id,
                        department_id=steel_department.id,
                        scope_type=scope_type,
                    )
                )
            data_scopes.append(f"department:{steel_department.external_id}")
        if role_code == "reviewer":
            data_scopes.append("approval:assigned")
        if role_code == "system_admin":
            data_scopes.extend(["system:configuration", "trace:developer"])

        profile = session.scalar(
            select(EmployeeProfileRecord).where(
                EmployeeProfileRecord.external_id == profile_id
            )
        )
        if profile is None:
            profile = EmployeeProfileRecord(
                external_id=profile_id,
                status="active",
                user_id=user.id,
                department_id=department.id,
                position_id=position.id,
                job_title=position.name,
                training_tags=["simulated_identity"],
                authorized_data_scopes=data_scopes,
            )
            session.add(profile)
        else:
            profile.authorized_data_scopes = data_scopes

        credential = session.get(UserCredentialRecord, user.id)
        password = passwords.get(account, "")
        if credential is None:
            if not _valid_password(password):
                raise ValueError(
                    f"{PASSWORD_ENV[account]} must contain at least 12 characters for initial bootstrap"
                )
            session.add(
                UserCredentialRecord(
                    user_id=user.id,
                    account_name=account,
                    password_hash=password_hash.hash(password),
                )
            )
            created_credentials += 1
        elif rotate_passwords:
            if not _valid_password(password):
                raise ValueError(
                    f"{PASSWORD_ENV[account]} must contain at least 12 characters for password rotation"
                )
            credential.password_hash = password_hash.hash(password)
            rotated_credentials += 1

    return BootstrapResult(
        organizations=1,
        departments=len(DEPARTMENTS),
        positions=len(POSITIONS),
        roles=len(ROLES),
        users=len(USERS),
        credentials_created=created_credentials,
        credentials_rotated=rotated_credentials,
    )


def main() -> int:
    settings = Settings.from_env()
    engine = create_database_engine(settings)
    factory = create_session_factory(engine)
    if factory is None:
        raise SystemExit("DATABASE_URL is required for identity bootstrap")
    rotate = os.getenv("BOOTSTRAP_ROTATE_PASSWORDS", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    with factory.begin() as session:
        result = bootstrap_identity(
            session,
            passwords=_passwords_from_env(),
            rotate_passwords=rotate,
        )
    if engine is not None:
        engine.dispose()
    print(
        "C-06 simulated identity bootstrap complete: "
        f"organizations={result.organizations}, departments={result.departments}, "
        f"positions={result.positions}, roles={result.roles}, users={result.users}, "
        f"credentials_created={result.credentials_created}, "
        f"credentials_rotated={result.credentials_rotated}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
