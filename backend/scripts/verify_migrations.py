"""Verify upgrade/downgrade/upgrade only against an explicit disposable database."""

from __future__ import annotations

import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect

from backend.app.services.system import CURRENT_MIGRATION_REVISION

REPO_ROOT = Path(__file__).resolve().parents[2]
ALEMBIC_CONFIG = REPO_ROOT / "backend" / "alembic.ini"


def _normalized(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _revision(url: str) -> str | None:
    engine = create_engine(url)
    try:
        with engine.connect() as connection:
            return MigrationContext.configure(connection).get_current_revision()
    finally:
        engine.dispose()


def main() -> int:
    raw_url = os.getenv("MIGRATION_TEST_DATABASE_URL", "").strip()
    if not raw_url:
        raise RuntimeError("MIGRATION_TEST_DATABASE_URL is required")
    url = _normalized(raw_url)
    runtime_url = _normalized(os.getenv("DATABASE_URL", "").strip())
    if runtime_url and url == runtime_url:
        raise RuntimeError(
            "MIGRATION_TEST_DATABASE_URL must not equal the runtime DATABASE_URL"
        )

    config = Config(str(ALEMBIC_CONFIG))
    config.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    os.environ["ALEMBIC_DATABASE_URL"] = url

    command.upgrade(config, "head")
    if _revision(url) != CURRENT_MIGRATION_REVISION:
        raise RuntimeError("Initial upgrade did not reach the expected revision")

    engine = create_engine(url)
    try:
        tables = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()
    expected = {
        "organizations",
        "departments",
        "positions",
        "employee_profiles",
        "roles",
        "users",
        "user_roles",
        "user_departments",
        "user_department_scopes",
        "user_credentials",
        "auth_sessions",
        "auth_refresh_tokens",
        "security_audit_records",
    }
    if not expected.issubset(tables):
        raise RuntimeError("Identity foundation tables are missing after upgrade")

    command.downgrade(config, "20260810_0001")
    if _revision(url) != "20260810_0001":
        raise RuntimeError("Downgrade did not return to the C-04 head")

    command.upgrade(config, "head")
    if _revision(url) != CURRENT_MIGRATION_REVISION:
        raise RuntimeError("Second upgrade did not reach the expected revision")

    print(
        "[PASS] Alembic upgrade -> C-04 head downgrade -> upgrade reached "
        f"{CURRENT_MIGRATION_REVISION}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
