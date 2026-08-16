"""Approved C-07 dataset parameters and profile loading."""

from __future__ import annotations

import json
from dataclasses import dataclass, replace
from datetime import datetime
from pathlib import Path
from typing import Literal

DATASET_VERSION = "1.0.0"
GENERATOR_VERSION = "1.0.0"
RANDOM_SEED = 20260816
FIXED_EPOCH = "2026-08-16T00:00:00Z"
C07_BASE_SHA = "3ebd588222ba81157682a096cd2c7d1fd3e81c4b"
ProfileName = Literal["small", "standard", "stress"]


@dataclass(frozen=True, slots=True)
class DatasetProfile:
    name: ProfileName
    description: str
    counts: dict[str, int]
    overrides: dict[str, dict[str, int]]


@dataclass(frozen=True, slots=True)
class GenerationSettings:
    dataset_version: str = DATASET_VERSION
    generator_version: str = GENERATOR_VERSION
    random_seed: int = RANDOM_SEED
    fixed_epoch: str = FIXED_EPOCH

    @property
    def epoch(self) -> datetime:
        return datetime.fromisoformat(self.fixed_epoch.replace("Z", "+00:00"))


def load_profile(
    repo_root: Path,
    name: ProfileName,
    *,
    users: int | None = None,
    training_tasks: int | None = None,
    learning_records: int | None = None,
) -> DatasetProfile:
    """Load a tracked profile and apply only approved stress overrides."""

    path = repo_root / "data" / "profiles" / f"{name}.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    profile = DatasetProfile(
        name=name,
        description=payload["description"],
        counts={key: int(value) for key, value in payload["counts"].items()},
        overrides=payload.get("overrides", {}),
    )
    requested = {
        "users": users,
        "training_tasks": training_tasks,
        "learning_records": learning_records,
    }
    if any(value is not None for value in requested.values()) and name != "stress":
        raise ValueError("count overrides are permitted only for the stress profile")
    counts = dict(profile.counts)
    for key, value in requested.items():
        if value is None:
            continue
        bounds = profile.overrides[key]
        if value < bounds["minimum"] or value > bounds["maximum"]:
            raise ValueError(
                f"stress {key} must be between {bounds['minimum']} and {bounds['maximum']}"
            )
        counts[key] = value
        if key == "users":
            counts["employee_profiles"] = value
    return replace(profile, counts=counts)
