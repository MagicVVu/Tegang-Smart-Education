"""Internal-only models for C-07 files that are not public exchange contracts."""

from __future__ import annotations

from typing import Any

from pydantic import AwareDatetime, Field

from backend.app.schemas.assessment import AssessmentQuestion
from backend.app.schemas.common import (
    ContractModel,
    EmployeeProfileId,
    KnowledgeCitationId,
    KnowledgePointId,
    LearningRecordStatus,
    Percentage,
    RiskLevel,
    TrainingTaskId,
)


class DocumentMetadata(ContractModel):
    slug: str = Field(pattern=r"^[a-z0-9-]+$")
    title: str = Field(min_length=1, max_length=300)
    document_version: str = Field(min_length=1, max_length=100)
    source_department_id: str = Field(pattern=r"^dept_[0-9A-HJKMNP-TV-Z]{26}$")
    risk_level: RiskLevel
    content_sha256: str = Field(pattern=r"^sha256:[a-f0-9]{64}$")
    simulated: bool = True
    disclaimer: str = Field(min_length=1, max_length=1000)


class KnowledgePointDatasetRecord(ContractModel):
    id: KnowledgePointId
    name: str = Field(min_length=1, max_length=240)
    knowledge_citation_id: KnowledgeCitationId
    document_slug: str = Field(pattern=r"^[a-z0-9-]+$")
    risk_level: RiskLevel
    pass_threshold_percent: Percentage
    high_risk_independent_pass_required: bool


class QuestionDatasetRecord(ContractModel):
    question: AssessmentQuestion
    explanation: str = Field(min_length=1, max_length=2000)
    knowledge_citation_id: KnowledgeCitationId


class LearningRecordDatasetRecord(ContractModel):
    task_id: TrainingTaskId
    employee_profile_id: EmployeeProfileId
    status: LearningRecordStatus
    progress_percent: Percentage
    attempt: int = Field(ge=1, le=100)
    started_at: AwareDatetime | None = None
    completed_at: AwareDatetime | None = None
    simulated_dataset_tag: str = Field(pattern=r"^c07:[0-9A-Za-z.+-]+:(small|standard|stress)$")


class ManifestFile(ContractModel):
    path: str = Field(min_length=1)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    bytes: int = Field(ge=0)
    records: int | None = Field(default=None, ge=0)


class DatasetManifest(ContractModel):
    dataset_version: str
    generator_version: str
    profile: str
    random_seed: int
    fixed_epoch: str
    generated_at: str
    contract_version: str
    c07_base_sha: str = Field(pattern=r"^[a-f0-9]{40}$")
    parameters: dict[str, Any]
    object_counts: dict[str, int]
    id_ranges: dict[str, dict[str, str]]
    files: list[ManifestFile]
    related_artifacts: list[ManifestFile] = Field(default_factory=list)
    manifest_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
