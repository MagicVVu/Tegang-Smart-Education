"""API route modules."""

from .auth import router as auth_router
from .health import router as health_router
from .identity import router as identity_router
from .system import router as system_router

__all__ = ["auth_router", "health_router", "identity_router", "system_router"]
