"""Single router registration point for the FastAPI application factory."""

from fastapi import APIRouter

from .routes import auth_router, health_router, identity_router, system_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(system_router)
api_router.include_router(auth_router)
api_router.include_router(identity_router)
