"""Identity-only database loading and scoped transactional reset for C-07."""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.app.models import (
    AuthSessionRecord,
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
from backend.scripts.bootstrap_identity import (
    ORG_ID,
    PASSWORD_ENV,
    POSITIONS,
    USERS,
    bootstrap_identity,
)

from .io import read_jsonl


@dataclass(frozen=True, slots=True)
class SeedResult:
    profile: str
    positions_created: int
    users_created: int
    profiles_created: int
    existing_records_verified: int


@dataclass(frozen=True, slots=True)
class ResetResult:
    profile: str
    users_removed: int
    positions_removed: int
    seed: SeedResult


def _parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _load_identity(dataset_dir: Path) -> dict[str, list[dict[str, object]]]:
    return {
        name: read_jsonl(dataset_dir / f"{name}.jsonl")
        for name in (
            "organizations",
            "departments",
            "roles",
            "positions",
            "users",
            "employee_profiles",
        )
    }


def _flagship_passwords() -> dict[str, str]:
    return {account: os.getenv(environment_name, "") for account, environment_name in PASSWORD_ENV.items()}


def _assert_equal(actual: object, expected: object, label: str) -> None:
    if actual != expected:
        raise ValueError(f"existing database record conflicts with C-07 dataset: {label}")


def _verify_c06_foundation(session: Session) -> None:
    organization = session.scalar(
        select(OrganizationRecord).where(OrganizationRecord.external_id == ORG_ID)
    )
    if organization is None or not organization.simulated:
        raise ValueError("C-06 simulated organization is missing; run data:seed first")
    for _, user_id, _, _, _, _, profile_id in USERS:
        user = session.scalar(select(UserRecord).where(UserRecord.external_id == user_id))
        profile = session.scalar(
            select(EmployeeProfileRecord).where(EmployeeProfileRecord.external_id == profile_id)
        )
        if user is None or profile is None:
            raise ValueError("C-06 flagship identities are incomplete; run data:seed first")


def _seed_additional_identity(
    session: Session,
    dataset_dir: Path,
    *,
    profile_name: str,
) -> SeedResult:
    data = _load_identity(dataset_dir)
    organization = session.scalar(
        select(OrganizationRecord).where(OrganizationRecord.external_id == ORG_ID)
    )
    if organization is None or not organization.simulated:
        raise ValueError("C-06 simulated organization is missing or not marked simulated")
    departments = {
        item.external_id: item for item in session.scalars(select(DepartmentRecord)).all()
    }
    roles = {item.external_id: item for item in session.scalars(select(RoleRecord)).all()}
    positions = {
        item.external_id: item for item in session.scalars(select(PositionRecord)).all()
    }
    positions_created = 0
    verified = 0
    c06_position_ids = {item[0] for item in POSITIONS}
    for item in data["positions"]:
        external_id = str(item["id"])
        if external_id in c06_position_ids:
            if external_id not in positions:
                raise ValueError(f"C-06 position is missing: {external_id}")
            verified += 1
            continue
        department_id = str(item["department_id"])
        department = departments.get(department_id)
        if department is None:
            raise ValueError(f"dataset position references missing department: {department_id}")
        existing = positions.get(external_id)
        if existing is None:
            existing = PositionRecord(
                external_id=external_id,
                status=str(item["status"]),
                organization_id=organization.id,
                department_id=department.id,
                code=str(item["code"]),
                name=str(item["name"]),
                schema_version=str(item["schema_version"]),
                entity_version=int(item["entity_version"]),
                created_at=_parse_datetime(str(item["created_at"])),
                updated_at=_parse_datetime(str(item["updated_at"])),
                created_by=str(item["created_by"]),
                updated_by=str(item["updated_by"]),
            )
            session.add(existing)
            session.flush()
            positions[external_id] = existing
            positions_created += 1
        else:
            _assert_equal(existing.department_id, department.id, f"position {external_id} department")
            _assert_equal(existing.code, item["code"], f"position {external_id} code")
            _assert_equal(existing.name, item["name"], f"position {external_id} name")
            verified += 1

    user_payloads = {str(item["id"]): item for item in data["users"]}
    profile_payloads = {str(item["user_id"]): item for item in data["employee_profiles"]}
    flagship_user_ids = {item[1] for item in USERS}
    users_created = 0
    profiles_created = 0
    for user_id, item in user_payloads.items():
        if user_id in flagship_user_ids:
            verified += 1
            continue
        profile_item = profile_payloads[user_id]
        marker = f"simulated:c07:{item['metadata']['dataset_version']}:{profile_name}"
        if marker not in profile_item["training_tags"]:
            raise ValueError(f"employee profile lacks the approved C-07 marker: {profile_item['id']}")
        existing = session.scalar(select(UserRecord).where(UserRecord.external_id == user_id))
        if existing is None:
            existing = UserRecord(
                external_id=user_id,
                status=str(item["status"]),
                display_name=str(item["display_name"]),
                schema_version=str(item["schema_version"]),
                entity_version=int(item["entity_version"]),
                created_at=_parse_datetime(str(item["created_at"])),
                updated_at=_parse_datetime(str(item["updated_at"])),
                created_by=str(item["created_by"]),
                updated_by=str(item["updated_by"]),
            )
            session.add(existing)
            session.flush()
            users_created += 1
        else:
            _assert_equal(existing.display_name, item["display_name"], f"user {user_id} display_name")
            if session.get(UserCredentialRecord, existing.id) is not None:
                raise ValueError(f"C-07 non-flagship user unexpectedly has a credential: {user_id}")
            verified += 1

        role_id = str(item["role_ids"][0])
        department_id = str(item["department_ids"][0])
        role = roles.get(role_id)
        department = departments.get(department_id)
        if role is None or department is None:
            raise ValueError(f"user {user_id} references a missing role or department")
        if session.execute(
            select(user_roles.c.user_id).where(
                user_roles.c.user_id == existing.id,
                user_roles.c.role_id == role.id,
            )
        ).first() is None:
            session.execute(
                user_roles.insert().values(
                    user_id=existing.id,
                    role_id=role.id,
                    assigned_by=USERS[1][1],
                )
            )
        if session.execute(
            select(user_departments.c.user_id).where(
                user_departments.c.user_id == existing.id,
                user_departments.c.department_id == department.id,
            )
        ).first() is None:
            session.execute(
                user_departments.insert().values(
                    user_id=existing.id,
                    department_id=department.id,
                    assigned_by=USERS[1][1],
                )
            )

        profile_id = str(profile_item["id"])
        profile = session.scalar(
            select(EmployeeProfileRecord).where(EmployeeProfileRecord.external_id == profile_id)
        )
        position = positions.get(str(profile_item["position_id"]))
        if position is None:
            raise ValueError(f"employee profile references missing position: {profile_item['position_id']}")
        if profile is None:
            profile = EmployeeProfileRecord(
                external_id=profile_id,
                status=str(profile_item["status"]),
                user_id=existing.id,
                department_id=department.id,
                position_id=position.id,
                job_title=str(profile_item["job_title"]),
                training_tags=list(profile_item["training_tags"]),
                authorized_data_scopes=list(profile_item["authorized_data_scopes"]),
                schema_version=str(profile_item["schema_version"]),
                entity_version=int(profile_item["entity_version"]),
                created_at=_parse_datetime(str(profile_item["created_at"])),
                updated_at=_parse_datetime(str(profile_item["updated_at"])),
                created_by=str(profile_item["created_by"]),
                updated_by=str(profile_item["updated_by"]),
            )
            session.add(profile)
            profiles_created += 1
        else:
            _assert_equal(profile.user_id, existing.id, f"profile {profile_id} user")
            _assert_equal(profile.department_id, department.id, f"profile {profile_id} department")
            _assert_equal(profile.position_id, position.id, f"profile {profile_id} position")
            _assert_equal(profile.training_tags, profile_item["training_tags"], f"profile {profile_id} tags")
            verified += 1
    return SeedResult(
        profile=profile_name,
        positions_created=positions_created,
        users_created=users_created,
        profiles_created=profiles_created,
        existing_records_verified=verified,
    )


def seed_identity(session: Session, dataset_dir: Path, *, profile_name: str) -> SeedResult:
    """Bootstrap C-06 identities, then idempotently add only C-07 identity records."""

    bootstrap_identity(
        session,
        passwords=_flagship_passwords(),
        rotate_passwords=False,
    )
    return _seed_additional_identity(session, dataset_dir, profile_name=profile_name)


def reset_identity(session: Session, dataset_dir: Path, *, profile_name: str) -> ResetResult:
    """Remove and recreate only exact non-flagship IDs from one validated C-07 dataset."""

    _verify_c06_foundation(session)
    data = _load_identity(dataset_dir)
    flagship_user_ids = {item[1] for item in USERS}
    c06_position_ids = {item[0] for item in POSITIONS}
    user_ids = [str(item["id"]) for item in data["users"] if item["id"] not in flagship_user_ids]
    profile_by_user = {
        str(item["user_id"]): item
        for item in data["employee_profiles"]
        if item["user_id"] not in flagship_user_ids
    }
    marker_prefix = f"simulated:c07:"
    users_to_remove: list[UserRecord] = []
    for external_id in user_ids:
        user = session.scalar(select(UserRecord).where(UserRecord.external_id == external_id))
        if user is None:
            continue
        expected_profile = profile_by_user[external_id]
        profile = session.scalar(
            select(EmployeeProfileRecord).where(EmployeeProfileRecord.external_id == expected_profile["id"])
        )
        if profile is None or not any(
            str(tag).startswith(marker_prefix) and str(tag).endswith(f":{profile_name}")
            for tag in profile.training_tags
        ):
            raise ValueError(f"reset refused: user lacks the exact simulated dataset marker: {external_id}")
        if session.get(UserCredentialRecord, user.id) is not None:
            raise ValueError(f"reset refused: C-07 non-flagship user has a credential: {external_id}")
        if session.scalar(select(AuthSessionRecord.id).where(AuthSessionRecord.user_id == user.id)) is not None:
            raise ValueError(f"reset refused: C-07 non-flagship user has an authentication session: {external_id}")
        users_to_remove.append(user)

    for user in users_to_remove:
        session.execute(delete(user_department_scopes).where(user_department_scopes.c.user_id == user.id))
        session.execute(delete(user_departments).where(user_departments.c.user_id == user.id))
        session.execute(delete(user_roles).where(user_roles.c.user_id == user.id))
        session.execute(delete(EmployeeProfileRecord).where(EmployeeProfileRecord.user_id == user.id))
        session.delete(user)
    session.flush()

    position_ids = [
        str(item["id"]) for item in data["positions"] if item["id"] not in c06_position_ids
    ]
    positions_removed = 0
    for external_id in position_ids:
        position = session.scalar(
            select(PositionRecord).where(PositionRecord.external_id == external_id)
        )
        if position is None:
            continue
        if session.scalar(
            select(EmployeeProfileRecord.id).where(EmployeeProfileRecord.position_id == position.id)
        ) is not None:
            raise ValueError(f"reset refused: position is referenced outside the target dataset: {external_id}")
        session.delete(position)
        positions_removed += 1
    session.flush()
    seeded = _seed_additional_identity(session, dataset_dir, profile_name=profile_name)
    return ResetResult(
        profile=profile_name,
        users_removed=len(users_to_remove),
        positions_removed=positions_removed,
        seed=seeded,
    )
