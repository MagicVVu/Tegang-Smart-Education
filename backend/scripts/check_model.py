"""Explicit, opt-in OpenAI-compatible connectivity check.

This command never prints the API key or model output and is intentionally not
called by readiness probes or ordinary tests.
"""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime

import httpx

from backend.app.config import Settings


def main() -> int:
    settings = Settings.from_env()
    missing = settings.model_missing_fields()
    if missing:
        print(
            json.dumps(
                {
                    "status": "failed",
                    "reason": "model_configuration_missing",
                    "missing_fields": missing,
                    "checked_at": datetime.now(UTC).date().isoformat(),
                },
                ensure_ascii=False,
            )
        )
        return 2

    endpoint = f"{settings.model_base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.model_name,
        "messages": [{"role": "user", "content": "Reply with OK."}],
        "max_tokens": 4,
        "temperature": 0,
    }
    headers = {
        "Authorization": f"Bearer {settings.model_api_key}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=settings.model_timeout_seconds) as client:
            response = client.post(endpoint, headers=headers, json=payload)
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        print(
            json.dumps(
                {
                    "status": "failed",
                    "provider": settings.model_provider,
                    "model": settings.model_name,
                    "http_status": exc.response.status_code,
                    "reason": "model_api_http_error",
                    "checked_at": datetime.now(UTC).date().isoformat(),
                },
                ensure_ascii=False,
            )
        )
        return 1
    except httpx.HTTPError as exc:
        print(
            json.dumps(
                {
                    "status": "failed",
                    "provider": settings.model_provider,
                    "model": settings.model_name,
                    "reason": f"model_api_transport_error:{type(exc).__name__}",
                    "checked_at": datetime.now(UTC).date().isoformat(),
                },
                ensure_ascii=False,
            )
        )
        return 1

    print(
        json.dumps(
            {
                "status": "ok",
                "provider": settings.model_provider,
                "model": settings.model_name,
                "http_status": response.status_code,
                "checked_at": datetime.now(UTC).date().isoformat(),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

