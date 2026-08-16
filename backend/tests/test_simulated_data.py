from __future__ import annotations

import json
from pathlib import Path

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from backend.app.models import Base, PositionRecord, UserCredentialRecord, UserRecord
from backend.app.simulated_data.cli import main as data_cli_main
from backend.app.simulated_data.config import load_profile
from backend.app.simulated_data.exporter import export_anonymized
from backend.app.simulated_data.generator import generate_dataset
from backend.app.simulated_data.persistence import reset_identity, seed_identity
from backend.app.simulated_data.validation import validate_dataset
from backend.scripts.bootstrap_identity import PASSWORD_ENV, USERS

REPO_ROOT = Path(__file__).resolve().parents[2]


def _tree_bytes(root: Path) -> dict[str, bytes]:
    return {
        path.relative_to(root).as_posix(): path.read_bytes()
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def test_small_generation_is_byte_identical(tmp_path: Path) -> None:
    profile = load_profile(REPO_ROOT, "small")
    first = tmp_path / "first"
    second = tmp_path / "second"
    first_manifest = generate_dataset(REPO_ROOT, profile, output_root=first)
    second_manifest = generate_dataset(REPO_ROOT, profile, output_root=second)

    assert _tree_bytes(first) == _tree_bytes(second)
    first_result = validate_dataset(first_manifest.parent, output_root=first)
    second_result = validate_dataset(second_manifest.parent, output_root=second)
    assert first_result.object_counts == second_result.object_counts == profile.counts
    first_hash = json.loads(first_manifest.read_text(encoding="utf-8"))["manifest_sha256"]
    second_hash = json.loads(second_manifest.read_text(encoding="utf-8"))["manifest_sha256"]
    assert first_hash == second_hash


def test_small_generation_never_creates_stress(tmp_path: Path) -> None:
    generate_dataset(REPO_ROOT, load_profile(REPO_ROOT, "small"), output_root=tmp_path)
    assert not (tmp_path / "data" / "generated" / "stress").exists()


def test_anonymized_export_uses_safe_whitelist(tmp_path: Path) -> None:
    manifest = generate_dataset(
        REPO_ROOT,
        load_profile(REPO_ROOT, "small"),
        output_root=tmp_path,
    )
    validate_dataset(manifest.parent, output_root=tmp_path)
    export_manifest = export_anonymized(
        manifest.parent,
        repo_root=REPO_ROOT,
        output_root=tmp_path,
    )
    exported = _tree_bytes(export_manifest.parent)
    combined = b"\n".join(exported.values()).lower()
    for forbidden in (
        b'"password_hash":',
        b'"access_token":',
        b'"refresh_token":',
        b'"cookie":',
        b'"api_key":',
        b'"authorization":',
        b'"client_summary":',
    ):
        assert forbidden not in combined
    users = (export_manifest.parent / "users.jsonl").read_text(encoding="utf-8")
    assert "模拟用户-0001" in users
    assert "模拟员工 E-0231" not in users


def test_reset_without_confirmation_is_rejected(capsys: pytest.CaptureFixture[str]) -> None:
    assert data_cli_main(["reset", "--profile", "small"]) == 2
    assert "--confirm-simulated-data" in capsys.readouterr().err


def test_seed_is_idempotent_and_reset_is_scoped(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for environment_name in PASSWORD_ENV.values():
        monkeypatch.setenv(environment_name, "C07-Local-Test-Password-Only")
    manifest = generate_dataset(
        REPO_ROOT,
        load_profile(REPO_ROOT, "small"),
        output_root=tmp_path,
    )
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session, session.begin():
        first = seed_identity(session, manifest.parent, profile_name="small")
    assert first.users_created == 12
    assert first.positions_created == 4

    with Session(engine) as session, session.begin():
        second = seed_identity(session, manifest.parent, profile_name="small")
    assert second.users_created == 0
    assert second.positions_created == 0

    unrelated_id = "usr_01ARZ3NDEKTSV4RRFFQ69G5FAZ"
    with Session(engine) as session, session.begin():
        session.add(UserRecord(external_id=unrelated_id, status="active", display_name="Unrelated local test"))
    with Session(engine) as session, session.begin():
        reset = reset_identity(session, manifest.parent, profile_name="small")
    assert reset.users_removed == 12
    assert reset.positions_removed == 4
    assert reset.seed.users_created == 12

    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(UserRecord)) == 17
        assert session.scalar(select(func.count()).select_from(PositionRecord)) == 8
        assert session.scalar(select(func.count()).select_from(UserCredentialRecord)) == 4
        assert session.scalar(
            select(UserRecord).where(UserRecord.external_id == unrelated_id)
        ) is not None
        for _, user_id, *_ in USERS:
            assert session.scalar(
                select(UserRecord).where(UserRecord.external_id == user_id)
            ) is not None
    engine.dispose()
