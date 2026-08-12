"""Identity and fresh principal queries used by authentication and authorization."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import (
    DepartmentRecord,
    EmployeeProfileRecord,
    RoleRecord,
    UserCredentialRecord,
    UserRecord,
    user_department_scopes,
    user_departments,
    user_roles,
)
from ..schemas.auth import AuthPrincipal, DemoProfile, EmployeeIdentitySummary
from ..schemas.common import UserRole

ROLE_PRIORITY = {
    "employee": 0,
    "training_admin": 1,
    "reviewer": 2,
    "system_admin": 3,
}


@dataclass(frozen=True, slots=True)
class CredentialIdentity:
    internal_user_id: int
    external_user_id: str
    status: str
    password_hash: str


class IdentityRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def find_credential(self, account: str) -> CredentialIdentity | None:
        row = self._session.execute(
            select(UserRecord, UserCredentialRecord)
            .join(
                UserCredentialRecord,
                UserCredentialRecord.user_id == UserRecord.id,
            )
            .where(UserCredentialRecord.account_name == account.upper())
        ).first()
        if row is None:
            return None
        user, credential = row
        return CredentialIdentity(
            internal_user_id=user.id,
            external_user_id=user.external_id,
            status=user.status,
            password_hash=credential.password_hash,
        )

    def internal_user_id(self, external_user_id: str) -> int | None:
        return self._session.scalar(
            select(UserRecord.id).where(UserRecord.external_id == external_user_id)
        )

    def external_user_id(self, internal_user_id: int) -> str | None:
        return self._session.scalar(
            select(UserRecord.external_id).where(UserRecord.id == internal_user_id)
        )

    def load_principal(
        self,
        *,
        external_user_id: str,
        session_id: str,
        request_id: str,
        trace_id: str,
    ) -> AuthPrincipal | None:
        user = self._session.scalar(
            select(UserRecord).where(UserRecord.external_id == external_user_id)
        )
        if user is None or user.status != "active":
            return None

        roles = list(
            self._session.scalars(
                select(RoleRecord)
                .join(user_roles, user_roles.c.role_id == RoleRecord.id)
                .where(user_roles.c.user_id == user.id, RoleRecord.status == "active")
            )
        )
        if not roles:
            return None
        roles.sort(key=lambda item: ROLE_PRIORITY.get(item.role_code, 99))

        departments = list(
            self._session.scalars(
                select(DepartmentRecord)
                .join(
                    user_departments,
                    user_departments.c.department_id == DepartmentRecord.id,
                )
                .where(user_departments.c.user_id == user.id)
            )
        )
        profile = self._session.scalar(
            select(EmployeeProfileRecord).where(EmployeeProfileRecord.user_id == user.id)
        )
        scoped_departments = list(
            self._session.scalars(
                select(DepartmentRecord)
                .join(
                    user_department_scopes,
                    user_department_scopes.c.department_id == DepartmentRecord.id,
                )
                .where(user_department_scopes.c.user_id == user.id)
            )
        )

        permission_scopes = sorted(
            {scope for role in roles for scope in (role.permission_scopes or [])}
        )
        data_scopes = set(profile.authorized_data_scopes if profile else [])
        data_scopes.update(
            f"department:{department.external_id}" for department in scoped_departments
        )
        role_values = [UserRole(role.role_code) for role in roles]
        return AuthPrincipal(
            user_id=user.external_id,
            session_id=session_id,
            display_name=user.display_name,
            roles=role_values,
            primary_role=role_values[0],
            department_ids=sorted(department.external_id for department in departments),
            employee_profile_id=profile.external_id if profile else None,
            permission_scopes=permission_scopes,
            authorized_data_scopes=sorted(data_scopes),
            capabilities=permission_scopes,
            request_id=request_id,
            trace_id=trace_id,
        )

    def list_demo_profiles(self) -> list[DemoProfile]:
        accounts = self._session.execute(
            select(UserCredentialRecord.account_name, UserRecord)
            .join(UserRecord, UserRecord.id == UserCredentialRecord.user_id)
            .order_by(UserCredentialRecord.account_name)
        ).all()
        profiles: list[DemoProfile] = []
        for account, user in accounts:
            principal = self.load_principal(
                external_user_id=user.external_id,
                session_id="sid_01ARZ3NDEKTSV4RRFFQ69G5FAV",
                request_id="req_01ARZ3NDEKTSV4RRFFQ69G5FAV",
                trace_id="trc_01ARZ3NDEKTSV4RRFFQ69G5FAV",
            )
            if principal is not None:
                profiles.append(
                    DemoProfile(
                        account=account,
                        user_id=user.external_id,
                        display_name=user.display_name,
                        primary_role=principal.primary_role,
                        department_ids=principal.department_ids,
                    )
                )
        return profiles

    def get_employee_identity(
        self,
        *,
        employee_profile_id: str,
        allowed_profile_ids: set[str] | None = None,
        allowed_department_ids: set[str] | None = None,
    ) -> EmployeeIdentitySummary | None:
        """Filter resource scope in persistence so unauthorized rows do not escape."""

        statement = (
            select(EmployeeProfileRecord, UserRecord, DepartmentRecord)
            .join(UserRecord, UserRecord.id == EmployeeProfileRecord.user_id)
            .join(
                DepartmentRecord,
                DepartmentRecord.id == EmployeeProfileRecord.department_id,
            )
            .where(
                EmployeeProfileRecord.external_id == employee_profile_id,
                EmployeeProfileRecord.status == "active",
                UserRecord.status == "active",
            )
        )
        predicates = []
        if allowed_profile_ids:
            predicates.append(EmployeeProfileRecord.external_id.in_(allowed_profile_ids))
        if allowed_department_ids:
            predicates.append(DepartmentRecord.external_id.in_(allowed_department_ids))
        if not predicates:
            return None
        scope_predicate = predicates[0]
        for predicate in predicates[1:]:
            scope_predicate = scope_predicate | predicate
        row = self._session.execute(statement.where(scope_predicate)).first()
        if row is None:
            return None
        profile, user, department = row
        return EmployeeIdentitySummary(
            employee_profile_id=profile.external_id,
            user_id=user.external_id,
            display_name=user.display_name,
            department_id=department.external_id,
            job_title=profile.job_title,
        )
