"""SQLAlchemy engine, transaction session, and FastAPI dependency boundary."""

from __future__ import annotations

from collections.abc import Iterator

from fastapi import Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from .config import Settings

SessionFactory = sessionmaker[Session]


def create_database_engine(settings: Settings) -> Engine | None:
    url = settings.sqlalchemy_database_url
    if not url:
        return None
    options: dict[str, object] = {"pool_pre_ping": True}
    if url.startswith("sqlite"):
        options["connect_args"] = {"check_same_thread": False}
    return create_engine(url, **options)


def create_session_factory(engine: Engine | None) -> SessionFactory | None:
    if engine is None:
        return None
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_database_session(request: Request) -> Iterator[Session]:
    factory: SessionFactory | None = request.app.state.session_factory
    if factory is None:
        from .errors import ServiceUnavailableError

        raise ServiceUnavailableError("Database configuration is unavailable.")

    with factory() as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
