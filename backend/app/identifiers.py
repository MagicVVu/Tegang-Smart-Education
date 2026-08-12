"""Opaque request, trace, and error identifiers using the C-03 ULID shape."""

from __future__ import annotations

import re
import secrets
import time

CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
REQUEST_ID_PATTERN = re.compile(r"^req_[0-9A-HJKMNP-TV-Z]{26}$")
TRACE_ID_PATTERN = re.compile(r"^trc_[0-9A-HJKMNP-TV-Z]{26}$")


def _encode(value: int, length: int) -> str:
    result = ["0"] * length
    for index in range(length - 1, -1, -1):
        result[index] = CROCKFORD[value & 31]
        value >>= 5
    return "".join(result)


def new_ulid() -> str:
    timestamp = int(time.time() * 1000) & ((1 << 48) - 1)
    return _encode(timestamp, 10) + _encode(secrets.randbits(80), 16)


def new_request_id() -> str:
    return f"req_{new_ulid()}"


def new_trace_id() -> str:
    return f"trc_{new_ulid()}"


def new_error_id() -> str:
    return f"error_{new_ulid()}"


def accepted_request_id(value: str | None) -> str:
    return value if value and REQUEST_ID_PATTERN.fullmatch(value) else new_request_id()


def accepted_trace_id(value: str | None) -> str:
    return value if value and TRACE_ID_PATTERN.fullmatch(value) else new_trace_id()
