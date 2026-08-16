"""Stable external IDs derived without process hash, clock, network, or execution order."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime

CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
KIND_ORDER = {
    "position": 1,
    "user": 2,
    "employee_profile": 3,
    "knowledge_citation": 4,
    "knowledge_point": 5,
    "question": 6,
    "course": 7,
    "training_goal": 8,
    "training_task": 9,
    "training_plan": 10,
    "rule": 11,
    "approval": 12,
    "assessment_session": 13,
    "assessment_result": 14,
    "performance": 15,
    "remediation": 16,
    "retest": 17,
    "agent_run": 18,
    "agent_step": 19,
    "decision": 20,
    "checkpoint": 21,
    "event": 22,
    "trace": 23,
    "request": 24,
}


def _encode_ulid(value: int) -> str:
    chars = ["0"] * 26
    for index in range(25, -1, -1):
        chars[index] = CROCKFORD[value & 31]
        value >>= 5
    return "".join(chars)


@dataclass(frozen=True, slots=True)
class DeterministicIdFactory:
    dataset_version: str
    profile: str
    random_seed: int
    fixed_epoch: datetime

    def make(self, prefix: str, kind: str, index: int) -> str:
        if kind not in KIND_ORDER:
            raise ValueError(f"unknown deterministic ID kind: {kind}")
        if index < 0 or index >= 1_000_000:
            raise ValueError("deterministic ID index must be between 0 and 999999")
        base_ms = int(self.fixed_epoch.timestamp() * 1000)
        timestamp_ms = base_ms + KIND_ORDER[kind] * 1_000_000 + index
        material = (
            f"c07|{self.dataset_version}|{self.profile}|{self.random_seed}|"
            f"{kind}|{index}"
        ).encode("utf-8")
        entropy = int.from_bytes(hashlib.sha256(material).digest()[:10], "big")
        return f"{prefix}_{_encode_ulid((timestamp_ms << 80) | entropy)}"
