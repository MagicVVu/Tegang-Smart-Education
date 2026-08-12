"""Default-deny RBAC and resource-scope authorization authority."""

from __future__ import annotations

from datetime import UTC, datetime

from ..errors import ForbiddenScopeError, ResourceNotFoundError
from ..identifiers import new_ulid
from ..repositories import AuditRepository, IdentityRepository
from ..schemas.auth import AuthPrincipal, EmployeeIdentitySummary
from .auth import SecurityContext


class AuthorizationService:
    def __init__(self, identity: IdentityRepository, audit: AuditRepository) -> None:
        self._identity = identity
        self._audit = audit

    def _record(
        self,
        principal: AuthPrincipal,
        context: SecurityContext,
        *,
        action: str,
        resource_type: str,
        resource_id: str | None,
        resource_department_id: str | None,
        allowed: bool,
        reason: str,
    ) -> None:
        self._audit.record(
            audit_id=f"audit_{new_ulid()}",
            occurred_at=datetime.now(UTC),
            actor_user_id=principal.user_id,
            session_id=principal.session_id,
            effective_roles=[role.value for role in principal.roles],
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_department_id=resource_department_id,
            allowed=allowed,
            reason_code=reason,
            request_id=context.request_id,
            trace_id=context.trace_id,
            client_summary=context.client_summary,
        )

    def require_capability(
        self,
        principal: AuthPrincipal,
        context: SecurityContext,
        *,
        capability: str,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        resource_department_id: str | None = None,
    ) -> None:
        allowed = capability in principal.capabilities
        self._record(
            principal,
            context,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_department_id=resource_department_id,
            allowed=allowed,
            reason="capability_allowed" if allowed else "capability_missing",
        )
        if not allowed:
            self._audit.commit_security_event()
            raise ForbiddenScopeError()

    def record_authenticated_access(
        self,
        principal: AuthPrincipal,
        context: SecurityContext,
        *,
        action: str,
    ) -> None:
        self._record(
            principal,
            context,
            action=action,
            resource_type="authentication_principal",
            resource_id=principal.user_id,
            resource_department_id=None,
            allowed=True,
            reason="authenticated_session",
        )

    def get_employee_identity(
        self,
        principal: AuthPrincipal,
        context: SecurityContext,
        *,
        employee_profile_id: str,
    ) -> EmployeeIdentitySummary:
        own_profiles: set[str] = set()
        department_ids: set[str] = set()
        if (
            "training.self.read" in principal.capabilities
            and principal.employee_profile_id is not None
        ):
            own_profiles.add(principal.employee_profile_id)
        if "training.department.read" in principal.capabilities:
            department_ids.update(
                scope.removeprefix("department:")
                for scope in principal.authorized_data_scopes
                if scope.startswith("department:")
            )

        resource = self._identity.get_employee_identity(
            employee_profile_id=employee_profile_id,
            allowed_profile_ids=own_profiles,
            allowed_department_ids=department_ids,
        )
        if resource is None:
            reason = (
                "other_employee_denied"
                if principal.employee_profile_id is not None
                and employee_profile_id != principal.employee_profile_id
                else "cross_department_or_resource_hidden"
            )
            self._record(
                principal,
                context,
                action="identity.employee.read",
                resource_type="employee_profile",
                resource_id=employee_profile_id,
                resource_department_id=None,
                allowed=False,
                reason=reason,
            )
            self._audit.commit_security_event()
            raise ResourceNotFoundError()

        self._record(
            principal,
            context,
            action="identity.employee.read",
            resource_type="employee_profile",
            resource_id=resource.employee_profile_id,
            resource_department_id=resource.department_id,
            allowed=True,
            reason="self_scope" if resource.employee_profile_id in own_profiles else "department_scope",
        )
        return resource
