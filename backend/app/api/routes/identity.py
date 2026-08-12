"""Scoped identity read endpoints used to enforce C-06 resource boundaries."""

from fastapi import APIRouter, Depends, Request

from ...schemas.auth import AuthPrincipal, EmployeeIdentityResponse
from ...services import AuthorizationService, SecurityContext
from ..dependencies import (
    get_authorization_service,
    get_current_principal,
    get_security_context,
)
from .auth import _envelope

router = APIRouter(prefix="/api/v1/identity", tags=["identity"])


@router.get(
    "/employee-profiles/{employee_profile_id}",
    response_model=EmployeeIdentityResponse,
)
def employee_identity(
    employee_profile_id: str,
    request: Request,
    principal: AuthPrincipal = Depends(get_current_principal),
    context: SecurityContext = Depends(get_security_context),
    authorization: AuthorizationService = Depends(get_authorization_service),
) -> EmployeeIdentityResponse:
    data = authorization.get_employee_identity(
        principal,
        context,
        employee_profile_id=employee_profile_id,
    )
    return EmployeeIdentityResponse(data=data, **_envelope(request))
