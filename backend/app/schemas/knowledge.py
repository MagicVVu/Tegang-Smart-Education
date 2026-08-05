"""Enterprise knowledge citation contracts."""

from __future__ import annotations

from enum import StrEnum

from pydantic import AwareDatetime, Field

from .common import DepartmentId, KnowledgeCitationId, VersionedEntity


class KnowledgeValidity(StrEnum):
    EFFECTIVE = "effective"
    CONFLICT = "conflict"
    EXPIRED = "expired"
    REVOKED = "revoked"


class KnowledgeCitation(VersionedEntity):
    """Traceable citation to an authorized enterprise knowledge snapshot."""

    id: KnowledgeCitationId
    status: KnowledgeValidity
    document_name: str = Field(min_length=1, max_length=300)
    document_version: str = Field(min_length=1, max_length=100)
    source_department_id: DepartmentId | None = None
    section: str = Field(min_length=1, max_length=500)
    excerpt: str = Field(min_length=1, max_length=4000)
    relation: str = Field(min_length=1, max_length=1000)
    retrieved_at: AwareDatetime
    content_hash: str = Field(pattern=r"^sha256:[a-f0-9]{64}$")
    authorized_scopes: list[str] = Field(default_factory=list)
