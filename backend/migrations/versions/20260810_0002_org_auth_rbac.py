"""Add simulated organization, authentication sessions, RBAC scope, and audit.

Revision ID: 20260810_0002
Revises: 20260810_0001
Create Date: 2026-08-10
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260810_0002"
down_revision = "20260810_0001"
branch_labels = None
depends_on = None


def _version_audit_columns() -> list[sa.Column]:
    return [
        sa.Column(
            "schema_version",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'2.2.0'"),
        ),
        sa.Column(
            "entity_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("created_by", sa.String(length=30), nullable=True),
        sa.Column("updated_by", sa.String(length=30), nullable=True),
    ]


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("external_id", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("simulated", sa.Boolean(), nullable=False),
        *_version_audit_columns(),
        sa.CheckConstraint(
            "entity_version >= 1", name="ck_organizations_entity_version_positive"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_organizations"),
        sa.UniqueConstraint("external_id", name="uq_organizations_external_id"),
    )
    op.add_column(
        "departments", sa.Column("organization_id", sa.BigInteger(), nullable=True)
    )
    op.create_foreign_key(
        "fk_departments_organization_id_organizations",
        "departments",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    for table_name in ("departments", "roles", "users"):
        op.alter_column(
            table_name,
            "schema_version",
            existing_type=sa.String(length=32),
            server_default=sa.text("'2.2.0'"),
        )

    op.create_table(
        "positions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("external_id", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("organization_id", sa.BigInteger(), nullable=False),
        sa.Column("department_id", sa.BigInteger(), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        *_version_audit_columns(),
        sa.CheckConstraint(
            "entity_version >= 1", name="ck_positions_entity_version_positive"
        ),
        sa.ForeignKeyConstraint(
            ["department_id"],
            ["departments.id"],
            name="fk_positions_department_id_departments",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_positions_organization_id_organizations",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_positions"),
        sa.UniqueConstraint("external_id", name="uq_positions_external_id"),
        sa.UniqueConstraint(
            "department_id", "code", name="uq_positions_department_code"
        ),
    )
    op.create_table(
        "employee_profiles",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("external_id", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("department_id", sa.BigInteger(), nullable=False),
        sa.Column("position_id", sa.BigInteger(), nullable=False),
        sa.Column("job_title", sa.String(length=160), nullable=False),
        sa.Column("training_tags", sa.JSON(), nullable=False),
        sa.Column("authorized_data_scopes", sa.JSON(), nullable=False),
        *_version_audit_columns(),
        sa.CheckConstraint(
            "entity_version >= 1", name="ck_employee_profiles_entity_version_positive"
        ),
        sa.ForeignKeyConstraint(
            ["department_id"],
            ["departments.id"],
            name="fk_employee_profiles_department_id_departments",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["position_id"],
            ["positions.id"],
            name="fk_employee_profiles_position_id_positions",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_employee_profiles_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_employee_profiles"),
        sa.UniqueConstraint("external_id", name="uq_employee_profiles_external_id"),
        sa.UniqueConstraint("user_id", name="uq_employee_profiles_user_id"),
    )
    op.create_table(
        "user_credentials",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("account_name", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column(
            "password_changed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_user_credentials_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name="pk_user_credentials"),
        sa.UniqueConstraint("account_name", name="uq_user_credentials_account_name"),
    )
    op.create_table(
        "user_department_scopes",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("department_id", sa.BigInteger(), nullable=False),
        sa.Column("scope_type", sa.String(length=32), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("assigned_by", sa.String(length=30), nullable=True),
        sa.ForeignKeyConstraint(
            ["department_id"],
            ["departments.id"],
            name="fk_user_department_scopes_department_id_departments",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_user_department_scopes_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "user_id",
            "department_id",
            "scope_type",
            name="pk_user_department_scopes",
        ),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("external_id", sa.String(length=30), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("client_kind", sa.String(length=32), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoke_reason", sa.String(length=120), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_auth_sessions_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_auth_sessions"),
        sa.UniqueConstraint("external_id", name="uq_auth_sessions_external_id"),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_table(
        "auth_refresh_tokens",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_token_id", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(
            ["replaced_by_token_id"],
            ["auth_refresh_tokens.id"],
            name="fk_auth_refresh_tokens_replaced_by_token_id_auth_refresh_tokens",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["auth_sessions.id"],
            name="fk_auth_refresh_tokens_session_id_auth_sessions",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_auth_refresh_tokens"),
        sa.UniqueConstraint("token_hash", name="uq_auth_refresh_tokens_token_hash"),
    )
    op.create_index(
        "ix_auth_refresh_tokens_session_id", "auth_refresh_tokens", ["session_id"]
    )
    op.create_table(
        "security_audit_records",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("external_id", sa.String(length=32), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actor_user_id", sa.String(length=30), nullable=True),
        sa.Column("session_id", sa.String(length=30), nullable=True),
        sa.Column("effective_roles", sa.JSON(), nullable=False),
        sa.Column("action", sa.String(length=160), nullable=False),
        sa.Column("resource_type", sa.String(length=120), nullable=False),
        sa.Column("resource_id", sa.String(length=160), nullable=True),
        sa.Column("resource_department_id", sa.String(length=31), nullable=True),
        sa.Column("allowed", sa.Boolean(), nullable=False),
        sa.Column("reason_code", sa.String(length=120), nullable=False),
        sa.Column("request_id", sa.String(length=30), nullable=False),
        sa.Column("trace_id", sa.String(length=30), nullable=False),
        sa.Column("client_summary", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_security_audit_records"),
        sa.UniqueConstraint(
            "external_id", name="uq_security_audit_records_external_id"
        ),
    )


def downgrade() -> None:
    op.drop_table("security_audit_records")
    op.drop_index("ix_auth_refresh_tokens_session_id", table_name="auth_refresh_tokens")
    op.drop_table("auth_refresh_tokens")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_table("user_department_scopes")
    op.drop_table("user_credentials")
    op.drop_table("employee_profiles")
    op.drop_table("positions")
    for table_name in ("departments", "roles", "users"):
        op.alter_column(
            table_name,
            "schema_version",
            existing_type=sa.String(length=32),
            server_default=sa.text("'2.1.0'"),
        )
    op.drop_constraint(
        "fk_departments_organization_id_organizations",
        "departments",
        type_="foreignkey",
    )
    op.drop_column("departments", "organization_id")
    op.drop_table("organizations")
